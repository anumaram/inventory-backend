const express = require('express');
const router = express.Router();
const aiWriteService = require('../services/ai/ai-write.service');

// 1. Get real-time status of Ollama and Cloud AI providers
router.get('/status', async (req, res) => {
  try {
    const status = await aiWriteService.getAiWriteStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to check AI status' });
  }
});

// 2. Universal Generate / Polish Text Endpoint
router.post('/generate', async (req, res) => {
  try {
    const { task = 'review_full', input = '', context = {}, options = {} } = req.body;
    const result = await aiWriteService.generateAiText({ task, input, context, options });
    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to generate AI text' });
  }
});

const voiceSearchService = require('../services/ai/voice-search.service');

// 3. AI Voice Search & Intent Catalog Matcher
router.post('/voice-search', async (req, res) => {
  try {
    const { transcript = '', activeFilter = 'All', sortBy = 'best_match', page = 1, limit = 12 } = req.body;
    const result = await voiceSearchService.processVoiceSearch({
      transcript,
      activeFilter,
      sortBy,
      page,
      limit
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to process voice search' });
  }
});

module.exports = router;

