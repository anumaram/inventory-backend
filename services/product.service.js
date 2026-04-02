const mongoose = require('mongoose');
const Product = require('../models/product.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.createProduct = async (req, res) => {
  const product = await Product.create({
    ...req.body,
    userId: req.userId
  });

  res.json(product);
};

exports.getProducts = async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '5', 10) || 5, 1);

  const q = rawQuery.trim();
  const match = { userId: toObjectId(req.userId), isDeleted: { $ne: true } };
  if (q) {
    match.name = { $regex: escapeRegExp(q), $options: 'i' };
  }

  const totalAgg = await Product.aggregate([
    { $match: match },
    { $count: 'total' }
  ]);
  const total = totalAgg[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  const items = await Product.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        quantity: 1,
        price: 1
      }
    },
    { $skip: start },
    { $limit: limit }
  ]);

  res.json({
    items,
    page: safePage,
    pageSize: limit,
    total,
    totalPages
  });
};

exports.getAllProducts = async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '5', 10) || 5, 1);

  const q = rawQuery.trim();
  const qRegex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const basePipeline = [
    { $match: { isDeleted: { $ne: true } } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        vendorId: { $ifNull: ['$vendor._id', null] },
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] }
      }
    }
  ];

  const matchStage = qRegex
    ? {
        $match: {
          $or: [{ name: qRegex }, { vendorName: qRegex }]
        }
      }
    : null;

  const totalAgg = await Product.aggregate([
    ...basePipeline,
    ...(matchStage ? [matchStage] : []),
    { $count: 'total' }
  ]);
  const total = totalAgg[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  const items = await Product.aggregate([
    ...basePipeline,
    ...(matchStage ? [matchStage] : []),
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        quantity: 1,
        price: 1,
        vendorId: 1,
        vendorName: 1
      }
    },
    { $skip: start },
    { $limit: limit }
  ]);

  res.json({
    items,
    page: safePage,
    pageSize: limit,
    total,
    totalPages
  });
};

exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { returnDocument: 'after' }
  );
  res.json({ msg: 'Deleted' });
};
