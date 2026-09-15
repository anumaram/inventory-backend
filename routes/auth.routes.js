const router = require('express').Router();
const service = require('../services/auth.service');

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
    const status = err.statusCode || 401;
    res.status(status).send({ msg: err.message || 'Login failed', accountBlocked: Boolean(err.accountBlocked) });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    const result = await service.sendOtp(req.body);
    res.send(result);
  } catch (err) {
    res.status(400).send({ msg: err.message || 'Failed to send OTP' });
  }
});

router.post('/verify-otp-login', async (req, res) => {
  try {
    const result = await service.verifyOtpLogin(req.body);
    res.send(result);
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).send({ msg: err.message || 'Invalid or expired OTP', accountBlocked: Boolean(err.accountBlocked) });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const result = await service.forgotPassword(req.body);
    res.send(result);
  } catch (err) {
    res.status(400).send({ msg: err.message || 'Failed to process forgot password request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const result = await service.resetPasswordWithOtp(req.body);
    res.send(result);
  } catch (err) {
    res.status(400).send({ msg: err.message || 'Failed to reset password' });
  }
});

const vendorAuth = require('../middleware/auth.middleware');

router.get('/me', vendorAuth, async (req, res) => {
  try {
    const profile = await service.getVendorProfile(req.userId);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.patch('/profile', vendorAuth, async (req, res) => {
  try {
    const updated = await service.updateVendorProfile(req.userId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.patch('/change-password', vendorAuth, async (req, res) => {
  try {
    const result = await service.changeVendorPassword(req.userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.post('/security-otp', vendorAuth, async (req, res) => {
  try {
    const result = await service.sendVendorSecurityOtp(req.userId, req.body?.purpose || 'Security Verification');
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.get('/settings', vendorAuth, async (req, res) => {
  try {
    const settings = await service.getVendorSettings(req.userId);
    res.json(settings);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

router.put('/settings', vendorAuth, async (req, res) => {
  try {
    const result = await service.updateVendorSettings(req.userId, req.body);
    if (result && result.otpRequired) {
      return res.status(200).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
