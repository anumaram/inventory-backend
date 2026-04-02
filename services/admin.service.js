const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Wishlist = require('../models/wishlist.model');
const Cart = require('../models/cart.model');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = (req, fallback = 10) => {
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || String(fallback), 10) || fallback, 1);
  return { page, limit };
};

const getPagedAggregate = async (model, pipeline, page, limit) => {
  const totalAgg = await model.aggregate([...pipeline, { $count: 'total' }]);
  const total = totalAgg[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;
  const items = await model.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]);

  return { items, page: safePage, pageSize: limit, total, totalPages };
};

const buildRangeStart = (range) => {
  const preset = { day: 1, week: 7, month: 30 };
  const days = preset[range] || 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start, days };
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ msg: 'Email and password are required' });
  }

  const adminAgg = await Admin.aggregate([
    { $match: { email, isDeleted: { $ne: true } } },
    { $limit: 1 }
  ]);
  const admin = adminAgg[0] || null;

  if (!admin || admin.password !== password) {
    return res.status(401).json({ msg: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin._id, type: 'admin' }, JWT_SECRET);
  res.json({ token });
};

exports.getOverview = async (req, res) => {
  const range = (req.query.range || 'week').toLowerCase();
  const { start, days } = buildRangeStart(range);

  const [
    vendorCount,
    customerCount,
    productCount,
    orderCount,
    wishlistCount,
    cartCount
  ] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Customer.countDocuments({ isDeleted: { $ne: true } }),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    Order.countDocuments({ isDeleted: { $ne: true } }),
    Wishlist.countDocuments({ isDeleted: { $ne: true } }),
    Cart.countDocuments({ isDeleted: { $ne: true } })
  ]);

  const ordersByDay = await Order.aggregate([
    { $match: { isDeleted: { $ne: true }, createdAt: { $gte: start } } },
    {
      $addFields: {
        dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
      }
    },
    {
      $group: {
        _id: '$dateKey',
        totalAmount: { $sum: { $multiply: ['$price', '$qty'] } },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const labels = [];
  const orderCounts = [];
  const orderTotals = [];
  let rangeOrderCount = 0;
  let rangeTotalAmount = 0;

  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const found = ordersByDay.find((entry) => entry._id === key);
    const count = found?.orderCount || 0;
    const total = found?.totalAmount || 0;

    labels.push(key);
    orderCounts.push(count);
    orderTotals.push(total);
    rangeOrderCount += count;
    rangeTotalAmount += total;
  }

  res.json({
    counts: {
      vendors: vendorCount,
      customers: customerCount,
      products: productCount,
      orders: orderCount,
      wishlist: wishlistCount,
      cart: cartCount
    },
    rangeSummary: {
      range,
      orderCount: rangeOrderCount,
      totalAmount: rangeTotalAmount
    },
    charts: {
      labels,
      orderCounts,
      orderTotals,
      pie: {
        labels: ['Vendors', 'Customers', 'Products', 'Orders', 'Wishlist', 'Cart'],
        values: [
          vendorCount,
          customerCount,
          productCount,
          orderCount,
          wishlistCount,
          cartCount
        ]
      }
    }
  });
};

exports.getVendors = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const match = { isDeleted: { $ne: true } };
  if (q) {
    const regex = new RegExp(escapeRegExp(q), 'i');
    match.$or = [{ name: regex }, { email: regex }];
  }

  const pipeline = [
    { $match: match },
    { $sort: { _id: -1 } },
    { $project: { _id: 1, name: 1, email: 1 } }
  ];

  res.json(await getPagedAggregate(User, pipeline, page, limit));
};

exports.updateVendor = async (req, res) => {
  const updates = {};
  if (req.body?.name) updates.name = req.body.name;
  if (req.body?.email) updates.email = req.body.email;
  if (!Object.keys(updates).length) {
    return res.status(400).json({ msg: 'No updates provided' });
  }

  const vendor = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    updates,
    { returnDocument: 'after' }
  );

  if (!vendor) {
    return res.status(404).json({ msg: 'Vendor not found' });
  }

  res.json(vendor);
};

exports.deleteVendor = async (req, res) => {
  const vendor = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );

  if (!vendor) {
    return res.status(404).json({ msg: 'Vendor not found' });
  }

  res.json({ msg: 'Deleted' });
};

exports.getCustomers = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const match = { isDeleted: { $ne: true } };
  if (q) {
    const regex = new RegExp(escapeRegExp(q), 'i');
    match.$or = [{ name: regex }, { email: regex }];
  }

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $project: { _id: 1, name: 1, email: 1, createdAt: 1 } }
  ];

  res.json(await getPagedAggregate(Customer, pipeline, page, limit));
};

exports.updateCustomer = async (req, res) => {
  const updates = {};
  if (req.body?.name) updates.name = req.body.name;
  if (req.body?.email) updates.email = req.body.email;
  if (!Object.keys(updates).length) {
    return res.status(400).json({ msg: 'No updates provided' });
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    updates,
    { returnDocument: 'after' }
  );

  if (!customer) {
    return res.status(404).json({ msg: 'Customer not found' });
  }

  res.json(customer);
};

exports.deleteCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );

  if (!customer) {
    return res.status(404).json({ msg: 'Customer not found' });
  }

  res.json({ msg: 'Deleted' });
};

exports.getProducts = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const regex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const base = [
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
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] }
      }
    }
  ];

  const matchStage = regex
    ? { $match: { $or: [{ name: regex }, { vendorName: regex }] } }
    : null;

  const pipeline = [
    ...base,
    ...(matchStage ? [matchStage] : []),
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        quantity: 1,
        price: 1,
        userId: 1,
        vendorName: 1,
        createdAt: 1
      }
    }
  ];

  res.json(await getPagedAggregate(Product, pipeline, page, limit));
};

exports.updateProduct = async (req, res) => {
  const updates = {};
  if (req.body?.name) updates.name = req.body.name;
  if (req.body?.quantity !== undefined) updates.quantity = req.body.quantity;
  if (req.body?.price !== undefined) updates.price = req.body.price;
  if (!Object.keys(updates).length) {
    return res.status(400).json({ msg: 'No updates provided' });
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    updates,
    { returnDocument: 'after' }
  );

  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  res.json(product);
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );

  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  res.json({ msg: 'Deleted' });
};

exports.getOrders = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const regex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const range = (req.query.range || '').toString().trim().toLowerCase();
  let dateMatch = {};
  if (range) {
    const { start } = buildRangeStart(range);
    dateMatch = { createdAt: { $gte: start } };
  }

  const base = [
    { $match: { isDeleted: { $ne: true }, ...dateMatch } },
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
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        productName: { $ifNull: ['$product.name', 'Unknown'] },
        customerName: { $ifNull: ['$customer.name', 'Unknown'] },
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        totalAmount: { $multiply: ['$price', '$qty'] }
      }
    }
  ];

  const matchStage = regex
    ? {
        $match: {
          $or: [{ productName: regex }, { customerName: regex }, { vendorName: regex }]
        }
      }
    : null;

  const summaryAgg = await Order.aggregate([
    ...base,
    ...(matchStage ? [matchStage] : []),
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  const summary = summaryAgg[0] || { totalCount: 0, totalAmount: 0 };

  const pipeline = [
    ...base,
    ...(matchStage ? [matchStage] : []),
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        qty: 1,
        price: 1,
        totalAmount: 1,
        createdAt: 1,
        productName: 1,
        customerName: 1,
        vendorName: 1
      }
    }
  ];

  const pageResult = await getPagedAggregate(Order, pipeline, page, limit);
  res.json({ ...pageResult, summary });
};

exports.getWishlist = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const regex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const base = [
    { $match: { isDeleted: { $ne: true } } },
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
      $addFields: {
        productName: { $ifNull: ['$product.name', 'Unknown'] },
        customerName: { $ifNull: ['$customer.name', 'Unknown'] }
      }
    }
  ];

  const matchStage = regex
    ? { $match: { $or: [{ productName: regex }, { customerName: regex }] } }
    : null;

  const pipeline = [
    ...base,
    ...(matchStage ? [matchStage] : []),
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        productName: 1,
        customerName: 1,
        createdAt: 1
      }
    }
  ];

  res.json(await getPagedAggregate(Wishlist, pipeline, page, limit));
};

exports.getCart = async (req, res) => {
  const { page, limit } = parsePagination(req);
  const q = (req.query.q || '').toString().trim();
  const regex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const base = [
    { $match: { isDeleted: { $ne: true } } },
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
      $addFields: {
        productName: { $ifNull: ['$product.name', 'Unknown'] },
        customerName: { $ifNull: ['$customer.name', 'Unknown'] },
        availableQty: { $ifNull: ['$product.quantity', 0] }
      }
    }
  ];

  const matchStage = regex
    ? { $match: { $or: [{ productName: regex }, { customerName: regex }] } }
    : null;

  const pipeline = [
    ...base,
    ...(matchStage ? [matchStage] : []),
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        productName: 1,
        customerName: 1,
        qty: 1,
        availableQty: 1,
        createdAt: 1
      }
    }
  ];

  res.json(await getPagedAggregate(Cart, pipeline, page, limit));
};
