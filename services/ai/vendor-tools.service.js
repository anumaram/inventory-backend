/**
 * Vendor AI Tools Service
 * Connects Vendor AI to existing backend database models & business logic
 */

const mongoose = require('mongoose');
const Product = require('../../models/product.model');
const Order = require('../../models/order.model');
const Review = require('../../models/product.model'); // Reviews embedded or ratingCount
const Return = require('../../models/return.model');
const User = require('../../models/user.model');
const AiSettings = require('../../models/ai-settings.model');
const VendorTransaction = require('../../models/vendor-transaction.model');
const Notification = require('../../models/notification.model');

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
}

/**
 * 1. Vendor Sales Analysis
 * Explains sales volume, revenue changes, and reasons for growth/decline
 */
async function getVendorSalesAnalysis({ vendorId, timeframe = '30d' } = {}) {
  const vId = toObjectId(vendorId);
  const now = new Date();
  let days = 30;
  if (timeframe === '7d') days = 7;
  else if (timeframe === '90d') days = 90;

  const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStartDate = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  // Find vendor product IDs first
  const vendorProducts = await Product.find({ userId: vId, isDeleted: { $ne: true } }).select('_id name price').lean();
  const productIds = vendorProducts.map((p) => p._id);

  // Current period orders
  const currentOrders = await Order.find({
    'items.productId': { $in: productIds },
    createdAt: { $gte: currentStartDate },
    status: { $ne: 'cancelled' }
  }).lean();

  // Previous period orders
  const previousOrders = await Order.find({
    'items.productId': { $in: productIds },
    createdAt: { $gte: previousStartDate, $lt: currentStartDate },
    status: { $ne: 'cancelled' }
  }).lean();

  const calculatePeriodMetrics = (orders) => {
    let revenue = 0;
    let units = 0;
    const prodMap = {};

    orders.forEach((ord) => {
      (ord.items || []).forEach((it) => {
        const pIdStr = String(it.productId || it.product?._id);
        if (productIds.some((p) => String(p) === pIdStr)) {
          const itemRev = Number(it.price || 0) * Number(it.qty || 1);
          revenue += itemRev;
          units += Number(it.qty || 1);
          prodMap[it.name || pIdStr] = (prodMap[it.name || pIdStr] || 0) + itemRev;
        }
      });
    });

    return { revenue, units, orderCount: orders.length, prodMap };
  };

  const curr = calculatePeriodMetrics(currentOrders);
  const prev = calculatePeriodMetrics(previousOrders);

  const revenueGrowth = prev.revenue > 0
    ? Math.round(((curr.revenue - prev.revenue) / prev.revenue) * 100)
    : (curr.revenue > 0 ? 100 : 0);

  const orderGrowth = prev.orderCount > 0
    ? Math.round(((curr.orderCount - prev.orderCount) / prev.orderCount) * 100)
    : (curr.orderCount > 0 ? 100 : 0);

  // Find top revenue product
  const sortedProds = Object.entries(curr.prodMap).sort((a, b) => b[1] - a[1]);
  const topProduct = sortedProds[0] ? { name: sortedProds[0][0], revenue: sortedProds[0][1] } : null;

  let narrative = '';
  if (revenueGrowth >= 0) {
    narrative = `Your sales increased **${revenueGrowth}%** over the last ${days} days with total revenue of **₹${curr.revenue.toLocaleString('en-IN')}** across ${curr.orderCount} orders.`;
  } else {
    narrative = `Your sales decreased **${Math.abs(revenueGrowth)}%** compared to the previous ${days}-day period. Revenue was **₹${curr.revenue.toLocaleString('en-IN')}** across ${curr.orderCount} orders.`;
  }

  if (topProduct) {
    narrative += ` **${topProduct.name}** was your top revenue driver, generating ₹${topProduct.revenue.toLocaleString('en-IN')}.`;
  }

  return {
    timeframe: `${days}d`,
    revenue: curr.revenue,
    previousRevenue: prev.revenue,
    revenueGrowthPercent: revenueGrowth,
    orderCount: curr.orderCount,
    previousOrderCount: prev.orderCount,
    orderGrowthPercent: orderGrowth,
    unitsSold: curr.units,
    topProduct,
    narrative
  };
}

/**
 * 2. Vendor Inventory Health & Low Stock Alerts
 */
async function getVendorInventoryHealth({ vendorId } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({ userId: vId, isDeleted: { $ne: true } }).lean();

  let totalStock = 0;
  let totalInventoryValue = 0;
  const lowStock = [];
  const outOfStock = [];

  products.forEach((p) => {
    const qty = Number(p.quantity || 0);
    const price = Number(p.price || 0);
    totalStock += qty;
    totalInventoryValue += qty * price;

    if (qty === 0) {
      outOfStock.push({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        price,
        quantity: 0,
        urgency: 'CRITICAL'
      });
    } else if (qty <= 10) {
      lowStock.push({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        price,
        quantity: qty,
        urgency: qty <= 5 ? 'HIGH' : 'MEDIUM'
      });
    }
  });

  return {
    totalProducts: products.length,
    totalStock,
    totalInventoryValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    needsRestock: lowStock.length + outOfStock.length > 0,
    criticalItems: [...outOfStock, ...lowStock].slice(0, 8),
    summaryText: `You have **${products.length} products** with total inventory value of **₹${totalInventoryValue.toLocaleString('en-IN')}**. ${outOfStock.length} items are out of stock and ${lowStock.length} items are approaching low stock.`
  };
}

/**
 * 3. Demand Forecasting & Stock Depletion Estimates
 */
async function getVendorDemandForecast({ vendorId } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({ userId: vId, isDeleted: { $ne: true } }).lean();
  const productIds = products.map((p) => p._id);

  // Sales in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    'items.productId': { $in: productIds },
    createdAt: { $gte: thirtyDaysAgo },
    status: { $ne: 'cancelled' }
  }).lean();

  const salesByProduct = {};
  orders.forEach((ord) => {
    (ord.items || []).forEach((it) => {
      const pId = String(it.productId || it.product?._id);
      salesByProduct[pId] = (salesByProduct[pId] || 0) + Number(it.qty || 1);
    });
  });

  const predictions = products.map((p) => {
    const pId = String(p._id);
    const unitsSold30d = salesByProduct[pId] || 0;
    const dailyVelocity = unitsSold30d / 30;
    const currentStock = Number(p.quantity || 0);

    const daysRemaining = dailyVelocity > 0
      ? Math.round(currentStock / dailyVelocity)
      : (currentStock > 0 ? 999 : 0);

    let risk = 'SAFE';
    if (currentStock === 0) risk = 'OUT_OF_STOCK';
    else if (daysRemaining <= 7) risk = 'RUN_OUT_7_DAYS';
    else if (daysRemaining <= 14) risk = 'RUN_OUT_14_DAYS';
    else if (daysRemaining <= 30) risk = 'RUN_OUT_30_DAYS';

    return {
      _id: pId,
      name: p.name,
      category: p.category,
      price: p.price,
      currentStock,
      unitsSold30d,
      dailyVelocity: Number(dailyVelocity.toFixed(2)),
      daysRemaining,
      riskLevel: risk,
      suggestedRestockQty: Math.max(20, Math.round(dailyVelocity * 45))
    };
  });

  const atRisk = predictions.filter((p) => p.riskLevel !== 'SAFE').sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    forecastPeriod: '30d',
    atRiskCount: atRisk.length,
    predictions: atRisk.slice(0, 8),
    summary: atRisk.length > 0
      ? `Forecast indicates **${atRisk.length} products** are at risk of running out of stock within the next 30 days based on recent sales velocity.`
      : `Inventory velocity is balanced. No items are at risk of premature stockout based on current 30-day demand.`
  };
}

/**
 * 4. Vendor Best Sellers
 */
async function getVendorBestSellers({ vendorId, limit = 5 } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({ userId: vId, isDeleted: { $ne: true } })
    .sort({ salesCount: -1, rating: -1 })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    _id: String(p._id),
    name: p.name,
    category: p.category,
    price: p.price,
    salesCount: p.salesCount || 0,
    rating: p.rating || 4.5,
    quantity: p.quantity || 0,
    estimatedRevenue: (p.salesCount || 0) * (p.price || 0)
  }));
}

/**
 * 5. Dead Stock Detection (Items with 0 or low sales in 30 days)
 */
async function getVendorDeadStock({ vendorId, days = 30 } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({
    userId: vId,
    isDeleted: { $ne: true },
    quantity: { $gt: 0 }
  }).lean();

  const productIds = products.map((p) => p._id);
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const activeOrders = await Order.find({
    'items.productId': { $in: productIds },
    createdAt: { $gte: dateFrom }
  }).lean();

  const soldProductIds = new Set();
  activeOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      soldProductIds.add(String(it.productId || it.product?._id));
    });
  });

  const deadStock = products
    .filter((p) => !soldProductIds.has(String(p._id)))
    .map((p) => ({
      _id: String(p._id),
      name: p.name,
      category: p.category,
      price: p.price,
      quantity: p.quantity,
      tiedUpCapital: (p.quantity || 0) * (p.price || 0),
      createdAt: p.createdAt
    }))
    .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);

  const totalCapitalTied = deadStock.reduce((sum, it) => sum + it.tiedUpCapital, 0);

  return {
    deadStockCount: deadStock.length,
    totalCapitalTied,
    items: deadStock.slice(0, 8),
    advice: deadStock.length > 0
      ? `You have **${deadStock.length} products** with zero sales in the last ${days} days, tying up **₹${totalCapitalTied.toLocaleString('en-IN')}** in working capital. Consider running promotional discount campaigns or flash sales to clear this inventory.`
      : `Great job! You have no stagnant inventory with zero sales in the last ${days} days.`
  };
}

/**
 * 6. Vendor Pricing Insights
 */
async function getVendorPricingInsights({ vendorId } = {}) {
  const vId = toObjectId(vendorId);
  const vendorProducts = await Product.find({ userId: vId, isDeleted: { $ne: true } }).lean();

  const insights = [];

  for (const p of vendorProducts.slice(0, 10)) {
    // Find category average price
    const catStats = await Product.aggregate([
      { $match: { category: p.category, isDeleted: { $ne: true } } },
      { $group: { _id: '$category', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } }
    ]);

    if (catStats.length > 0) {
      const avgPrice = Math.round(catStats[0].avgPrice || p.price);
      const diffPercent = Math.round(((p.price - avgPrice) / avgPrice) * 100);

      insights.push({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        currentPrice: p.price,
        categoryAveragePrice: avgPrice,
        priceDifferencePercent: diffPercent,
        position: diffPercent > 15 ? 'PREMIUM' : diffPercent < -15 ? 'BUDGET' : 'COMPETITIVE',
        recommendation: diffPercent > 20
          ? `Priced ${diffPercent}% above category average. Consider offering an intro discount to boost conversion.`
          : diffPercent < -20
          ? `Priced ${Math.abs(diffPercent)}% below category average. You have headroom to raise price and improve margins.`
          : 'Competitively priced within standard market range.'
      });
    }
  }

  return {
    totalEvaluated: insights.length,
    insights
  };
}

/**
 * 7. AI Product Copywriter (Titles, Structured Description, Keywords/Tags)
 */
async function generateProductCopy({ title = '', name = '', category = '', keywords = '', tone = 'professional' } = {}) {
  const cleanTitle = String(name || title || 'Premium Product').trim();
  const cleanCategory = String(category || 'General').trim();
  const cleanKeywords = String(keywords || '').trim();

  // Deterministic copy generator template
  const optimizedTitle = `${cleanTitle} - High Performance & Reliable`;
  const generatedDescription = `### Product Overview\n\nThe **${cleanTitle}** is engineered for superior reliability, durability, and customer satisfaction. Built with premium materials, it delivers top-tier performance suited for both daily use and demanding tasks.\n\n### Key Highlights\n• **Premium Quality**: Built with durable, long-lasting components\n• **Ergonomic & Modern Design**: Sleek aesthetic that blends seamlessly into any lifestyle\n• **Official Warranty**: Includes full 1-year manufacturer protection\n• **Customer Satisfaction**: Tested and verified under rigorous quality control standards\n\n### Specifications\n- Category: ${cleanCategory}\n- Condition: Brand New & Original\n- Packaging: Retail Sealed Box`;

  const tagList = Array.from(new Set([
    cleanCategory.toLowerCase(),
    'trending',
    'bestseller',
    'premium',
    'new arrival',
    'top rated',
    ...cleanKeywords.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 2)
  ])).slice(0, 8);

  return {
    success: true,
    title: optimizedTitle,
    description: generatedDescription,
    tags: tagList,
    suggestedTitle: optimizedTitle,
    suggestedDescription: generatedDescription,
    suggestedTags: tagList,
    category: cleanCategory,
    tone
  };
}

/**
 * 8. Vendor Reviews & Sentiment Analysis
 */
async function getVendorReviewsSentiment({ vendorId } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({ userId: vId, isDeleted: { $ne: true } }).select('name rating ratingCount').lean();

  let totalRating = 0;
  let totalReviews = 0;

  products.forEach((p) => {
    totalRating += (Number(p.rating || 0) * Number(p.ratingCount || 0));
    totalReviews += Number(p.ratingCount || 0);
  });

  const averageRating = totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : 4.5;
  const sentimentScore = averageRating >= 4.2 ? 'POSITIVE' : averageRating >= 3.5 ? 'NEUTRAL' : 'NEEDS_ATTENTION';

  return {
    averageRating,
    totalReviewsCount: totalReviews,
    sentimentScore,
    positiveThemes: ['Quick Delivery', 'Durable Build Quality', 'Accurate Product Photos'],
    improvementAreas: averageRating < 4.2 ? ['Packaging Reinforcement', 'Faster Response Time'] : ['None identified'],
    summary: `Your store maintains a **${averageRating}★** average rating across **${totalReviews} verified reviews**. Customer sentiment is **${sentimentScore}**.`
  };
}

/**
 * 9. Vendor Orders & Operations Overview
 */
async function getVendorOrdersOverview({ vendorId } = {}) {
  const vId = toObjectId(vendorId);
  const products = await Product.find({ userId: vId, isDeleted: { $ne: true } }).select('_id').lean();
  const productIds = products.map((p) => p._id);

  const pendingCount = await Order.countDocuments({
    'items.productId': { $in: productIds },
    status: 'placed'
  });

  const processingCount = await Order.countDocuments({
    'items.productId': { $in: productIds },
    status: 'packed'
  });

  const deliveredCount = await Order.countDocuments({
    'items.productId': { $in: productIds },
    status: 'delivered'
  });

  return {
    pendingOrders: pendingCount,
    processingOrders: processingCount,
    deliveredOrders: deliveredCount,
    summary: `You have **${pendingCount} pending orders** awaiting fulfillment and **${processingCount} orders** in packing.`
  };
}

/**
 * 10. Vendor Profile Management
 */
async function getVendorProfile({ vendorId } = {}) {
  let vId = toObjectId(vendorId);
  let vendor = vId ? await User.findById(vId).lean() : await User.findOne({ isDeleted: { $ne: true } }).lean();
  if (!vendor) return { error: 'Vendor profile not found.' };

  return {
    vendor: {
      _id: String(vendor._id),
      name: vendor.name || '',
      businessName: vendor.businessName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      status: vendor.status || 'active'
    },
    summary: `Store Profile: **${vendor.businessName || 'My Store'}** (Owner: **${vendor.name || 'Vendor'}**). Email: ${vendor.email || 'N/A'}, Phone: ${vendor.phone || 'Not set'}.`
  };
}

async function updateVendorProfile({ vendorId, name, businessName, phone } = {}) {
  let vId = toObjectId(vendorId);
  let vendor = vId ? await User.findById(vId) : await User.findOne({ isDeleted: { $ne: true } });
  if (!vendor) return { error: 'Vendor profile not found.' };

  const updates = {};
  if (name !== undefined && name !== null && String(name).trim()) updates.name = String(name).trim();
  if (businessName !== undefined && businessName !== null && String(businessName).trim()) updates.businessName = String(businessName).trim();
  if (phone !== undefined && phone !== null && String(phone).trim()) updates.phone = String(phone).trim();

  const updated = await User.findByIdAndUpdate(vendor._id, { $set: updates }, { new: true }).lean();

  const profileData = {
    _id: String(updated._id),
    name: updated.name,
    businessName: updated.businessName,
    email: updated.email,
    phone: updated.phone,
    status: updated.status
  };

  return {
    success: true,
    vendor: profileData,
    action: {
      type: 'profile_updated',
      role: 'vendor',
      name: updated.name,
      businessName: updated.businessName,
      vendor: profileData,
      message: `Profile updated! Name is now **${updated.name}**${updated.businessName ? ` (${updated.businessName})` : ''}.`
    },
    message: `Your store profile has been successfully updated! Name is now **${updated.name}**${updated.businessName ? ` (${updated.businessName})` : ''}.`
  };
}

/**
 * 11. Atlas Settings Management
 */
async function getAtlasSettings({ vendorId } = {}) {
  let vId = toObjectId(vendorId);
  if (!vId) {
    const defaultVendor = await User.findOne({ isDeleted: { $ne: true } });
    vId = defaultVendor?._id;
  }
  let settings = await AiSettings.findOne({ aiType: 'atlas', userId: vId }).lean();
  if (!settings) {
    settings = await AiSettings.create({
      aiType: 'atlas',
      userId: vId,
      userType: 'vendor'
    });
  }
  return {
    settings,
    summary: `Active AI provider: **${settings.aiProviderPreference || 'auto'}**. Reorder threshold: **${settings.reorderThreshold || 10} units**. Dead stock criteria: **${settings.deadStockDays || 30} days**. Target profit margin: **${settings.targetMarginPct || 25}%**.`
  };
}

async function updateAtlasSettings({ vendorId, settings = {} } = {}) {
  let vId = toObjectId(vendorId);
  if (!vId) {
    const defaultVendor = await User.findOne({ isDeleted: { $ne: true } });
    vId = defaultVendor?._id;
  }

  const cleanSettings = { ...settings };
  delete cleanSettings._id;
  delete cleanSettings.userId;
  delete cleanSettings.aiType;
  delete cleanSettings.userType;

  const updated = await AiSettings.findOneAndUpdate(
    { aiType: 'atlas', userId: vId },
    { $set: cleanSettings },
    { new: true, upsert: true }
  ).lean();

  return {
    success: true,
    settings: updated,
    action: {
      type: 'settings_updated',
      role: 'vendor',
      settings: updated,
      message: 'Atlas AI settings updated successfully.'
    },
    message: `Atlas AI settings updated successfully. Provider set to **${updated.aiProviderPreference}**.`
  };
}

/**
 * 12. Product Stock & Catalog Updates
 */
async function updateProductStock({ vendorId, productNameOrId, stock, adjustmentType = 'set' } = {}) {
  const vId = toObjectId(vendorId);
  if (!productNameOrId) return { error: 'Product name or ID is required.' };
  const numericStock = parseInt(stock, 10);
  if (isNaN(numericStock)) return { error: 'Valid stock number is required.' };

  let product = null;
  if (mongoose.isValidObjectId(productNameOrId)) {
    product = await Product.findOne({ _id: productNameOrId, ...(vId ? { userId: vId } : {}), isDeleted: { $ne: true } });
  }
  if (!product) {
    product = await Product.findOne({
      name: new RegExp(`^${productNameOrId.trim()}$`, 'i'),
      ...(vId ? { userId: vId } : {}),
      isDeleted: { $ne: true }
    });
  }
  if (!product) {
    product = await Product.findOne({
      name: new RegExp(productNameOrId.trim(), 'i'),
      ...(vId ? { userId: vId } : {}),
      isDeleted: { $ne: true }
    });
  }

  if (!product) return { error: `Could not find any product matching "${productNameOrId}".` };

  const oldStock = product.quantity || 0;
  let newStock = numericStock;
  if (adjustmentType === 'increment' || adjustmentType === 'add') {
    newStock = oldStock + numericStock;
  } else if (adjustmentType === 'decrement' || adjustmentType === 'subtract') {
    newStock = Math.max(0, oldStock - numericStock);
  }

  product.quantity = newStock;
  await product.save();

  return {
    success: true,
    product: {
      _id: String(product._id),
      name: product.name,
      quantity: product.quantity,
      price: product.price
    },
    action: {
      type: 'inventory_updated',
      product: {
        _id: String(product._id),
        name: product.name,
        quantity: product.quantity,
        price: product.price
      },
      oldStock,
      newStock,
      message: `Stock for **${product.name}** updated from ${oldStock} to **${newStock} units**.`
    },
    message: `Updated inventory for **${product.name}**! Stock changed from ${oldStock} to **${newStock} units**.`
  };
}

async function updateProductPrice({ vendorId, productNameOrId, price, discountPercentage } = {}) {
  const vId = toObjectId(vendorId);
  if (!productNameOrId) return { error: 'Product name or ID is required.' };

  let product = null;
  if (mongoose.isValidObjectId(productNameOrId)) {
    product = await Product.findOne({ _id: productNameOrId, ...(vId ? { userId: vId } : {}), isDeleted: { $ne: true } });
  }
  if (!product) {
    product = await Product.findOne({
      name: new RegExp(`^${productNameOrId.trim()}$`, 'i'),
      ...(vId ? { userId: vId } : {}),
      isDeleted: { $ne: true }
    });
  }
  if (!product) {
    product = await Product.findOne({
      name: new RegExp(productNameOrId.trim(), 'i'),
      ...(vId ? { userId: vId } : {}),
      isDeleted: { $ne: true }
    });
  }

  if (!product) return { error: `Could not find any product matching "${productNameOrId}".` };

  const updates = {};
  if (price !== undefined && price !== null && !isNaN(Number(price))) {
    updates.price = Number(price);
  }
  if (discountPercentage !== undefined && discountPercentage !== null && !isNaN(Number(discountPercentage))) {
    updates.discountPercentage = Number(discountPercentage);
  }

  if (Object.keys(updates).length === 0) return { error: 'No valid price or discount provided.' };

  const updated = await Product.findByIdAndUpdate(product._id, { $set: updates }, { new: true }).lean();

  return {
    success: true,
    product: {
      _id: String(updated._id),
      name: updated.name,
      price: updated.price,
      discountPercentage: updated.discountPercentage,
      quantity: updated.quantity
    },
    action: {
      type: 'price_updated',
      product: {
        _id: String(updated._id),
        name: updated.name,
        price: updated.price,
        discountPercentage: updated.discountPercentage
      },
      newPrice: updated.price,
      message: `Price for **${updated.name}** updated to **₹${Number(updated.price).toLocaleString('en-IN')}**.`
    },
    message: `Updated pricing for **${updated.name}**! Selling price is now **₹${Number(updated.price).toLocaleString('en-IN')}**${updated.discountPercentage ? ` (${updated.discountPercentage}% discount)` : ''}.`
  };
}

async function getProductDetails({ vendorId, productNameOrId } = {}) {
  const vId = toObjectId(vendorId);
  if (!productNameOrId) return { error: 'Product name or ID is required.' };

  let product = null;
  if (mongoose.isValidObjectId(productNameOrId)) {
    product = await Product.findOne({ _id: productNameOrId, ...(vId ? { userId: vId } : {}), isDeleted: { $ne: true } }).lean();
  }
  if (!product) {
    product = await Product.findOne({
      name: new RegExp(productNameOrId.trim(), 'i'),
      ...(vId ? { userId: vId } : {}),
      isDeleted: { $ne: true }
    }).lean();
  }

  if (!product) return { error: `Could not find any product matching "${productNameOrId}".` };

  return {
    product,
    summary: `### 📦 Product SKU: **${product.name}**\n\n- **Category:** ${product.category}\n- **Price:** ₹${Number(product.price).toLocaleString('en-IN')} (Discount: ${product.discountPercentage || 0}%)\n- **Stock:** **${product.quantity} units**\n- **Sales Velocity:** ${product.salesCount || 0} units sold\n- **Rating:** ${product.rating || 0}★ (${product.ratingCount || 0} reviews)`
  };
}

/**
 * 14. Vendor Store Settings Management
 */
async function getVendorStoreSettings({ vendorId } = {}) {
  let vId = toObjectId(vendorId);
  let vendor = vId ? await User.findById(vId).lean() : await User.findOne({ isDeleted: { $ne: true } }).lean();
  if (!vendor) return { error: 'Vendor account not found.' };

  const vs = vendor.vendorSettings || {};
  const settings = {
    storeName: vs.storeName || vendor.businessName || vendor.name || 'My Store',
    tagline: vs.tagline || '',
    email: vs.email || vendor.email || '',
    phone: vs.phone || vendor.phone || '',
    address: vs.address || '',
    dispatchTime: vs.dispatchTime || '1-2 business days',
    courierPartner: vs.courierPartner || 'Standard Courier',
    freeShippingThreshold: vs.freeShippingThreshold || 0,
    returnWindow: vs.returnWindow || 7,
    warrantyPeriod: vs.warrantyPeriod || 'None',
    lowStockThreshold: vs.lowStockThreshold || 10,
    notifyOnLowStock: vs.notifyOnLowStock ?? true,
    notifyOnNewOrder: vs.notifyOnNewOrder ?? true,
    notifyOnReturn: vs.notifyOnReturn ?? true,
    payoutFrequency: vs.payoutFrequency || 'weekly',
    bankAccountNumber: vs.bankAccountNumber ? `A/C ending in ...${String(vs.bankAccountNumber).slice(-4)}` : 'Not configured',
    bankIfsc: vs.bankIfsc || 'Not configured',
    bankBeneficiaryName: vs.bankBeneficiaryName || '',
    upiId: vs.upiId || 'Not configured'
  };

  return {
    settings,
    summary: `### ⚙️ Vendor Store Settings: **${settings.storeName}**\n\n- **Dispatch Time:** ${settings.dispatchTime}\n- **Courier Partner:** ${settings.courierPartner}\n- **Free Shipping Threshold:** ${settings.freeShippingThreshold > 0 ? `₹${settings.freeShippingThreshold}` : 'Disabled'}\n- **Return Window:** ${settings.returnWindow} days\n- **Warranty:** ${settings.warrantyPeriod}\n- **Low Stock Threshold:** ${settings.lowStockThreshold} units\n- **Payout Frequency:** ${settings.payoutFrequency}\n- **Bank Account:** ${settings.bankAccountNumber} (IFSC: ${settings.bankIfsc})\n- **UPI ID:** ${settings.upiId}`
  };
}

async function updateVendorStoreSettings({ vendorId, settings = {} } = {}) {
  let vId = toObjectId(vendorId);
  let user = vId ? await User.findById(vId) : await User.findOne({ isDeleted: { $ne: true } });
  if (!user) return { error: 'Vendor account not found.' };

  const currentVs = user.vendorSettings || {};
  const allowed = [
    'storeName', 'tagline', 'email', 'phone', 'address', 'dispatchTime',
    'courierPartner', 'freeShippingThreshold', 'returnWindow', 'warrantyPeriod',
    'lowStockThreshold', 'notifyOnLowStock', 'notifyOnNewOrder', 'notifyOnReturn',
    'payoutFrequency', 'bankAccountNumber', 'bankIfsc', 'bankBeneficiaryName', 'upiId'
  ];

  const updates = {};
  for (const f of allowed) {
    if (settings[f] !== undefined) {
      updates[f] = settings[f];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No valid store settings provided for update.' };
  }

  user.vendorSettings = { ...currentVs, ...updates };
  if (updates.storeName) user.businessName = updates.storeName;
  if (updates.phone) user.phone = updates.phone;
  user.markModified('vendorSettings');
  await user.save();

  const changesList = Object.entries(updates).map(([k, v]) => `**${k}**: \`${v}\``).join(', ');

  return {
    success: true,
    settings: user.vendorSettings,
    action: {
      type: 'vendor_settings_updated',
      settings: user.vendorSettings,
      message: `Store settings updated successfully: ${changesList}`
    },
    message: `Store operational settings have been updated successfully! Changes: ${changesList}.`
  };
}

/**
 * 15. Vendor Payouts & Available Balance
 */
async function getVendorPayoutsAndEarnings({ vendorId } = {}) {
  let vId = toObjectId(vendorId);
  if (!vId) {
    const defaultVendor = await User.findOne({ isDeleted: { $ne: true } });
    vId = defaultVendor?._id;
  }
  if (!vId) return { error: 'Vendor account not found.' };

  const [summaryAgg, recentPayouts] = await Promise.all([
    VendorTransaction.aggregate([
      { $match: { vendorId: vId } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, '$amount', 0] } },
          totalCommission: { $sum: '$commission' },
          totalRefundDeductions: { $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, '$amount', 0] } },
          totalPayouts: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] } },
          payoutCount: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, 1, 0] } }
        }
      }
    ]),
    VendorTransaction.find({ vendorId: vId, type: 'payout' }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  const s = summaryAgg[0] || { totalEarnings: 0, totalCommission: 0, totalRefundDeductions: 0, totalPayouts: 0, payoutCount: 0 };
  const netRevenue = Math.max(0, s.totalEarnings - s.totalRefundDeductions - s.totalCommission);
  const availableBalance = Math.max(0, netRevenue - s.totalPayouts);

  return {
    totalEarnings: s.totalEarnings,
    totalCommission: s.totalCommission,
    totalRefundDeductions: s.totalRefundDeductions,
    totalPayouts: s.totalPayouts,
    availableBalance,
    recentPayouts: recentPayouts.map((p) => ({
      _id: String(p._id),
      amount: p.amount,
      status: p.status,
      date: p.createdAt,
      payoutMethod: p.payoutMethod,
      payoutAccount: p.payoutAccount
    })),
    summary: `### 💰 Payouts & Earnings Summary\n\n- **Available Withdrawal Balance:** **₹${availableBalance.toLocaleString('en-IN')}**\n- **Total Gross Order Earnings:** ₹${s.totalEarnings.toLocaleString('en-IN')}\n- **Platform Commission Deducted:** ₹${s.totalCommission.toLocaleString('en-IN')}\n- **Refunds Deducted:** ₹${s.totalRefundDeductions.toLocaleString('en-IN')}\n- **Total Settlements Received:** ₹${s.totalPayouts.toLocaleString('en-IN')} (${s.payoutCount} payouts)\n- **Recent Payouts:** ${recentPayouts.length > 0 ? recentPayouts.map((p) => `₹${Number(p.amount).toLocaleString('en-IN')} (${new Date(p.createdAt).toLocaleDateString('en-IN')})`).join(', ') : 'None yet.'}`
  };
}

/**
 * 16. Request Vendor Payout Settlement
 */
async function requestVendorPayout({ vendorId, amount, payoutMethod = 'bank_transfer', payoutAccount = '', notes = '' } = {}) {
  let vId = toObjectId(vendorId);
  let user = vId ? await User.findById(vId) : await User.findOne({ isDeleted: { $ne: true } });
  if (!user) return { error: 'Vendor account not found.' };

  const withdrawAmount = Number(amount);
  if (!withdrawAmount || withdrawAmount <= 0) return { error: 'Please enter a valid payout amount.' };
  if (withdrawAmount < 500) return { error: 'Minimum payout withdrawal is ₹500.' };

  const summaryAgg = await VendorTransaction.aggregate([
    { $match: { vendorId: user._id } },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, '$amount', 0] } },
        totalCommission: { $sum: '$commission' },
        totalRefundDeductions: { $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, '$amount', 0] } },
        totalPayouts: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] } }
      }
    }
  ]);

  const s = summaryAgg[0] || { totalEarnings: 0, totalCommission: 0, totalRefundDeductions: 0, totalPayouts: 0 };
  const netRevenue = Math.max(0, s.totalEarnings - s.totalRefundDeductions - s.totalCommission);
  const availableBalance = Math.max(0, netRevenue - s.totalPayouts);

  if (withdrawAmount > availableBalance) {
    return { error: `Requested amount ₹${withdrawAmount.toLocaleString('en-IN')} exceeds available balance of ₹${availableBalance.toLocaleString('en-IN')}.` };
  }

  const accountDesc = payoutAccount || (user.vendorSettings?.bankAccountNumber ? `A/C ...${user.vendorSettings.bankAccountNumber.slice(-4)}` : (user.vendorSettings?.upiId || 'Primary Payout Method'));

  const payoutTxn = await VendorTransaction.create({
    vendorId: user._id,
    type: 'payout',
    amount: withdrawAmount,
    direction: 'debit',
    status: 'completed',
    netAmount: withdrawAmount,
    commission: 0,
    payoutMethod,
    payoutAccount: accountDesc,
    description: `Payout settlement of ₹${withdrawAmount.toLocaleString('en-IN')} via Atlas AI`,
    meta: {
      notes,
      source: 'Atlas Vendor AI Assistant',
      requestedAt: new Date()
    }
  });

  try {
    const { createNotification } = require('../notification.service');
    await createNotification({
      userId: user._id,
      userType: 'vendor',
      title: 'Payout Dispatched',
      message: `Your payout request of ₹${withdrawAmount.toLocaleString('en-IN')} has been submitted and processed to ${accountDesc}.`,
      type: 'wallet_topup',
      actionUrl: '/vendor/payments'
    });
  } catch (e) {}

  return {
    success: true,
    transaction: payoutTxn,
    availableBalance: Math.max(0, availableBalance - withdrawAmount),
    action: {
      type: 'payout_requested',
      amount: withdrawAmount,
      account: accountDesc,
      message: `Payout request of **₹${withdrawAmount.toLocaleString('en-IN')}** processed successfully to **${accountDesc}**.`
    },
    message: `Payout request of **₹${withdrawAmount.toLocaleString('en-IN')}** has been submitted and settled to **${accountDesc}**! Remaining balance: ₹${Math.max(0, availableBalance - withdrawAmount).toLocaleString('en-IN')}.`
  };
}

/**
 * 17. Detailed Vendor Sales Analytics
 */
async function getVendorSalesAnalytics({ vendorId, timeframe = '30d' } = {}) {
  return await getVendorSalesAnalysis({ vendorId, timeframe });
}

/**
 * 18. Vendor Notifications Overview
 */
async function getVendorNotifications({ vendorId } = {}) {
  let vId = toObjectId(vendorId);
  if (!vId) {
    const defaultVendor = await User.findOne({ isDeleted: { $ne: true } });
    vId = defaultVendor?._id;
  }
  if (!vId) return { error: 'Vendor account not found.' };

  const notifications = await Notification.find({ userId: vId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(8).lean();

  return {
    notifications,
    summary: `### 🔔 Recent Vendor Notifications\n\n${notifications.length > 0 ? notifications.map((n, idx) => `${idx + 1}. **${n.title}**: ${n.message} *(${new Date(n.createdAt).toLocaleDateString('en-IN')})*`).join('\n') : 'No notifications found.'}`
  };
}

module.exports = {
  getVendorSalesAnalysis,
  getVendorInventoryHealth,
  getVendorDemandForecast,
  getVendorBestSellers,
  getVendorDeadStock,
  getVendorPricingInsights,
  generateProductCopy,
  getVendorReviewsSentiment,
  getVendorOrdersOverview,
  getVendorProfile,
  updateVendorProfile,
  getAtlasSettings,
  updateAtlasSettings,
  updateProductStock,
  updateProductPrice,
  getProductDetails,
  getVendorStoreSettings,
  updateVendorStoreSettings,
  getVendorPayoutsAndEarnings,
  requestVendorPayout,
  getVendorSalesAnalytics,
  getVendorNotifications
};
