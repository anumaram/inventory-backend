const express = require('express');
const router = express.Router();
const rewardsService = require('../services/rewards.service');

// 1. Get rewards wallet
router.get('/', async (req, res) => {
  try {
    const { customerId } = req.query;
    const data = await rewardsService.getCustomerRewards(customerId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Redeem points
router.post('/redeem', async (req, res) => {
  try {
    const { customerId, points, couponId } = req.body;
    const result = await rewardsService.redeemPoints(customerId, points, couponId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

