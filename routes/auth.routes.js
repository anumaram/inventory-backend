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
    res.status(401).send({ msg: err.message || 'Login failed' });
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
    res.status(400).send({ msg: err.message || 'Invalid or expired OTP' });
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

module.exports = router;
