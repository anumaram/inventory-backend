const Customer = require('../models/customer.model');
const mongoose = require('mongoose');

const DEFAULT_POINTS = 2450;
const POINT_TO_INR_RATIO = 0.1; // 10 points = ₹1

/**
 * Get customer rewards wallet details
 */
async function getCustomerRewards(customerId) {
  let customer = null;
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    customer = await Customer.findById(customerId);
  }

  // If customer doesn't have points initialized, provide default realistic rewards wallet
  let points = customer?.loyaltyPoints ?? DEFAULT_POINTS;

  let history = [
    {
      _id: 'rw_1',
      title: 'Order Completed (#ORD-8821)',
      points: 25,
      type: 'earned',
      date: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      reason: 'Standard 10% cashpoint on order'
    },
    {
      _id: 'rw_2',
      title: 'Verified Product Review Written',
      points: 5,
      type: 'earned',
      date: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      reason: 'Review contribution reward'
    },
    {
      _id: 'rw_3',
      title: 'Repeat Delivery Scheduled',
      points: 10,
      type: 'earned',
      date: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      reason: 'Subscription setup bonus'
    },
    {
      _id: 'rw_4',
      title: 'Redeemed ₹50 Discount Coupon',
      points: 500,
      type: 'redeemed',
      date: new Date(Date.now() - 18 * 24 * 3600 * 1000),
      reason: 'Checkout discount applied'
    },
    {
      _id: 'rw_5',
      title: 'Account Creation & Welcome Gift',
      points: 500,
      type: 'earned',
      date: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      reason: 'New customer onboarding'
    }
  ];

  // Available redeemable coupons
  const availableCoupons = [
    {
      id: 'coupon_50',
      title: '₹50 Off Instant Discount',
      pointsCost: 500,
      code: 'REWARD50',
      minOrder: 499,
      description: 'Applicable on any order above ₹499 across all categories'
    },
    {
      id: 'coupon_100',
      title: '₹100 Off Instant Discount',
      pointsCost: 1000,
      code: 'REWARD100',
      minOrder: 999,
      description: 'Save ₹100 instantly on your next electronics or fashion purchase'
    },
    {
      id: 'coupon_250',
      title: '₹250 Off Super Discount',
      pointsCost: 2500,
      code: 'REWARD250',
      minOrder: 1999,
      description: 'Exclusive Gold Member coupon for orders above ₹1,999'
    },
    {
      id: 'coupon_freedelivery',
      title: 'Free Express Delivery Voucher',
      pointsCost: 350,
      code: 'FREESHIP',
      minOrder: 0,
      description: 'Zero delivery fee on any order from your nearest fulfillment hub'
    }
  ];

  // Earn rules
  const earnRules = [
    { activity: 'Place an Order', points: '+10 to +50 pts', desc: 'Earn points on every rupee spent' },
    { activity: 'Write a Verified Review', points: '+5 pts', desc: 'Share your feedback and photo with shoppers' },
    { activity: 'Schedule Repeat Delivery', points: '+10 pts', desc: 'Setup automated recurring subscriptions' },
    { activity: 'Refer a Friend', points: '+20 pts', desc: 'When your friend completes their first order' },
    { activity: 'Birthday Bonus', points: '+50 pts', desc: 'Special yearly celebration reward' }
  ];

  // Tier
  let tier = 'Gold';
  let tierBadge = '🌟 Gold Member';
  let nextTier = 'Platinum';
  let pointsToNextTier = 550; // out of 3,000

  return {
    points,
    rupeeValue: Math.round(points * POINT_TO_INR_RATIO),
    tier,
    tierBadge,
    nextTier,
    pointsToNextTier,
    availableCoupons,
    earnRules,
    history
  };
}

/**
 * Redeem loyalty points
 */
async function redeemPoints(customerId, pointsToRedeem, couponId = null) {
  const points = parseInt(pointsToRedeem, 10);
  if (!points || points <= 0) {
    throw new Error('Invalid points amount');
  }

  let customer = null;
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    customer = await Customer.findById(customerId);
  }

  const currentPoints = customer?.loyaltyPoints ?? DEFAULT_POINTS;
  if (currentPoints < points) {
    throw new Error(`Insufficient points balance. You have ${currentPoints} points.`);
  }

  const newBalance = currentPoints - points;
  if (customer) {
    customer.loyaltyPoints = newBalance;
    await customer.save();
  }

  return {
    success: true,
    redeemedPoints: points,
    discountAmount: Math.round(points * POINT_TO_INR_RATIO),
    remainingPoints: newBalance
  };
}

module.exports = {
  getCustomerRewards,
  redeemPoints
};

