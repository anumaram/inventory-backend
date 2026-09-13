const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const { generateOrderId } = require('../utils/orderId.util');
const { generateInvoiceId } = require('../utils/invoiceId.util');
const emailService = require('./email.service');

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

function normalizeOrder(order) {
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const items = hasItems
    ? order.items
    : [
        {
          productId: order.productId?._id || order.productId,
          vendorId: order.vendorId?._id || order.vendorId,
          name: order.productId?.name || order.name || 'Product',
          vendorName: order.vendorId?.name || order.vendorName || 'Vendor',
          qty: Number(order.qty) > 0 ? Number(order.qty) : 1,
          price: Number(order.price) > 0 ? Number(order.price) : 0
        }
      ];

  const calculatedItemsTotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
    0
  );

  const subtotal = Number(order.subtotal) > 0
    ? Number(order.subtotal)
    : (calculatedItemsTotal > 0 ? calculatedItemsTotal : Number(order.price || 0) * Number(order.qty || 1));

  const totalAmount = Number(order.totalAmount) > 0
    ? Number(order.totalAmount)
    : Math.max(0, subtotal + Number(order.deliveryFee || 0) - Number(order.couponDiscount || 0));

  const invoiceId = order.invoiceId || (order.orderId ? `INV-${order.orderId.replace(/^ORD/, '')}` : generateInvoiceId(order.createdAt || order.placedAt));

  return {
    ...order,
    items,
    subtotal,
    totalAmount,
    invoiceId
  };
}

async function enrichOrderItems(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return orders;
  const productIds = new Set();
  orders.forEach((ord) => {
    if (Array.isArray(ord.items)) {
      ord.items.forEach((it) => {
        const pId = it.productId?._id || it.productId;
        if (pId && mongoose.Types.ObjectId.isValid(pId)) productIds.add(String(pId));
      });
    }
    const singlePId = ord.productId?._id || ord.productId;
    if (singlePId && mongoose.Types.ObjectId.isValid(singlePId)) productIds.add(String(singlePId));
  });

  const productsList = await Product.find({ _id: { $in: Array.from(productIds) } }).lean();
  const prodMap = {};
  productsList.forEach((p) => {
    prodMap[String(p._id)] = p;
  });

  return orders.map((ord) => {
    const norm = normalizeOrder(ord);
    const enrichedItems = norm.items.map((it) => {
      const pId = String(it.productId?._id || it.productId || '');
      const prod = prodMap[pId] || {};
      return {
        ...it,
        name: it.name || prod.name || 'Product Item',
        image: it.image || prod.image || (Array.isArray(prod.images) ? prod.images[0] : '') || '',
        category: it.category || prod.category || 'General',
        description: it.description || prod.description || '',
        price: it.price != null ? it.price : prod.price || 0,
        qty: it.qty || 1
      };
    });

    return {
      ...norm,
      items: enrichedItems
    };
  });
}

exports.createOrder = async (req, res) => {
  const { productId, qty } = req.body;

  if (!productId || !qty || qty <= 0) {
    return res.status(400).json({ msg: 'Invalid order quantity' });
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, quantity: { $gte: qty }, isDeleted: { $ne: true } },
    { $inc: { quantity: -qty } },
    { returnDocument: 'after' }
  );

  if (!product) {
    return res.status(400).json({ msg: 'Out of stock' });
  }

  const placedAt = new Date();
  const orderId = generateOrderId(placedAt);
  const invoiceId = generateInvoiceId(placedAt);
  const order = await Order.create({
    orderId,
    invoiceId,
    productId: product._id,
    vendorId: product.userId,
    customerId: req.customerId,
    items: [
      {
        productId: product._id,
        vendorId: product.userId,
        name: product.name || 'Product',
        vendorName: 'Vendor',
        qty,
        price: product.price
      }
    ],
    subtotal: Number(product.price) * qty,
    totalAmount: Number(product.price) * qty,
    qty,
    price: product.price,
    placedAt,
    statusTimestamps: {
      placed: placedAt
    }
  });

  const normOrder = normalizeOrder(order.toObject ? order.toObject() : order);

  // Send real-time emails and create in-app notifications asynchronously
  (async () => {
    try {
      const notificationService = require('./notification.service');
      const oId = normOrder.orderId || String(normOrder._id).slice(-8).toUpperCase();

      await notificationService.createNotification({
        recipientType: 'customer',
        recipientId: req.customerId,
        title: `Order Placed Successfully! 🎉`,
        message: `Your order #${oId} for ${product.name || 'Product'} has been placed.`,
        type: 'order_placed',
        orderId: oId,
        actionUrl: '/customer/orders'
      });

      if (product.userId) {
        await notificationService.createNotification({
          recipientType: 'vendor',
          recipientId: product.userId,
          title: `New Order Received! 📦`,
          message: `You received an order for ${product.name || 'Product'} (Qty: ${qty}).`,
          type: 'order_placed',
          orderId: oId,
          actionUrl: '/vendor/orders'
        });
      }

      const customer = await Customer.findById(req.customerId).select('name email');
      if (customer) {
        await emailService.sendOrderPlacedCustomerEmail({
          order: normOrder,
          customer,
          items: normOrder.items
        });
      }
      if (product.userId) {
        const vendor = await User.findById(product.userId).select('name email');
        if (vendor) {
          await emailService.sendOrderPlacedVendorEmail({
            order: normOrder,
            vendor,
            vendorItems: normOrder.items
          });
        }
      }
    } catch (mailErr) {
      console.error('[OrderService] Email/notif dispatch error:', mailErr.message);
    }
  })();

  res.json(normOrder);
};

const escapeRegExp = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getCustomerOrders = async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '0', 10) || 0, 0);
  const rawQ = (req.query.q || req.query.search || '').toString().trim();
  const rawStatus = (req.query.status || '').toString().trim().toLowerCase();

  const match = { customerId: toObjectId(req.customerId), isDeleted: { $ne: true } };
  if (rawStatus && rawStatus !== 'all') {
    match.status = rawStatus;
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
  ];


  if (rawQ) {
    const escaped = escapeRegExp(rawQ);
    const regex = { $regex: escaped, $options: 'i' };
    pipeline.push({
      $match: {
        $or: [
          { 'items.name': regex },
          { 'product.name': regex },
          { orderId: regex },
          { invoiceId: regex },
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escaped, options: 'i' } } }
        ]
      }
    });
  }

  if (limit > 0) {
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              orderId: 1,
              invoiceId: 1,
              status: 1,
              returnStatus: 1,
              returnReason: 1,
              returnComments: 1,
              returnRequestedAt: 1,
              refundAmount: 1,
              placedAt: 1,
              statusUpdatedAt: 1,
              statusTimestamps: 1,
              customerId: 1,
              customer: {
                name: { $ifNull: ['$customer.name', 'Customer'] },
                email: { $ifNull: ['$customer.email', ''] },
                phone: { $ifNull: ['$customer.phone', ''] }
              },
              items: 1,
              subtotal: 1,
              deliveryFee: 1,
              couponCode: 1,
              couponDiscount: 1,
              totalAmount: 1,
              qty: 1,
              price: 1,
              addressId: 1,
              shippingAddress: 1,
              deliveryMethod: 1,
              paymentMethod: 1,
              createdAt: 1,
              updatedAt: 1,
              productId: {
                _id: { $ifNull: ['$product._id', null] },
                name: { $ifNull: ['$product.name', 'Unknown'] }
              },
              vendorId: {
                _id: { $ifNull: ['$vendor._id', null] },
                name: { $ifNull: ['$vendor.name', 'Unknown'] }
              }
            }
          }
        ]
      }
    });

    const result = await Order.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const rawItems = result[0]?.items || [];
    const items = await enrichOrderItems(rawItems);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);

    return res.json({
      items,
      page: safePage,
      pageSize: limit,
      total,
      totalPages
    });
  }

  pipeline.push(
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $project: {
        _id: 1,
        orderId: 1,
        invoiceId: 1,
        status: 1,
        returnStatus: 1,
        returnReason: 1,
        returnComments: 1,
        returnRequestedAt: 1,
        refundAmount: 1,
        placedAt: 1,
        statusUpdatedAt: 1,
        statusTimestamps: 1,
        customerId: 1,
        customer: {
          name: { $ifNull: ['$customer.name', 'Customer'] },
          email: { $ifNull: ['$customer.email', ''] },
          phone: { $ifNull: ['$customer.phone', ''] }
        },
        items: 1,
        subtotal: 1,
        deliveryFee: 1,
        couponCode: 1,
        couponDiscount: 1,
        totalAmount: 1,
        qty: 1,
        price: 1,
        addressId: 1,
        shippingAddress: 1,
        deliveryMethod: 1,
        paymentMethod: 1,
        createdAt: 1,
        updatedAt: 1,
        productId: {
          _id: { $ifNull: ['$product._id', null] },
          name: { $ifNull: ['$product.name', 'Unknown'] },
          image: { $ifNull: ['$product.image', ''] }
        },
        vendorId: {
          _id: { $ifNull: ['$vendor._id', null] },
          name: { $ifNull: ['$vendor.name', 'Unknown'] }
        }
      }
    }
  );

  const orders = await Order.aggregate(pipeline);
  const enriched = await enrichOrderItems(orders);
  res.json(enriched);
};

exports.getVendorOrders = async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit || '0', 10) || 0, 0);
  const vendorObjId = toObjectId(req.userId);

  const pipeline = [
    {
      $match: {
        $or: [
          { vendorId: vendorObjId },
          { 'items.vendorId': vendorObjId }
        ],
        isDeleted: { $ne: true }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
  ];

  if (limit > 0) {
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              orderId: 1,
              invoiceId: 1,
              returnStatus: 1,
              returnRequest: 1,
              returnReason: 1,
              status: 1,
              placedAt: 1,
              statusUpdatedAt: 1,
              statusTimestamps: 1,
              vendorId: 1,
              items: 1,
              totalAmount: 1,
              qty: 1,
              price: 1,
              addressId: 1,
              shippingAddress: 1,
              deliveryMethod: 1,
              paymentMethod: 1,
              createdAt: 1,
              updatedAt: 1,
              productId: {
                _id: { $ifNull: ['$product._id', null] },
                name: { $ifNull: ['$product.name', 'Unknown'] },
                image: { $ifNull: ['$product.image', ''] }
              },
              customerId: {
                _id: { $ifNull: ['$customer._id', null] },
                name: { $ifNull: ['$customer.name', 'Unknown'] }
              }
            }
          }
        ]
      }
    });

    const result = await Order.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const rawItems = result[0]?.items || [];
    const enriched = await enrichOrderItems(rawItems);
    const items = enriched.map((o) => {
      const vItems = (o.items || []).filter(
        (it) => String(it.vendorId?._id || it.vendorId) === String(req.userId)
      );
      const activeItems = vItems.length > 0 ? vItems : (o.items || []);
      const p = activeItems[0] || {};
      const vQty = activeItems.reduce((s, it) => s + (Number(it.qty) || 1), 0);
      const vTot = activeItems.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
      return {
        ...o,
        items: activeItems,
        productId: {
          _id: p.productId,
          name: p.name ? (p.name + (activeItems.length > 1 ? ` (+${activeItems.length - 1} items)` : '')) : (o.productId?.name || 'Unknown'),
          image: p.image || o.productId?.image || ''
        },
        image: p.image || o.productId?.image || '',
        qty: vQty,
        price: p.price,
        totalAmount: vTot > 0 ? vTot : o.totalAmount
      };
    });
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);

    return res.json({
      items,
      page: safePage,
      pageSize: limit,
      total,
      totalPages
    });
  }

  pipeline.push(
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $project: {
        _id: 1,
        orderId: 1,
        invoiceId: 1,
        returnStatus: 1,
        returnRequest: 1,
        returnReason: 1,
        status: 1,
        placedAt: 1,
        statusUpdatedAt: 1,
        statusTimestamps: 1,
        vendorId: 1,
        items: 1,
        totalAmount: 1,
        qty: 1,
        price: 1,
        addressId: 1,
        shippingAddress: 1,
        deliveryMethod: 1,
        paymentMethod: 1,
        createdAt: 1,
        updatedAt: 1,
        productId: {
          _id: { $ifNull: ['$product._id', null] },
          name: { $ifNull: ['$product.name', 'Unknown'] },
          image: { $ifNull: ['$product.image', ''] }
        },
        customerId: {
          _id: { $ifNull: ['$customer._id', null] },
          name: { $ifNull: ['$customer.name', 'Unknown'] }
        }
      }
    }
  );

  const orders = await Order.aggregate(pipeline);
  const enrichedOrders = await enrichOrderItems(orders);
  res.json(enrichedOrders.map((o) => {
    const vItems = (o.items || []).filter(
      (it) => String(it.vendorId?._id || it.vendorId) === String(req.userId)
    );
    const activeItems = vItems.length > 0 ? vItems : (o.items || []);
    const p = activeItems[0] || {};
    const vQty = activeItems.reduce((s, it) => s + (Number(it.qty) || 1), 0);
    const vTot = activeItems.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
    return {
      ...o,
      items: activeItems,
      productId: {
        _id: p.productId,
        name: p.name ? (p.name + (activeItems.length > 1 ? ` (+${activeItems.length - 1} items)` : '')) : (o.productId?.name || 'Unknown'),
        image: p.image || o.productId?.image || ''
      },
      image: p.image || o.productId?.image || '',
      qty: vQty,
      price: p.price,
      totalAmount: vTot > 0 ? vTot : o.totalAmount
    };
  }));
};

/**
 * Customer Cancels Order (Allowed for 'placed' or 'packed')
 */
exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  const { reason = 'Cancelled by customer' } = req.body || {};

  const order = await Order.findOne({
    $or: [{ _id: toObjectId(id) }, { orderId: id }],
    customerId: req.customerId,
    isDeleted: { $ne: true }
  });

  if (!order) {
    return res.status(404).json({ msg: 'Order not found' });
  }

  const currentStatus = String(order.status || '').toLowerCase();
  if (currentStatus !== 'placed' && currentStatus !== 'packed') {
    return res.status(400).json({ msg: `Order cannot be cancelled as it is already ${currentStatus}` });
  }

  // Restore inventory stock
  const norm = normalizeOrder(order.toObject ? order.toObject() : order);
  for (const it of norm.items) {
    const pId = it.productId?._id || it.productId;
    if (pId) {
      await Product.updateOne({ _id: pId }, { $inc: { quantity: Number(it.qty || 1) } });
    }
  }

  // If paid by wallet or card, refund amount to customer wallet
  const orderTotal = Number(norm.totalAmount || 0);
  if (!order.totalAmount || order.totalAmount === 0) {
    order.totalAmount = orderTotal;
  }
  if (!order.items || order.items.length === 0) {
    order.items = norm.items;
  }

  if (orderTotal > 0 && order.paymentMethod !== 'cod') {
    await Customer.updateOne(
      { _id: req.customerId },
      {
        $inc: { 'wallet.balance': orderTotal }
      }
    );
    order.refundAmount = orderTotal;
    order.refundStatus = 'credited';
  } else {
    order.refundAmount = orderTotal;
  }

  const now = new Date();
  order.status = 'cancelled';
  order.cancellationReason = reason;
  order.cancelledAt = now;
  order.cancelledBy = 'customer';
  order.statusTimestamps = order.statusTimestamps || {};
  order.statusTimestamps.cancelled = now;

  await order.save();

  const notificationService = require('./notification.service');
  const returnService = require('./return.service');
  const oId = order.orderId || String(order._id).slice(-8).toUpperCase();

  // Create document in dedicated returns collection
  try {
    await returnService.createReturnRecord({
      orderRef: order._id,
      orderId: oId,
      customerId: req.customerId,
      vendorId: order.vendorId,
      type: 'cancellation',
      status: 'cancelled',
      reason,
      items: norm.items,
      totalAmount: orderTotal,
      refundAmount: orderTotal,
      refundMethod: order.paymentMethod || 'wallet',
      refundStatus: orderTotal > 0 && order.paymentMethod !== 'cod' ? 'credited' : 'none',
      updatedBy: 'customer'
    });
  } catch (err) {
    console.error('[OrderService] Error recording to returns collection:', err.message);
  }

  // In-app notifications on cancellation
  (async () => {
    try {
      await notificationService.createNotification({
        recipientType: 'customer',
        recipientId: req.customerId,
        title: `Order Cancelled 🛑`,
        message: `Your order #${oId} has been cancelled.${orderTotal > 0 && order.paymentMethod !== 'cod' ? ` ₹${orderTotal.toLocaleString('en-IN')} has been refunded to your wallet.` : ''}`,
        type: 'order_cancelled',
        orderId: oId,
        actionUrl: '/customer/orders'
      });

      if (order.vendorId) {
        await notificationService.createNotification({
          recipientType: 'vendor',
          recipientId: order.vendorId,
          title: `Order Cancelled by Customer`,
          message: `Order #${oId} was cancelled by the customer. Stock has been restored.`,
          type: 'order_cancelled',
          orderId: oId,
          actionUrl: '/vendor/orders'
        });
      }

      const customer = await Customer.findById(req.customerId).select('name email');
      if (customer) {
        await emailService.sendOrderStatusUpdateEmail({
          order: normalizeOrder(order.toObject()),
          customer,
          status: 'cancelled'
        });
      }
    } catch (e) {
      console.error('[OrderService] Cancel notif/email error:', e.message);
    }
  })();

  res.json({
    msg: 'Order cancelled successfully',
    order: normalizeOrder(order.toObject()),
    refundCredited: order.paymentMethod !== 'cod' ? orderTotal : 0
  });
};

/**
 * Customer Requests Return / Refund (Allowed for 'delivered')
 */
exports.requestReturn = async (req, res) => {
  const { id } = req.params;
  const { reason = 'Defective / Not as described', comments = '' } = req.body || {};

  const order = await Order.findOne({
    $or: [{ _id: toObjectId(id) }, { orderId: id }],
    customerId: req.customerId,
    isDeleted: { $ne: true }
  });

  if (!order) {
    return res.status(404).json({ msg: 'Order not found' });
  }

  const currentStatus = String(order.status || '').toLowerCase();
  if (currentStatus !== 'delivered') {
    return res.status(400).json({ msg: 'Returns can only be requested for delivered orders' });
  }

  if (order.returnStatus && order.returnStatus !== 'none') {
    return res.status(400).json({ msg: `Return request already submitted (Status: ${order.returnStatus})` });
  }

  const now = new Date();
  order.returnStatus = 'requested';
  order.returnReason = reason;
  order.returnComments = comments;
  order.returnRequestedAt = now;

  const normOrder = normalizeOrder(order.toObject ? order.toObject() : order);
  const returnOrderTotal = Number(normOrder.totalAmount || 0);

  if (!order.totalAmount || order.totalAmount === 0) {
    order.totalAmount = returnOrderTotal;
  }
  if (!order.items || order.items.length === 0) {
    order.items = normOrder.items;
  }
  order.refundAmount = returnOrderTotal;
  order.refundStatus = 'pending';

  await order.save();

  const notificationService = require('./notification.service');
  const returnService = require('./return.service');
  const oId = order.orderId || String(order._id).slice(-8).toUpperCase();

  // Create document in dedicated returns collection
  try {
    await returnService.createReturnRecord({
      orderRef: order._id,
      orderId: oId,
      customerId: req.customerId,
      vendorId: order.vendorId,
      type: 'return',
      status: 'requested',
      reason,
      comments,
      items: normOrder.items,
      totalAmount: returnOrderTotal,
      refundAmount: returnOrderTotal,
      refundMethod: order.paymentMethod || 'wallet',
      refundStatus: 'pending',
      updatedBy: 'customer'
    });
  } catch (err) {
    console.error('[OrderService] Error recording to returns collection:', err.message);
  }

  // In-app notifications on return request
  (async () => {
    try {
      await notificationService.createNotification({
        recipientType: 'customer',
        recipientId: req.customerId,
        title: `Return Request Submitted ↩️`,
        message: `Your return request for order #${oId} has been received. Pickup will be arranged soon.`,
        type: 'order_return_requested',
        orderId: oId,
        actionUrl: '/customer/orders'
      });

      if (order.vendorId) {
        await notificationService.createNotification({
          recipientType: 'vendor',
          recipientId: order.vendorId,
          title: `Return Requested for Order #${oId}`,
          message: `Customer requested return for Order #${oId}. Reason: "${reason}".`,
          type: 'order_return_requested',
          orderId: oId,
          actionUrl: '/vendor/orders'
        });
      }
    } catch (e) {
      console.error('[OrderService] Return notif error:', e.message);
    }
  })();

  res.json({
    msg: 'Return request submitted successfully. Our support team will review and approve pickup within 24-48 hours.',
    order: normalizeOrder(order.toObject())
  });
};

/**
 * Vendor Updates Order Fulfillment Status
 */
exports.updateVendorOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body || {};

  const allowedStatuses = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
  const normStatus = String(status || '').toLowerCase().trim();

  if (!allowedStatuses.includes(normStatus)) {
    return res.status(400).json({ msg: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
  }

  const order = await Order.findOne({
    $or: [{ _id: toObjectId(id) }, { orderId: id }],
    vendorId: req.userId,
    isDeleted: { $ne: true }
  });

  if (!order) {
    return res.status(404).json({ msg: 'Order not found for this vendor' });
  }

  const prevStatus = String(order.status || 'placed').toLowerCase();
  order.status = normStatus;
  order.statusTimestamps = order.statusTimestamps || {};
  order.statusTimestamps[normStatus] = new Date();

  // If cancelling order, restore product stock and log to InventoryHistory
  if (normStatus === 'cancelled' && prevStatus !== 'cancelled') {
    const inventoryHistoryService = require('./inventory-history.service');
    const oId = order.orderId || String(order._id).slice(-8).toUpperCase();

    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const oldStock = prod.quantity || 0;
          prod.quantity = oldStock + Number(item.qty || 1);
          await prod.save();

          await inventoryHistoryService.logInventoryEvent({
            productId: prod._id,
            vendorId: req.userId,
            type: 'ORDER_CANCELLED',
            quantityChange: Number(item.qty || 1),
            stockBefore: oldStock,
            stockAfter: prod.quantity,
            referenceId: oId,
            reason: `Order cancelled by vendor. Stock restored (+${item.qty})`,
            actor: 'Vendor'
          });
        }
      }
    }
  }

  await order.save();

  // Send in-app notification to customer
  (async () => {
    try {
      const notificationService = require('./notification.service');
      const oId = order.orderId || String(order._id).slice(-8).toUpperCase();
      const statusLabels = {
        packed: 'Packed & Ready for Dispatch 📦',
        shipped: 'Shipped & In Transit 🚚',
        out_for_delivery: 'Out for Delivery 🛵',
        delivered: 'Delivered Successfully 🎉',
        cancelled: 'Order Cancelled ❌'
      };

      if (order.customerId) {
        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: order.customerId,
          title: `Order #${oId} Update: ${statusLabels[normStatus] || normStatus.toUpperCase()}`,
          message: note || `Your order #${oId} has been updated to ${normStatus.replace(/_/g, ' ')}.`,
          type: `order_${normStatus}`,
          orderId: oId,
          actionUrl: `/customer/orders`
        });
      }
    } catch (notifErr) {
      console.error('[OrderService] Vendor update status notification error:', notifErr.message);
    }
  })();

  res.json({
    msg: `Order status updated to ${normStatus}`,
    order: normalizeOrder(order.toObject())
  });
};
