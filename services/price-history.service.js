const PriceHistory = require('../models/price-history.model');
const PriceAlert = require('../models/price-alert.model');
const Product = require('../models/product.model');

// Helper to generate simulated 1-year historical prices if none exist
function generateRealisticPriceHistory(currentPrice) {
  const records = [];
  const now = new Date();
  const base = Number(currentPrice) || 2499;

  let min = base;
  let max = base;
  let minDate = now;
  let maxDate = now;

  // 12 monthly points
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, Math.min(now.getDate(), 28));
    // fluctuate between -15% and +20%
    const factor = i === 0 ? 1 : (1 + (Math.sin(i * 1.3) * 0.12) + ((i % 3 === 0 ? 0.08 : -0.05)));
    const price = Math.round((base * factor) / 10) * 10;

    records.push({ price, date: d });

    if (price < min) {
      min = price;
      minDate = d;
    }
    if (price > max) {
      max = price;
      maxDate = d;
    }
  }

  const sum = records.reduce((acc, r) => acc + r.price, 0);
  const avg = Math.round(sum / records.length);

  return {
    records,
    lowestPrice: min,
    lowestDate: minDate,
    highestPrice: max,
    highestDate: maxDate,
    averagePrice: avg
  };
}

// 1. Get price history for a product
exports.getPriceHistory = async (req, res) => {
  const { productId } = req.params;
  const { range = '1Y' } = req.query; // '1M', '3M', '6M', '1Y', 'All'

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  let history = await PriceHistory.findOne({ productId });
  if (!history || !history.records || history.records.length === 0) {
    const generated = generateRealisticPriceHistory(product.price);
    history = await PriceHistory.create({
      productId,
      currentPrice: product.price,
      originalPrice: product.originalPrice || Math.round(product.price * 1.2),
      lowestPrice: generated.lowestPrice,
      lowestDate: generated.lowestDate,
      highestPrice: generated.highestPrice,
      highestDate: generated.highestDate,
      averagePrice: generated.averagePrice,
      records: generated.records
    });
  }

  // Filter records based on requested range
  const now = new Date();
  let cutoff = new Date(now);
  if (range === '1M') cutoff.setMonth(now.getMonth() - 1);
  else if (range === '3M') cutoff.setMonth(now.getMonth() - 3);
  else if (range === '6M') cutoff.setMonth(now.getMonth() - 6);
  else if (range === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
  else cutoff = new Date(0); // All

  const filteredRecords = (history.records || []).filter(r => new Date(r.date) >= cutoff);

  // Check if customer has an active alert
  let userAlert = null;
  const customerId = req.customerId || req.query.customerId;
  if (customerId) {
    userAlert = await PriceAlert.findOne({ customerId, productId, isActive: true });
  }

  // Calculate percentage drop from highest
  const priceDropPct = history.highestPrice > product.price
    ? Math.round(((history.highestPrice - product.price) / history.highestPrice) * 100)
    : 0;

  res.json({
    product: {
      _id: product._id,
      name: product.name,
      category: product.category,
      price: product.price,
      originalPrice: history.originalPrice || product.price,
      discountPercentage: product.discountPercentage,
      image: product.image || (product.images && product.images[0]) || '',
      rating: product.rating || 4.5,
      ratingCount: product.ratingCount || 1500
    },
    currentPrice: product.price,
    lowestPrice: history.lowestPrice,
    lowestDate: history.lowestDate,
    highestPrice: history.highestPrice,
    highestDate: history.highestDate,
    averagePrice: history.averagePrice,
    priceDropPercentage: priceDropPct,
    records: filteredRecords.length > 0 ? filteredRecords : history.records,
    userAlert: userAlert ? { targetPrice: userAlert.targetPrice, isActive: userAlert.isActive } : null
  });
};

// 2. Set Price Drop Alert
exports.setPriceAlert = async (req, res) => {
  const customerId = req.customerId || req.body.customerId;
  const { productId, targetPrice } = req.body;

  if (!customerId || !productId || !targetPrice) {
    return res.status(400).json({ msg: 'customerId, productId, and targetPrice are required' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  const alert = await PriceAlert.findOneAndUpdate(
    { customerId, productId },
    {
      $set: {
        targetPrice: Number(targetPrice),
        currentPriceAtSet: product.price,
        isActive: true,
        triggered: false
      }
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: `Price drop alert set! You will be notified when price reaches ₹${Number(targetPrice).toLocaleString('en-IN')}.`,
    alert
  });
};

