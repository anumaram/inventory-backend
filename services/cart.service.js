const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const mapCartItem = (item) => ({
  _id: item._id,
  productId: item.productId?._id || item.productId || null,
  name: item.productId?.name || item.name || 'Unknown',
  price: item.productId?.price ?? item.price ?? 0,
  quantity: item.productId?.quantity ?? item.quantity ?? 0,
  vendorName: item.productId?.userId?.name || item.vendorName || 'Unknown',
  qty: item.qty || 1
});

exports.getCart = async (req, res) => {
  const items = await Cart.aggregate([
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
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        qty: { $ifNull: ['$qty', 1] }
      }
    }
  ]);

  res.json(items.map(mapCartItem));
};

exports.addToCart = async (req, res) => {
  const { productId, qty } = req.body;
  if (!productId) {
    return res.status(400).json({ msg: 'Product is required' });
  }

  const safeQty = Math.max(parseInt(qty || '1', 10) || 1, 1);
  const existingAgg = await Cart.aggregate([
    {
      $match: {
        customerId: toObjectId(req.customerId),
        productId: toObjectId(productId)
      }
    },
    { $limit: 1 },
    { $project: { _id: 1, qty: 1, isDeleted: 1 } }
  ]);
  const existing = existingAgg[0] || null;

  if (existing) {
    const nextQty = qty ? safeQty : (existing.qty || 1) + 1;
    const updated = await Cart.findOneAndUpdate(
      { _id: existing._id },
      { qty: nextQty, isDeleted: false },
      { returnDocument: 'after' }
    );
    return res.json(updated);
  }

  const item = await Cart.create({ customerId: req.customerId, productId, qty: safeQty });
  res.json(item);
};

exports.updateCartItem = async (req, res) => {
  const safeQty = Math.max(parseInt(req.body.qty || '1', 10) || 1, 1);
  const item = await Cart.findOneAndUpdate(
    { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
    { qty: safeQty },
    { returnDocument: 'after' }
  );

  if (!item) {
    return res.status(404).json({ msg: 'Cart item not found' });
  }

  res.json(item);
};

exports.removeCartItem = async (req, res) => {
  await Cart.findOneAndUpdate(
    { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );
  res.json({ msg: 'Removed' });
};

exports.checkoutCart = async (req, res) => {
  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : null;
  const cartItems = itemsInput && itemsInput.length
    ? itemsInput
    : await Cart.aggregate([
        { $match: { customerId: toObjectId(req.customerId), isDeleted: { $ne: true } } },
        { $project: { productId: 1, qty: 1 } }
      ]);

  if (!cartItems.length) {
    return res.status(400).json({ msg: 'Cart is empty' });
  }

  const normalized = cartItems.map((item) => ({
    productId: item.productId?.toString() || item.productId,
    qty: Math.max(parseInt(item.qty || '1', 10) || 1, 1)
  }));

  const productIds = normalized.map((i) => i.productId);
  const products = await Product.aggregate([
    { $match: { _id: { $in: productIds.map(toObjectId) }, isDeleted: { $ne: true } } },
    { $project: { _id: 1, quantity: 1, price: 1, userId: 1 } }
  ]);

  for (const item of normalized) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product || product.quantity < item.qty) {
      return res.status(400).json({ msg: 'One or more items are out of stock' });
    }
  }

  const orders = [];
  for (const item of normalized) {
    const product = await Product.findOneAndUpdate(
      { _id: item.productId, quantity: { $gte: item.qty }, isDeleted: { $ne: true } },
      { $inc: { quantity: -item.qty } },
      { returnDocument: 'after' }
    );

    if (!product) {
      return res.status(400).json({ msg: 'Stock changed, please retry' });
    }

    const order = await Order.create({
      productId: product._id,
      vendorId: product.userId,
      customerId: req.customerId,
      qty: item.qty,
      price: product.price
    });
    orders.push(order);
  }

  await Cart.updateMany(
    { customerId: req.customerId, productId: { $in: productIds } },
    { isDeleted: true }
  );
  res.json({ orders });
};
