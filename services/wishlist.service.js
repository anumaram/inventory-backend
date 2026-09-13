const mongoose = require('mongoose');
const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model');
const WishlistCollection = require('../models/wishlist-collection.model');

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
        collectionId: 1,
        productId: { $ifNull: ['$product._id', null] },
        name: { $ifNull: ['$product.name', 'Unknown'] },
        description: { $ifNull: ['$product.description', ''] },
        category: { $ifNull: ['$product.category', 'Others'] },
        image: { $ifNull: ['$product.image', { $arrayElemAt: ['$product.images', 0] }] },
        price: { $ifNull: ['$product.price', 0] },
        quantity: { $ifNull: ['$product.quantity', 0] },
        rating: { $ifNull: ['$product.rating', 0] },
        ratingCount: { $ifNull: ['$product.ratingCount', 0] },
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] }
      }
    }
  ]);

  res.json(items);
};

exports.addToWishlist = async (req, res) => {
  const { productId, collectionId } = req.body;
  if (!productId) {
    return res.status(400).json({ msg: 'Product is required' });
  }

  let targetCollectionId = collectionId;
  if (!targetCollectionId || !mongoose.Types.ObjectId.isValid(targetCollectionId)) {
    let defaultCol = await WishlistCollection.findOne({ customerId: req.customerId }).sort({ createdAt: 1 });
    if (!defaultCol) {
      defaultCol = await WishlistCollection.create({ customerId: req.customerId, name: 'My Wishlist' });
    }
    targetCollectionId = defaultCol._id;
  } else {
    const collection = await WishlistCollection.findOne({ _id: targetCollectionId, customerId: req.customerId }).lean();
    if (!collection) {
      return res.status(404).json({ msg: 'Wishlist collection not found' });
    }
  }

  const existingAgg = await Wishlist.aggregate([
    {
      $match: {
        customerId: toObjectId(req.customerId),
        productId: toObjectId(productId)
      }
    },
    { $limit: 1 },
    { $project: { _id: 1, customerId: 1, productId: 1, isDeleted: 1, collectionId: 1 } }
  ]);
  const existing = existingAgg[0] || null;
  if (existing) {
    if (existing.isDeleted) {
      const updated = await Wishlist.findOneAndUpdate(
        { _id: existing._id },
        { isDeleted: false, collectionId: targetCollectionId },
        { returnDocument: 'after' }
      );
      return res.json(updated);
    }
    if (!existing.collectionId || String(existing.collectionId) !== String(targetCollectionId)) {
      const moved = await Wishlist.findOneAndUpdate(
        { _id: existing._id },
        { collectionId: targetCollectionId },
        { returnDocument: 'after' }
      );
      return res.json(moved);
    }
    return res.json(existing);
  }

  const product = await Product.findById(productId).select('category').lean();
  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  const item = await Wishlist.create({
    customerId: req.customerId,
    productId,
    collectionId: targetCollectionId,
    category: product.category || 'Others'
  });
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

exports.getCollections = async (req, res) => {
  let collections = await WishlistCollection.aggregate([
    { $match: { customerId: toObjectId(req.customerId) } },
    {
      $lookup: {
        from: 'wishlists',
        let: { collectionId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$collectionId', '$$collectionId'] }, { $ne: ['$isDeleted', true] }] } } },
          { $count: 'count' }
        ],
        as: 'items'
      }
    },
    { $project: { name: 1, createdAt: 1, count: { $ifNull: [{ $arrayElemAt: ['$items.count', 0] }, 0] } } },
    { $sort: { createdAt: 1 } }
  ]);

  if (collections.length === 0) {
    const defaults = ['Favorites', 'Home & Living', 'Tech & Gadgets', 'Fashion Picks'];
    for (const name of defaults) {
      try {
        await WishlistCollection.create({ customerId: req.customerId, name });
      } catch (e) {
        // ignore duplicate
      }
    }
    collections = await WishlistCollection.aggregate([
      { $match: { customerId: toObjectId(req.customerId) } },
      {
        $lookup: {
          from: 'wishlists',
          let: { collectionId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$collectionId', '$$collectionId'] }, { $ne: ['$isDeleted', true] }] } } },
            { $count: 'count' }
          ],
          as: 'items'
        }
      },
      { $project: { name: 1, createdAt: 1, count: { $ifNull: [{ $arrayElemAt: ['$items.count', 0] }, 0] } } },
      { $sort: { createdAt: 1 } }
    ]);
  }

  res.json(collections);
};

exports.createCollection = async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ msg: 'Collection name is required' });
  if (name.length > 60) return res.status(400).json({ msg: 'Collection name is too long' });

  try {
    const collection = await WishlistCollection.create({ customerId: req.customerId, name });
    res.status(201).json({ ...collection.toObject(), count: 0 });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ msg: 'A collection with this name already exists' });
    throw error;
  }
};

exports.updateCollection = async (req, res) => {
  const { id } = req.params;
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ msg: 'Collection name is required' });
  if (name.length > 60) return res.status(400).json({ msg: 'Collection name is too long' });

  try {
    const updated = await WishlistCollection.findOneAndUpdate(
      { _id: toObjectId(id), customerId: toObjectId(req.customerId) },
      { name },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ msg: 'Collection not found' });
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ msg: 'A collection with this name already exists' });
    throw error;
  }
};

exports.deleteCollection = async (req, res) => {
  const { id } = req.params;
  const colId = toObjectId(id);
  const cId = toObjectId(req.customerId);

  const target = await WishlistCollection.findOne({ _id: colId, customerId: cId });
  if (!target) return res.status(404).json({ msg: 'Collection not found' });

  // Find fallback collection to preserve items
  let fallback = await WishlistCollection.findOne({ _id: { $ne: colId }, customerId: cId });
  if (!fallback) {
    fallback = await WishlistCollection.create({ customerId: cId, name: 'Favorites' });
  }

  // Move items in deleted collection to fallback collection
  await Wishlist.updateMany(
    { collectionId: colId, customerId: cId },
    { $set: { collectionId: fallback._id } }
  );

  await WishlistCollection.deleteOne({ _id: colId, customerId: cId });
  res.json({ msg: 'Collection deleted successfully', fallbackCollectionId: fallback._id });
};
