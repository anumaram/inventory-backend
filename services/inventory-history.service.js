const mongoose = require('mongoose');
const InventoryHistory = require('../models/inventory-history.model');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

/**
 * Log an inventory audit event
 */
exports.logInventoryEvent = async ({
  productId,
  vendorId,
  type,
  quantityChange = 0,
  stockBefore = 0,
  stockAfter = 0,
  referenceId = '',
  reason = '',
  actor = 'Vendor',
  metadata = {},
  createdAt = new Date()
}) => {
  try {
    if (!productId || !vendorId || !type) return null;

    const record = await InventoryHistory.create({
      productId: toObjectId(productId),
      vendorId: toObjectId(vendorId),
      type,
      quantityChange: Number(quantityChange),
      stockBefore: Number(stockBefore),
      stockAfter: Number(stockAfter),
      referenceId: String(referenceId || ''),
      reason: String(reason || ''),
      actor: String(actor || 'Vendor'),
      metadata: metadata || {},
      createdAt
    });

    return record;
  } catch (err) {
    console.error('Failed to log inventory history event:', err);
    return null;
  }
};

/**
 * Fetch product inventory audit history
 */
exports.getProductHistory = async (productId, vendorId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid product ID');
  }

  const query = { productId: toObjectId(productId) };

  const records = await InventoryHistory.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Compute summary stats
  let totalAdded = 0;
  let totalSold = 0;
  let totalAdjusted = 0;

  records.forEach((r) => {
    if (r.type === 'PRODUCT_CREATED' || (r.type === 'STOCK_ADJUSTMENT' && r.quantityChange > 0)) {
      totalAdded += Number(r.quantityChange || 0);
    } else if (r.type === 'ORDER_PLACED') {
      totalSold += Math.abs(Number(r.quantityChange || 0));
    } else if (r.type === 'STOCK_ADJUSTMENT' && r.quantityChange < 0) {
      totalAdjusted += Math.abs(Number(r.quantityChange || 0));
    }
  });

  return {
    items: records,
    totalRecords: records.length,
    summary: {
      totalAdded,
      totalSold,
      totalAdjusted,
      currentStock: records.length > 0 ? records[0].stockAfter : 0
    }
  };
};


