const mongoose = require('mongoose');
const Address = require('../models/address.model');
const Customer = require('../models/customer.model');

const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'type'];
const editableFields = [
  ...requiredFields,
  'addressLine2',
  'house',
  'area',
  'saveAs',
  'formattedAddress',
  'coordinates',
  'isDefault'
];

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const validateAddress = (address) => {
  const missing = requiredFields.find((field) => !hasValue(address[field]));
  if (missing) {
    return `${missing} is required`;
  }
  if (!/^\d{10}$/.test(String(address.phone || '').trim())) {
    return 'Phone must be a valid 10-digit Indian phone number';
  }
  if (!/^\d{6}$/.test(String(address.pincode || '').trim())) {
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
  const payload = { ...(req.body || {}) };

  // Fetch customer for default fallbacks if missing
  const customer = await Customer.findById(req.customerId).select('name phone mobile defaultAddressId').lean();
  if (!hasValue(payload.fullName) && customer?.name) {
    payload.fullName = customer.name;
  }
  if (!hasValue(payload.phone) && (customer?.phone || customer?.mobile)) {
    payload.phone = customer.phone || customer.mobile;
  }

  // Synthesize addressLine1 from house and area if addressLine1 is missing
  if (!hasValue(payload.addressLine1) && (hasValue(payload.house) || hasValue(payload.area))) {
    payload.addressLine1 = [payload.house, payload.area].filter(Boolean).join(', ');
  }

  const error = validateAddress(payload);
  if (error) {
    return res.status(400).json({ msg: error });
  }

  const addressData = {
    customerId: req.customerId,
    ...editableFields.reduce((result, field) => {
      if (payload[field] !== undefined) result[field] = payload[field];
      return result;
    }, {})
  };

  // Auto-resolve coordinates if missing or { lat: 0, lng: 0 }
  if (!addressData.coordinates?.lat || Number(addressData.coordinates.lat) === 0) {
    const cityNorm = String(addressData.city || '').toLowerCase().trim();
    const KNOWN = {
      'guntur': { lat: 16.3067, lng: 80.4365 },
      'vinukonda': { lat: 16.0538, lng: 79.7428 },
      'denkada': { lat: 18.0833, lng: 83.4500 },
      'vizianagaram': { lat: 18.1067, lng: 83.3956 },
      'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'vijayawada': { lat: 16.5062, lng: 80.6480 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'bengaluru': { lat: 12.9716, lng: 77.5946 },
      'delhi': { lat: 28.6139, lng: 77.2090 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'chennai': { lat: 13.0827, lng: 80.2707 }
    };
    if (KNOWN[cityNorm]) {
      addressData.coordinates = KNOWN[cityNorm];
    }
  }

  // If first address for customer, auto-make it default
  const existingCount = await Address.countDocuments({ customerId: req.customerId, isDeleted: { $ne: true } });
  if (existingCount === 0) {
    addressData.isDefault = true;
  }

  const address = await Address.create(addressData);

  // Sync default status
  if (address.isDefault) {
    await Address.updateMany(
      { customerId: req.customerId, _id: { $ne: address._id } },
      { $set: { isDefault: false } }
    );
    await Customer.updateOne(
      { _id: req.customerId },
      { $set: { defaultAddressId: address._id } }
    ).catch(() => {});
  }

  // Sync phone to customer profile if unset
  if (address.phone) {
    await Customer.updateOne(
      { _id: req.customerId, $or: [{ phone: { $exists: false } }, { phone: '' }, { phone: null }] },
      { $set: { phone: address.phone.trim() } }
    ).catch(() => {});
  }

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

  if (!updates.addressLine1 && (updates.area || existing.area)) {
    const h = updates.house !== undefined ? updates.house : existing.house;
    const a = updates.area !== undefined ? updates.area : existing.area;
    updates.addressLine1 = [h, a].filter(Boolean).join(', ') || a || 'Main Road';
  }

  const error = validateAddress({ ...existing.toObject(), ...updates });
  if (error) {
    return res.status(400).json({ msg: error });
  }

  if (updates.city && (!updates.coordinates?.lat || Number(updates.coordinates.lat) === 0)) {
    const cityNorm = String(updates.city || '').toLowerCase().trim();
    const KNOWN = {
      'guntur': { lat: 16.3067, lng: 80.4365 },
      'vinukonda': { lat: 16.0538, lng: 79.7428 },
      'denkada': { lat: 18.0833, lng: 83.4500 },
      'vizianagaram': { lat: 18.1067, lng: 83.3956 },
      'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'vijayawada': { lat: 16.5062, lng: 80.6480 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'bengaluru': { lat: 12.9716, lng: 77.5946 },
      'delhi': { lat: 28.6139, lng: 77.2090 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'chennai': { lat: 13.0827, lng: 80.2707 }
    };
    if (KNOWN[cityNorm]) {
      updates.coordinates = KNOWN[cityNorm];
    }
  }

  const address = await Address.findByIdAndUpdate(existing._id, updates, {
    returnDocument: 'after',
    runValidators: true
  });

  if (updates.isDefault === true) {
    await Address.updateMany(
      { customerId: req.customerId, _id: { $ne: address._id } },
      { $set: { isDefault: false } }
    );
    await Customer.updateOne(
      { _id: req.customerId },
      { $set: { defaultAddressId: address._id } }
    ).catch(() => {});
  }

  res.json(address);
};

exports.setDefaultAddress = async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(404).json({ msg: 'Address not found' });
  }
  const address = await Address.findOne(addressFilter(req));
  if (!address) {
    return res.status(404).json({ msg: 'Address not found' });
  }

  await Address.updateMany(
    { customerId: req.customerId },
    { $set: { isDefault: false } }
  );

  address.isDefault = true;
  await address.save();

  await Customer.updateOne(
    { _id: req.customerId },
    { $set: { defaultAddressId: address._id } }
  ).catch(() => {});

  res.json({ success: true, msg: 'Default address updated successfully', address });
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

  // If deleted address was default, set next available address as default
  if (address.isDefault) {
    const nextAddr = await Address.findOne({ customerId: req.customerId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    if (nextAddr) {
      nextAddr.isDefault = true;
      await nextAddr.save();
      await Customer.updateOne({ _id: req.customerId }, { $set: { defaultAddressId: nextAddr._id } }).catch(() => {});
    } else {
      await Customer.updateOne({ _id: req.customerId }, { $unset: { defaultAddressId: 1 } }).catch(() => {});
    }
  }

  res.json({ msg: 'Removed' });
};
