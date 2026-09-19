const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Review = require('../models/review.model');
const User = require('../models/user.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseListField = (val) => {
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const inventoryHistoryService = require('./inventory-history.service');

exports.createProduct = async (req, res) => {
  const {
    name,
    quantity,
    price,
    discountPercentage,
    category,
    description,
    colors,
    sizes,
    image,
    images,
    returnPolicy,
    warranty
  } = req.body || {};

  if (
    !name?.trim() ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 0 ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({ msg: 'Valid name, quantity and price are required' });
  }

  const parsedDiscount = discountPercentage !== undefined && discountPercentage !== null && discountPercentage !== ''
    ? Number(discountPercentage)
    : 10;
  const safeDiscount = (Number.isFinite(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount <= 100)
    ? parsedDiscount
    : 10;

  const colorsList = parseListField(colors);
  const sizesList = parseListField(sizes);
  const imagesList = parseListField(images);
  const mainImage = image?.trim() || (imagesList.length > 0 ? imagesList[0] : '');

  const product = await Product.create({
    name: name.trim(),
    quantity: Number(quantity),
    price: Number(price),
    discountPercentage: safeDiscount,
    category: category?.trim() || 'Others',
    description: description?.trim() || '',
    colors: colorsList.length > 0 ? colorsList : ['N/A'],
    sizes: sizesList.length > 0 ? sizesList : ['N/A'],
    image: mainImage,
    images: imagesList.length > 0 ? imagesList : (mainImage ? [mainImage] : []),
    returnPolicy: returnPolicy?.trim() || '7 Days Return & Exchange',
    warranty: warranty?.trim() || '1 Year Manufacturer Warranty',
    rating: 4.5,
    ratingCount: 1,
    userId: req.userId
  });

  // Log to Inventory History
  await inventoryHistoryService.logInventoryEvent({
    productId: product._id,
    vendorId: req.userId,
    type: 'PRODUCT_CREATED',
    quantityChange: Number(quantity),
    stockBefore: 0,
    stockAfter: Number(quantity),
    referenceId: `PROD-${String(product._id).slice(-6).toUpperCase()}`,
    reason: 'Initial inventory created',
    actor: 'Vendor',
    metadata: {
      initialPrice: Number(price),
      category: product.category
    }
  });

  res.json(product);
};

exports.getProducts = async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '20', 10) || 20, 1);
  const category = (req.query.category || '').toString().trim();
  const stockStatus = (req.query.stockStatus || req.query.status || '').toString().trim().toLowerCase();
  const sortBy = (req.query.sortBy || 'newest').toString().trim();

  const q = rawQuery.trim();
  const scopeMatch = { userId: toObjectId(req.userId), isDeleted: { $ne: true } };

  if (q) {
    scopeMatch.$or = [
      { name: { $regex: escapeRegExp(q), $options: 'i' } },
      { category: { $regex: escapeRegExp(q), $options: 'i' } },
      { description: { $regex: escapeRegExp(q), $options: 'i' } }
    ];
  }

  if (category && category !== 'All' && category !== 'all') {
    scopeMatch.category = { $regex: `^${escapeRegExp(category)}$`, $options: 'i' };
  }

  const match = { ...scopeMatch };

  if (stockStatus === 'low_stock' || stockStatus === 'low') {
    match.quantity = { $gt: 0, $lte: 10 };
  } else if (stockStatus === 'out_of_stock' || stockStatus === 'out') {
    match.quantity = { $lte: 0 };
  } else if (stockStatus === 'in_stock') {
    match.quantity = { $gt: 0 };
  }

  let sortStage = { createdAt: -1 };
  if (sortBy === 'stock_asc') sortStage = { quantity: 1 };
  else if (sortBy === 'stock_desc') sortStage = { quantity: -1 };
  else if (sortBy === 'price_asc') sortStage = { price: 1 };
  else if (sortBy === 'price_desc') sortStage = { price: -1 };
  else if (sortBy === 'name_asc') sortStage = { name: 1 };
  else if (sortBy === 'oldest') sortStage = { createdAt: 1 };

  const [totalAgg, filteredSummaryAgg, scopeCountsAgg] = await Promise.all([
    Product.aggregate([
      { $match: match },
      { $count: 'total' }
    ]),
    Product.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: {
            $sum: {
              $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0]
            }
          },
          totalInventoryValue: {
            $sum: {
              $cond: [{ $gt: ['$quantity', 0] }, { $multiply: ['$price', '$quantity'] }, 0]
            }
          }
        }
      }
    ]),
    Product.aggregate([
      { $match: scopeMatch },
      {
        $group: {
          _id: null,
          lowStockCount: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', 10] }] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ])
  ]);

  const total = totalAgg[0]?.total || 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  const filteredSummary = filteredSummaryAgg[0] || {
    totalProducts: 0,
    totalStock: 0,
    totalInventoryValue: 0
  };
  const scopeCounts = scopeCountsAgg[0] || {
    lowStockCount: 0,
    outOfStockCount: 0
  };

  const summary = {
    totalProducts: total,
    totalStock: filteredSummary.totalStock || 0,
    totalInventoryValue: filteredSummary.totalInventoryValue || 0,
    lowStockCount: scopeCounts.lowStockCount || 0,
    outOfStockCount: scopeCounts.outOfStockCount || 0
  };

  const items = await Product.aggregate([
    { $match: match },
    { $sort: sortStage },
    {
      $project: {
        _id: 1,
        name: 1,
        category: {
          $cond: {
            if: { $and: [{ $ne: ['$category', null] }, { $ne: ['$category', ''] }] },
            then: '$category',
            else: 'Others'
          }
        },
        description: { $ifNull: ['$description', ''] },
        image: {
          $cond: {
            if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
            then: '$image',
            else: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] }
          }
        },
        images: { $ifNull: ['$images', []] },
        quantity: 1,
        price: 1,
        discountPercentage: { $ifNull: ['$discountPercentage', 10] },
        colors: { $ifNull: ['$colors', ['N/A']] },
        sizes: { $ifNull: ['$sizes', ['N/A']] },
        returnPolicy: { $ifNull: ['$returnPolicy', '7 Days Return & Exchange'] },
        warranty: { $ifNull: ['$warranty', '1 Year Manufacturer Warranty'] },
        rating: { $ifNull: ['$rating', 4.5] },
        ratingCount: { $ifNull: ['$ratingCount', 1] },
        createdAt: 1,
        updatedAt: 1
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
    totalPages,
    summary
  });
};

exports.getAllProducts = async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '20', 10) || 20, 1);
  const category = (req.query.category || '').toString().trim();
  const vendor = (req.query.vendor || '').toString().trim();
  const scope = (req.query.scope || 'all').toString().trim().toLowerCase();
  const sortBy = (req.query.sortBy || 'newest').toString().trim();
  const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;
  const availability = (req.query.availability || '').toString().trim().toLowerCase();
  const inStock = req.query.inStock === 'true' || req.query.inStock === true || availability === 'in_stock';
  const outOfStockOnly = availability === 'out_of_stock';
  const minRating = req.query.minRating !== undefined && req.query.minRating !== '' ? Number(req.query.minRating) : null;

  const q = rawQuery.trim();

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
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        category: { $ifNull: ['$category', 'Others'] },
        description: { $ifNull: ['$description', ''] },
        discountPercentage: { $ifNull: ['$discountPercentage', 10] },
        colors: {
          $cond: {
            if: { $and: [{ $isArray: '$colors' }, { $gt: [{ $size: '$colors' }, 0] }] },
            then: '$colors',
            else: ['N/A']
          }
        },
        sizes: {
          $cond: {
            if: { $and: [{ $isArray: '$sizes' }, { $gt: [{ $size: '$sizes' }, 0] }] },
            then: '$sizes',
            else: ['N/A']
          }
        },
        returnPolicy: { $ifNull: ['$returnPolicy', '7 Days Return & Exchange'] },
        warranty: { $ifNull: ['$warranty', '1 Year Manufacturer Warranty'] },
        rating: {
          $cond: {
            if: { $and: [{ $ne: ['$rating', null] }, { $gt: ['$rating', 0] }] },
            then: '$rating',
            else: 4.3
          }
        },
        salesCount: { $ifNull: ['$salesCount', 0] },
        ratingCount: {
          $cond: {
            if: { $and: [{ $ne: ['$ratingCount', null] }, { $gt: ['$ratingCount', 0] }] },
            then: '$ratingCount',
            else: 28
          }
        }
      }
    }
  ];

  const andConditions = [];

  // Multi-attribute search
  if (q) {
    const qRegex = new RegExp(escapeRegExp(q), 'i');
    if (scope === 'name') {
      andConditions.push({ name: qRegex });
    } else if (scope === 'vendor') {
      andConditions.push({ vendorName: qRegex });
    } else if (scope === 'category') {
      andConditions.push({ category: qRegex });
    } else {
      andConditions.push({
        $or: [
          { name: qRegex },
          { vendorName: qRegex },
          { category: qRegex }
        ]
      });
    }
  }

  // Category filter
  if (category && category !== 'All') {
    if (category.toLowerCase() === 'others') {
      andConditions.push({ category: { $regex: /^others$/i } });
    } else {
      andConditions.push({ category: { $regex: new RegExp(`^${escapeRegExp(category)}$`, 'i') } });
    }
  }

  // Vendor filter (supports single vendor or multiple comma-separated vendors)
  const vendorsParam = req.query.vendors || req.query.vendor || '';
  const vendorList = (Array.isArray(vendorsParam) ? vendorsParam : vendorsParam.toString().split(','))
    .map(v => v.trim())
    .filter(v => v && v !== 'All');

  if (vendorList.length === 1) {
    andConditions.push({ vendorName: { $regex: new RegExp(`^${escapeRegExp(vendorList[0])}$`, 'i') } });
  } else if (vendorList.length > 1) {
    const escaped = vendorList.map(v => new RegExp(`^${escapeRegExp(v)}$`, 'i'));
    andConditions.push({ vendorName: { $in: escaped } });
  }

  // Price range filter
  if (minPrice !== null && !isNaN(minPrice)) {
    andConditions.push({ price: { $gte: minPrice } });
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    andConditions.push({ price: { $lte: maxPrice } });
  }

  // Availability filter
  if (inStock && !outOfStockOnly) {
    andConditions.push({ quantity: { $gt: 0 } });
  } else if (outOfStockOnly) {
    andConditions.push({ quantity: { $lte: 0 } });
  }

  // Minimum Rating filter
  if (minRating !== null && !isNaN(minRating) && minRating > 0) {
    andConditions.push({ rating: { $gte: minRating } });
  }

  const matchStage = andConditions.length > 0 ? { $match: { $and: andConditions } } : null;

  // Sorting options
  let sortStage = { $sort: { createdAt: -1 } };
  if (sortBy === 'price_asc') {
    sortStage = { $sort: { price: 1, _id: -1 } };
  } else if (sortBy === 'price_desc') {
    sortStage = { $sort: { price: -1, _id: -1 } };
  } else if (sortBy === 'rating_desc') {
    sortStage = { $sort: { rating: -1, ratingCount: -1, _id: -1 } };
  } else if (sortBy === 'name_asc') {
    sortStage = { $sort: { name: 1, _id: -1 } };
  } else if (sortBy === 'newest') {
    sortStage = { $sort: { createdAt: -1, _id: -1 } };
  } else if (sortBy === 'trending') {
    sortStage = { $sort: { salesCount: -1, rating: -1, ratingCount: -1, _id: -1 } };
  } else if (sortBy === 'best_sellers') {
    sortStage = { $sort: { salesCount: -1, ratingCount: -1, _id: -1 } };
  } else if (sortBy === 'discount_desc') {
    sortStage = { $sort: { discountPercentage: -1, rating: -1, _id: -1 } };
  }

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
    sortStage,
    {
      $project: {
        _id: 1,
        name: 1,
        category: 1,
        description: 1,
        image: {
          $cond: {
            if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
            then: '$image',
            else: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] }
          }
        },
        images: { $ifNull: ['$images', []] },
        quantity: 1,
        price: 1,
        discountPercentage: 1,
        vendorId: 1,
        vendorName: 1,
        colors: 1,
        sizes: 1,
        returnPolicy: 1,
        warranty: 1,
        rating: 1,
        ratingCount: 1,
        salesCount: 1,
        createdAt: 1
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

exports.getProductById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid product ID' });
  }

  const results = await Product.aggregate([
    { $match: { _id: toObjectId(id), isDeleted: { $ne: true } } },
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
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        image: {
          $cond: {
            if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
            then: '$image',
            else: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] }
          }
        },
        images: { $ifNull: ['$images', []] },
        category: { $ifNull: ['$category', 'Others'] },
        description: { $ifNull: ['$description', ''] },
        discountPercentage: { $ifNull: ['$discountPercentage', 10] },
        colors: {
          $cond: {
            if: { $and: [{ $isArray: '$colors' }, { $gt: [{ $size: '$colors' }, 0] }] },
            then: '$colors',
            else: ['N/A']
          }
        },
        sizes: {
          $cond: {
            if: { $and: [{ $isArray: '$sizes' }, { $gt: [{ $size: '$sizes' }, 0] }] },
            then: '$sizes',
            else: ['N/A']
          }
        },
        returnPolicy: { $ifNull: ['$returnPolicy', '7 Days Return & Exchange'] },
        warranty: { $ifNull: ['$warranty', '1 Year Manufacturer Warranty'] },
        rating: {
          $cond: {
            if: { $and: [{ $ne: ['$rating', null] }, { $gt: ['$rating', 0] }] },
            then: '$rating',
            else: 4.3
          }
        },
        ratingCount: {
          $cond: {
            if: { $and: [{ $ne: ['$ratingCount', null] }, { $gt: ['$ratingCount', 0] }] },
            then: '$ratingCount',
            else: 28
          }
        }
      }
    }
  ]);

  if (!results || results.length === 0) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  res.json(results[0]);
};

exports.getProductSearchMeta = async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  const qRegex = rawQuery ? new RegExp(escapeRegExp(rawQuery), 'i') : null;

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
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        category: { $ifNull: ['$category', 'Others'] }
      }
    }
  ];

  // Distinct categories with count
  const categoryAgg = await Product.aggregate([
    ...basePipeline,
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);
  const categories = categoryAgg.map((c) => ({ name: c._id || 'Others', count: c.count }));

  // Distinct active vendors with count
  const vendorAgg = await Product.aggregate([
    ...basePipeline,
    { $group: { _id: '$vendorName', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);
  const vendors = vendorAgg.filter((v) => v._id && v._id !== 'Unknown').map((v) => ({ name: v._id, count: v.count }));

  // Price bounds & availability counts
  const statsAgg = await Product.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        inStock: {
          $sum: { $cond: [{ $gt: ['$quantity', 0] }, 1, 0] }
        },
        outOfStock: {
          $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] }
        },
        total: { $sum: 1 }
      }
    }
  ]);
  const stats = statsAgg[0] || { minPrice: 0, maxPrice: 100000, inStock: 0, outOfStock: 0, total: 0 };

  // Suggestions for autocomplete if query is provided
  let suggestions = { categories: [], vendors: [], products: [] };
  if (qRegex) {
    const matchingProducts = await Product.aggregate([
      ...basePipeline,
      {
        $match: {
          $or: [
            { name: qRegex },
            { vendorName: qRegex },
            { category: qRegex }
          ]
        }
      },
      { $limit: 6 },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          vendorName: 1,
          price: 1,
          quantity: 1
        }
      }
    ]);

    suggestions = {
      categories: categories.filter((c) => qRegex.test(c.name)).slice(0, 4),
      vendors: vendors.filter((v) => qRegex.test(v.name)).slice(0, 4),
      products: matchingProducts
    };
  }

  res.json({
    categories,
    vendors,
    suggestions,
    priceBounds: {
      min: stats.minPrice ?? 0,
      max: stats.maxPrice ?? 100000
    },
    availabilityCounts: {
      inStock: stats.inStock ?? 0,
      outOfStock: stats.outOfStock ?? 0,
      total: stats.total ?? 0
    }
  });
};

exports.getProductReviews = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid product ID' });
  }

  const reviews = await Review.find({ productId: toObjectId(id), status: { $ne: 'rejected' } }).sort({ createdAt: -1 });

  // Rating distribution
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  reviews.forEach((r) => {
    const rounded = Math.min(Math.max(Math.round(r.rating), 1), 5);
    counts[rounded] = (counts[rounded] || 0) + 1;
    sum += r.rating;
  });

  const total = reviews.length;
  const average = total > 0 ? Number((sum / total).toFixed(1)) : 0;

  const breakdown = {
    5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
    4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
    3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
    2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
    1: total > 0 ? Math.round((counts[1] / total) * 100) : 0
  };

  res.json({
    reviews,
    summary: {
      total,
      average,
      counts,
      breakdown
    }
  });
};

exports.addProductReview = async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment, images } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid product ID' });
  }
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
  }
  if (!comment?.trim()) {
    return res.status(400).json({ msg: 'Review comment is required' });
  }

  const Customer = require('../models/customer.model');
  const custId = req.customerId || req.userId;
  let customerName = 'Customer';
  if (custId) {
    const cust = (await Customer.findById(custId)) || (await User.findById(custId));
    if (cust?.name) customerName = cust.name;
  }

  const review = await Review.create({
    productId: toObjectId(id),
    customerId: toObjectId(custId),
    customerName,
    rating: numRating,
    title: title?.trim() || '',
    comment: comment.trim(),
    images: Array.isArray(images) ? images.filter(Boolean) : [],
    isVerifiedPurchase: true
  });

  // Recalculate average rating & count for Product
  const allReviews = await Review.find({ productId: toObjectId(id) });
  const newTotal = allReviews.length;
  const newAvg = Number((allReviews.reduce((acc, r) => acc + r.rating, 0) / newTotal).toFixed(1));

  await Product.findByIdAndUpdate(id, {
    rating: newAvg,
    ratingCount: newTotal
  });

  res.status(201).json({
    msg: 'Review submitted successfully',
    review,
    productRating: newAvg,
    productRatingCount: newTotal
  });
};

exports.updateProductReview = async (req, res) => {
  const { id, reviewId } = req.params;
  const { rating, title, comment, images } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({ msg: 'Invalid product or review ID' });
  }
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
  }
  if (!comment?.trim()) {
    return res.status(400).json({ msg: 'Review comment is required' });
  }

  const review = await Review.findOne({ _id: toObjectId(reviewId), productId: toObjectId(id) });
  if (!review) {
    return res.status(404).json({ msg: 'Review not found' });
  }

  const custId = req.customerId || req.userId;
  // Authorization check: customerId matches, or legacy name matches
  if (custId && review.customerId && String(review.customerId) !== String(custId)) {
    return res.status(403).json({ msg: 'You are not authorized to edit this review' });
  }

  review.rating = numRating;
  if (title !== undefined) review.title = title.trim();
  review.comment = comment.trim();
  if (Array.isArray(images)) {
    review.images = images.filter(Boolean);
  }
  await review.save();

  // Recalculate average rating & count for Product
  const allReviews = await Review.find({ productId: toObjectId(id), status: { $ne: 'rejected' } });
  const newTotal = allReviews.length;
  const newAvg = newTotal > 0 ? Number((allReviews.reduce((acc, r) => acc + r.rating, 0) / newTotal).toFixed(1)) : 0;

  await Product.findByIdAndUpdate(id, {
    rating: newAvg,
    ratingCount: newTotal
  });

  res.json({
    msg: 'Review updated successfully',
    review,
    productRating: newAvg,
    productRatingCount: newTotal
  });
};

exports.deleteProductReview = async (req, res) => {
  const { id, reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({ msg: 'Invalid product or review ID' });
  }

  const review = await Review.findOne({ _id: toObjectId(reviewId), productId: toObjectId(id) });
  if (!review) {
    return res.status(404).json({ msg: 'Review not found' });
  }

  const custId = req.customerId || req.userId;
  if (custId && review.customerId && String(review.customerId) !== String(custId) && !req.isAdmin) {
    return res.status(403).json({ msg: 'You are not authorized to delete this review' });
  }

  await Review.deleteOne({ _id: toObjectId(reviewId) });

  // Recalculate average rating & count for Product
  const allReviews = await Review.find({ productId: toObjectId(id), status: { $ne: 'rejected' } });
  const newTotal = allReviews.length;
  const newAvg = newTotal > 0 ? Number((allReviews.reduce((acc, r) => acc + r.rating, 0) / newTotal).toFixed(1)) : 0;

  await Product.findByIdAndUpdate(id, {
    rating: newAvg,
    ratingCount: newTotal
  });

  res.json({
    msg: 'Review deleted successfully',
    productRating: newAvg,
    productRatingCount: newTotal
  });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );
  if (!product) return res.status(404).json({ msg: 'Product not found' });

  await inventoryHistoryService.logInventoryEvent({
    productId: product._id,
    vendorId: req.userId,
    type: 'PRODUCT_DELETED',
    quantityChange: 0,
    stockBefore: Number(product.quantity || 0),
    stockAfter: 0,
    referenceId: `DEL-${String(product._id).slice(-6).toUpperCase()}`,
    reason: 'Product archived / soft deleted by vendor',
    actor: 'Vendor'
  });

  res.json({ msg: 'Deleted' });
};

exports.updateProduct = async (req, res) => {
  const {
    name,
    quantity,
    price,
    discountPercentage,
    category,
    description,
    colors,
    sizes,
    image,
    images,
    returnPolicy,
    warranty
  } = req.body || {};

  if (
    !name?.trim() ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 0 ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({ msg: 'Valid name, quantity and price are required' });
  }

  const existing = await Product.findOne({
    _id: req.params.id,
    userId: req.userId,
    isDeleted: { $ne: true }
  });

  if (!existing) return res.status(404).json({ msg: 'Product not found' });

  const oldStock = Number(existing.quantity || 0);
  const newStock = Number(quantity);
  const oldPrice = Number(existing.price || 0);
  const newPrice = Number(price);

  const updateData = {
    name: name.trim(),
    quantity: newStock,
    price: newPrice
  };

  if (discountPercentage !== undefined && discountPercentage !== null && discountPercentage !== '') {
    const num = Number(discountPercentage);
    if (Number.isFinite(num) && num >= 0 && num <= 100) {
      updateData.discountPercentage = num;
    }
  }

  if (category !== undefined) {
    updateData.category = category?.trim() || 'Others';
  }
  if (description !== undefined) {
    updateData.description = description?.trim() || '';
  }
  if (colors !== undefined) {
    updateData.colors = parseListField(colors);
  }
  if (sizes !== undefined) {
    updateData.sizes = parseListField(sizes);
  }
  if (images !== undefined) {
    const parsedImages = parseListField(images);
    updateData.images = parsedImages;
    if (!image && parsedImages.length > 0) {
      updateData.image = parsedImages[0];
    }
  }
  if (image !== undefined && image.trim()) {
    updateData.image = image.trim();
  }
  if (returnPolicy !== undefined) {
    updateData.returnPolicy = returnPolicy?.trim() || '7 Days Return & Exchange';
  }
  if (warranty !== undefined) {
    updateData.warranty = warranty?.trim() || '1 Year Manufacturer Warranty';
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, isDeleted: { $ne: true } },
    updateData,
    { returnDocument: 'after', runValidators: true }
  );

  // Log inventory history
  if (newStock !== oldStock) {
    const diff = newStock - oldStock;
    await inventoryHistoryService.logInventoryEvent({
      productId: product._id,
      vendorId: req.userId,
      type: 'STOCK_ADJUSTMENT',
      quantityChange: diff,
      stockBefore: oldStock,
      stockAfter: newStock,
      referenceId: `UPD-${Date.now().toString().slice(-6)}`,
      reason: diff > 0 ? `Stock manually increased by +${diff}` : `Stock manually decreased by ${diff}`,
      actor: 'Vendor',
      metadata: { oldStock, newStock }
    });
  } else if (newPrice !== oldPrice || name.trim() !== existing.name) {
    await inventoryHistoryService.logInventoryEvent({
      productId: product._id,
      vendorId: req.userId,
      type: 'PRODUCT_EDITED',
      quantityChange: 0,
      stockBefore: oldStock,
      stockAfter: oldStock,
      referenceId: `EDIT-${Date.now().toString().slice(-6)}`,
      reason: 'Product price or details updated',
      actor: 'Vendor',
      metadata: { oldPrice, newPrice }
    });
  }

  // Dispatch back-in-stock and price-drop alerts to wishlisted customers
  try {
    const wishlistService = require('./wishlist.service');
    wishlistService.checkAndNotifyWishlistAlerts({
      productId: product._id,
      productName: product.name,
      oldStock,
      newStock,
      oldPrice,
      newPrice,
      oldDiscount: existing.discountPercentage,
      newDiscount: product.discountPercentage
    }).catch((e) => console.error('[WishlistAlerts] Error in updateProduct:', e.message));
  } catch (err) {
    // Non-blocking
  }

  res.json(product);
};

exports.adjustProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid product ID' });
    }

    const { adjustment, newQuantity, reason } = req.body || {};

    const product = await Product.findOne({
      _id: toObjectId(id),
      isDeleted: { $ne: true }
    });

    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const oldStock = Number(product.quantity || 0);
    let targetStock = oldStock;
    let qtyChange = 0;

    if (newQuantity !== undefined && newQuantity !== null && newQuantity !== '') {
      targetStock = Math.max(0, Number(newQuantity));
      qtyChange = targetStock - oldStock;
    } else if (adjustment !== undefined && adjustment !== null && adjustment !== '') {
      qtyChange = Number(adjustment);
      targetStock = Math.max(0, oldStock + qtyChange);
    } else {
      return res.status(400).json({ msg: 'Either adjustment or newQuantity is required' });
    }

    product.quantity = targetStock;
    await product.save();

    await inventoryHistoryService.logInventoryEvent({
      productId: product._id,
      vendorId: req.userId || product.userId,
      type: 'STOCK_ADJUSTMENT',
      quantityChange: qtyChange,
      stockBefore: oldStock,
      stockAfter: targetStock,
      referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
      reason: reason?.trim() || (qtyChange > 0 ? `Vendor added stock (+${qtyChange})` : `Vendor reduced stock (${qtyChange})`),
      actor: 'Vendor'
    });

    // Dispatch back-in-stock alert if product was out of stock
    try {
      const wishlistService = require('./wishlist.service');
      wishlistService.checkAndNotifyWishlistAlerts({
        productId: product._id,
        productName: product.name,
        oldStock,
        newStock: targetStock,
        oldPrice: product.price,
        newPrice: product.price,
        oldDiscount: product.discountPercentage,
        newDiscount: product.discountPercentage
      }).catch((e) => console.error('[WishlistAlerts] Error in adjustProductStock:', e.message));
    } catch (err) {
      // Non-blocking
    }

    res.json({
      msg: 'Stock adjusted successfully',
      product,
      adjustment: qtyChange,
      newStock: targetStock
    });
  } catch (err) {
    console.error('adjustProductStock error:', err);
    res.status(500).json({ msg: err.message || 'Failed to adjust stock' });
  }
};

exports.getProductHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid product ID' });
    }

    const product = await Product.findOne({
      _id: toObjectId(id),
      isDeleted: { $ne: true }
    }).lean();

    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const historyData = await inventoryHistoryService.getProductHistory(id);

    // If no records found, auto-create initial listing audit event
    if (!historyData.items || historyData.items.length === 0) {
      const initialRecord = await inventoryHistoryService.logInventoryEvent({
        productId: product._id,
        vendorId: product.userId || req.userId,
        type: 'PRODUCT_CREATED',
        quantityChange: Number(product.quantity || 0),
        stockBefore: 0,
        stockAfter: Number(product.quantity || 0),
        referenceId: `INIT-${String(product._id).slice(-6).toUpperCase()}`,
        reason: 'Initial inventory listing created',
        actor: 'Vendor',
        createdAt: product.createdAt || new Date()
      });

      if (initialRecord) {
        historyData.items = [initialRecord];
        historyData.totalRecords = 1;
        historyData.summary = {
          totalAdded: Number(product.quantity || 0),
          totalSold: 0,
          totalAdjusted: 0,
          currentStock: Number(product.quantity || 0)
        };
      }
    }

    res.json({
      product: {
        _id: product._id,
        name: product.name,
        category: product.category || 'General',
        price: product.price,
        quantity: product.quantity,
        image: product.image || (Array.isArray(product.images) && product.images[0]) || ''
      },
      ...historyData
    });
  } catch (err) {
    console.error('getProductHistory error:', err);
    res.status(500).json({ msg: err.message || 'Failed to load product history' });
  }
};

exports.compareProductsAi = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({ msg: 'Please provide at least 2 product IDs to compare' });
    }

    const products = await Product.find({ _id: { $in: productIds.map(toObjectId) }, isDeleted: { $ne: true } })
      .populate('userId', 'name businessName')
      .lean();

    if (products.length < 2) {
      return res.status(400).json({ msg: 'Could not find sufficient products to compare' });
    }

    // Flatten nested specs object into { 'Section > Key': value } map
    const flattenSpecs = (specs) => {
      const flat = {};
      if (!specs || typeof specs !== 'object') return flat;
      for (const [section, fields] of Object.entries(specs)) {
        if (fields && typeof fields === 'object') {
          for (const [key, value] of Object.entries(fields)) {
            flat[`${section} › ${key}`] = String(value || '').trim();
          }
        }
      }
      return flat;
    };

    const summary = products.map((p) => {
      const orig = Number(p.price || 0);
      const disc = Number(p.discountPercentage || 10);
      const eff = Math.round(orig * (1 - disc / 100));
      const flatSpecs = flattenSpecs(p.specifications);
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        brand: p.brand || '',
        image: p.image || (Array.isArray(p.images) ? p.images[0] : ''),
        price: eff,
        originalPrice: orig,
        rating: p.rating || 4.3,
        ratingCount: p.ratingCount || 28,
        stock: p.quantity,
        vendor: p.userId?.name || p.vendorName || 'Verified Merchant',
        warranty: p.warranty || '1 Year Manufacturer Warranty',
        returnPolicy: p.returnPolicy || '7 Days Return & Exchange',
        specs: flatSpecs
      };
    });

    // Collect all spec keys across all products
    const allSpecKeys = new Set();
    summary.forEach((s) => Object.keys(s.specs).forEach((k) => allSpecKeys.add(k)));

    // Find spec advantages: for each product, which specs are better/unique vs others
    const specAdvantages = {};
    summary.forEach((prod) => {
      const advantages = [];
      allSpecKeys.forEach((key) => {
        const myVal = prod.specs[key];
        if (!myVal) return;
        // Check if this product has a value while others don't (unique spec)
        const othersHaveIt = summary.filter((s) => s._id !== prod._id && s.specs[key]);
        if (othersHaveIt.length === 0) {
          advantages.push(`${key.split(' › ').pop()}: ${myVal} (exclusive)`);
          return;
        }
        // Try numeric comparison: higher is better for RAM/Storage/Battery/Speed/Resolution
        const higherBetterKeys = /ram|storage|battery|mah|capacity|resolution|speed|core|ghz|mp|gb|tb/i;
        if (higherBetterKeys.test(key)) {
          const myNum = parseFloat(myVal);
          const allBetter = summary.filter((s) => s._id !== prod._id).every((s) => {
            const otherNum = parseFloat(s.specs[key] || '0');
            return !isNaN(myNum) && !isNaN(otherNum) && myNum > otherNum;
          });
          if (allBetter && !isNaN(myNum)) {
            advantages.push(`Superior ${key.split(' › ').pop()} (${myVal})`);
          }
        }
      });
      specAdvantages[String(prod._id)] = advantages.slice(0, 4); // keep top 4 spec advantages
    });

    // Scoring: rating (x25), stock (+20), lower price (penalized), spec advantages bonus (+5 each)
    let best = summary[0];
    let maxScore = -999999;
    summary.forEach((item) => {
      const specBonus = (specAdvantages[String(item._id)] || []).length * 5;
      const score = (item.rating * 25) + (item.stock > 0 ? 20 : -50) - (item.price / 800) + specBonus;
      if (score > maxScore) {
        maxScore = score;
        best = item;
      }
    });

    // Build key spec differentiators for verdict text
    const bestSpecHighlights = (specAdvantages[String(best._id)] || []).slice(0, 2);
    const specVerdictText = bestSpecHighlights.length > 0
      ? ` Key spec advantages: ${bestSpecHighlights.join('; ')}.`
      : '';

    // Build pros combining spec advantages + commercial metrics
    const pros = [
      `Best price-to-performance ratio at ₹${best.price.toLocaleString('en-IN')}`,
      `Top customer rating (${best.rating}★ from ${best.ratingCount}+ reviews)`,
      `In-stock and fulfilled by ${best.vendor} (${best.stock} units available)`
    ];
    (specAdvantages[String(best._id)] || []).slice(0, 2).forEach((adv) => pros.push(adv));

    const recommendation = {
      winnerId: best._id,
      winnerName: best.name,
      badge: 'Best Overall Pick',
      verdict: `After comparing prices, ratings, stock availability, and ${allSpecKeys.size} technical specification points — **${best.name}** delivers the best overall value. With a ${best.rating}★ rating and effective price of ₹${best.price.toLocaleString('en-IN')}, it leads across all key decision factors.${specVerdictText}`,
      pros
    };

    res.json({
      recommendation,
      products: summary
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'AI comparison failed' });
  }
};



