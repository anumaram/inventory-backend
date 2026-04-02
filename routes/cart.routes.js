const router = require('express').Router();

const customerAuth = require('../middleware/customer.middleware');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkoutCart
} = require('../services/cart.service');

router.get('/', customerAuth, async (req, res) => {
  try {
    await getCart(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load cart' });
  }
});

router.post('/', customerAuth, async (req, res) => {
  try {
    await addToCart(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to add to cart' });
  }
});

router.patch('/:id', customerAuth, async (req, res) => {
  try {
    await updateCartItem(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update cart item' });
  }
});

router.delete('/:id', customerAuth, async (req, res) => {
  try {
    await removeCartItem(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to remove cart item' });
  }
});

router.post('/checkout', customerAuth, async (req, res) => {
  try {
    await checkoutCart(req, res);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Checkout failed' });
  }
});

module.exports = router;
