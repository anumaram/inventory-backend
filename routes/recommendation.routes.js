const express = require('express');
const router = express.Router();
const recService = require('../services/recommendation.service');

// 1. Recommended For You (Multi-signal scoring engine)
router.get('/for-you', async (req, res) => {
  try {
    const { customerId, limit, page, category, sortBy, search, minPrice, maxPrice } = req.query;

    let resolvedCustomerId = customerId;
    const authHeader = req.headers?.authorization;
    if (!resolvedCustomerId && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        resolvedCustomerId = decoded.id || decoded.customerId || decoded._id;
      } catch {}
    }

    const result = await recService.getRecommendedForYou(resolvedCustomerId, {
      limit: parseInt(limit, 10) || 8,
      page: parseInt(page, 10) || 1,
      category,
      sortBy,
      search,
      minPrice,
      maxPrice
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Because You Viewed [Product] -> Competitors & Upgrades
router.get('/because-you-viewed/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit } = req.query;
    const items = await recService.getBecauseYouViewed(productId, parseInt(limit, 10) || 4);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Frequently Bought Together Bundle
router.get('/frequently-bought-together/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const bundle = await recService.getFrequentlyBoughtTogether(productId);
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Complete the Look (Fashion Pairings)
router.get('/complete-the-look/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const outfit = await recService.getCompleteTheLook(productId);
    res.json(outfit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Recommended Under Your Budget
router.get('/budget', async (req, res) => {
  try {
    const { maxPrice, limit } = req.query;
    const items = await recService.getBudgetRecommendations(
      parseFloat(maxPrice) || 2499,
      parseInt(limit, 10) || 8
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Based on Previous Purchases
router.get('/past-purchases', async (req, res) => {
  try {
    const { customerId, limit } = req.query;
    const items = await recService.getPastPurchasesRecommendations(
      customerId,
      parseInt(limit, 10) || 6
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

