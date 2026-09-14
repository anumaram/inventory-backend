const express = require('express');
const router = express.Router();
const service = require('../services/transaction.service');
const customerAuth = require('../middleware/customer.middleware');

router.get('/', customerAuth, async (req, res) => {
  try { await service.getTransactions(req, res); }
  catch (err) { res.status(500).json({ msg: err.message || 'Failed to fetch transactions' }); }
});

router.get('/:id', customerAuth, async (req, res) => {
  try { await service.getTransactionById(req, res); }
  catch (err) { res.status(500).json({ msg: err.message || 'Failed to fetch transaction' }); }
});

module.exports = router;

