const Order = require('../models/order.model');
const emailService = require('./email.service');
const Customer = require('../models/customer.model');

const STATUS_ORDER = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const STATUS_AFTER_MS = [0, 12, 24, 36, 48].map((hours) => hours * 60 * 60 * 1000);

function statusForElapsed(elapsedMs) {
  let index = 0;
  for (let position = 0; position < STATUS_AFTER_MS.length; position += 1) {
    if (elapsedMs >= STATUS_AFTER_MS[position]) index = position;
  }
  return STATUS_ORDER[index];
}

function statusIndex(status) {
  return Math.max(0, STATUS_ORDER.indexOf(status));
}

async function synchronizeOrderStatuses() {
  const now = new Date();
  const orders = await Order.find({ isDeleted: { $ne: true }, status: { $nin: ['delivered', 'cancelled', 'returned'] } })
    .select('_id orderId customerId status placedAt statusTimestamps createdAt');
  let updated = 0;

  for (const order of orders) {
    // Older rows may not have tracking fields. Their creation time is the
    // order-placed time and is persisted during this first synchronization.
    const placedAt = order.placedAt || order.createdAt || now;
    const placedTime = new Date(placedAt).getTime();
    const targetStatus = statusForElapsed(Math.max(0, now.getTime() - placedTime));
    const currentIndex = statusIndex(order.status);
    const targetIndex = statusIndex(targetStatus);

    const nextIndex = Math.max(currentIndex, targetIndex);
    const timestamps = { ...(order.statusTimestamps?.toObject?.() || order.statusTimestamps || {}) };
    timestamps.placed ||= new Date(placedTime);
    for (let index = 1; index <= nextIndex; index += 1) {
      timestamps[STATUS_ORDER[index]] ||= new Date(placedTime + STATUS_AFTER_MS[index]);
    }

    const needsTrackingFields = !order.placedAt || !order.statusTimestamps?.placed;
    if (targetIndex <= currentIndex && !needsTrackingFields) continue;

    const isStatusShift = targetIndex > currentIndex;

    await Order.updateOne(
      { _id: order._id, isDeleted: { $ne: true }, status: { $nin: ['delivered', 'cancelled', 'returned'] } },
      {
        $set: {
          // Never regress: the calculated state is only written if it is ahead.
          status: isStatusShift ? targetStatus : order.status,
          statusUpdatedAt: isStatusShift ? now : order.statusUpdatedAt || now,
          placedAt,
          statusTimestamps: timestamps
        }
      }
    );

    if (isStatusShift && (targetStatus === 'shipped' || targetStatus === 'out_for_delivery' || targetStatus === 'delivered')) {
      // Fetch customer email and notify
      try {
        const notificationService = require('./notification.service');
        const oId = order.orderId || String(order._id).slice(-8).toUpperCase();
        const statusMeta = {
          shipped: { title: 'Order Shipped 🚚', msg: `Your order #${oId} has been handed to courier.` },
          out_for_delivery: { title: 'Out for Delivery 📍', msg: `Your order #${oId} is out for delivery today.` },
          delivered: { title: 'Order Delivered 🎉', msg: `Your order #${oId} has been delivered successfully.` }
        }[targetStatus] || { title: `Order ${targetStatus}`, msg: `Status for #${oId} updated to ${targetStatus}` };

        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: order.customerId,
          title: statusMeta.title,
          message: statusMeta.msg,
          type: `order_${targetStatus}`,
          orderId: oId,
          actionUrl: '/customer/orders'
        }).catch(e => console.error('[OrderStatusService] Notif error:', e.message));

        const customer = await Customer.findById(order.customerId);
        if (customer && (targetStatus === 'shipped' || targetStatus === 'delivered')) {
          emailService.sendOrderStatusUpdateEmail({
            order,
            customer,
            status: targetStatus
          }).catch(e => console.error('[OrderStatusService] Email error:', e.message));
        }
      } catch (err) {
        console.error('[OrderStatusService] Error fetching customer for email/notif:', err.message);
      }
    }

    updated += 1;
  }

  return updated;
}

function startOrderStatusScheduler() {
  synchronizeOrderStatuses().catch((error) => console.error('Initial order status sync failed:', error.message));
  const interval = setInterval(() => {
    synchronizeOrderStatuses().catch((error) => console.error('Scheduled order status sync failed:', error.message));
  }, 60 * 60 * 1000);
  // The scheduler is not a reason to keep a process alive during tests.
  interval.unref?.();
  return interval;
}

module.exports = { synchronizeOrderStatuses, startOrderStatusScheduler, STATUS_ORDER };
