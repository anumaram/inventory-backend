const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const service = require('../services/address.service');

router.post('/', customerAuth, async (req, res) => {
  try {
    await service.createAddress(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create address' });
  }
});

router.get('/', customerAuth, async (req, res) => {
  try {
    await service.getAddresses(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load addresses' });
  }
});

router.get('/:id', customerAuth, async (req, res) => {
  try {
    await service.getAddress(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load address' });
  }
});

router.patch('/:id', customerAuth, async (req, res) => {
  try {
    await service.updateAddress(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update address' });
  }
});

router.delete('/:id', customerAuth, async (req, res) => {
  try {
    await service.deleteAddress(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to delete address' });
  }
});

module.exports = router;
