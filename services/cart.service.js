const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Address = require('../models/address.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const { generateOrderId } = require('../utils/orderId.util');
const { generateInvoiceId } = require('../utils/invoiceId.util');


const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : value;

const mapCartItem = (item) => {
  const origPrice = Number(item.productId?.price ?? item.price ?? 0);
  const discount = Number(item.productId?.discountPercentage ?? item.discountPercentage ?? 10);
  const sellingPrice = Math.round(origPrice * (1 - discount / 100));
  const img = item.image || item.productId?.image || (Array.isArray(item.productId?.images) ? item.productId.images[0] : '') || '';

  return {
    _id: item._id,
    productId: item.productId?._id || item.productId || null,
    name: item.productId?.name || item.name || 'Unknown',
    image: img,
    images: item.images || item.productId?.images || (img ? [img] : []),
    price: sellingPrice,
    originalPrice: origPrice,
    discountPercentage: discount,
    quantity: item.productId?.quantity ?? item.quantity ?? 0,
    vendorName: item.productId?.userId?.name || item.vendorName || 'Unknown',
    qty: item.qty || 1
  };
};

exports.getCart = async (req, res) => {
  const items = await Cart.aggregate([
    { $match: { customerId: toObjectId(req.customerId), isDeleted: { $ne: true } } },
    { $sort: { createdAt: -1 } },
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
        localField: 'product.userId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        productId: { $ifNull: ['$product._id', null] },
        name: { $ifNull: ['$product.name', 'Unknown'] },
        image: {
          $cond: {
            if: { $and: [{ $ne: ['$product.image', null] }, { $ne: ['$product.image', ''] }] },
            then: '$product.image',
            else: { $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''] }
          }
        },
        images: { $ifNull: ['$product.images', []] },
        price: { $ifNull: ['$product.price', 0] },
        discountPercentage: { $ifNull: ['$product.discountPercentage', 10] },
        quantity: { $ifNull: ['$product.quantity', 0] },
        vendorName: { $ifNull: ['$vendor.name', 'Unknown'] },
        qty: { $ifNull: ['$qty', 1] }
      }
    }
  ]);

  res.json(items.map(mapCartItem));
};

exports.addToCart = async (req, res) => {
  const { productId, qty } = req.body;
  if (!productId) {
    return res.status(400).json({ msg: 'Product is required' });
  }

  const product = await Product.findOne({ _id: toObjectId(productId), isDeleted: { $ne: true } });
  if (!product) {
    return res.status(404).json({ msg: 'Product not found' });
  }

  const safeQty = Math.max(parseInt(qty || '1', 10) || 1, 1);
  const existingAgg = await Cart.aggregate([
    {
      $match: {
        customerId: toObjectId(req.customerId),
        productId: toObjectId(productId)
      }
    },
    { $limit: 1 },
    { $project: { _id: 1, qty: 1, isDeleted: 1 } }
  ]);
  const existing = existingAgg[0] || null;

  const currentQty = existing && !existing.isDeleted ? (Number(existing.qty) || 0) : 0;
  const nextQty = currentQty + safeQty;

  if (product.quantity < nextQty) {
    return res.status(400).json({
      msg: product.quantity <= 0
        ? 'Product is out of stock'
        : `Only ${product.quantity} items available in stock (${currentQty} already in cart).`
    });
  }

  if (existing) {
    const updated = await Cart.findOneAndUpdate(
      { _id: existing._id },
      { qty: nextQty, isDeleted: false },
      { returnDocument: 'after' }
    );
    return res.json(updated);
  }

  const item = await Cart.create({ customerId: req.customerId, productId, qty: safeQty });
  res.json(item);
};

exports.updateCartItem = async (req, res) => {
  const safeQty = Math.max(parseInt(req.body.qty || '1', 10) || 1, 1);
  const item = await Cart.findOneAndUpdate(
    { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
    { qty: safeQty },
    { returnDocument: 'after' }
  );

  if (!item) {
    return res.status(404).json({ msg: 'Cart item not found' });
  }

  res.json(item);
};

exports.removeCartItem = async (req, res) => {
  await Cart.findOneAndUpdate(
    { _id: req.params.id, customerId: req.customerId, isDeleted: { $ne: true } },
    { isDeleted: true },
    { returnDocument: 'after' }
  );
  res.json({ msg: 'Removed' });
};

exports.checkoutCart = async (req, res) => {
  const deliveryMethods = ['standard', 'express'];
  const paymentMethods = ['upi', 'card', 'netbanking', 'cod', 'wallet'];
  if (req.body?.deliveryMethod && !deliveryMethods.includes(req.body.deliveryMethod)) {
    return res.status(400).json({ msg: 'Invalid delivery method' });
  }
  if (req.body?.paymentMethod && !paymentMethods.includes(req.body.paymentMethod)) {
    return res.status(400).json({ msg: 'Invalid payment method' });
  }
  if (req.body?.secondaryPaymentMethod && !paymentMethods.includes(req.body.secondaryPaymentMethod)) {
    return res.status(400).json({ msg: 'Invalid secondary payment method' });
  }
  if (req.body?.secondaryPaymentMethodId && !mongoose.Types.ObjectId.isValid(req.body.secondaryPaymentMethodId)) {
    return res.status(400).json({ msg: 'Invalid saved secondary payment method' });
  }

  let addressData;
  if (req.body?.addressId) {
    if (!mongoose.Types.ObjectId.isValid(req.body.addressId)) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    const address = await Address.findOne({
      _id: req.body.addressId,
      customerId: req.customerId,
      isDeleted: { $ne: true }
    });
    if (!address) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    addressData = {
      addressId: address._id,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        type: address.type
      }
    };
  }

  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : null;
  const cartItems = itemsInput && itemsInput.length
    ? itemsInput
    : await Cart.aggregate([
        { $match: { customerId: toObjectId(req.customerId), isDeleted: { $ne: true } } },
        { $project: { productId: 1, qty: 1 } }
      ]);

  if (!cartItems.length) {
    return res.status(400).json({ msg: 'Cart is empty' });
  }

  const normalized = cartItems.map((item) => ({
    productId: item.productId?.toString() || item.productId,
    qty: Math.max(parseInt(item.qty || '1', 10) || 1, 1)
  }));

  const productIds = normalized.map((i) => i.productId);
  const products = await Product.aggregate([
    { $match: { _id: { $in: productIds.map(toObjectId) }, isDeleted: { $ne: true } } },
    { $project: { _id: 1, name: 1, quantity: 1, price: 1, discountPercentage: { $ifNull: ['$discountPercentage', 10] }, userId: 1 } }
  ]);

  for (const item of normalized) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product || product.quantity < item.qty) {
      return res.status(400).json({ msg: 'One or more items are out of stock' });
    }
  }

  const vendorUserIds = [...new Set(products.map((p) => p.userId?.toString()).filter(Boolean))];
  const vendors = await User.find({ _id: { $in: vendorUserIds.map(toObjectId) } }).select('_id name');
  const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v.name]));

  const subtotal = normalized.reduce((total, item) => {
    const product = products.find((entry) => entry._id.toString() === item.productId);
    const disc = Number(product?.discountPercentage ?? 10);
    const effectivePrice = Math.round(Number(product?.price || 0) * (1 - disc / 100));
    return total + effectivePrice * item.qty;
  }, 0);
  const couponRules = {
    HUB10: { type: 'percent', value: 10, cap: 5000 },
    SHOP50: { type: 'flat', value: 50, minimum: 999 },
    WELCOME100: { type: 'flat', value: 100 },
    FREESHIP: { type: 'shipping', value: 0, minimum: 499 }
  };
  const couponCode = String(req.body?.couponCode || '').toUpperCase();
  const coupon = couponRules[couponCode];
  if (coupon && coupon.minimum && subtotal < coupon.minimum) {
    return res.status(400).json({ msg: 'Coupon minimum order value was not met' });
  }
  const couponDiscount = coupon?.type === 'percent'
    ? Math.min(Math.round(subtotal * coupon.value / 100), coupon.cap)
    : coupon?.type === 'flat'
      ? coupon.value
      : 0;
  const rawDeliveryFee = req.body?.deliveryMethod === 'express' ? 99 : 0;
  const deliveryFee = coupon?.type === 'shipping' ? 0 : rawDeliveryFee;
  const orderTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);
  let walletCustomer;
  if (req.body?.paymentMethod === 'wallet') {
    walletCustomer = await Customer.findOne({ _id: req.customerId, isDeleted: { $ne: true } });
    if (!walletCustomer) {
      return res.status(400).json({ msg: 'Wallet is unavailable' });
    }
    const walletBalance = Number(walletCustomer.wallet?.balance || 0);
    if (walletBalance < orderTotal && !req.body?.secondaryPaymentMethod) {
      return res.status(400).json({ msg: 'Insufficient wallet balance' });
    }
    if (req.body.secondaryPaymentMethod === 'wallet') {
      return res.status(400).json({ msg: 'Choose another payment method for the remaining amount' });
    }

    if (req.body.secondaryPaymentMethod) {
      const PaymentMethod = require('../models/payment-method.model');
      let savedMethod = null;
      if (req.body.secondaryPaymentMethodId) {
        savedMethod = await PaymentMethod.findOne({ _id: req.body.secondaryPaymentMethodId, customerId: req.customerId, isDeleted: { $ne: true } });
      }
      if (!savedMethod) {
        savedMethod = await PaymentMethod.findOne({ customerId: req.customerId, type: req.body.secondaryPaymentMethod, isDeleted: { $ne: true } });
      }
      if (!savedMethod) {
        return res.status(400).json({ msg: 'Save the secondary payment method before checkout' });
      }
    }
  }

  const decrementedProducts = [];
  for (const item of normalized) {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: item.productId, quantity: { $gte: item.qty }, isDeleted: { $ne: true } },
      { $inc: { quantity: -item.qty } },
      { returnDocument: 'after' }
    );

    if (!updatedProduct) {
      for (const dec of decrementedProducts) {
        await Product.updateOne({ _id: dec.productId }, { $inc: { quantity: dec.qty } });
      }
      return res.status(400).json({ msg: 'Stock changed, please retry' });
    }

    decrementedProducts.push({ productId: item.productId, qty: item.qty });
  }

  // Group items by vendorId to create 1 order per vendor
  const vendorGroupsMap = {};
  normalized.forEach((item) => {
    const prod = products.find((p) => p._id.toString() === item.productId);
    const vId = prod?.userId?.toString() || 'unknown';
    if (!vendorGroupsMap[vId]) {
      vendorGroupsMap[vId] = {
        vendorId: toObjectId(prod?.userId),
        vendorName: vendorMap.get(vId) || 'Unknown',
        items: []
      };
    }

    const disc = Number(prod?.discountPercentage ?? 10);
    const effectivePrice = Math.round(Number(prod?.price || 0) * (1 - disc / 100));

    vendorGroupsMap[vId].items.push({
      productId: toObjectId(item.productId),
      vendorId: toObjectId(prod?.userId),
      name: prod?.name || 'Product',
      vendorName: vendorGroupsMap[vId].vendorName,
      qty: item.qty,
      price: effectivePrice,
      originalPrice: Number(prod?.price || 0),
      discountPercentage: disc
    });
  });

  const vendorGroups = Object.values(vendorGroupsMap);
  const createdOrders = [];
  const placedAt = new Date();

  // Distribute delivery fee and coupon across vendor orders proportionally or on the first order
  let remainingCouponDiscount = couponDiscount;
  let remainingDeliveryFee = deliveryFee;

  for (let i = 0; i < vendorGroups.length; i++) {
    const group = vendorGroups[i];
    const isLast = i === vendorGroups.length - 1;
    const groupSubtotal = group.items.reduce((s, it) => s + it.price * it.qty, 0);

    const groupCouponDiscount = isLast
      ? remainingCouponDiscount
      : Math.round((groupSubtotal / (subtotal || 1)) * couponDiscount);
    remainingCouponDiscount -= groupCouponDiscount;

    const groupDeliveryFee = isLast
      ? remainingDeliveryFee
      : (i === 0 ? deliveryFee : 0);
    remainingDeliveryFee -= groupDeliveryFee;

    const groupTotal = Math.max(0, groupSubtotal + groupDeliveryFee - groupCouponDiscount);

    const orderId = generateOrderId(placedAt, i);
    const invoiceId = generateInvoiceId(placedAt, i);
    const firstGroupItem = group.items[0];
    const groupTotalQty = group.items.reduce((acc, it) => acc + it.qty, 0);

    const order = await Order.create({
      orderId,
      invoiceId,
      customerId: req.customerId,
      items: group.items,
      subtotal: groupSubtotal,
      deliveryFee: groupDeliveryFee,
      couponCode: coupon ? couponCode : undefined,
      couponDiscount: groupCouponDiscount,
      totalAmount: groupTotal,
      deliveryMethod: req.body?.deliveryMethod || 'standard',
      paymentMethod: req.body?.secondaryPaymentMethod
        ? 'wallet + ' + req.body.secondaryPaymentMethod
        : req.body?.paymentMethod || 'upi',
      status: 'placed',
      placedAt,
      statusTimestamps: { placed: placedAt },
      ...addressData,
      productId: firstGroupItem.productId,
      vendorId: group.vendorId,
      qty: groupTotalQty,
      price: firstGroupItem.price
    });

    createdOrders.push(order);
  }

  // Clear all checked out items from cart
  await Cart.updateMany(
    {
      customerId: req.customerId,
      $or: [
        { productId: { $in: productIds.map(toObjectId) } },
        { productId: { $in: productIds } }
      ]
    },
    { isDeleted: true }
  );

  // Deduct from wallet if wallet payment was used
  if (walletCustomer) {
    walletCustomer.wallet.balance = Math.max(
      0,
      Number(walletCustomer.wallet.balance || 0) - Math.min(Number(walletCustomer.wallet.balance || 0), orderTotal)
    );
    await walletCustomer.save();
  }

  // Log inventory history for each purchased product
  try {
    const inventoryHistoryService = require('./inventory-history.service');
    for (const order of createdOrders) {
      const oId = order.orderId || `ORD-${String(order._id).slice(-8).toUpperCase()}`;
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const currentProd = await Product.findById(item.productId);
          const stockAfter = currentProd ? currentProd.quantity : 0;
          const stockBefore = stockAfter + Number(item.qty || 1);
          await inventoryHistoryService.logInventoryEvent({
            productId: item.productId,
            vendorId: order.vendorId,
            type: 'ORDER_PLACED',
            quantityChange: -Number(item.qty || 1),
            stockBefore,
            stockAfter,
            referenceId: oId,
            reason: `Customer purchased ${item.qty} unit${item.qty === 1 ? '' : 's'} (${oId})`,
            actor: 'Customer',
            metadata: {
              orderId: oId,
              itemPrice: item.price,
              customerId: req.customerId
            }
          });
        }
      }
    }
  } catch (invErr) {
    console.error('Failed to log inventory history on checkout:', invErr);
  }

  // Send real-time emails and create in-app notifications asynchronously
  (async () => {
    try {
      const emailService = require('./email.service');
      const notificationService = require('./notification.service');
      const User = require('../models/user.model');
      const customer = await Customer.findById(req.customerId).select('name email');

      for (const order of createdOrders) {
        const orderObj = order.toObject ? order.toObject() : order;
        const oId = orderObj.orderId || String(orderObj._id).slice(-8).toUpperCase();

        // 1. In-app notification for Customer
        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: req.customerId,
          title: `Order Placed Successfully! 🎉`,
          message: `Your order #${oId} with ${orderObj.items?.length || 1} item(s) worth ₹${Number(orderObj.totalAmount || 0).toLocaleString('en-IN')} has been placed.`,
          type: 'order_placed',
          orderId: oId,
          actionUrl: '/customer/orders'
        }).catch(e => console.error('[CartService] Customer notif error:', e.message));

        if (customer) {
          await emailService.sendOrderPlacedCustomerEmail({
            order: orderObj,
            customer,
            items: orderObj.items
          }).catch(e => console.error('[CartService] Customer email error:', e.message));
        }

        // 2. In-app notification for Vendor
        if (orderObj.vendorId) {
          await notificationService.createNotification({
            recipientType: 'vendor',
            recipientId: orderObj.vendorId,
            title: `New Order Received! 📦`,
            message: `You have received a new order #${oId} with ${orderObj.items?.length || 1} item(s) to fulfill.`,
            type: 'order_placed',
            orderId: oId,
            actionUrl: '/vendor/orders'
          }).catch(e => console.error('[CartService] Vendor notif error:', e.message));

          const vendor = await User.findById(orderObj.vendorId).select('name email');
          if (vendor) {
            await emailService.sendOrderPlacedVendorEmail({
              order: orderObj,
              vendor,
              vendorItems: orderObj.items
            }).catch(e => console.error('[CartService] Vendor email error:', e.message));
          }
        }
      }
    } catch (mailErr) {
      console.error('[CartService] Checkout email/notif error:', mailErr.message);
    }
  })();

  res.json({ orders: createdOrders, order: createdOrders[0] });
};
