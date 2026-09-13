const mongoose = require('mongoose');
require('./db');

const Return = require('./models/return.model');
const Order = require('./models/order.model');

async function migrateReturns() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    console.log('--- Starting Returns & Cancellations Collection Migration ---');

    // Find all orders that have return or cancellation or refund information
    const orders = await Order.find({
      $or: [
        { status: 'cancelled' },
        { status: 'returned' },
        { status: 'return_requested' },
        { returnStatus: { $exists: true, $ne: 'none' } },
        { refundAmount: { $gt: 0 } },
        { refundStatus: { $exists: true, $ne: 'none' } }
      ]
    }).lean();

    console.log(`Found ${orders.length} candidate orders for Returns collection.`);

    let inserted = 0;
    for (const order of orders) {
      const orderId = order.orderId || String(order._id).slice(-8).toUpperCase();
      const hasReturn = (order.returnStatus && order.returnStatus !== 'none') || order.status === 'returned' || order.status === 'return_requested';
      const isCancelled = order.status === 'cancelled';

      const type = hasReturn ? 'return' : isCancelled ? 'cancellation' : 'refund';
      const status = hasReturn
        ? (order.returnStatus === 'approved' ? 'approved' : order.returnStatus === 'rejected' ? 'rejected' : 'requested')
        : isCancelled
        ? 'cancelled'
        : (order.refundStatus === 'credited' ? 'refund_credited' : 'refund_pending');

      const reason = order.returnReason || order.cancellationReason || (type === 'refund' ? 'Wallet Refund' : 'Customer Request');
      const comments = order.returnComments || '';

      const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items.map((it) => ({
            productId: it.productId?._id || it.productId,
            vendorId: it.vendorId?._id || it.vendorId || order.vendorId,
            name: it.name || 'Product',
            vendorName: it.vendorName || 'Vendor',
            image: it.image || null,
            qty: it.qty || 1,
            price: it.price || 0
          }))
        : [
            {
              productId: order.productId?._id || order.productId,
              vendorId: order.vendorId?._id || order.vendorId,
              name: 'Product Item',
              vendorName: 'Vendor',
              image: null,
              qty: order.qty || 1,
              price: order.price || 0
            }
          ];

      const refundAmount = Number(order.refundAmount || 0) > 0 ? Number(order.refundAmount) : Number(order.totalAmount || 0);

      const existing = await Return.findOne({ orderRef: order._id, type });
      if (!existing) {
        await Return.create({
          orderRef: order._id,
          orderId,
          customerId: order.customerId,
          vendorId: order.vendorId,
          type,
          status,
          reason,
          comments,
          items,
          refundAmount,
          refundMethod: order.paymentMethod || 'wallet',
          refundStatus: order.refundStatus || (order.paymentMethod === 'cod' ? 'none' : 'credited'),
          requestedAt: order.returnRequestedAt || order.cancelledAt || order.createdAt || new Date(),
          timeline: [
            {
              status,
              timestamp: order.returnRequestedAt || order.cancelledAt || order.createdAt || new Date(),
              note: `${type.toUpperCase()} recorded from order history. Reason: ${reason}`,
              updatedBy: order.cancelledBy || 'customer'
            }
          ]
        });
        inserted++;
      }
    }

    console.log(`Successfully migrated/inserted ${inserted} documents into 'returns' collection.`);
    const totalReturns = await Return.countDocuments();
    console.log(`Total documents currently in 'returns' collection: ${totalReturns}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateReturns();
