const emailService = require('./email.service');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const Order = require('../models/order.model');
const VendorTransaction = require('../models/vendor-transaction.model');
const AuditLog = require('../models/audit-log.model');

// Helper to check if a scheduled job already ran for a period
async function hasJobRun(jobAction, periodKey) {
  try {
    const existing = await AuditLog.findOne({
      action: jobAction,
      entityId: periodKey
    });
    return Boolean(existing);
  } catch (err) {
    console.error(`[EmailCron] Error checking job state for ${jobAction}:`, err.message);
    return false;
  }
}

// Helper to record that a scheduled job ran
async function recordJobRun(jobAction, periodKey, details) {
  try {
    await AuditLog.create({
      action: jobAction,
      entityType: 'cron_scheduler',
      entityId: periodKey,
      adminName: 'Automated Cron Engine',
      details,
      meta: { timestamp: new Date(), period: periodKey }
    });
  } catch (err) {
    console.error(`[EmailCron] Error recording job state:`, err.message);
  }
}

// Helper to execute batch tasks in parallel chunks of specified size
async function sendInBatches(items, batchSize, workerFn) {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await Promise.allSettled(chunk.map(workerFn));
  }
}

/**
 * 1. Dispatch Monthly Emails (Customers, Vendors, Admin)
 */
async function dispatchMonthlyEmails(force = false, options = {}) {
  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (!force && await hasJobRun('CRON_MONTHLY_EMAILS', periodKey)) {
    console.log(`[EmailCron] Monthly emails already sent for ${periodKey}. Skipping.`);
    return { skipped: true, period: periodKey };
  }

  console.log(`[EmailCron] Starting Monthly Email Dispatch for ${periodKey}...`);

  let vendorCount = 0;
  let customerCount = 0;

  // 1A. Dispatch to Admin FIRST (unless skipAdmin option is specified)
  if (!options.skipAdmin) {
    try {
      const admin = options.targetAdmin || await Admin.findOne({ isDeleted: { $ne: true } });
      if (admin) {
        const [orderAgg, vCount, cCount] = await Promise.all([
          Order.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: null, totalOrders: { $sum: 1 }, grossVolume: { $sum: '$totalAmount' }, totalRefunds: { $sum: '$refundAmount' } } }
          ]),
          User.countDocuments({ isDeleted: { $ne: true } }),
          Customer.countDocuments({ isDeleted: { $ne: true } })
        ]);

        const stats = orderAgg[0] || { totalOrders: 0, grossVolume: 0, totalRefunds: 0 };
        const commissionEarned = stats.grossVolume * 0.05;

        await emailService.sendMonthlyAdminRevenueEmail({
          admin,
          metrics: {
            grossVolume: stats.grossVolume,
            commissionEarned,
            netRevenue: commissionEarned,
            totalOrders: stats.totalOrders,
            totalRefunds: stats.totalRefunds,
            activeVendors: vCount,
            activeCustomers: cCount
          },
          month: monthLabel
        });
        console.log(`[EmailCron] Admin monthly digest delivered to ${admin.email}`);
      }
    } catch (err) {
      console.error('[EmailCron] Error sending admin monthly email:', err.message);
    }
  }

  // 1B. Dispatch to Vendors in parallel chunks of 5
  if (!options.onlyCustomers) {
    try {
      const vendors = await User.find({ isDeleted: { $ne: true } });
      await sendInBatches(vendors, 5, async (v) => {
        try {
          const txns = await VendorTransaction.find({ vendorId: v._id }).sort({ createdAt: -1 }).limit(10);
          const totalEarnings = txns.filter(t => t.type === 'order_earning').reduce((s, t) => s + (t.amount || 0), 0);
          const totalCommission = txns.reduce((s, t) => s + (t.commission || 0), 0);
          const totalPayout = txns.filter(t => t.type === 'payout').reduce((s, t) => s + (t.amount || 0), 0);

          await emailService.sendMonthlyVendorPayoutEmail({
            vendor: v,
            transactions: txns,
            totalPayout,
            totalEarnings,
            totalCommission,
            month: monthLabel
          });
          vendorCount++;
        } catch (vErr) {
          console.error(`[EmailCron] Failed vendor ${v.email}:`, vErr.message);
        }
      });
    } catch (err) {
      console.error('[EmailCron] Error sending vendor monthly emails:', err.message);
    }
  }

  // 1C. Dispatch to Customers in parallel chunks of 5
  if (!options.onlyVendors) {
    try {
      const customers = await Customer.find({ isDeleted: { $ne: true } });
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      await sendInBatches(customers, 5, async (c) => {
        try {
          const customerOrders = await Order.find({ customerId: c._id, isDeleted: { $ne: true }, createdAt: { $gte: oneMonthAgo } }).sort({ createdAt: -1 });
          const totalSpent = customerOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

          await emailService.sendMonthlyCustomerStatementEmail({
            customer: c,
            orders: customerOrders,
            totalSpent,
            walletBalance: c.wallet?.balance || 0,
            month: monthLabel
          });
          customerCount++;
        } catch (cErr) {
          console.error(`[EmailCron] Failed customer ${c.email}:`, cErr.message);
        }
      });
    } catch (err) {
      console.error('[EmailCron] Error sending customer monthly emails:', err.message);
    }
  }

  await recordJobRun('CRON_MONTHLY_EMAILS', periodKey, `Dispatched monthly statements to ${customerCount} customers, ${vendorCount} vendors, and admin for ${periodKey}`);
  return { success: true, period: periodKey, vendorCount, customerCount };
}

/**
 * 2. Dispatch 6-Month Review Emails
 */
async function dispatchSixMonthEmails(force = false, options = {}) {
  const now = new Date();
  const halfYear = now.getMonth() < 6 ? 'H1' : 'H2';
  const periodKey = `${now.getFullYear()}-${halfYear}`;

  if (!force && await hasJobRun('CRON_SIX_MONTH_EMAILS', periodKey)) {
    console.log(`[EmailCron] 6-Month emails already sent for ${periodKey}. Skipping.`);
    return { skipped: true, period: periodKey };
  }

  console.log(`[EmailCron] Starting 6-Month Review Dispatch for ${periodKey}...`);

  // Admin FIRST
  if (!options.skipAdmin) {
    try {
      const admin = options.targetAdmin || await Admin.findOne({ isDeleted: { $ne: true } });
      if (admin) {
        const allOrders = await Order.find({ isDeleted: { $ne: true } });
        const gmv = allOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendSixMonthReviewEmail({
          recipient: admin,
          userType: 'admin',
          metrics: { volume: gmv, netProfit: gmv * 0.05, ordersCount: allOrders.length },
          period: `${halfYear} ${now.getFullYear()}`
        });
      }
    } catch (err) {
      console.error('[EmailCron] Error sending admin 6-month review:', err.message);
    }
  }

  // Customers in batches of 5
  try {
    const customers = await Customer.find({ isDeleted: { $ne: true } });
    await sendInBatches(customers, 5, async (c) => {
      try {
        const orders = await Order.find({ customerId: c._id, isDeleted: { $ne: true } });
        const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendSixMonthReviewEmail({
          recipient: c,
          userType: 'customer',
          metrics: { totalSpent, ordersCount: orders.length },
          period: `${halfYear} ${now.getFullYear()}`
        });
      } catch (cErr) {
        console.error(`[EmailCron] 6-Month error customer ${c.email}:`, cErr.message);
      }
    });
  } catch (err) {
    console.error('[EmailCron] Error sending customer 6-month reviews:', err.message);
  }

  // Vendors in batches of 5
  try {
    const vendors = await User.find({ isDeleted: { $ne: true } });
    await sendInBatches(vendors, 5, async (v) => {
      try {
        const vOrders = await Order.find({ vendorId: v._id, isDeleted: { $ne: true } });
        const volume = vOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendSixMonthReviewEmail({
          recipient: v,
          userType: 'vendor',
          metrics: { volume, netProfit: volume * 0.95, ordersCount: vOrders.length },
          period: `${halfYear} ${now.getFullYear()}`
        });
      } catch (vErr) {
        console.error(`[EmailCron] 6-Month error vendor ${v.email}:`, vErr.message);
      }
    });
  } catch (err) {
    console.error('[EmailCron] Error sending vendor 6-month reviews:', err.message);
  }

  await recordJobRun('CRON_SIX_MONTH_EMAILS', periodKey, `Dispatched 6-Month review statements for ${periodKey}`);
  return { success: true, period: periodKey };
}

/**
 * 3. Dispatch 1-Year Annual Emails
 */
async function dispatchAnnualEmails(force = false, options = {}) {
  const now = new Date();
  const periodKey = `${now.getFullYear()}`;

  if (!force && await hasJobRun('CRON_ANNUAL_EMAILS', periodKey)) {
    console.log(`[EmailCron] Annual emails already sent for ${periodKey}. Skipping.`);
    return { skipped: true, period: periodKey };
  }

  console.log(`[EmailCron] Starting Annual Milestone Dispatch for ${periodKey}...`);

  // Admin FIRST
  if (!options.skipAdmin) {
    try {
      const admin = options.targetAdmin || await Admin.findOne({ isDeleted: { $ne: true } });
      if (admin) {
        const allOrders = await Order.find({ isDeleted: { $ne: true } });
        const gmv = allOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendAnnualReviewEmail({
          recipient: admin,
          userType: 'admin',
          metrics: { volume: gmv, netProfit: gmv * 0.05, ordersCount: allOrders.length },
          year: periodKey
        });
      }
    } catch (err) {
      console.error('[EmailCron] Error sending admin annual review:', err.message);
    }
  }

  // Customers in batches of 5
  try {
    const customers = await Customer.find({ isDeleted: { $ne: true } });
    await sendInBatches(customers, 5, async (c) => {
      try {
        const orders = await Order.find({ customerId: c._id, isDeleted: { $ne: true } });
        const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendAnnualReviewEmail({
          recipient: c,
          userType: 'customer',
          metrics: { totalSpent, ordersCount: orders.length, savings: totalSpent * 0.15 },
          year: periodKey
        });
      } catch (cErr) {
        console.error(`[EmailCron] Annual error customer ${c.email}:`, cErr.message);
      }
    });
  } catch (err) {
    console.error('[EmailCron] Error sending customer annual reviews:', err.message);
  }

  // Vendors in batches of 5
  try {
    const vendors = await User.find({ isDeleted: { $ne: true } });
    await sendInBatches(vendors, 5, async (v) => {
      try {
        const vOrders = await Order.find({ vendorId: v._id, isDeleted: { $ne: true } });
        const volume = vOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        await emailService.sendAnnualReviewEmail({
          recipient: v,
          userType: 'vendor',
          metrics: { volume, netProfit: volume * 0.95, ordersCount: vOrders.length },
          year: periodKey
        });
      } catch (vErr) {
        console.error(`[EmailCron] Annual error vendor ${v.email}:`, vErr.message);
      }
    });
  } catch (err) {
    console.error('[EmailCron] Error sending vendor annual reviews:', err.message);
  }

  await recordJobRun('CRON_ANNUAL_EMAILS', periodKey, `Dispatched Annual Year-in-Review digests for ${periodKey}`);
  return { success: true, period: periodKey };
}

/**
 * 3B. Dispatch Daily End-of-Day Digest to All Active Vendors
 */
async function dispatchDailyVendorDigests(force = false) {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (!force && await hasJobRun('CRON_DAILY_VENDOR_DIGEST', dateKey)) {
    console.log(`[EmailCron] Daily vendor digest already sent for ${dateKey}. Skipping.`);
    return { skipped: true, period: dateKey };
  }

  console.log(`[EmailCron] Starting Daily Vendor Digest Dispatch for ${dateKey}...`);
  let dispatched = 0;

  try {
    const Return = require('../models/return.model');
    const vendors = await User.find({ isDeleted: { $ne: true } });

    await sendInBatches(vendors, 5, async (v) => {
      try {
        const orders = await Order.find({
          vendorId: v._id,
          isDeleted: { $ne: true },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        const txns = await VendorTransaction.find({
          vendorId: v._id,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        const returns = await Return.find({
          vendorId: v._id,
          isDeleted: { $ne: true },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        await emailService.sendDailyVendorDigestEmail({
          vendor: v,
          orders,
          transactions: txns,
          returns,
          dateStr: now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
        });
        dispatched++;
      } catch (vErr) {
        console.error(`[EmailCron] Daily digest error vendor ${v.email}:`, vErr.message);
      }
    });

    await recordJobRun('CRON_DAILY_VENDOR_DIGEST', dateKey, `Dispatched daily digest to ${dispatched} active vendor(s)`);
    console.log(`[EmailCron] Finished daily vendor digest for ${dispatched} vendors.`);
    return { success: true, count: dispatched, period: dateKey };
  } catch (err) {
    console.error('[EmailCron] Error dispatching daily vendor digests:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Start the Background Cron Scheduler
 * Checks every hour to see if 1st of month, 6 months, 1 year, or 21:00 EOD daily is reached.
 */
function startEmailCronScheduler() {
  console.log('[EmailCron] Automated Email Schedulers Initialized (Daily 21:00, Monthly 1st, 6-Month H1/H2, 1-Year Annual)');

  const checkSchedules = async () => {
    try {
      const now = new Date();
      const date = now.getDate();
      const month = now.getMonth(); // 0-11
      const hour = now.getHours();

      // Daily at 9:00 PM (hour 21): trigger vendor daily EOD digest
      if (hour === 21) {
        await dispatchDailyVendorDigests(false);
      }

      // 1st of every month: trigger monthly statements
      if (date === 1 && hour === 8) {
        await dispatchMonthlyEmails(false);
      }

      // 1st of January (0) or 1st of July (6): trigger 6-month review
      if (date === 1 && (month === 0 || month === 6) && hour === 9) {
        await dispatchSixMonthEmails(false);
      }

      // 1st of January: trigger annual review
      if (date === 1 && month === 0 && hour === 10) {
        await dispatchAnnualEmails(false);
      }
    } catch (err) {
      console.error('[EmailCron] Error in schedule check:', err.message);
    }
  };

  // Run initial check
  checkSchedules();

  // Check every 30 minutes (1800000 ms)
  const interval = setInterval(checkSchedules, 30 * 60 * 1000);
  interval.unref?.();
  return interval;
}

module.exports = {
  startEmailCronScheduler,
  dispatchDailyVendorDigests,
  dispatchMonthlyEmails,
  dispatchSixMonthEmails,
  dispatchAnnualEmails
};

