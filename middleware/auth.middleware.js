const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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
    if (decoded.type && decoded.type !== 'vendor') {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    const vendor = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
    if (!vendor) {
      return res.status(401).json({ msg: 'Vendor account not found' });
    }

    if (vendor.status === 'suspended') {
      return res.status(403).json({
        msg: 'Your vendor account has been suspended by the administrator. Please contact support.',
        accountBlocked: true
      });
    }

    req.userId = vendor._id;
    req.vendor = vendor;
    req.user = vendor;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

