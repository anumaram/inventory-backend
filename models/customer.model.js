const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
