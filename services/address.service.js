const mongoose = require('mongoose');
const Address = require('../models/address.model');

const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'type'];
const editableFields = [...requiredFields, 'addressLine2'];

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const validateAddress = (address) => {
  const missing = requiredFields.find((field) => !hasValue(address[field]));
  if (missing) {
    return `${missing} is required`;
  }
  if (!/^\d{10}$/.test(address.phone.trim())) {
    return 'Phone must be a valid 10-digit Indian phone number';
  }
  if (!/^\d{6}$/.test(address.pincode.trim())) {
    return 'Pincode must be a valid 6-digit Indian pincode';
  }
  return null;
};

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const addressFilter = (req) => ({
  _id: req.params.id,
  customerId: req.customerId,
  isDeleted: { $ne: true }
});

exports.createAddress = async (req, res) => {
  const error = validateAddress(req.body || {});
  if (error) {
    return res.status(400).json({ msg: error });
  }

  const address = await Address.create({
    customerId: req.customerId,
    ...editableFields.reduce((result, field) => {
      if (req.body[field] !== undefined) result[field] = req.body[field];
      return result;
    }, {})
  });
  res.status(201).json(address);
};

exports.getAddresses = async (req, res) => {
  const addresses = await Address.find({
    customerId: req.customerId,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });
  res.json(addresses);
};

exports.getAddress = async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(404).json({ msg: 'Address not found' });
  }
  const address = await Address.findOne(addressFilter(req));
  if (!address) {
    return res.status(404).json({ msg: 'Address not found' });
  }
  res.json(address);
};

exports.updateAddress = async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(404).json({ msg: 'Address not found' });
  }

  const existing = await Address.findOne(addressFilter(req));
  if (!existing) {
    return res.status(404).json({ msg: 'Address not found' });
  }

  const updates = editableFields.reduce((result, field) => {
    if (req.body[field] !== undefined) result[field] = req.body[field];
    return result;
  }, {});
  const error = validateAddress({ ...existing.toObject(), ...updates });
  if (error) {
    return res.status(400).json({ msg: error });
  }

  const address = await Address.findByIdAndUpdate(existing._id, updates, {
    returnDocument: 'after',
    runValidators: true
  });
  res.json(address);
};

exports.deleteAddress = async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(404).json({ msg: 'Address not found' });
  }
  const address = await Address.findOneAndUpdate(addressFilter(req), { isDeleted: true }, {
    returnDocument: 'after'
  });
  if (!address) {
    return res.status(404).json({ msg: 'Address not found' });
  }
  res.json({ msg: 'Removed' });
};
