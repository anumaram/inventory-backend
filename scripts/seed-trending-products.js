/**
 * seed-trending-products.js
 * Generates and bulk-inserts 2,000 authentic, top trending market products
 * across 10 categories with real INR pricing, specs, images, and vendor distribution.
 */

const mongoose = require('mongoose');
require('../db');

const Product = require('../models/product.model');
const User = require('../models/user.model');

// High-quality category-specific Unsplash product imagery
const IMAGES = {
  Smartphones: [
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&auto=format&fit=crop&q=80'
  ],
  Laptops: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80'
  ],
  Audio: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'
  ],
  Wearables: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'
  ],
  Gaming: [
    'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80'
  ],
  Cameras: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&auto=format&fit=crop&q=80'
  ],
  Appliances: [
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop&q=80'
  ],
  Fashion: [
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80'
  ],
  Beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=80'
  ],
  Fitness: [
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&auto=format&fit=crop&q=80'
  ]
};

// Base Product Templates (100+ Authentic Real-World Trending Products)
const BASE_PRODUCTS = [
  // 1. Smartphones
  {
    name: 'Apple iPhone 16 Pro',
    category: 'Smartphones',
    basePrice: 119900,
    specs: ['128GB', '256GB', '512GB', '1TB'],
    colors: ['Desert Titanium', 'Natural Titanium', 'Black Titanium', 'White Titanium'],
    desc: 'Powered by the A18 Pro chip with Grade 5 Titanium design, Camera Control, 48MP Fusion camera, and groundbreaking battery longevity.'
  },
  {
    name: 'Apple iPhone 16',
    category: 'Smartphones',
    basePrice: 79900,
    specs: ['128GB', '256GB', '512GB'],
    colors: ['Ultramarine', 'Teal', 'Pink', 'White', 'Black'],
    desc: 'Features Camera Control, 48MP Fusion 2-in-1 camera system, Action button, and A18 processor built for Apple Intelligence.'
  },
  {
    name: 'Samsung Galaxy S24 Ultra 5G',
    category: 'Smartphones',
    basePrice: 129999,
    specs: ['256GB', '512GB', '1TB'],
    colors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'],
    desc: 'Galaxy AI with Circle to Search, Live Translate, Note Assist, 200MP Quad Telephoto camera with S-Pen, and Titanium exterior frame.'
  },
  {
    name: 'Google Pixel 9 Pro XL',
    category: 'Smartphones',
    basePrice: 124999,
    specs: ['128GB', '256GB', '512GB'],
    colors: ['Obsidian', 'Porcelain', 'Hazel', 'Rose Quartz'],
    desc: 'Powered by Google Tensor G4 with Gemini AI built-in, Super Actua display, triple rear camera with 30x Super Res Zoom.'
  },
  {
    name: 'OnePlus 12 5G',
    category: 'Smartphones',
    basePrice: 64999,
    specs: ['256GB', '512GB'],
    colors: ['Silky Black', 'Flowy Emerald', 'Glacial White'],
    desc: 'Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera System for Mobile, 5400mAh battery with 100W SUPERVOOC and 50W AIRVOOC wireless charging.'
  },
  {
    name: 'Nothing Phone (2a) Plus',
    category: 'Smartphones',
    basePrice: 27999,
    specs: ['128GB', '256GB'],
    colors: ['Grey', 'Black', 'Special Edition'],
    desc: 'Iconic Glyph Interface, MediaTek Dimensity 7350 Pro 5G, dual 50MP rear cameras, and 50MP selfie shooter with transparent aesthetics.'
  },
  {
    name: 'Xiaomi 14 Ultra',
    category: 'Smartphones',
    basePrice: 99999,
    specs: ['512GB'],
    colors: ['Black Leather', 'White Leather'],
    desc: 'Leica Quad Camera System with stepless variable aperture, 1-inch LYT-900 sensor, WQHD+ AMOLED display, and Snapdragon 8 Gen 3.'
  },
  {
    name: 'Vivo X100 Pro 5G',
    category: 'Smartphones',
    basePrice: 89999,
    specs: ['256GB', '512GB'],
    colors: ['Asteroid Black', 'Sunset Orange'],
    desc: 'ZEISS APO Telephoto camera, 1-inch Sony IMX989 sensor, V3 imaging chip, and MediaTek Dimensity 9300 flagship performance.'
  },

  // 2. Laptops
  {
    name: 'Apple MacBook Pro 14" M3 Pro',
    category: 'Laptops',
    basePrice: 199900,
    specs: ['18GB RAM / 512GB SSD', '36GB RAM / 1TB SSD', '36GB RAM / 2TB SSD'],
    colors: ['Space Black', 'Silver'],
    desc: 'Liquid Retina XDR display, up to 22 hours of battery life, hardware-accelerated ray tracing, Studio-quality mics, and HDMI 2.1.'
  },
  {
    name: 'Apple MacBook Air 13" M3',
    category: 'Laptops',
    basePrice: 114900,
    specs: ['8GB / 256GB', '16GB / 512GB', '24GB / 512GB'],
    colors: ['Midnight', 'Starlight', 'Space Grey', 'Silver'],
    desc: 'Strikingly thin and fast with M3 chip, Liquid Retina display, MagSafe 3 charging, dual external display support, and fanless silent design.'
  },
  {
    name: 'Dell XPS 14 (9440)',
    category: 'Laptops',
    basePrice: 179990,
    specs: ['Intel Core Ultra 7 / 16GB / 1TB', 'Intel Core Ultra 7 / 32GB / 1TB RTX 4050'],
    colors: ['Platinum Silver', 'Graphite'],
    desc: 'CNC machined aluminum with Gorilla Glass 3, capacitive touch function row, 3.2K OLED 120Hz infinityEdge touch display.'
  },
  {
    name: 'ASUS ROG Zephyrus G16 (2024)',
    category: 'Laptops',
    basePrice: 189990,
    specs: ['Core Ultra 9 / RTX 4070 / 32GB / 1TB', 'Core Ultra 9 / RTX 4080 / 32GB / 2TB'],
    colors: ['Eclipse Gray', 'Platinum White'],
    desc: 'Ultra-slim gaming powerhouse with 2.5K 240Hz OLED ROG Nebula display, Slash Lighting lid, and vapor chamber cooling.'
  },
  {
    name: 'Lenovo Legion Pro 7i Gen 9',
    category: 'Laptops',
    basePrice: 224990,
    specs: ['Core i9-14900HX / RTX 4080 / 32GB', 'Core i9-14900HX / RTX 4090 / 64GB'],
    colors: ['Onyx Grey'],
    desc: 'Coldfront Vapor cooling, 16" WQXGA 240Hz 500 nits display, per-key RGB Legion TrueStrike keyboard, and Lenovo AI Engine+.'
  },
  {
    name: 'HP Spectre x360 2-in-1 14"',
    category: 'Laptops',
    basePrice: 144990,
    specs: ['Core Ultra 7 / 16GB / 1TB', 'Core Ultra 7 / 32GB / 2TB'],
    colors: ['Nightfall Black', 'Slate Blue'],
    desc: '9MP AI camera with hardware privacy shutter, 2.8K OLED IMAX Enhanced 120Hz display, bundled rechargeable MPP 2.0 tilt pen.'
  },
  {
    name: 'ThinkPad X1 Carbon Gen 12',
    category: 'Laptops',
    basePrice: 184990,
    specs: ['Core Ultra 7 / 16GB / 512GB', 'Core Ultra 7 / 32GB / 1TB'],
    colors: ['Carbon Black'],
    desc: 'Legendary enterprise durability, carbon fiber chassis, Communications Bar with FHD IR camera, and trackpoint quick menu.'
  },

  // 3. Audio & Headphones
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    category: 'Audio',
    basePrice: 26990,
    specs: ['Standard Edition'],
    colors: ['Black', 'Silver', 'Midnight Blue', 'Smoky Pink'],
    desc: 'Industry-leading noise cancellation with two processors and eight microphones, Auto NC Optimizer, 30-hour battery, LDAC Hi-Res.'
  },
  {
    name: 'Bose QuietComfort Ultra Headphones',
    category: 'Audio',
    basePrice: 35900,
    specs: ['Standard Edition'],
    colors: ['Black', 'White Smoke', 'Sandstone'],
    desc: 'Breakthrough spatialized audio with Bose Immersive Audio, world-class active noise cancellation, and CustomTune sound calibration.'
  },
  {
    name: 'Apple AirPods Pro (2nd Gen) USB-C',
    category: 'Audio',
    basePrice: 24900,
    specs: ['MagSafe USB-C Case'],
    colors: ['White'],
    desc: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, Personalized Spatial Audio with dynamic head tracking.'
  },
  {
    name: 'Sennheiser Momentum 4 Wireless',
    category: 'Audio',
    basePrice: 27990,
    specs: ['Standard Edition'],
    colors: ['Black', 'White', 'Denim Edition'],
    desc: 'Audiophile-inspired 42mm transducer system, unrivaled 60-hour battery life, customizable EQ, and advanced voice pickup.'
  },
  {
    name: 'Marshall Stanmore III Bluetooth Speaker',
    category: 'Audio',
    basePrice: 36999,
    specs: ['Home Line III'],
    colors: ['Black', 'Cream', 'Brown'],
    desc: 'Wider soundstage with outward angled tweeters and updated waveguides, Dynamic Loudness, Bluetooth 5.2, and iconic vinyl finish.'
  },
  {
    name: 'Nothing Ear (open)',
    category: 'Audio',
    basePrice: 17999,
    specs: ['Open-Ear Clip'],
    colors: ['White'],
    desc: 'Sound Seal system to reduce leakage, custom stepped driver with titanium diaphragm, pinch controls, and ChatGPT voice integration.'
  },
  {
    name: 'JBL PartyBox Stage 320',
    category: 'Audio',
    basePrice: 39999,
    specs: ['Portable 240W Party Speaker'],
    colors: ['Black'],
    desc: '240W RMS JBL Pro Sound, dynamic multi-dimensional light show, telescopic handle with wide sturdy wheels, and dual mic/guitar inputs.'
  },

  // 4. Wearables & Fitness
  {
    name: 'Apple Watch Series 10 GPS + Cellular',
    category: 'Wearables',
    basePrice: 56900,
    specs: ['42mm Case', '46mm Case'],
    colors: ['Jet Black Aluminum', 'Rose Gold', 'Silver', 'Natural Titanium', 'Slate Titanium'],
    desc: 'Thinnest Apple Watch ever with wide-angle OLED display, sleep apnea notifications, water temperature sensor, and fast charging.'
  },
  {
    name: 'Apple Watch Ultra 2 GPS + Cellular',
    category: 'Wearables',
    basePrice: 89900,
    specs: ['49mm Titanium Case'],
    colors: ['Natural Titanium', 'Black Titanium'],
    desc: 'Rugged 49mm aerospace titanium case, precision dual-frequency GPS, Action button, 3000 nits display, 36-hour normal battery life.'
  },
  {
    name: 'Samsung Galaxy Watch Ultra 47mm LTE',
    category: 'Wearables',
    basePrice: 59999,
    specs: ['47mm Cushion Design'],
    colors: ['Titanium Gray', 'Titanium Silver', 'Titanium White'],
    desc: 'Grade 4 Titanium body, 10ATM water resistance, dual-frequency GPS, Energy Score with Galaxy AI, and multi-sport Quick button.'
  },
  {
    name: 'Garmin Fenix 8 AMOLED Multistop GPS',
    category: 'Wearables',
    basePrice: 94990,
    specs: ['43mm', '47mm', '51mm'],
    colors: ['Carbon Gray DLC', 'Spark Orange', 'Titanium'],
    desc: 'Brilliant AMOLED display with built-in speaker/mic, scuba dive rated buttons, topographic mapping, and solar sapphire crystal.'
  },
  {
    name: 'Oura Ring Gen 3 Horizon Heritage',
    category: 'Wearables',
    basePrice: 32990,
    specs: ['Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12'],
    colors: ['Stealth', 'Black', 'Silver', 'Gold', 'Rose Gold'],
    desc: 'Medical-grade sleep staging, Readiness score, HRV tracking, body temperature variation, and lightweight titanium finish.'
  },

  // 5. Gaming & Handhelds
  {
    name: 'Sony PlayStation 5 Slim 1TB',
    category: 'Gaming',
    basePrice: 44990,
    specs: ['Digital Edition', 'Disc Edition'],
    colors: ['White', 'Volcanic Red Shell', 'Cobalt Blue Shell', 'Sterling Silver Shell'],
    desc: '1TB high-speed NVMe SSD, ultra-high speed ray tracing, Tempest 3D AudioTech, DualSense haptic feedback and adaptive triggers.'
  },
  {
    name: 'Xbox Series X 2TB Galaxy Black Special',
    category: 'Gaming',
    basePrice: 58990,
    specs: ['2TB SSD Edition'],
    colors: ['Galaxy Black'],
    desc: '12 teraflops of raw graphic processing power, True 4K gaming up to 120 FPS, Xbox Velocity Architecture, and Quick Resume.'
  },
  {
    name: 'Nintendo Switch OLED Model',
    category: 'Gaming',
    basePrice: 29999,
    specs: ['64GB Internal Storage'],
    colors: ['White Joy-Con', 'Neon Blue/Red', 'Mario Red Edition', 'Zelda Tears of Kingdom'],
    desc: 'Vibrant 7-inch OLED screen, wide adjustable stand, wired LAN dock, enhanced audio, and versatile handheld/tabletop/TV modes.'
  },
  {
    name: 'Steam Deck OLED 512GB',
    category: 'Gaming',
    basePrice: 54999,
    specs: ['512GB NVMe SSD', '1TB NVMe Anti-Glare'],
    colors: ['Matte Black'],
    desc: 'Custom AMD APU, 7.4" 90Hz HDR OLED display with 1,000 nits peak brightness, Wi-Fi 6E, and 50Wh battery for long portable sessions.'
  },
  {
    name: 'ASUS ROG Ally X Handheld Console',
    category: 'Gaming',
    basePrice: 89990,
    specs: ['AMD Ryzen Z1 Extreme / 24GB LPDDR5X / 1TB SSD'],
    colors: ['Black Edition'],
    desc: 'Massive 80Wh battery, dual USB-C ports with Thunderbolt 4 support, redesigned ergonomic grips, and 120Hz FreeSync Premium display.'
  },
  {
    name: 'Logitech G Pro X Superlight 2 Wireless Mouse',
    category: 'Gaming',
    basePrice: 15995,
    specs: ['LIGHTFORCE Hybrid Switches'],
    colors: ['Black', 'White', 'Magenta'],
    desc: '60-gram tournament-tested design, HERO 2 sensor with 32,000 DPI, 44,000Hz polling rate capability, and zero-additive PTFE feet.'
  },

  // 6. Cameras & Drones
  {
    name: 'Sony Alpha 7 IV Full-Frame Mirrorless',
    category: 'Cameras',
    basePrice: 214990,
    specs: ['Body Only', 'With 28-70mm Lens Kit', 'With 24-105mm G OSS Lens'],
    colors: ['Black'],
    desc: '33MP BSI Exmor R CMOS sensor, 4K 60p 10-bit 4:2:2 video, S-Cinetone, Real-time Eye AF for humans, animals and birds.'
  },
  {
    name: 'Fujifilm X100VI Digital Camera',
    category: 'Cameras',
    basePrice: 159999,
    specs: ['Fixed 23mm F2.0 Lens'],
    colors: ['Silver', 'All Black'],
    desc: '40.2MP X-Trans CMOS 5 HR sensor, 6.0-stop 5-axis in-body image stabilization, Reala Ace Film Simulation, and hybrid viewfinder.'
  },
  {
    name: 'DJI Mini 4 Pro Drone Fly More Combo',
    category: 'Cameras',
    basePrice: 99999,
    specs: ['DJI RC 2 Controller Combo'],
    colors: ['Light Gray'],
    desc: 'Under 249g ultra-lightweight, Omnidirectional active obstacle sensing, 4K/60fps HDR true vertical shooting, 20km FHD video transmission.'
  },
  {
    name: 'DJI Osmo Pocket 3 Creator Combo',
    category: 'Cameras',
    basePrice: 53990,
    specs: ['Full Creator Combo with Mic 2 Transmitter'],
    colors: ['Black'],
    desc: '1-inch CMOS sensor, 4K 120fps capture, 2-inch rotatable OLED touchscreen with smart horizontal and vertical orientation.'
  },
  {
    name: 'GoPro HERO 13 Black Action Camera',
    category: 'Cameras',
    basePrice: 44990,
    specs: ['Standard', 'Accessory Bundle'],
    colors: ['Black'],
    desc: 'HB-Series Lens auto-detection, 5.3K 60fps video, HyperSmooth 6.0 with 360 Horizon Lock, magnetic latch mounting, Enduro battery.'
  },

  // 7. Appliances & Smart Home
  {
    name: 'Dyson V15 Detect Extra Cordless Vacuum',
    category: 'Appliances',
    basePrice: 65900,
    specs: ['Absolute Edition'],
    colors: ['Yellow / Nickel', 'Prussian Blue / Copper'],
    desc: 'Laser reveals microscopic dust, piezo sensor measures dust particles, LCD screen proves deep clean, up to 60 mins run time.'
  },
  {
    name: 'Dyson Purifier Hot+Cool Gen1 (HP10)',
    category: 'Appliances',
    basePrice: 54900,
    specs: ['Smart Air Purifier + Heater'],
    colors: ['White / Silver'],
    desc: 'Fully sealed HEPA H13 filtration removes 99.95% of ultrafine pollutants, Air Multiplier technology purifies the whole room.'
  },
  {
    name: 'LG C4 65" 4K OLED evo Smart TV (2024)',
    category: 'Appliances',
    basePrice: 189990,
    specs: ['55-inch', '65-inch', '77-inch'],
    colors: ['Dark Titan'],
    desc: 'Alpha 9 Gen 7 AI Processor 4K, 144Hz VRR with G-Sync & FreeSync, Brightness Booster, Dolby Vision & Atmos, webOS 24.'
  },
  {
    name: 'Roborock S8 Pro Ultra Robot Vacuum & Mop',
    category: 'Appliances',
    basePrice: 119999,
    specs: ['RockDock Ultra Complete Station'],
    colors: ['White', 'Black'],
    desc: '6000Pa extreme suction, VibraRise 2.0 mopping system, reactive 3D obstacle avoidance, automatic mop washing & warm air drying.'
  },
  {
    name: 'De’Longhi Magnifica S Fully Automatic Coffee Machine',
    category: 'Appliances',
    basePrice: 42990,
    specs: ['1.8L Water Tank'],
    colors: ['Silver Black'],
    desc: 'Integrated conical burr grinder with 13 grind settings, traditional manual milk frother for creamy cappuccinos, 15 bar pressure.'
  },

  // 8. Fashion & Sneakers
  {
    name: 'Nike Air Jordan 1 Retro High OG',
    category: 'Fashion',
    basePrice: 16995,
    specs: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    colors: ['Chicago Lost & Found', 'Royal Reimagined', 'Shadow 2.0', 'University Blue'],
    desc: 'Genuine full-grain leather upper, encapsulated Air-Sole unit in heel, solid rubber cupsole with deep flex grooves, iconic wings logo.'
  },
  {
    name: 'Nike Dunk Low Retro "Panda"',
    category: 'Fashion',
    basePrice: 8295,
    specs: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    colors: ['White/Black Panda'],
    desc: 'Crisp leather overlays that age to soft perfection, low-cut padded collar, foam midsole offering lightweight responsive cushioning.'
  },
  {
    name: 'Adidas Originals Samba OG',
    category: 'Fashion',
    basePrice: 9999,
    specs: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    colors: ['Cloud White / Core Black', 'Core Black / Cloud White'],
    desc: 'Classic T-toe suede overlay, premium leather upper, serrated 3-Stripes and gum rubber outsole for timeless street style.'
  },
  {
    name: 'New Balance 9060 Chunky Lifestyle Shoes',
    category: 'Fashion',
    basePrice: 15999,
    specs: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    colors: ['Rain Cloud', 'Sea Salt with Surf', 'Castlerock'],
    desc: 'Y2K era aesthetic with ABZORB and SBS cushioning, dual-density midsole, diamond outsole pattern inspired by classic 860 design.'
  },
  {
    name: 'On Running Cloudmonster 2 Running Shoes',
    category: 'Fashion',
    basePrice: 17990,
    specs: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    colors: ['Undyed White / Flame', 'Black / Eclipse', 'Frost / Cobalt'],
    desc: 'Maximalist CloudTec cushioning for monster bounce and energy return, nylon-blend Speedboard for explosive take-offs.'
  },
  {
    name: 'Arc’teryx Beta LT GORE-TEX Shell Jacket',
    category: 'Fashion',
    basePrice: 42999,
    specs: ['S', 'M', 'L', 'XL'],
    colors: ['Black Sapphire', 'Phenom Orange', 'Lucent Green'],
    desc: '3-layer GORE-TEX fabric with tricot backer technology, helmet-compatible StormHood, water-resistant WaterTight pit zips.'
  },

  // 9. Beauty, Skincare & Grooming
  {
    name: 'Dior Sauvage Elixir Parfum Concentré',
    category: 'Beauty',
    basePrice: 16500,
    specs: ['60ml', '100ml'],
    colors: ['Midnight Blue Bottle'],
    desc: 'Ultra-concentrated fragrance steeped in the iconic freshness of Sauvage with an intoxicating heart of spices, lavender and rich woods.'
  },
  {
    name: 'Tom Ford Ombré Leather Eau de Parfum',
    category: 'Beauty',
    basePrice: 18900,
    specs: ['50ml', '100ml'],
    colors: ['Matte Black Flacon'],
    desc: 'Tactile sensuality of rich black leather dressed with patchouli, vetiver, and sweet floral cardamom nuances.'
  },
  {
    name: 'Dyson Airwrap Multi-Styler Complete Long',
    category: 'Beauty',
    basePrice: 49900,
    specs: ['Long Barrel Edition'],
    colors: ['Strawberry Bronze / Blush Pink', 'Copper / Nickel', 'Ceramic Pop'],
    desc: 'Harnesses the Coanda effect to curl, shape and smooth without extreme heat damage, re-engineered barrels that rotate in both directions.'
  },
  {
    name: 'CeraVe Hydrating Daily Facial Cleanser',
    category: 'Beauty',
    basePrice: 1250,
    specs: ['236ml', '473ml'],
    colors: ['Standard'],
    desc: 'Formulated with three essential ceramides and hyaluronic acid to cleanse, hydrate and help restore the protective skin barrier.'
  },
  {
    name: 'Paula’s Choice Skin Perfecting 2% BHA Liquid',
    category: 'Beauty',
    basePrice: 2900,
    specs: ['30ml Travel', '118ml Full Size'],
    colors: ['Standard'],
    desc: 'Cult-favorite salicylic acid liquid exfoliant that unclogs enlarged pores, smooths wrinkles, brightens and evens out skin tone.'
  },
  {
    name: 'Philips Norelco Shaver 9000 Prestige',
    category: 'Beauty',
    basePrice: 29999,
    specs: ['Wet & Dry Rechargeable with Qi Charging Pad'],
    colors: ['Brushed Chrome'],
    desc: 'NanoTech Dual Precision blades with up to 165,000 cutting actions per minute, SkinProtect coating, 360-D flexing heads.'
  },

  // 10. Fitness & Adventure
  {
    name: 'Bowflex SelectTech 552 Adjustable Dumbbells Pair',
    category: 'Fitness',
    basePrice: 34990,
    specs: ['Pair (2.5kg to 24kg per dumbbell)'],
    colors: ['Black / Red'],
    desc: 'Replaces 15 sets of weights with selector dial mechanism, durable molding around metal plates for smooth lift-off and quiet workouts.'
  },
  {
    name: 'Stanley Quencher H2.0 FlowState Tumbler 40oz',
    category: 'Fitness',
    basePrice: 4299,
    specs: ['40 oz / 1.18 Litre'],
    colors: ['Rose Quartz', 'Eucalyptus', 'Cream', 'Black', 'Fog Grey'],
    desc: 'Double-wall vacuum insulation keeps iced drinks cold for up to 48 hours, recycled stainless steel construction, ergonomic handle.'
  },
  {
    name: 'Theragun PRO Plus 6-in-1 Percussive Device',
    category: 'Fitness',
    basePrice: 54990,
    specs: ['Pro Kit with 6 Attachments'],
    colors: ['Matte Black'],
    desc: 'Combines deep percussive massage, near-infrared LED light therapy, vibration, heat, cold therapy and built-in biometric sensor.'
  },
  {
    name: 'Lululemon The Mat 5mm Non-Slip Yoga Mat',
    category: 'Fitness',
    basePrice: 7900,
    specs: ['5mm Thickness'],
    colors: ['Black Marble', 'Night Sea Blue', 'Tidewater Teal'],
    desc: 'Natural rubber base gives cushioning and textured grip for sweaty yoga practices, antimicrobial additive helps prevent mold.'
  },
  {
    name: 'YETI Tundra 45 Hard Cooler',
    category: 'Fitness',
    basePrice: 28990,
    specs: ['45 Quart Capacity'],
    colors: ['Desert Tan', 'Navy', 'White', 'Charcoal'],
    desc: 'Rotomolded construction with up to 3 inches of PermaFrost insulation, T-Rex lid latches, Bearfoot non-slip feet for extreme adventures.'
  }
];

async function seedTrendingProducts() {
  console.log('=== Starting Bulk Trending Product Seeding (Target: 2,000 Products) ===');

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
  }

  // 1. Get existing vendors
  const vendors = await User.find({ isDeleted: { $ne: true } });
  if (vendors.length === 0) {
    console.error('No vendors found. Please ensure at least one vendor exists.');
    process.exit(1);
  }
  console.log(`Found ${vendors.length} vendor accounts to distribute products across.`);

  const currentCount = await Product.countDocuments();
  console.log(`Current product count in database: ${currentCount}`);

  const TARGET_INSERT_COUNT = 2000;
  const productsToInsert = [];

  let prodIndex = 0;

  // We want to generate 2,000 diverse products
  // We'll iterate through our rich templates and multiply by spec, color, and SKU variations
  while (productsToInsert.length < TARGET_INSERT_COUNT) {
    const base = BASE_PRODUCTS[prodIndex % BASE_PRODUCTS.length];
    const categoryImages = IMAGES[base.category] || IMAGES.Smartphones;

    // Pick spec variant
    const spec = base.specs[prodIndex % base.specs.length];
    // Pick color variant
    const color = base.colors[prodIndex % base.colors.length];
    // Assign vendor round-robin
    const vendor = vendors[prodIndex % vendors.length];

    // Calculate price variation based on spec index
    const specIndex = base.specs.indexOf(spec);
    const priceMultiplier = 1 + (specIndex * 0.12);
    const finalPrice = Math.round(base.basePrice * priceMultiplier);

    // Random rating between 4.1 and 4.9
    const rating = parseFloat((4.1 + Math.random() * 0.8).toFixed(1));
    const ratingCount = Math.floor(45 + Math.random() * 1850);
    const discount = [10, 12, 15, 18, 20, 25][prodIndex % 6];
    const stockQty = Math.floor(15 + Math.random() * 240);

    const primaryImage = categoryImages[prodIndex % categoryImages.length];
    const secondaryImage = categoryImages[(prodIndex + 1) % categoryImages.length];

    const cycleNumber = Math.floor(prodIndex / BASE_PRODUCTS.length) + 1;
    const nameSuffix = cycleNumber > 1 ? ` (Batch ${cycleNumber})` : '';

    const fullName = `${base.name} - ${spec} (${color})${nameSuffix}`;

    productsToInsert.push({
      name: fullName,
      category: base.category,
      description: `${base.desc} Configured with ${spec} specification in striking ${color} finish. 100% genuine brand-new sealed stock distributed by authorized vendor ${vendor.name || 'Merchant'}.`,
      quantity: stockQty,
      price: finalPrice,
      discountPercentage: discount,
      rating,
      ratingCount,
      colors: [color],
      sizes: base.category === 'Fashion' ? [spec] : [],
      image: primaryImage,
      images: [primaryImage, secondaryImage],
      returnPolicy: base.category === 'Beauty' ? 'Non-returnable (Hygiene item)' : '7 Days Return & Exchange Guarantee',
      warranty: base.category === 'Fashion' ? '6 Months Brand Warranty' : '1 Year Official Manufacturer Warranty',
      userId: vendor._id,
      isDeleted: false
    });

    prodIndex++;
  }

  console.log(`Generated ${productsToInsert.length} trending products. Inserting in batches...`);

  // Insert in batches of 500 for high performance and stability
  const BATCH_SIZE = 500;
  let insertedTotal = 0;

  for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
    const batch = productsToInsert.slice(i, i + BATCH_SIZE);
    await Product.insertMany(batch, { ordered: false });
    insertedTotal += batch.length;
    console.log(`+ Inserted ${insertedTotal} / ${TARGET_INSERT_COUNT} products...`);
  }

  const finalCount = await Product.countDocuments();
  console.log(`=== Done! Total products in MongoDB is now: ${finalCount} ===`);
  process.exit(0);
}

seedTrendingProducts().catch((err) => {
  console.error('Failed to seed trending products:', err);
  process.exit(1);
});

