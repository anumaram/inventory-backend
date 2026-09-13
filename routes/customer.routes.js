const router = require('express').Router();
const service = require('../services/customer.service');
const customerAuth = require('../middleware/customer.middleware');

router.post('/register', async (req, res) => {
  try {
    const result = await service.register(req.body);
    res.send(result);
  } catch (err) {
    res.status(400).send({ msg: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await service.login(req.body);
    res.send(result);
  } catch (err) {
    res.status(401).send({ msg: err.message || 'Login failed' });
  }
});

router.get('/me', customerAuth, async (req, res) => {
  try { await service.getMe(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to load profile' }); }
});
router.patch('/me', customerAuth, async (req, res) => {
  try { await service.updateMe(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to update profile' }); }
});
router.patch('/me/password', customerAuth, async (req, res) => {
  try { await service.changePassword(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to change password' }); }
});
router.get('/payment-methods', customerAuth, async (req, res) => {
  try { await service.getPaymentMethods(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to load payment methods' }); }
});
router.post('/payment-methods', customerAuth, async (req, res) => {
  try { await service.addPaymentMethod(req, res); } catch (err) { res.status(400).json({ msg: err.message || 'Failed to save payment method' }); }
});
router.patch('/payment-methods/:id', customerAuth, async (req, res) => {
  try { await service.updatePaymentMethod(req, res); } catch (err) { res.status(400).json({ msg: err.message || 'Failed to update payment method' }); }
});
router.delete('/payment-methods/:id', customerAuth, async (req, res) => {
  try { await service.deletePaymentMethod(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to delete payment method' }); }
});
router.get('/wallet', customerAuth, async (req, res) => {
  try { await service.getWallet(req, res); } catch (err) { res.status(500).json({ msg: err.message || 'Failed to load wallet' }); }
});
router.post('/wallet/top-up', customerAuth, async (req, res) => {
  try { await service.topUpWallet(req, res); } catch (err) { res.status(400).json({ msg: err.message || 'Failed to top up wallet' }); }
});

module.exports = router;
