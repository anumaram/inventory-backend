const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');
const Wishlist = require('../models/wishlist.model');
const Order = require('../models/order.model');
const Address = require('../models/address.model');
const PaymentMethod = require('../models/payment-method.model');
const DarwinSettings = require('../models/darwin-settings.model');
const Customer = require('../models/customer.model');
const Coupon = require('../models/coupon.model');
const Promotion = require('../models/promotion.model');
const cartService = require('./cart.service');

const MAX_DARWIN_PRODUCTS = 10;

function isValidObjectId(id) {
  return Boolean(id && mongoose.Types.ObjectId.isValid(String(id)));
}

function toObjectId(id) {
  return isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null;
}

function formatProduct(p) {
  if (!p) return null;
  const origPrice = Number(p.price || 0);
  const discount = Number(p.discountPercentage ?? 10);
  const sellingPrice = Math.round(origPrice * (1 - discount / 100));
  const image =
    p.image ||
    (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '') ||
    '';

  return {
    _id: String(p._id),
    name: p.name || 'Product',
    description: p.description || '',
    category: p.category || 'Others',
    price: sellingPrice,
    originalPrice: origPrice,
    discountPercentage: discount,
    rating: Number(p.rating || 4.2),
    ratingCount: Number(p.ratingCount || 10),
    quantity: Number(p.quantity || 0),
    inStock: Number(p.quantity || 0) > 0,
    image,
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : image ? [image] : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    warranty: p.warranty || '1 Year Manufacturer Warranty',
    returnPolicy: p.returnPolicy || '7 Days Return & Exchange',
    vendorName: p.userId?.name || 'Authorized Partner'
  };
}

// 1. Search Products (Smart Multi-Token & Phrase Search)
async function searchProducts(args = {}) {
  const {
    query = '',
    category = '',
    minPrice,
    maxPrice,
    sort = 'rating',
    limit = 6
  } = args;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), MAX_DARWIN_PRODUCTS);
  const baseFilter = { isDeleted: { $ne: true } };

  if (category && typeof category === 'string' && category.trim()) {
    baseFilter.category = new RegExp(`^${category.trim()}$`, 'i');
  }

  const priceFilter = {};
  if (typeof minPrice === 'number' && minPrice >= 0) {
    priceFilter.$gte = minPrice;
  }
  if (typeof maxPrice === 'number' && maxPrice > 0) {
    priceFilter.$lte = maxPrice * 1.25;
  }
  if (Object.keys(priceFilter).length > 0) {
    baseFilter.price = priceFilter;
  }

  let sortObj = { rating: -1, salesCount: -1 };
  if (sort === 'price_asc') sortObj = { price: 1 };
  else if (sort === 'price_desc') sortObj = { price: -1 };
  else if (sort === 'sales' || sort === 'trending') sortObj = { salesCount: -1 };
  else if (sort === 'newest') sortObj = { createdAt: -1 };

  const trimmedQuery = typeof query === 'string' ? query.trim() : '';

  if (!trimmedQuery) {
    const products = await Product.find(baseFilter)
      .populate('userId', 'name')
      .sort(sortObj)
      .limit(safeLimit)
      .lean();
    return products.map(formatProduct);
  }

  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRegex = new RegExp(escapedQuery, 'i');

  // Strategy 1: Direct full phrase match in name, category, or description
  const phraseFilter = {
    ...baseFilter,
    $or: [
      { name: phraseRegex },
      { category: phraseRegex },
      { description: phraseRegex }
    ]
  };

  let products = await Product.find(phraseFilter)
    .populate('userId', 'name')
    .sort(sortObj)
    .limit(safeLimit)
    .lean();

  if (products.length >= safeLimit) {
    return products.map(formatProduct);
  }

  // Strategy 2: Multi-token keyword search (words taken separately)
  const stopWords = new Set(['are', 'we', 'have', 'do', 'you', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'is', 'it', 'on', 'at', 'by', 'with', 'from', 'as', 'options', 'similar']);
  const rawTokens = trimmedQuery
    .toLowerCase()
    .split(/[\s,._-]+/)
    .filter((t) => t.length > 0 && !stopWords.has(t));

  if (rawTokens.length > 0) {
    const existingIds = new Set(products.map((p) => String(p._id)));

    // Strategy 2a: All-Tokens Match ($and where each token must appear in name, category, or description)
    const andClauses = rawTokens.map((token) => {
      const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const r = token.length <= 3 ? new RegExp(`\\b${esc}\\b`, 'i') : new RegExp(esc, 'i');
      return {
        $or: [
          { name: r },
          { category: r },
          { description: r }
        ]
      };
    });

    const andFilter = {
      ...baseFilter,
      _id: { $nin: Array.from(existingIds).map(toObjectId) },
      $and: andClauses
    };

    const andMatches = await Product.find(andFilter)
      .populate('userId', 'name')
      .sort(sortObj)
      .limit(safeLimit - products.length)
      .lean();

    for (const p of andMatches) {
      existingIds.add(String(p._id));
      products.push(p);
    }

    // Strategy 2b: Partial Token Matches (scored by relevance) if we still need items
    if (products.length < safeLimit && rawTokens.length > 1) {
      const orClauses = rawTokens.map((t) => {
        const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const r = t.length <= 3 ? new RegExp(`\\b${esc}\\b`, 'i') : new RegExp(esc, 'i');
        return {
          $or: [{ name: r }, { category: r }, { description: r }]
        };
      });

      const orFilter = {
        ...baseFilter,
        _id: { $nin: Array.from(existingIds).map(toObjectId) },
        $or: orClauses
      };

      const candidates = await Product.find(orFilter)
        .populate('userId', 'name')
        .limit(30)
        .lean();

      // Score candidates by how many tokens match
      const scored = candidates.map((p) => {
        let score = 0;
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();

        rawTokens.forEach((t) => {
          if (pName.includes(t)) score += 6;
          if (pCat.includes(t)) score += 4;
          if (pDesc.includes(t)) score += 2;
        });

        return { product: p, score };
      });

      scored.sort((a, b) => b.score - a.score);

      for (const item of scored) {
        if (products.length >= safeLimit) break;
        if (!existingIds.has(String(item.product._id))) {
          existingIds.add(String(item.product._id));
          products.push(item.product);
        }
      }
    }
  }

  return products.map(formatProduct);
}

// 2. Get Product Details
async function getProductDetails({ productId }) {
  if (!isValidObjectId(productId)) return null;
  const p = await Product.findOne({ _id: toObjectId(productId), isDeleted: { $ne: true } })
    .populate('userId', 'name email')
    .lean();
  return formatProduct(p);
}

// 3. Get Available Categories
async function getAvailableCategories() {
  const categories = await Product.distinct('category', { isDeleted: { $ne: true } });
  return categories.filter(Boolean).sort();
}

// 4. Get Trending Products
async function getTrendingProducts({ limit = 6 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), MAX_DARWIN_PRODUCTS);
  const products = await Product.find({ isDeleted: { $ne: true } })
    .populate('userId', 'name')
    .sort({ salesCount: -1, rating: -1 })
    .limit(safeLimit)
    .lean();
  return products.map(formatProduct);
}

// 5. Get Top Rated Products
async function getTopRatedProducts({ category = '', limit = 6 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), MAX_DARWIN_PRODUCTS);
  const filter = { isDeleted: { $ne: true } };
  if (category) {
    filter.category = new RegExp(`^${category.trim()}$`, 'i');
  }
  const products = await Product.find(filter)
    .populate('userId', 'name')
    .sort({ rating: -1, ratingCount: -1 })
    .limit(safeLimit)
    .lean();
  return products.map(formatProduct);
}

// 6. Compare Products (2-3 products)
async function compareProducts({ productIds = [] } = {}) {
  if (!Array.isArray(productIds) || productIds.length < 2) {
    return {
      error: 'Please specify at least 2 products to compare.'
    };
  }

  const validIds = productIds
    .filter(isValidObjectId)
    .slice(0, 3)
    .map(toObjectId);

  if (validIds.length < 2) {
    return {
      error: 'Invalid product identifiers provided for comparison.'
    };
  }

  const docs = await Product.find({ _id: { $in: validIds }, isDeleted: { $ne: true } })
    .populate('userId', 'name')
    .lean();

  const formatted = docs.map(formatProduct).filter(Boolean);

  if (!formatted || formatted.length < 2) {
    return {
      error: 'Could not find at least 2 matching products in the catalog to compare.'
    };
  }

  // Derive common comparison criteria
  const comparisonAttributes = [
    { key: 'price', label: 'Selling Price' },
    { key: 'originalPrice', label: 'List Price (MRP)' },
    { key: 'discountPercentage', label: 'Discount %' },
    { key: 'rating', label: 'Customer Rating' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Stock Available' },
    { key: 'warranty', label: 'Warranty' },
    { key: 'returnPolicy', label: 'Return Policy' }
  ];

  // Automated winner & trade-off analysis
  const sortedByPrice = [...formatted].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  const sortedByRating = [...formatted].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  const valuePick = sortedByPrice[0];
  const topRated = sortedByRating[0];

  // Winner calculation
  let winner = topRated;
  let verdictReason = '';
  if (valuePick._id === topRated._id) {
    winner = valuePick;
    verdictReason = `${winner.name} is the clear winner! It offers the best customer rating (${winner.rating}★) and the lowest price (₹${Number(winner.price || 0).toLocaleString('en-IN')}).`;
  } else if (Number(topRated.rating || 0) >= 4.2 && Number(topRated.price || 0) <= Number(valuePick.price || 0) * 1.35) {
    winner = topRated;
    verdictReason = `${topRated.name} is the recommended winner for overall quality and reliability with a higher ${topRated.rating}★ rating for just a small price difference. If budget is your #1 priority, ${valuePick.name} at ₹${Number(valuePick.price || 0).toLocaleString('en-IN')} is also a great value pick.`;
  } else {
    winner = valuePick;
    verdictReason = `${valuePick.name} is the best value winner! It saves you ₹${Math.abs(Number(sortedByPrice[sortedByPrice.length - 1].price || 0) - Number(valuePick.price || 0)).toLocaleString('en-IN')} while maintaining a solid ${valuePick.rating || 4.2}★ rating.`;
  }

  return {
    products: formatted,
    attributes: comparisonAttributes,
    winnerId: String(winner._id),
    winnerBadge: 'Darwin\'s Top Pick',
    valuePickId: String(valuePick._id),
    verdict: {
      winnerId: String(winner._id),
      winnerName: winner.name,
      reason: verdictReason
    },
    insight: verdictReason
  };
}

// 7. Get Similar Products
async function getSimilarProducts({ productId, query = '', limit = 4 } = {}) {
  let refProduct = null;
  if (productId && isValidObjectId(productId)) {
    refProduct = await Product.findById(productId).lean();
  }
  if (!refProduct && query) {
    const cleanQ = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    refProduct = await Product.findOne({
      $or: [
        { name: new RegExp(cleanQ, 'i') },
        { category: new RegExp(cleanQ, 'i') }
      ],
      isDeleted: { $ne: true }
    }).lean();
  }
  if (!refProduct) return [];

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 4, 1), MAX_DARWIN_PRODUCTS);
  const minPrice = Math.max(0, Number(refProduct.price || 0) * 0.5);
  const maxPrice = Number(refProduct.price || 0) * 1.6;

  let similar = await Product.find({
    _id: { $ne: refProduct._id },
    category: refProduct.category,
    price: { $gte: minPrice, $lte: maxPrice },
    isDeleted: { $ne: true }
  })
    .populate('userId', 'name')
    .sort({ rating: -1, salesCount: -1 })
    .limit(safeLimit)
    .lean();

  if (similar.length === 0) {
    similar = await Product.find({
      _id: { $ne: refProduct._id },
      category: refProduct.category,
      isDeleted: { $ne: true }
    })
      .populate('userId', 'name')
      .sort({ rating: -1 })
      .limit(safeLimit)
      .lean();
  }

  return similar.map(formatProduct);
}

// 8. Get Cart (Customer authenticated)
async function getCart({ customerId }) {
  if (!isValidObjectId(customerId)) return [];
  const items = await Cart.aggregate([
    { $match: { customerId: toObjectId(customerId), isDeleted: { $ne: true } } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
  ]);

  return items.map((item) => ({
    cartItemId: String(item._id),
    qty: item.qty || 1,
    product: formatProduct(item.product)
  }));
}

// 9. Add to Cart (Customer authenticated)
async function addToCart({ customerId, productId, qty = 1 }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!isValidObjectId(productId)) throw new Error('Valid productId is required.');

  const product = await Product.findOne({ _id: toObjectId(productId), isDeleted: { $ne: true } });
  if (!product) throw new Error('Product not found or unavailable.');

  const safeQty = Math.max(parseInt(qty, 10) || 1, 1);
  if (product.quantity <= 0) throw new Error('Product is currently out of stock.');

  const existing = await Cart.findOne({
    customerId: toObjectId(customerId),
    productId: toObjectId(productId)
  });

  let cartItem;
  if (existing) {
    const nextQty = existing.isDeleted ? safeQty : existing.qty + safeQty;
    if (product.quantity < nextQty) {
      throw new Error(`Only ${product.quantity} units available in stock.`);
    }
    existing.qty = nextQty;
    existing.isDeleted = false;
    cartItem = await existing.save();
  } else {
    if (product.quantity < safeQty) {
      throw new Error(`Only ${product.quantity} units available in stock.`);
    }
    cartItem = await Cart.create({
      customerId: toObjectId(customerId),
      productId: toObjectId(productId),
      qty: safeQty
    });
  }

  return {
    success: true,
    message: `${product.name} added to your cart!`,
    product: formatProduct(product),
    qty: safeQty,
    cartItemId: String(cartItem._id)
  };
}

// 10. Update Cart (Customer authenticated)
async function updateCart({ customerId, productId, qty }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!isValidObjectId(productId)) throw new Error('Valid productId is required.');

  const safeQty = Math.max(parseInt(qty, 10) || 1, 1);
  const cartItem = await Cart.findOneAndUpdate(
    {
      customerId: toObjectId(customerId),
      productId: toObjectId(productId),
      isDeleted: { $ne: true }
    },
    { qty: safeQty },
    { returnDocument: 'after' }
  );

  if (!cartItem) throw new Error('Item not found in cart.');
  return { success: true, qty: safeQty };
}

// 11. Remove from Cart (Customer authenticated)
async function removeFromCart({ customerId, productId }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!isValidObjectId(productId)) throw new Error('Valid productId is required.');

  await Cart.findOneAndUpdate(
    {
      customerId: toObjectId(customerId),
      productId: toObjectId(productId),
      isDeleted: { $ne: true }
    },
    { isDeleted: true }
  );

  return { success: true, message: 'Item removed from your cart.' };
}

// 12. Get Wishlist (Customer authenticated)
async function getWishlist({ customerId }) {
  if (!isValidObjectId(customerId)) return [];
  const items = await Wishlist.find({
    customerId: toObjectId(customerId),
    isDeleted: { $ne: true }
  })
    .populate('productId')
    .sort({ createdAt: -1 })
    .lean();

  return items
    .filter((w) => w.productId && !w.productId.isDeleted)
    .map((w) => formatProduct(w.productId));
}

// 13. Add to Wishlist (Customer authenticated)
async function addToWishlist({ customerId, productId }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!isValidObjectId(productId)) throw new Error('Valid productId is required.');

  const product = await Product.findOne({ _id: toObjectId(productId), isDeleted: { $ne: true } });
  if (!product) throw new Error('Product not found.');

  // Find or create default collection
  const WishlistCollection = require('../models/wishlist-collection.model');
  let col = await WishlistCollection.findOne({
    customerId: toObjectId(customerId),
    isDeleted: { $ne: true }
  });
  if (!col) {
    col = await WishlistCollection.create({
      customerId: toObjectId(customerId),
      name: 'My Favorites',
      category: product.category || 'Others'
    });
  }

  const existing = await Wishlist.findOne({
    customerId: toObjectId(customerId),
    productId: toObjectId(productId)
  });

  if (existing) {
    existing.isDeleted = false;
    await existing.save();
  } else {
    await Wishlist.create({
      customerId: toObjectId(customerId),
      productId: toObjectId(productId),
      collectionId: col._id,
      category: product.category || 'Others'
    });
  }

  return {
    success: true,
    message: `${product.name} saved to your wishlist!`,
    product: formatProduct(product)
  };
}

// 14. Remove from Wishlist (Customer authenticated)
async function removeFromWishlist({ customerId, productId }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!isValidObjectId(productId)) throw new Error('Valid productId is required.');

  await Wishlist.findOneAndUpdate(
    {
      customerId: toObjectId(customerId),
      productId: toObjectId(productId)
    },
    { isDeleted: true }
  );

  return { success: true, message: 'Item removed from your wishlist.' };
}

// 15. Get Customer Orders (Customer authenticated)
async function getCustomerOrders({ customerId, limit = 5 } = {}) {
  if (!isValidObjectId(customerId)) return [];
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);

  const orders = await Order.find({
    customerId: toObjectId(customerId),
    status: { $ne: 'deleted' }
  })
    .sort({ placedAt: -1, createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return orders.map((o) => ({
    _id: String(o._id),
    orderId: o.orderId || String(o._id).slice(-10).toUpperCase(),
    status: o.status || 'placed',
    totalAmount: Number(o.totalAmount || 0),
    placedAt: o.placedAt || o.createdAt,
    paymentMethod: o.paymentMethod || 'online',
    deliveryFee: Number(o.deliveryFee || 0),
    items: (Array.isArray(o.items) ? o.items : []).map((it) => ({
      productId: String(it.productId || ''),
      name: it.name || 'Product Item',
      image: it.image || '',
      price: Number(it.price || 0),
      qty: Number(it.qty || 1),
      vendorName: it.vendorName || ''
    }))
  }));
}

// 16. Track Order (Customer authenticated & verified ownership)
async function trackOrder({ customerId, orderId }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  if (!orderId || typeof orderId !== 'string') throw new Error('Order identifier is required.');

  const trimmedId = orderId.trim();
  const filter = {
    customerId: toObjectId(customerId),
    $or: [{ orderId: trimmedId }]
  };
  if (isValidObjectId(trimmedId)) {
    filter.$or.push({ _id: toObjectId(trimmedId) });
  }

  const order = await Order.findOne(filter).lean();
  if (!order) {
    throw new Error(`Order #${orderId} was not found in your account.`);
  }

  // Calculate delivery timeline
  const placedDate = new Date(order.placedAt || order.createdAt || Date.now());
  const estDeliveryDate = new Date(placedDate);
  estDeliveryDate.setDate(placedDate.getDate() + 4);

  const steps = [
    { key: 'placed', label: 'Order Placed', time: order.statusTimestamps?.placed || order.placedAt },
    { key: 'packed', label: 'Processing & Packed', time: order.statusTimestamps?.packed || null },
    { key: 'shipped', label: 'Shipped', time: order.statusTimestamps?.shipped || null },
    { key: 'out_for_delivery', label: 'Out for Delivery', time: order.statusTimestamps?.out_for_delivery || null },
    { key: 'delivered', label: 'Delivered', time: order.statusTimestamps?.delivered || null }
  ];

  const statusOrder = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status || 'placed');

  const timeline = steps.map((s, idx) => ({
    ...s,
    completed: idx <= currentIndex,
    current: idx === currentIndex
  }));

  return {
    orderId: order.orderId || String(order._id),
    status: order.status,
    placedAt: order.placedAt,
    estimatedDelivery: estDeliveryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }),
    totalAmount: Number(order.totalAmount || 0),
    items: Array.isArray(order.items) ? order.items : [],
    timeline
  };
}

// Helper to parse unstructured Indian addresses
function parseIndianAddress(rawText = '') {
  const text = String(rawText || '')
    .replace(/(?:search for this address and add as my address|add as my address|add this address|add to my address|save as my address|set as my address|my address is)/gi, '')
    .trim();

  // Extract 6-digit PIN code
  const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
  const pincode = pinMatch ? pinMatch[1] : '';

  // Remaining address string without the 6-digit pin
  let remaining = text.replace(/\b[1-9][0-9]{5}\b/g, '').replace(/[,\s]+/g, ' ').trim();

  let state = 'Andhra Pradesh';
  if (/^5[0-3]/.test(pincode)) state = 'Andhra Pradesh';
  else if (/^50/.test(pincode)) state = 'Telangana';
  else if (/^[1-2]/.test(pincode)) state = 'Delhi / NCR';
  else if (/^4/.test(pincode)) state = 'Maharashtra';
  else if (/^6/.test(pincode)) state = 'Tamil Nadu / Karnataka';
  else if (/^7/.test(pincode)) state = 'West Bengal / Odisha';
  else if (/^3/.test(pincode)) state = 'Gujarat';

  const capitalize = (str) => (str || '').replace(/\b\w/g, (c) => c.toUpperCase());

  let city = 'Vizianagaram';
  if (/denkada/i.test(text)) {
    city = 'Denkada';
    state = 'Andhra Pradesh';
  } else if (/vizianagaram/i.test(text)) {
    city = 'Vizianagaram';
    state = 'Andhra Pradesh';
  } else if (/visakhapatnam|vizag/i.test(text)) {
    city = 'Visakhapatnam';
    state = 'Andhra Pradesh';
  } else if (/hyderabad/i.test(text)) {
    city = 'Hyderabad';
    state = 'Telangana';
  } else if (/bengaluru|bangalore/i.test(text)) {
    city = 'Bengaluru';
    state = 'Karnataka';
  } else if (/mumbai/i.test(text)) {
    city = 'Mumbai';
    state = 'Maharashtra';
  } else if (/delhi/i.test(text)) {
    city = 'Delhi';
    state = 'Delhi';
  }

  const addressLine1 = capitalize(remaining || 'Main Road');

  return {
    addressLine1,
    city: capitalize(city),
    state: capitalize(state),
    pincode: pincode || '535006'
  };
}

// 17. Add Customer Address (Customer authenticated - Real MongoDB creation)
async function addCustomerAddress(args = {}) {
  const {
    customerId,
    addressText = '',
    addressLine1 = '',
    addressLine2 = '',
    city = '',
    state = '',
    pincode = '',
    fullName = '',
    phone = '',
    type = 'home',
    isDefault = true
  } = args;

  if (!isValidObjectId(customerId)) {
    throw new Error('Customer authentication required to add an address.');
  }

  // Fetch customer profile to get real customer name and phone
  const customer = await Customer.findById(toObjectId(customerId)).lean();
  if (!customer) throw new Error('Customer account not found.');

  // Parse if raw address text was provided
  const parsed = addressText ? parseIndianAddress(addressText) : {};

  const finalFullName = (fullName || customer.name || 'Valued Customer').trim();
  let finalPhone = (phone || customer.phone || '').trim();
  if (!/^\d{10}$/.test(finalPhone)) {
    finalPhone = '9876543210';
  }

  const finalAddressLine1 = (addressLine1 || parsed.addressLine1 || addressText || 'Door No. 1-23, Main Road').trim();
  const finalAddressLine2 = (addressLine2 || parsed.addressLine2 || '').trim();
  const finalCity = (city || parsed.city || 'Denkada').trim();
  const finalState = (state || parsed.state || 'Andhra Pradesh').trim();
  const finalPincode = (pincode || parsed.pincode || '535006').trim();
  const finalType = ['home', 'work', 'other'].includes(type) ? type : 'home';

  const newAddress = await Address.create({
    customerId: toObjectId(customerId),
    fullName: finalFullName,
    phone: finalPhone,
    addressLine1: finalAddressLine1,
    addressLine2: finalAddressLine2,
    city: finalCity,
    state: finalState,
    pincode: finalPincode,
    type: finalType,
    isDeleted: false
  });

  // Set as default address in DarwinSettings
  if (isDefault) {
    await DarwinSettings.findOneAndUpdate(
      { customerId: toObjectId(customerId) },
      { $set: { defaultAddressId: newAddress._id } },
      { upsert: true }
    );
  }

  // Update customer's profile phone if missing
  if (finalPhone && !customer.phone) {
    await Customer.findByIdAndUpdate(customerId, { $set: { phone: finalPhone } }).catch(() => {});
  }

  const formattedAddr = `${newAddress.addressLine1}${newAddress.addressLine2 ? ', ' + newAddress.addressLine2 : ''}, ${newAddress.city}, ${newAddress.state} - ${newAddress.pincode}`;

  return {
    success: true,
    address: {
      _id: String(newAddress._id),
      fullName: newAddress.fullName,
      phone: newAddress.phone,
      addressLine1: newAddress.addressLine1,
      addressLine2: newAddress.addressLine2,
      city: newAddress.city,
      state: newAddress.state,
      pincode: newAddress.pincode,
      type: newAddress.type,
      formatted: formattedAddr
    },
    action: {
      type: 'address_added',
      address: newAddress,
      message: `Address saved to your address book: **${formattedAddr}**`
    },
    summary: `Your delivery address has been saved and set as default:\n**${newAddress.fullName}**\n${formattedAddr}\nPhone: ${newAddress.phone}`
  };
}

// 17B. Update Customer Address
async function updateCustomerAddress({ customerId, addressId, ...updates }) {
  if (!isValidObjectId(customerId) || !isValidObjectId(addressId)) {
    throw new Error('Valid customer ID and address ID required.');
  }
  const cleanUpdates = {};
  ['fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'type'].forEach((f) => {
    if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
  });
  const updated = await Address.findOneAndUpdate(
    { _id: toObjectId(addressId), customerId: toObjectId(customerId), isDeleted: { $ne: true } },
    { $set: cleanUpdates },
    { new: true }
  ).lean();
  if (!updated) throw new Error('Address not found.');
  return {
    success: true,
    address: updated,
    action: { type: 'address_updated', address: updated },
    summary: `Address updated to: **${updated.addressLine1}, ${updated.city} - ${updated.pincode}**`
  };
}

// 17C. Delete Customer Address
async function deleteCustomerAddress({ customerId, addressId }) {
  if (!isValidObjectId(customerId) || !isValidObjectId(addressId)) {
    throw new Error('Valid customer ID and address ID required.');
  }
  await Address.findOneAndUpdate(
    { _id: toObjectId(addressId), customerId: toObjectId(customerId) },
    { $set: { isDeleted: true } }
  );
  return {
    success: true,
    action: { type: 'address_deleted', addressId },
    summary: 'Address removed from your address book.'
  };
}

// 17D. Set Default Delivery Address
async function setDefaultAddress({ customerId, addressId }) {
  if (!isValidObjectId(customerId) || !isValidObjectId(addressId)) {
    throw new Error('Valid customer ID and address ID required.');
  }
  const addr = await Address.findOne({
    _id: toObjectId(addressId),
    customerId: toObjectId(customerId),
    isDeleted: { $ne: true }
  }).lean();
  if (!addr) throw new Error('Address not found.');
  await DarwinSettings.findOneAndUpdate(
    { customerId: toObjectId(customerId) },
    { $set: { defaultAddressId: addr._id } },
    { upsert: true }
  );
  return {
    success: true,
    address: addr,
    action: { type: 'default_address_set', address: addr },
    summary: `Default delivery address set to **${addr.addressLine1}, ${addr.city} - ${addr.pincode}**`
  };
}

// 18. Get Customer Addresses (Customer authenticated)
async function getCustomerAddresses({ customerId }) {
  if (!isValidObjectId(customerId)) return [];
  return Address.find({ customerId: toObjectId(customerId), isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();
}

// 18B. Get Default Address (Customer authenticated with Smart Priority Hierarchy)
async function getDefaultAddress({ customerId, activeDeliveryAddress = null }) {
  if (!isValidObjectId(customerId)) return null;

  // 1. Fixed Pinned Address in DarwinSettings (if explicitly chosen by customer, not Smart Auto)
  const settings = await DarwinSettings.findOne({ customerId: toObjectId(customerId) }).lean();
  if (settings?.defaultAddressId) {
    const pinnedAddr = await Address.findOne({
      _id: settings.defaultAddressId,
      customerId: toObjectId(customerId),
      isDeleted: { $ne: true }
    }).lean();
    if (pinnedAddr) return pinnedAddr;
  }

  // 2. SMART SYSTEM PRIORITY 1: Active Navbar Delivery Address (passed from store topbar)
  if (activeDeliveryAddress) {
    // If active address has an _id, verify in DB
    if (activeDeliveryAddress._id && isValidObjectId(activeDeliveryAddress._id)) {
      const match = await Address.findOne({
        _id: toObjectId(activeDeliveryAddress._id),
        customerId: toObjectId(customerId),
        isDeleted: { $ne: true }
      }).lean();
      if (match) return match;
    }

    // Try matching by pincode and city or area
    if (activeDeliveryAddress.pincode || activeDeliveryAddress.city) {
      const query = {
        customerId: toObjectId(customerId),
        isDeleted: { $ne: true }
      };
      if (activeDeliveryAddress.pincode) {
        query.pincode = activeDeliveryAddress.pincode;
      } else if (activeDeliveryAddress.city) {
        query.city = new RegExp(`^${activeDeliveryAddress.city}$`, 'i');
      }

      const match = await Address.findOne(query).lean();
      if (match) return match;
    }

    // If active delivery location was set from map or topbar without DB ID yet
    if (activeDeliveryAddress.city || activeDeliveryAddress.formattedAddress) {
      return {
        _id: activeDeliveryAddress._id || new mongoose.Types.ObjectId(),
        fullName: activeDeliveryAddress.fullName || 'Customer',
        phone: activeDeliveryAddress.phone || '',
        addressLine1: activeDeliveryAddress.house
          ? `${activeDeliveryAddress.house}, ${activeDeliveryAddress.area || ''}`
          : (activeDeliveryAddress.area || activeDeliveryAddress.addressLine1 || activeDeliveryAddress.city),
        city: activeDeliveryAddress.city || '',
        state: activeDeliveryAddress.state || '',
        pincode: activeDeliveryAddress.pincode || '',
        type: activeDeliveryAddress.type || 'home'
      };
    }
  }

  // 3. SMART SYSTEM PRIORITY 2: Most recent completed Order shipping address
  const lastOrder = await Order.findOne({
    customerId: toObjectId(customerId),
    'shippingAddress.addressLine1': { $exists: true }
  })
    .sort({ createdAt: -1 })
    .lean();

  if (lastOrder?.shippingAddress) {
    if (lastOrder.shippingAddress._id && isValidObjectId(lastOrder.shippingAddress._id)) {
      const orderAddr = await Address.findOne({
        _id: toObjectId(lastOrder.shippingAddress._id),
        customerId: toObjectId(customerId),
        isDeleted: { $ne: true }
      }).lean();
      if (orderAddr) return orderAddr;
    }

    if (lastOrder.shippingAddress.addressLine1) {
      return {
        _id: lastOrder.shippingAddress._id || new mongoose.Types.ObjectId(),
        fullName: lastOrder.shippingAddress.fullName || 'Customer',
        phone: lastOrder.shippingAddress.phone || '',
        addressLine1: lastOrder.shippingAddress.addressLine1,
        addressLine2: lastOrder.shippingAddress.addressLine2 || '',
        city: lastOrder.shippingAddress.city || '',
        state: lastOrder.shippingAddress.state || '',
        pincode: lastOrder.shippingAddress.pincode || '',
        type: lastOrder.shippingAddress.type || 'home'
      };
    }
  }

  // 4. SMART SYSTEM PRIORITY 3: Profile Default Address (isDefault: true)
  const defaultAddr = await Address.findOne({
    customerId: toObjectId(customerId),
    isDefault: true,
    isDeleted: { $ne: true }
  }).lean();
  if (defaultAddr) return defaultAddr;

  // 5. Fallback: Most recent saved address in address book
  return Address.findOne({ customerId: toObjectId(customerId), isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();
}

// 19. Get Payment Methods (Customer authenticated, safely masked)
async function getPaymentMethods({ customerId }) {
  if (!isValidObjectId(customerId)) return [];
  const methods = await PaymentMethod.find({
    customerId: toObjectId(customerId),
    isDeleted: { $ne: true }
  })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return methods.map((m) => ({
    _id: String(m._id),
    type: m.type,
    label: m.label || (m.type === 'upi' ? `UPI (${m.upiId})` : m.type === 'card' ? `Card ending in ${m.last4 || '••••'}` : m.type.toUpperCase()),
    last4: m.last4 ? `•••• ${m.last4}` : '',
    upiId: m.upiId || '',
    isDefault: Boolean(m.isDefault)
  }));
}

// 20. Get Default Payment Method
async function getDefaultPaymentMethod({ customerId }) {
  if (!isValidObjectId(customerId)) return { type: 'wallet', label: 'Store Wallet' };
  const settings = await DarwinSettings.findOne({ customerId: toObjectId(customerId) }).lean();
  if (settings?.defaultPaymentMethodId) {
    const pm = await PaymentMethod.findOne({
      _id: settings.defaultPaymentMethodId,
      customerId: toObjectId(customerId),
      isDeleted: { $ne: true }
    }).lean();
    if (pm) {
      return {
        _id: String(pm._id),
        type: pm.type,
        label: pm.label || (pm.type === 'upi' ? `UPI (${pm.upiId})` : `Card (•••• ${pm.last4 || ''})`),
        last4: pm.last4 ? `•••• ${pm.last4}` : ''
      };
    }
  }

  const defaultPm = await PaymentMethod.findOne({
    customerId: toObjectId(customerId),
    isDefault: true,
    isDeleted: { $ne: true }
  }).lean();

  if (defaultPm) {
    return {
      _id: String(defaultPm._id),
      type: defaultPm.type,
      label: defaultPm.label || defaultPm.type.toUpperCase(),
      last4: defaultPm.last4 ? `•••• ${defaultPm.last4}` : ''
    };
  }

  return { type: 'wallet', label: 'Store Wallet' };
}

// 21. Get Darwin Settings
async function getDarwinSettings({ customerId }) {
  if (!isValidObjectId(customerId)) return null;
  let settings = await DarwinSettings.findOne({ customerId: toObjectId(customerId) }).lean();
  if (!settings) {
    settings = await DarwinSettings.create({ customerId: toObjectId(customerId) });
  }
  return settings;
}

// 22. Save Darwin Settings
async function saveDarwinSettings({ customerId, settings = {} }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');

  const update = {};

  // Address ID: convert empty string or invalid ObjectId to null
  if (settings.defaultAddressId !== undefined) {
    update.defaultAddressId = isValidObjectId(settings.defaultAddressId)
      ? toObjectId(settings.defaultAddressId)
      : null;
  }

  // Payment Method ID: convert empty string or invalid ObjectId to null
  if (settings.defaultPaymentMethodId !== undefined) {
    update.defaultPaymentMethodId = isValidObjectId(settings.defaultPaymentMethodId)
      ? toObjectId(settings.defaultPaymentMethodId)
      : null;
  }

  // AI Provider preference
  if (settings.aiProviderPreference !== undefined) {
    const validModes = ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'];
    update.aiProviderPreference = validModes.includes(settings.aiProviderPreference)
      ? settings.aiProviderPreference
      : 'auto';
  }

  if (settings.budgetPreference !== undefined) {
    update.budgetPreference = Math.max(0, Number(settings.budgetPreference) || 0);
  }

  if (Array.isArray(settings.preferredCategories)) {
    update.preferredCategories = settings.preferredCategories;
  }

  if (settings.voiceInputEnabled !== undefined) {
    update.voiceInputEnabled = Boolean(settings.voiceInputEnabled);
  }

  if (settings.suggestedPromptsEnabled !== undefined) {
    update.suggestedPromptsEnabled = Boolean(settings.suggestedPromptsEnabled);
  }

  if (settings.saveConversationsEnabled !== undefined) {
    update.saveConversationsEnabled = Boolean(settings.saveConversationsEnabled);
  }

  return DarwinSettings.findOneAndUpdate(
    { customerId: toObjectId(customerId) },
    { $set: update },
    { upsert: true, returnDocument: 'after' }
  );
}

// 23. Prepare Conversational Checkout (Does NOT create order yet)
async function prepareCheckoutSummary({
  customerId,
  productId,
  qty = 1,
  addressId,
  delivery = 'standard',
  paymentMethod = 'wallet',
  couponCode = '',
  isSmartBuy = false,
  activeDeliveryAddress = null
}) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');

  // Check Address
  let address = null;
  if (addressId && isValidObjectId(addressId)) {
    address = await Address.findOne({ _id: toObjectId(addressId), customerId: toObjectId(customerId), isDeleted: { $ne: true } }).lean();
  }
  if (!address) {
    address = await getDefaultAddress({ customerId, activeDeliveryAddress });
  }

  // Check Product or Cart
  let items = [];
  let subtotal = 0;
  if (productId && isValidObjectId(productId)) {
    const p = await Product.findOne({ _id: toObjectId(productId), isDeleted: { $ne: true } }).lean();
    if (!p) throw new Error('Product not found.');
    const safeQty = Math.max(parseInt(qty, 10) || 1, 1);
    const itemPrice = Math.round(Number(p.price || 0) * (1 - (p.discountPercentage || 10) / 100));
    items = [{
      productId: String(p._id),
      name: p.name,
      image: p.image || p.images?.[0] || '',
      price: itemPrice,
      qty: safeQty,
      lineTotal: itemPrice * safeQty
    }];
    subtotal = itemPrice * safeQty;
  } else {
    // Check cart items
    const cartItems = await getCart({ customerId });
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Your cart is empty. Please add items to checkout.');
    }
    items = cartItems.map((c) => ({
      productId: c.product._id,
      name: c.product.name,
      image: c.product.image,
      price: c.product.price,
      qty: c.qty,
      lineTotal: c.product.price * c.qty
    }));
    subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  }

  let deliveryFee = delivery === 'express' ? 99 : (subtotal >= 999 ? 0 : 49);
  let appliedCouponCode = String(couponCode || '').trim().toUpperCase();
  let couponDiscount = 0;
  let appliedCouponTitle = '';

  const now = new Date();

  // If Smart Buy or couponCode requested: evaluate coupon
  if (isSmartBuy || appliedCouponCode === 'AUTO_BEST' || appliedCouponCode) {
    let targetCoupon = null;

    if (appliedCouponCode && appliedCouponCode !== 'AUTO_BEST') {
      targetCoupon = await Coupon.findOne({
        code: appliedCouponCode,
        isActive: true,
        isDeleted: { $ne: true },
        $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }],
        minOrderAmount: { $lte: subtotal }
      }).lean();
    }

    // Auto-select best coupon if Smart Buy or AUTO_BEST or target not found
    if (!targetCoupon && (isSmartBuy || appliedCouponCode === 'AUTO_BEST')) {
      const eligibleCoupons = await Coupon.find({
        isActive: true,
        isDeleted: { $ne: true },
        $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }],
        minOrderAmount: { $lte: subtotal }
      }).lean();

      let maxDisc = 0;
      for (const c of eligibleCoupons) {
        let d = 0;
        if (c.discountType === 'percentage') {
          d = Math.min(Math.round(subtotal * Number(c.discountValue || 0) / 100), c.maxDiscountAmount || Infinity);
        } else {
          d = Math.min(Number(c.discountValue || 0), subtotal);
        }
        if (d > maxDisc) {
          maxDisc = d;
          targetCoupon = c;
        }
      }
    }

    if (targetCoupon) {
      appliedCouponCode = targetCoupon.code;
      appliedCouponTitle = targetCoupon.title;
      if (targetCoupon.discountType === 'percentage') {
        couponDiscount = Math.min(Math.round(subtotal * Number(targetCoupon.discountValue || 0) / 100), targetCoupon.maxDiscountAmount || Infinity);
      } else {
        couponDiscount = Math.min(Number(targetCoupon.discountValue || 0), subtotal);
      }
      if (targetCoupon.code === 'FREESHIP') {
        deliveryFee = 0;
      }
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - couponDiscount);

  return {
    isReadyToPlace: Boolean(address),
    address: address ? {
      _id: String(address._id),
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      type: address.type
    } : null,
    delivery,
    deliveryFee,
    paymentMethod,
    items,
    subtotal,
    couponCode: appliedCouponCode || '',
    couponTitle: appliedCouponTitle || '',
    couponDiscount,
    discount: couponDiscount,
    isSmartBuy: Boolean(isSmartBuy || couponDiscount > 0),
    total,
    promptConfirmation: true
  };
}

// 24. Get Customer Profile
async function getCustomerProfile({ customerId }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');
  const customer = await Customer.findOne({ _id: toObjectId(customerId), isDeleted: { $ne: true } })
    .select('name email phone gender dateOfBirth wallet')
    .lean();
  if (!customer) throw new Error('Customer not found.');
  return {
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    gender: customer.gender || '',
    dateOfBirth: customer.dateOfBirth || '',
    walletBalance: Number(customer.wallet?.balance || 0)
  };
}

// 25. Update Customer Profile (e.g. name, phone, gender, dateOfBirth)
async function updateCustomerProfile({ customerId, name, phone, gender, dateOfBirth }) {
  if (!isValidObjectId(customerId)) throw new Error('Customer authentication required.');

  const update = {};
  if (typeof name === 'string' && name.trim()) update.name = name.trim();
  if (typeof phone === 'string') update.phone = phone.trim();
  if (typeof gender === 'string') update.gender = gender.trim();
  if (typeof dateOfBirth === 'string') update.dateOfBirth = dateOfBirth.trim();

  if (Object.keys(update).length === 0) {
    throw new Error('No valid profile fields provided to update.');
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: toObjectId(customerId), isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' }
  ).select('name email phone gender dateOfBirth wallet').lean();

  if (!updated) throw new Error('Customer not found.');

  return {
    success: true,
    message: `Account profile updated successfully! Name: ${updated.name || ''}, Phone: ${updated.phone || 'Not set'}`,
    profile: {
      name: updated.name || '',
      email: updated.email || '',
      phone: updated.phone || '',
      gender: updated.gender || '',
      dateOfBirth: updated.dateOfBirth || ''
    }
  };
}

// 26. Calculate Smart Buy Deal (Best Coupon + Promo + Final Price + Savings)
async function calculateSmartBuyDeal({ product, customerId = null } = {}) {
  if (!product) return null;

  const sellingPrice = Number(product.price || 0);
  const origPrice = Number(product.originalPrice || sellingPrice);
  const now = new Date();

  // 1. Fetch eligible active coupons
  const coupons = await Coupon.find({
    isActive: true,
    isDeleted: { $ne: true },
    $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }],
    minOrderAmount: { $lte: sellingPrice }
  }).lean();

  let bestCoupon = null;
  let maxCouponDiscount = 0;

  for (const c of coupons) {
    let d = 0;
    if (c.discountType === 'percentage') {
      d = Math.min(Math.round(sellingPrice * Number(c.discountValue || 0) / 100), c.maxDiscountAmount || Infinity);
    } else {
      d = Math.min(Number(c.discountValue || 0), sellingPrice);
    }
    if (d > maxCouponDiscount) {
      maxCouponDiscount = d;
      bestCoupon = {
        code: c.code,
        title: c.title || c.code,
        discount: d,
        discountType: c.discountType,
        description: c.description || `Save ₹${d} with code ${c.code}`
      };
    }
  }

  // 2. Fetch active campaign promotion matching category or All
  const category = product.category || '';
  const promo = await Promotion.findOne({
    isActive: true,
    isDeleted: { $ne: true },
    $or: [{ targetCategory: 'All' }, { targetCategory: new RegExp(`^${category}$`, 'i') }]
  }).lean();

  const bestPromo = promo ? {
    title: promo.title,
    discountPercent: promo.discountPercent,
    badgeText: promo.badgeText || 'SALE'
  } : null;

  const finalPrice = Math.max(0, sellingPrice - maxCouponDiscount);
  const totalSavings = Math.max(0, (origPrice - sellingPrice) + maxCouponDiscount);

  let guideText = '';
  if (bestCoupon) {
    guideText = `Apply coupon **${bestCoupon.code}** at checkout for an extra ₹${bestCoupon.discount.toLocaleString('en-IN')} off! Final Smart Buy price: **₹${finalPrice.toLocaleString('en-IN')}**.`;
  } else {
    guideText = `Best available price: **₹${finalPrice.toLocaleString('en-IN')}**.`;
  }

  return {
    productId: String(product._id),
    productName: product.name,
    productImage: product.image,
    originalPrice: origPrice,
    sellingPrice,
    bestCoupon,
    bestPromo,
    couponDiscount: maxCouponDiscount,
    finalPrice,
    totalSavings,
    guideText
  };
}

// 25. Attach Smart Buy Deals to ALL Displayed Candidate Products
async function attachSmartBuyDealsToProducts(products = [], customerId = null) {
  if (!Array.isArray(products) || products.length === 0) return products;

  const now = new Date();

  // Safeguard: Load active coupons meeting business criteria
  const coupons = await Coupon.find({
    isActive: true,
    isDeleted: { $ne: true },
    $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }]
  }).lean();

  // Safeguard: Load active promotions meeting date windows
  const promotions = await Promotion.find({
    isActive: true,
    isDeleted: { $ne: true },
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null }
    ]
  }).lean();

  let maxSavingsFound = -1;
  let bestDealIdx = -1;

  const enriched = products.map((p, idx) => {
    const sellingPrice = Number(p.price || 0);
    const origPrice = Number(p.originalPrice || sellingPrice);

    // Safeguards for coupon selection:
    // 1. Min order amount check
    // 2. Max discount cap check for percentage discounts
    // 3. Single highest-discount coupon applied (no unintended stacking)
    let bestCoupon = null;
    let maxCouponDiscount = 0;

    for (const c of coupons) {
      if (c.minOrderAmount && c.minOrderAmount > sellingPrice) continue;

      let d = 0;
      if (c.discountType === 'percentage') {
        const calculated = Math.round(sellingPrice * Number(c.discountValue || 0) / 100);
        d = c.maxDiscountAmount ? Math.min(calculated, Number(c.maxDiscountAmount)) : calculated;
      } else {
        d = Math.min(Number(c.discountValue || 0), sellingPrice);
      }

      if (d > maxCouponDiscount) {
        maxCouponDiscount = d;
        bestCoupon = {
          code: c.code,
          title: c.title || c.code,
          discount: d,
          discountType: c.discountType
        };
      }
    }

    // Match promotion category
    const pCategory = (p.category || '').toLowerCase();
    const matchingPromo = promotions.find((pr) => {
      const tc = (pr.targetCategory || '').toLowerCase();
      return tc === 'all' || tc === pCategory;
    });

    const finalPrice = Math.max(0, sellingPrice - maxCouponDiscount);
    const totalSavings = Math.max(0, (origPrice - sellingPrice) + maxCouponDiscount);

    if (totalSavings > maxSavingsFound && maxCouponDiscount > 0) {
      maxSavingsFound = totalSavings;
      bestDealIdx = idx;
    }

    const smartBuy = {
      productId: String(p._id),
      productName: p.name,
      originalPrice: origPrice,
      sellingPrice,
      couponCode: bestCoupon ? bestCoupon.code : null,
      couponDiscount: maxCouponDiscount,
      finalPrice,
      totalSavings,
      hasCoupon: Boolean(bestCoupon),
      promotionTitle: matchingPromo ? matchingPromo.title : null,
      guideText: bestCoupon
        ? `Use code ${bestCoupon.code} to save ₹${maxCouponDiscount.toLocaleString('en-IN')}! Final price: ₹${finalPrice.toLocaleString('en-IN')}.`
        : `Best price: ₹${finalPrice.toLocaleString('en-IN')}.`
    };

    return {
      ...p,
      smartBuy,
      smartBuyDeal: smartBuy
    };
  });

  if (bestDealIdx >= 0 && enriched[bestDealIdx]?.smartBuy?.totalSavings > 0) {
    enriched[bestDealIdx].smartBuy.isBestValue = true;
    enriched[bestDealIdx].isBestValue = true;
  }

  return enriched;
}

// 26. Search Products by Price Range & Rating (Price Assistant)
async function searchProductsByPriceAndRating({
  minPrice = 0,
  maxPrice = Infinity,
  minRating = 0,
  category = '',
  query = '',
  sort = 'rating',
  limit = 8
} = {}) {
  const filter = { isDeleted: { $ne: true } };

  const priceFilter = {};
  if (minPrice && minPrice > 0) priceFilter.$gte = Number(minPrice);
  if (maxPrice && maxPrice < Infinity) priceFilter.$lte = Number(maxPrice);
  if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;

  if (minRating && minRating > 0) {
    filter.rating = { $gte: Number(minRating) };
  }
  if (category) {
    filter.category = new RegExp(`^${category.trim()}$`, 'i');
  }
  if (query) {
    const esc = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    filter.$or = [
      { name: new RegExp(esc, 'i') },
      { category: new RegExp(esc, 'i') },
      { description: new RegExp(esc, 'i') }
    ];
  }

  let sortObj = { rating: -1, salesCount: -1 };
  if (sort === 'price_asc') sortObj = { price: 1 };
  else if (sort === 'price_desc') sortObj = { price: -1 };

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), MAX_DARWIN_PRODUCTS);
  const products = await Product.find(filter)
    .populate('userId', 'name')
    .sort(sortObj)
    .limit(safeLimit)
    .lean();

  const formatted = products.map(formatProduct);
  return attachSmartBuyDealsToProducts(formatted);
}

// 27. Complementary Upselling ("You bought X; these products may complement it")
async function getComplementaryProducts({ productId, category = '', limit = 4 } = {}) {
  let refCategory = category;
  let excludeId = null;

  if (productId && isValidObjectId(productId)) {
    const ref = await Product.findById(productId).lean();
    if (ref) {
      refCategory = ref.category;
      excludeId = ref._id;
    }
  }

  const COMPLEMENT_MAP = {
    electronics: ['Accessories', 'Audio', 'Gadgets', 'Cables'],
    smartphones: ['Cases & Covers', 'Audio', 'Chargers', 'Screen Protectors'],
    footwear: ['Socks', 'Sportswear', 'Shoe Care', 'Fitness'],
    clothing: ['Footwear', 'Belts', 'Watches', 'Bags'],
    laptops: ['Mouse & Keyboards', 'Laptop Bags', 'Storage', 'Audio'],
    fashion: ['Jewelry', 'Watches', 'Handbags', 'Sunglasses']
  };

  const cleanCat = (refCategory || '').toLowerCase();
  const complementaryCategories = COMPLEMENT_MAP[cleanCat] || ['Electronics', 'Accessories', 'Fashion'];

  const filter = {
    isDeleted: { $ne: true },
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  };

  const regexArr = complementaryCategories.map((c) => new RegExp(c, 'i'));
  filter.category = { $in: regexArr };

  let complementary = await Product.find(filter)
    .populate('userId', 'name')
    .sort({ rating: -1, salesCount: -1 })
    .limit(limit)
    .lean();

  if (complementary.length === 0) {
    complementary = await Product.find({ isDeleted: { $ne: true }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
      .populate('userId', 'name')
      .sort({ salesCount: -1 })
      .limit(limit)
      .lean();
  }

  return attachSmartBuyDealsToProducts(complementary.map(formatProduct));
}

// 28. Shopping Q&A (Official Platform Policies)
async function getShoppingQA({ topic = '', productId = null } = {}) {
  const cleanTopic = String(topic || '').toLowerCase();
  let specificPolicy = null;

  if (productId && isValidObjectId(productId)) {
    const prod = await Product.findById(productId).select('name returnPolicy warranty').lean();
    if (prod) {
      specificPolicy = {
        productName: prod.name,
        returnPolicy: prod.returnPolicy || '7 Days Return & Exchange',
        warranty: prod.warranty || '1 Year Manufacturer Warranty'
      };
    }
  }

  const QA_RESPONSES = {
    returns: {
      title: 'Returns & Exchange Policy',
      answer: 'We offer a hassle-free **7-day return and exchange policy** on all eligible items. Items must be in original condition with tags and packaging intact. Refunds are credited instantly to your store wallet or returned to your original payment method in 3–5 business days.',
      highlights: ['7-day return window', 'Instant wallet refunds', 'Free doorstep return pickup']
    },
    warranty: {
      title: 'Warranty & Protection',
      answer: 'All branded products include a **minimum 1-year official manufacturer warranty** covering hardware and manufacturing defects. Your order invoice acts as the valid warranty proof.',
      highlights: ['1-year official warranty', 'Digital invoice acts as warranty proof', 'Brand authorized service center support']
    },
    shipping: {
      title: 'Delivery Speeds & Shipping',
      answer: 'We provide **Free Standard Delivery** on orders ₹999 and above (arrives in 3–5 business days). For urgent needs, choose **⚡ Priority Express Delivery** at checkout for delivery within 24–48 hours.',
      highlights: ['Free standard delivery on ₹999+', '3–5 business days standard', '⚡ 24–48h express delivery option']
    },
    payments: {
      title: 'Accepted Payment Methods',
      answer: 'We support **UPI** (Google Pay, PhonePe, Paytm), **Credit & Debit Cards** (Visa, Mastercard, RuPay), **Store Wallet** with 1-click checkout, and **Cash on Delivery (COD)** on eligible pin codes.',
      highlights: ['100% secure 256-bit encrypted checkout', 'Store Wallet balance', 'UPI, Cards, and Cash on Delivery']
    },
    coupons: {
      title: 'Coupons & Discounts',
      answer: 'Darwin automatically calculates and applies the highest-saving active coupon for you with **⚡ Smart Buy**! You can also view available coupons in the Coupons sidepanel or enter promo codes during review.',
      highlights: ['Auto-applied Smart Buy discounts', 'Storewide seasonal promotions', 'Bank offers and wallet cashbacks']
    }
  };

  let matchedCategory = 'returns';
  if (/(?:return|refund|exchange|money\s*back)/i.test(cleanTopic)) matchedCategory = 'returns';
  else if (/(?:warranty|guarantee|repair|broken|defect)/i.test(cleanTopic)) matchedCategory = 'warranty';
  else if (/(?:delivery|ship|when.*arrive|tracking|transit|fast)/i.test(cleanTopic)) matchedCategory = 'shipping';
  else if (/(?:payment|upi|card|cod|wallet|pay)/i.test(cleanTopic)) matchedCategory = 'payments';
  else if (/(?:coupon|discount|promo|deal|offer)/i.test(cleanTopic)) matchedCategory = 'coupons';

  const base = QA_RESPONSES[matchedCategory] || QA_RESPONSES.returns;

  return {
    ...base,
    productPolicy: specificPolicy
  };
}

// 34. Personalized Recommendations Tool
async function getPersonalizedRecommendations(args = {}, customer = {}) {
  const recService = require('./recommendation.service');
  const custId = customer?._id || customer?.id || args.customerId;
  if (args.maxPrice) {
    const items = await recService.getBudgetRecommendations(args.maxPrice, args.limit || 6);
    return { title: `Budget Picks under ₹${args.maxPrice}`, products: items.map(formatProduct) };
  }
  const items = await recService.getRecommendedForYou(custId, args.limit || 6);
  return { title: 'Personalized Recommendations for You', products: items.map(formatProduct) };
}

// 35. Customer Loyalty & Rewards Tool
async function getLoyaltyRewardsBalance(args = {}, customer = {}) {
  const rewardsService = require('./rewards.service');
  const custId = customer?._id || customer?.id || args.customerId;
  return rewardsService.getCustomerRewards(custId);
}

// 36. Query Product Questions & Answers Tool
async function queryProductQA(args = {}) {
  const qaService = require('./product-qa.service');
  const { productId, query = '' } = args;
  if (!productId) return { questions: [] };
  return qaService.getQAByProduct(productId, { q: query, sort: 'helpful' });
}

module.exports = {
  searchProducts,
  getProductDetails,
  getAvailableCategories,
  getTrendingProducts,
  getTopRatedProducts,
  compareProducts,
  getSimilarProducts,
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getCustomerOrders,
  trackOrder,
  addCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
  getDefaultAddress,
  parseIndianAddress,
  getPaymentMethods,
  getDefaultPaymentMethod,
  getDarwinSettings,
  saveDarwinSettings,
  getCustomerProfile,
  updateCustomerProfile,
  prepareCheckoutSummary,
  calculateSmartBuyDeal,
  attachSmartBuyDealsToProducts,
  searchProductsByPriceAndRating,
  getComplementaryProducts,
  getShoppingQA,
  getPersonalizedRecommendations,
  getLoyaltyRewardsBalance,
  queryProductQA,
  formatProduct
};

