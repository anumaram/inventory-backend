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

const Banner = require('../models/banner.model');
const Promotion = require('../models/promotion.model');
const Coupon = require('../models/coupon.model');

router.get('/public-banners', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true, isDeleted: { $ne: true } })
      .sort({ priority: 1, createdAt: -1 })
      .lean();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load banners' });
  }
});

router.get('/public-promotions', async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isActive: true,
      isDeleted: { $ne: true },
      $or: [{ endDate: { $gte: now } }, { endDate: null }]
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load promotions' });
  }
});

router.get('/public-coupons', async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      isDeleted: { $ne: true },
      $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }]
    })
      .select('code title description discountType discountValue minOrderAmount maxDiscountAmount expiryDate')
      .sort({ minOrderAmount: 1, createdAt: -1 })
      .lean();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load coupons' });
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
