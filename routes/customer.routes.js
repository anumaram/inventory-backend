const router = require('express').Router();
const service = require('../services/customer.service');

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

module.exports = router;
