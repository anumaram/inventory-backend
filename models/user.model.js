const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  otp: {
    code: { type: String, default: '' },
    purpose: { type: String, default: '' },
    expiresAt: { type: Date, default: null }
  },
  isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
