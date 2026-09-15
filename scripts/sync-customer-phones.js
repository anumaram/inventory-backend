const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const addrs = await mongoose.connection.collection('addresses').find({}).toArray();
  let count = 0;
  for (const a of addrs) {
    if (a.phone && a.customerId) {
      const r = await mongoose.connection.collection('customers').updateOne(
        { _id: a.customerId, $or: [{ phone: { $exists: false } }, { phone: '' }, { phone: null }] },
        { $set: { phone: a.phone } }
      );
      if (r.modifiedCount > 0) count += r.modifiedCount;
    }
  }
  console.log('Synced phones count:', count);
  const custs = await mongoose.connection.collection('customers').find({ phone: { $exists: true, $ne: '' } }).toArray();
  console.log('Customers with phones:', custs.map(c => ({ name: c.name, email: c.email, phone: c.phone })));
  await mongoose.disconnect();
}

run().catch(console.error);

