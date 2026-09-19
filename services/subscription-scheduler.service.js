const Subscription = require('../models/subscription.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { createTransaction } = require('./transaction.service');

/**
 * Executes automatic order creation for any active subscription whose nextDeliveryDate has arrived (<= now).
 */
async function processDueSubscriptions() {
  try {
    const now = new Date();
    // Find active subscriptions that are due for delivery
    const dueSubscriptions = await Subscription.find({
      status: 'active',
      nextDeliveryDate: { $lte: now }
    }).populate('productId');

    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      return { processed: 0 };
    }

    console.log(`[RepeatDelivery Scheduler] Found ${dueSubscriptions.length} due subscription(s) to automatically order.`);

    let processedCount = 0;

    for (const sub of dueSubscriptions) {
      try {
        const product = sub.productId || (await Product.findById(sub.productId));
        if (!product) {
          console.warn(`[RepeatDelivery Scheduler] Product not found for subscription ${sub._id}. Skipping.`);
          continue;
        }

        const customer = await Customer.findById(sub.customerId);
        if (!customer) {
          console.warn(`[RepeatDelivery Scheduler] Customer not found for subscription ${sub._id}. Skipping.`);
          continue;
        }

        const qty = sub.quantity || 1;
        const itemPrice = sub.price || product.price || 0;
        const totalAmount = itemPrice * qty;

        // Resolve vendor
        let vendorId = product.vendorId || product.userId;
        if (!vendorId) {
          const fallbackVendor = await User.findOne({ role: 'vendor' });
          vendorId = fallbackVendor?._id || customer._id;
        }

        // Create Real Order in Database
        const order = await Order.create({
          customerId: customer._id,
          productId: product._id,
          vendorId,
          qty,
          price: itemPrice,
          subtotal: totalAmount,
          deliveryFee: 0,
          totalAmount,
          status: 'placed',
          paymentMethod: sub.paymentMethod || 'wallet',
          deliveryMethod: 'Repeat Subscription Express',
          placedAt: now,
          items: [
            {
              productId: product._id,
              vendorId,
              name: sub.productName || product.name,
              vendorName: product.vendorName || 'Verified Merchant',
              qty,
              price: itemPrice
            }
          ]
        });

        // Record Transaction if wallet was used
        if (createTransaction) {
          try {
            await createTransaction({
              customerId: customer._id,
              type: 'payment',
              amount: totalAmount,
              direction: 'debit',
              status: 'success',
              orderId: order._id,
              orderDisplayId: order.orderId || '',
              description: `Automated Repeat Delivery: ${sub.productName} (Qty: ${qty})`,
              paymentMethod: sub.paymentMethod || 'wallet',
              meta: { subscriptionId: sub._id, isRepeatOrder: true }
            });
          } catch (tErr) {
            console.error('[RepeatDelivery Scheduler] Transaction logging error:', tErr.message);
          }
        }

        // Advance subscription schedule
        const frequencyDays = Number(sub.frequencyDays) || 30;
        const nextDeliveryDate = new Date(now.getTime() + frequencyDays * 24 * 60 * 60 * 1000);

        sub.lastPurchasedDate = now;
        sub.nextDeliveryDate = nextDeliveryDate;
        sub.deliveryCount = (sub.deliveryCount || 0) + 1;
        if (!Array.isArray(sub.history)) sub.history = [];
        sub.history.push({
          orderId: order._id,
          deliveredAt: now,
          amount: totalAmount
        });

        await sub.save();

        // Customer Notification
        try {
          await Notification.create({
            customerId: customer._id,
            title: 'Repeat Order Placed Automatically! 🔄',
            message: `Your scheduled restock order #${order.orderId || String(order._id).slice(-8).toUpperCase()} for ${sub.productName} has been placed. Next repeat delivery is scheduled for ${nextDeliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
            type: 'order',
            link: '/customer/orders'
          });
        } catch (notifErr) {
          console.error('[RepeatDelivery Scheduler] Notification error:', notifErr.message);
        }

        processedCount++;
        console.log(`[RepeatDelivery Scheduler] Successfully placed automated order #${order.orderId} for sub ${sub._id}`);
      } catch (subErr) {
        console.error(`[RepeatDelivery Scheduler] Error processing subscription ${sub._id}:`, subErr.message);
      }
    }

    return { processed: processedCount };
  } catch (err) {
    console.error('[RepeatDelivery Scheduler] General error:', err.message);
    return { error: err.message };
  }
}

let schedulerInterval = null;

function startSubscriptionScheduler() {
  if (schedulerInterval) return;

  // Run on startup
  processDueSubscriptions();

  // Run every 60 seconds
  schedulerInterval = setInterval(() => {
    processDueSubscriptions();
  }, 60 * 1000);

  console.log('[RepeatDelivery Scheduler] Subscription auto-order scheduler started (checking every 60s).');
}

function stopSubscriptionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = {
  startSubscriptionScheduler,
  stopSubscriptionScheduler,
  processDueSubscriptions
};

