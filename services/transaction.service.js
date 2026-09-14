const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');

exports.createTransaction = async (data) => {
  try {
    return await Transaction.create(data);
  } catch (err) {
    console.error('Failed to create transaction:', err.message);
    return null; // Non-blocking — don't fail the parent operation
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const customerId = req.customerId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const conditions = [{ customerId }];

    if (req.query.type) {
      if (req.query.type === 'wallet') {
        conditions.push({
          $or: [
            { type: { $in: ['wallet_topup', 'wallet_debit', 'wallet_credit'] } },
            { paymentMethod: 'wallet' }
          ]
        });
      } else if (req.query.type === 'recharge' || req.query.type === 'wallet_topup') {
        conditions.push({ type: 'wallet_topup' });
      } else {
        conditions.push({ type: req.query.type });
      }
    }

    if (req.query.status && req.query.status !== 'all') {
      conditions.push({ status: req.query.status.toLowerCase() });
    }

    if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
      conditions.push({ paymentMethod: new RegExp('^' + req.query.paymentMethod + '$', 'i') });
    }

    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      conditions.push({
        $or: [
          { description: { $regex: regex } },
          { orderDisplayId: { $regex: regex } },
          { 'meta.productName': { $regex: regex } },
          { 'meta.source': { $regex: regex } }
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
      Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] }
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$type', 'payment'] }, 1, 0] }
            },
            totalRefunded: {
              $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] }
            },
            refundedCount: {
              $sum: { $cond: [{ $eq: ['$type', 'refund'] }, 1, 0] }
            },
            totalRecharged: {
              $sum: { $cond: [{ $eq: ['$type', 'wallet_topup'] }, '$amount', 0] }
            },
            rechargedCount: {
              $sum: { $cond: [{ $eq: ['$type', 'wallet_topup'] }, 1, 0] }
            },
            totalCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const summary = summaryAgg[0] || {
      totalPaid: 0,
      paidCount: 0,
      totalRefunded: 0,
      refundedCount: 0,
      totalRecharged: 0,
      rechargedCount: 0,
      totalCount: 0
    };

    res.json({
      items,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      summary
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction || transaction.customerId.toString() !== req.customerId.toString()) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch transaction' });
  }
};

