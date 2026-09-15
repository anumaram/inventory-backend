const mongoose = require('mongoose');
require('../db');
const Coupon = require('../models/coupon.model');

const betterCoupons = [
  {
    code: 'MEGA25',
    title: 'Mega 25% Savings',
    description: 'Get 25% instant discount up to ₹1,500 on all orders of ₹1,499 and above.',
    discountType: 'percentage',
    discountValue: 25,
    minOrderAmount: 1499,
    maxDiscountAmount: 1500,
    usageLimit: 500,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'SUPER500',
    title: 'Flat ₹500 Mega Cash Off',
    description: 'Flat ₹500 instant discount on orders of ₹2,499 and above. Valid on all categories!',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 2499,
    maxDiscountAmount: 500,
    usageLimit: 300,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'PREMIUM1000',
    title: 'Elite ₹1,000 Cash Voucher',
    description: 'Huge savings! Flat ₹1,000 discount on premium electronics, smartphones & lifestyle carts above ₹4,999.',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderAmount: 4999,
    maxDiscountAmount: 1000,
    usageLimit: 200,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'VIP2500',
    title: 'VIP Privilege ₹2,500 OFF',
    description: 'Exclusive luxury tier discount! Flat ₹2,500 OFF on orders of ₹9,999 and above.',
    discountType: 'fixed',
    discountValue: 2500,
    minOrderAmount: 9999,
    maxDiscountAmount: 2500,
    usageLimit: 100,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'FESTIVE750',
    title: 'Festive Flash Deal ₹750 OFF',
    description: 'Festival mega savings! Flat ₹750 off on festival orders above ₹3,499.',
    discountType: 'fixed',
    discountValue: 750,
    minOrderAmount: 3499,
    maxDiscountAmount: 750,
    usageLimit: 500,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'GADGET15',
    title: 'Tech & Audio 15% OFF',
    description: 'Save 15% up to ₹3,000 on high-performance gadgets, headphones, and home audio.',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 999,
    maxDiscountAmount: 3000,
    usageLimit: 400,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'WELCOME30',
    title: 'Welcome 30% OFF First Order',
    description: 'Welcome reward! 30% discount up to ₹600 on your first shopping journey (min ₹499).',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 499,
    maxDiscountAmount: 600,
    usageLimit: 1000,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'FLASH300',
    title: 'Flash Deal ₹300 OFF',
    description: 'Quick savings! Flat ₹300 off on every cart of ₹1,299 or more.',
    discountType: 'fixed',
    discountValue: 300,
    minOrderAmount: 1299,
    maxDiscountAmount: 300,
    usageLimit: 500,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'FREESHIP',
    title: 'Zero Delivery Fee',
    description: 'Enjoy 100% Free Express Delivery straight to your doorstep on orders of ₹299 and above.',
    discountType: 'fixed',
    discountValue: 40,
    minOrderAmount: 299,
    maxDiscountAmount: 40,
    usageLimit: 2000,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  },
  {
    code: 'HUB10',
    title: '10% Storewide Unlimited',
    description: '10% instant savings on your entire cart with no minimum purchase requirement, up to ₹5,000!',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 5000,
    usageLimit: 2000,
    usageCount: 0,
    expiryDate: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    isDeleted: false
  }
];

async function updateCoupons() {
  try {
    console.log('Connecting to database and updating coupons...');
    // Upsert each better coupon
    for (const c of betterCoupons) {
      await Coupon.findOneAndUpdate(
        { code: c.code },
        { $set: c },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`✓ Upserted: ${c.code} (${c.title}) - ${c.discountType === 'percentage' ? `${c.discountValue}% (up to ₹${c.maxDiscountAmount})` : `₹${c.discountValue} OFF`}`);
    }

    // Deactivate/remove old tiny low-value coupons (SHOP50, WELCOME50, WELCOME100, FESTIVE100)
    const oldCodes = ['SHOP50', 'WELCOME50', 'WELCOME100', 'FESTIVE100'];
    const deactivated = await Coupon.updateMany(
      { code: { $in: oldCodes } },
      { $set: { isActive: false, isDeleted: true } }
    );
    console.log(`Deactivated ${deactivated.modifiedCount} outdated low-value coupons (${oldCodes.join(', ')}).`);

    const allActive = await Coupon.find({ isActive: true, isDeleted: { $ne: true } }).sort({ minOrderAmount: 1 });
    console.log('\n--- ACTIVE HIGH-VALUE PLATFORM COUPONS ---');
    allActive.forEach(c => {
      console.log(`• [${c.code}] ${c.title} -> Type: ${c.discountType} | Value: ${c.discountValue} | Min: ₹${c.minOrderAmount} | MaxCap: ₹${c.maxDiscountAmount}`);
    });

    console.log('\nSuccessfully updated coupons database!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating coupons:', err);
    process.exit(1);
  }
}

// Give mongoose time to connect if not connected
if (mongoose.connection.readyState === 1) {
  updateCoupons();
} else {
  mongoose.connection.once('open', updateCoupons);
}

