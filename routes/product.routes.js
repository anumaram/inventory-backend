const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const customerAuth = require('../middleware/customer.middleware');
const {
  createProduct,
  getProducts,
  getAllProducts,
  getProductById,
  getProductSearchMeta,
  getProductReviews,
  addProductReview,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  getProductHistory
} = require('../services/product.service');

router.get('/public', async (req, res) => {
  try {
    await getAllProducts(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load products' });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    await getProductById(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load product details' });
  }
});

router.get('/search-meta', async (req, res) => {
  try {
    await getProductSearchMeta(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load search metadata' });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    await getProductReviews(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load reviews' });
  }
});

router.post('/:id/reviews', customerAuth, async (req, res) => {
  try {
    await addProductReview(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to submit review' });
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

router.get('/:id/history', auth, async (req, res) => {
  try {
    await getProductHistory(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load product history' });
  }
});

router.patch('/:id/stock', auth, async (req, res) => {
  try {
    await adjustProductStock(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to adjust stock' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    await updateProduct(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update product' });
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
