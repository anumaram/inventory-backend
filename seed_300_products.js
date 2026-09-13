const mongoose = require('mongoose');

async function seed300Products() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const Product = require('./models/product.model');
  const User = require('./models/user.model');

  const vendors = await User.find({ role: 'vendor' }).lean();
  const vMap = {};
  vendors.forEach(v => {
    vMap[v.name] = v._id;
  });

  const getVId = (name, fallback = 'JK Retail & Co.') => {
    return vMap[name] || vMap[fallback] || vendors[0]?._id;
  };

  const rawProducts = [
    // ==========================================
    // 1. ELECTRONICS & GADGETS (40 items)
    // ==========================================
    {
      name: "Samsung Galaxy S24 Ultra 5G 512GB Titanium Gray",
      category: "Electronics",
      price: 129999,
      discountPercentage: 10,
      quantity: 25,
      rating: 4.9,
      ratingCount: 312,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80"
      ],
      description: "Galaxy AI powered flagship phone with 200MP camera, built-in S Pen, Titanium frame, and Snapdragon 8 Gen 3 chipset for ultimate multitasking.",
      colors: ["Titanium Gray", "Titanium Black", "Titanium Violet", "Titanium Yellow"],
      sizes: ["256GB", "512GB", "1TB"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Manufacturer Warranty"
    },
    {
      name: "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones",
      category: "Electronics",
      price: 29990,
      discountPercentage: 14,
      quantity: 42,
      rating: 4.8,
      ratingCount: 520,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&auto=format&fit=crop&q=80"
      ],
      description: "Two processors control 8 microphones for unprecedented noise cancellation. Superb call quality with 4 beamforming microphones and 30-hour battery life.",
      colors: ["Black", "Silver", "Midnight Blue"],
      sizes: ["Standard"],
      returnPolicy: "7 Days Return & Replacement",
      warranty: "1 Year Brand Warranty"
    },
    {
      name: "Apple MacBook Air 15-inch M3 Chip 16GB RAM 512GB SSD",
      category: "Electronics",
      price: 154900,
      discountPercentage: 6,
      quantity: 16,
      rating: 4.9,
      ratingCount: 140,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&auto=format&fit=crop&q=80"
      ],
      description: "Impossibly thin design with vibrant 15.3-inch Liquid Retina display, blazing fast M3 speed, MagSafe 3 charging, and up to 18 hours battery life.",
      colors: ["Midnight", "Starlight", "Space Grey", "Silver"],
      sizes: ["256GB SSD", "512GB SSD"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Apple Limited Warranty"
    },
    {
      name: "Bose QuietComfort Ultra Wireless Noise Cancelling Earbuds",
      category: "Electronics",
      price: 25900,
      discountPercentage: 11,
      quantity: 35,
      rating: 4.7,
      ratingCount: 185,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80"
      ],
      description: "Breakthrough spatialized audio for more immersive listening. CustomTune technology personalizes noise cancellation and sound performance to your ears.",
      colors: ["Black", "White Smoke", "Moonstone Blue"],
      sizes: ["Standard"],
      returnPolicy: "7 Days Return Policy",
      warranty: "1 Year Manufacturer Warranty"
    },
    {
      name: "Dell XPS 16 9640 Intel Core Ultra 9 32GB 1TB RTX 4070",
      category: "Electronics",
      price: 289990,
      discountPercentage: 8,
      quantity: 10,
      rating: 4.8,
      ratingCount: 46,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80"
      ],
      description: "Stunning 4K+ OLED InfinityEdge touch screen laptop with CNC machined aluminum body, glass touch pad, and NVIDIA GeForce RTX 4070 studio graphics.",
      colors: ["Platinum Silver", "Graphite"],
      sizes: ["1TB SSD", "2TB SSD"],
      returnPolicy: "7 Days Replacement",
      warranty: "2 Years Onsite Premium Care"
    },
    {
      name: "Canon EOS R6 Mark II Mirrorless Camera with 24-105mm Lens",
      category: "Electronics",
      price: 243990,
      discountPercentage: 7,
      quantity: 14,
      rating: 4.9,
      ratingCount: 92,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop&q=80"
      ],
      description: "24.2 MP Full-Frame CMOS sensor with 6K oversampled uncropped 4K 60p video, 40 fps electronic shutter, and Dual Pixel CMOS AF II deep learning autofocus.",
      colors: ["Matte Black"],
      sizes: ["Body + 24-105mm Kit"],
      returnPolicy: "7 Days Return Policy",
      warranty: "2 Years Canon India Warranty"
    },
    {
      name: "Apple iPad Pro 13-inch M4 OLED Display 256GB Space Black",
      category: "Electronics",
      price: 129900,
      discountPercentage: 5,
      quantity: 20,
      rating: 4.9,
      ratingCount: 110,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
      images: [
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80"
      ],
      description: "The thinnest Apple product ever with breakthrough Ultra Retina XDR tandem OLED display and next-level M4 performance for AI creative workflows.",
      colors: ["Space Black", "Silver"],
      sizes: ["256GB", "512GB", "1TB"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Apple Warranty"
    },
    {
      name: "GoPro HERO12 Black Waterproof Action Camera with HDR 5.3K Video",
      category: "Electronics",
      price: 37990,
      discountPercentage: 15,
      quantity: 30,
      rating: 4.7,
      ratingCount: 215,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"],
      description: "HyperSmooth 6.0 video stabilization, extended battery life with Enduro battery, rugged waterproof up to 33ft, and Bluetooth audio support for microphones.",
      colors: ["Black"],
      sizes: ["Standard Bundle"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Official Warranty"
    },
    {
      name: "Garmin Fenix 7 Pro Sapphire Solar Multi-Sport GPS Smartwatch",
      category: "Electronics",
      price: 81990,
      discountPercentage: 12,
      quantity: 18,
      rating: 4.8,
      ratingCount: 75,
      vendorName: "Sai Sports & Fitness",
      userId: getVId("Sai Sports & Fitness"),
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"],
      description: "Ultimate multisport GPS smartwatch with solar charging lens, built-in LED flashlight, endurance score, wrist-based heart rate and multi-band GNSS.",
      colors: ["Carbon Gray DLC Titanium", "Slate Gray"],
      sizes: ["47mm", "51mm"],
      returnPolicy: "7 Days Return Policy",
      warranty: "2 Years Garmin Warranty"
    },
    {
      name: "JBL Boombox 3 Portable Bluetooth Waterproof Speaker",
      category: "Electronics",
      price: 34999,
      discountPercentage: 20,
      quantity: 28,
      rating: 4.8,
      ratingCount: 340,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80"],
      description: "Massive sound with deep bass, IP67 dust and water resistance, 24 hours of playtime, and metal handle with orange silicone grip for party on the go.",
      colors: ["Black", "Squad Camo"],
      sizes: ["Standard"],
      returnPolicy: "7 Days Return & Replacement",
      warranty: "1 Year Brand Warranty"
    },
    {
      name: "Logitech MX Master 3S Advanced Wireless Performance Mouse",
      category: "Electronics",
      price: 8995,
      discountPercentage: 15,
      quantity: 60,
      rating: 4.9,
      ratingCount: 780,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80"],
      description: "Quiet clicks with 8000 DPI track-on-glass sensor, MagSpeed electromagnetic scrolling wheel, ergonomic sculpted silhouette, and multi-device Flow control.",
      colors: ["Graphite", "Pale Gray"],
      sizes: ["Right-Handed"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Limited Hardware Warranty"
    },
    {
      name: "Logitech MX Mechanical Wireless Illuminated Keyboard",
      category: "Electronics",
      price: 15495,
      discountPercentage: 12,
      quantity: 38,
      rating: 4.8,
      ratingCount: 290,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80"],
      description: "Low profile mechanical switches with smart backlighting, dual key layout for macOS and Windows, USB-C fast charging, and triple device pairing.",
      colors: ["Graphite"],
      sizes: ["Full Size Tactile Quiet", "Mini Linear"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year Brand Warranty"
    },
    {
      name: "Anker Prime 27,650mAh Power Bank (250W Multi-Port)",
      category: "Electronics",
      price: 14999,
      discountPercentage: 18,
      quantity: 50,
      rating: 4.8,
      ratingCount: 165,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1609592424364-7bf57d29668d?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1609592424364-7bf57d29668d?w=600&auto=format&fit=crop&q=80"],
      description: "250W total output capable of fast-charging two laptops simultaneously at 140W each, digital smart display, and airline-approved 99.54Wh capacity.",
      colors: ["Space Black"],
      sizes: ["27650mAh"],
      returnPolicy: "7 Days Replacement",
      warranty: "2 Years Anker Warranty"
    },
    {
      name: "Kindle Paperwhite Signature Edition 32GB 6.8-inch Display",
      category: "Electronics",
      price: 17999,
      discountPercentage: 10,
      quantity: 45,
      rating: 4.9,
      ratingCount: 620,
      vendorName: "JK Retail & Co.",
      userId: getVId("JK Retail & Co."),
      image: "https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1592496001020-d31bd830651f?w=600&auto=format&fit=crop&q=80"],
      description: "300 ppi glare-free display, auto-adjusting front warm light, wireless Qi charging, 10 weeks battery life, and waterproof IPX8 design.",
      colors: ["Metallic Black", "Agave Green", "Denim"],
      sizes: ["32GB"],
      returnPolicy: "7 Days Return Policy",
      warranty: "1 Year Official Warranty"
    },
    {
      name: "Marshall Stanmore III Bluetooth Home Speaker",
      category: "Electronics",
      price: 36999,
      discountPercentage: 10,
      quantity: 22,
      rating: 4.8,
      ratingCount: 198,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80"],
      description: "Iconic vintage styling with wider soundstage, angled tweeters, Bluetooth 5.2, 3.5mm and RCA inputs, and brass control knobs.",
      colors: ["Black", "Cream", "Brown"],
      sizes: ["Standard"],
      returnPolicy: "7 Days Return & Replacement",
      warranty: "1 Year Brand Warranty"
    },
    {
      name: "SanDisk Extreme PRO 2TB Portable SSD 2000MB/s NVMe USB 3.2",
      category: "Electronics",
      price: 18999,
      discountPercentage: 25,
      quantity: 55,
      rating: 4.8,
      ratingCount: 410,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80"],
      description: "Rugged forged aluminum chassis with silicon shell, up to 2-meter drop protection, IP55 water and dust resistance, and 2000MB/s read/write speeds.",
      colors: ["Black with Orange Trim"],
      sizes: ["1TB", "2TB", "4TB"],
      returnPolicy: "7 Days Replacement",
      warranty: "5 Years Limited Manufacturer Warranty"
    },
    {
      name: "DJI Mini 4 Pro Fly More Combo with DJI RC 2 Controller",
      category: "Electronics",
      price: 114990,
      discountPercentage: 5,
      quantity: 12,
      rating: 4.9,
      ratingCount: 88,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80"],
      description: "Under 249g lightweight drone with omnidirectional obstacle sensing, 4K/60fps HDR True Vertical Shooting, 20km FHD video transmission, and 34 min flight time.",
      colors: ["Gray"],
      sizes: ["Fly More Combo (Plus)"],
      returnPolicy: "7 Days Replacement",
      warranty: "1 Year DJI India Warranty"
    },
    {
      name: "Sennheiser Momentum 4 Wireless Audiophile Headphones",
      category: "Electronics",
      price: 26990,
      discountPercentage: 23,
      quantity: 24,
      rating: 4.7,
      ratingCount: 170,
      vendorName: "Shyam Electronics",
      userId: getVId("Shyam Electronics"),
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"],
      description: "Signature sound powered by 42mm transducer system, adaptive noise cancellation, transparency mode, and incredible 60-hour battery life with fast charging.",
      colors: ["Black", "White", "Denim Edition"],
      sizes: ["Over-Ear"],
      returnPolicy: "7 Days Return Policy",
      warranty: "2 Years Brand Warranty"
    },
    {
      name: "Shure SM7B Cardioid Dynamic Vocal Studio Microphone",
      category: "Electronics",
      price: 38990,
      discountPercentage: 8,
      quantity: 19,
      rating: 4.9,
      ratingCount: 380,
      vendorName: "Hari Tech Hub",
      userId: getVId("Hari Tech Hub"),
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80"],
      description: "Legendary broadcast microphone with flat, wide-range frequency response for exceptionally clean reproduction of both voice and musical instruments.",
      colors: ["Matte Black"],
      sizes: ["Standard XLR"],
      returnPolicy: "7 Days Replacement",
      warranty: "2 Years Shure Warranty"
    },
    {
      name: "Belkin 3-in-1 MagSafe Fast Wireless Charging Stand 15W",
      category: "Electronics",
      price: 12999,
      discountPercentage: 13,
      quantity: 40,
      rating: 4.8,
      ratingCount: 220,
      vendorName: "Apple Authorised",
      userId: getVId("Apple Authorised"),
      image: "https://images.unsplash.com/photo-1622445268462-328bc1b55a85?w=600&auto=format&fit=crop&q=80",
      images: ["https://images.unsplash.com/photo-1622445268462-328bc1b55a85?w=600&auto=format&fit=crop&q=80"],
      description: "Official MagSafe certified stand to charge iPhone 15/14/13/12 series at up to 15W, Apple Watch Ultra/Series 9 fast charging, and AirPods wireless tray.",
      colors: ["White", "Black"],
      sizes: ["3-in-1 Stand"],
      returnPolicy: "7 Days Return Policy",
      warranty: "2 Years Connected Equipment Warranty"
    }
  ];

  // Helper template generator for comprehensive batches
  const categoryBatches = [
    // 2. GAMING (30 items)
    {
      cat: "Gaming",
      vendor: "Ayan Gaming Zone",
      items: [
        { name: "Sony PlayStation 5 Slim Disc Edition 1TB Console", p: 54990, op: 59990, img: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80", desc: "Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, adaptive triggers and 3D Audio, plus 1TB storage.", c: ["White/Black"], s: ["Disc Edition 1TB", "Digital Edition 1TB"] },
        { name: "Xbox Series X 1TB Gaming Console 4K 120FPS", p: 49990, op: 55990, img: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&auto=format&fit=crop&q=80", desc: "Fastest, most powerful Xbox ever. 12 teraflops of raw graphic processing power, DirectX ray tracing, custom SSD, and 4K gaming at up to 120 FPS.", c: ["Matte Black"], s: ["1TB SSD"] },
        { name: "Nintendo Switch OLED Model with White Joy-Con", p: 31999, op: 37999, img: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&auto=format&fit=crop&q=80", desc: "7-inch vibrant OLED screen, wide adjustable stand, enhanced audio, 64GB internal storage, and wired LAN port in the dock for TV gaming mode.", c: ["White", "Neon Red/Neon Blue", "Mario Red Edition"], s: ["64GB OLED"] },
        { name: "ASUS ROG Ally X Handheld Gaming PC 24GB RAM 1TB SSD", p: 89990, op: 99990, img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80", desc: "AMD Ryzen Z1 Extreme, 80Wh battery, dual USB-C ports, ergonomic redesigned chassis with full Windows 11 game compatibility.", c: ["Black"], s: ["24GB / 1TB"] },
        { name: "Razer DeathAdder V3 Pro Wireless Ergonomic Gaming Mouse", p: 13999, op: 16999, img: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", desc: "63g ultra-lightweight design, Focus Pro 30K Optical Sensor, Gen-3 Optical switches, and 90 hours battery life with HyperPolling wireless support.", c: ["Black", "White", "Faker Edition"], s: ["Wireless"] },
        { name: "SteelSeries Apex Pro TKL Wireless Mechanical Keyboard", p: 24999, op: 28999, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", desc: "World's fastest OmniPoint 2.0 adjustable switches with rapid trigger, OLED smart display, aircraft grade aluminum, and quantum 2.0 wireless.", c: ["Black"], s: ["TKL 80%"] },
        { name: "Secretlab TITAN Evo 2024 Ergonomic Gaming Chair", p: 48999, op: 56999, img: "https://images.unsplash.com/photo-1580481077195-c99df3d854ce?w=600&auto=format&fit=crop&q=80", desc: "Proprietary SoftWeave Plus fabric, 4-way L-ADAPT lumbar support system, magnetic memory foam head pillow, and CloudSwap armrest tops.", c: ["Stealth", "Cookies & Cream", "Frost Blue"], s: ["Regular", "XL"] },
        { name: "HyperX Cloud III Wireless Gaming Headset with DTS Spatial", p: 14490, op: 17990, img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80", desc: "Legendary comfort with signature memory foam, re-engineered 53mm angled drivers, crystal clear 10mm microphone and monumental 120-hour battery life.", c: ["Black/Red", "All Black"], s: ["Standard"] },
        { name: "LG UltraGear 27-inch OLED QHD 240Hz 0.03ms Gaming Monitor", p: 68999, op: 82000, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", desc: "240Hz refresh rate, near-instantaneous 0.03ms response time, HDR10, 1.5M:1 contrast ratio, NVIDIA G-SYNC Compatible and AMD FreeSync Premium Pro.", c: ["Matte Black"], s: ["27 Inch QHD"] },
        { name: "Elgato Stream Deck MK.2 15 Customizable LCD Keys", p: 13490, op: 15990, img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80", desc: "15 macro keys to trigger actions in OBS, Twitch, YouTube, Spotify, and more. Removable faceplate, detachable USB-C cable and desktop stand.", c: ["Black", "White"], s: ["15 Keys"] },
        { name: "Sony DualSense Edge Wireless Controller for PS5", p: 18990, op: 21990, img: "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80", desc: "Ultra-customizable controls with swappable stick modules, remappable back buttons, adjustable trigger stops, and on-controller user profile switch.", c: ["White/Black"], s: ["Custom Controller"] },
        { name: "Logitech G Pro X Superlight 2 Wireless Gaming Mouse", p: 15995, op: 17995, img: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", desc: "60g championship mouse featuring LIGHTFORCE hybrid optical-mechanical switches, HERO 2 sensor with 32,000 DPI, and 95 hours battery life.", c: ["Black", "White", "Magenta"], s: ["Wireless"] }
      ]
    },

    // 3. APPLIANCES (30 items)
    {
      cat: "Appliances",
      vendor: "Ashu Appliances",
      items: [
        { name: "LG 55-inch 4K OLED evo C3 Series Smart TV Cinema HDR", p: 119990, op: 169990, img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80", desc: "Self-lit OLED pixels with α9 AI Processor 4K Gen6, Brightness Booster, Dolby Vision IQ & Atmos, 120Hz VRR gaming, and webOS 23 smart hub.", c: ["Dark Titan"], s: ["55 Inch", "65 Inch"] },
        { name: "Dyson V15 Detect Cordless Vacuum Cleaner with Laser", p: 62900, op: 69900, img: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80", desc: "Laser reveals invisible dust on hard floors. Piezo sensor counts and sizes particles, automatically adapting suction power for deep whole-home cleaning.", c: ["Yellow/Nickel"], s: ["Complete Set"] },
        { name: "Samsung 653L 3-Door Side-by-Side Inverter Refrigerator", p: 79990, op: 112990, img: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&auto=format&fit=crop&q=80", desc: "SpaceMax technology, Digital Inverter compressor with 20-year warranty, All-Around Cooling, and auto ice maker with fingerprint-resistant stainless finish.", c: ["Refined Inox", "Gentle Silver Matt"], s: ["653 Liters"] },
        { name: "Bosch 8kg 1400 RPM Fully Automatic Front Load Washing Machine", p: 38990, op: 52990, img: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&auto=format&fit=crop&q=80", desc: "EcoSilence Drive brushless motor with 10-year warranty, Anti-Vibration side panels, AllergyPlus certified wash, and SpeedPerfect 65% faster cycles.", c: ["Silver Grey", "White"], s: ["8 Kg Capacity"] },
        { name: "Dyson Purifier Hot+Cool Gen1 Air Purifier with HEPA H13", p: 46900, op: 54900, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "Fully sealed to HEPA H13 standard, captures 99.95% of pollutants down to 0.1 microns, purifies, cools in summer and fast heats rooms in winter.", c: ["White/Silver"], s: ["Tower Purifier"] },
        { name: "IFB 30L Convection Microwave Oven with 101 Auto Cook Menus", p: 14990, op: 18990, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "Multi-stage cooking, rotisserie grill, fermentation for dough, steam clean, deodorize, and stainless steel cavity for hygienic long-lasting durability.", c: ["Metallic Black"], s: ["30 Liters"] },
        { name: "Philips Hue Smart LED Starter Kit with Hue Bridge and 3 Bulbs", p: 11499, op: 14999, img: "https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&auto=format&fit=crop&q=80", desc: "16 million colors and tunable white lighting, sync with music and movies, compatible with Alexa, Apple HomeKit and Google Assistant.", c: ["Multi-Color"], s: ["E27 Fitting"] }
      ]
    },

    // 4. KITCHEN & DINING (35 items)
    {
      cat: "Kitchen",
      vendor: "Vam Kitchenware",
      items: [
        { name: "De'Longhi Magnifica S Fully Automatic Bean to Cup Coffee Machine", p: 48990, op: 58990, img: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80", desc: "Integrated burr grinder with 13 settings, manual cappuccino system for creamy frothy milk foam, adjustable coffee strength, and easy one-touch rinse.", c: ["Black/Silver"], s: ["1.8L Reservoir"] },
        { name: "Instant Pot Duo Plus 9-in-1 Electric Pressure Cooker 6L", p: 10990, op: 14999, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80", desc: "Replaces 9 appliances: pressure cooker, slow cooker, rice cooker, yogurt maker, steamer, sauté pan, sterilizer & food warmer. Easy-release steam switch.", c: ["Stainless Steel"], s: ["6 Litre"] },
        { name: "Ninja Air Fryer Max XL 5.2L with Max Crisp Technology", p: 12999, op: 16999, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80", desc: "Cook with up to 75% less fat than traditional frying methods. 240°C Max Crisp delivers super-fast crispy fries, wings, and roasted vegetables.", c: ["Grey/Black"], s: ["5.2 Litre"] },
        { name: "Le Creuset Signature Cast Iron Round Casserole Dutch Oven 24cm", p: 28500, op: 32000, img: "https://images.unsplash.com/photo-1584990347449-397cb006c35a?w=600&auto=format&fit=crop&q=80", desc: "Handcrafted in France since 1925. Superior heat retention, enamel interior resistant to chipping and staining, suitable for all stovetops including induction.", c: ["Volcanic Orange", "Cerise Red", "Marseille Blue"], s: ["24cm (4.2L)"] },
        { name: "Vitamix Explorian E310 High-Performance Professional Blender", p: 39900, op: 46000, img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80", desc: "Laser-cut aircraft-grade stainless steel blades, 10 variable speeds + pulse control, easily pulverizes tough fruits, nuts, seeds, and makes hot soup in minutes.", c: ["Black", "Slate"], s: ["1.4L Container"] },
        { name: "Zwilling J.A. Henckels Twin Gourmet 6-Piece Knife Block Set", p: 16990, op: 22990, img: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&auto=format&fit=crop&q=80", desc: "Special formula high-carbon stainless steel blades ice-hardened with FRIODUR technology, ergonomic triple-riveted handles, with natural beechwood block.", c: ["Black/Steel"], s: ["6-Piece Set"] },
        { name: "Staub Cast Iron 30cm Round Pure Grill Pan with Dual Handles", p: 14500, op: 17900, img: "https://images.unsplash.com/photo-1584990347449-397cb006c35a?w=600&auto=format&fit=crop&q=80", desc: "Authentic barbecue grill marks indoors. Rough matte black enamel interior delivers outstanding browning and searing with low oil.", c: ["Matte Black", "Cherry Red"], s: ["30cm"] }
      ]
    },

    // 5. HOME & FURNITURE (35 items)
    {
      cat: "Home & Furniture",
      vendor: "Rajesh Living & Furniture",
      items: [
        { name: "Herman Miller Aeron Ergonomic Office Chair with PostureFit SL", p: 135000, op: 155000, img: "https://images.unsplash.com/photo-1580481077195-c99df3d854ce?w=600&auto=format&fit=crop&q=80", desc: "The benchmark for ergonomic seating. 8Z Pellicle breathable mesh, harmonic 2 tilt, fully adjustable arms, and PostureFit SL adjustable sacral and lumbar support.", c: ["Graphite", "Mineral", "Carbon"], s: ["Size B (Medium)", "Size C (Large)"] },
        { name: "Wakefit 8-inch Orthopedic Memory Foam Mattress King Size", p: 14499, op: 21999, img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80", desc: "High resilience foam base with pressure-relieving next-gen memory foam layer, breathable fabric cover, and 10-year manufacturer warranty.", c: ["White & Grey"], s: ["King (78x72 in)", "Queen (78x60 in)"] },
        { name: "Solid Sheesham Wood 6-Seater Dining Table Set with Cushioned Chairs", p: 34999, op: 49999, img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&auto=format&fit=crop&q=80", desc: "100% natural seasoned Indian rosewood with honey teak finish, sturdy craftsmanship, and high-density padded cream fabric chairs.", c: ["Honey Finish", "Walnut Finish"], s: ["6 Seater"] },
        { name: "Nordic Minimalist 3-Seater Velvet Fabric Sofa Couch", p: 26999, op: 38999, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80", desc: "Plush velvet upholstery, solid eucalyptus hardwood frame, gold-plated brass tapered legs, and extra thick foam cushions.", c: ["Emerald Green", "Royal Navy Blue", "Warm Beige"], s: ["3-Seater"] },
        { name: "Dual-Motor Electric Height Adjustable Standing Desk (140x70cm)", p: 27999, op: 36999, img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80", desc: "Whisper-quiet dual motors with 4 programmable memory presets, anti-collision sensor, heavy-duty steel frame supporting up to 125kg.", c: ["Natural Oak Top / White Frame", "Walnut Top / Black Frame"], s: ["140x70 cm"] },
        { name: "Modern Tripod Floor Lamp with Natural Linen Drum Shade", p: 3999, op: 6999, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80", desc: "Natural ash wood tripod legs with woven linen shade, foot step switch, and standard E27 warm LED ambient glow.", c: ["Natural Ash", "Dark Walnut"], s: ["150cm Height"] }
      ]
    },

    // 6. FASHION & APPAREL (40 items)
    {
      cat: "Fashion",
      vendor: "Triveni Fashion & Apparel",
      items: [
        { name: "Levi's Men's 511 Slim Fit Stretch Denim Jeans", p: 2699, op: 3999, img: "https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80", desc: "Modern slim-cut jeans with room to move, crafted with premium stretch denim for all-day comfort and classic 5-pocket styling.", c: ["Dark Indigo Wash", "Washed Black", "Light Vintage Blue"], s: ["30", "32", "34", "36", "38"] },
        { name: "Tommy Hilfiger Men's Classic Pique Polo T-Shirt", p: 3499, op: 4999, img: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80", desc: "100% organic cotton pique with signature embroidered flag on chest, ribbed collar, and two-button placket.", c: ["Navy Blue", "White", "Burgundy", "Classic Black"], s: ["S", "M", "L", "XL", "XXL"] },
        { name: "Zara Women's Oversized Double-Breasted Tailored Wool Blazer", p: 6990, op: 8990, img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80", desc: "Sophisticated long blazer with lapel collar, front flap pockets, padded shoulders, and structured wool blend silhouette.", c: ["Camel", "Charcoal Grey", "Houndstooth"], s: ["XS", "S", "M", "L", "XL"] },
        { name: "Fossil Grant Chronograph Blue Dial Men's Leather Watch", p: 10495, op: 13995, img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80", desc: "44mm stainless steel case with blue sunray dial, roman numerals, quartz chronograph movement, and genuine brown leather strap.", c: ["Brown/Blue", "Black/Silver", "Tan/White"], s: ["44mm Dial"] },
        { name: "Ray-Ban Aviator Classic Polarized Sunglasses RB3025", p: 10990, op: 13590, img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80", desc: "Timeless teardrop frame originally designed for U.S. aviators. 100% UV protection polarized crystal green G-15 lenses with gold metal wire.", c: ["Gold Frame / Green Lens", "Gunmetal / Polarized Grey"], s: ["Standard 58mm", "Large 62mm"] },
        { name: "H&M Women's Pure Linen Button-Down Shirt", p: 2299, op: 2999, img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80", desc: "Airy woven pure linen shirt with turn-down collar, chest pocket, dropped shoulders, and rounded hem for relaxed summer chic.", c: ["Crisp White", "Sage Green", "Soft Striped Blue"], s: ["XS", "S", "M", "L", "XL"] }
      ]
    },

    // 7. SHOES & FOOTWEAR (30 items)
    {
      cat: "shoes",
      vendor: "Arush Footwear",
      items: [
        { name: "Nike Air Jordan 1 Retro High OG 'Chicago Lost & Found'", p: 16995, op: 19995, img: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80", desc: "Iconic silhouette featuring premium cracked leather collars, vintage aged midsoles, encapsulated Nike Air cushioning and classic red-black-white colorway.", c: ["Varsity Red/Black/Sail"], s: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Adidas Originals Ultraboost Light Running Shoes", p: 14999, op: 18999, img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80", desc: "Lightest Ultraboost ever made with 30% lighter BOOST material, PRIMEKNIT+ textile upper, Linear Energy Push system, and Continental rubber outsole.", c: ["Core Black", "Cloud White", "Solar Red"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "New Balance 9060 Lifestyle Chunky Sneakers", p: 15999, op: 18999, img: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80", desc: "Futuristic retro-inspired runner featuring ABZORB and SBS midsole cushioning, sculpted pod midsole, and premium pigskin suede with mesh upper.", c: ["Rain Cloud Grey", "Sea Salt Cream", "Triple Black"], s: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Clarks Men's Tilden Walk Genuine Leather Oxford Shoes", p: 6499, op: 8999, img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=80", desc: "Classic derby formal shoes crafted in supple full-grain leather with OrthoLite footbed, Cushion Soft padding, and durable flexible TPR grip sole.", c: ["Dark Tan Leather", "Classic Black Leather"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"] },
        { name: "Birkenstock Arizona Birko-Flor Unisex Cork Slide Sandals", p: 6990, op: 7990, img: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=80", desc: "Anatomically shaped cork-latex footbed with suede lining, dual individually adjustable metal pin buckles, and lightweight shock-absorbing EVA sole.", c: ["Mocca Brown", "Black", "Stone"], s: ["EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44"] },
        { name: "Puma Deviate Nitro 2 Carbon-Plated Road Running Shoes", p: 11999, op: 15999, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80", desc: "NITRO Elite foam for maximum responsiveness, PWRPLATE carbon composite plate for maximum energy transfer, and PUMAGRIP high-traction rubber outsole.", c: ["Fire Orchid / Puma Black", "Royal Sapphire"], s: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] }
      ]
    },

    // 8. BEAUTY & CARE (30 items)
    {
      cat: "Beauty & Care",
      vendor: "Vasu Beauty & Care",
      items: [
        { name: "Dyson Supersonic Nural Intelligent Hair Dryer with Auto Pause", p: 39900, op: 44900, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80", desc: "Nural sensors automatically adapt heat to protect scalp health and enhance natural shine, fast intelligent drying, and 5 magnetic styling attachments.", c: ["Strawberry Bronze", "Vinca Blue/Rose"], s: ["Complete Edition"] },
        { name: "Estée Lauder Advanced Night Repair Synchronized Multi-Recovery Complex 50ml", p: 8900, op: 10500, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80", desc: "Patented Chronolux Power Signal technology reduces the look of multiple signs of aging, delivers 72-hour hydration, 8-hour antioxidant protection.", c: ["Amber Glass Bottle"], s: ["50ml", "100ml"] },
        { name: "The Ordinary Niacinamide 10% + Zinc 1% High-Strength Serum 60ml", p: 1050, op: 1300, img: "https://images.unsplash.com/photo-1608248597358-1e42f61a1200?w=600&auto=format&fit=crop&q=80", desc: "Water-based formula that boosts skin brightness, improves skin smoothness and reinforces the skin barrier over time. Ideal for blemish-prone skin.", c: ["Clear Dropper"], s: ["60ml"] },
        { name: "Philips Norelco Series 9000 Prestige Wet & Dry Electric Shaver", p: 21995, op: 28995, img: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&auto=format&fit=crop&q=80", desc: "NanoTech precision blades with extra strong sharp edges, Hydro SkinGlide coating for silky smooth gliding, and wireless Qi charging pad.", c: ["Dark Metallic Chrome"], s: ["Shaver + SmartClean"] },
        { name: "Dior Sauvage Eau De Parfum for Men 100ml", p: 13500, op: 15000, img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80", desc: "A powerful and noble fragrance with juicy Calabria bergamot, sensual Papua New Guinean vanilla absolute, and ambery woody trails.", c: ["Midnight Navy Flacon"], s: ["100ml EDP"] },
        { name: "Laneige Lip Sleeping Mask Berry Intense Hydration 20g", p: 1320, op: 1650, img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80", desc: "Enriched with Berry Fruit Complex, Vitamin C, and coconut oil to deliver intense moisture and antioxidants while you sleep for soft, supple lips.", c: ["Berry Red"], s: ["20g Pot"] }
      ]
    },

    // 9. SPORTS & FITNESS (25 items)
    {
      cat: "Sports & Fitness",
      vendor: "Sai Sports & Fitness",
      items: [
        { name: "Bowflex SelectTech 552 Adjustable Dumbbells (Pair 2-24kg)", p: 29999, op: 37999, img: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80", desc: "Replaces 15 sets of weights with rapid turn-dial selection from 2 to 24 kg in space-saving compact trays, with durable molding for quiet workouts.", c: ["Black/Red"], s: ["Pair (5 to 52.5 lbs)"] },
        { name: "Manduka PRO Yoga Mat 6mm High-Density Cushioning", p: 9900, op: 12500, img: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80", desc: "World famous ultra-dense cushioning protects joints, closed-cell surface seals out sweat and moisture, with proprietary dot-pattern bottom grip.", c: ["Black Mat PRO", "Odyssey Navy", "Sage Green"], s: ["71 x 26 in (6mm)"] },
        { name: "Theragun PRO Gen 5 Percussive Therapy Deep Tissue Massage Gun", p: 44990, op: 52990, img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80", desc: "QuietForce technology brushless motor delivering 16mm amplitude, OLED screen with visual guided routines, 6 attachments, and dual swappable batteries.", c: ["Matte Black"], s: ["PRO Gen 5 Set"] },
        { name: "Fitbit Charge 6 Fitness Tracker with Built-in GPS & ECG", p: 13999, op: 16999, img: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80", desc: "Google apps integration, heart rate on gym equipment, EDA stress scan, SpO2 blood oxygen, Daily Readiness score, and 7-day battery life.", c: ["Obsidian / Black", "Porcelain / Silver", "Coral / Champagne"], s: ["Small & Large Bands Included"] },
        { name: "Hydro Flask 32 oz Wide Mouth Insulated Stainless Steel Water Bottle", p: 3999, op: 4999, img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80", desc: "TempShield double-wall vacuum insulation keeps beverages cold up to 24 hours or piping hot up to 12 hours. BPA-Free and pro-grade 18/8 stainless.", c: ["Pacific Blue", "Black", "Olive", "Laguna"], s: ["32 oz (946 ml)"] }
      ]
    },

    // 10. FOOD & BEVERAGES (25 items)
    {
      cat: "Food & Beverages",
      vendor: "Madhav Gourmet Foods",
      items: [
        { name: "Blue Tokai Coffee Roasters Vienna Roast Dark Roast 500g Beans", p: 890, op: 1050, img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80", desc: "100% Arabica specialty coffee roasted fresh to order, featuring deep notes of roasted almonds, dark chocolate, and bittersweet cocoa caramel.", c: ["Whole Beans", "French Press", "Espresso Grind", "Filter Grind"], s: ["500g", "1kg"] },
        { name: "Optimum Nutrition Gold Standard 100% Whey Protein 2kg Double Rich Chocolate", p: 6499, op: 7999, img: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=600&auto=format&fit=crop&q=80", desc: "World's #1 selling whey protein powder packed with 24g of protein, 5.5g of naturally occurring BCAAs, and 4g of glutamine per scoop.", c: ["Double Rich Chocolate", "Vanilla Ice Cream", "Mocha Cappuccino"], s: ["2 kg (4.4 lbs)", "1 kg"] },
        { name: "Vahdam Imperial Darjeeling Summer Second Flush Black Tea 100g Tin", p: 999, op: 1399, img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80", desc: "Champagne of teas sourced directly from Himalayan estates. Elegant muscatel grape notes with a crisp amber liqueur and sweet floral aroma.", c: ["Golden Tin"], s: ["100g Loose Leaf"] },
        { name: "Disano 100% Pure Organic Cold Pressed Virgin Coconut Oil 1L", p: 499, op: 750, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80", desc: "Unrefined raw extra virgin coconut oil extracted from fresh coconut milk without heat. Rich in MCTs and Lauric acid for cooking and skin nourishment.", c: ["Glass Jar"], s: ["1 Litre"] },
        { name: "Happilo Premium Californian Roasted Salted Pistachios 500g", p: 749, op: 1199, img: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80", desc: "Jumbo Californian pistachios naturally opened, dry roasted and gently sprinkled with sea salt for heart-healthy snacking rich in antioxidants.", c: ["Foil Pouch"], s: ["500g", "1kg"] }
      ]
    }
  ];

  // Curated database of 300 rich realistic items
  const fullProductsList = [...rawProducts];

  // We unpack and generate variations with specific realistic specifications across the 10 categories
  const extendedCatalog = [
    // Electronics
    { name: "Sony Alpha 7 IV Full-Frame Hybrid Camera Body", cat: "Electronics", v: "Hari Tech Hub", p: 209990, op: 235000, img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80", desc: "33MP Exmor R CMOS sensor, BIONZ XR engine, 4K 60p 10-bit 4:2:2 video, S-Cinetone, real-time eye AF for humans/animals/birds.", c: ["Black"], s: ["Body Only", "Kit with 28-70mm"] },
    { name: "Anker Soundcore Space One Active Noise Cancelling Headphones", cat: "Electronics", v: "Shyam Electronics", p: 7999, op: 10999, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", desc: "2X stronger voice reduction, 40mm customized dynamic drivers with LDAC wireless Hi-Res audio, 55 hours playtime, ultra-comfortable rotating earcups.", c: ["Jet Black", "Latte Cream", "Sky Blue"], s: ["Standard"] },
    { name: "Samsung Galaxy Tab S9 Ultra 14.6-inch Dynamic AMOLED 2X", cat: "Electronics", v: "Hari Tech Hub", p: 108999, op: 121999, img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80", desc: "IP68 water resistant tablet with bundled S Pen, Snapdragon 8 Gen 2 processor, quad AKG speakers, and dual front wide cameras.", c: ["Graphite", "Beige"], s: ["256GB Wi-Fi", "512GB 5G"] },
    { name: "Google Pixel 8 Pro 5G 128GB Bay Blue with Google AI", cat: "Electronics", v: "Hari Tech Hub", p: 89999, op: 106999, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80", desc: "Google Tensor G3 chip, polished aluminum frame, 50MP triple pro camera with Magic Editor, Audio Magic Eraser, and 7 years of OS updates.", c: ["Bay Blue", "Obsidian", "Porcelain"], s: ["128GB", "256GB"] },
    { name: "Audio-Technica ATH-M50x Professional Studio Monitor Headphones", cat: "Electronics", v: "Shyam Electronics", p: 13490, op: 16500, img: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&auto=format&fit=crop&q=80", desc: "Critically acclaimed sonic performance with 45mm large-aperture drivers, copper-clad aluminum wire voice coils, 90-degree swiveling earcups and detachable cables.", c: ["Black", "White", "Gunmetal"], s: ["Over-Ear Wired"] },
    { name: "ASUS ZenBook 14 OLED Intel Core Ultra 7 16GB 1TB Evo Laptop", cat: "Electronics", v: "Hari Tech Hub", p: 109990, op: 125990, img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80", desc: "1.2kg all-metal ultraportable laptop with 3K 120Hz OLED Lumina HDR display, 75Wh battery, Intel AI Boost NPU, and Harmon Kardon speakers.", c: ["Ponder Blue", "Foggy Silver"], s: ["1TB SSD"] },
    { name: "Keychron K2 Pro QMK/VIA Wireless Custom Mechanical Keyboard", cat: "Electronics", v: "Shyam Electronics", p: 9999, op: 12499, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", desc: "75% compact layout with double-shot PBT OSA profile keycaps, hot-swappable Keychron K Pro red/brown switches, RGB backlight and Bluetooth 5.1.", c: ["Carbon Black"], s: ["Red Linear Switch", "Brown Tactile Switch", "Blue Clicky Switch"] },

    // Gaming
    { name: "Razer BlackShark V2 Pro Wireless Esports Gaming Headset", cat: "Gaming", v: "Ayan Gaming Zone", p: 17999, op: 21999, img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80", desc: "Razer HyperClear Super Wideband Mic, TriForce Titanium 50mm Drivers, ultra-soft flowknit memory foam ear cushions, and 70-hour battery life.", c: ["Black", "White"], s: ["Wireless"] },
    { name: "Corsair K70 RGB PRO Mechanical Gaming Keyboard Cherry MX Red", cat: "Gaming", v: "Ayan Gaming Zone", p: 14999, op: 18999, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", desc: "Durable aluminum frame, 8,000Hz hyper-polling with AXON processing, per-key RGB backlighting, detachable magnetic palm rest and dedicated tournament switch.", c: ["Anodized Black"], s: ["Cherry MX Red", "Cherry MX Speed"] },
    { name: "Samsung 49-inch Odyssey OLED G9 Curved Ultra-Wide Gaming Monitor", cat: "Gaming", v: "Ayan Gaming Zone", p: 139999, op: 179999, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", desc: "Dual QHD (5120x1440) 32:9 1800R curved OLED screen, 240Hz refresh rate, 0.03ms response time, Neo Quantum Processor Pro, and CoreSync lighting.", c: ["Silver Metal"], s: ["49 Inch Curved"] },
    { name: "Thrustmaster T300 RS GT Edition Racing Wheel & Pedals for PS5/PC", cat: "Gaming", v: "Ayan Gaming Zone", p: 42999, op: 49999, img: "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600&auto=format&fit=crop&q=80", desc: "Dual-belt brushless motor force feedback mechanism, 1080-degree rotation, magnetic HallEffect technology, and 3 adjustable metallic GT pedals.", c: ["Black/Silver"], s: ["Wheel + 3 Pedals"] },
    { name: "SteelSeries Aerox 3 Wireless Ultra-Lightweight 68g RGB Gaming Mouse", cat: "Gaming", v: "Ayan Gaming Zone", p: 8999, op: 11999, img: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", desc: "Holey shell design, IP54 water resistant AquaBarrier protection, TrueMove Air optical sensor, 200 hours continuous battery life with fast USB-C.", c: ["Onyx Black", "Snow White"], s: ["Wireless"] },

    // Appliances
    { name: "Sony BRAVIA 65-inch 4K Ultra HD Smart LED Google TV (KD-65X74L)", cat: "Appliances", v: "Ashu Appliances", p: 68990, op: 99990, img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80", desc: "X1 4K Processor, Live Color technology, Dolby Audio, Motionflow XR 100, Google TV with voice assistant, Apple AirPlay, and PlayStation 5 auto HDR.", c: ["Black"], s: ["65 Inch"] },
    { name: "Daikin 1.5 Ton 5 Star Inverter Split AC with PM 2.5 Filter", p: 44990, op: 58400, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "Triple display power chill technology, 3D airflow, copper condenser coils with anti-corrosion treatment, and whisper quiet indoor operation at 19 dB.", c: ["Bright White"], s: ["1.5 Ton 5 Star"] },
    { name: "LG 9kg Inverter AI Direct Drive Front Load Washing Machine with Steam", cat: "Appliances", v: "Ashu Appliances", p: 42990, op: 58990, img: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&auto=format&fit=crop&q=80", desc: "AI DD intelligent fabric sensor reduces garment damage by 18%, Steam allergy care removes 99.9% house mites, ThinQ Wi-Fi smart control and tempered glass door.", c: ["Platinum Silver"], s: ["9 Kg"] },
    { name: "Samsung 28L Convection Microwave Oven with Tandoor Technology", cat: "Appliances", v: "Ashu Appliances", p: 12490, op: 16990, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "Tandoor & Curd Any Time technology with 200°C temperature simulation for authentic crispy naans, rotis, kebabs, and ceramic enamel interior with 10-year warranty.", c: ["Clean Black"], s: ["28 Litres"] },
    { name: "Xiaomi Smart Air Purifier 4 with True HEPA Filter and OLED Display", cat: "Appliances", v: "Ashu Appliances", p: 13999, op: 19999, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80", desc: "Cleans up to 516 sq.ft room in 10 minutes with 400m³/h CADR, 3-in-1 filtration traps 99.97% particles, negative ion air freshening and Mi Home app control.", c: ["White"], s: ["Standard"] },

    // Kitchen
    { name: "Philips Daily Collection 750W 4-Jar Mixer Grinder with ProBlend", cat: "Kitchen", v: "Vam Kitchenware", p: 3999, op: 5495, img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80", desc: "Powerful 750W copper motor designed for tough Indian grinding like idli batter, turmeric, and chutneys, with leak-proof stainless steel jars and pulse switch.", c: ["Pistachio Green/White", "Deep Black"], s: ["4 Jars Set"] },
    { name: "Wonderchef Nutri-blend 400W Mixer Grinder Blender with 2 Unbreakable Jars", cat: "Kitchen", v: "Vam Kitchenware", p: 2699, op: 4000, img: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80", desc: "22,000 RPM high-speed bullet blender extracts micro-nutrients from fruits and vegetables for healthy smoothies, purees, masalas, with surgical steel blades.", c: ["Champagne Gold", "Ruby Red", "Matte Black"], s: ["2 Jars (300ml & 500ml)"] },
    { name: "Prestige Deluxe Alpha Stainless Steel Pressure Cooker 3L Induction Base", cat: "Kitchen", v: "Vam Kitchenware", p: 2150, op: 2890, img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80", desc: "Alpha induction base with unique pressure indicator, controlled gasket release system, high-grade 304 stainless steel body for safe daily cooking.", c: ["Silver"], s: ["3 Litres", "5 Litres"] },
    { name: "Cuisinart 12-Piece Ceramic Coated Non-Stick Cookware Set", cat: "Kitchen", v: "Vam Kitchenware", p: 18999, op: 24999, img: "https://images.unsplash.com/photo-1584990347449-397cb006c35a?w=600&auto=format&fit=crop&q=80", desc: "PTFE/PFOA free ceramic non-stick surface, aluminum core for even heat distribution, stay-cool silicone riveted handles, and tempered glass strainer lids.", c: ["Matte Cream", "Navy Blue"], s: ["12-Piece Set"] },
    { name: "Moccamaster KBGV Select 10-Cup Filter Drip Coffee Maker Handmade", cat: "Kitchen", v: "Vam Kitchenware", p: 32900, op: 38000, img: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80", desc: "Handmade in the Netherlands, copper boiling element brews coffee at the optimal 92°-96°C temperature in 6 minutes, with 9-hole outlet arm for balanced extraction.", c: ["Brushed Silver", "Matt Black", "Pastel Yellow"], s: ["1.25L Glass Carafe"] },

    // Home & Furniture
    { name: "IKEA POÄNG Armchair with Hillared Dark Blue Cushion & Birch Veneer", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 8990, op: 11990, img: "https://images.unsplash.com/photo-1580481077195-c99df3d854ce?w=600&auto=format&fit=crop&q=80", desc: "Layer-glued bent birch wood frame provides comfortable resilience, high back provides good neck support, removable machine washable cushion cover.", c: ["Birch/Dark Blue", "Birch/Beige", "Black-Brown/Gunnared"], s: ["Standard Armchair"] },
    { name: "Sleepyhead Original 3-Layer Orthopedic Memory Foam Mattress 6-Inch", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 11999, op: 17499, img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80", desc: "Multi-layered comfort with responsive memory foam, zero partner disturbance, breathable zipper cover, and 100-night risk free trial.", c: ["White & Slate Grey"], s: ["Queen (78x60x6 in)", "King (78x72x6 in)"] },
    { name: "Solimo Solid Wood Engineered King Bed with Box Storage", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 18499, op: 28000, img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&auto=format&fit=crop&q=80", desc: "Durable premium European standard particle board with walnut finish, spacious partitioned box storage beneath mattress board, load tested up to 350kg.", c: ["Walnut Finish", "Espresso"], s: ["King Size (78x72 in)"] },
    { name: "Duroflex LiveIn 100% Natural Latex Dual Sided Reversible Mattress", cat: "Home & Furniture", v: "Rajesh Living & Furniture", p: 21999, op: 32999, img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80", desc: "Eco-friendly GOLS certified organic latex layer with 5-zone orthopedic body contouring support, antibacterial bamboo fabric and pin-core air circulation.", c: ["Ivory White"], s: ["Queen (78x60 in)", "King (78x72 in)"] },

    // Fashion
    { name: "Nike Sportswear Club Fleece Pullover Hoodie Brushed Back", cat: "Fashion", v: "Triveni Fashion & Apparel", p: 3495, op: 4295, img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", desc: "Cozy brushed fleece fabric, jersey-lined hood with drawstring, kangaroo front pouch pocket, ribbed cuffs and embroidered Futura chest logo.", c: ["Black", "Dark Grey Heather", "Midnight Navy"], s: ["S", "M", "L", "XL", "XXL"] },
    { name: "Wrangler Men's Regular Fit Rugged Wear Denim Jacket", cat: "Fashion", v: "Triveni Fashion & Apparel", p: 3999, op: 5999, img: "https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80", desc: "Heavyweight 100% cotton unlined raw denim trucker jacket with button-flap chest pockets, side welt hand pockets and adjustable waist tabs.", c: ["Stonewash Blue", "Vintage Indigo"], s: ["M", "L", "XL", "XXL"] },
    { name: "Biba Women's Embroidered Silk Blend Anarkali Kurta with Dupatta Set", cat: "Fashion", v: "Triveni Fashion & Apparel", p: 4999, op: 7995, img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80", desc: "Floor-length royal blue anarkali kurta adorned with intricate zari and sequin embroidery on bodice, paired with matching churidar and organza dupatta.", c: ["Royal Blue", "Crimson Red", "Mustard Yellow"], s: ["32", "34", "36", "38", "40"] },
    { name: "Casio G-Shock GA-2100-1A1 'CasiOak' All-Black Carbon Core Guard Watch", cat: "Fashion", v: "Shyam Electronics", p: 8995, op: 9995, img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80", desc: "Octagonal bezel, carbon fiber reinforced resin case, 200m water resistance, world time, 5 daily alarms, countdown timer, and double LED light.", c: ["Triple Matte Black"], s: ["45.4mm Case"] },

    // Shoes
    { name: "Adidas Stan Smith Iconic White and Green Leather Tennis Sneakers", cat: "shoes", v: "Arush Footwear", p: 7999, op: 9999, img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80", desc: "Crisp smooth vegan upper made with 50% recycled materials, perforated 3-Stripes, Stan Smith tongue portrait and signature green heel tab.", c: ["Cloud White / Fairway Green"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
    { name: "Red Tape Men's Handcrafted Genuine Leather Chelsea Boots", cat: "shoes", v: "Arush Footwear", p: 3299, op: 6599, img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=80", desc: "Burnished dark tan genuine leather upper, elasticated side gores for easy slip-on, pull loop at back, and textured anti-slip TPR sole.", c: ["Dark Tan", "Classic Black"], s: ["UK 7", "UK 8", "UK 9", "UK 10"] },
    { name: "Crocs Classic Unisex Lightweight Clog Water Friendly Slip-On", cat: "shoes", v: "Arush Footwear", p: 2495, op: 2995, img: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=80", desc: "Original Croslite foam cushioning, ventilation ports shed water and debris, pivoting heel straps for a secure fit, customizable with Jibbitz charms.", c: ["Navy", "Black", "Pure White", "Digital Violet"], s: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
    { name: "Asics Gel-Kayano 30 Men's Stability Long-Distance Running Shoes", cat: "shoes", v: "Arush Footwear", p: 14999, op: 18999, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80", desc: "4D GUIDANCE SYSTEM for adaptive stability, PureGEL technology for softer landings, FF BLAST PLUS ECO lightweight foam made with 24% bio content.", c: ["Black/Pure Silver", "Sheet Rock/Hazard Green"], s: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },

    // Beauty & Care
    { name: "CeraVe Hydrating Facial Cleanser for Normal to Dry Skin with Ceramides 473ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 1250, op: 1599, img: "https://images.unsplash.com/photo-1608248597358-1e42f61a1200?w=600&auto=format&fit=crop&q=80", desc: "Formulated with hyaluronic acid and 3 essential ceramides that cleanse and hydrate without stripping the skin's natural protective barrier. Fragrance-free.", c: ["White Pump Bottle"], s: ["473ml", "236ml"] },
    { name: "L'Oréal Professionnel Absolut Repair Molecular Hair Mask with Peptides 250ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 1950, op: 2400, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80", desc: "Patented formula with Peptides bonder + 5 Amino acids reconstructs hair molecular structure to restore strength, elasticity, and natural movement.", c: ["Gold Jar"], s: ["250ml"] },
    { name: "Cosrx Advanced Snail 96 Mucin Power Essence 100ml", cat: "Beauty & Care", v: "Vasu Beauty & Care", p: 1190, op: 1450, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80", desc: "Formulated with 96.3% snail secretion filtrate to soothe damaged skin, replenish hydration, and improve skin vitality with a smooth natural glow.", c: ["Clear Pump"], s: ["100ml"] },

    // Sports & Fitness
    { name: "Decathlon Domyos Heavy-Duty Multi-Position Weight Bench 500", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 11999, op: 15999, img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80", desc: "Incline, decline and flat positions with 4 seat adjustments and 6 backrest angles. Foldable for compact upright storage, tested up to 220kg load.", c: ["Matte Black/Orange"], s: ["Foldable Bench"] },
    { name: "Strauss Latex Resistance Loop Exercise Bands Set of 5 Resistance Levels", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 699, op: 1299, img: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80", desc: "100% genuine eco-friendly Malaysian natural latex loop bands ranging from X-Light (5 lbs) to X-Heavy (40 lbs), with carry pouch and workout manual.", c: ["Multi-Color 5-Pack"], s: ["Set of 5"] },
    { name: "Yonex Astrox 99 Pro Badminton Racket Full Graphite Strung", cat: "Sports & Fitness", v: "Sai Sports & Fitness", p: 14990, op: 18990, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80", desc: "Namd graphite in shaft and frame produces flex and snapback for devastating steep smashes. Rotational Generator System with full racket cover.", c: ["Cherry Sunburst", "White Tiger"], s: ["4UG5 (83g)"] }
  ];

  // Combine full product definitions
  const allMasterItems = [...fullProductsList, ...extendedCatalog];

  // Now create 300 highly realistic products by expanding rich varieties across all categories
  const final300 = [];

  // Add the explicit hand-crafted products first
  for (const item of allMasterItems) {
    if (final300.length >= 300) break;
    final300.push({
      name: item.name,
      category: item.category || item.cat,
      price: item.price || item.p,
      discountPercentage: item.discountPercentage || (item.op ? Math.round(((item.op - item.p) / item.op) * 100) : 12),
      quantity: item.quantity || Math.floor(15 + Math.random() * 45),
      rating: item.rating || +(4.3 + Math.random() * 0.6).toFixed(1),
      ratingCount: item.ratingCount || Math.floor(40 + Math.random() * 350),
      colors: item.colors || item.c || ["Standard"],
      sizes: item.sizes || item.s || [],
      image: item.image || item.img,
      images: item.images || [item.image || item.img],
      description: item.description || item.desc,
      returnPolicy: item.returnPolicy || "7 Days Return & Exchange",
      warranty: item.warranty || "1 Year Manufacturer Warranty",
      userId: item.userId || getVId(item.vendorName || item.vendor || item.v),
      isDeleted: false
    });
  }

  // Define structured realistic variations for full product line expansion
  const generatorPool = [
    // Electronics & Tech
    {
      base: "Apple",
      cat: "Electronics",
      v: "Apple Authorised",
      templates: [
        { name: "Apple iPhone 15 Plus 128GB", p: 79900, op: 89900, img: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", desc: "Dynamic Island, 48MP main camera with 2x Telephoto, durable color-infused glass and aluminum design with USB-C.", c: ["Pink", "Yellow", "Green", "Blue", "Black"], s: ["128GB", "256GB"] },
        { name: "Apple Watch Series 9 GPS 45mm Aluminum Case with Sport Band", p: 44900, op: 49900, img: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80", desc: "S9 SiP chip with magical Double Tap gesture, 2000 nits brighter display, on-device Siri, and precision finding for iPhone.", c: ["Midnight", "Starlight", "Silver", "Pink", "Product(RED)"], s: ["41mm", "45mm"] },
        { name: "Apple AirPods Pro (2nd Generation) with MagSafe Case (USB-C)", p: 24900, op: 26900, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80", desc: "Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, Personalized Spatial Audio, and precision tracking.", c: ["White"], s: ["Standard"] },
        { name: "Apple Studio Display 27-inch 5K Retina Screen with Standard Glass", p: 159900, op: 169900, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", desc: "27-inch 5K Retina display with 600 nits brightness, 12MP Ultra Wide camera with Center Stage, and studio-quality 6-speaker sound system.", c: ["Silver"], s: ["Tilt-Adjustable Stand"] },
        { name: "Apple Magic Keyboard with Touch ID and Numeric Keypad", p: 19500, op: 21900, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", desc: "Wireless rechargeable keyboard with fast, easy, and secure Touch ID authentication for logins and Apple Pay purchases.", c: ["Black/Silver", "White/Silver"], s: ["Full Size"] }
      ]
    },
    // Samsung Electronics
    {
      base: "Samsung",
      cat: "Electronics",
      v: "Hari Tech Hub",
      templates: [
        { name: "Samsung Galaxy Z Fold6 5G 512GB Silver Shadow", p: 176999, op: 189999, img: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80", desc: "Slimmer and lighter book-style foldable phone with Galaxy AI, 7.6-inch Dynamic AMOLED 2X main screen and enhanced Armor Aluminum.", c: ["Silver Shadow", "Navy", "Crafted Black"], s: ["256GB", "512GB", "1TB"] },
        { name: "Samsung Galaxy Z Flip6 5G 256GB Mint", p: 109999, op: 119999, img: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80", desc: "Pocket-sized iconic flip phone with 50MP pro camera, FlexWindow AI interpreter, vapor chamber cooling and all-day 4000mAh battery.", c: ["Mint", "Silver Shadow", "Yellow", "Blue"], s: ["256GB", "512GB"] },
        { name: "Samsung Galaxy Watch Ultra 47mm LTE Titanium Gray", p: 59999, op: 64999, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80", desc: "Grade 4 Titanium cushion frame, 100m water resistance, dual-frequency GPS, Multi-Sport tile and up to 100 hours power saving mode.", c: ["Titanium Gray", "Titanium White", "Titanium Silver"], s: ["47mm LTE"] },
        { name: "Samsung Galaxy Buds3 Pro Wireless Noise Cancelling Earbuds", p: 19999, op: 22999, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80", desc: "Blade lights design, 24-bit Hi-Fi audio, dual amplifiers, real-time AI voice interpreter and personalized Adaptive ANC.", c: ["Silver", "White"], s: ["Standard"] }
      ]
    },
    // Sony & Audio
    {
      base: "Audio & Smart",
      cat: "Electronics",
      v: "Shyam Electronics",
      templates: [
        { name: "Sony WF-1000XM5 True Wireless Noise Cancelling Earbuds", p: 23990, op: 29990, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80", desc: "Dynamic Driver X for wide frequency reproduction, dual feedback microphones, bone conduction sensors and 24-hour total battery.", c: ["Black", "Silver"], s: ["Standard"] },
        { name: "Sony HT-A7000 7.1.2ch Dolby Atmos Soundbar with Subwoofer", p: 99990, op: 139990, img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80", desc: "360 Spatial Sound Mapping technology, up-firing speakers, built-in dual subwoofers, 8K/4K 120Hz HDMI pass-through and Hi-Res Audio.", c: ["Black"], s: ["Soundbar + Wireless Subwoofer"] },
        { name: "Sonos Era 300 Spatial Audio Smart Wireless Speaker", p: 54999, op: 61999, img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80", desc: "Six optimally positioned drivers all around the front, sides, and top supporting Dolby Atmos Music for sensational room-filling acoustics.", c: ["Black", "White"], s: ["Standard"] }
      ]
    },
    // Fashion & Apparel Brands
    {
      base: "Fashion Brands",
      cat: "Fashion",
      v: "Triveni Fashion & Apparel",
      templates: [
        { name: "Zara Men's Relaxed Fit Heavyweight Cotton T-Shirt", p: 1990, op: 2590, img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80", desc: "240 GSM dense combed cotton, dropped shoulders, boxy drape silhouette and ribbed crew neckline.", c: ["Ecru", "Washed Black", "Mocha Brown", "Forest Green"], s: ["S", "M", "L", "XL"] },
        { name: "Allen Solly Men's Slim Fit Formal Cotton Dress Shirt", p: 1899, op: 2499, img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80", desc: "100% fine Egyptian cotton with easy-iron finish, semi-cutaway collar, French placket and double convertible cuffs.", c: ["Sky Blue", "Snow White", "Lilac Pink", "Navy Micro Check"], s: ["39", "40", "42", "44"] },
        { name: "H&M Men's Regular Fit Linen-Blend Casual Trousers", p: 2699, op: 3499, img: "https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80", desc: "Breathable airy linen-cotton weave, elasticated drawstring waistband, zip fly with button, side pockets and welt back pockets.", c: ["Beige", "Navy Blue", "Khaki Green", "Black"], s: ["30", "32", "34", "36", "38"] },
        { name: "Levi's Women's 721 High Rise Skinny Jeans", p: 2999, op: 4299, img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80", desc: "Flattering 10.25-inch high rise that holds and sculpts your shape, innovative Levi's Sculpt Hyperstretch fabric that doesn't bag out.", c: ["Rugged Indigo", "Cast Shadows Black", "Light Blue Stone"], s: ["26", "28", "30", "32", "34"] },
        { name: "Fabindia Women's Handblock Printed Pure Chanderi Silk Kurta", p: 3890, op: 5200, img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80", desc: "Artisanal hand block floral motif on shimmering Chanderi silk with fine zari border detailing, mandarin collar and side slits.", c: ["Pastel Mint", "Powder Pink", "Mustard Gold"], s: ["XS", "S", "M", "L", "XL"] },
        { name: "United Colors of Benetton Men's Solid Knitted Sweater", p: 2499, op: 3999, img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", desc: "100% fine lambswool crew neck jumper with ribbed hem and cuffs, lightweight yet warm for everyday autumn and winter layering.", c: ["Maroon", "Charcoal Melange", "Teal", "Oatmeal"], s: ["M", "L", "XL", "XXL"] }
      ]
    },
    // Footwear Brands
    {
      base: "Footwear",
      cat: "shoes",
      v: "Arush Footwear",
      templates: [
        { name: "Nike Air Force 1 '07 All-White Classic Leather Sneakers", p: 8195, op: 9695, img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80", desc: "Crisp stitched leather overlays, Nike Air unit for lightweight cushioning, low-cut padded collar, and non-marking pivot circle rubber sole.", c: ["Triple White", "White/Black Swoosh"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Adidas Samba Classic OG Indoor Football Shoes", p: 9999, op: 11999, img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80", desc: "Full-grain leather upper with gritty suede T-toe overlay, serrated 3-Stripes, gold foil lettering and gum rubber low profile cupsole.", c: ["Core Black / White", "Cloud White / Black"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Puma Suede Classic XXI Low-Top Heritage Sneakers", p: 4899, op: 6999, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80", desc: "All-over velvety suede upper with synthetic lining, comfort sockliner for instant step-in cushioning and classic Puma Formstrip.", c: ["High Risk Red", "Peacoat Navy", "Castlerock Grey", "Puma Black"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"] },
        { name: "Vans Old Skool Core Classics Skate Shoes", p: 4499, op: 5499, img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80", desc: "Sturdy canvas and suede uppers, reinforced toe caps to withstand repeated wear, padded collars for support and signature waffle rubber outsoles.", c: ["Black/White", "Checkerboard", "Navy/White"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Woodland Men's Camel Leather Rugged Outdoor Trekking Shoes", p: 4195, op: 5495, img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=80", desc: "Heavy-duty nubuck oil pull-up leather, rustproof metal eyelets, grooved rubber lug sole designed for superior traction on wet rugged terrains.", c: ["Camel Brown", "Olive Khaki"], s: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
        { name: "Skechers Men's Go Walk Max Cushioning Slip-On Sneakers", p: 4299, op: 5999, img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80", desc: "Breathable textured mesh fabric upper, 5GEN high-rebound cushioning midsole, Goga Max insole technology and flexible parametric outsole.", c: ["Charcoal", "Black/White", "Navy"], s: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] }
      ]
    },
    // Home, Living & Kitchen
    {
      base: "Living & Kitchen",
      cat: "Home & Furniture",
      v: "Rajesh Living & Furniture",
      templates: [
        { name: "Modern Solid Wood TV Entertainment Unit with 2 Drawers & Open Shelves", p: 12999, op: 18999, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80", desc: "Contemporary media console accommodating up to 65-inch TVs, wire management grommets, soft-close hardware and warm natural walnut finish.", c: ["Walnut & Matte Charcoal", "Natural Oak"], s: ["150x40x45 cm"] },
        { name: "Sheesham Wood Multipurpose 4-Tier Bookshelf & Display Rack", p: 7499, op: 11999, img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&auto=format&fit=crop&q=80", desc: "Sturdy open shelf design with hand-polished honey teak finish, perfect for organizing books, planters, collectibles and home accents.", c: ["Teak Honey Finish", "Rich Walnut"], s: ["120x60x30 cm"] },
        { name: "Handmade Natural Jute Round Bohemian Area Rug (120 cm)", p: 2199, op: 3999, img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80", desc: "100% natural braided eco-friendly jute fibers, reversible durable weave, rustic coastal aesthetic for living rooms, patios, and bedrooms.", c: ["Natural Tan", "Natural Tan with White Border"], s: ["120 cm Diameter", "150 cm Diameter"] },
        { name: "Solimo Microfibre Reversible Comforter / Blanket King Size (200 GSM)", p: 1899, op: 2999, img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80", desc: "Ultra-soft microfibre shell with hypoallergenic hollow siliconized polyester filling, diamond stitching pattern to keep filling evenly distributed.", c: ["Aqua Blue & Light Grey", "Navy Blue & Royal Blue", "Olive & Khaki"], s: ["Double (220x240 cm)"] }
      ]
    },
    // Food & Gourmet
    {
      base: "Gourmet Foods",
      cat: "Food & Beverages",
      v: "Madhav Gourmet Foods",
      templates: [
        { name: "Ferrero Rocher Premium Hazelnut Chocolates 24 Pieces Box (300g)", p: 995, op: 1195, img: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80", desc: "Whole crunchy hazelnut in the heart, delicious creamy hazelnut filling, crisp wafer shell covered with milk chocolate and roasted hazelnut pieces.", c: ["Gold Gift Box"], s: ["24 Pieces (300g)"] },
        { name: "Nutraj Signature Daily Dose Mixed Dry Fruits & Berries 500g Pack", p: 699, op: 1099, img: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&auto=format&fit=crop&q=80", desc: "Power mix of California almonds, Chilean walnuts, whole cashews, black raisins, dried cranberries and blueberries rich in energy and fiber.", c: ["Zipper Pouch"], s: ["500g", "1kg"] },
        { name: "Saffola Aura Extra Light Olive & Flaxseed Blended Cooking Oil 2L", p: 1249, op: 1799, img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80", desc: "Rich in Omega-3 and natural antioxidants with high smoke point, ideal for everyday sautéing, stir frying, roasting and deep frying.", c: ["2L Bottle"], s: ["2 Litre"] },
        { name: "Twinings English Breakfast Pure Ceylon Black Tea 100 Tea Bags", p: 799, op: 1050, img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80", desc: "Famous robust, full-bodied blend of fine black teas expertly selected from Kenya, Assam, and Sri Lanka for an invigorating morning brew.", c: ["Yellow Box"], s: ["100 Tea Bags (200g)"] }
      ]
    },
    // Beauty, Skin & Fragrance
    {
      base: "Beauty Care",
      cat: "Beauty & Care",
      v: "Vasu Beauty & Care",
      templates: [
        { name: "Minimalist 10% Vitamin C Serum for Glowing Skin 30ml", p: 664, op: 699, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80", desc: "Formulated with stable Ethyl Ascorbic Acid + Centella Water to reduce sun damage, brighten skin tone, and fade dark spots without irritation.", c: ["Amber Dropper"], s: ["30ml"] },
        { name: "Neutrogena Hydro Boost Water Gel Face Moisturizer with Hyaluronic Acid 50g", p: 899, op: 1150, img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80", desc: "Oil-free lightweight water gel instantly quenches dry skin and keeps it looking smooth, supple and hydrated for up to 72 hours.", c: ["Aqua Blue Jar"], s: ["50g"] },
        { name: "Forest Essentials Soundarya Radiance Cream with 24K Gold & SPF 25 (50g)", p: 3895, op: 4400, img: "https://images.unsplash.com/photo-1608248597358-1e42f61a1200?w=600&auto=format&fit=crop&q=80", desc: "Infused with pure 24 Karat gold Bhasma, saffron, cow's ghee and precious Ayurvedic herbs to firm tone, nourish and boost natural collagen.", c: ["Royal Gold Jar"], s: ["50g"] },
        { name: "Yves Saint Laurent Black Opium Eau De Parfum for Women 90ml", p: 12500, op: 14200, img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80", desc: "Addictive gourmand floral fragrance with energetic black coffee, luminous white flowers, sweet vanilla and warm cedarwood notes.", c: ["Glitter Black Bottle"], s: ["90ml EDP"] }
      ]
    }
  ];

  // Continue filling uniquely up to exactly 300 products
  let variationCounter = 1;
  while (final300.length < 300) {
    for (const group of generatorPool) {
      if (final300.length >= 300) break;
      for (const t of group.templates) {
        if (final300.length >= 300) break;
        const serial = variationCounter;
        const isOriginal = serial === 1;
        const nameSuffix = isOriginal ? "" : ` (Series ${serial})`;
        
        final300.push({
          name: `${t.name}${nameSuffix}`,
          category: group.cat,
          price: t.p + (serial > 1 ? (serial * 40) : 0),
          discountPercentage: Math.round(((t.op - t.p) / t.op) * 100),
          quantity: Math.floor(12 + (Math.random() * 50)),
          rating: +(4.3 + (Math.random() * 0.6)).toFixed(1),
          ratingCount: Math.floor(45 + (Math.random() * 400)),
          colors: t.c || ["Standard"],
          sizes: t.s || [],
          image: t.img,
          images: [t.img],
          description: t.desc,
          returnPolicy: "7 Days Return & Replacement",
          warranty: "1 Year Official Brand Warranty",
          userId: getVId(group.v),
          isDeleted: false
        });
      }
    }
    variationCounter++;
  }

  console.log(`Prepared ${final300.length} distinct rich products.`);
  
  // Insert all 300 products in MongoDB
  const inserted = await Product.insertMany(final300);
  console.log(`Successfully inserted ${inserted.length} new products into database!`);

  const totalCount = await Product.countDocuments({});
  console.log(`Total active products in database now: ${totalCount}`);
  
  process.exit(0);
}

seed300Products().catch(err => {
  console.error("Error executing 300 products seed:", err);
  process.exit(1);
});

