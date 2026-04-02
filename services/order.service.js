const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

exports.createOrder = async (req, res) => {
  const { productId, qty } = req.body;

  if (!productId || !qty || qty <= 0) {
    return res.status(400).json({ msg: 'Invalid order quantity' });
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, quantity: { $gte: qty }, isDeleted: { $ne: true } },
    { $inc: { quantity: -qty } },
    { returnDocument: 'after' }
  );

  if (!product) {
    return res.status(400).json({ msg: 'Out of stock' });
  }

  const order = await Order.create({
    productId: product._id,
    vendorId: product.userId,
    customerId: req.customerId,
    qty,
    price: product.price
  });

  res.json(order);
};

exports.getCustomerOrders = async (req, res) => {
  const orders = await Order.aggregate([
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
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        customerId: 1,
        qty: 1,
        price: 1,
        createdAt: 1,
        updatedAt: 1,
        productId: {
          _id: { $ifNull: ['$product._id', null] },
          name: { $ifNull: ['$product.name', 'Unknown'] }
        },
        vendorId: {
          _id: { $ifNull: ['$vendor._id', null] },
          name: { $ifNull: ['$vendor.name', 'Unknown'] }
        }
      }
    }
  ]);

  res.json(orders);
};

exports.getVendorOrders = async (req, res) => {
  const orders = await Order.aggregate([
    { $match: { vendorId: toObjectId(req.userId), isDeleted: { $ne: true } } },
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
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        vendorId: 1,
        qty: 1,
        price: 1,
        createdAt: 1,
        updatedAt: 1,
        productId: {
          _id: { $ifNull: ['$product._id', null] },
          name: { $ifNull: ['$product.name', 'Unknown'] }
        },
        customerId: {
          _id: { $ifNull: ['$customer._id', null] },
          name: { $ifNull: ['$customer.name', 'Unknown'] }
        }
      }
    }
  ]);

  res.json(orders);
};
