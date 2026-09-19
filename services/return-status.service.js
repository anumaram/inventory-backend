const Return = require('../models/return.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const notificationService = require('./notification.service');
const { createTransaction } = require('./transaction.service');
const { createVendorTransaction } = require('./vendor-transaction.service');

// Returns: 6 steps divided across 24 hours (1 day)
const RETURN_TIMELINE_STEPS = [
  { status: 'requested', hours: 0, label: 'Return Requested', note: 'Return request submitted by customer.' },
  { status: 'pickup_confirmed', hours: 4, label: 'Pickup Confirmed', note: 'Courier partner assigned and pickup scheduled.' },
  { status: 'item_received', hours: 8, label: 'Item Received at Center', note: 'Product received at inspection warehouse.' },
  { status: 'quality_passed', hours: 14, label: 'Quality Check Passed', note: 'Item inspected and verified by quality team.' },
  { status: 'refund_initiated', hours: 19, label: 'Refund Initiated', note: 'Refund transaction processed by payment gateway.' },
  { status: 'refund_credited', hours: 24, label: 'Refund Credited', note: 'Refund amount credited to customer wallet.' }
];

// Cancellations: 4 steps divided across 24 hours (1 day)
const CANCELLATION_TIMELINE_STEPS = [
  { status: 'requested', hours: 0, label: 'Cancellation Confirmed', note: 'Order cancellation confirmed.' },
  { status: 'inventory_restored', hours: 6, label: 'Merchant Notified & Stock Restored', note: 'Shipment halted and warehouse inventory restored.' },
  { status: 'refund_initiated', hours: 14, label: 'Refund Initiated', note: 'Refund transaction processed.' },
  { status: 'refund_credited', hours: 24, label: 'Refund Credited', note: 'Refund amount credited to customer wallet.' }
];

function getStepsForType(type) {
  return type === 'cancellation' ? CANCELLATION_TIMELINE_STEPS : RETURN_TIMELINE_STEPS;
}

function getTargetStep(steps, elapsedMs) {
  let matchedIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    const stepMs = steps[i].hours * 60 * 60 * 1000;
    if (elapsedMs >= stepMs) {
      matchedIndex = i;
    }
  }
  return { step: steps[matchedIndex], index: matchedIndex };
}

async function synchronizeReturnStatuses() {
  const now = new Date();
  try {
    const activeRecords = await Return.find({
      isDeleted: { $ne: true },
      status: { $nin: ['refund_credited', 'completed', 'rejected', 'cancelled'] }
    });

    let updatedCount = 0;

    for (const record of activeRecords) {
      const type = record.type === 'cancellation' ? 'cancellation' : 'return';
      const steps = getStepsForType(type);
      const requestedAt = record.requestedAt || record.createdAt || now;
      const elapsedMs = Math.max(0, now.getTime() - new Date(requestedAt).getTime());

      const { step: targetStep, index: targetIndex } = getTargetStep(steps, elapsedMs);

      // Find current step index in steps array
      let currentIndex = steps.findIndex((s) => s.status === record.status);
      if (currentIndex === -1) currentIndex = 0;

      if (targetIndex > currentIndex) {
        // Build updated timeline with all steps up to targetIndex
        const existingTimeline = Array.isArray(record.timeline) ? [...record.timeline] : [];
        const existingStatuses = new Set(existingTimeline.map((t) => t.status));

        for (let i = 0; i <= targetIndex; i++) {
          const stepObj = steps[i];
          if (!existingStatuses.has(stepObj.status)) {
            const stepTime = new Date(new Date(requestedAt).getTime() + stepObj.hours * 60 * 60 * 1000);
            existingTimeline.push({
              status: stepObj.status,
              timestamp: stepTime > now ? now : stepTime,
              note: stepObj.note,
              updatedBy: 'system'
            });
          }
        }

        // Sort timeline by timestamp ascending
        existingTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const isFinalRefund = targetStep.status === 'refund_credited';
        const updateFields = {
          status: targetStep.status,
          timeline: existingTimeline,
          processedAt: now
        };

        // If returned item passes quality check or reaches completion, restore inventory stock if not already restored
        const reachesStockRestoreStep =
          (type === 'return' && ['quality_passed', 'refund_initiated', 'refund_credited', 'completed'].includes(targetStep.status)) ||
          (type === 'cancellation' && ['inventory_restored', 'refund_initiated', 'refund_credited', 'completed'].includes(targetStep.status));

        if (reachesStockRestoreStep && !record.isStockRestored) {
          try {
            for (const it of (record.items || [])) {
              const pId = it.productId?._id || it.productId;
              if (pId) {
                await Product.updateOne({ _id: pId }, { $inc: { quantity: Number(it.qty || 1) } });
              }
            }
            updateFields.isStockRestored = true;
          } catch (stockErr) {
            console.error('[ReturnStatusScheduler] Error restoring product inventory stock:', stockErr.message);
          }
        }

        if (isFinalRefund) {
          updateFields.refundStatus = 'credited';
          // Sync parent Order status
          if (record.orderRef) {
            try {
              const orderUpdate = type === 'return'
                ? { status: 'returned', returnStatus: 'refund_credited', refundStatus: 'credited' }
                : { status: 'cancelled', refundStatus: 'credited' };
              await Order.updateOne({ _id: record.orderRef }, { $set: orderUpdate });
            } catch (ordErr) {
              console.error('[ReturnStatusScheduler] Order sync error:', ordErr.message);
            }
          }
          // If refundAmount > 0 and customer has wallet, ensure wallet credit
          if (record.refundAmount > 0 && record.customerId) {
            try {
              const customer = await Customer.findById(record.customerId);
              if (customer) {
                customer.wallet = customer.wallet || { balance: 0, transactions: [] };
                // Check if already credited in wallet transactions
                const alreadyCredited = (customer.wallet.transactions || []).some(
                  (tx) => tx.referenceId === record.returnId || tx.referenceId === String(record._id)
                );
                if (!alreadyCredited) {
                  customer.wallet.balance = (customer.wallet.balance || 0) + Number(record.refundAmount);
                  customer.wallet.transactions = customer.wallet.transactions || [];
                  customer.wallet.transactions.push({
                    type: 'credit',
                    amount: Number(record.refundAmount),
                    description: `Refund for Order #${record.orderId} (${type === 'cancellation' ? 'Cancelled' : 'Returned'})`,
                    referenceId: record.returnId || String(record._id),
                    createdAt: now
                  });
                  await customer.save();
                  await createTransaction({
                    customerId: record.customerId,
                    type: 'refund',
                    amount: Number(record.refundAmount),
                    direction: 'credit',
                    status: 'processed',
                    orderId: record.orderRef,
                    orderDisplayId: record.orderId || '',
                    description: `Refund for Order #${record.orderId || String(record.orderRef).slice(-10).toUpperCase()} (auto-processed)`,
                    paymentMethod: 'wallet',
                    meta: { automated: true, returnType: type || 'return' }
                  });

                  if (record.vendorId && Number(record.refundAmount) > 0) {
                    await createVendorTransaction({
                      vendorId: record.vendorId,
                      type: 'refund_deduction',
                      amount: Number(record.refundAmount),
                      direction: 'debit',
                      status: 'completed',
                      orderId: record.orderRef,
                      orderDisplayId: record.orderId || '',
                      customerId: record.customerId,
                      customerName: customer.name || 'Customer',
                      commission: 0,
                      netAmount: Number(record.refundAmount),
                      description: `Refund deduction for ${type === 'cancellation' ? 'cancelled' : 'returned'} Order #${record.orderId || String(record.orderRef).slice(-10).toUpperCase()} (auto-processed)`,
                      meta: { automated: true, returnType: type || 'return', returnId: record.returnId || String(record._id) }
                    });
                  }
                  if (customer.email) {
                    const emailService = require('./email.service');
                    await emailService.sendReturnRefundCreditedEmail({
                      order: { orderId: record.orderId, _id: record.orderRef },
                      customer,
                      refundAmount: Number(record.refundAmount),
                      refundMethod: 'wallet',
                      returnRecord: record
                    });
                  }
                }
              }
            } catch (walletErr) {
              console.error('[ReturnStatusScheduler] Wallet credit error:', walletErr.message);
            }
          }
        } else if (targetStep.status === 'refund_initiated') {
          updateFields.refundStatus = 'pending';
        }

        await Return.updateOne({ _id: record._id }, { $set: updateFields });

        // Trigger Notification to Customer
        try {
          const title = `${type === 'cancellation' ? 'Cancellation' : 'Return'} Update: ${targetStep.label}`;
          const message = `Status for Order #${record.orderId}: ${targetStep.note}`;
          await notificationService.createNotification({
            recipientType: 'customer',
            recipientId: record.customerId,
            title,
            message,
            type: `${type}_${targetStep.status}`,
            orderId: record.orderId,
            actionUrl: '/customer/orders'
          });
        } catch (notifErr) {
          console.error('[ReturnStatusScheduler] Notification error:', notifErr.message);
        }

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[ReturnStatusScheduler] Synchronized ${updatedCount} return/cancellation statuses.`);
    }
  } catch (err) {
    console.error('[ReturnStatusScheduler] Error synchronizing return statuses:', err.message);
  }
}

function startReturnStatusScheduler() {
  synchronizeReturnStatuses().catch((err) => console.error('[ReturnStatusScheduler] Initial sync failed:', err.message));
  // Run check every 15 minutes
  const interval = setInterval(() => {
    synchronizeReturnStatuses().catch((err) => console.error('[ReturnStatusScheduler] Interval sync failed:', err.message));
  }, 15 * 60 * 1000);
  interval.unref?.();
  return interval;
}

module.exports = {
  synchronizeReturnStatuses,
  startReturnStatusScheduler,
  RETURN_TIMELINE_STEPS,
  CANCELLATION_TIMELINE_STEPS
};

