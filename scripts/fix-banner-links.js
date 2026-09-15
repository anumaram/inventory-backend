const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('banners');
  
  const updates = [
    { title: 'Great Products, Great Prices', linkUrl: '/customer' },
    { title: 'Make Everyday Life Easier', linkUrl: '/customer?category=Home+%26+Kitchen' },
    { title: 'Style for Every You', linkUrl: '/customer?category=Fashion' },
    { title: 'Upgrade to Smarter Living', linkUrl: '/customer?category=Electronics' },
    { title: 'Fresh Choices, Brighter Living', linkUrl: '/customer?category=Grocery' },
    { title: 'Big Savings, Happier Days', linkUrl: '/customer?category=Deals' }
  ];
  
  for (const u of updates) {
    const result = await col.updateOne(
      { title: u.title },
      { $set: { linkUrl: u.linkUrl } }
    );
    console.log('Updated:', u.title, '->', u.linkUrl, '| matched:', result.matchedCount);
  }
  
  console.log('\nDone! All linkUrls updated.');
  mongoose.disconnect();
});

