const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Wishlist = require('../models/wishlist.model');
const mongoose = require('mongoose');

function toObjectId(val) {
  return mongoose.Types.ObjectId.isValid(val) ? new mongoose.Types.ObjectId(val) : val;
}

function calculateSellingPrice(price, discountPercentage = 10) {
  const orig = Number(price || 0);
  const disc = Number(discountPercentage ?? 10);
  return Math.round(orig * (1 - disc / 100));
}

/**
 * 1. Recommended For You (Multi-signal customer scoring engine)
 * Evaluates past purchases, wishlist, cart intent, brand affinity, and review confidence
 */
async function getRecommendedForYou(customerId = null, optionsOrLimit = 8) {
  const options = typeof optionsOrLimit === 'number'
    ? { limit: optionsOrLimit, page: 1 }
    : (optionsOrLimit || {});

  const limit = Math.max(1, parseInt(options.limit, 10) || 8);
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const selectedCategory = options.category && options.category !== 'All' ? options.category : null;
  const sortBy = options.sortBy || 'match_desc';
  const searchQuery = (options.search || '').trim().toLowerCase();

  const categoryWeights = {};
  const brandWeights = {};
  const excludedProductIds = new Set();
  let hasPersonalizedData = false;

  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    const cId = toObjectId(customerId);

    // 1. Past Orders (strong long-term preference)
    try {
      const pastOrders = await Order.find({ customerId: cId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('items.productId')
        .lean();

      pastOrders.forEach((o) => {
        (o.items || []).forEach((item) => {
          const p = item.productId;
          if (p) {
            excludedProductIds.add(String(p._id || p));
            if (p.category) {
              categoryWeights[p.category] = (categoryWeights[p.category] || 0) + 3;
              hasPersonalizedData = true;
            }
            if (p.brand) {
              brandWeights[p.brand] = (brandWeights[p.brand] || 0) + 2;
            }
          }
        });
      });
    } catch (e) {
      console.error('Error loading past orders for recommendation:', e.message);
    }

    // 2. Wishlist (explicit medium-term desires)
    try {
      const wishlistDocs = await Wishlist.find({ customerId: cId, isDeleted: { $ne: true } })
        .populate('productId')
        .lean();

      wishlistDocs.forEach((w) => {
        const p = w.productId;
        if (p) {
          excludedProductIds.add(String(p._id || p));
          const cat = p.category || w.category;
          if (cat) {
            categoryWeights[cat] = (categoryWeights[cat] || 0) + 4;
            hasPersonalizedData = true;
          }
          if (p.brand) {
            brandWeights[p.brand] = (brandWeights[p.brand] || 0) + 2.5;
          }
        }
      });
    } catch (e) {
      console.error('Error loading wishlist for recommendation:', e.message);
    }

    // 3. Cart Items (high immediate purchase intent)
    try {
      const cartDocs = await Cart.find({ customerId: cId, isDeleted: { $ne: true } })
        .populate('productId')
        .lean();

      cartDocs.forEach((c) => {
        const p = c.productId;
        if (p) {
          excludedProductIds.add(String(p._id || p));
          if (p.category) {
            categoryWeights[p.category] = (categoryWeights[p.category] || 0) + 5;
            hasPersonalizedData = true;
          }
          if (p.brand) {
            brandWeights[p.brand] = (brandWeights[p.brand] || 0) + 3;
          }
        }
      });
    } catch (e) {
      console.error('Error loading cart for recommendation:', e.message);
    }
  }

  // Find top customer category
  const sortedCategories = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;

  // Build DB query
  const query = {
    isDeleted: { $ne: true },
    quantity: { $gt: 0 }
  };

  if (selectedCategory) {
    query.category = { $regex: new RegExp(`^${selectedCategory.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') };
  }

  if (searchQuery) {
    query.$or = [
      { name: { $regex: searchQuery, $options: 'i' } },
      { brand: { $regex: searchQuery, $options: 'i' } },
      { category: { $regex: searchQuery, $options: 'i' } }
    ];
  }

  if (options.minPrice || options.maxPrice) {
    query.price = {};
    if (options.minPrice) query.price.$gte = Number(options.minPrice);
    if (options.maxPrice) query.price.$lte = Number(options.maxPrice);
  }

  // Fetch candidate pool and count
  const [candidatePool, totalCount] = await Promise.all([
    Product.find(query)
      .sort({ rating: -1, salesCount: -1 })
      .limit(120)
      .lean(),
    Product.countDocuments(query)
  ]);

  // Distinct categories available in catalog for filtering tabs
  const distinctCategories = await Product.distinct('category', { isDeleted: { $ne: true }, quantity: { $gt: 0 } });
  const cleanedCategories = ['All', ...distinctCategories.filter(Boolean)];

  // Multi-Signal Scoring Function
  const scoredProducts = candidatePool.map((p) => {
    const isExcluded = excludedProductIds.has(String(p._id));
    const sellingPrice = calculateSellingPrice(p.price, p.discountPercentage);
    const cat = p.category || 'General';
    const brand = p.brand || '';
    const rating = Number(p.rating || 4.2);
    const ratingCount = Number(p.ratingCount || 10);
    const discount = Number(p.discountPercentage || 10);
    const salesCount = Number(p.salesCount || 5);

    // 1. Category Affinity (20 to 35 pts)
    let catScore = 20; // baseline
    if (categoryWeights[cat]) {
      catScore = Math.min(35, 24 + categoryWeights[cat] * 3);
    } else if (!hasPersonalizedData && ['Electronics', 'Fashion', 'Groceries', 'Home & Kitchen Appliances', 'Audio'].includes(cat)) {
      catScore = 28; // popular baseline for guests
    }

    // 2. Brand Affinity (6 to 15 pts)
    let brandScore = 8;
    if (brand && brandWeights[brand]) {
      brandScore = Math.min(15, 10 + brandWeights[brand] * 2.5);
    } else if (['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'Puma', 'Logitech', 'Sennheiser', 'HP', 'Sonos', 'Tata', 'Prestige'].some((b) => brand.toLowerCase().includes(b.toLowerCase()))) {
      brandScore = 13; // popular flagship brand boost
    }

    // 3. Rating & Review Confidence (15 to 25 pts)
    const ratingNorm = (rating / 5.0) * 18;
    const reviewBoost = Math.min(7, Math.log10(Math.max(1, ratingCount)) * 2);
    const ratingScore = Math.min(25, ratingNorm + reviewBoost);

    // 4. Sales Velocity / Popularity (6 to 14 pts)
    const velocityScore = Math.min(14, Math.log10(Math.max(1, salesCount + 1)) * 3.5 + 5);

    // 5. Value / Discount Attractiveness (5 to 12 pts)
    const valueScore = Math.min(12, (Math.min(50, discount) / 50) * 7 + 5);

    // Exclusion penalty: if already in cart/orders, reduce score slightly so fresh items rank higher
    const exclusionPenalty = isExcluded ? 15 : 0;

    const rawScore = catScore + brandScore + ratingScore + velocityScore + valueScore - exclusionPenalty;
    const matchScore = Math.min(99, Math.max(75, Math.round(rawScore)));

    // Generate Contextual Recommendation Reason
    let recommendationReason = `Curated pick • ${matchScore}% affinity match`;
    if (categoryWeights[cat] && categoryWeights[cat] >= 5) {
      recommendationReason = `Top match for your interest in ${cat}`;
    } else if (brand && brandWeights[brand]) {
      recommendationReason = `Popular from ${brand}, a brand you love`;
    } else if (rating >= 4.8 && ratingCount >= 10) {
      recommendationReason = `Community favorite • ${rating.toFixed(1)}★ (${ratingCount}+ reviews)`;
    } else if (discount >= 15) {
      recommendationReason = `Trending value pick • ${discount}% OFF today`;
    } else if (topCategory && cat === topCategory) {
      recommendationReason = `Selected for your interest in ${topCategory}`;
    } else if (salesCount >= 50) {
      recommendationReason = `Bestseller with high customer satisfaction`;
    }

    return {
      ...p,
      sellingPrice,
      matchScore,
      recommendationReason,
      recommendationCategory: cat
    };
  });

  // Sort candidate pool
  scoredProducts.sort((a, b) => {
    if (sortBy === 'rating_desc') {
      return (b.rating || 0) - (a.rating || 0) || b.matchScore - a.matchScore;
    }
    if (sortBy === 'price_asc') {
      return a.sellingPrice - b.sellingPrice;
    }
    if (sortBy === 'price_desc') {
      return b.sellingPrice - a.sellingPrice;
    }
    if (sortBy === 'discount_desc') {
      return (b.discountPercentage || 0) - (a.discountPercentage || 0);
    }
    // Default: Best Match Score descending
    return b.matchScore - a.matchScore;
  });

  // Pagination
  const total = typeof totalCount === 'number' ? totalCount : scoredProducts.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedItems = scoredProducts.slice((page - 1) * limit, page * limit);

  return {
    items: paginatedItems,
    total,
    page,
    totalPages,
    categories: cleanedCategories,
    userSignals: {
      topCategory,
      hasPersonalizedData,
      totalSignals: Object.keys(categoryWeights).length + Object.keys(brandWeights).length
    }
  };
}

/**
 * 2. Because You Viewed [Product] -> Competitors & Upgrades
 * (e.g. iPhone 15 -> iPhone 16, Samsung Galaxy S25, Google Pixel 9)
 */
async function getBecauseYouViewed(productId, limit = 4) {
  const currentProduct = await Product.findById(productId).lean();
  if (!currentProduct) return [];

  const nameLower = (currentProduct.name || '').toLowerCase();
  const category = currentProduct.category || 'Electronics';

  // Specific high-profile alternative rules for realistic tech demo
  let query = {
    _id: { $ne: currentProduct._id },
    isDeleted: { $ne: true },
    quantity: { $gt: 0 }
  };

  if (nameLower.includes('iphone 15') || nameLower.includes('phone') || category.toLowerCase().includes('electronic')) {
    // Find smartphones and flagship electronics
    query.category = { $regex: /electronic|phone|mobile/i };
  } else {
    query.category = category;
  }

  let alternatives = await Product.find(query)
    .sort({ rating: -1, price: -1 })
    .limit(limit)
    .lean();

  // If fewer than limit, relax category filter
  if (alternatives.length < limit) {
    const extra = await Product.find({
      _id: { $nin: [currentProduct._id, ...alternatives.map((a) => a._id)] },
      isDeleted: { $ne: true },
      quantity: { $gt: 0 }
    })
      .sort({ salesCount: -1, rating: -1 })
      .limit(limit - alternatives.length)
      .lean();
    alternatives = [...alternatives, ...extra];
  }

  return alternatives.map((p) => {
    let reason = 'Direct competitor alternative';
    if (Number(p.price) > Number(currentProduct.price)) {
      reason = 'Higher performance tier upgrade';
    } else if (Number(p.price) < Number(currentProduct.price)) {
      reason = 'High-value budget alternative';
    }
    return {
      ...p,
      sellingPrice: calculateSellingPrice(p.price, p.discountPercentage),
      recommendationReason: reason
    };
  });
}

/**
 * 3. Frequently Bought Together Bundle
 * (Main Product + Accessory 1 + Accessory 2 with bundle savings)
 */
async function getFrequentlyBoughtTogether(productId) {
  const mainProduct = await Product.findById(productId).lean();
  if (!mainProduct) return null;

  const mainSellingPrice = calculateSellingPrice(mainProduct.price, mainProduct.discountPercentage);
  const nameLower = (mainProduct.name || '').toLowerCase();
  const catLower = (mainProduct.category || '').toLowerCase();

  let bundleAccessories = [];

  if (nameLower.includes('iphone') || catLower.includes('phone') || catLower.includes('electronic')) {
    // Find phone accessories: chargers, adapters, headphones, cases
    bundleAccessories = await Product.find({
      _id: { $ne: mainProduct._id },
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: /charger|adapter|cable|case|cover|earbuds|headphone/i } },
        { category: { $regex: /accessories|audio|electronic/i } }
      ]
    })
      .limit(2)
      .lean();
  } else if (catLower.includes('fashion') || catLower.includes('cloth') || catLower.includes('apparel')) {
    // Fashion pairings: shoes, belt, bag, eyewear
    bundleAccessories = await Product.find({
      _id: { $ne: mainProduct._id },
      isDeleted: { $ne: true },
      category: { $regex: /footwear|shoe|accessories|fashion/i }
    })
      .limit(2)
      .lean();
  }

  // Fallback to 2 general related products if needed
  if (bundleAccessories.length < 2) {
    const fallback = await Product.find({
      _id: { $nin: [mainProduct._id, ...bundleAccessories.map((b) => b._id)] },
      isDeleted: { $ne: true },
      quantity: { $gt: 0 }
    })
      .limit(2 - bundleAccessories.length)
      .lean();
    bundleAccessories = [...bundleAccessories, ...fallback];
  }

  const accessoryItems = bundleAccessories.map((acc, index) => ({
    ...acc,
    sellingPrice: calculateSellingPrice(acc.price, acc.discountPercentage),
    role: index === 0 ? 'Essential Companion' : 'Recommended Protection'
  }));

  const items = [
    {
      ...mainProduct,
      sellingPrice: mainSellingPrice,
      isMain: true
    },
    ...accessoryItems
  ];

  const totalIndividualPrice = items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
  const bundleDiscountPercent = 10; // Extra 10% off bundle savings
  const bundleSavings = Math.round(totalIndividualPrice * 0.1);
  const bundleTotalPrice = totalIndividualPrice - bundleSavings;

  return {
    mainProduct: items[0],
    bundleItems: items,
    pricing: {
      individualTotal: totalIndividualPrice,
      bundleDiscountPercent,
      bundleSavings,
      bundleTotalPrice
    }
  };
}

/**
 * 4. Complete the Look (Fashion Pairings for 3D Avatar & Cart)
 */
async function getCompleteTheLook(productId) {
  const currentProduct = await Product.findById(productId).lean();
  if (!currentProduct) return null;

  const isFashion = (currentProduct.category && /fashion|cloth|apparel|footwear|accessories/i.test(currentProduct.category)) ||
                    currentProduct.clothingType ||
                    currentProduct.avatarCompatible;

  if (!isFashion) return null;

  // Find complementary outfit pieces (Bottomwear, Footwear, Accessories)
  const complementaries = await Product.find({
    _id: { $ne: currentProduct._id },
    isDeleted: { $ne: true },
    $or: [
      { category: { $regex: /fashion|apparel|footwear|accessories/i } },
      { avatarCompatible: true }
    ]
  })
    .limit(3)
    .lean();

  const outfitPieces = [
    {
      ...currentProduct,
      role: currentProduct.clothingType || 'Main Outfit Item',
      sellingPrice: calculateSellingPrice(currentProduct.price, currentProduct.discountPercentage)
    },
    ...complementaries.map((p, idx) => ({
      ...p,
      role: p.clothingType || (idx === 0 ? 'Bottomwear' : idx === 1 ? 'Footwear' : 'Accessory'),
      sellingPrice: calculateSellingPrice(p.price, p.discountPercentage)
    }))
  ];

  const totalOutfitPrice = outfitPieces.reduce((sum, p) => sum + p.sellingPrice, 0);

  return {
    title: `Complete the Look for ${currentProduct.name}`,
    outfitPieces,
    totalOutfitPrice,
    avatarTryOnReady: true
  };
}

/**
 * 5. Budget Recommendations (Under ₹999, ₹2,499, ₹9,999, ₹29,999)
 */
async function getBudgetRecommendations(maxPrice = 2499, limit = 8) {
  const cap = Number(maxPrice) || 2499;

  const products = await Product.find({
    isDeleted: { $ne: true },
    price: { $lte: cap * 1.25 }, // allow reasonable price before discount
    quantity: { $gt: 0 }
  })
    .sort({ discountPercentage: -1, rating: -1 })
    .limit(limit * 2)
    .lean();

  // Filter by actual selling price <= cap
  const qualified = products
    .map((p) => ({
      ...p,
      sellingPrice: calculateSellingPrice(p.price, p.discountPercentage)
    }))
    .filter((p) => p.sellingPrice <= cap)
    .slice(0, limit);

  return qualified;
}

/**
 * 6. Based on Previous Purchases
 */
async function getPastPurchasesRecommendations(customerId, limit = 6) {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    return getRecommendedForYou(null, limit);
  }

  const cId = toObjectId(customerId);
  const orders = await Order.find({ customerId: cId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const boughtCategories = new Set();
  const boughtProductIds = [];

  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      if (item.productId) boughtProductIds.push(item.productId);
    });
  });

  if (boughtProductIds.length === 0) {
    return getRecommendedForYou(customerId, limit);
  }

  // Find products in same categories or repeat items
  const products = await Product.find({
    _id: { $nin: boughtProductIds },
    isDeleted: { $ne: true },
    quantity: { $gt: 0 }
  })
    .sort({ rating: -1, salesCount: -1 })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    ...p,
    sellingPrice: calculateSellingPrice(p.price, p.discountPercentage),
    recommendationReason: 'Based on your previous orders'
  }));
}

module.exports = {
  getRecommendedForYou,
  getBecauseYouViewed,
  getFrequentlyBoughtTogether,
  getCompleteTheLook,
  getBudgetRecommendations,
  getPastPurchasesRecommendations
};

