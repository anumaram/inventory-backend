const Customer = require('../models/customer.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }

  const existingAgg = await Customer.aggregate([
    { $match: { email, isDeleted: { $ne: true } } },
    { $limit: 1 }
  ]);
  const existing = existingAgg[0] || null;
  if (existing) {
    throw new Error('Email already registered');
  }

  const hashed = await bcrypt.hash(password, 10);
  const customer = await Customer.create({ name, email, password: hashed });

  return { id: customer._id, name: customer.name, email: customer.email };
};

exports.login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const customerAgg = await Customer.aggregate([
    { $match: { email, isDeleted: { $ne: true } } },
    { $limit: 1 }
  ]);
  const customer = customerAgg[0] || null;
  if (!customer) {
    throw new Error('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, customer.password);
  if (!ok) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: customer._id, type: 'customer' }, JWT_SECRET);
  return { token };
};
