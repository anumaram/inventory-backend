const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');
const customerAuth = require('../middleware/customer.middleware');
const DarwinConversation = require('../models/darwin-conversation.model');
const darwinService = require('../services/darwin.service');
const darwinTools = require('../services/darwin-tools.service');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Optional Customer Auth Middleware (allows guests to browse while identifying logged-in customers)
async function optionalCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    req.customerId = null;
    req.customer = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.type === 'customer') {
      const customer = await Customer.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
      if (customer && !customer.isBlocked) {
        req.customerId = customer._id;
        req.customer = customer;
      }
    }
  } catch {
    req.customerId = null;
    req.customer = null;
  }
  next();
}

// 1. Chat with Darwin
router.post('/chat', optionalCustomerAuth, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      conversationHistory,
      currentProductContext,
      aiProviderPreference,
      compareProductIds,
      pageContext,
      activeDeliveryAddress
    } = req.body;

    const response = await darwinService.chatWithDarwin({
      message,
      customerId: req.customerId,
      conversationId,
      conversationHistory,
      currentProductContext,
      aiProviderPreference,
      compareProductIds,
      pageContext,
      activeDeliveryAddress
    });
    res.json(response);
  } catch (err) {
    console.error('[Darwin] Error in /chat route:', err.message);
    res.status(500).json({
      message: "I couldn't complete that request. You can search the catalog or try asking me another way.",
      mode: 'system',
      suggestions: ['Trending products', 'Best deals', 'Help']
    });
  }
});

// 2. Direct controlled action trigger
router.post('/action', customerAuth, async (req, res) => {
  try {
    const { action, payload } = req.body;
    const result = await darwinService.executeDirectAction({
      action,
      payload,
      customerId: req.customerId
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: err.message || 'Action failed.' });
  }
});

// 3. Suggestions & quick prompts
router.get('/suggestions', async (req, res) => {
  try {
    const data = await darwinService.getStarterSuggestions();
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to get suggestions.' });
  }
});

// 4. List saved conversations
router.get('/conversations', customerAuth, async (req, res) => {
  try {
    const conversations = await DarwinConversation.find({
      customerId: req.customerId,
      isDeleted: { $ne: true }
    })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((c) => ({
      _id: String(c._id),
      title: c.title || 'Shopping Conversation',
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
      lastMessage: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '',
      updatedAt: c.updatedAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load conversations.' });
  }
});

// 5. Create new conversation
router.post('/conversations', customerAuth, async (req, res) => {
  try {
    const { title = 'New Shopping Conversation' } = req.body;
    const conv = await DarwinConversation.create({
      customerId: req.customerId,
      title: title.trim() || 'New Shopping Conversation',
      messages: []
    });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not create conversation.' });
  }
});

// 6. Get single conversation messages
router.get('/conversations/:id', customerAuth, async (req, res) => {
  try {
    const conv = await DarwinConversation.findOne({
      _id: req.params.id,
      customerId: req.customerId,
      isDeleted: { $ne: true }
    }).lean();

    if (!conv) {
      return res.status(404).json({ msg: 'Conversation not found.' });
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load conversation.' });
  }
});

// 7. Rename conversation
router.patch('/conversations/:id', customerAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await DarwinConversation.findOneAndUpdate(
      { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
      { title: (title || 'Shopping Conversation').trim() },
      { returnDocument: 'after' }
    );
    if (!conv) return res.status(404).json({ msg: 'Conversation not found.' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not update conversation.' });
  }
});

// 8. Delete conversation
router.delete('/conversations/:id', customerAuth, async (req, res) => {
  try {
    await DarwinConversation.findOneAndUpdate(
      { _id: req.params.id, customerId: req.customerId },
      { isDeleted: true }
    );
    res.json({ msg: 'Conversation deleted.' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not delete conversation.' });
  }
});

// 9. Get Darwin Settings
router.get('/settings', customerAuth, async (req, res) => {
  try {
    const settings = await darwinTools.getDarwinSettings({ customerId: req.customerId });
    const addresses = await darwinTools.getCustomerAddresses({ customerId: req.customerId });
    const paymentMethods = await darwinTools.getPaymentMethods({ customerId: req.customerId });

    res.json({
      settings,
      addresses,
      paymentMethods
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not load settings.' });
  }
});

// 10. Update Darwin Settings
router.patch('/settings', customerAuth, async (req, res) => {
  try {
    const updated = await darwinTools.saveDarwinSettings({
      customerId: req.customerId,
      settings: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Could not save settings.' });
  }
});

module.exports = router;

