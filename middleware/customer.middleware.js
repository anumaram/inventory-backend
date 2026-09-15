const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'customer') {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    const customer = await Customer.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
    if (!customer) {
      return res.status(401).json({ msg: 'Customer account not found' });
    }

    if (customer.isBlocked) {
      return res.status(403).json({
        msg: 'Your account has been blocked by the administrator. Please contact support.',
        accountBlocked: true
      });
    }

    req.customerId = customer._id;
    req.customer = customer;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

