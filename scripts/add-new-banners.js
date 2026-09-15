const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('banners');
  
  const newBanners = [
    {
      title: 'Gear Up for Adventure',
      subtitle: 'Premium sports equipment, fitness trackers, and outdoor essentials for every athlete',
      imageUrl: '/banners/banner-slide-7.jpg?v=3',
      linkUrl: '/customer?category=Sports+%26+Outdoors',
      buttonText: 'Shop Now',
      position: 'hero_top',
      priority: 7,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Glow with Confidence',
      subtitle: 'Discover luxurious skincare, beauty serums, and self-care rituals you deserve',
      imageUrl: '/banners/banner-slide-8.jpg?v=3',
      linkUrl: '/customer?category=Beauty+%26+Wellness',
      buttonText: 'Shop Now',
      position: 'hero_top',
      priority: 8,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Design Your Dream Space',
      subtitle: 'Curated home décor, cozy textiles, and modern accent pieces for every room',
      imageUrl: '/banners/banner-slide-9.jpg?v=3',
      linkUrl: '/customer?category=Home+Decor',
      buttonText: 'Shop Now',
      position: 'hero_top',
      priority: 9,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Back to School Ready',
      subtitle: 'Colorful stationery, smart gadgets, and everything students need to ace the year',
      imageUrl: '/banners/banner-slide-10.jpg?v=3',
      linkUrl: '/customer?category=Stationery',
      buttonText: 'Shop Now',
      position: 'hero_top',
      priority: 10,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const result = await col.insertMany(newBanners);
  console.log('Inserted', result.insertedCount, 'new banners!');
  
  // Verify total
  const total = await col.countDocuments({ isDeleted: { $ne: true } });
  console.log('Total active banners now:', total);
  
  mongoose.disconnect();
});

