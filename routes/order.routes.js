const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const vendorAuth = require('../middleware/auth.middleware');
const {
  createOrder,
  getCustomerOrders,
  getVendorOrders,
  updateVendorOrderStatus,
  cancelOrder,
  requestReturn,
  cancelReturn
} = require('../services/order.service');

router.post('/', customerAuth, async (req, res) => {
  try {
    await createOrder(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create order' });
  }
});

router.post('/:id/cancel', customerAuth, async (req, res) => {
  try {
    await cancelOrder(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to cancel order' });
  }
});

router.post('/:id/return', customerAuth, async (req, res) => {
  try {
    await requestReturn(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to request return' });
  }
});

router.post('/:id/cancel-return', customerAuth, async (req, res) => {
  try {
    await cancelReturn(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to cancel return request' });
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

router.patch('/vendor/:id/status', vendorAuth, async (req, res) => {
  try {
    await updateVendorOrderStatus(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update order status' });
  }
});

module.exports = router;
