const mongoose = require('mongoose');

async function seedRunningShoes() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  console.log('Connected to MongoDB');

  const vendor = await mongoose.connection.db.collection('users').findOne({});
  const vendorId = vendor?._id || new mongoose.Types.ObjectId('69c65ce0908dc51de9251653');

  const shoes = [
    {
      name: 'Puma Softride Running Shoes',
      category: 'Footwear & Shoes',
      description: 'Engineered with premium Softride foam cushioning for extreme comfort during morning jogging and high-intensity workout routines. Breathable mesh upper with secure lace-up closure.',
      price: 2499,
      originalPrice: 3999,
      discountPercentage: 38,
      rating: 4.3,
      ratingCount: 12400,
      salesCount: 3840,
      quantity: 50,
      colors: ['Black/Red', 'Slate Gray', 'Navy Blue'],
      sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
      image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
      ],
      returnPolicy: '7 Days Return & Exchange',
      warranty: '6 Months Manufacturer Warranty',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Nike Revolution 7 Running Shoes',
      category: 'Footwear & Shoes',
      description: 'Loaded with soft cushioning and pace-setting flexibility, the Nike Revolution 7 brings unmatched comfort to every run, jog, and morning walk.',
      price: 2799,
      originalPrice: 3995,
      discountPercentage: 30,
      rating: 4.5,
      ratingCount: 8100,
      salesCount: 4210,
      quantity: 45,
      colors: ['Triple Black', 'White/Blue', 'Obsidian'],
      sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80'
      ],
      returnPolicy: '7 Days Return & Exchange',
      warranty: '1 Year Manufacturer Warranty',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'ASICS Gel-Contend Running Shoes',
      category: 'Footwear & Shoes',
      description: 'Durable and supportive running shoe featuring signature Rearfoot GEL technology cushioning and an Amplifoam midsole for responsive shock absorption.',
      price: 2999,
      originalPrice: 4999,
      discountPercentage: 40,
      rating: 4.4,
      ratingCount: 6300,
      salesCount: 2980,
      quantity: 35,
      colors: ['Navy/Electric Blue', 'Black/Silver', 'Carbon Grey'],
      sizes: ['UK 8', 'UK 9', 'UK 10'],
      image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
      ],
      returnPolicy: '7 Days Return & Exchange',
      warranty: '6 Months Manufacturer Warranty',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Adidas Runfalcon Running Shoes',
      category: 'Footwear & Shoes',
      description: 'Lace up for laps in the park or a jog on the treadmill. These lightweight running shoes have a supportive, mixed-material upper and durable rubber outsole.',
      price: 2699,
      originalPrice: 3999,
      discountPercentage: 33,
      rating: 4.2,
      ratingCount: 9700,
      salesCount: 5120,
      quantity: 60,
      colors: ['Core Black/White', 'Solar Red', 'Cloud White'],
      sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
      image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
      ],
      returnPolicy: '7 Days Return & Exchange',
      warranty: '1 Year Manufacturer Warranty',
      userId: vendorId,
      isDeleted: false
    }
  ];

  for (const s of shoes) {
    const existing = await mongoose.connection.db.collection('products').findOne({ name: s.name });
    if (existing) {
      await mongoose.connection.db.collection('products').updateOne(
        { _id: existing._id },
        { $set: { ...s, updatedAt: new Date() } }
      );
      console.log(`Updated: ${s.name}`);
    } else {
      await mongoose.connection.db.collection('products').insertOne({
        ...s,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Inserted: ${s.name}`);
    }
  }

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seedRunningShoes().catch(err => {
  console.error('Error seeding running shoes:', err);
  process.exit(1);
});

