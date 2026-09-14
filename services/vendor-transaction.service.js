const mongoose = require('mongoose');
const VendorTransaction = require('../models/vendor-transaction.model');
const { createNotification } = require('./notification.service');

exports.createVendorTransaction = async (data) => {
  try {
    return await VendorTransaction.create(data);
  } catch (err) {
    console.error('Failed to create vendor transaction:', err.message);
    return null;
  }
};

exports.getVendorTransactions = async (req, res) => {
  try {
    const vendorId = req.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const conditions = [{ vendorId: new mongoose.Types.ObjectId(vendorId) }];

    if (req.query.type && req.query.type !== 'all') {
      conditions.push({ type: req.query.type });
    }

    if (req.query.status && req.query.status !== 'all') {
      conditions.push({ status: req.query.status.toLowerCase() });
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      conditions.push({
        $or: [
          { description: { $regex: regex } },
          { orderDisplayId: { $regex: regex } },
          { customerName: { $regex: regex } }
        ]
      });
    }

    if (req.query.dateRange && req.query.dateRange !== 'all') {
      const now = new Date();
      if (req.query.dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        conditions.push({ createdAt: { $gte: startOfDay } });
      } else if (req.query.dateRange === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        conditions.push({ createdAt: { $gte: past7 } });
      } else if (req.query.dateRange === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        conditions.push({ createdAt: { $gte: past30 } });
      }
    } else if (req.query.dateFrom || req.query.dateTo) {
      const dateCond = {};
      if (req.query.dateFrom) dateCond.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) dateCond.$lte = new Date(req.query.dateTo);
      conditions.push({ createdAt: dateCond });
    }

    const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

    const [items, total, summaryAgg] = await Promise.all([
      VendorTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      VendorTransaction.countDocuments(query),
      VendorTransaction.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
        {
          $group: {
            _id: null,
            totalEarnings: {
              $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, '$amount', 0] }
            },
            earningsCount: {
              $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, 1, 0] }
            },
            totalCommission: {
              $sum: '$commission'
            },
            totalRefundDeductions: {
              $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, '$amount', 0] }
            },
            refundsCount: {
              $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, 1, 0] }
            },
            totalPayouts: {
              $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] }
            },
            payoutsCount: {
              $sum: { $cond: [{ $eq: ['$type', 'payout'] }, 1, 0] }
            },
            totalCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const s = summaryAgg[0] || {
      totalEarnings: 0,
      earningsCount: 0,
      totalCommission: 0,
      totalRefundDeductions: 0,
      refundsCount: 0,
      totalPayouts: 0,
      payoutsCount: 0,
      totalCount: 0
    };

    const netRevenue = Math.max(0, s.totalEarnings - s.totalRefundDeductions - s.totalCommission);
    const availableBalance = Math.max(0, netRevenue - s.totalPayouts);

    res.json({
      items,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      summary: {
        totalEarnings: s.totalEarnings,
        earningsCount: s.earningsCount,
        totalCommission: s.totalCommission,
        totalRefundDeductions: s.totalRefundDeductions,
        refundsCount: s.refundsCount,
        totalPayouts: s.totalPayouts,
        payoutsCount: s.payoutsCount,
        totalCount: s.totalCount,
        netRevenue,
        availableBalance
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch vendor transactions' });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const vendorId = req.userId;
    const { amount, payoutMethod = 'bank_transfer', payoutAccount = '', notes = '' } = req.body;

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ msg: 'Please enter a valid payout amount' });
    }

    if (withdrawAmount < 500) {
      return res.status(400).json({ msg: 'Minimum payout withdrawal is ₹500' });
    }

    // Compute current available balance
    const summaryAgg = await VendorTransaction.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, '$amount', 0] }
          },
          totalCommission: {
            $sum: '$commission'
          },
          totalRefundDeductions: {
            $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, '$amount', 0] }
          },
          totalPayouts: {
            $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const s = summaryAgg[0] || { totalEarnings: 0, totalCommission: 0, totalRefundDeductions: 0, totalPayouts: 0 };
    const netRevenue = Math.max(0, s.totalEarnings - s.totalRefundDeductions - s.totalCommission);
    const availableBalance = Math.max(0, netRevenue - s.totalPayouts);

    if (withdrawAmount > availableBalance) {
      return res.status(400).json({
        msg: `Requested amount ₹${withdrawAmount.toLocaleString('en-IN')} exceeds available balance of ₹${availableBalance.toLocaleString('en-IN')}`
      });
    }

    const payoutTxn = await VendorTransaction.create({
      vendorId,
      type: 'payout',
      amount: withdrawAmount,
      direction: 'debit',
      status: 'completed',
      netAmount: withdrawAmount,
      commission: 0,
      payoutMethod,
      payoutAccount: payoutAccount || 'Primary Bank Account (HDFC)',
      description: `Payout settlement of ₹${withdrawAmount.toLocaleString('en-IN')} to ${payoutAccount || 'Bank Account'}`,
      meta: {
        notes,
        requestedAt: new Date(),
        processedAt: new Date()
      }
    });

    // Notify vendor
    try {
      await createNotification({
        userId: vendorId,
        userType: 'vendor',
        title: 'Payout Processed Successfully',
        message: `Your payout request of ₹${withdrawAmount.toLocaleString('en-IN')} has been processed and credited to your account.`,
        type: 'wallet_topup',
        actionUrl: '/vendor/payments'
      });
    } catch {
      // non-blocking
    }

    res.json({
      msg: 'Payout request processed successfully',
      transaction: payoutTxn,
      availableBalance: Math.max(0, availableBalance - withdrawAmount)
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to process payout request' });
  }
};

