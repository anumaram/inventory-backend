const express = require('express');
const router = express.Router();
const service = require('../services/vendor-transaction.service');
const auth = require('../middleware/auth.middleware');

router.get('/', auth, async (req, res) => {
  try {
    await service.getVendorTransactions(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch vendor transactions' });
  }
});

router.post('/payout', auth, async (req, res) => {
  try {
    await service.requestPayout(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to process payout request' });
  }
});

module.exports = router;

