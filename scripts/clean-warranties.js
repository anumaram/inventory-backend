const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const res = await mongoose.connection.db.collection('warranties').deleteMany({
    $or: [
      { productName: { $regex: /apple|milk|shirt|pant|grocery|fruit|bread|tea|coffee/i } },
      { brand: { $regex: /farm|dairy|food/i } }
    ]
  });
  console.log('Deleted non-electronic warranties:', res.deletedCount);
  
  const current = await mongoose.connection.db.collection('warranties').find().toArray();
  console.log('Remaining warranties:', current.map(w => `${w.productName} (${w.customerId})`));
  process.exit(0);
})();
