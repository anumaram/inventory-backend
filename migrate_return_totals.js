const mongoose = require('mongoose');
const Return = require('./models/return.model');
const Order = require('./models/order.model');

const MONGO_URI = 'mongodb://127.0.0.1:27017/inventory-app';

function calculateTotal(order) {
  if (Number(order.totalAmount) > 0) return Number(order.totalAmount);
  if (Array.isArray(order.items)) {
    return order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  }
  return Number(order.price || 0) * Number(order.qty || 1);
}

async function migrateReturnTotals() {
  await mongoose.connect(MONGO_URI);
  const records = await Return.find({}).select('_id orderRef items totalAmount refundAmount').lean();
  let updated = 0;

  for (const record of records) {
    const order = await Order.findById(record.orderRef).select('totalAmount items price qty').lean();
    if (!order) continue;

    const totalAmount = calculateTotal(order);
    const items = Array.isArray(record.items) && record.items.length > 0
      ? record.items.map((item, index) => ({
        ...item,
        price: Number(item.price) > 0 ? item.price : Number(order.items?.[index]?.price || 0),
        qty: Number(item.qty || order.items?.[index]?.qty || 1)
      }))
      : order.items || [];

    await Return.updateOne(
      { _id: record._id },
      { $set: { totalAmount, refundAmount: Number(record.refundAmount) > 0 ? record.refundAmount : totalAmount, items } }
    );
    updated += 1;
  }

  console.log(`Return total migration complete: ${updated} records updated.`);
  await mongoose.disconnect();
}

migrateReturnTotals().catch(async (error) => {
  console.error('Return total migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
