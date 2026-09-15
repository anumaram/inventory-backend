const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

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
    if (decoded.type !== 'admin') {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    const admin = await Admin.findOne({ _id: decoded.id, isDeleted: { $ne: true } });
    if (!admin) {
      return res.status(401).json({ msg: 'Admin account not found or deactivated' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({
        msg: 'Your administrator account access has been blocked. Please contact the super administrator.',
        accountBlocked: true
      });
    }

    req.adminId = admin._id;
    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

