const express = require('express');
const router = express.Router();
const optionalCustomerAuth = require('../middleware/optionalCustomerAuth');
const priceHistoryService = require('../services/price-history.service');

router.post('/alert', optionalCustomerAuth, priceHistoryService.setPriceAlert);
router.get('/:productId', priceHistoryService.getPriceHistory);

module.exports = router;
