const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'Inventory Enterprise E-Commerce' },
    tagline: { type: String, default: 'Multi-Vendor Marketplace & Enterprise Inventory Platform' },
    supportEmail: { type: String, default: 'support@inventoryapp.com' },
    supportPhone: { type: String, default: '+91 6305229699' },
    address: { type: String, default: 'Headquarters, Tech Park, India' },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    defaultCommissionRate: { type: Number, default: 5 },
    defaultTaxRate: { type: Number, default: 18 },
    freeShippingThreshold: { type: Number, default: 499 },
    defaultDeliveryFee: { type: Number, default: 40 },
    returnWindowDays: { type: Number, default: 7 },
    lowStockThreshold: { type: Number, default: 10 },
    enableEmailNotifications: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);

