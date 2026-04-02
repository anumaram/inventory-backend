const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }

  const existingAgg = await User.aggregate([
    { $match: { email, isDeleted: { $ne: true } } },
    { $limit: 1 }
  ]);
  const existing = existingAgg[0] || null;
  if (existing) {
    throw new Error('Email already registered');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  return { id: user._id, name: user.name, email: user.email };
};

exports.login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const userAgg = await User.aggregate([
    { $match: { email, isDeleted: { $ne: true } } },
    { $limit: 1 }
  ]);
  const user = userAgg[0] || null;
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user._id, type: 'vendor' }, JWT_SECRET);
  return { token };
};
