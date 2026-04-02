const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const vendorAuth = require('../middleware/auth.middleware');
const { createOrder, getCustomerOrders, getVendorOrders } = require('../services/order.service');

router.post('/', customerAuth, async (req, res) => {
  try {
    await createOrder(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create order' });
  }
});

router.get('/', customerAuth, async (req, res) => {
  try {
    await getCustomerOrders(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load orders' });
  }
});

router.get('/vendor', vendorAuth, async (req, res) => {
  try {
    await getVendorOrders(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load vendor orders' });
  }
});

module.exports = router;
