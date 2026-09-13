const mongoose = require('mongoose');
const Product = require('./models/product.model');
const User = require('./models/user.model');
const InventoryHistory = require('./models/inventory-history.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory-app';

// -----------------------------------------------------------------------------
// CURATED RECENT HIGH-END ELECTRONICS DATA WITH ACCURATE DEDICATED HD IMAGES
// -----------------------------------------------------------------------------
const ELECTRONICS_TEMPLATES = [
  // ==========================================
  // 1. FLAGSHIP MOBILES & FOLDABLES
  // ==========================================
  {
    subcategory: 'Smartphones & Mobiles',
    items: [
      {
        name: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
        desc: 'Grade 5 Titanium frame with A18 Pro chip, 48MP Fusion camera with 5x optical telephoto, Action Button, and Camera Control.',
        price: 144900, discount: 5, colors: ['Desert Titanium', 'Natural Titanium', 'Black Titanium', 'White Titanium'], sizes: ['256GB', '512GB', '1TB'],
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy S24 Ultra 5G AI Phone (12GB RAM, 512GB)',
        desc: 'Snapdragon 8 Gen 3 with Galaxy AI live translation and Circle to Search. 200MP camera, titanium frame, and built-in S-Pen.',
        price: 129999, discount: 8, colors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'], sizes: ['256GB', '512GB', '1TB'],
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy Z Fold 6 5G (12GB RAM, 512GB Storage)',
        desc: '7.6-inch Dynamic AMOLED 2X 120Hz folding screen with Armor Aluminum hinge, Snapdragon 8 Gen 3 for Galaxy, and IP48 water resistance.',
        price: 164999, discount: 7, colors: ['Navy', 'Silver Shadow', 'Pink'], sizes: ['256GB', '512GB'],
        image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Google Pixel 9 Pro XL 5G with Tensor G4 Chip',
        desc: 'Super Actua 6.8-inch LTPO OLED display with Gemini Nano AI, 50MP triple camera system, and 7 years of guaranteed OS updates.',
        price: 124999, discount: 6, colors: ['Obsidian', 'Porcelain', 'Hazel', 'Rose Quartz'], sizes: ['128GB', '256GB', '512GB'],
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'OnePlus 12 5G (16GB RAM, 512GB) Flowy Emerald',
        desc: '4th Gen Hasselblad camera with Sony LYT-808 sensor, 5400mAh battery with 100W SUPERVOOC and 50W AIRVOOC wireless fast charging.',
        price: 69999, discount: 12, colors: ['Flowy Emerald', 'Silky Black', 'Glacial White'], sizes: ['256GB', '512GB'],
        image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Xiaomi 14 Ultra 5G with Leica Quad Camera 1-inch Sensor',
        desc: 'Leica Summilux optical lenses with 50MP 1-inch LYT-900 sensor, stepless variable aperture f/1.63-f/4.0, and Snapdragon 8 Gen 3.',
        price: 99999, discount: 10, colors: ['Black Vegan Leather', 'White Vegan Leather'], sizes: ['512GB'],
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Nothing Phone (2a) Plus 5G Transparent Glyph Edition',
        desc: 'Custom MediaTek Dimensity 7350 Pro 5G with iconic Glyph Interface lights, dual 50MP studio camera, and clean Nothing OS 2.6.',
        price: 27999, discount: 15, colors: ['Metallic Grey', 'Black', 'White'], sizes: ['128GB', '256GB'],
        image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Asus ROG Phone 8 Pro 5G Gaming Smartphone 24GB RAM',
        desc: 'AniMe Matrix LED mini-display back cover, 165Hz AMOLED HDR10+ screen, AirTrigger capacitive shoulder controls, and 5500mAh dual-battery.',
        price: 94999, discount: 10, colors: ['Phantom Black'], sizes: ['512GB', '1TB'],
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // ==========================================
  // 2. MACS & PREMIUM LAPTOPS
  // ==========================================
  {
    subcategory: 'Laptops & Computers',
    items: [
      {
        name: 'Apple MacBook Pro 16-inch M3 Max (36GB Unified RAM, 1TB SSD)',
        desc: 'Liquid Retina XDR display with ProMotion 120Hz, 16-core CPU, 40-core GPU, up to 22 hours battery life in stunning Space Black finish.',
        price: 349900, discount: 5, colors: ['Space Black', 'Silver'], sizes: ['16-inch (36GB/1TB)', '16-inch (48GB/1TB)'],
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple MacBook Air 15-inch M3 Chip (16GB RAM, 512GB SSD)',
        desc: 'Impossibly thin fanless aluminium unibody design with vibrant 15.3-inch Liquid Retina display, 1080p FaceTime HD camera, and MagSafe 3.',
        price: 154900, discount: 7, colors: ['Midnight', 'Starlight', 'Space Gray', 'Silver'], sizes: ['15-inch (16GB/512GB)'],
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple MacBook Air 13-inch M3 Chip (8GB RAM, 256GB SSD)',
        desc: 'Supercharged by Apple M3 with 8-core CPU and 10-core GPU, dual external display support, and all-day 18-hour battery.',
        price: 114900, discount: 8, colors: ['Midnight', 'Starlight', 'Space Gray', 'Silver'], sizes: ['13.6-inch (8GB/256GB)', '13.6-inch (16GB/512GB)'],
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Dell XPS 16 9640 OLED 4K Touch Laptop (Intel Core Ultra 9, RTX 4070)',
        desc: 'Seamless glass touch trackpad with capacitive touch function row, InfinityEdge 16.3-inch 4K+ OLED screen, and 32GB LPDDR5X RAM.',
        price: 289990, discount: 8, colors: ['Platinum Silver', 'Graphite'], sizes: ['16.3-inch (32GB/1TB)'],
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'ASUS ROG Zephyrus G16 (2024) OLED Gaming Laptop RTX 4080',
        desc: '2.5K 240Hz ROG Nebula OLED display with Slash Lighting array lid, Intel Core Ultra 9 185H, and CNC milled aluminium chassis.',
        price: 259990, discount: 10, colors: ['Eclipse Gray', 'Platinum White'], sizes: ['16-inch (32GB/1TB)'],
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Lenovo Legion Pro 7i Gen 9 (Intel i9-14900HX, RTX 4090 16GB)',
        desc: 'Legion ColdFront vapor chamber thermal system, 16-inch WQXGA 240Hz PureSight gaming screen, per-key RGB Legion TrueStrike keyboard.',
        price: 299990, discount: 12, colors: ['Eclipse Black'], sizes: ['16-inch (32GB/2TB)'],
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple Mac Studio M2 Ultra (64GB RAM, 1TB SSD)',
        desc: 'Groundbreaking modular desktop performance powered by 24-core CPU and 60-core GPU M2 Ultra, driving up to 8 4K displays simultaneously.',
        price: 419900, discount: 4, colors: ['Silver Aluminium'], sizes: ['Desktop Workstation'],
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // ==========================================
  // 3. EARBUDS, BUDS & HEADPHONES
  // ==========================================
  {
    subcategory: 'Audio & Earbuds',
    items: [
      {
        name: 'Apple AirPods Pro (2nd Generation) USB-C MagSafe Case',
        desc: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, Personalized Spatial Audio with dynamic head tracking.',
        price: 24900, discount: 10, colors: ['White'], sizes: ['Standard (XS, S, M, L Tips)'],
        image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones',
        desc: 'Auto NC Optimizer with 8 microphones and Integrated Processor V1. High-Resolution Audio wireless with LDAC and 30-hour battery life.',
        price: 29990, discount: 15, colors: ['Black', 'Silver', 'Midnight Blue', 'Smoky Pink'], sizes: ['Over-Ear'],
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Sony WF-1000XM5 True Wireless Noise Cancelling Earbuds',
        desc: 'Dynamic Driver X for wide frequency reproduction and deep bass. Dual feedback microphones with AI noise reduction algorithm.',
        price: 24990, discount: 18, colors: ['Black', 'Platinum Silver'], sizes: ['In-Ear (SS, S, M, L)'],
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy Buds3 Pro Wireless Noise Cancelling Earbuds',
        desc: 'Blade lights aerodynamic design with 24-bit Hi-Fi audio, dual amplifiers, 2-way planar speakers, and Galaxy AI real-time interpreter.',
        price: 19999, discount: 12, colors: ['Silver', 'White'], sizes: ['Universal Fit (S/M/L)'],
        image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Bose QuietComfort Ultra Wireless Noise Cancelling Headphones',
        desc: 'Breakthrough spatial audio with Bose Immersive Audio technology, CustomTune sound personalization, and ultra-plush protein leather.',
        price: 35900, discount: 10, colors: ['Black', 'White Smoke', 'Sandstone'], sizes: ['Over-Ear'],
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Sennheiser Momentum 4 Wireless Audiophile Headphones (60h Battery)',
        desc: '42mm audiophile-inspired transducer system delivering Sennheiser signature sound with unmatched 60-hour playtime on a single charge.',
        price: 27990, discount: 15, colors: ['Black Copper', 'White / Grey', 'Denim Blue'], sizes: ['Over-Ear'],
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Nothing Ear (2024) Hi-Res Wireless Earbuds with Ceramic Driver',
        desc: 'Custom 11mm ceramic driver with LHDC 5.0 and LDAC codec support, 45dB Smart ANC, and ChatGPT voice control integration.',
        price: 11999, discount: 15, colors: ['Transparent Black', 'Transparent White'], sizes: ['In-Ear'],
        image: 'https://images.unsplash.com/photo-1598331668826-20cecc596b86?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // ==========================================
  // 4. TABLETS & IPADS
  // ==========================================
  {
    subcategory: 'Tablets & iPads',
    items: [
      {
        name: 'Apple iPad Pro 13-inch M4 Ultra Retina Tandem OLED (256GB Wi-Fi)',
        desc: 'Breakthrough Ultra Retina XDR with tandem OLED technology, Apple M4 chip with 38 TOPS Neural Engine, and support for Apple Pencil Pro.',
        price: 129900, discount: 5, colors: ['Space Black', 'Silver'], sizes: ['13-inch (256GB)', '13-inch (512GB)', '13-inch (1TB Nano-Texture)'],
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple iPad Air 13-inch M2 Chip (128GB Wi-Fi)',
        desc: 'Liquid Retina display with P3 wide color and anti-reflective coating, Apple M2 chip, landscape 12MP front camera with Center Stage.',
        price: 79900, discount: 6, colors: ['Space Gray', 'Blue', 'Purple', 'Starlight'], sizes: ['13-inch (128GB)', '13-inch (256GB)'],
        image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy Tab S9 Ultra 14.6-inch Dynamic AMOLED 2X 120Hz',
        desc: 'IP68 water resistant tablet with Snapdragon 8 Gen 2, included low-latency S-Pen, quad AKG speakers, and massive 11200mAh battery.',
        price: 108999, discount: 10, colors: ['Graphite', 'Beige'], sizes: ['14.6-inch (12GB/256GB)', '14.6-inch (12GB/512GB)'],
        image: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Microsoft Surface Pro 11 Copilot+ PC OLED 2-in-1 Tablet',
        desc: 'Snapdragon X Elite with 45 TOPS NPU AI capabilities, 13-inch 120Hz PixelSense OLED touchscreen, and Surface Slim Pen storage.',
        price: 139990, discount: 8, colors: ['Sapphire', 'Dune', 'Platinum', 'Black'], sizes: ['13-inch (16GB/512GB)'],
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // ==========================================
  // 5. SMARTWATCHES & WEARABLES
  // ==========================================
  {
    subcategory: 'Smartwatches & Wearables',
    items: [
      {
        name: 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium Black',
        desc: '3000 nits brightest display, S9 SiP with Double Tap gesture, precision dual-frequency GPS, depth gauge to 40m, and 72-hour Low Power battery.',
        price: 89900, discount: 6, colors: ['Black Titanium / Dark Trail Loop', 'Natural Titanium / Ocean Band'], sizes: ['49mm Case'],
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple Watch Series 10 GPS 46mm Jet Black Aluminium',
        desc: 'Thinnest Apple Watch ever with 30% more active screen area, wide-angle OLED display, sleep apnea notifications, and fast charging.',
        price: 49900, discount: 5, colors: ['Jet Black', 'Rose Gold', 'Silver'], sizes: ['42mm', '46mm'],
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy Watch Ultra 47mm LTE Titanium Sapphire',
        desc: 'Cushion design titanium grade 4 case with Quick Button, 10ATM / IP68 water resistance, dual-frequency GPS, and BioActive sensor.',
        price: 59999, discount: 10, colors: ['Titanium Gray', 'Titanium White', 'Titanium Silver'], sizes: ['47mm LTE'],
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Garmin Fenix 7X Pro Solar Sapphire Titanium Multi-Sport GPS',
        desc: 'Solar charging sapphire crystal lens with built-in LED flashlight, preloaded TopoActive maps, ECG app, and up to 37 days of battery life.',
        price: 98990, discount: 8, colors: ['Carbon Gray DLC Titanium'], sizes: ['51mm Case'],
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // ==========================================
  // 6. CAMERAS, DRONES & SMART CONTENT CREATION
  // ==========================================
  {
    subcategory: 'Cameras & Drones',
    items: [
      {
        name: 'Sony Alpha 7 IV Full-Frame Mirrorless Camera (Body Only)',
        desc: '33MP Exmor R back-illuminated CMOS sensor with BIONZ XR engine, 4K 60p 10-bit 4:2:2 recording, and real-time Eye AF for human/animal/bird.',
        price: 219990, discount: 8, colors: ['Magnesium Alloy Black'], sizes: ['Body Only', 'With 28-70mm Lens'],
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'DJI Mini 4 Pro 4K HDR Foldable Drone with RC 2 Controller',
        desc: 'Sub-249g ultra-light drone with omnidirectional active obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD video transmission.',
        price: 92990, discount: 10, colors: ['Light Gray'], sizes: ['Fly More Combo Plus'],
        image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'DJI Osmo Pocket 3 4K/120fps 1-inch CMOS Vlogging Gimbal Camera',
        desc: '1-inch CMOS sensor with 2-inch rotatable OLED touchscreen, 3-axis mechanical gimbal stabilization, and ActiveTrack 6.0 subject tracking.',
        price: 49990, discount: 5, colors: ['Black Carbon'], sizes: ['Creator Combo'],
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'GoPro HERO 12 Black 5.3K Waterproof Action Camera',
        desc: 'HyperSmooth 6.0 video stabilization with 360-degree Horizon Lock, HDR 5.3K 60fps video, dual LCD screens, and Bluetooth audio support.',
        price: 37990, discount: 15, colors: ['Midnight Black with Blue Flecks'], sizes: ['Standard Kit', 'Accessory Bundle'],
        image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80']
      }
    ]
  }
];

const RETURN_POLICIES = [
  '7 Days Return & Exchange',
  '10 Days Replacement for Technical Defects',
  '14 Days Brand Authorized Replacement',
  '30 Days Money Back Guarantee'
];

const WARRANTIES = [
  '1 Year Apple / Brand Official International Warranty',
  '2 Years Manufacturer Comprehensive Warranty',
  '3 Years Brand Warranty with Onsite Technician Support',
  '1 Year Accidental Damage Protection with Brand Care'
];

async function seed1000Electronics() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const vendors = await User.find({ role: 'vendor' }).select('_id username email');
    console.log(`Found ${vendors.length} vendors in DB.`);

    const priorityVendor = vendors.find(v => String(v._id) === '6aa1acc9bb5a7aeb3ecac734') || vendors[0];

    const TARGET_COUNT = 1000;
    const productsToInsert = [];
    const historyToInsert = [];

    // Flatten all items
    const allItems = [];
    ELECTRONICS_TEMPLATES.forEach(sub => {
      sub.items.forEach(it => {
        allItems.push({ subcategory: sub.subcategory, ...it });
      });
    });

    console.log(`Total rich electronics base templates: ${allItems.length}`);

    const seriesLabels = [
      'Pro', 'Max', 'Ultra', 'Special Edition', 'Studio Line', 'Enterprise',
      'Creator Pack', 'Signature Series', 'Prime Edition', 'Apex v2',
      'Nordic Edition', 'Vanguard', 'Aurora Edition', 'Stealth Edition'
    ];

    for (let i = 0; i < TARGET_COUNT; i++) {
      const template = allItems[i % allItems.length];
      const series = seriesLabels[(i + Math.floor(i / allItems.length)) % seriesLabels.length];
      const serialNum = 100 + i;

      // Distribute vendors (35% to priority vendor, rest evenly)
      const assignedVendor = (i % 3 === 0) ? priorityVendor : vendors[i % vendors.length];

      // Realistic stock
      let quantity;
      const randStock = Math.random();
      if (randStock < 0.03) {
        quantity = 0;
      } else if (randStock < 0.15) {
        quantity = Math.floor(Math.random() * 8) + 1; // 1 to 8 (Low stock)
      } else {
        quantity = Math.floor(Math.random() * 75) + 15; // 15 to 90
      }

      // Price & discount variation
      const priceVariation = 0.88 + (Math.random() * 0.25);
      const finalPrice = Math.round(template.price * priceVariation);
      const discount = Math.min(45, Math.max(5, Math.round(template.discount + (Math.random() * 6 - 3))));
      const rating = Number((4.3 + Math.random() * 0.65).toFixed(1));
      const ratingCount = Math.floor(Math.random() * 320) + 20;

      const productName = `${template.name} (${series} - v${serialNum})`;
      const newId = new mongoose.Types.ObjectId();

      const productDoc = {
        _id: newId,
        name: productName,
        category: 'Electronics',
        description: `${template.desc} 100% genuine brand-new sealed unit with official manufacturer warranty and original boxed accessories. Fast express doorstep delivery.`,
        quantity: quantity,
        price: finalPrice,
        discountPercentage: discount,
        rating: rating,
        ratingCount: ratingCount,
        colors: template.colors,
        sizes: template.sizes,
        image: template.image,
        images: template.images || [template.image],
        returnPolicy: RETURN_POLICIES[i % RETURN_POLICIES.length],
        warranty: WARRANTIES[i % WARRANTIES.length],
        userId: assignedVendor._id,
        isDeleted: false,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      };

      productsToInsert.push(productDoc);

      historyToInsert.push({
        productId: newId,
        vendorId: assignedVendor._id,
        type: 'PRODUCT_CREATED',
        quantityChange: quantity,
        stockBefore: 0,
        stockAfter: quantity,
        referenceId: `ELEC-${String(newId).slice(-6).toUpperCase()}`,
        reason: 'Electronics catalog expansion provisioning',
        actor: 'Vendor',
        metadata: { category: 'Electronics', subcategory: template.subcategory, initialStock: quantity },
        createdAt: productDoc.createdAt
      });
    }

    console.log(`Inserting ${productsToInsert.length} brand-new electronics products in batches...`);
    const BATCH_SIZE = 250;
    for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
      const prodBatch = productsToInsert.slice(i, i + BATCH_SIZE);
      const histBatch = historyToInsert.slice(i, i + BATCH_SIZE);
      await Product.insertMany(prodBatch);
      await InventoryHistory.insertMany(histBatch);
      console.log(` - Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${prodBatch.length} products)...`);
    }

    const totalElectronics = await Product.countDocuments({ category: 'Electronics', isDeleted: false });
    const grandTotal = await Product.countDocuments({ isDeleted: false });

    console.log(`\n🎉 Successfully inserted 1,000 top-tier Electronics!`);
    console.log(`⚡ Total active Electronics in DB: ${totalElectronics}`);
    console.log(`📦 Grand Total active products across all categories: ${grandTotal}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding 1000 electronics:', err);
    process.exit(1);
  }
}

seed1000Electronics();

