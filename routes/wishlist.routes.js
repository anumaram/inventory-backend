const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection
} = require('../services/wishlist.service');

router.get('/collections', customerAuth, async (req, res) => {
  try {
    await getCollections(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load wishlist collections' });
  }
});

router.post('/collections', customerAuth, async (req, res) => {
  try {
    await createCollection(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create wishlist collection' });
  }
});

router.put('/collections/:id', customerAuth, async (req, res) => {
  try {
    await updateCollection(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update wishlist collection' });
  }
});

router.delete('/collections/:id', customerAuth, async (req, res) => {
  try {
    await deleteCollection(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to delete wishlist collection' });
  }
});

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
