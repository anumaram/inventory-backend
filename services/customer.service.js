const Customer = require('../models/customer.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }

  if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
    throw new Error('Please use a valid Gmail address ending with @gmail.com');
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

exports.getMe = async (req, res) => {
  const customer = await Customer.findOne({ _id: req.customerId, isDeleted: { $ne: true } }).select('name email phone gender dateOfBirth createdAt');
  if (!customer) return res.status(404).json({ msg: 'Customer not found' });
  res.json(customer);
};

exports.updateMe = async (req, res) => {
  const { name, email, phone = '', gender = '', dateOfBirth = '' } = req.body || {};
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ msg: 'Valid name and email are required' });
  if (phone && !/^[0-9]{10}$/.test(String(phone).trim())) return res.status(400).json({ msg: 'Phone number must be a valid 10-digit number' });
  if (gender && !['male', 'female', 'other'].includes(String(gender).toLowerCase())) return res.status(400).json({ msg: 'Invalid gender' });
  if (dateOfBirth && Number.isNaN(new Date(dateOfBirth).getTime())) return res.status(400).json({ msg: 'Invalid date of birth' });
  const existing = await Customer.findOne({ email: email.trim(), _id: { $ne: req.customerId }, isDeleted: { $ne: true } });
  if (existing) return res.status(400).json({ msg: 'Email already registered' });
  const payload = {
    name: name.trim(),
    email: email.trim(),
    phone: phone ? String(phone).trim() : '',
    gender: gender ? String(gender).trim() : '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().slice(0, 10) : ''
  };
  const customer = await Customer.findOneAndUpdate({ _id: req.customerId, isDeleted: { $ne: true } }, payload, { returnDocument: 'after' }).select('name email phone gender dateOfBirth createdAt');
  if (!customer) return res.status(404).json({ msg: 'Customer not found' });
  res.json(customer);
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ msg: 'All password fields are required' });
  if (newPassword.length < 6) return res.status(400).json({ msg: 'New password must be at least 6 characters' });
  if (newPassword !== confirmPassword) return res.status(400).json({ msg: 'New passwords do not match' });
  const customer = await Customer.findOne({ _id: req.customerId, isDeleted: { $ne: true } });
  if (!customer || !(await bcrypt.compare(currentPassword, customer.password))) return res.status(400).json({ msg: 'Current password is incorrect' });
  customer.password = await bcrypt.hash(newPassword, 10);
  await customer.save();
  res.json({ msg: 'Password changed successfully' });
};

const paymentData = (body = {}) => {
  const type = body.type;
  if (!['upi', 'card', 'netbanking'].includes(type)) throw new Error('Invalid payment method type');
  if (type === 'upi') {
    if (!/^[\w.-]+@[\w.-]+$/.test(body.upiId || '')) throw new Error('Valid UPI ID is required');
    return { type, upiId: body.upiId.trim(), isDefault: Boolean(body.isDefault) };
  }
  if (type === 'netbanking') {
    if (!body.bankName?.trim() || !body.accountName?.trim() || !/^\d{9,18}$/.test(String(body.accountNumber || '')) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(body.ifsc || '').toUpperCase())) throw new Error('Valid bank account details are required');
    return { type, bankName: body.bankName.trim(), accountName: body.accountName.trim(), accountNumber: String(body.accountNumber), ifsc: String(body.ifsc).toUpperCase(), isDefault: Boolean(body.isDefault) };
  }
  if (type === 'card') {
    const digits = String(body.cardNumber || '').replace(/\D/g, '');
    if (!body.cardholderName?.trim() || digits.length < 4 || !/^(0[1-9]|1[0-2])$/.test(String(body.expiryMonth || '')) || !/^\d{2,4}$/.test(String(body.expiryYear || ''))) throw new Error('Safe card details are incomplete');
    return { type, cardholderName: body.cardholderName.trim(), last4: digits.slice(-4), expiryMonth: String(body.expiryMonth), expiryYear: String(body.expiryYear), cardBrand: /^4/.test(digits) ? 'Visa' : /^5/.test(digits) ? 'Mastercard' : 'Card', isDefault: Boolean(body.isDefault) };
  }
};

const PaymentMethod = require('../models/payment-method.model');

exports.getPaymentMethods = async (req, res) => {
  const methods = await PaymentMethod.find({ customerId: req.customerId, isDeleted: { $ne: true } }).sort({ isDefault: -1, createdAt: -1 });
  res.json(methods || []);
};

exports.getWallet = async (req, res) => {
  const customer = await Customer.findById(req.customerId).select('wallet');
  if (!customer) return res.status(404).json({ msg: 'Customer not found' });
  res.json({ balance: customer.wallet?.balance || 0 });
};

exports.topUpWallet = async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) return res.status(400).json({ msg: 'Invalid top-up amount' });
  
  const customer = await Customer.findById(req.customerId);
  if (!customer) return res.status(404).json({ msg: 'Customer not found' });

  let method = null;
  if (req.body?.paymentMethodId) {
    method = await PaymentMethod.findOne({ _id: req.body.paymentMethodId, customerId: req.customerId, isDeleted: { $ne: true } });
  }
  if (!method) {
    method = await PaymentMethod.findOne({ customerId: req.customerId, isDeleted: { $ne: true } });
  }

  customer.wallet = customer.wallet || { balance: 0 };
  customer.wallet.balance = Number(customer.wallet.balance || 0) + amount;
  await customer.save();

  const notificationService = require('./notification.service');
  notificationService.createNotification({
    recipientType: 'customer',
    recipientId: req.customerId,
    title: 'Wallet Topped Up 💰',
    message: `₹${amount.toLocaleString('en-IN')} has been added to your wallet. Updated balance: ₹${customer.wallet.balance.toLocaleString('en-IN')}.`,
    type: 'wallet_topup',
    actionUrl: '/customer/settings'
  }).catch(e => console.error('[CustomerService] Wallet notif error:', e.message));

  res.json({ balance: customer.wallet.balance, msg: 'Wallet top-up completed' });
};

exports.addPaymentMethod = async (req, res) => {
  const body = req.body || {};
  const type = String(body.type || 'card').toLowerCase();
  const isDefault = Boolean(body.isDefault);

  if (isDefault) {
    await PaymentMethod.updateMany({ customerId: req.customerId }, { isDefault: false });
  }

  let newDoc = {
    customerId: req.customerId,
    type,
    isDefault
  };

  if (type === 'card') {
    const rawNum = String(body.cardNumber || '').replace(/\D/g, '');
    newDoc.cardNumber = rawNum;
    newDoc.last4 = rawNum.slice(-4) || '1234';
    newDoc.cardHolderName = body.cardHolderName || body.cardholderName || 'Cardholder';
    newDoc.expiry = body.expiry || (body.expiryMonth && body.expiryYear ? `${body.expiryMonth}/${body.expiryYear}` : '12/28');
    newDoc.cardType = /^4/.test(rawNum) ? 'visa' : /^5/.test(rawNum) ? 'mastercard' : 'card';
  } else if (type === 'upi') {
    newDoc.upiId = body.upiId || 'user@upi';
  } else if (type === 'netbanking') {
    newDoc.bankName = body.bankName || 'State Bank of India';
    newDoc.accountNumber = body.accountNumber || '';
  }

  const saved = await PaymentMethod.create(newDoc);
  res.status(201).json(saved);
};

exports.updatePaymentMethod = async (req, res) => {
  const existing = await PaymentMethod.findOne({ _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } });
  if (!existing) return res.status(404).json({ msg: 'Payment method not found' });

  const body = req.body || {};
  if (body.isDefault) {
    await PaymentMethod.updateMany({ customerId: req.customerId }, { isDefault: false });
    existing.isDefault = true;
  }

  if (body.type) existing.type = body.type;
  if (body.cardHolderName || body.cardholderName) existing.cardHolderName = body.cardHolderName || body.cardholderName;
  if (body.expiry) existing.expiry = body.expiry;
  if (body.cardNumber) {
    const rawNum = String(body.cardNumber).replace(/\D/g, '');
    existing.cardNumber = rawNum;
    existing.last4 = rawNum.slice(-4);
  }
  if (body.upiId) existing.upiId = body.upiId;
  if (body.bankName) existing.bankName = body.bankName;

  await existing.save();
  res.json(existing);
};

exports.deletePaymentMethod = async (req, res) => {
  const existing = await PaymentMethod.findOne({ _id: req.params.id, customerId: req.customerId });
  if (!existing) return res.status(404).json({ msg: 'Payment method not found' });

  await PaymentMethod.deleteOne({ _id: req.params.id });
  res.json({ msg: 'Payment method removed successfully' });
};
