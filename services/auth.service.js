const User = require('../models/user.model');
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
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      type: 'vendor'
    }
  };
};

const emailService = require('./email.service');
const Customer = require('../models/customer.model');

exports.sendOtp = async ({ email, userType = 'customer', purpose = 'login' }) => {
  if (!email) throw new Error('Email is required');
  const cleanEmail = email.trim().toLowerCase();

  let targetUser = null;
  if (userType === 'vendor') {
    targetUser = await User.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
  } else {
    targetUser = await Customer.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
  }

  if (!targetUser) {
    throw new Error(`No ${userType} account found with email ${cleanEmail}`);
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const AccountModel = userType === 'vendor' ? User : Customer;
  await AccountModel.updateOne(
    { _id: targetUser._id },
    { $set: { 'otp.code': otpCode, 'otp.purpose': purpose, 'otp.expiresAt': otpExpiresAt } }
  );

  // Send Email
  try {
    await emailService.sendOtpEmail({
      email: cleanEmail,
      name: targetUser.name,
      otp: otpCode,
      purpose: purpose.charAt(0).toUpperCase() + purpose.slice(1)
    });
  } catch (emailErr) {
    console.error('[AuthService] Email delivery notice:', emailErr.message);
  }

  return { success: true, message: `OTP sent successfully to ${cleanEmail}` };
};

exports.verifyOtpLogin = async ({ email, otp, userType = 'customer' }) => {
  if (!email || !otp) throw new Error('Email and OTP code are required');
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const AccountModel = userType === 'vendor' ? User : Customer;
  const record = await AccountModel.findOne({
    email: cleanEmail,
    isDeleted: { $ne: true },
    'otp.code': cleanOtp,
    'otp.purpose': 'login',
    'otp.expiresAt': { $gt: new Date() }
  });

  if (!record) {
    throw new Error('Invalid or expired OTP code');
  }

  // Clear used OTP after successful verification.
  await AccountModel.updateOne(
    { _id: record._id },
    { $set: { 'otp.code': '', 'otp.purpose': '', 'otp.expiresAt': null } }
  );

  let targetUser = null;
  if (userType === 'vendor') {
    targetUser = await User.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
    if (!targetUser) throw new Error('Vendor account not found');
    const token = jwt.sign({ id: targetUser._id, type: 'vendor' }, JWT_SECRET);
    return {
      token,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        type: 'vendor'
      }
    };
  } else {
    targetUser = await Customer.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
    if (!targetUser) throw new Error('Customer account not found');
    const token = jwt.sign({ id: targetUser._id, type: 'customer' }, JWT_SECRET);
    return {
      token,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        type: 'customer'
      }
    };
  }
};

exports.forgotPassword = async ({ email, userType = 'customer' }) => {
  if (!email) throw new Error('Email is required');
  const cleanEmail = email.trim().toLowerCase();

  let targetUser = null;
  if (userType === 'vendor') {
    targetUser = await User.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
  } else {
    targetUser = await Customer.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
  }

  if (!targetUser) {
    throw new Error(`No account registered with ${cleanEmail}`);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const AccountModel = userType === 'vendor' ? User : Customer;
  await AccountModel.updateOne(
    { _id: targetUser._id },
    { $set: { 'otp.code': otpCode, 'otp.purpose': 'reset-password', 'otp.expiresAt': otpExpiresAt } }
  );

  await emailService.sendOtpEmail({
    email: cleanEmail,
    name: targetUser.name,
    otp: otpCode,
    purpose: 'Password Reset'
  });

  return { success: true, message: `Reset OTP sent to ${cleanEmail}` };
};

exports.resetPasswordWithOtp = async ({ email, otp, newPassword, userType = 'customer' }) => {
  if (!email || !otp || !newPassword) throw new Error('Email, OTP and new password are required');
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const AccountModel = userType === 'vendor' ? User : Customer;
  const record = await AccountModel.findOne({
    email: cleanEmail,
    isDeleted: { $ne: true },
    'otp.code': cleanOtp,
    'otp.purpose': 'reset-password',
    'otp.expiresAt': { $gt: new Date() }
  });

  if (!record) {
    throw new Error('Invalid or expired reset code');
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  if (userType === 'vendor') {
    await User.updateOne({ email: cleanEmail, isDeleted: { $ne: true } }, { $set: { password: hashed } });
  } else {
    await Customer.updateOne({ email: cleanEmail, isDeleted: { $ne: true } }, { $set: { password: hashed } });
  }

  await AccountModel.updateOne(
    { _id: record._id },
    { $set: { 'otp.code': '', 'otp.purpose': '', 'otp.expiresAt': null } }
  );
  return { success: true, message: 'Password reset successfully. You can now login.' };
};

