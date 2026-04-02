const mongoose = require('mongoose');
const Wishlist = require('../models/wishlist.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

exports.getWishlist = async (req, res) => {
  const items = await Wishlist.aggregate([
    { $match: { customerId: toObjectId(req.customerId), isDeleted: { $ne: true } } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'product.userId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        productId: { $ifNull: ['$product._id', null] },
        name: { $ifNull: ['$product.name', 'Unknown'] },
        price: { $ifNull: ['$product.price', 0] },
        quantity: { $ifNull: ['$product.quantity', 0] },
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] }
      }
    }
  ]);

  res.json(items);
};

exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ msg: 'Product is required' });
  }

  const existingAgg = await Wishlist.aggregate([
    {
      $match: {
        customerId: toObjectId(req.customerId),
        productId: toObjectId(productId)
      }
    },
    { $limit: 1 },
    { $project: { _id: 1, customerId: 1, productId: 1, isDeleted: 1 } }
  ]);
  const existing = existingAgg[0] || null;
  if (existing) {
    if (existing.isDeleted) {
      const updated = await Wishlist.findOneAndUpdate(
        { _id: existing._id },
        { isDeleted: false },
        { returnDocument: 'after' }
      );
      return res.json(updated);
    }
    return res.json(existing);
  }

  const item = await Wishlist.create({ customerId: req.customerId, productId });
  res.json(item);
};

exports.removeFromWishlist = async (req, res) => {
  await Wishlist.findOneAndUpdate(
    { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );
  res.json({ msg: 'Removed' });
};
