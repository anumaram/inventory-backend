const express = require('express');
const router = express.Router();
const vendorAuth = require('../middleware/auth.middleware');
const AiConversation = require('../models/ai-conversation.model');
const AiSettings = require('../models/ai-settings.model');
const {
  chatWithVendorAi,
  getVendorDashboardAiSummary,
  generateAiProductCopy
} = require('../services/ai/vendor-ai.service');
const { VENDOR_DEFAULT_SUGGESTIONS } = require('../services/ai/vendor-nlp.service');

// 1. Chat with Atlas AI Assistant
router.post('/chat', vendorAuth, async (req, res) => {
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

    const response = await chatWithVendorAi({
      vendorId: req.userId,
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
          aiType: 'atlas',
          userId: req.userId,
          isDeleted: { $ne: true }
        });
      }

      if (!conv) {
        const titleSnippet = message.trim().slice(0, 40);
        conv = await AiConversation.create({
          aiType: 'atlas',
          userId: req.userId,
          userType: 'vendor',
          agentMode,
          title: titleSnippet.length >= 40 ? `${titleSnippet}...` : titleSnippet || 'Store Intelligence Session',
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
      console.warn('Could not persist Atlas conversation:', saveErr.message);
    }

    res.json({
      ...response,
      conversationId: activeConvId
    });
  } catch (err) {
    console.error('Vendor AI Chat Error:', err);
    res.status(500).json({
      msg: 'Vendor AI is momentarily unavailable',
      error: err.message,
      personality: 'Atlas'
    });
  }
});

// 2. List saved conversations for Atlas
router.get('/conversations', vendorAuth, async (req, res) => {
  try {
    const conversations = await AiConversation.find({
      aiType: 'atlas',
      userId: req.userId,
      isDeleted: { $ne: true }
    })
      .select('title createdAt updatedAt messages agentMode')
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((c) => ({
      _id: String(c._id),
      title: c.title || 'Store Intelligence Session',
      agentMode: c.agentMode || 'business_copilot',
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
      lastMessage: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '',
      updatedAt: c.updatedAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load vendor conversations.' });
  }
});

// 3. Create new conversation
router.post('/conversations', vendorAuth, async (req, res) => {
  try {
    const { title = 'New Atlas Chat', agentMode = 'business_copilot' } = req.body;
    const conv = await AiConversation.create({
      aiType: 'atlas',
      userId: req.userId,
      userType: 'vendor',
      agentMode,
      title: title.trim() || 'New Atlas Chat',
      messages: []
    });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not create conversation.' });
  }
});

// 4. Get single conversation
router.get('/conversations/:id', vendorAuth, async (req, res) => {
  try {
    const conv = await AiConversation.findOne({
      _id: req.params.id,
      aiType: 'atlas',
      userId: req.userId,
      isDeleted: { $ne: true }
    }).lean();

    if (!conv) return res.status(404).json({ msg: 'Conversation not found.' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load conversation.' });
  }
});

// 5. Rename conversation
router.patch('/conversations/:id', vendorAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await AiConversation.findOneAndUpdate(
      { _id: req.params.id, aiType: 'atlas', userId: req.userId, isDeleted: { $ne: true } },
      { title: (title || 'Store Intelligence Session').trim() },
      { returnDocument: 'after' }
    );
    if (!conv) return res.status(404).json({ msg: 'Conversation not found.' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not update conversation.' });
  }
});

// 6. Delete conversation (soft delete)
router.delete('/conversations/:id', vendorAuth, async (req, res) => {
  try {
    await AiConversation.findOneAndUpdate(
      { _id: req.params.id, aiType: 'atlas', userId: req.userId },
      { isDeleted: true }
    );
    res.json({ msg: 'Conversation deleted.' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not delete conversation.' });
  }
});

// 7. Get Atlas Settings
router.get('/settings', vendorAuth, async (req, res) => {
  try {
    let settings = await AiSettings.findOne({ aiType: 'atlas', userId: req.userId }).lean();
    if (!settings) {
      settings = await AiSettings.create({
        aiType: 'atlas',
        userId: req.userId,
        userType: 'vendor'
      });
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load settings.' });
  }
});

// 8. Update Atlas Settings
router.put('/settings', vendorAuth, async (req, res) => {
  try {
    const update = { ...req.body };
    delete update._id;
    delete update.userId;
    delete update.aiType;
    delete update.userType;

    const settings = await AiSettings.findOneAndUpdate(
      { aiType: 'atlas', userId: req.userId },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ settings, msg: 'Atlas settings saved.' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not save settings.' });
  }
});

// 9. Executive Dashboard AI Summary
router.get('/summary', vendorAuth, async (req, res) => {
  try {
    const summary = await getVendorDashboardAiSummary({ vendorId: req.userId });
    res.json(summary);
  } catch (err) {
    console.error('Vendor AI Summary Error:', err);
    res.status(500).json({
      msg: 'Failed to generate vendor AI summary',
      error: err.message
    });
  }
});

// 10. AI Product Copy Generator (Title, Description, Tags)
router.post('/generate-copy', vendorAuth, async (req, res) => {
  try {
    const { name, category, keywords, tone } = req.body;
    if (!name && !keywords) {
      return res.status(400).json({ msg: 'Product name or keywords are required' });
    }

    const copy = await generateAiProductCopy({
      name,
      category,
      keywords,
      tone
    });

    res.json(copy);
  } catch (err) {
    console.error('Vendor AI Copywriting Error:', err);
    res.status(500).json({
      msg: 'Failed to generate copy',
      error: err.message
    });
  }
});

// 11. Quick Suggestions List
router.get('/suggestions', vendorAuth, (req, res) => {
  res.json({ suggestions: VENDOR_DEFAULT_SUGGESTIONS });
});

module.exports = router;
