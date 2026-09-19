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

  if (admin.isBlocked) {
    return res.status(403).json({
      msg: 'Your administrator account has been blocked. Please contact the primary super administrator.',
      accountBlocked: true
    });
  }

  const token = jwt.sign({ id: admin._id, type: 'admin' }, JWT_SECRET);
  res.json({ token });
};

exports.getContact = async (req, res) => {
  const admin = await admins.findOne(
    { isDeleted: { $ne: true } },
    { _id: 1, name: 1, email: 1, mobile: 1, address: 1 }
  ).sort({ createdAt: -1 });

  if (!admin) {
    return res.status(404).json({ msg: 'Admin details not found' });
  }

  res.json(admin);
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
  if (req.body?.name) updates.name = req.body.name.trim();
  if (req.body?.email) updates.email = req.body.email.trim().toLowerCase();
  if (req.body?.phone !== undefined) updates.phone = req.body.phone.trim();
  if (req.body?.businessName !== undefined) updates.businessName = req.body.businessName.trim();
  if (req.body?.password) {
    if (req.body.password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    updates.password = await bcrypt.hash(req.body.password, 10);
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ msg: 'No updates provided' });
  }

  if (updates.email) {
    const existing = await User.findOne({ email: updates.email, _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
    if (existing) return res.status(400).json({ msg: 'Email is already used by another vendor' });
  }

  const vendor = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { $set: updates },
    { returnDocument: 'after' }
  ).select('-password -otp');

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
    { $project: { _id: 1, name: 1, email: 1, phone: 1, isBlocked: 1, wallet: 1, createdAt: 1 } }
  ];

  res.json(await getPagedAggregate(Customer, pipeline, page, limit));
};

exports.updateCustomer = async (req, res) => {
  const updates = {};
  if (req.body?.name) updates.name = req.body.name.trim();
  if (req.body?.email) updates.email = req.body.email.trim().toLowerCase();
  if (req.body?.phone !== undefined) updates.phone = req.body.phone.trim();
  if (req.body?.gender !== undefined) updates.gender = req.body.gender;
  if (req.body?.password) {
    if (req.body.password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    updates.password = await bcrypt.hash(req.body.password, 10);
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ msg: 'No updates provided' });
  }

  if (updates.email) {
    const existing = await Customer.findOne({ email: updates.email, _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
    if (existing) return res.status(400).json({ msg: 'Email is already used by another customer' });
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { $set: updates },
    { returnDocument: 'after' }
  ).select('-password -otp');

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
  const category = (req.query.category || '').toString().trim();
  const stockStatus = (req.query.stockStatus || '').toString().trim();
  const regex = q ? new RegExp(escapeRegExp(q), 'i') : null;

  const matchInitial = { isDeleted: { $ne: true } };
  if (category && category !== 'all') {
    matchInitial.category = { $regex: new RegExp(`^${escapeRegExp(category)}$`, 'i') };
  }
  if (stockStatus === 'in_stock') {
    matchInitial.quantity = { $gt: 10 };
  } else if (stockStatus === 'low_stock') {
    matchInitial.quantity = { $gt: 0, $lte: 10 };
  } else if (stockStatus === 'out_of_stock') {
    matchInitial.quantity = { $lte: 0 };
  }

  const base = [
    { $match: matchInitial },
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

  const sortBy = (req.query.sortBy || 'newest').toString().trim();
  let sortStage = { createdAt: -1 };
  if (sortBy === 'oldest') sortStage = { createdAt: 1 };
  else if (sortBy === 'price_asc') sortStage = { price: 1 };
  else if (sortBy === 'price_desc') sortStage = { price: -1 };
  else if (sortBy === 'stock_asc') sortStage = { quantity: 1 };
  else if (sortBy === 'stock_desc') sortStage = { quantity: -1 };
  else if (sortBy === 'name_asc') sortStage = { name: 1 };
  else if (sortBy === 'name_desc') sortStage = { name: -1 };

  const pipeline = [
    ...base,
    ...(matchStage ? [matchStage] : []),
    { $sort: sortStage },
    {
      $project: {
        _id: 1,
        name: 1,
        category: 1,
        quantity: 1,
        price: 1,
        discountPercentage: { $ifNull: ['$discountPercentage', 10] },
        image: {
          $cond: {
            if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
            then: '$image',
            else: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] }
          }
        },
        images: { $ifNull: ['$images', []] },
        description: { $ifNull: ['$description', ''] },
        rating: { $ifNull: ['$rating', 4.5] },
        ratingCount: { $ifNull: ['$ratingCount', 1] },
        colors: { $ifNull: ['$colors', []] },
        sizes: { $ifNull: ['$sizes', []] },
        userId: 1,
        vendorName: 1,
        createdAt: 1
      }
    }
  ];

  res.json(await getPagedAggregate(Product, pipeline, page, limit));
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid product ID' });
    }

    const product = await Product.findOne({ _id: toObjectId(id), isDeleted: { $ne: true } })
      .populate('userId', 'name email mobile storeName businessName address isVerified')
      .lean();

    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    product.vendorName = product.userId?.name || product.userId?.storeName || 'Merchant';
    product.vendorEmail = product.userId?.email || '';
    product.vendorMobile = product.userId?.mobile || '';
    product.vendorAddress = product.userId?.address || '';

    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch product details' });
  }
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
