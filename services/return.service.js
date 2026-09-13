const mongoose = require('mongoose');
const Return = require('../models/return.model');
const Order = require('../models/order.model');
const Customer = require('../models/customer.model');

const { synchronizeReturnStatuses } = require('./return-status.service');

const Product = require('../models/product.model');

const toObjectId = (val) => (mongoose.Types.ObjectId.isValid(val) ? new mongoose.Types.ObjectId(val) : val);

/**
 * Record a return, cancellation, or refund entry in the returns collection
 */
exports.createReturnRecord = async ({
  orderRef,
  orderId,
  customerId,
  vendorId,
  type,
  status,
  reason,
  comments = '',
  items = [],
  totalAmount = 0,
  refundAmount = 0,
  refundMethod = 'wallet',
  refundStatus = 'pending',
  isStockRestored = false,
  updatedBy = 'customer'
}) => {
  try {
    let finalTotal = Number(totalAmount || 0);
    let finalRefund = Number(refundAmount || 0);

    const enrichedItems = [];
    for (const it of items) {
      let itName = it.name;
      let itImage = it.image;
      let itPrice = Number(it.price || 0);
      let itQty = Number(it.qty || 1);
      if ((!itName || itName === 'Product' || !itImage || itPrice <= 0) && it.productId) {
        try {
          const prod = await Product.findById(it.productId).select('name image images price').lean();
          if (prod) {
            if (!itName || itName === 'Product') itName = prod.name;
            if (!itImage) itImage = prod.image || (Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null);
            if (itPrice <= 0) itPrice = Number(prod.price || 0);
          }
        } catch (e) {
          console.error('[ReturnService] Error fetching product info:', e.message);
        }
      }
      enrichedItems.push({
        ...it,
        name: itName || 'Product Item',
        image: itImage || null,
        price: itPrice,
        qty: itQty
      });
    }

    if (finalTotal <= 0 && enrichedItems.length > 0) {
      finalTotal = enrichedItems.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0);
    }
    if (finalRefund <= 0) {
      finalRefund = finalTotal;
    }

    const returnRecord = new Return({
      orderRef,
      orderId,
      customerId,
      vendorId,
      type,
      status,
      reason,
      comments,
      items: enrichedItems,
      totalAmount: finalTotal,
      refundAmount: finalRefund,
      refundMethod,
      refundStatus,
      isStockRestored: type === 'cancellation' ? true : isStockRestored,
      requestedAt: new Date(),
      timeline: [
        {
          status,
          timestamp: new Date(),
          note: `${type.toUpperCase()} recorded. Reason: ${reason}`,
          updatedBy
        }
      ]
    });

    await returnRecord.save();
    return returnRecord;
  } catch (err) {
    console.error('[ReturnService] Error creating return record:', err.message);
    return null;
  }
};

/**
 * Get return, cancellation, and refund records
 */
exports.getReturns = async (req, res) => {
  try {
    // Synchronize latest statuses based on elapsed time
    await synchronizeReturnStatuses().catch((e) => console.error('[ReturnService] Sync error:', e.message));

    const filter = { isDeleted: { $ne: true } };

    // Determine user role and ID
    if (req.customerId) {
      filter.customerId = toObjectId(req.customerId);
    } else if (req.userId) {
      filter.vendorId = toObjectId(req.userId);
    }

    const { type, status, orderId } = req.query;
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (orderId) {
      filter.$or = [
        { orderId: orderId },
        { orderRef: toObjectId(orderId) }
      ];
    }

    const records = await Return.find(filter)
      .sort({ createdAt: -1 })
      .populate('orderRef')
      .populate('customerId', 'name email phone')
      .lean();

    // Auto-heal any record with totalAmount <= 0
    for (const rec of records) {
      if (!Number(rec.totalAmount) || Number(rec.totalAmount) <= 0) {
        let calcTotal = 0;
        if (rec.orderRef) {
          calcTotal = Number(rec.orderRef.totalAmount) > 0
            ? Number(rec.orderRef.totalAmount)
            : (Number(rec.orderRef.price || 0) * Number(rec.orderRef.qty || 1));
        }
        if (calcTotal <= 0 && Array.isArray(rec.items)) {
          calcTotal = rec.items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
        }
        if (calcTotal > 0) {
          rec.totalAmount = calcTotal;
          if (!rec.refundAmount || Number(rec.refundAmount) <= 0) {
            rec.refundAmount = calcTotal;
          }
          await Return.updateOne(
            { _id: rec._id },
            { $set: { totalAmount: calcTotal, refundAmount: rec.refundAmount } }
          );
        }
      }
    }

    res.json({
      items: records,
      total: records.length
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch returns' });
  }
};

/**
 * Get single return record
 */
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Return.findOne({
      $or: [{ _id: toObjectId(id) }, { returnId: id }],
      isDeleted: { $ne: true }
    })
      .populate('orderRef')
      .populate('customerId', 'name email phone')
      .lean();

    if (!record) {
      return res.status(404).json({ msg: 'Return record not found' });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch return record' });
  }
};

/**
 * Vendor updates return request status (approve pickup, confirm receipt, pass quality, credit refund, reject)
 */
exports.updateReturnStatusByVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note = '', refundAmount } = req.body || {};

    const returnRecord = await Return.findOne({
      $or: [{ _id: toObjectId(id) }, { returnId: id }],
      isDeleted: { $ne: true }
    }).populate('orderRef');

    if (!returnRecord) {
      return res.status(404).json({ msg: 'Return record not found' });
    }

    const order = returnRecord.orderRef;
    const now = new Date();

    let newStatus = returnRecord.status;
    let timelineNote = note;

    if (action === 'approve_pickup') {
      newStatus = 'pickup_confirmed';
      timelineNote = note || 'Vendor approved return request. Reverse courier pickup scheduled.';
      if (order) {
        order.returnStatus = 'approved';
        await order.save();
      }
    } else if (action === 'confirm_received') {
      newStatus = 'item_received';
      timelineNote = note || 'Item received at merchant hub and logged for quality inspection.';
    } else if (action === 'pass_quality') {
      newStatus = 'quality_passed';
      timelineNote = note || 'Quality check passed. Product verified in original resalable condition.';
      // Restore inventory stock
      if (!returnRecord.isStockRestored && Array.isArray(returnRecord.items)) {
        for (const it of returnRecord.items) {
          if (it.productId) {
            await Product.findByIdAndUpdate(it.productId, {
              $inc: { quantity: Number(it.qty || 1) }
            });
          }
        }
        returnRecord.isStockRestored = true;
      }
    } else if (action === 'credit_refund') {
      newStatus = 'refund_credited';
      returnRecord.refundStatus = 'credited';
      const finalRefundAmt = Number(refundAmount || returnRecord.refundAmount || returnRecord.totalAmount || 0);
      returnRecord.refundAmount = finalRefundAmt;
      timelineNote = note || `Refund of ₹${finalRefundAmt.toLocaleString('en-IN')} credited to customer wallet.`;

      // Restore inventory if not already done
      if (!returnRecord.isStockRestored && Array.isArray(returnRecord.items)) {
        for (const it of returnRecord.items) {
          if (it.productId) {
            await Product.findByIdAndUpdate(it.productId, {
              $inc: { quantity: Number(it.qty || 1) }
            });
          }
        }
        returnRecord.isStockRestored = true;
      }

      // Credit customer wallet
      if (returnRecord.customerId && finalRefundAmt > 0) {
        const customer = await Customer.findById(returnRecord.customerId);
        if (customer) {
          customer.wallet = customer.wallet || { balance: 0 };
          customer.wallet.balance = Number(customer.wallet.balance || 0) + finalRefundAmt;
          customer.wallet.transactions = customer.wallet.transactions || [];
          customer.wallet.transactions.push({
            type: 'credit',
            amount: finalRefundAmt,
            description: `Refund for Order #${returnRecord.orderId} (Return #${returnRecord.returnId || String(returnRecord._id).slice(-8).toUpperCase()})`,
            referenceId: returnRecord.orderId,
            date: now
          });
          await customer.save();
        }
      }

      // Update Order
      if (order) {
        order.returnStatus = 'returned';
        order.status = 'returned';
        order.refundStatus = 'credited';
        order.statusTimestamps = order.statusTimestamps || {};
        order.statusTimestamps.returned = now;
        await order.save();
      }

      // Send customer notification
      try {
        const notificationService = require('./notification.service');
        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: returnRecord.customerId,
          title: 'Refund Credited to Wallet 💰',
          message: `₹${finalRefundAmt.toLocaleString('en-IN')} has been credited to your wallet for Order #${returnRecord.orderId}.`,
          type: 'refund_credited',
          actionUrl: '/customer/settings'
        });
      } catch (e) {
        console.error('[ReturnService] Error sending refund notification:', e.message);
      }
    } else if (action === 'reject') {
      newStatus = 'rejected';
      returnRecord.refundStatus = 'failed';
      timelineNote = note || 'Return request declined by merchant.';
      if (order) {
        order.returnStatus = 'rejected';
        await order.save();
      }

      // Send customer notification
      try {
        const notificationService = require('./notification.service');
        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: returnRecord.customerId,
          title: 'Return Request Declined',
          message: `Your return request for Order #${returnRecord.orderId} was declined by merchant. Reason: ${timelineNote}`,
          type: 'return_rejected',
          actionUrl: '/customer/orders'
        });
      } catch (e) {
        console.error('[ReturnService] Error sending rejection notification:', e.message);
      }
    } else if (action === 'cancel') {
      newStatus = 'cancelled';
      returnRecord.refundStatus = 'none';
      timelineNote = note || 'Return request cancelled by customer.';
      if (order) {
        order.returnStatus = 'cancelled';
        order.refundStatus = 'none';
        await order.save();
      }
    } else {
      return res.status(400).json({ msg: `Unsupported action: ${action}` });
    }

    returnRecord.status = newStatus;
    returnRecord.timeline = returnRecord.timeline || [];
    returnRecord.timeline.push({
      status: newStatus,
      timestamp: now,
      note: timelineNote,
      updatedBy: 'vendor'
    });

    await returnRecord.save();

    res.json({
      msg: 'Return status updated successfully',
      returnRecord
    });
  } catch (err) {
    console.error('[ReturnService] Error in updateReturnStatusByVendor:', err);
    res.status(500).json({ msg: err.message || 'Failed to update return status' });
  }
};
