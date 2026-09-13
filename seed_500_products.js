const mongoose = require('mongoose');
const Product = require('./models/product.model');
const User = require('./models/user.model');
const InventoryHistory = require('./models/inventory-history.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory-app';

// Categories and product templates with realistic HD Unsplash direct image links
const CATEGORY_TEMPLATES = [
  {
    category: 'Electronics',
    brands: ['Sony', 'Apple', 'Samsung', 'Bose', 'Logitech', 'Dell', 'Asus', 'Anker', 'Marshall', 'JBL', 'Sennheiser', 'Canon', 'GoPro'],
    items: [
      { name: 'Noise-Canceling Wireless Over-Ear Headphones', desc: 'Active noise cancellation with 40-hour battery life and ultra-comfortable memory foam earcups.', price: 14999, discount: 15, colors: ['Black', 'Silver', 'Midnight Blue'], sizes: ['Standard'], image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
      { name: 'Mechanical Gaming Keyboard RGB Backlit', desc: 'Tactile mechanical switches with customizable per-key RGB illumination and detachable wrist rest.', price: 4499, discount: 20, colors: ['Carbon Black', 'White Frost'], sizes: ['Full Size', 'Tenkeyless'], image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80' },
      { name: '4K Ultra-HD Webcam with Dual Microphones', desc: 'Crystal-clear 4K streaming at 60fps with HDR enhancement and noise-canceling stereo mics.', price: 6999, discount: 10, colors: ['Graphite Black'], sizes: ['Compact'], image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80' },
      { name: 'Ergonomic Wireless Multi-Device Mouse', desc: 'Precision laser tracking with hyper-fast scroll wheel and seamless switching between 3 devices.', price: 3299, discount: 12, colors: ['Space Gray', 'Pale Gray', 'Rose Pink'], sizes: ['Ergonomic Right'], image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80' },
      { name: 'Portable Bluetooth Waterproof Speaker 30W', desc: 'Deep bass 360-degree sound with IPX7 waterproof rating and 24-hour non-stop playtime.', price: 3999, discount: 25, colors: ['Ocean Blue', 'Stealth Black', 'Forest Green', 'Sunset Red'], sizes: ['Portable'], image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80' },
      { name: 'Fast Wireless Charging Stand 15W Qi-Certified', desc: 'Rapid inductive charging stand with dual-coil design for portrait and landscape phone viewing.', price: 1899, discount: 18, colors: ['Matte Black', 'Pearl White'], sizes: ['Desktop Stand'], image: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800&auto=format&fit=crop&q=80' },
      { name: 'Studio Monitoring In-Ear Monitors IEMs', desc: 'Dual hybrid dynamic and balanced armature drivers providing flat studio reference audio curve.', price: 4999, discount: 15, colors: ['Clear Resin', 'Smoke Gray'], sizes: ['Universal Fit (S/M/L Tips)'], image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80' },
      { name: 'Smart Fitness Tracker with AMOLED Color Screen', desc: 'All-day SpO2, heart rate, sleep tracking with 14 sports modes and 5ATM water resistance.', price: 2999, discount: 20, colors: ['Obsidian Black', 'Teal Green', 'Coral Pink'], sizes: ['Adjustable Strap'], image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=80' },
      { name: 'Ultra-Slim 27-inch 4K IPS Creator Monitor', desc: '99% sRGB color accuracy, HDR400, USB-C 65W power delivery and height-adjustable pivot stand.', price: 28999, discount: 8, colors: ['Titanium Silver'], sizes: ['27 Inch'], image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Fashion & Apparel',
    brands: ['Zara', 'H&M', 'Levi\'s', 'Nike', 'Adidas', 'Uniqlo', 'Tommy Hilfiger', 'Puma', 'Allen Solly', 'FabIndia'],
    items: [
      { name: 'Classic Tailored Slim-Fit Cotton Chinos', desc: 'Breathable stretch-cotton blend trousers tailored for contemporary smart-casual daily wear.', price: 1899, discount: 20, colors: ['Khaki Beige', 'Navy Blue', 'Olive Green', 'Charcoal'], sizes: ['30', '32', '34', '36', '38'], image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=80' },
      { name: 'Premium Heavyweight 100% Organic Cotton T-Shirt', desc: '240 GSM pre-shrunk combed organic cotton tee with reinforced crew neck and ribbed collar.', price: 899, discount: 10, colors: ['Pure White', 'Pitch Black', 'Sage Green', 'Heather Gray', 'Terracotta'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80' },
      { name: 'Vintage Washed Denim Trucker Jacket', desc: 'Rugged authentic heavyweight denim jacket with copper shank buttons and dual chest flap pockets.', price: 3499, discount: 15, colors: ['Vintage Indigo', 'Stone Washed Blue', 'Faded Black'], sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80' },
      { name: 'Cozy Oversized Fleece Pullover Hoodie', desc: 'Brushed interior fleece with double-lined drawstring hood and spacious kangaroo front pocket.', price: 1999, discount: 25, colors: ['Oatmeal Melange', 'Forest Green', 'Deep Navy', 'Burgundy'], sizes: ['M', 'L', 'XL', 'XXL'], image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80' },
      { name: 'Pure Linen Relaxed-Fit Button-Up Shirt', desc: 'Lightweight European flax linen shirt featuring classic spread collar and natural horn buttons.', price: 2499, discount: 15, colors: ['Sky Blue', 'Crisp White', 'Sand Khaki', 'Olive'], sizes: ['38', '40', '42', '44'], image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80' },
      { name: 'Water-Resistant All-Weather Windbreaker', desc: 'Lightweight ripstop nylon windbreaker with packable hood, zippered side pockets, and storm flap.', price: 2799, discount: 18, colors: ['Black / Slate', 'Navy / Yellow', 'Olive Drab'], sizes: ['S', 'M', 'L', 'XL'], image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Footwear & Shoes',
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Clarks', 'Vans', 'Converse', 'Woodland', 'Red Tape'],
    items: [
      { name: 'Ultra-Cushioned Lightweight Running Shoes', desc: 'Engineered breathable mesh upper with responsive foam midsole and high-abrasion rubber outsole.', price: 4299, discount: 20, colors: ['Triple Black', 'Electric Blue', 'White / Crimson'], sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80' },
      { name: 'Handcrafted Genuine Leather Chelsea Boots', desc: 'Full-grain Italian calf leather with elasticated side gussets and Goodyear welted rubber sole.', price: 5999, discount: 15, colors: ['Chestnut Brown', 'Jet Black', 'Tan Suede'], sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'], image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&auto=format&fit=crop&q=80' },
      { name: 'Classic Low-Top Canvas Casual Sneakers', desc: 'Durable cotton canvas with vulcanized waffle rubber outsole and cushioned EVA footbed.', price: 1899, discount: 10, colors: ['Off-White', 'Black / White', 'Monochrome Navy', 'Mustard Yellow'], sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'], image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop&q=80' },
      { name: 'Waterproof Trail Hiking Trekking Boots', desc: 'Gore-Tex waterproof membrane with reinforced toe cap and Vibram multi-terrain traction lugs.', price: 6499, discount: 12, colors: ['Bark Brown', 'Gunmetal Gray'], sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Home & Kitchen',
    brands: ['Philips', 'Prestige', 'Morphy Richards', 'Dyson', 'IKEA', 'Wonderchef', 'Cuisinart', 'Borosil', 'Milton'],
    items: [
      { name: 'Digital Touchscreen Rapid Air Fryer 5.5L', desc: '360 rapid air circulation with 8 preset one-touch cooking programs and non-stick dishwasher-safe basket.', price: 5499, discount: 25, colors: ['Matte Black', 'Brushed Stainless'], sizes: ['5.5 Liters'], image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80' },
      { name: 'Handcrafted Ceramic Dinner Set (16 Pieces)', desc: 'Artisanal stoneware microwave and dishwasher safe dinner plates, quarter plates, and soup bowls.', price: 3499, discount: 15, colors: ['Speckled Ivory', 'Cobalt Blue', 'Earthy Terracotta'], sizes: ['16-Piece Set'], image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&auto=format&fit=crop&q=80' },
      { name: 'Double-Walled French Press Coffee Maker', desc: 'High borosilicate glass with 4-level filtration system and heat-resistant cool-touch ergonomic handle.', price: 1499, discount: 20, colors: ['Brushed Steel', 'Matte Black', 'Copper Rose'], sizes: ['600ml', '1000ml'], image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80' },
      { name: 'Cordless Powerful Stick Vacuum Cleaner', desc: '250W brushless motor with HEPA filtration, cyclonic suction, and detachable handheld dust canister.', price: 11999, discount: 18, colors: ['Cobalt Purple', 'Space Silver'], sizes: ['Standard'], image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80' },
      { name: 'Chef Essential Cast Iron Pre-Seasoned Skillet', desc: 'Heavy-duty 10.25-inch cast iron frying pan with dual pour spouts and superior heat retention.', price: 1699, discount: 10, colors: ['Pre-Seasoned Black'], sizes: ['10.25 Inch', '12 Inch'], image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Beauty & Personal Care',
    brands: ['L\'Oreal', 'The Body Shop', 'Forest Essentials', 'Mamaearth', 'Neutrogena', 'Clinique', 'Biotique', 'Nivea'],
    items: [
      { name: 'Advanced Vitamin C Radiance Face Serum (30ml)', desc: '20% active Vitamin C enriched with Hyaluronic Acid and Ferulic Acid for hyperpigmentation glow.', price: 799, discount: 20, colors: ['Amber Glass Bottle'], sizes: ['30 ml', '50 ml'], image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80' },
      { name: 'Ultrasonic Ionic Facial Cleansing Brush', desc: 'Medical-grade antimicrobial silicone bristles with 8 vibration speeds for deep pore purification.', price: 1499, discount: 25, colors: ['Blush Pink', 'Mint Teal', 'Lavender'], sizes: ['Rechargeable Handheld'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80' },
      { name: 'Pure Organic Cold-Pressed Argan Hair Oil', desc: '100% Moroccan Argan oil rich in Vitamin E to restore frizz-free shine and prevent split ends.', price: 999, discount: 15, colors: ['Golden Amber'], sizes: ['100 ml'], image: 'https://images.unsplash.com/photo-1608248597359-2c633a6f44d6?w=800&auto=format&fit=crop&q=80' },
      { name: 'Professional Ceramic Ionic Hair Straightener', desc: 'Tourmaline ceramic floating plates with instant 30-second heat-up and digital temperature display.', price: 2499, discount: 18, colors: ['Rose Gold', 'Velvet Black'], sizes: ['1.25 Inch Plate'], image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Sports & Fitness',
    brands: ['Decathlon', 'Nike', 'Under Armour', 'Puma', 'Cosco', 'Nivia', 'Yonex', 'Reebok'],
    items: [
      { name: 'High-Density Non-Slip TPE Yoga Mat 6mm', desc: 'Dual-sided textured grip with body alignment guide lines and complimentary carrying shoulder strap.', price: 1299, discount: 20, colors: ['Teal / Grey', 'Plum / Violet', 'Midnight Blue'], sizes: ['72" x 24" x 6mm'], image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop&q=80' },
      { name: 'Adjustable Quick-Select Dumbbell Set (2.5kg - 24kg)', desc: 'Smooth dial selection system replaces 15 individual weights with heavy-duty cast steel plates.', price: 13999, discount: 15, colors: ['Black / Red'], sizes: ['24kg Single', 'Pair (48kg)'], image: 'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=800&auto=format&fit=crop&q=80' },
      { name: 'Professional Carbon Graphite Badminton Racket', desc: 'Ultra-light 4U aero frame with isometric head shape strung at 28 lbs tension for powerful smashes.', price: 2999, discount: 25, colors: ['Metallic Red', 'Matte Cyan'], sizes: ['4U G4 (82g)'], image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80' },
      { name: 'Insulated Stainless Steel Sports Water Bottle 1L', desc: 'Triple-wall vacuum insulation keeps liquids ice cold for 24 hours or piping hot for 12 hours.', price: 899, discount: 10, colors: ['Army Olive', 'Cobalt Blue', 'Brushed Silver', 'Coral'], sizes: ['750ml', '1000ml'], image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Furniture & Decor',
    brands: ['Urban Ladder', 'Pepperfry', 'IKEA', 'Godrej Interio', 'Wakefit', 'Home Centre'],
    items: [
      { name: 'Solid Sheesham Wood Coffee Table with Shelf', desc: 'Handcrafted natural teak finish living room center table with spacious lower storage magazine tier.', price: 7499, discount: 18, colors: ['Honey Teak', 'Walnut Dark', 'Mahogany'], sizes: ['100cm x 60cm x 45cm'], image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&auto=format&fit=crop&q=80' },
      { name: 'Ergonomic High-Back Executive Mesh Office Chair', desc: 'Dynamic lumbar support, 3D adjustable armrests, breathable mesh back, and 135-degree tilt recline.', price: 8999, discount: 22, colors: ['Space Black', 'Light Grey'], sizes: ['Adjustable Height'], image: 'https://images.unsplash.com/photo-1580481077190-7362a220268c?w=800&auto=format&fit=crop&q=80' },
      { name: 'Modern Minimalist Arc Floor Standing Lamp', desc: 'Matte black metal arc frame with brushed brass accents and foot-pedal on/off switch.', price: 3299, discount: 15, colors: ['Matte Black / Brass', 'Brushed Nickel'], sizes: ['160cm Height'], image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80' },
      { name: 'Boho Macrame Hand-Woven Wall Hanging Decor', desc: '100% pure natural cotton rope woven on natural pine dowel, creating an inviting warm boho accent.', price: 1199, discount: 10, colors: ['Natural Cream', 'Terracotta & Beige'], sizes: ['50cm x 80cm'], image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Pooja & Spiritual',
    brands: ['Vedika Heritage', 'Satya Incense', 'Pooja Divine', 'Om Crafts', 'Divya Jyoti'],
    items: [
      { name: 'Handcrafted Brass Ganesha Idol with Arch Prabhavali', desc: 'Solid brass statue of Lord Ganesha seated on lotus pedestal with intricate traditional engravings.', price: 2999, discount: 15, colors: ['Antique Brass', 'Glossy Gold'], sizes: ['6 Inch', '9 Inch'], image: 'https://images.unsplash.com/photo-1567591974584-f1832b45717a?w=800&auto=format&fit=crop&q=80' },
      { name: 'Traditional Hand-Carved Brass Akhand Diya with Glass Chimney', desc: 'Deep brass oil lamp with heat-resistant borosilicate glass chimney for continuous sacred flame.', price: 849, discount: 12, colors: ['Golden Brass'], sizes: ['Medium (14cm)', 'Large (18cm)'], image: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=800&auto=format&fit=crop&q=80' },
      { name: 'Premium Mysore Sandalwood & Natural Flora Incense Cones Set', desc: 'Box of 120 organic slow-burning dhoop cones with ceramic incense holder plate.', price: 499, discount: 10, colors: ['Natural Sandalwood'], sizes: ['Pack of 120'], image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Stationery & Office',
    brands: ['Parker', 'Moleskine', 'Staedtler', 'Faber-Castell', 'Camlin', 'Classmate'],
    items: [
      { name: 'Hardcover Dotted Bullet Journal Notebook 160 GSM', desc: 'Bleedproof ultra-thick bamboo paper with dual ribbon bookmarks, elastic closure, and expandable back pocket.', price: 799, discount: 15, colors: ['Forest Green', 'Midnight Navy', 'Terracotta', 'Charcoal'], sizes: ['A5 (160 Pages)'], image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80' },
      { name: 'Executive Refillable Fountain Pen with Medium Nib', desc: 'Precision balanced lacquered brass barrel with stainless steel iridium-tipped nib and converter.', price: 1499, discount: 20, colors: ['Gloss Black & Gold', 'Brushed Chrome', 'Matte Blue'], sizes: ['Medium Nib (0.7mm)'], image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80' },
      { name: 'Dual-Sided Eco-Friendly Leather Desk Mat 90x45cm', desc: 'Waterproof PU leather desk blotter pad with smooth mouse gliding surface and anti-fray stitched edges.', price: 999, discount: 18, colors: ['Dark Green / Gold', 'Black / Red', 'Tan / Brown'], sizes: ['90cm x 45cm'], image: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80' }
    ]
  },
  {
    category: 'Gaming & Toys',
    brands: ['Razer', 'Logitech G', 'SteelSeries', 'HyperX', 'Lego', 'Hasbro'],
    items: [
      { name: 'Wireless 7.1 Surround Sound Gaming Headset', desc: 'Ultra-low latency 2.4GHz wireless audio with 50mm neodymium drivers and broadcast-quality noise-canceling mic.', price: 5999, discount: 15, colors: ['Stealth Black', 'Mercury White', 'Quartz Pink'], sizes: ['Standard Gaming Fit'], image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80' },
      { name: 'Precision Wireless Gaming Controller with Hall-Effect Sticks', desc: 'Zero-drift magnetic sensor joysticks with tactile mechanical face buttons and customizable back paddles.', price: 3799, discount: 10, colors: ['Cosmic Purple', 'Midnight Black', 'Glacier White'], sizes: ['Standard Controller'], image: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=800&auto=format&fit=crop&q=80' }
    ]
  }
];

const RETURN_POLICIES = [
  '7 Days Return & Exchange',
  '10 Days Replacement Only',
  '14 Days Hassle-Free Return',
  '30 Days Money Back Guarantee',
  '7 Days Returnable for Defective Units'
];

const WARRANTIES = [
  '1 Year Manufacturer Warranty',
  '2 Years Comprehensive Warranty',
  '6 Months Limited Warranty',
  '3 Years Brand Warranty',
  'Lifetime Replacement on Manufacturing Defects'
];

async function seed500Products() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Fetch all vendors
    const vendors = await User.find({ role: 'vendor' }).select('_id username email');
    console.log(`Found ${vendors.length} vendors in DB:`);
    vendors.forEach(v => console.log(` - ${v.username} (${v.email}) ID: ${v._id}`));

    if (vendors.length === 0) {
      console.error('No vendors found. Please create or seed vendors first.');
      process.exit(1);
    }

    // Key priority vendor: JK Retail & Co (6aa1acc9bb5a7aeb3ecac734 if exists, else first vendor)
    const priorityVendor = vendors.find(v => String(v._id) === '6aa1acc9bb5a7aeb3ecac734') || vendors[0];
    console.log(`Priority Vendor: ${priorityVendor.username} (${priorityVendor._id})`);

    const productsToInsert = [];
    const historyToInsert = [];
    const TARGET_COUNT = 500;

    let totalItemsAcrossCategories = 0;
    CATEGORY_TEMPLATES.forEach(cat => totalItemsAcrossCategories += cat.items.length);

    for (let i = 0; i < TARGET_COUNT; i++) {
      // Pick category template round-robin / randomized
      const catGroup = CATEGORY_TEMPLATES[i % CATEGORY_TEMPLATES.length];
      const baseItem = catGroup.items[i % catGroup.items.length];
      const brand = catGroup.brands[i % catGroup.brands.length];

      // Assign vendor: 35% to priority vendor, remainder evenly distributed
      let assignedVendor;
      if (i % 3 === 0) {
        assignedVendor = priorityVendor;
      } else {
        assignedVendor = vendors[i % vendors.length];
      }

      // Generate slight variations in serial/edition/color
      const serialSuffix = 100 + (Math.floor(i / CATEGORY_TEMPLATES.length) + 1);
      const editionLabels = ['Pro', 'Ultra', 'Plus', 'Edition', 'Elite', 'Signature Series', 'Classic', 'Prime', 'Gen 2', 'Max'];
      const edition = editionLabels[i % editionLabels.length];
      
      const productName = `${brand} ${baseItem.name} ${edition} (v${serialSuffix})`;
      
      // Stock quantity variation (some low stock for dashboard realism: 15% low/out of stock, 85% healthy)
      let quantity;
      const randType = Math.random();
      if (randType < 0.05) {
        quantity = 0; // Out of stock
      } else if (randType < 0.18) {
        quantity = Math.floor(Math.random() * 9) + 1; // Low stock: 1 to 9
      } else {
        quantity = Math.floor(Math.random() * 85) + 15; // Healthy: 15 to 100
      }

      const price = Math.round(baseItem.price * (0.85 + (Math.random() * 0.35)));
      const discount = Math.min(60, Math.max(5, Math.round(baseItem.discount + (Math.random() * 10 - 5))));
      const rating = Number((4.0 + Math.random() * 0.95).toFixed(1));
      const ratingCount = Math.floor(Math.random() * 180) + 12;

      const returnPolicy = RETURN_POLICIES[i % RETURN_POLICIES.length];
      const warranty = WARRANTIES[i % WARRANTIES.length];

      const newId = new mongoose.Types.ObjectId();

      // Additional thumbnail photos
      const secondaryPhotos = [
        baseItem.image,
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
      ];

      const productDoc = {
        _id: newId,
        name: productName,
        category: catGroup.category,
        description: `${baseItem.desc} Engineered by ${brand} for superior everyday performance, unmatched durability, and premium ergonomics. Includes authentic manufacturer packaging.`,
        quantity: quantity,
        price: price,
        discountPercentage: discount,
        rating: rating,
        ratingCount: ratingCount,
        colors: baseItem.colors,
        sizes: baseItem.sizes,
        image: baseItem.image,
        images: secondaryPhotos,
        returnPolicy: returnPolicy,
        warranty: warranty,
        userId: assignedVendor._id,
        isDeleted: false,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // spread over last 30 days
        updatedAt: new Date()
      };

      productsToInsert.push(productDoc);

      // Audit history record
      historyToInsert.push({
        productId: newId,
        vendorId: assignedVendor._id,
        type: 'PRODUCT_CREATED',
        quantityChange: quantity,
        stockBefore: 0,
        stockAfter: quantity,
        referenceId: `INIT-${String(newId).slice(-6).toUpperCase()}`,
        reason: 'Initial catalog inventory provisioning',
        actor: 'Vendor',
        metadata: { category: catGroup.category, initialStock: quantity },
        createdAt: productDoc.createdAt
      });
    }

    console.log(`Inserting ${productsToInsert.length} rich realistic products...`);
    const insertedProducts = await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${insertedProducts.length} products!`);

    console.log(`Inserting ${historyToInsert.length} audit history records...`);
    await InventoryHistory.insertMany(historyToInsert);
    console.log(`Successfully created audit history records!`);

    const totalInDb = await Product.countDocuments({ isDeleted: false });
    console.log(`Total active products in database now: ${totalInDb}`);

    const priorityVendorCount = await Product.countDocuments({ userId: priorityVendor._id, isDeleted: false });
    console.log(`Total active products for priority vendor (${priorityVendor.username}): ${priorityVendorCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding 500 products:', err);
    process.exit(1);
  }
}

seed500Products();
