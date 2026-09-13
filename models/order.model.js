const mongoose = require('mongoose');
const { generateOrderId } = require('../utils/orderId.util');
const { generateInvoiceId } = require('../utils/invoiceId.util');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: 'Product' },
    vendorName: { type: String, default: 'Vendor' },
    qty: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => generateOrderId()
    },
    invoiceId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => generateInvoiceId()
    },
    status: { type: String, enum: ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'], default: 'placed' },
    cancellationReason: { type: String, default: '' },
    cancelledAt: Date,
    cancelledBy: { type: String, default: '' },
    returnStatus: {
      type: String,
      enum: [
        'none',
        'requested',
        'approved',
        'rejected',
        'returned',
        'cancelled',
        'pickup_confirmed',
        'item_received',
        'quality_passed',
        'refund_credited'
      ],
      default: 'none'
    },
    returnReason: { type: String, default: '' },
    returnComments: { type: String, default: '' },
    returnRequestedAt: Date,
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ['none', 'pending', 'credited'], default: 'none' },
    // This is the immutable clock used by order tracking. It intentionally
    // does not depend on when the API process was last started.
    placedAt: { type: Date, default: Date.now, immutable: true },
    statusUpdatedAt: { type: Date, default: Date.now },
    statusTimestamps: {
      placed: { type: Date, default: Date.now },
      packed: Date,
      shipped: Date,
      out_for_delivery: Date,
      delivered: Date,
      cancelled: Date,
      returned: Date
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    shippingAddress: new mongoose.Schema(
      {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        type: String
      },
      { _id: false }
    ),
    deliveryMethod: String,
    paymentMethod: String,
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    qty: { type: Number },
    price: { type: Number },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

