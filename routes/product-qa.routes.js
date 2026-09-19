const express = require('express');
const router = express.Router();
const qaService = require('../services/product-qa.service');
const Product = require('../models/product.model');

// 1. Get Q&A for a product
router.get('/products/:productId/qa', async (req, res) => {
  try {
    const { productId } = req.params;
    const { q, filter, sort, customerId } = req.query;
    const data = await qaService.getQAByProduct(productId, { q, filter, sort, customerId });
    res.json(data);
  } catch (err) {
    console.error('[ProductQA Route] Error getting QA:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch product Q&A' });
  }
});

// 2. Instant Specification Check (live as customer types in Ask modal)
router.post('/products/:productId/qa/instant-spec-check', async (req, res) => {
  try {
    const { productId } = req.params;
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.json({ matched: false });
    }
    const product = await Product.findById(productId).lean();
    const match = qaService.findSpecVerifiedAnswer(question, product);
    if (match) {
      return res.json({ matched: true, ...match });
    }
    return res.json({ matched: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Ask a question
router.post('/products/:productId/qa/ask', async (req, res) => {
  try {
    const { productId } = req.params;
    const { question, customer } = req.body;
    const qa = await qaService.askQuestion(productId, question, customer);
    res.status(201).json(qa);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to submit question' });
  }
});

// 4. Answer a question
router.post('/products/:productId/qa/:questionId/answer', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer, responder } = req.body;
    const updated = await qaService.answerQuestion(questionId, answer, responder);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to submit answer' });
  }
});

// 5. Vote on a question (up/down)
router.post('/products/:productId/qa/:questionId/vote', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { direction } = req.body;
    const updated = await qaService.voteQuestion(questionId, direction);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to vote on question' });
  }
});

// 6. Vote on an answer (helpful/unhelpful)
router.post('/products/:productId/qa/:questionId/answers/:answerId/vote', async (req, res) => {
  try {
    const { questionId, answerId } = req.params;
    const { voteType } = req.body; // 'helpful' | 'unhelpful'
    const updated = await qaService.voteAnswer(questionId, answerId, voteType);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to vote on answer' });
  }
});

module.exports = router;

