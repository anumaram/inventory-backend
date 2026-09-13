const mongoose = require('mongoose');
require('./db');

const Notification = require('./models/notification.model');
const Order = require('./models/order.model');
const Customer = require('./models/customer.model');
const User = require('./models/user.model');
const Product = require('./models/product.model');
const { generateOrderId } = require('./utils/orderId.util');
const { generateInvoiceId } = require('./utils/invoiceId.util');

async function seed() {
  try {
    console.log('--- Starting Seeding Notifications & Order Requests ---');
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    // 1. Fetch Customers & Vendors
    const customers = await Customer.find().lean();
    if (!customers || customers.length === 0) {
      console.log('No customers found to seed.');
      process.exit(1);
    }
    const primaryCustomer = customers[0];
    const customerId = primaryCustomer._id;

    const vendors = await User.find({ role: 'vendor' }).lean();
    const primaryVendor = vendors[0] || null;
    const vendorId = primaryVendor ? primaryVendor._id : null;

    const products = await Product.find().limit(10).lean();
    if (products.length === 0) {
      console.log('No products found.');
      process.exit(1);
    }

    console.log(`Found Customer: ${primaryCustomer.name} (${primaryCustomer.email})`);
    if (primaryVendor) {
      console.log(`Found Vendor: ${primaryVendor.name} (${primaryVendor.email})`);
    }

    // 2. Prepare Sample Rich Orders
    const now = new Date();
    const prod1 = products[0];
    const prod2 = products[1] || products[0];
    const prod3 = products[2] || products[0];
    const prod4 = products[3] || products[0];

    const makeId = (seq) => `ORD${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100000 + Math.random() * 900000)}${seq}`;

    const sampleOrders = [
      // 1. Cancelled Order with Wallet Refund Credited
      {
        orderId: makeId('A'),
        customerId,
        vendorId: prod1.userId || vendorId,
        productId: prod1._id,
        items: [
          {
            productId: prod1._id,
            vendorId: prod1.userId || vendorId,
            name: prod1.name || 'Handcrafted Ceramic Vase Set',
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
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 4 * 3600 * 1000))
      },

      // 2. Delivered Order with Active Return Request
      {
        orderId: makeId('B'),
        customerId,
        vendorId: prod2.userId || vendorId,
        productId: prod2._id,
        items: [
          {
            productId: prod2._id,
            vendorId: prod2.userId || vendorId,
            name: prod2.name || 'Modern Geometric Area Rug',
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
        returnReason: 'Defective / Color mismatch with image',
        returnComments: 'The fabric shade is darker than shown in the catalog photo.',
        returnRequestedAt: new Date(now.getTime() - 6 * 3600 * 1000),
        refundAmount: Number(prod2.price || 3689),
        refundStatus: 'pending',
        createdAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 3 * 24 * 3600 * 1000))
      },

      // 3. Delivered Order with Approved Return & Refund Credited
      {
        orderId: makeId('C'),
        customerId,
        vendorId: prod3.userId || vendorId,
        productId: prod3._id,
        items: [
          {
            productId: prod3._id,
            vendorId: prod3.userId || vendorId,
            name: prod3.name || 'Smart Fitness Watch Series 7',
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
        returnReason: 'Incorrect size / accessory missing',
        returnComments: 'Replacement was not available, requested wallet refund.',
        returnRequestedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        refundAmount: Number(prod3.price || 2499),
        refundStatus: 'credited',
        createdAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 5 * 24 * 3600 * 1000))
      },

      // 4. Shipped Order
      {
        orderId: makeId('D'),
        customerId,
        vendorId: prod4.userId || vendorId,
        productId: prod4._id,
        items: [
          {
            productId: prod4._id,
            vendorId: prod4.userId || vendorId,
            name: prod4.name || 'Bluetooth Wireless Noise-Cancelling Headphones',
            vendorName: prod4.vendorName || 'Vera Lifestyle',
            qty: 1,
            price: Number(prod4.price || 1899),
            image: prod4.image || null
          }
        ],
        qty: 1,
        price: Number(prod4.price || 1899),
        subtotal: Number(prod4.price || 1899),
        deliveryFee: 0,
        couponDiscount: 0,
        totalAmount: Number(prod4.price || 1899),
        status: 'shipped',
        paymentMethod: 'card',
        createdAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
        invoiceId: generateInvoiceId(new Date(now.getTime() - 1 * 24 * 3600 * 1000))
      }
    ];

    const insertedOrders = await Order.insertMany(sampleOrders);
    console.log(`Inserted ${insertedOrders.length} test orders with cancelled, return, and refund statuses.`);

    // 3. Clear existing & Insert Sample In-App Notifications for Customer
    await Notification.deleteMany({ recipientId: customerId });

    const customerNotifs = [
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Refund Credited to Wallet 💰',
        message: `₹1,259.00 has been credited back to your Customer Wallet for cancelled order #${insertedOrders[0].orderId}.`,
        type: 'wallet_refund',
        orderId: insertedOrders[0].orderId,
        actionUrl: '/customer/settings',
        isRead: false,
        createdAt: new Date(now.getTime() - 15 * 60 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Return Request Approved ↩️',
        message: `Your return request for order #${insertedOrders[2].orderId} has been approved. ₹2,499.00 has been credited to your wallet.`,
        type: 'order_return_requested',
        orderId: insertedOrders[2].orderId,
        actionUrl: '/customer/orders',
        isRead: false,
        createdAt: new Date(now.getTime() - 45 * 60 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Return Request Received 📋',
        message: `Return request for order #${insertedOrders[1].orderId} was received. Courier pickup will be scheduled shortly.`,
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
        message: `Order #${insertedOrders[3].orderId} is on the way! Handed over to courier partner.`,
        type: 'order_shipped',
        orderId: insertedOrders[3].orderId,
        actionUrl: `/customer/orders/${insertedOrders[3].orderId}/track`,
        isRead: true,
        createdAt: new Date(now.getTime() - 12 * 3600 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Order Delivered 🎉',
        message: `Your order #${insertedOrders[1].orderId} has been safely delivered. We hope you enjoy it!`,
        type: 'order_delivered',
        orderId: insertedOrders[1].orderId,
        actionUrl: '/customer/orders',
        isRead: true,
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000)
      },
      {
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Weekend Super Deals Live 🔥',
        message: 'Explore up to 40% OFF on all Home & Furniture collection this weekend.',
        type: 'promo',
        actionUrl: '/customer',
        isRead: true,
        createdAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000)
      }
    ];

    await Notification.insertMany(customerNotifs);
    console.log(`Inserted ${customerNotifs.length} customer notifications.`);

    // 4. Insert Vendor Notifications if vendor exists
    if (vendorId) {
      await Notification.deleteMany({ recipientId: vendorId });
      const vendorNotifs = [
        {
          recipientType: 'vendor',
          recipientId: vendorId,
          title: 'Order Cancelled by Customer 🛑',
          message: `Order #${insertedOrders[0].orderId} was cancelled by customer. 1 item returned to stock.`,
          type: 'order_cancelled',
          orderId: insertedOrders[0].orderId,
          actionUrl: '/vendor/orders',
          isRead: false,
          createdAt: new Date(now.getTime() - 20 * 60 * 1000)
        },
        {
          recipientType: 'vendor',
          recipientId: vendorId,
          title: 'Return Requested by Customer ↩️',
          message: `Return request submitted for Order #${insertedOrders[1].orderId}. Reason: "Defective / Color mismatch"`,
          type: 'order_return_requested',
          orderId: insertedOrders[1].orderId,
          actionUrl: '/vendor/orders',
          isRead: false,
          createdAt: new Date(now.getTime() - 2 * 3600 * 1000)
        },
        {
          recipientType: 'vendor',
          recipientId: vendorId,
          title: 'New Order Received 🛒',
          message: `New purchase for ${prod4.name || 'Headphones'} in Order #${insertedOrders[3].orderId}.`,
          type: 'order_placed',
          orderId: insertedOrders[3].orderId,
          actionUrl: '/vendor/orders',
          isRead: true,
          createdAt: new Date(now.getTime() - 14 * 3600 * 1000)
        }
      ];

      await Notification.insertMany(vendorNotifs);
      console.log(`Inserted ${vendorNotifs.length} vendor notifications.`);
    }

    console.log('--- Seeding Completed Successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
