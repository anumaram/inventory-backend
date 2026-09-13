const mongoose = require('mongoose');
require('./db');

const Notification = require('./models/notification.model');
const Order = require('./models/order.model');
const Customer = require('./models/customer.model');
const User = require('./models/user.model');
const Product = require('./models/product.model');
const { generateInvoiceId } = require('./utils/invoiceId.util');

async function seedForCustomer() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    const customerId = new mongoose.Types.ObjectId('6aa1a7dfbb5a7aeb3ecac6d6');
    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      console.error('Customer 6aa1a7dfbb5a7aeb3ecac6d6 not found!');
      process.exit(1);
    }

    console.log(`Seeding data for customer: ${customer.name} (${customer.email}) - ID: ${customer._id}`);

    // Fetch vendor & sample products
    const vendors = await User.find({ role: 'vendor' }).lean();
    const primaryVendor = vendors[0] || null;
    const vendorId = primaryVendor ? primaryVendor._id : null;

    const products = await Product.find().limit(8).lean();
    if (products.length === 0) {
      console.error('No products found.');
      process.exit(1);
    }

    const now = new Date();
    const makeId = (seq) => `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100000 + Math.random() * 900000)}${seq}`;

    const prod1 = products[0];
    const prod2 = products[1] || products[0];
    const prod3 = products[2] || products[0];
    const prod4 = products[3] || products[0];

    // 1. Create Sample Orders
    const sampleOrders = [
      // Order 1: Cancelled Order with Instant Wallet Refund Credited
      {
        orderId: makeId('1'),
        customerId,
        vendorId: prod1.userId || vendorId,
        productId: prod1._id,
        items: [
          {
            productId: prod1._id,
            vendorId: prod1.userId || vendorId,
            name: prod1.name || 'Handcrafted Ceramic Table Flower Vase Set of 3',
            vendorName: prod1.vendorName || 'Vera Lifestyle',
            qty: 1,
            price: Number(prod1.price || 1259),
            image: prod1.image || null
          }
        ],
        qty: 1,
        price: Number(prod1.price || 1259),
        subtotal: Number(prod1.price || 1259),
        deliveryFee: 0,
        couponDiscount: 0,
        totalAmount: Number(prod1.price || 1259),
        status: 'cancelled',
        paymentMethod: 'wallet',
        refundAmount: Number(prod1.price || 1259),
        refundStatus: 'credited',
        cancellationReason: 'Ordered by mistake / duplicate item',
        cancelledAt: new Date(now.getTime() - 2 * 3600 * 1000),
        cancelledBy: 'customer',
        createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 5 * 3600 * 1000))
      },

      // Order 2: Delivered Order with Return Requested (Pending Refund)
      {
        orderId: makeId('2'),
        customerId,
        vendorId: prod2.userId || vendorId,
        productId: prod2._id,
        items: [
          {
            productId: prod2._id,
            vendorId: prod2.userId || vendorId,
            name: prod2.name || 'Modern Geometric Turkish Area Rug 5x7 Feet',
            vendorName: prod2.vendorName || 'Vera Lifestyle',
            qty: 1,
            price: Number(prod2.price || 3689),
            image: prod2.image || null
          }
        ],
        qty: 1,
        price: Number(prod2.price || 3689),
        subtotal: Number(prod2.price || 3689),
        deliveryFee: 0,
        couponDiscount: 0,
        totalAmount: Number(prod2.price || 3689),
        status: 'delivered',
        paymentMethod: 'card',
        returnStatus: 'requested',
        returnReason: 'Defective / Color mismatch with catalog',
        returnComments: 'Fabric shade looks darker than depicted in the product photos.',
        returnRequestedAt: new Date(now.getTime() - 4 * 3600 * 1000),
        refundAmount: Number(prod2.price || 3689),
        refundStatus: 'pending',
        createdAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 2 * 24 * 3600 * 1000))
      },

      // Order 3: Delivered Order with Approved Return (Wallet Refund Credited)
      {
        orderId: makeId('3'),
        customerId,
        vendorId: prod3.userId || vendorId,
        productId: prod3._id,
        items: [
          {
            productId: prod3._id,
            vendorId: prod3.userId || vendorId,
            name: prod3.name || 'Premium Running Shoes Classic Edition',
            vendorName: prod3.vendorName || 'Vera Lifestyle',
            qty: 1,
            price: Number(prod3.price || 2499),
            image: prod3.image || null
          }
        ],
        qty: 1,
        price: Number(prod3.price || 2499),
        subtotal: Number(prod3.price || 2499),
        deliveryFee: 0,
        couponDiscount: 0,
        totalAmount: Number(prod3.price || 2499),
        status: 'returned',
        paymentMethod: 'wallet',
        returnStatus: 'approved',
        returnReason: 'Wrong size delivered / packaging damaged',
        returnComments: 'Received UK 8 instead of UK 9. Return approved and refunded.',
        returnRequestedAt: new Date(now.getTime() - 24 * 3600 * 1000),
        refundAmount: Number(prod3.price || 2499),
        refundStatus: 'credited',
        createdAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 4 * 24 * 3600 * 1000))
      },

      // Order 4: Shipped Order
      {
        orderId: makeId('4'),
        customerId,
        vendorId: prod4.userId || vendorId,
        productId: prod4._id,
        items: [
          {
            productId: prod4._id,
            vendorId: prod4.userId || vendorId,
            name: prod4.name || 'Casual Travel Backpack Waterproof',
            vendorName: prod4.vendorName || 'Vera Lifestyle',
            qty: 1,
            price: Number(prod4.price || 899),
            image: prod4.image || null
          }
        ],
        qty: 1,
        price: Number(prod4.price || 899),
        subtotal: Number(prod4.price || 899),
        deliveryFee: 0,
        couponDiscount: 0,
        totalAmount: Number(prod4.price || 899),
        status: 'shipped',
        paymentMethod: 'upi',
        createdAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 1 * 24 * 3600 * 1000))
      }
    ];

    const insertedOrders = await Order.insertMany(sampleOrders);
    console.log(`Successfully created ${insertedOrders.length} orders for ${customer.name}.`);

    // 2. Clear & Seed Notifications for this Customer
    await Notification.deleteMany({ recipientId: customerId });

    const notifs = [
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Refund Credited to Wallet 💰',
        message: `₹1,259.00 has been credited to your Customer Wallet for cancelled order #${insertedOrders[0].orderId}.`,
        type: 'wallet_refund',
        orderId: insertedOrders[0].orderId,
        actionUrl: '/customer/settings',
        isRead: false,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Return Request Approved ↩️',
        message: `Your return request for order #${insertedOrders[2].orderId} was approved. ₹2,499.00 has been refunded to your wallet.`,
        type: 'order_return_requested',
        orderId: insertedOrders[2].orderId,
        actionUrl: '/customer/orders',
        isRead: false,
        createdAt: new Date(now.getTime() - 35 * 60 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Return Request Received 📋',
        message: `We received your return request for order #${insertedOrders[1].orderId}. Courier pickup scheduled within 24-48 hours.`,
        type: 'order_return_requested',
        orderId: insertedOrders[1].orderId,
        actionUrl: '/customer/orders',
        isRead: false,
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Order Shipped 🚚',
        message: `Order #${insertedOrders[3].orderId} is on the way with courier partner. Track live updates!`,
        type: 'order_shipped',
        orderId: insertedOrders[3].orderId,
        actionUrl: `/customer/orders/${insertedOrders[3].orderId}/track`,
        isRead: true,
        createdAt: new Date(now.getTime() - 14 * 3600 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Order Delivered 🎉',
        message: `Your package for order #${insertedOrders[1].orderId} was safely delivered.`,
        type: 'order_delivered',
        orderId: insertedOrders[1].orderId,
        actionUrl: '/customer/orders',
        isRead: true,
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Weekend Special Discounts 🔥',
        message: 'Exclusive 20% cashback on all electronics & footwear items today only!',
        type: 'promo',
        actionUrl: '/customer',
        isRead: true,
        createdAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000)
      }
    ];

    await Notification.insertMany(notifs);
    console.log(`Successfully created ${notifs.length} in-app notifications for ${customer.name}.`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedForCustomer();

