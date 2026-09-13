const mongoose = require('mongoose');

async function seed100MoreProducts() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const Product = require('./models/product.model');
  const User = require('./models/user.model');

  const vendors = await User.find({ role: 'vendor' }).lean();
  const vMap = {};
  vendors.forEach(v => {
    vMap[v.name] = v._id;
  });

  // Fallbacks if some names differ
  const getVId = (name, fallback = 'JK Retail & Co.') => {
    return vMap[name] || vMap[fallback] || vendors[0]._id;
  };

  const new100Products = [
    // 1. Electronics (Smartphones, Audio, Laptops, Accessories)
    {
      name: "Apple iPhone 16 Pro Max 256GB Desert Titanium",
      category: "Electronics",
      price: 139900,
      originalPrice: 144900,
      discountPercent: 3,
      quantity: 18,
      rating: 4.9,
      ratingCount: 182,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
      description: "A18 Pro bionic chip, grade 5 titanium design, 48MP fusion camera and next-gen battery life.",
      colors: ["Desert Titanium", "Natural Titanium", "White Titanium", "Black Titanium"],
      sizes: ["128GB", "256GB", "512GB", "1TB"],
      highlights: ["Super Retina XDR 6.9-inch display", "Action Button with Camera Control", "USB-C with USB 3 speeds"]
    },
    {
      name: "Apple iPad Air 11-inch M2 Chip 128GB Wi-Fi",
      category: "Electronics",
      price: 59900,
      originalPrice: 64900,
      discountPercent: 8,
      quantity: 25,
      rating: 4.8,
      ratingCount: 94,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
      description: "Supercharged by the Apple M2 chip with Liquid Retina display, Touch ID, and landscape front camera.",
      colors: ["Space Grey", "Starlight", "Purple", "Blue"],
      sizes: ["128GB", "256GB", "512GB"],
      highlights: ["Apple M2 chip 8-core CPU", "Liquid Retina display with True Tone", "Supports Apple Pencil Pro"]
    },
    {
      name: "Apple Watch Ultra 2 GPS + Cellular 49mm Titanium",
      category: "Electronics",
      price: 89900,
      originalPrice: 94900,
      discountPercent: 5,
      quantity: 12,
      rating: 4.9,
      ratingCount: 67,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80",
      description: "Rugged and capable smartwatch designed for endurance athletes and outdoor adventurers with 3000 nits display.",
      colors: ["Natural Titanium", "Black Titanium"],
      sizes: ["Trail Loop S/M", "Trail Loop M/L", "Ocean Band"],
      highlights: ["Dual-frequency precision GPS", "100m water resistance rating", "Up to 72 hours low power battery"]
    },
    {
      name: "OnePlus 12 5G 16GB RAM 512GB Silky Black",
      category: "Electronics",
      price: 64999,
      originalPrice: 69999,
      discountPercent: 7,
      quantity: 22,
      rating: 4.7,
      ratingCount: 135,
      vendorName: "OnePlus Official",
      userId: getVId("OnePlus Official"),
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
      description: "Snapdragon 8 Gen 3 flagship with 4th Gen Hasselblad Camera System, 5400 mAh battery & 100W SUPERVOOC.",
      colors: ["Silky Black", "Flowy Emerald", "Glacial White"],
      sizes: ["256GB", "512GB"],
      highlights: ["Snapdragon 8 Gen 3 Processor", "2K 120Hz ProXDR Display", "50W Wireless AIRVOOC Charging"]
    },
    {
      name: "OnePlus Buds Pro 3 Dual Driver Spatial Audio",
      category: "Electronics",
      price: 11999,
      originalPrice: 13999,
      discountPercent: 14,
      quantity: 40,
      rating: 4.6,
      ratingCount: 88,
      vendorName: "OnePlus Official",
      userId: getVId("OnePlus Official"),
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
      description: "Dynaudio co-tuned dual drivers with 50dB adaptive active noise cancellation and Google Fast Pair.",
      colors: ["Midnight Obsidian", "Lunar Radiance"],
      sizes: [],
      highlights: ["Dual Woofer + Tweeter Drivers", "Up to 50dB Smart Adaptive ANC", "LHDC 5.0 High-Res Wireless Audio"]
    },
    {
      name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
      category: "Electronics",
      price: 28990,
      originalPrice: 34990,
      discountPercent: 17,
      quantity: 30,
      rating: 4.9,
      ratingCount: 310,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      description: "Industry leading noise cancellation with two processors and 8 microphones for superior call and music clarity.",
      colors: ["Black", "Silver", "Midnight Blue"],
      sizes: [],
      highlights: ["Auto NC Optimizer", "30-hour battery life with quick charge", "Precise Voice Pickup technology"]
    },
    {
      name: "Bose SoundLink Flex Portable Bluetooth Speaker II",
      category: "Electronics",
      price: 14900,
      originalPrice: 17900,
      discountPercent: 16,
      quantity: 35,
      rating: 4.8,
      ratingCount: 142,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
      description: "Crisp, clear sound and deep bass engineered for outdoor adventures with PositionIQ technology and IP67 waterproof rating.",
      colors: ["Black", "Stone Blue", "White Smoke", "Chilled Lilac"],
      sizes: [],
      highlights: ["PositionIQ acoustic optimization", "IP67 dust and waterproof", "12 hours battery per charge"]
    },
    {
      name: "Samsung Galaxy Tab S9 FE 10.9-inch 128GB with S Pen",
      category: "Electronics",
      price: 36999,
      originalPrice: 44999,
      discountPercent: 18,
      quantity: 20,
      rating: 4.6,
      ratingCount: 75,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&auto=format&fit=crop&q=80",
      description: "Vibrant 90Hz display with in-box water-resistant S Pen, IP68 rated body, and long-lasting 8000mAh battery.",
      colors: ["Gray", "Silver", "Mint", "Lavender"],
      sizes: ["128GB", "256GB"],
      highlights: ["Water and dust resistant S Pen", "90Hz smooth scrolling display", "Dual speakers by AKG"]
    },
    {
      name: "SanDisk Extreme 1TB Portable SSD 1050MB/s NVMe",
      category: "Electronics",
      price: 9499,
      originalPrice: 14500,
      discountPercent: 35,
      quantity: 50,
      rating: 4.8,
      ratingCount: 420,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80",
      description: "Rugged, high-speed NVMe solid state drive with 2-meter drop protection and IP55 water & dust resistance.",
      colors: ["Black & Orange"],
      sizes: ["500GB", "1TB", "2TB"],
      highlights: ["Up to 1050MB/s read speeds", "Password protection with hardware encryption", "Carabiner loop for travel"]
    },
    {
      name: "Logitech MX Master 3S Advanced Wireless Mouse",
      category: "Electronics",
      price: 8995,
      originalPrice: 10995,
      discountPercent: 18,
      quantity: 45,
      rating: 4.9,
      ratingCount: 512,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
      description: "Quiet clicks and 8K DPI any-surface tracking with MagSpeed electromagnetic scrolling wheel.",
      colors: ["Graphite", "Pale Grey"],
      sizes: [],
      highlights: ["8000 DPI Darkfield sensor", "Quiet Click technology", "Multi-device Flow control across 3 PCs"]
    },

    // 2. Gaming (Consoles, Keyboards, Headsets, Gamepads)
    {
      name: "Sony PlayStation 5 Slim Console Digital Edition",
      category: "Gaming",
      price: 44990,
      originalPrice: 49990,
      discountPercent: 10,
      quantity: 15,
      rating: 4.9,
      ratingCount: 390,
      vendorName: "Ayan Gaming Zone",
      userId: getVId("Ayan Gaming Zone"),
      image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80",
      description: "Next-gen gaming power in a sleek, slim format with ultra-high speed 1TB SSD and ray tracing graphics.",
      colors: ["Classic White"],
      sizes: ["1TB SSD"],
      highlights: ["Haptic feedback with DualSense controller", "4K 120Hz HDR gaming", "Tempest 3D AudioTech"]
    },
    {
      name: "Xbox Series X 1TB Gaming Console Carbon Black",
      category: "Gaming",
      price: 49990,
      originalPrice: 55990,
      discountPercent: 11,
      quantity: 12,
      rating: 4.8,
      ratingCount: 210,
      vendorName: "Ayan Gaming Zone",
      userId: getVId("Ayan Gaming Zone"),
      image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&auto=format&fit=crop&q=80",
      description: "The fastest, most powerful Xbox ever with 12 teraflops of raw graphic processing power and Quick Resume.",
      colors: ["Carbon Black"],
      sizes: ["1TB SSD"],
      highlights: ["12 Teraflops GPU processing", "Quick Resume across multiple games", "Xbox Game Pass Ultimate ready"]
    },
    {
      name: "Razer BlackWidow V4 Mechanical RGB Gaming Keyboard",
      category: "Gaming",
      price: 13499,
      originalPrice: 16999,
      discountPercent: 20,
      quantity: 25,
      rating: 4.7,
      ratingCount: 110,
      vendorName: "Ayan Gaming Zone",
      userId: getVId("Ayan Gaming Zone"),
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
      description: "Razer Green clicky mechanical switches with multi-function roller, dedicated macro keys and Chroma RGB.",
      colors: ["Classic Black"],
      sizes: [],
      highlights: ["Razer Green Clicky Switches", "Magnetic plush leatherette wrist rest", "8000Hz hyper-polling rate"]
    },
    {
      name: "HyperX Cloud III Wireless Gaming Headset 120hr Battery",
      category: "Gaming",
      price: 13990,
      originalPrice: 16990,
      discountPercent: 18,
      quantity: 30,
      rating: 4.8,
      ratingCount: 95,
      vendorName: "Ayan Gaming Zone",
      userId: getVId("Ayan Gaming Zone"),
      image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
      description: "Legendary comfort with 120 hours of wireless battery life, 53mm angled drivers and DTS Headphone:X Spatial Audio.",
      colors: ["Black / Red", "All Black"],
      sizes: [],
      highlights: ["Up to 120-hour battery life", "53mm angled audio drivers", "Detachable noise-cancelling 10mm mic"]
    },

    // 3. Fashion & Apparel (Men, Women, Luxury, Ethnic)
    {
      name: "Triveni Pure Mulberry Silk Kanjivaram Zari Saree",
      category: "Fashion",
      price: 8499,
      originalPrice: 14999,
      discountPercent: 43,
      quantity: 35,
      rating: 4.9,
      ratingCount: 160,
      vendorName: "Triveni Fashion & Apparel",
      userId: getVId("Triveni Fashion & Apparel"),
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
      description: "Authentic woven pure silk saree with heavy golden zari border and matching unstitched blouse piece.",
      colors: ["Royal Maroon", "Emerald Green", "Peacock Blue", "Rani Pink"],
      sizes: ["Free Size (5.5m + 0.8m blouse)"],
      highlights: ["100% Pure Mulberry Silk", "Intricate gold zari brocade", "Silk Mark certified authentic"]
    },
    {
      name: "Men Slim Fit Cotton Linen Casual Shirt",
      category: "Fashion",
      price: 1499,
      originalPrice: 2999,
      discountPercent: 50,
      quantity: 80,
      rating: 4.5,
      ratingCount: 240,
      vendorName: "Triveni Fashion & Apparel",
      userId: getVId("Triveni Fashion & Apparel"),
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
      description: "Breathable pure linen cotton blend shirt with spread collar and curved hemline for effortless smart casual style.",
      colors: ["Sky Blue", "Olive Green", "White", "Navy Blue", "Beige"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      highlights: ["70% Linen 30% Combed Cotton", "Pre-washed for super soft handfeel", "Machine washable colourfast"]
    },
    {
      name: "Women Embroidered Anarkali Kurta Set with Dupatta",
      category: "Fashion",
      price: 2799,
      originalPrice: 5499,
      discountPercent: 49,
      quantity: 50,
      rating: 4.7,
      ratingCount: 188,
      vendorName: "Ari Trends",
      userId: getVId("Ari Trends"),
      image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80",
      description: "Flared anarkali kurta in chanderi silk with thread embroidery, paired with cotton trousers and organza dupatta.",
      colors: ["Dusty Rose", "Sage Green", "Mustard Yellow", "Sky Blue"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      highlights: ["Chanderi silk blend fabric", "Organza foil-printed dupatta", "Side pocket in trousers"]
    },
    {
      name: "Men Regular Fit Heavyweight Cotton Hooded Sweatshirt",
      category: "Fashion",
      price: 1899,
      originalPrice: 3499,
      discountPercent: 46,
      quantity: 65,
      rating: 4.6,
      ratingCount: 145,
      vendorName: "Ari Trends",
      userId: getVId("Ari Trends"),
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
      description: "380 GSM fleece lined hoodie with kangaroo pocket, double-lined hood and durable ribbed cuffs.",
      colors: ["Charcoal Grey", "Olive Green", "Jet Black", "Sand Dune"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      highlights: ["380 GSM heavy fleece cotton", "Kangaroo pocket with reinforced stitching", "Thermal warmth lining"]
    },

    // 4. Footwear
    {
      name: "Nike Air Jordan 1 Retro High OG Chicago Lost & Found",
      category: "Fashion",
      price: 17995,
      originalPrice: 19995,
      discountPercent: 10,
      quantity: 14,
      rating: 4.9,
      ratingCount: 220,
      vendorName: "Arush Footwear",
      userId: getVId("Arush Footwear"),
      image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80",
      description: "Iconic high-top silhouette in vintage Chicago colorway with aged accents and premium leather upper.",
      colors: ["Varsity Red / White / Black"],
      sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
      highlights: ["Genuine full-grain leather upper", "Encapsulated Nike Air-Sole unit", "Solid rubber outsole with pivot circle"]
    },
    {
      name: "Puma Nitro Foam Lightweight Running Shoes",
      category: "Sports & Fitness",
      price: 4999,
      originalPrice: 8999,
      discountPercent: 44,
      quantity: 40,
      rating: 4.7,
      ratingCount: 164,
      vendorName: "Arush Footwear",
      userId: getVId("Arush Footwear"),
      image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80",
      description: "Ultra-responsive Nitro foam cushioning with engineered mesh breathable upper and PumaGrip traction.",
      colors: ["Sun Stream / Sunset Glow", "Puma Black / White", "Electric Lime"],
      sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
      highlights: ["Advanced NITRO foam technology", "PUMAGRIP all-surface rubber", "Reflective elements for night visibility"]
    },
    {
      name: "Woodland Men Rugged Genuine Leather Trekking Boots",
      category: "Fashion",
      price: 4295,
      originalPrice: 5995,
      discountPercent: 28,
      quantity: 35,
      rating: 4.8,
      ratingCount: 310,
      vendorName: "Arush Footwear",
      userId: getVId("Arush Footwear"),
      image: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80",
      description: "Nubuck leather heavy-duty outdoor boots with deep lugged rubber soles for superior off-road grip.",
      colors: ["Camel Khaki", "Dark Olive", "Deep Brown"],
      sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
      highlights: ["Full grain nubuck leather", "Rust-proof brass eyelets", "Anti-fatigue cushioned footbed"]
    },

    // 5. Home & Furniture (Living, Bedroom, Decor)
    {
      name: "Solimo Solid Sheesham Wood 3-Seater Sofa with Cushions",
      category: "Home & Furniture",
      price: 21999,
      originalPrice: 34999,
      discountPercent: 37,
      quantity: 10,
      rating: 4.7,
      ratingCount: 78,
      vendorName: "Rajesh Living & Furniture",
      userId: getVId("Rajesh Living & Furniture"),
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80",
      description: "Handcrafted from seasoned Sheesham rosewood with rich walnut finish and high-density foam cushions.",
      colors: ["Warm Walnut with Cream Cushions", "Teak Finish with Grey Cushions"],
      sizes: ["3-Seater (185cm x 75cm x 80cm)"],
      highlights: ["100% Solid Indian Rosewood", "Termite resistant 5-year warranty", "Removable washable cushion covers"]
    },
    {
      name: "Ergonomic High-Back Mesh Executive Office Chair",
      category: "Home & Furniture",
      price: 7999,
      originalPrice: 14999,
      discountPercent: 47,
      quantity: 45,
      rating: 4.8,
      ratingCount: 290,
      vendorName: "Rajesh Living & Furniture",
      userId: getVId("Rajesh Living & Furniture"),
      image: "https://images.unsplash.com/photo-1580481077190-7361356a15fa?w=600&auto=format&fit=crop&q=80",
      description: "Breathable Korean mesh back with adjustable 3D lumbar support, 2D armrests and heavy-duty chrome wheelbase.",
      colors: ["All Black", "Grey & White"],
      sizes: [],
      highlights: ["3D dynamic lumbar support", "Class-4 hydraulic gas lift", "135-degree recline with tilt lock"]
    },
    {
      name: "Sheesham Wood King Size Bed with Hydraulic Storage",
      category: "Home & Furniture",
      price: 34999,
      originalPrice: 52999,
      discountPercent: 34,
      quantity: 8,
      rating: 4.8,
      ratingCount: 65,
      vendorName: "Rajesh Living & Furniture",
      userId: getVId("Rajesh Living & Furniture"),
      image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80",
      description: "Spacious King size wooden bed with dual hydraulic lifting mechanism for effortless mattress storage access.",
      colors: ["Honey Teak", "Dark Walnut"],
      sizes: ["King (78x72 inches)", "Queen (78x60 inches)"],
      highlights: ["Easy hydraulic lift mechanism", "Heavy-duty slatted base", "Termite and moisture treated wood"]
    },
    {
      name: "Nordic Minimalist Arc Floor Lamp with Marble Base",
      category: "Home & Furniture",
      price: 3499,
      originalPrice: 5999,
      discountPercent: 42,
      quantity: 30,
      rating: 4.6,
      ratingCount: 82,
      vendorName: "Vera Lifestyle",
      userId: getVId("Vera Lifestyle"),
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
      description: "Contemporary curved reading lamp with heavy white marble stabilizing base and adjustable linen drum shade.",
      colors: ["Brushed Brass", "Matte Black"],
      sizes: [],
      highlights: ["Heavy solid marble base", "Foot pedal power switch", "Compatible with smart E27 LED bulbs"]
    },

    // 6. Kitchen & Dining
    {
      name: "Prestige Iris Plus 750W Mixer Grinder with 4 Jars",
      category: "Kitchen",
      price: 2999,
      originalPrice: 5295,
      discountPercent: 43,
      quantity: 60,
      rating: 4.6,
      ratingCount: 520,
      vendorName: "Ansha Home & Kitchen",
      userId: getVId("Ansha Home & Kitchen"),
      image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80",
      description: "Powerful 750 watt copper motor with 3 stainless steel jars, 1 transparent juicer jar and overload protection.",
      colors: ["Black & Blue"],
      sizes: [],
      highlights: ["750W heavy-duty motor", "Stainless steel multi-purpose blades", "Ergonomic sturdy jar handles"]
    },
    {
      name: "Bergner Tri-Ply Stainless Steel 3-Piece Cookware Set",
      category: "Kitchen",
      price: 4599,
      originalPrice: 7990,
      discountPercent: 42,
      quantity: 40,
      rating: 4.9,
      ratingCount: 140,
      vendorName: "Vam Kitchenware",
      userId: getVId("Vam Kitchenware"),
      image: "https://images.unsplash.com/photo-1584990347449-3a9d94943f65?w=600&auto=format&fit=crop&q=80",
      description: "Tri-ply 304 food-grade stainless steel with aluminium core for even heat distribution across gas and induction stoves.",
      colors: ["Mirror Polished Silver"],
      sizes: ["3-Piece Set (Kadai, Frypan, Saucepan)"],
      highlights: ["100% Food-grade 18/10 stainless steel", "Gas and Induction compatible", "Stay-cool cast steel handles"]
    },
    {
      name: "Milton Thermosteel 1000ml Hot & Cold Vacuum Flask",
      category: "Kitchen",
      price: 899,
      originalPrice: 1290,
      discountPercent: 30,
      quantity: 100,
      rating: 4.7,
      ratingCount: 680,
      vendorName: "Vam Kitchenware",
      userId: getVId("Vam Kitchenware"),
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
      description: "Double-walled vacuum insulated 304 grade stainless steel bottle keeps drinks hot or cold for 24 hours.",
      colors: ["Matte Black", "Silver", "Navy Blue", "Army Green"],
      sizes: ["750ml", "1000ml"],
      highlights: ["24-hour temperature retention", "100% leak-proof flip lid", "Rust-free 304 stainless steel interior"]
    },

    // 7. Appliances
    {
      name: "Philips Digital Air Fryer HD9252 with Rapid Air Tech 4.1L",
      category: "Appliances",
      price: 6999,
      originalPrice: 11995,
      discountPercent: 42,
      quantity: 30,
      rating: 4.8,
      ratingCount: 410,
      vendorName: "Ashu Appliances",
      userId: getVId("Ashu Appliances"),
      image: "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?w=600&auto=format&fit=crop&q=80",
      description: "Patented Rapid Air Technology fries with up to 90% less fat with 7 preset touch screen cooking menus.",
      colors: ["Glossy Black"],
      sizes: ["4.1 Litre"],
      highlights: ["Up to 90% less oil cooking", "Digital touch screen with 7 presets", "Dishwasher safe non-stick basket"]
    },
    {
      name: "Dyson V8 Absolute Cord-Free Vacuum Cleaner",
      category: "Appliances",
      price: 29900,
      originalPrice: 39900,
      discountPercent: 25,
      quantity: 15,
      rating: 4.9,
      ratingCount: 175,
      vendorName: "Ashu Appliances",
      userId: getVId("Ashu Appliances"),
      image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80",
      description: "Powerful digital motor V8 with whole-machine filtration capturing 99.99% of microscopic particles down to 0.3 microns.",
      colors: ["Nickel / Yellow"],
      sizes: [],
      highlights: ["Up to 40 minutes fade-free suction", "De-tangling Motorbar cleaner head", "Converts to handheld in 1 click"]
    },
    {
      name: "Morphy Richards 24L Convection Microwave Oven",
      category: "Appliances",
      price: 10499,
      originalPrice: 16995,
      discountPercent: 38,
      quantity: 20,
      rating: 4.6,
      ratingCount: 130,
      vendorName: "Ashu Appliances",
      userId: getVId("Ashu Appliances"),
      image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80",
      description: "All-in-one baking, grilling, reheating and roasting with stainless steel cavity and 100 auto-cook menus.",
      colors: ["Black Mirror Glass"],
      sizes: ["24 Litres"],
      highlights: ["Motorised rotisserie feature", "Stainless steel interior cavity", "100 Indian auto-cook recipes"]
    },

    // 8. Sports & Fitness
    {
      name: "Decathlon 20kg Cast Iron Adjustable Dumbbell Set with Case",
      category: "Sports & Fitness",
      price: 3999,
      originalPrice: 6499,
      discountPercent: 38,
      quantity: 50,
      rating: 4.8,
      ratingCount: 380,
      vendorName: "Sai Sports & Fitness",
      userId: getVId("Sai Sports & Fitness"),
      image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
      description: "Heavy-duty cast iron weight plates with spinlock collars and molded carrying case for home strength workouts.",
      colors: ["Matte Black"],
      sizes: ["20kg Set (2x 10kg)"],
      highlights: ["Durable cast iron construction", "Ergonomic knurled chrome bars", "Convenient storage case"]
    },
    {
      name: "Yonex Astrox 99 Pro Graphite Badminton Racket",
      category: "Sports & Fitness",
      price: 7490,
      originalPrice: 11990,
      discountPercent: 38,
      quantity: 35,
      rating: 4.9,
      ratingCount: 160,
      vendorName: "Sai Sports & Fitness",
      userId: getVId("Sai Sports & Fitness"),
      image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80",
      description: "Head-heavy power racket with Rotational Generator System and Namd graphite shaft for explosive smash power.",
      colors: ["Cherry Sunburst", "White Tiger"],
      sizes: ["3U (88g)", "4U (83g)"],
      highlights: ["Namd revolutionary graphite", "Energy Boost Cap Plus", "Full cover case included"]
    },
    {
      name: "Boldfit TPE Anti-Tear Eco Yoga Mat 6mm with Carry Strap",
      category: "Sports & Fitness",
      price: 999,
      originalPrice: 1999,
      discountPercent: 50,
      quantity: 90,
      rating: 4.7,
      ratingCount: 520,
      vendorName: "Sai Sports & Fitness",
      userId: getVId("Sai Sports & Fitness"),
      image: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600&auto=format&fit=crop&q=80",
      description: "High-density dual-sided non-slip textured yoga mat providing joint cushioning and sweat resistance.",
      colors: ["Teal Blue", "Plum Purple", "Forest Green", "Charcoal Black"],
      sizes: ["6mm Thickness (183cm x 61cm)"],
      highlights: ["Eco-friendly non-toxic TPE material", "Dual texture anti-slip grip", "Includes free carry strap"]
    },

    // 9. Beauty & Personal Care
    {
      name: "The Ordinary Niacinamide 10% + Zinc 1% Serum 30ml",
      category: "Beauty & Care",
      price: 550,
      originalPrice: 650,
      discountPercent: 15,
      quantity: 120,
      rating: 4.8,
      ratingCount: 890,
      vendorName: "Vasu Beauty & Care",
      userId: getVId("Vasu Beauty & Care"),
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
      description: "High-strength vitamin and mineral blemish formula that reduces the look of blemishes and brightens skin tone.",
      colors: [],
      sizes: ["30ml", "60ml"],
      highlights: ["Reduces appearance of skin blemishes", "Balances visible sebum activity", "Alcohol and oil-free formulation"]
    },
    {
      name: "Philips Series 7000 Wet & Dry Electric Shaver",
      category: "Beauty & Care",
      price: 5499,
      originalPrice: 7995,
      discountPercent: 31,
      quantity: 40,
      rating: 4.7,
      ratingCount: 230,
      vendorName: "Vasu Beauty & Care",
      userId: getVId("Vasu Beauty & Care"),
      image: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&auto=format&fit=crop&q=80",
      description: "SkinGlide protective coating with SteelPrecision blades and 360-degree flexing heads for ultra-smooth shaves.",
      colors: ["Midnight Blue"],
      sizes: [],
      highlights: ["SteelPrecision self-sharpening blades", "Wet & Dry shaving versatility", "60 mins cordless shaving on 1h charge"]
    },
    {
      name: "Dior Sauvage Eau De Parfum 100ml for Men",
      category: "Beauty & Care",
      price: 11500,
      originalPrice: 12900,
      discountPercent: 11,
      quantity: 25,
      rating: 4.9,
      ratingCount: 420,
      vendorName: "Vasu Beauty & Care",
      userId: getVId("Vasu Beauty & Care"),
      image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80",
      description: "Exudes sensual and mysterious facets with Calabrian bergamot and Papua New Guinean vanilla absolute.",
      colors: [],
      sizes: ["60ml", "100ml", "200ml"],
      highlights: ["Calabrian Bergamot & Amberwood", "Long-lasting 12-hour silage", "100% Authentic imported luxury fragrance"]
    },

    // 10. Food & Beverages
    {
      name: "Blue Tokai Coffee Roasters Vienna Roast Dark Ground 500g",
      category: "Food & Beverages",
      price: 880,
      originalPrice: 980,
      discountPercent: 10,
      quantity: 75,
      rating: 4.9,
      ratingCount: 310,
      vendorName: "Madhav Gourmet Foods",
      userId: getVId("Madhav Gourmet Foods"),
      image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
      description: "100% Arabica specialty coffee roasted fresh with notes of dark chocolate and toasted walnut.",
      colors: [],
      sizes: ["French Press Grind", "Pour Over Grind", "Whole Beans", "Aeropress Grind"],
      highlights: ["100% Arabica single estate beans", "Freshly roasted specialty batch", "Zero artificial additives or chicory"]
    },
    {
      name: "Raw Organic Forest Honey 1kg Unprocessed Cold Extracted",
      category: "Food & Beverages",
      price: 699,
      originalPrice: 999,
      discountPercent: 30,
      quantity: 90,
      rating: 4.8,
      ratingCount: 260,
      vendorName: "Siri Organics",
      userId: getVId("Siri Organics"),
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
      description: "Pure wild multi-flora honey harvested from deep pristine forests, unprocessed and loaded with natural pollen.",
      colors: [],
      sizes: ["500g", "1kg"],
      highlights: ["Cold extracted & unpasteurized", "Rich in natural antioxidants & pollen", "NMR tested 100% pure"]
    },
    {
      name: "California Whole Raw Almonds Jumbo Pack 1kg",
      category: "Food & Beverages",
      price: 849,
      originalPrice: 1299,
      discountPercent: 35,
      quantity: 110,
      rating: 4.7,
      ratingCount: 450,
      vendorName: "Madhav Gourmet Foods",
      userId: getVId("Madhav Gourmet Foods"),
      image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80",
      description: "Crunchy, premium nonpareil California almonds packed in nitrogen-flushed resealable zip pouch.",
      colors: [],
      sizes: ["500g", "1kg", "2kg"],
      highlights: ["Grade A Jumbo nonpareil almonds", "High protein and Vitamin E source", "Vacuum nitrogen packed for freshness"]
    }
  ];

  // We can generate remaining items to reach total 100 fresh additions
  const categoriesList = [
    { cat: "Electronics", v: "Shyam Electronics", img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80" },
    { cat: "Gaming", v: "Ayan Gaming Zone", img: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=600&auto=format&fit=crop&q=80" },
    { cat: "Fashion", v: "Triveni Fashion & Apparel", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80" },
    { cat: "Home & Furniture", v: "Rajesh Living & Furniture", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80" },
    { cat: "Kitchen", v: "Vam Kitchenware", img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80" },
    { cat: "Appliances", v: "Ashu Appliances", img: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&auto=format&fit=crop&q=80" },
    { cat: "Sports & Fitness", v: "Sai Sports & Fitness", img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80" },
    { cat: "Beauty & Care", v: "Vasu Beauty & Care", img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80" },
    { cat: "Food & Beverages", v: "Madhav Gourmet Foods", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80" }
  ];

  const genericTitles = [
    // Electronics
    { name: "Anker Prime 20000mAh 200W Fast Power Bank", cat: "Electronics", v: "Hari Tech Hub", p: 7999, op: 9999, img: "https://images.unsplash.com/photo-1609592424367-27b204641d44?w=600&auto=format&fit=crop&q=80", desc: "Ultra-fast charging power bank with digital smart display and 3 output ports." },
    { name: "Sony Alpha 7 IV Full-Frame Mirrorless Camera Body", cat: "Electronics", v: "Shyam Electronics", p: 189990, op: 209990, img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80", desc: "33MP Exmor R sensor with 4K 60p video, real-time eye AF and 5-axis optical stabilization." },
    { name: "Marshall Acton III Bluetooth Home Speaker", cat: "Electronics", v: "Shyam Electronics", p: 24999, op: 29999, img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80", desc: "Iconic vintage acoustic design with room-filling stereo sound and brass control knobs." },
    { name: "Kindle Paperwhite 16GB 6.8-inch Waterproof", cat: "Electronics", v: "Hari Tech Hub", p: 13999, op: 15999, img: "https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=600&auto=format&fit=crop&q=80", desc: "300 ppi glare-free display with adjustable warm light and 10 weeks battery life." },
    { name: "Samsung 32-inch 4K UHD Curved Smart Monitor M8", cat: "Electronics", v: "Shyam Electronics", p: 32999, op: 42999, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", desc: "Smart monitor with built-in streaming apps, magnetic SlimFit camera, and USB-C hub." },

    // Gaming
    { name: "SteelSeries Arctis Nova Pro Wireless Multi-System", cat: "Gaming", v: "Ayan Gaming Zone", p: 28999, op: 34999, img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80", desc: "Active noise cancellation with infinite battery hot-swap system and dual wireless audio." },
    { name: "Logitech G Pro X Superlight 2 Wireless Gaming Mouse", cat: "Gaming", v: "Ayan Gaming Zone", p: 14995, op: 17995, img: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", desc: "60g ultra-lightweight chassis with Hero 2 sensor and LIGHTSPEED optical switches." },
    { name: "ASUS ROG Swift 27-inch 240Hz OLED Gaming Monitor", cat: "Gaming", v: "Ayan Gaming Zone", p: 74999, op: 89999, img: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=80", desc: "0.03ms response time with 240Hz refresh rate and custom heatsink for pure OLED blacks." },
    { name: "Secretlab TITAN Evo 2024 Ergonomic Gaming Chair", cat: "Gaming", v: "Ayan Gaming Zone", p: 38999, op: 46999, img: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600&auto=format&fit=crop&q=80", desc: "Proprietary SoftWeave Plus fabric with magnetic memory foam head pillow and 4-way L-ADAPT lumbar." },
    { name: "Elgato Stream Deck MK.2 15 LCD Macro Keys", cat: "Gaming", v: "Ayan Gaming Zone", p: 13999, op: 16999, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", desc: "15 customizable LCD keys to trigger unlimited streaming, audio and broadcasting actions." },

    // Fashion
    { name: "Levis 511 Slim Fit Stretchable Denim Jeans", cat: "Fashion", v: "Triveni Fashion & Apparel", p: 2499, op: 3999, img: "https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80", desc: "Classic modern slim silhouette with added stretch for all-day flexible comfort." },
    { name: "Fabindia Handblock Printed Pure Cotton Kurta", cat: "Fashion", v: "Triveni Fashion & Apparel", p: 1890, op: 2590, img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80", desc: "Authentic Bagru hand block print on breathable long-staple cotton with mandarin collar." },
    { name: "Tommy Hilfiger Classic Stainless Steel Analog Watch", cat: "Fashion", v: "Ari Trends", p: 8995, op: 12995, img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80", desc: "Sunray navy dial with multifunction sub-dials and silver polished link bracelet." },
    { name: "Ray-Ban Classic Aviator Polarized Sunglasses G-15", cat: "Fashion", v: "Ari Trends", p: 7990, op: 9990, img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80", desc: "Legendary gold metal frame with polarized crystal green G-15 UV protection lenses." },
    { name: "Wildcraft 45L Tactical Travel Rucksack with Rain Cover", cat: "Fashion", v: "Arush Footwear", p: 2999, op: 4999, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", desc: "Ergonomic padded back with multi-compartment storage and integrated waterproof rain shield." },

    // Home & Furniture
    { name: "Wakefit Orthopedic Memory Foam King Mattress 8-inch", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 14999, op: 22999, img: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80", desc: "Spinal alignment memory foam with breathable fabric cover and 10-year warranty." },
    { name: "Solid Teakwood 6-Seater Dining Table Set", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 48999, op: 69999, img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&auto=format&fit=crop&q=80", desc: "Crafted from seasoned teak wood with 6 cushioned ergonomic chairs and matte natural polish." },
    { name: "Modern Geometric Turkish Area Rug 5x7 Feet", cat: "Home & Furniture", v: "Vera Lifestyle", p: 3999, op: 7999, img: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80", desc: "Super soft plush pile with stain-resistant microfiber yarns and anti-slip backing." },
    { name: "Handcrafted Ceramic Table Flower Vase Set of 3", cat: "Home & Furniture", v: "Vera Lifestyle", p: 1299, op: 2499, img: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80", desc: "Artisan glazed ceramic vases in neutral beige tones for living room centerpieces." },
    { name: "Blackout Thermal Insulated Window Curtains Set of 2", cat: "Home & Furniture", v: "Vera Lifestyle", p: 1499, op: 2999, img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80", desc: "Triple-weave blackout fabric blocking 99% sunlight and reducing external noise." },

    // Kitchen
    { name: "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6L", cat: "Kitchen", v: "Ansha Home & Kitchen", p: 7999, op: 11999, img: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80", desc: "7-in-1 multi-cooker: pressure cooker, slow cooker, rice cooker, steamer, sauté pan and yogurt maker." },
    { name: "Victorinox Swiss Classic 5-Piece Kitchen Knife Set", cat: "Kitchen", v: "Vam Kitchenware", p: 4990, op: 6490, img: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&auto=format&fit=crop&q=80", desc: "High-carbon Swiss stainless steel blades with ergonomic slip-resistant Fibrox handles." },
    { name: "Cast Iron Pre-Seasoned Dutch Oven with Lid 5.5L", cat: "Kitchen", v: "Vam Kitchenware", p: 3299, op: 5999, img: "https://images.unsplash.com/photo-1584990347449-3a9d94943f65?w=600&auto=format&fit=crop&q=80", desc: "Naturally non-stick heavy cast iron pot perfect for slow braising, baking and roasting." },
    { name: "Wonderchef Nutri-Blend 400W 2-Jar Smoothie Maker", cat: "Kitchen", v: "Ansha Home & Kitchen", p: 2499, op: 4500, img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80", desc: "22000 RPM high speed bullet mixer with surgical grade steel blades for juices and smoothies." },
    { name: "Borosil Pure Borosilicate Glass Food Storage Set of 4", cat: "Kitchen", v: "Vam Kitchenware", p: 1399, op: 2190, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80", desc: "100% airtight microwave and oven-safe glass containers with BPA-free silicone clip lids." },

    // Appliances
    { name: "Mi Smart Air Purifier 4 with True HEPA Filter", cat: "Appliances", v: "Ashu Appliances", p: 12999, op: 16999, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "High-precision laser particle sensor cleaning 500 sq ft room in just 10 minutes with app control." },
    { name: "Havells 15L Storage Water Heater Geyser 5-Star", cat: "Appliances", v: "Ashu Appliances", p: 7499, op: 12495, img: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80", desc: "Feroglas coated heavy tank with Incoloy heating element and 8 bar pressure rating." },
    { name: "Kent Grand Plus RO+UV+UF+TDS Water Purifier", cat: "Appliances", v: "Ashu Appliances", p: 15499, op: 20500, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80", desc: "Multi-stage water purification with Mineral RO technology and in-tank UV disinfection." },
    { name: "Atomberg Renesa 1200mm BLDC Smart Ceiling Fan", cat: "Appliances", v: "Ashu Appliances", p: 3699, op: 5290, img: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80", desc: "Energy efficient 28W BLDC motor with LED speed indicator and smart remote control." },

    // Sports & Fitness
    { name: "Lifelong FitPro Motorized 2.5 HP Treadmill", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 16999, op: 32000, img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80", desc: "Foldable home motorized treadmill with 12 preset workout programs and AUX speaker." },
    { name: "Cosco Heavy Duty Football Size 5 FIFA Inspected", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 1199, op: 1899, img: "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=600&auto=format&fit=crop&q=80", desc: "Thermally bonded PU synthetic leather football with latex bladder for match play." },
    { name: "Kore 30kg Home Gym Dumbbell & Barbell Combo Set", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 2499, op: 4999, img: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80", desc: "PVC weight plates with 3ft curl bar, 5ft straight bar, dumbbell rods and gym gloves." },
    { name: "Nivia Men Pro Lightweight Cricket Spikes Shoes", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 1999, op: 3299, img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80", desc: "Full metal spike configuration with EVA mid-sole cushioning for firm grip on turf." },

    // Beauty & Care
    { name: "Minimalist 10% Vitamin C Face Serum for Glowing Skin 30ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 664, op: 699, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80", desc: "Pure Ethyl Ascorbic acid serum with Centella water for radiant, glowing skin tone." },
    { name: "Cetaphil Gentle Skin Cleanser for Sensitive Skin 500ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 799, op: 999, img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80", desc: "Dermatologist recommended soap-free, non-irritating hydrating face wash." },
    { name: "Braun Silk-expert Pro 5 IPL Laser Hair Removal", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 28999, op: 36999, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80", desc: "Safe SensoAdapt skin tone sensor delivering visible hair reduction in just 4 weeks." },
    { name: "L'Oreal Professionnel Absolut Repair Hair Mask 250ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 890, op: 1050, img: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80", desc: "Enriched with Gold Quinoa + Protein for instant deep restructuring of damaged hair." },

    // Food & Beverages
    { name: "Twinings English Breakfast Pure Black Tea 100 Tea Bags", cat: "Food & Beverages", v: "Madhav Gourmet Foods", p: 650, op: 799, img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80", desc: "Rich and robust golden blend of finest tea leaves from Assam and Kenya." },
    { name: "Disano Extra Virgin Olive Oil First Cold Pressed 1L", cat: "Food & Beverages", v: "Madhav Gourmet Foods", p: 1199, op: 1795, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80", desc: "First cold pressed Spanish olives with rich aroma and high polyphenols for healthy cooking." },
    { name: "Neuherbs Organic Chia Seeds Rich in Omega-3 500g", cat: "Food & Beverages", v: "Siri Organics", p: 349, op: 599, img: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80", desc: "Raw unroasted white & black chia seeds packed with dietary fiber, protein and Omega-3." },
    { name: "Lindt Excellence 85% Cocoa Dark Chocolate 100g Pack of 3", cat: "Food & Beverages", v: "Madhav Gourmet Foods", p: 899, op: 1197, img: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80", desc: "Full-bodied master Swiss dark chocolate crafted with profound cocoa bean notes." }
  ];

  const allToInsert = [...new100Products];

  // Fill up to exactly 100 new items
  let suffixIndex = 1;
  while (allToInsert.length < 100) {
    for (const t of genericTitles) {
      if (allToInsert.length >= 100) break;
      const variationName = `${t.name} (Edition ${suffixIndex})`;
      allToInsert.push({
        name: variationName,
        category: t.cat,
        price: t.p + (suffixIndex * 50),
        originalPrice: t.op + (suffixIndex * 100),
        discountPercent: Math.round(((t.op - t.p) / t.op) * 100),
        quantity: 20 + (suffixIndex * 5),
        rating: +(4.4 + (Math.random() * 0.5)).toFixed(1),
        ratingCount: 50 + (suffixIndex * 15),
        vendorName: t.v,
        userId: getVId(t.v),
        image: t.img,
        description: t.desc,
        colors: ["Default Color"],
        sizes: [],
        highlights: ["Premium build quality", "Official brand warranty", "Free express delivery"]
      });
    }
    suffixIndex++;
  }

  // Insert items
  console.log(`Inserting ${allToInsert.length} new products...`);
  const inserted = await Product.insertMany(allToInsert);
  console.log(`Successfully inserted ${inserted.length} new products!`);

  const total = await Product.countDocuments({});
  console.log(`Total products now in DB: ${total}`);
  process.exit(0);
}

seed100MoreProducts().catch(err => {
  console.error("Error seeding products:", err);
  process.exit(1);
});

