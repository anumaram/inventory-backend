const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        req.customerId = decoded.id;
        const cust = await Customer.findById(decoded.id).select('name email phone');
        if (cust) req.customer = cust;
      }
    } catch {}
  }

  // Fallback to query, body if passed explicitly
  if (!req.customerId) {
    req.customerId = (req.query && req.query.customerId) || (req.body && req.body.customerId);
  }

  next();
};
