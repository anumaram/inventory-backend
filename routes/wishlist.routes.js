const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../services/wishlist.service');

router.get('/', customerAuth, async (req, res) => {
  try {
    await getWishlist(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load wishlist' });
  }
});

router.post('/', customerAuth, async (req, res) => {
  try {
    await addToWishlist(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to add to wishlist' });
  }
});

router.delete('/:id', customerAuth, async (req, res) => {
  try {
    await removeFromWishlist(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to remove item' });
  }
});

module.exports = router;
