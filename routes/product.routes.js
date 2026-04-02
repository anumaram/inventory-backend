const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const {
  createProduct,
  getProducts,
  getAllProducts,
  deleteProduct
} = require('../services/product.service');

router.get('/public', async (req, res) => {
  try {
    await getAllProducts(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load products' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    await createProduct(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create product' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    await getProducts(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load products' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteProduct(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to delete product' });
  }
});

module.exports = router;
