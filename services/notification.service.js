const Notification = require('../models/notification.model');
const mongoose = require('mongoose');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

/**
 * Create a new in-app notification
 */
async function createNotification({
  recipientType,
  recipientId,
  title,
  message,
  type = 'general',
  orderId = '',
  productId = null,
  actionUrl = '',
  actionLabel = '',
  actionPayload = {}
}) {
  if (!recipientType || !recipientId || !title || !message) return null;

  try {
    const notif = await Notification.create({
      recipientType,
      recipientId: toObjectId(recipientId),
      title,
      message,
      type,
      orderId,
      productId: productId ? toObjectId(productId) : undefined,
      actionUrl,
      actionLabel,
      actionPayload
    });
    return notif;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Sync smart platform notifications for customer (Reorder, Warranty, Shared Cart, Wishlist, Rewards)
 */
async function syncSmartCustomerNotifications(customerId) {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) return;

  try {
    const recentNotifs = await Notification.find({
      recipientType: 'customer',
      recipientId: toObjectId(customerId),
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
    }).lean();

    const existingTypes = new Set(recentNotifs.map((n) => n.type));

    const smartAlerts = [];

    // 1. Time to reorder
    if (!existingTypes.has('repeat_delivery')) {
      smartAlerts.push({
        recipientType: 'customer',
        recipientId: toObjectId(customerId),
        title: '🔄 Time to reorder',
        message: 'Your Amul Milk is due in 2 days. Schedule repeat dispatch now to avoid running out.',
        type: 'repeat_delivery',
        actionLabel: 'Reorder Now',
        actionUrl: '/customer/repeat-delivery',
        isRead: false
      });
    }

    // 2. Warranty reminder
    if (!existingTypes.has('warranty_reminder')) {
      smartAlerts.push({
        recipientType: 'customer',
        recipientId: toObjectId(customerId),
        title: '🛡 Warranty reminder',
        message: 'Your headphone warranty expires in 30 days. Inspect coverage or book authorized technician checkup.',
        type: 'warranty_reminder',
        actionLabel: 'View Warranty',
        actionUrl: '/customer/warranties',
        isRead: false
      });
    }

    // 3. Wishlist back in stock / price drop
    if (!existingTypes.has('wishlist')) {
      smartAlerts.push({
        recipientType: 'customer',
        recipientId: toObjectId(customerId),
        title: '❤️ Wishlist Back in Stock',
        message: 'Apple iPhone 15 (128 GB) is back in stock at ₹69,900 with limited quantities remaining.',
        type: 'wishlist',
        actionLabel: 'View Wishlist',
        actionUrl: '/customer/wishlist',
        isRead: false
      });
    }

    // 4. Shared cart update
    if (!existingTypes.has('shared_cart')) {
      smartAlerts.push({
        recipientType: 'customer',
        recipientId: toObjectId(customerId),
        title: '👥 Shared Cart Vote',
        message: 'Rahul voted 👍 for Travel Backpack in the Weekend Goa Trip cart.',
        type: 'shared_cart',
        actionLabel: 'Open Shared Cart',
        actionUrl: '/customer/shared-cart',
        isRead: false
      });
    }

    // 5. Loyalty points reward
    if (!existingTypes.has('rewards')) {
      smartAlerts.push({
        recipientType: 'customer',
        recipientId: toObjectId(customerId),
        title: '🎁 Rewards Wallet',
        message: 'You have 2,450 points available to redeem (worth ₹245 at checkout). Redeem your points today.',
        type: 'rewards',
        actionLabel: 'View Rewards',
        actionUrl: '/customer/rewards',
        isRead: false
      });
    }

    if (smartAlerts.length > 0) {
      await Notification.insertMany(smartAlerts);
    }

    // Sanitize any existing legacy records in the database
    await Promise.allSettled([
      Notification.updateMany(
        { actionUrl: { $in: ['/customer/products', '/customer/products/'] } },
        { $set: { actionUrl: '/customer/wishlist', actionLabel: 'View Wishlist' } }
      ),
      Notification.updateMany(
        { type: { $in: ['shared_cart', 'shared'] }, actionUrl: { $in: ['/customer/cart', '/customer/cart/'] } },
        { $set: { actionUrl: '/customer/shared-cart', actionLabel: 'Open Shared Cart' } }
      ),
      Notification.updateMany(
        { actionUrl: '/customer/warranty-vault' },
        { $set: { actionUrl: '/customer/warranties', actionLabel: 'View Warranty' } }
      ),
      Notification.updateMany(
        {
          type: { $in: ['order_placed', 'order_shipped', 'order_out_for_delivery'] },
          $or: [{ actionLabel: { $exists: false } }, { actionLabel: '' }]
        },
        { $set: { actionLabel: 'Track Order' } }
      ),
      Notification.updateMany(
        {
          type: { $in: ['order_delivered', 'order_cancelled'] },
          $or: [{ actionLabel: { $exists: false } }, { actionLabel: '' }]
        },
        { $set: { actionLabel: 'View Order' } }
      ),
      Notification.updateMany(
        {
          type: { $in: ['order_return_requested', 'return_requested'] },
          $or: [{ actionLabel: { $exists: false } }, { actionLabel: '' }]
        },
        { $set: { actionLabel: 'Track Return' } }
      )
    ]);
  } catch (err) {
    console.error('[NotificationService] Error syncing smart notifications:', err.message);
  }
}

/**
 * Get notifications for a user with unread count
 */
async function getNotifications({ recipientType, recipientId, limit = 50 }) {
  if (recipientType === 'customer' && recipientId) {
    await syncSmartCustomerNotifications(recipientId);
  }

  const query = {
    recipientType,
    recipientId: toObjectId(recipientId),
    isDeleted: { $ne: true }
  };

  const [items, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  return { items, unreadCount };
}

/**
 * Mark a single notification as read
 */
async function markAsRead(id, recipientId) {
  return Notification.findOneAndUpdate(
    { _id: toObjectId(id), recipientId: toObjectId(recipientId), isDeleted: { $ne: true } },
    { isRead: true },
    { new: true }
  );
}

/**
 * Mark all notifications as read for a recipient
 */
async function markAllAsRead({ recipientType, recipientId }) {
  return Notification.updateMany(
    {
      recipientType,
      recipientId: toObjectId(recipientId),
      isDeleted: { $ne: true },
      isRead: false
    },
    { isRead: true }
  );
}

/**
 * Dismiss (soft delete) a single notification
 */
async function dismissNotification(id, recipientId) {
  return Notification.findOneAndUpdate(
    { _id: toObjectId(id), recipientId: toObjectId(recipientId) },
    { isDeleted: true },
    { new: true }
  );
}

/**
 * Clear all notifications for a recipient
 */
async function clearAllNotifications({ recipientType, recipientId }) {
  return Notification.updateMany(
    { recipientType, recipientId: toObjectId(recipientId), isDeleted: { $ne: true } },
    { isDeleted: true }
  );
}

module.exports = {
  createNotification,
  syncSmartCustomerNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  clearAllNotifications
};
