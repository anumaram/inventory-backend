const mongoose = require('mongoose');
require('./db');
const Order = require('./models/order.model');
const Return = require('./models/return.model');
const Customer = require('./models/customer.model');
const User = require('./models/user.model');
const Product = require('./models/product.model');

async function seedReturnsDemo() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }
    console.log('--- Seeding Comprehensive Returns & Reverse Logistics Demo Data ---');

    // 1. Identify primary test customer (Anshamma / jk)
    let customer = await Customer.findOne({ email: 'jkarumajji@gmail.com' });
    if (!customer) customer = await Customer.findOne({});
    console.log(`Using Customer: ${customer.name} (${customer.email}), ID: ${customer._id}`);

    // 2. Identify primary test vendors
    let anshaVendor = await User.findOne({ email: 'a@gmail.com' });
    let jkVendor = await User.findOne({ email: 'jk@gmail.com' });
    if (!anshaVendor) anshaVendor = await User.findOne({ role: 'vendor' });
    if (!jkVendor) jkVendor = anshaVendor;

    console.log(`Using Vendor 1: ${anshaVendor.name} (${anshaVendor.email}), ID: ${anshaVendor._id}`);
    console.log(`Using Vendor 2: ${jkVendor.name} (${jkVendor.email}), ID: ${jkVendor._id}`);

    // 3. Find some products for items
    const products = await Product.find({}).limit(10).lean();
    const p1 = products[0] || { name: 'Farm Fresh Milk 1L', price: 68, image: '' };
    const p2 = products[1] || { name: 'Organic Almonds 500g', price: 499, image: '' };
    const p3 = products[2] || { name: 'Fresh Red Apples 1kg', price: 129, image: '' };
    const p4 = products[3] || { name: 'Noise-Cancelling Headphones', price: 2999, image: '' };

    const now = new Date();

    // 4. Define our 7 targeted return demo states
    const demoConfigs = [
      {
        key: 'requested',
        status: 'requested',
        returnStatus: 'requested',
        orderStatus: 'delivered',
        refundStatus: 'pending',
        reason: 'Item defective or mismatch with catalog description',
        comments: 'The color and dimensions did not match what was displayed.',
        total: 129,
        vendor: anshaVendor,
        product: p3,
        note: 'Customer requested doorstep return. Awaiting vendor pickup authorization.'
      },
      {
        key: 'pickup_confirmed',
        status: 'pickup_confirmed',
        returnStatus: 'pickup_confirmed',
        orderStatus: 'delivered',
        refundStatus: 'pending',
        reason: 'Missing accessories or components in package',
        comments: 'Power cable and instructions manual were missing.',
        total: 499,
        vendor: anshaVendor,
        product: p2,
        note: 'Vendor approved return. Reverse courier partner assigned for doorstep pickup.'
      },
      {
        key: 'item_received',
        status: 'item_received',
        returnStatus: 'item_received',
        orderStatus: 'delivered',
        refundStatus: 'pending',
        reason: 'Device stopped functioning after first use',
        comments: 'Turned on once and now does not charge.',
        total: 2999,
        vendor: jkVendor,
        product: p4,
        note: 'Item received at merchant hub and logged for quality inspection.'
      },
      {
        key: 'quality_passed',
        status: 'quality_passed',
        returnStatus: 'quality_passed',
        orderStatus: 'delivered',
        refundStatus: 'pending',
        reason: 'Received wrong size / variant',
        comments: 'Ordered 1L pack, received 500ml pack.',
        total: 68,
        vendor: anshaVendor,
        product: p1,
        note: 'Quality check passed. Item verified in original condition and restocked to warehouse inventory.'
      },
      {
        key: 'refund_credited',
        status: 'refund_credited',
        returnStatus: 'refund_credited',
        orderStatus: 'returned',
        refundStatus: 'credited',
        reason: 'Order damaged in transit before delivery',
        comments: 'Seal was completely broken upon delivery.',
        total: 350,
        vendor: anshaVendor,
        product: p3,
        note: 'Refund amount credited directly to customer wallet.'
      },
      {
        key: 'cancelled',
        status: 'cancelled',
        returnStatus: 'cancelled',
        orderStatus: 'delivered',
        refundStatus: 'none',
        reason: 'Decided to keep the item after further inspection',
        comments: 'Issue resolved by customer. Cancellation confirmed before courier pickup.',
        total: 199,
        vendor: anshaVendor,
        product: p2,
        note: 'Customer cancelled the return request. Order remains Delivered.'
      },
      {
        key: 'rejected',
        status: 'rejected',
        returnStatus: 'rejected',
        orderStatus: 'delivered',
        refundStatus: 'none',
        reason: 'Physical damage outside warranty coverage',
        comments: 'Inspection team determined item was damaged by external drop.',
        total: 1499,
        vendor: jkVendor,
        product: p4,
        note: 'Return claim declined by merchant. Physical damage not covered under policy.'
      }
    ];

    // Find delivered orders we can associate or create
    const existingOrders = await Order.find({
      customerId: customer._id,
      status: { $in: ['delivered', 'returned'] }
    }).lean();

    console.log(`Found ${existingOrders.length} candidate customer delivered/returned orders.`);

    let orderIndex = 0;

    for (const cfg of demoConfigs) {
      let order = existingOrders[orderIndex++];
      
      // If we don't have enough delivered orders, create a dedicated delivered order
      if (!order) {
        const orderIdCode = `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
        order = await Order.create({
          orderId: orderIdCode,
          customerId: customer._id,
          vendorId: cfg.vendor._id,
          status: cfg.orderStatus,
          returnStatus: cfg.returnStatus,
          returnReason: cfg.reason,
          returnComments: cfg.comments,
          returnRequestedAt: now,
          refundAmount: cfg.total,
          refundStatus: cfg.refundStatus,
          totalAmount: cfg.total,
          subtotal: cfg.total,
          deliveryFee: 0,
          paymentMethod: 'wallet',
          shippingAddress: {
            fullName: customer.name || 'Anshamma',
            phone: customer.phone || '+91 98765 43210',
            addressLine1: 'Flat 402, Green Meadows',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500081'
          },
          items: [
            {
              productId: cfg.product._id,
              vendorId: cfg.vendor._id,
              name: cfg.product.name,
              vendorName: cfg.vendor.name,
              qty: 1,
              price: cfg.total
            }
          ],
          placedAt: new Date(now.getTime() - 48 * 3600 * 1000),
          statusTimestamps: {
            placed: new Date(now.getTime() - 48 * 3600 * 1000),
            delivered: new Date(now.getTime() - 12 * 3600 * 1000)
          }
        });
        console.log(`Created new order ${order.orderId} for state: ${cfg.key}`);
      } else {
        // Update existing order to match this demo state
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              status: cfg.orderStatus,
              returnStatus: cfg.returnStatus,
              returnReason: cfg.reason,
              returnComments: cfg.comments,
              returnRequestedAt: now,
              refundAmount: cfg.total,
              refundStatus: cfg.refundStatus,
              vendorId: cfg.vendor._id
            }
          }
        );
        console.log(`Updated order ${order.orderId || order._id} for state: ${cfg.key}`);
      }

      // Upsert return record in returns collection
      const orderIdStr = order.orderId || String(order._id).slice(-8).toUpperCase();
      let returnDoc = await Return.findOne({ orderRef: order._id, type: 'return' });

      const returnPayload = {
        orderRef: order._id,
        orderId: orderIdStr,
        customerId: customer._id,
        vendorId: cfg.vendor._id,
        type: 'return',
        status: cfg.status,
        reason: cfg.reason,
        comments: cfg.comments,
        items: [
          {
            productId: cfg.product._id,
            vendorId: cfg.vendor._id,
            name: cfg.product.name,
            vendorName: cfg.vendor.name,
            image: cfg.product.image || (Array.isArray(cfg.product.images) && cfg.product.images[0]) || null,
            qty: 1,
            price: cfg.total
          }
        ],
        totalAmount: cfg.total,
        refundAmount: cfg.total,
        refundMethod: 'wallet',
        refundStatus: cfg.refundStatus,
        isStockRestored: ['quality_passed', 'refund_credited', 'completed'].includes(cfg.status),
        requestedAt: now,
        timeline: [
          {
            status: 'requested',
            timestamp: new Date(now.getTime() - 6 * 3600 * 1000),
            note: 'Return request submitted by customer.',
            updatedBy: 'customer'
          },
          ...(cfg.status !== 'requested'
            ? [
                {
                  status: cfg.status,
                  timestamp: now,
                  note: cfg.note,
                  updatedBy: cfg.key === 'cancelled' ? 'customer' : 'vendor'
                }
              ]
            : [])
        ]
      };

      if (!returnDoc) {
        returnDoc = await Return.create(returnPayload);
        console.log(`Created Return ${returnDoc.returnId} [${cfg.status}] for Order ${orderIdStr}`);
      } else {
        await Return.updateOne({ _id: returnDoc._id }, { $set: returnPayload });
        console.log(`Updated Return ${returnDoc.returnId} to [${cfg.status}] for Order ${orderIdStr}`);
      }
    }

    // Also ensure customer has at least 1 pristine DELIVERED order with NO returnStatus
    // so they can test requesting a return from scratch
    const pristineDelivered = await Order.findOne({
      customerId: customer._id,
      status: 'delivered',
      $or: [{ returnStatus: { $exists: false } }, { returnStatus: 'none' }]
    });

    if (!pristineDelivered) {
      const freshOrderId = `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
      await Order.create({
        orderId: freshOrderId,
        customerId: customer._id,
        vendorId: anshaVendor._id,
        status: 'delivered',
        returnStatus: 'none',
        refundAmount: 0,
        refundStatus: 'none',
        totalAmount: 150,
        subtotal: 150,
        deliveryFee: 0,
        paymentMethod: 'upi',
        shippingAddress: {
          fullName: customer.name || 'Anshamma',
          phone: customer.phone || '+91 98765 43210',
          addressLine1: 'Flat 402, Green Meadows',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500081'
        },
        items: [
          {
            productId: p3._id,
            vendorId: anshaVendor._id,
            name: p3.name,
            vendorName: anshaVendor.name,
            qty: 1,
            price: 150
          }
        ],
        placedAt: new Date(now.getTime() - 72 * 3600 * 1000),
        statusTimestamps: {
          placed: new Date(now.getTime() - 72 * 3600 * 1000),
          delivered: new Date(now.getTime() - 24 * 3600 * 1000)
        }
      });
      console.log(`Created pristine delivered order ${freshOrderId} for fresh return request testing.`);
    }

    console.log('\n--- Returns Demo Seeding Completed Successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedReturnsDemo();

