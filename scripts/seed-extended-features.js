const mongoose = require('mongoose');

async function seedExtendedFeatures() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const vendor = await db.collection('users').findOne({});
  const vendorId = vendor?._id || new mongoose.Types.ObjectId('69c65ce0908dc51de9251653');
  const customer = await db.collection('customers').findOne({});
  const customerId = customer?._id || new mongoose.Types.ObjectId('69c6b61aa44330cff804e535');

  // ==========================================
  // 1. SEED TECH PRODUCTS WITH DETAILED SPECS
  // ==========================================
  const techProducts = [
    {
      name: 'Apple iPhone 15 (128 GB) - Black',
      category: 'Mobiles & Tablets',
      description: 'iPhone 15 brings Dynamic Island, a 48MP Main camera, and USB-C—all in a durable color-infused glass and aluminum design.',
      price: 69900,
      originalPrice: 79900,
      discountPercentage: 13,
      rating: 4.7,
      ratingCount: 8200,
      salesCount: 4300,
      quantity: 40,
      warranty: '1 Year Apple Manufacturer Warranty',
      warrantyMonths: 12,
      isRepeatDeliveryEligible: false,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80'
      ],
      specifications: {
        'General': {
          'Brand': 'Apple',
          'Model': 'iPhone 15',
          'Launch Date': 'Sep 2023',
          'SIM Type': 'Dual SIM (eSIM + Nano SIM)',
          'In the Box': 'Handset, USB-C Charge Cable, Documentation',
          'Warranty': '1 Year Apple Brand Warranty'
        },
        'Processor': {
          'Chipset': 'Apple A16 Bionic',
          'CPU Cores': '6-core (2 performance and 4 efficiency cores)',
          'GPU': '5-core Apple GPU',
          'Neural Engine': '16-core Neural Engine'
        },
        'Display': {
          'Screen Size': '6.1 inch (15.5 cm)',
          'Resolution': '2556 x 1179 Pixels at 460 ppi',
          'Display Type': 'Super Retina XDR OLED Display',
          'Peak Brightness': '2,000 nits peak outdoor brightness',
          'Protection': 'Ceramic Shield front, IP68 water resistance'
        },
        'Camera': {
          'Rear Camera': '48MP Main (f/1.6) + 12MP Ultra Wide (f/2.4)',
          'Front Camera': '12MP TrueDepth (f/1.9) with Autofocus',
          'Video Recording': '4K Cinematic mode up to 60 fps, Action mode up to 2.8K',
          'Optical Zoom': '2x optical quality telephoto zoom'
        },
        'Battery & Charging': {
          'Battery Type': 'Built-in rechargeable lithium-ion',
          'Video Playback': 'Up to 20 hours',
          'Charging Speed': 'Up to 50% charge in ~30 minutes with 20W adapter',
          'Wireless Charging': 'MagSafe wireless charging up to 15W, Qi up to 7.5W'
        },
        'Operating System': {
          'OS': 'iOS 17 (Upgradable to iOS 18)',
          'Voice Assistant': 'Siri with on-device speech processing'
        },
        'Connectivity': {
          '5G Support': 'Yes (Sub-6 GHz and mmWave)',
          'Wi-Fi': 'Wi-Fi 6 (802.11ax) with 2x2 MIMO',
          'Bluetooth': 'Bluetooth 5.3',
          'Port': 'USB-C supporting charging, DisplayPort, USB 2'
        },
        'Design & Build': {
          'Dimensions': '147.6 mm x 71.6 mm x 7.8 mm',
          'Weight': '171 grams',
          'Water Resistance': 'Rated IP68 (maximum depth of 6m up to 30 mins)'
        }
      },
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      category: 'Audio',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones for exceptional clarity and immersive lossless audio.',
      price: 26990,
      originalPrice: 34990,
      discountPercentage: 23,
      rating: 4.8,
      ratingCount: 3400,
      salesCount: 1980,
      quantity: 35,
      warranty: '1 Year Manufacturer Warranty',
      warrantyMonths: 12,
      isRepeatDeliveryEligible: false,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
      specifications: {
        'General': {
          'Brand': 'Sony',
          'Model': 'WH-1000XM5',
          'Headphone Type': 'Over-Ear Circumaural',
          'In the Box': 'Headphones, Collapsible Carrying Case, 3.5mm cable, USB-C Cable'
        },
        'Audio Features': {
          'Driver Size': '30mm precision-engineered carbon fiber dome',
          'Frequency Response': '4 Hz - 40,000 Hz',
          'Noise Cancellation': 'HD Noise Cancelling Processor QN1 + Integrated Processor V1',
          'High-Res Audio': 'Supported via LDAC codec and DSEE Extreme upscaling'
        },
        'Battery & Charging': {
          'Battery Life': 'Up to 30 hours (NC ON), up to 40 hours (NC OFF)',
          'Quick Charge': '3 minutes charge delivers 3 hours playback with USB-PD',
          'Charging Port': 'USB Type-C'
        },
        'Connectivity': {
          'Bluetooth Version': 'Bluetooth 5.2',
          'Multipoint Connection': 'Connect two Bluetooth devices simultaneously',
          'Supported Codecs': 'SBC, AAC, LDAC'
        }
      },
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Samsung 55" Crystal 4K UHD Smart TV',
      category: 'Appliances',
      description: 'Transform your entertainment with lifelike color, sharp 4K clarity, Dynamic HDR, and Dolby Digital Plus sound.',
      price: 42990,
      originalPrice: 62990,
      discountPercentage: 32,
      rating: 4.6,
      ratingCount: 5200,
      salesCount: 1850,
      quantity: 25,
      warranty: '2 Years Comprehensive Manufacturer Warranty',
      warrantyMonths: 24,
      isRepeatDeliveryEligible: false,
      image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80'],
      specifications: {
        'Display': {
          'Screen Size': '55 Inch (138 cm)',
          'Resolution': '3840 x 2160 Pixels (4K Ultra HD)',
          'Refresh Rate': '60 Hz with Motion Xcelerator',
          'HDR': 'HDR 10+, Mega Contrast, PurColor'
        },
        'Smart TV Features': {
          'Operating System': 'Tizen Smart TV OS',
          'Voice Control': 'Alexa, Bixby, Google Assistant Built-in',
          'Supported Apps': 'Netflix, YouTube, Prime Video, Disney+ Hotstar, Apple TV'
        },
        'Audio': {
          'Speaker Output': '20 Watts',
          'Sound Technology': 'Object Tracking Sound Lite (OTS Lite) & Dolby Digital Plus',
          'Q-Symphony': 'Supported with Samsung soundbars'
        },
        'Connectivity': {
          'HDMI Ports': '3 HDMI ports',
          'USB Ports': '1 USB port',
          'Wireless': 'Wi-Fi 5 & Bluetooth 5.2'
        }
      },
      userId: vendorId,
      isDeleted: false
    }
  ];

  for (const p of techProducts) {
    await db.collection('products').updateOne(
      { name: p.name },
      { $set: { ...p, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`Tech product ready: ${p.name}`);
  }

  // ==========================================
  // 2. SEED REPEAT DELIVERY ESSENTIALS
  // ==========================================
  const essentials = [
    {
      name: 'Amul Taaza Homogenised Toned Milk 1L',
      category: 'Food & Beverages',
      description: 'Pure, fresh, homogenized toned milk packed with vital calcium, vitamins and protein. Ideal for daily tea, coffee, and breakfast.',
      price: 75,
      originalPrice: 85,
      discountPercentage: 12,
      rating: 4.8,
      ratingCount: 12400,
      salesCount: 8900,
      quantity: 200,
      isRepeatDeliveryEligible: true,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Aashirvaad Superior MP Whole Wheat Atta 5kg',
      category: 'Food & Beverages',
      description: 'Made from the best quality MP wheat grains, ensuring soft, fluffy, and nutrient-rich rotis every day.',
      price: 349,
      originalPrice: 399,
      discountPercentage: 12,
      rating: 4.7,
      ratingCount: 9800,
      salesCount: 6500,
      quantity: 150,
      isRepeatDeliveryEligible: true,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Dettol Original Germ Protection Handwash 200ml',
      category: 'Beauty & Personal Care',
      description: 'Dettol liquid handwash provides 100% better protection against germs and cleanses hands gently.',
      price: 179,
      originalPrice: 199,
      discountPercentage: 10,
      rating: 4.6,
      ratingCount: 7100,
      salesCount: 5200,
      quantity: 120,
      isRepeatDeliveryEligible: true,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg',
      category: 'Food & Beverages',
      description: 'Desh Ka Namak. Pure, vacuum evaporated iodized salt that supports healthy growth and mental development.',
      price: 22,
      originalPrice: 26,
      discountPercentage: 15,
      rating: 4.9,
      ratingCount: 15400,
      salesCount: 11000,
      quantity: 300,
      isRepeatDeliveryEligible: true,
      image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Colgate MaxFresh Spicy Red Gel Toothpaste 200g',
      category: 'Beauty & Personal Care',
      description: 'Infused with cooling crystals for intense freshness that keeps your breath fresh for hours.',
      price: 99,
      originalPrice: 120,
      discountPercentage: 18,
      rating: 4.7,
      ratingCount: 6800,
      salesCount: 4800,
      quantity: 180,
      isRepeatDeliveryEligible: true,
      image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    }
  ];

  for (const e of essentials) {
    await db.collection('products').updateOne(
      { name: e.name },
      { $set: { ...e, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`Essential product ready: ${e.name}`);
  }

  // ==========================================
  // 3. SEED APPAREL FOR AVATAR DRESSING
  // ==========================================
  const apparel = [
    {
      name: 'Men Slim Fit Olive Casual Shirt',
      category: 'Fashion & Apparel',
      clothingType: 'top',
      gender: 'Men',
      price: 899,
      originalPrice: 1299,
      discountPercentage: 30,
      rating: 4.5,
      quantity: 60,
      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Men Classic Black Overhead Hoodie',
      category: 'Fashion & Apparel',
      clothingType: 'top',
      gender: 'Men',
      price: 1299,
      originalPrice: 1999,
      discountPercentage: 35,
      rating: 4.6,
      quantity: 50,
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Men Athletic Cargo Pants Beige',
      category: 'Fashion & Apparel',
      clothingType: 'bottom',
      gender: 'Men',
      price: 1499,
      originalPrice: 2199,
      discountPercentage: 32,
      rating: 4.4,
      quantity: 45,
      image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Women Floral Print Midi Dress Pink',
      category: 'Fashion & Apparel',
      clothingType: 'dress',
      gender: 'Women',
      price: 1699,
      originalPrice: 2499,
      discountPercentage: 32,
      rating: 4.7,
      quantity: 40,
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    },
    {
      name: 'Women High-Waist Stretch Denim Jeans',
      category: 'Fashion & Apparel',
      clothingType: 'bottom',
      gender: 'Women',
      price: 1299,
      originalPrice: 1799,
      discountPercentage: 28,
      rating: 4.5,
      quantity: 55,
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
      userId: vendorId,
      isDeleted: false
    }
  ];

  for (const a of apparel) {
    await db.collection('products').updateOne(
      { name: a.name },
      { $set: { ...a, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`Apparel item ready: ${a.name}`);
  }

  // ==========================================
  // 4. SEED SAMPLE REPEAT DELIVERIES
  // ==========================================
  const amul = await db.collection('products').findOne({ name: /Amul Taaza/i });
  const atta = await db.collection('products').findOne({ name: /Aashirvaad/i });
  const dettol = await db.collection('products').findOne({ name: /Dettol/i });

  if (amul && atta) {
    await db.collection('subscriptions').deleteMany({ customerId });
    await db.collection('subscriptions').insertMany([
      {
        customerId,
        productId: amul._id,
        productName: amul.name,
        productImage: amul.image,
        price: amul.price,
        unit: '1 Litre',
        quantity: 2,
        frequencyDays: 15,
        status: 'active',
        lastPurchasedDate: new Date('2026-08-20'),
        nextDeliveryDate: new Date('2026-09-04'),
        remindersEnabled: true,
        remindDaysBefore: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        customerId,
        productId: atta._id,
        productName: atta.name,
        productImage: atta.image,
        price: atta.price,
        unit: '5 kg',
        quantity: 1,
        frequencyDays: 30,
        status: 'active',
        lastPurchasedDate: new Date('2026-08-05'),
        nextDeliveryDate: new Date('2026-09-04'),
        remindersEnabled: true,
        remindDaysBefore: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        customerId,
        productId: dettol?._id || amul._id,
        productName: dettol ? dettol.name : 'Dettol Handwash',
        productImage: dettol ? dettol.image : '',
        price: dettol ? dettol.price : 179,
        unit: '200 ml',
        quantity: 1,
        frequencyDays: 30,
        status: 'active',
        lastPurchasedDate: new Date('2026-08-10'),
        nextDeliveryDate: new Date('2026-09-09'),
        remindersEnabled: true,
        remindDaysBefore: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('Sample repeat delivery subscriptions seeded!');
  }

  // ==========================================
  // 5. SEED PRICE HISTORY FOR IPHONE & HEADPHONES
  // ==========================================
  const iphone = await db.collection('products').findOne({ name: /iPhone 15/i });
  if (iphone) {
    const records = [];
    const monthlyPrices = [
      { m: 12, p: 79900 }, // 1 yr ago
      { m: 10, p: 78500 },
      { m: 8, p: 74900 },
      { m: 6, p: 62900 }, // Lowest point (Jan)
      { m: 5, p: 66900 },
      { m: 4, p: 65900 },
      { m: 3, p: 68900 },
      { m: 2, p: 67490 },
      { m: 1, p: 69900 },
      { m: 0, p: 69900 }  // Now
    ];
    const now = new Date();
    for (const item of monthlyPrices) {
      const d = new Date(now.getFullYear(), now.getMonth() - item.m, 15);
      records.push({ price: item.p, date: d });
    }

    await db.collection('pricehistories').updateOne(
      { productId: iphone._id },
      {
        $set: {
          productId: iphone._id,
          currentPrice: 69900,
          originalPrice: 79900,
          lowestPrice: 62900,
          lowestDate: new Date('2026-01-12'),
          highestPrice: 79900,
          highestDate: new Date('2025-09-05'),
          averagePrice: 71200,
          records,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('iPhone 15 price history curve seeded!');
  }

  // ==========================================
  // 6. SEED SAMPLE WARRANTIES
  // ==========================================
  const headphones = await db.collection('products').findOne({ name: /WH-1000XM5/i });
  const tv = await db.collection('products').findOne({ name: /Crystal 4K/i });

  if (headphones && tv) {
    await db.collection('warranties').deleteMany({ customerId });
    await db.collection('warranties').insertMany([
      {
        customerId,
        productId: headphones._id,
        productName: headphones.name,
        productImage: headphones.image,
        brand: 'Sony',
        serialNumber: 'SN-WHXM5-98314-IN',
        purchasedDate: new Date('2026-08-12'),
        deliveryDate: new Date('2026-08-14'),
        warrantyMonths: 12,
        expiresDate: new Date('2027-08-14'),
        status: 'active',
        certificateId: 'WRT-SONY-2026-8812',
        terms: [
          '100% Manufacturer parts & labor coverage',
          'Free doorstep inspection & pickup',
          'Replacement guaranteed if repair takes > 7 days'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        customerId,
        productId: tv._id,
        productName: tv.name,
        productImage: tv.image,
        brand: 'Samsung',
        serialNumber: 'SN-SAMTV-44120-IN',
        purchasedDate: new Date('2026-03-05'),
        deliveryDate: new Date('2026-03-08'),
        warrantyMonths: 24,
        expiresDate: new Date('2028-03-08'),
        status: 'active',
        certificateId: 'WRT-SAMSUNG-2026-4402',
        terms: [
          '2 Years comprehensive panel and motherboard warranty',
          'Free in-home technician visit within 24 hours'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('Sample active warranties seeded!');
  }

  // ==========================================
  // 7. SEED SAMPLE SHARED CART (Trip to Goa)
  // ==========================================
  const backpack = await db.collection('products').findOne({ name: /Backpack/i }) || amul;
  await db.collection('sharedcarts').deleteMany({ creatorId: customerId });
  await db.collection('sharedcarts').insertOne({
    name: 'Trip to Goa 🏖️',
    creatorId: customerId,
    creatorName: customer?.name || 'Anusha',
    shareCode: 'CART-GOA-2026',
    template: 'trip',
    members: [
      { customerId, name: `${customer?.name || 'Anusha'} (You)`, role: 'creator', isReady: true, joinedAt: new Date() },
      { name: 'Rahul', role: 'member', isReady: true, joinedAt: new Date() },
      { name: 'Sneha', role: 'member', isReady: true, joinedAt: new Date() },
      { name: 'Kiran', role: 'member', isReady: false, joinedAt: new Date() },
      { name: 'Aditya', role: 'member', isReady: true, joinedAt: new Date() }
    ],
    items: [
      {
        productId: backpack._id,
        name: 'Wildcraft 40L Travel Backpack',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
        price: 2499,
        vendorName: 'Wildcraft Store',
        quantity: 1,
        addedBy: { customerId, name: 'Anusha' },
        votes: [
          { customerId, customerName: 'Anusha', vote: 'up' },
          { customerName: 'Rahul', vote: 'up' },
          { customerName: 'Sneha', vote: 'up' }
        ],
        comments: [
          { customerName: 'Anusha', text: 'Looks perfect for our 4-day trip!', createdAt: new Date() },
          { customerName: 'Rahul', text: 'Can we check if there is a water-resistant cover?', createdAt: new Date() }
        ]
      },
      {
        productId: amul._id,
        name: 'JBL Go 4 Portable Bluetooth Speaker',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
        price: 3499,
        vendorName: 'JBL Audio Store',
        quantity: 1,
        addedBy: { customerId, name: 'Sneha' },
        votes: [
          { customerName: 'Sneha', vote: 'up' },
          { customerName: 'Rahul', vote: 'up' },
          { customerName: 'Aditya', vote: 'up' }
        ],
        comments: [
          { customerName: 'Sneha', text: 'Essential for beach music!', createdAt: new Date() }
        ]
      }
    ],
    messages: [
      {
        senderName: 'Rahul',
        text: 'Should we add a power bank too?',
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        senderName: 'Sneha',
        text: 'Yes, good idea! I will look for a 20,000mAh one.',
        createdAt: new Date(Date.now() - 1800000)
      },
      {
        senderName: 'Anusha',
        text: 'I added the JBL speaker. Please vote everyone!',
        createdAt: new Date(Date.now() - 600000)
      }
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('Sample Shared Cart "Trip to Goa" seeded!');

  console.log('Extended features database seeding completed successfully!');
  await mongoose.disconnect();
}

seedExtendedFeatures().catch(err => {
  console.error('Error seeding extended features:', err);
  process.exit(1);
});
