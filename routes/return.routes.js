const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { getReturns, getReturnById, updateReturnStatusByVendor } = require('../services/return.service');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Universal auth middleware supporting customer or vendor tokens
const universalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'customer' || decoded.role === 'customer') {
      req.customerId = decoded.id;
    } else {
      req.userId = decoded.id;
      req.user = decoded;
    }
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

router.get('/', universalAuth, getReturns);
router.get('/:id', universalAuth, getReturnById);
router.patch('/:id/status', universalAuth, updateReturnStatusByVendor);

module.exports = router;
