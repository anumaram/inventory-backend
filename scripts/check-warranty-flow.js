const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  
  const products = await mongoose.connection.db.collection('products').find({
    $or: [
      { category: { $regex: /electronic|mobile|laptop|appliance|gadget/i } },
      { name: { $regex: /phone|tv|laptop|macbook|sony|samsung|apple|headphone/i } }
    ]
  }).limit(10).toArray();

  console.log('Warranty eligible products in DB:', products.length);
  products.forEach(p => {
    console.log(`- ${p.name} | Cat: ${p.category} | Warranty: ${p.warranty || '1 Year Manufacturer Warranty'}`);
  });

  const warranties = await mongoose.connection.db.collection('warranties').find().toArray();
  console.log('Current Warranties count:', warranties.length);
  warranties.forEach(w => {
    console.log(`- ${w.productName} | Cust: ${w.customerId} | Status: ${w.status} | Expires: ${w.expiresDate}`);
  });

  process.exit(0);
})();

