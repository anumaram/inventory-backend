const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/admin.middleware');
const AiConversation = require('../models/ai-conversation.model');
const AiSettings = require('../models/ai-settings.model');
const {
  chatWithAdminAi,
  getAdminDashboardAiSummary,
  generateAdminReport
} = require('../services/ai/admin-ai.service');
const { ADMIN_DEFAULT_SUGGESTIONS } = require('../services/ai/admin-nlp.service');

// 1. Chat with Titan Platform Intelligence AI
router.post('/chat', adminAuth, async (req, res) => {
  try {
    const {
      message,
      conversationHistory,
      conversationId,
      agentMode = 'auto',
      aiProviderPreference = 'auto',
      pageContext = null
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Message is required' });
    }

    const response = await chatWithAdminAi({
      adminId: req.adminId,
      message,
      conversationHistory: conversationHistory || [],
      agentMode,
      aiProviderPreference,
      pageContext
    });

    // Automatically persist to aiconversations collection
    let activeConvId = conversationId;
    try {
      let conv;
      if (activeConvId) {
        conv = await AiConversation.findOne({
          _id: activeConvId,
          aiType: 'titan',
          userId: req.adminId,
          isDeleted: { $ne: true }
        });
      }

      if (!conv) {
        const titleSnippet = message.trim().slice(0, 40);
        conv = await AiConversation.create({
          aiType: 'titan',
          userId: req.adminId,
          userType: 'admin',
          agentMode,
          title: titleSnippet.length >= 40 ? `${titleSnippet}...` : titleSnippet || 'Platform Intelligence Session',
          messages: []
        });
        activeConvId = conv._id;
      }

      conv.messages.push({
        role: 'user',
        content: message.trim(),
        timestamp: new Date()
      });

      conv.messages.push({
        role: 'assistant',
        content: response.message || '',
        structuredData: {
          actions: response.actions,
          suggestions: response.suggestions
        },
        mode: response.mode || 'gemini',
        timestamp: new Date()
      });

      await conv.save();
    } catch (saveErr) {
      console.warn('Could not persist Titan conversation:', saveErr.message);
    }

    res.json({
      ...response,
      conversationId: activeConvId
    });
  } catch (err) {
    console.error('Admin AI Chat Error:', err);
    res.status(500).json({
      msg: 'Titan AI is momentarily unavailable',
      error: err.message,
      personality: 'Titan'
    });
  }
});

// 2. List saved conversations for Titan
router.get('/conversations', adminAuth, async (req, res) => {
  try {
    const conversations = await AiConversation.find({
      aiType: 'titan',
      userId: req.adminId,
      isDeleted: { $ne: true }
    })
      .select('title createdAt updatedAt messages agentMode')
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((c) => ({
      _id: String(c._id),
      title: c.title || 'Platform Intelligence Session',
      agentMode: c.agentMode || 'platform_bi',
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
      lastMessage: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '',
      updatedAt: c.updatedAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load admin conversations.' });
  }
});

// 3. Create new conversation
router.post('/conversations', adminAuth, async (req, res) => {
  try {
    const { title = 'New Titan Audit', agentMode = 'platform_bi' } = req.body;
    const conv = await AiConversation.create({
      aiType: 'titan',
      userId: req.adminId,
      userType: 'admin',
      agentMode,
      title: title.trim() || 'New Titan Audit',
      messages: []
    });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not create conversation.' });
  }
});

// 4. Get single conversation
router.get('/conversations/:id', adminAuth, async (req, res) => {
  try {
    const conv = await AiConversation.findOne({
      _id: req.params.id,
      aiType: 'titan',
      userId: req.adminId,
      isDeleted: { $ne: true }
    }).lean();

    if (!conv) return res.status(404).json({ msg: 'Conversation not found.' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load conversation.' });
  }
});

// 5. Rename conversation
router.patch('/conversations/:id', adminAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await AiConversation.findOneAndUpdate(
      { _id: req.params.id, aiType: 'titan', userId: req.adminId, isDeleted: { $ne: true } },
      { title: (title || 'Platform Intelligence Session').trim() },
      { returnDocument: 'after' }
    );
    if (!conv) return res.status(404).json({ msg: 'Conversation not found.' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not update conversation.' });
  }
});

// 6. Delete conversation (soft delete)
router.delete('/conversations/:id', adminAuth, async (req, res) => {
  try {
    await AiConversation.findOneAndUpdate(
      { _id: req.params.id, aiType: 'titan', userId: req.adminId },
      { isDeleted: true }
    );
    res.json({ msg: 'Conversation deleted.' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not delete conversation.' });
  }
});

// 7. Get Titan Settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    let settings = await AiSettings.findOne({ aiType: 'titan', userId: req.adminId }).lean();
    if (!settings) {
      settings = await AiSettings.create({
        aiType: 'titan',
        userId: req.adminId,
        userType: 'admin'
      });
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load settings.' });
  }
});

// 8. Update Titan Settings
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const update = { ...req.body };
    delete update._id;
    delete update.userId;
    delete update.aiType;
    delete update.userType;

    const settings = await AiSettings.findOneAndUpdate(
      { aiType: 'titan', userId: req.adminId },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ settings, msg: 'Titan settings saved.' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not save settings.' });
  }
});

// 9. Executive Platform AI Summary for Admin Dashboard Card
router.get('/summary', adminAuth, async (req, res) => {
  try {
    const summary = await getAdminDashboardAiSummary();
    res.json(summary);
  } catch (err) {
    console.error('Admin AI Summary Error:', err);
    res.status(500).json({
      msg: 'Failed to generate admin AI summary',
      error: err.message
    });
  }
});

// 10. Generate Strategic Executive BI Report
router.post('/report-summary', adminAuth, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.body;
    const report = await generateAdminReport({ timeframe });
    res.json(report);
  } catch (err) {
    console.error('Admin AI Report Error:', err);
    res.status(500).json({
      msg: 'Failed to generate executive report',
      error: err.message
    });
  }
});

// 11. Quick Suggestions List
router.get('/suggestions', adminAuth, (req, res) => {
  res.json({ suggestions: ADMIN_DEFAULT_SUGGESTIONS });
});

module.exports = router;
