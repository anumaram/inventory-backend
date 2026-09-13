const mongoose = require('mongoose');
const Customer = require('./models/customer.model');
const PaymentMethod = require('./models/payment-method.model');

async function migratePaymentMethods() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
    console.log('Connected to MongoDB');

    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers to check for payment methods`);

    let migrated = 0;
    for (const cust of customers) {
      if (Array.isArray(cust.paymentMethods) && cust.paymentMethods.length > 0) {
        for (const m of cust.paymentMethods) {
          const exists = await PaymentMethod.findOne({
            customerId: cust._id,
            $or: [
              { _id: m._id },
              { type: m.type, upiId: m.upiId || '' },
              { type: m.type, last4: m.last4 || (m.cardNumber ? m.cardNumber.slice(-4) : '') }
            ]
          });

          if (!exists) {
            await PaymentMethod.create({
              _id: m._id || new mongoose.Types.ObjectId(),
              customerId: cust._id,
              type: m.type || 'card',
              cardType: m.cardType || 'card',
              cardNumber: m.cardNumber || '',
              last4: m.last4 || (m.cardNumber ? m.cardNumber.slice(-4) : ''),
              cardHolderName: m.cardHolderName || cust.name || 'Cardholder',
              expiry: m.expiry || '',
              upiId: m.upiId || '',
              bankName: m.bankName || '',
              accountNumber: m.accountNumber || '',
              isDefault: Boolean(m.isDefault)
            });
            migrated++;
          }
        }
      }
    }

    console.log(`Successfully migrated ${migrated} payment methods to payment_methods collection!`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migratePaymentMethods();

