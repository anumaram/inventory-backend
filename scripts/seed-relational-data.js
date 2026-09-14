/**
 * seed-relational-data.js
 * Inserts interconnected, relational data across MongoDB:
 * - Warehouses (Distribution centers)
 * - Support Tickets (with full message threads linked to Customers & Orders)
 * - Inventory Transfers (between Warehouses with real Products)
 * - Promotions & Campaigns
 * - Product Reviews (linked to Customers & Products)
 * - Audit Logs (Admin actions)
 */

const mongoose = require('mongoose');
require('../db');

const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Warehouse = require('../models/warehouse.model');
const InventoryTransfer = require('../models/inventory-transfer.model');
const SupportTicket = require('../models/support-ticket.model');
const Promotion = require('../models/promotion.model');
const Review = require('../models/review.model');
const AuditLog = require('../models/audit-log.model');

async function seedRelationalData() {
  console.log('--- Starting Relational Data Seeding ---');

  // Wait for mongoose connection
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
  }

  // 1. Fetch existing entities
  const customers = await Customer.find().limit(20);
  const vendors = await User.find({ isDeleted: { $ne: true } }).limit(20);
  const orders = await Order.find().limit(30);
  const products = await Product.find().limit(40);

  console.log(`Found: ${customers.length} customers, ${vendors.length} vendors, ${orders.length} orders, ${products.length} products`);

  if (customers.length === 0 || products.length === 0) {
    console.warn('Warning: Need at least 1 customer and 1 product to create relational links.');
  }

  // 2. Seed Warehouses
  console.log('Seeding Warehouses...');
  const warehouseData = [
    {
      code: 'WH-BLR-01',
      name: 'Bengaluru Central Fulfillment Center',
      location: 'Peenya Industrial Area Phase II',
      address: 'Plot 42, 4th Cross Road, Peenya',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560058',
      contactPerson: 'Kavitha Raman',
      contactPhone: '+91 98450 12345',
      capacity: 65000,
      currentStockCount: 42300,
      isActive: true
    },
    {
      code: 'WH-BOM-02',
      name: 'Mumbai West Logistics Hub',
      location: 'Bhiwandi Logistics Park',
      address: 'Shed 12B, Mankoli Naka, Bhiwandi',
      city: 'Thane / Mumbai',
      state: 'Maharashtra',
      pincode: '421302',
      contactPerson: 'Rajesh Sharma',
      contactPhone: '+91 98201 67890',
      capacity: 80000,
      currentStockCount: 58900,
      isActive: true
    },
    {
      code: 'WH-DEL-03',
      name: 'Delhi NCR Mega Warehouse',
      location: 'Bilaspur Logistics Zone',
      address: 'NH-48 Milestone 54, Pataudi Road',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
      contactPerson: 'Amitabh Verma',
      contactPhone: '+91 98110 44321',
      capacity: 90000,
      currentStockCount: 67100,
      isActive: true
    },
    {
      code: 'WH-HYD-04',
      name: 'Hyderabad South Logistics Park',
      location: 'Shamshabad Aero Park',
      address: 'Survey 142/A, Airport Corridor',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '501218',
      contactPerson: 'Srinivas Reddy',
      contactPhone: '+91 98490 88990',
      capacity: 45000,
      currentStockCount: 31400,
      isActive: true
    }
  ];

  const warehouses = [];
  for (const w of warehouseData) {
    let existing = await Warehouse.findOne({ code: w.code });
    if (!existing) {
      existing = await Warehouse.create(w);
      console.log(`+ Created Warehouse: ${w.code} (${w.name})`);
    }
    warehouses.push(existing);
  }

  // 3. Seed Inventory Transfers
  if (warehouses.length >= 2 && products.length > 0) {
    console.log('Seeding Inventory Transfers...');
    const existingTransfers = await InventoryTransfer.countDocuments();
    if (existingTransfers < 5) {
      const transferTemplates = [
        {
          transferId: 'TRF-2024-001',
          from: warehouses[0],
          to: warehouses[1],
          status: 'completed',
          initiatedBy: 'Operations Manager',
          notes: 'Emergency stock replenishment for Western Region sales fest'
        },
        {
          transferId: 'TRF-2024-002',
          from: warehouses[1],
          to: warehouses[2],
          status: 'in_transit',
          initiatedBy: 'Supply Chain Lead',
          notes: 'High-demand electronics rebalancing'
        },
        {
          transferId: 'TRF-2024-003',
          from: warehouses[2],
          to: warehouses[3],
          status: 'pending',
          initiatedBy: 'Inventory Controller',
          notes: 'Quarterly stock transfer to Southern hub'
        },
        {
          transferId: 'TRF-2024-004',
          from: warehouses[3],
          to: warehouses[0],
          status: 'completed',
          initiatedBy: 'Supply Chain Lead',
          notes: 'Surplus accessories returned to main distribution center'
        },
        {
          transferId: 'TRF-2024-005',
          from: warehouses[0],
          to: warehouses[2],
          status: 'in_transit',
          initiatedBy: 'Operations Manager',
          notes: 'Flagship launch inventory positioning'
        },
        {
          transferId: 'TRF-2024-006',
          from: warehouses[1],
          to: warehouses[3],
          status: 'completed',
          initiatedBy: 'Supply Chain Lead',
          notes: 'Festival stock pre-allocation'
        }
      ];

      for (let i = 0; i < transferTemplates.length; i++) {
        const t = transferTemplates[i];
        const existing = await InventoryTransfer.findOne({ transferId: t.transferId });
        if (!existing) {
          const sampleProd1 = products[i % products.length];
          const sampleProd2 = products[(i + 1) % products.length];
          const items = [
            { productId: sampleProd1._id, productName: sampleProd1.name || 'Product A', quantity: 25 },
            { productId: sampleProd2._id, productName: sampleProd2.name || 'Product B', quantity: 15 }
          ];

          await InventoryTransfer.create({
            transferId: t.transferId,
            fromWarehouseId: t.from._id,
            toWarehouseId: t.to._id,
            items,
            totalQuantity: 40,
            status: t.status,
            initiatedBy: t.initiatedBy,
            notes: t.notes,
            dispatchedAt: t.status !== 'pending' ? new Date(Date.now() - 3 * 86400000) : null,
            receivedAt: t.status === 'completed' ? new Date(Date.now() - 86400000) : null
          });
          console.log(`+ Created Transfer: ${t.transferId} (${t.status})`);
        }
      }
    }
  }

  // 4. Seed Support Tickets (15 tickets with message threads)
  console.log('Seeding Support Tickets...');
  const existingTickets = await SupportTicket.countDocuments();
  if (existingTickets < 10 && customers.length > 0) {
    const ticketConfigs = [
      {
        subject: 'Delay in delivery for flagship smartphone order',
        category: 'delivery',
        priority: 'high',
        status: 'in_progress',
        messages: [
          { sender: 'user', text: 'Hello, my order was expected yesterday but tracking shows it is still in transit at Bhiwandi hub. Please update ASAP.' },
          { sender: 'admin', text: 'Hi! We checked with our logistics partner BlueDart. Due to heavy rains in Mumbai, shipments experienced a 12-hour delay. Your package is currently out for delivery today.' },
          { sender: 'user', text: 'Thank you for the quick check. I will be available to receive it.' }
        ]
      },
      {
        subject: 'Wrong size received for running sneakers',
        category: 'order',
        priority: 'medium',
        status: 'open',
        messages: [
          { sender: 'user', text: 'I ordered UK size 9, but received UK size 8 in the package. Box says 9, but inner shoe tag says 8.' }
        ]
      },
      {
        subject: 'Double charge on UPI payment during checkout',
        category: 'payment',
        priority: 'urgent',
        status: 'resolved',
        messages: [
          { sender: 'user', text: 'My Google Pay was debited twice (Rs 4,999 x 2) for order ORD-8841. Please check transaction reference.' },
          { sender: 'admin', text: 'We have verified with Razorpay gateway. The duplicate charge has been automatically reversed to your bank account. RRN: 428910023412. Usually reflects within 24-48 hours.' },
          { sender: 'user', text: 'Amount received back in account. Thank you very much!' }
        ]
      },
      {
        subject: 'Refund not credited to wallet after cancellation',
        category: 'refund',
        priority: 'high',
        status: 'in_progress',
        messages: [
          { sender: 'user', text: 'I cancelled my headphones order 2 hours ago. When will the wallet balance be updated?' },
          { sender: 'admin', text: 'Our team is reviewing the refund queue. We will manually trigger the wallet credit for you within 30 minutes.' }
        ]
      },
      {
        subject: 'Request to update shipping address before dispatch',
        category: 'order',
        priority: 'urgent',
        status: 'resolved',
        messages: [
          { sender: 'user', text: 'I made a typo in my apartment number. It should be Flat 402, Tower B instead of Flat 204.' },
          { sender: 'admin', text: 'Address has been updated in the warehouse dispatch manifest. Tracking number BlueDart 873912901.' }
        ]
      },
      {
        subject: 'Warranty claim registration assistance',
        category: 'account',
        priority: 'low',
        status: 'closed',
        messages: [
          { sender: 'user', text: 'Where can I download the official tax invoice with GST details for brand warranty registration?' },
          { sender: 'admin', text: 'You can download GST tax invoice directly from Orders -> Order Details -> Download Tax Invoice button.' }
        ]
      },
      {
        subject: 'Vendor query: Settlement payout schedule confirmation',
        category: 'payment',
        priority: 'medium',
        status: 'resolved',
        isVendor: true,
        messages: [
          { sender: 'user', text: 'Could you confirm whether the net settlement for August batch will be credited on the 1st or 5th?' },
          { sender: 'admin', text: 'All approved merchant settlements are disbursed on the 1st of every calendar month automatically.' }
        ]
      },
      {
        subject: 'Damaged outer packaging upon courier handover',
        category: 'delivery',
        priority: 'high',
        status: 'open',
        messages: [
          { sender: 'user', text: 'The courier delivery agent handed over a package with torn outer seal. I took unboxing photos before opening.' }
        ]
      },
      {
        subject: 'Coupon code FESTIVE20 not applying at cart',
        category: 'other',
        priority: 'low',
        status: 'closed',
        messages: [
          { sender: 'user', text: 'I got promotional SMS with FESTIVE20, but it says invalid at checkout.' },
          { sender: 'admin', text: 'FESTIVE20 has a minimum cart value requirement of Rs 2,500. We have applied a custom Rs 300 voucher to your wallet.' },
          { sender: 'user', text: 'Awesome customer support, thanks!' }
        ]
      },
      {
        subject: 'Inquiry regarding corporate bulk purchase discount',
        category: 'other',
        priority: 'medium',
        status: 'in_progress',
        messages: [
          { sender: 'user', text: 'We are looking to purchase 50 units of MacBook Air M3 for our engineering team. Is there a B2B discount?' },
          { sender: 'admin', text: 'Forwarded to our B2B Key Accounts lead. They will email corporate quotation within today.' }
        ]
      },
      {
        subject: 'Unable to update registered mobile phone number',
        category: 'account',
        priority: 'medium',
        status: 'resolved',
        messages: [
          { sender: 'user', text: 'OTP is not coming to my old number since SIM is inactive.' },
          { sender: 'admin', text: 'Identity verified via registered email. Mobile number updated to your new primary number.' }
        ]
      },
      {
        subject: 'Product arrived with missing USB-C charging cable',
        category: 'order',
        priority: 'medium',
        status: 'in_progress',
        messages: [
          { sender: 'user', text: 'Box was sealed but the 65W GaN adapter only had the brick, charging cable was missing.' }
        ]
      }
    ];

    for (let i = 0; i < ticketConfigs.length; i++) {
      const cfg = ticketConfigs[i];
      const ticketId = `TKT-${String(1001 + i)}`;
      const existing = await SupportTicket.findOne({ ticketId });
      if (!existing) {
        const cust = customers[i % customers.length];
        const vend = vendors[i % vendors.length];
        const relatedOrder = orders[i % orders.length];

        const ticketDoc = {
          ticketId,
          userType: cfg.isVendor ? 'vendor' : 'customer',
          customerId: cfg.isVendor ? null : cust._id,
          vendorId: cfg.isVendor ? vend._id : null,
          userName: cfg.isVendor ? (vend.name || 'Vendor Partner') : (cust.name || 'Customer'),
          userEmail: cfg.isVendor ? (vend.email || '') : (cust.email || ''),
          orderId: relatedOrder ? (relatedOrder.orderId || String(relatedOrder._id).slice(-8)) : '',
          subject: cfg.subject,
          category: cfg.category,
          priority: cfg.priority,
          status: cfg.status,
          messages: cfg.messages.map(m => ({
            sender: m.sender,
            senderName: m.sender === 'admin' ? 'Support Desk Specialist' : (cfg.isVendor ? vend.name : cust.name),
            text: m.text,
            createdAt: new Date(Date.now() - (10 - i) * 3600000)
          })),
          assignedTo: 'Tier 2 Support Specialist',
          resolvedAt: cfg.status === 'resolved' || cfg.status === 'closed' ? new Date() : null
        };

        await SupportTicket.create(ticketDoc);
        console.log(`+ Created Support Ticket: ${ticketId} - "${cfg.subject.slice(0, 30)}..."`);
      }
    }
  }

  // 5. Seed Promotions & Campaigns
  console.log('Seeding Promotions & Campaigns...');
  const existingPromos = await Promotion.countDocuments();
  if (existingPromos < 5) {
    const promoList = [
      {
        title: 'Mega Festive Electronics Fest',
        tagline: 'Up to 40% OFF on Top Laptops, Flagship Phones & Audio',
        discountPercent: 35,
        badgeText: 'MEGA SALE',
        targetCategory: 'Electronics',
        bannerImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(Date.now() - 5 * 86400000),
        endDate: new Date(Date.now() + 25 * 86400000),
        isActive: true
      },
      {
        title: 'Audio & Wireless Headphones Bonanza',
        tagline: 'Immerse in pure sound with Sony, Bose, Sennheiser & Apple',
        discountPercent: 25,
        badgeText: 'HOT DEAL',
        targetCategory: 'Audio',
        bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(Date.now() - 2 * 86400000),
        endDate: new Date(Date.now() + 14 * 86400000),
        isActive: true
      },
      {
        title: 'Premium Flagship Smartphone Upgrade',
        tagline: 'Exchange your old device with bonus exchange credit',
        discountPercent: 18,
        badgeText: 'EXCHANGE BONUS',
        targetCategory: 'Mobiles',
        bannerImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(Date.now() - 10 * 86400000),
        endDate: new Date(Date.now() + 20 * 86400000),
        isActive: true
      },
      {
        title: 'Next-Gen Gaming & Console Showcase',
        tagline: 'PlayStation 5, Xbox Series X, Nintendo Switch OLED deals',
        discountPercent: 20,
        badgeText: 'GAMING HUB',
        targetCategory: 'Gaming',
        bannerImage: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        isActive: true
      },
      {
        title: 'Sneakers & Streetwear Vault',
        tagline: 'Air Jordans, Dunks, Samba, Yeezy authentic stock',
        discountPercent: 15,
        badgeText: 'LIMITED DROP',
        targetCategory: 'Fashion',
        bannerImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(Date.now() - 1 * 86400000),
        endDate: new Date(Date.now() + 10 * 86400000),
        isActive: true
      },
      {
        title: 'Smart Home & Dyson Living',
        tagline: 'Modernize your living space with smart purifiers and vacuums',
        discountPercent: 22,
        badgeText: 'LUXURY LIVING',
        targetCategory: 'Appliances',
        bannerImage: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=1200&auto=format&fit=crop&q=80',
        startDate: new Date(),
        endDate: new Date(Date.now() + 18 * 86400000),
        isActive: true
      }
    ];

    for (const p of promoList) {
      const existing = await Promotion.findOne({ title: p.title });
      if (!existing) {
        await Promotion.create(p);
        console.log(`+ Created Promotion: "${p.title}"`);
      }
    }
  }

  // 6. Seed Product Reviews
  console.log('Seeding Product Reviews...');
  const existingReviews = await Review.countDocuments();
  if (existingReviews < 15 && products.length > 0 && customers.length > 0) {
    const reviewTemplates = [
      { rating: 5, title: 'Phenomenal build quality and battery life!', comment: 'Exceeded all my expectations. The build is rock solid, display is buttery smooth 120Hz, and battery easily lasts 1.5 days of heavy productivity use.' },
      { rating: 5, title: 'Best purchase of this year, completely authentic.', comment: 'Was skeptical about ordering high-value electronics online, but came in original factory seal with valid manufacturer warranty. Delivery was super fast.' },
      { rating: 4, title: 'Great performance, slightly warm under extreme gaming.', comment: 'Very capable device. Handles everyday 4K video editing effortlessly. Only gets slightly warm during extended Cinebench runs.' },
      { rating: 5, title: 'Soundstage is unbelievably clear and immersive.', comment: 'Noise cancellation is wizardry on flights. Crisp highs, punchy sub-bass without muddying vocals. 10/10 recommendation.' },
      { rating: 4, title: 'Premium aesthetics and super comfortable fit.', comment: 'Matches the description perfectly. Fits true to size and styling turns heads everywhere. Fast BlueDart delivery.' },
      { rating: 5, title: 'Worth every single penny.', comment: 'Seamless ecosystem integration, flawless camera clarity in low light, and top tier customer support experience.' },
      { rating: 4, title: 'Solid everyday workhorse device.', comment: 'Quick charging works like a charm. 0 to 80% in under 30 minutes. Good overall value for the price point.' }
    ];

    for (let i = 0; i < Math.min(products.length, 25); i++) {
      const prod = products[i];
      const cust = customers[i % customers.length];
      const tmpl = reviewTemplates[i % reviewTemplates.length];

      const existing = await Review.findOne({ productId: prod._id, customerId: cust._id });
      if (!existing) {
        await Review.create({
          productId: prod._id,
          customerId: cust._id,
          customerName: cust.name || 'Verified Buyer',
          rating: tmpl.rating,
          title: tmpl.title,
          comment: tmpl.comment,
          isVerifiedPurchase: true
        });
        console.log(`+ Review on "${(prod.name || 'Product').slice(0, 25)}" by ${cust.name || 'Customer'}`);
      }
    }
  }

  // 7. Seed Audit Logs
  console.log('Seeding Audit Logs...');
  const existingAudits = await AuditLog.countDocuments();
  if (existingAudits < 15) {
    const auditEvents = [
      { action: 'ADMIN_LOGIN_SUCCESS', entityType: 'auth', details: 'Admin logged in from corporate IP 192.168.1.10' },
      { action: 'SETTINGS_UPDATE', entityType: 'settings', details: 'Updated standard platform tax rate to 18% GST' },
      { action: 'WAREHOUSE_CREATED', entityType: 'warehouse', details: 'Provisioned new regional logistics hub WH-BLR-01' },
      { action: 'INVENTORY_TRANSFER_DISPATCHED', entityType: 'warehouse', details: 'Dispatched 40 units in transfer TRF-2024-001' },
      { action: 'COUPON_GENERATED', entityType: 'coupon', details: 'Created festive promotional coupon FESTIVE25' },
      { action: 'PROMOTION_LAUNCHED', entityType: 'promotion', details: 'Published Mega Festive Electronics Fest campaign' },
      { action: 'SUPPORT_TICKET_RESOLVED', entityType: 'ticket', details: 'Resolved UPI reconciliation query TKT-1003' },
      { action: 'REFUND_PROCESSED_WALLET', entityType: 'refund', details: 'Admin authorized refund of ₹ 4,999 to customer wallet' },
      { action: 'VENDOR_STATUS_VERIFIED', entityType: 'vendor', details: 'Completed GSTIN and KYC verification for merchant' },
      { action: 'PRODUCT_PRICE_UPDATED', entityType: 'product', details: 'Adjusted MSRP and flash deal discount for flagship device' },
      { action: 'CRON_MONTHLY_STATEMENT_CHECK', entityType: 'cron_scheduler', details: 'Evaluated automated calendar cycle for 1st of month' },
      { action: 'SECURITY_AUDIT_PASSED', entityType: 'system', details: 'Routine system security scan completed with 0 vulnerabilities' }
    ];

    for (let i = 0; i < auditEvents.length; i++) {
      const ev = auditEvents[i];
      await AuditLog.create({
        adminName: 'Chief Security Officer',
        action: ev.action,
        entityType: ev.entityType,
        entityId: `AUDIT-${1000 + i}`,
        details: ev.details,
        ipAddress: '103.24.188.42',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
        meta: { timestamp: new Date(Date.now() - (15 - i) * 7200000) }
      });
    }
    console.log(`+ Seeded ${auditEvents.length} Audit Log events.`);
  }

  console.log('--- Relational Data Seeding Completed Successfully ---');
  process.exit(0);
}

seedRelationalData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

