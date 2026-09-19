const express = require('express');
const router = express.Router();
const optionalCustomerAuth = require('../middleware/optionalCustomerAuth');
const subscriptionService = require('../services/subscription.service');

router.get('/', optionalCustomerAuth, subscriptionService.getSubscriptions);
router.post('/', optionalCustomerAuth, subscriptionService.createSubscription);
router.put('/:id', optionalCustomerAuth, subscriptionService.updateSubscription);
router.put('/:id/status', optionalCustomerAuth, subscriptionService.updateSubscription);
router.post('/:id/skip', optionalCustomerAuth, subscriptionService.skipNextDelivery);
router.delete('/:id', optionalCustomerAuth, subscriptionService.deleteSubscription);
router.post('/:id/order-now', optionalCustomerAuth, subscriptionService.triggerOrderNow);

module.exports = router;

