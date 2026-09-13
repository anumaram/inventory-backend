const mongoose = require('mongoose');
const Product = require('./models/product.model');
const User = require('./models/user.model');
const InventoryHistory = require('./models/inventory-history.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory-app';

// =========================================================================
// 1. DEDICATED DISTINCT IMAGES & METADATA FOR 1500 NEW PRODUCTS
// =========================================================================
const RICH_CATALOG = [
  // -------------------------------------------------------------
  // PERFUMES & FRAGRANCES
  // -------------------------------------------------------------
  {
    category: 'Perfumes & Fragrances',
    items: [
      {
        name: 'Dior Sauvage Eau de Parfum (100ml)',
        desc: 'Radically fresh composition dictated by a name that has the ring of a manifesto. Radiant top notes burst with juicy Calabrian bergamot and Papua New Guinean vanilla absolute.',
        price: 11500, discount: 10, colors: ['Midnight Blue Glass'], sizes: ['60 ml', '100 ml', '200 ml'],
        image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Chanel Bleu de Chanel Parfum (100ml)',
        desc: 'An intensely aromatic, woody fragrance that opens with fresh invigorating notes and trails with rich New Caledonian sandalwood.',
        price: 13900, discount: 8, colors: ['Obsidian Navy Glass'], sizes: ['50 ml', '100 ml'],
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Tom Ford Tobacco Vanille Eau de Parfum',
        desc: 'Opulent warm gourmand fragrance with rich tobacco leaf, tonka bean, aromatic vanilla, cocoa, and sweet wood sap accords.',
        price: 24500, discount: 12, colors: ['Amber Flacon'], sizes: ['50 ml', '100 ml'],
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Yves Saint Laurent Black Opium EDP',
        desc: 'Captivating floral gourmand perfume featuring addictive black coffee accords mingled with sensual white florals and warm cedarwood.',
        price: 9800, discount: 15, colors: ['Glitter Black'], sizes: ['30 ml', '50 ml', '90 ml'],
        image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Versace Eros Flame Eau de Parfum',
        desc: 'Passionate and strong fragrance characterized by intense contrasts: sweet Italian citrus accords blended with fiery rosemary and amber woods.',
        price: 7800, discount: 18, colors: ['Ruby Red'], sizes: ['50 ml', '100 ml', '200 ml'],
        image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Jo Malone English Pear & Freesia Cologne',
        desc: 'The sensuous freshness of just-ripe pears wrapped in a bouquet of white freesias and mellowed by amber, patchouli and woods.',
        price: 10200, discount: 10, colors: ['Clear Glass'], sizes: ['30 ml', '100 ml'],
        image: 'https://images.unsplash.com/photo-1582211594533-268f4f1edcb9?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Creed Aventus Handcrafted Millesime Fragrance',
        desc: 'Celebrated luxury fragrance with fruity top notes of blackcurrant and apple leading to a smoky birch and oakmoss heart.',
        price: 32000, discount: 5, colors: ['Silver & Black Emblem'], sizes: ['50 ml', '100 ml'],
        image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Bvlgari Man in Black Eau de Parfum',
        desc: 'Sensual oriental neo-woody amber fragrance expressing a magnetic masculine charisma with notes of spicy rum and tuberose.',
        price: 8900, discount: 14, colors: ['Matte Black Gold'], sizes: ['60 ml', '100 ml'],
        image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // FOOD & BEVERAGES
  // -------------------------------------------------------------
  {
    category: 'Food & Beverages',
    items: [
      {
        name: 'Single-Origin Ethiopian Yirgacheffe Whole Coffee Beans (500g)',
        desc: 'Medium-light roast 100% Arabica with delicate floral aroma, bright lemon citrus acidity, and sweet bergamot tasting notes.',
        price: 1299, discount: 15, colors: ['Matte Craft Pouch'], sizes: ['250g', '500g', '1kg'],
        image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Japanese Ceremonial Grade Uji Matcha Green Tea Powder (100g)',
        desc: 'First harvest stone-ground green tea leaves from Kyoto, Japan. Vibrant emerald green color with velvety umami taste and no bitterness.',
        price: 1899, discount: 10, colors: ['Sealed Gold Tin'], sizes: ['50g', '100g'],
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Cold-Pressed Extra Virgin Spanish Olive Oil (1 Litre)',
        desc: 'Single-estate early harvest Picual olives cold-extracted within 4 hours. Rich in polyphenols with notes of fresh-cut green grass.',
        price: 1450, discount: 12, colors: ['Dark UV Glass Bottle'], sizes: ['500ml', '1000ml'],
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Artisanal Swiss 85% Dark Chocolate Bar with Sea Salt (Pack of 3)',
        desc: 'Single-origin Criollo cacao beans slow-conched with unrefined cane sugar and fleur de sel flakes from Guerande.',
        price: 899, discount: 10, colors: ['Assorted Foil Pack'], sizes: ['3 x 100g'],
        image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Organic Raw Himalayan Forest Wildflower Honey (500g)',
        desc: 'Unfiltered, unpasteurized raw forest honey naturally harvested from pristine alpine meadows. Contains living bee pollen and enzymes.',
        price: 750, discount: 15, colors: ['Amber Glass Jar'], sizes: ['500g', '1kg'],
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Artisan Bronze-Die Italian Tagliatelle Pasta (500g)',
        desc: '100% durum wheat semolina slow-dried at low temperature for rough texture that holds sauces perfectly.',
        price: 450, discount: 10, colors: ['Natural Wheat'], sizes: ['500g Pack'],
        image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281001?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // ICE CREAMS & FROZEN TREATS
  // -------------------------------------------------------------
  {
    category: 'Ice Creams & Desserts',
    items: [
      {
        name: 'Madagascar Bourbon Vanilla Bean Gelato (500ml Tub)',
        desc: 'Crafted with slow-simmered whole organic milk, double fresh cream, and scraped whole Madagascar bourbon vanilla pods.',
        price: 499, discount: 10, colors: ['Cream Tub'], sizes: ['500ml', '1000ml'],
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Belgian Dark Chocolate Hazelnut Crunch Ice Cream',
        desc: 'Rich 70% Callebaut chocolate folded with roasted Piedmont hazelnut praline ribbons and chocolate fudge brownies.',
        price: 549, discount: 12, colors: ['Dark Gold Tub'], sizes: ['500ml'],
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Alphonso Mango & Passion Fruit Refreshing Sorbet Pint',
        desc: '100% vegan fruit sorbet made exclusively with Ratnagiri Alphonso mango puree and tart wild passion fruit seeds.',
        price: 425, discount: 15, colors: ['Mango Yellow Tub'], sizes: ['450ml'],
        image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Sicilian Roasted Pistachio Cream Gelato (500ml)',
        desc: 'Pure Bronte pistachio paste blended into silky gelato with lightly salted crushed pistachios throughout.',
        price: 599, discount: 8, colors: ['Pistachio Green Tub'], sizes: ['500ml'],
        image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // HOME & KITCHEN APPLIANCES (Air Fryers, Washers, TVs, Mixers, Robot Vacuums)
  // -------------------------------------------------------------
  {
    category: 'Home & Kitchen Appliances',
    items: [
      {
        name: 'Philips Digital Rapid Air Fryer XXL 6.2L',
        desc: 'Rapid CombiAir technology cooks crispy healthy meals with up to 90% less fat. Features 16 preset programs and connected NutriU recipe app.',
        price: 12999, discount: 22, colors: ['Matte Black', 'Stainless Steel'], sizes: ['6.2 Litres'],
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'LG 8kg AI Direct Drive Front Load Washing Machine with Steam',
        desc: 'Smart 6 Motion AI DD inverter motor detects fabric weight and softness to choose optimal wash motions. 99.9% allergy reduction steam cycle.',
        price: 36990, discount: 20, colors: ['Platinum Silver', 'Middle Black'], sizes: ['8 kg Capacity'],
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung 9kg EcoBubble Inverter Smart Front Load Washer',
        desc: 'AI Control personalized washing with Hygiene Steam and Super Speed 39-minute full load wash cycle. Wi-Fi SmartThings monitoring.',
        price: 39490, discount: 18, colors: ['Inox Silver', 'Graphite'], sizes: ['9 kg Capacity'],
        image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Sony Bravia 65-inch 4K OLED HDR Smart Google TV',
        desc: 'Cognitive Processor XR delivers pure OLED blacks and natural high peak brightness with Acoustic Surface Audio+ screen sound.',
        price: 169990, discount: 15, colors: ['Titanium Slate'], sizes: ['55 Inch', '65 Inch', '77 Inch'],
        image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'LG 55-inch OLED evo C3 4K 120Hz Cinema Smart TV',
        desc: 'Brightness Booster self-lit pixels, Dolby Vision IQ, Dolby Atmos, and 4 HDMI 2.1 ports with 0.1ms response time for gaming.',
        price: 114990, discount: 18, colors: ['Dark Meteor Titan'], sizes: ['55 Inch', '65 Inch'],
        image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Preethi Zodiac 750W Heavy Duty Mixer Grinder (5 Jars)',
        desc: 'Vega W5 750W high-torque motor with 3-in-1 InstaFresh juicer and Master Chef food processor jar for dough kneading and chopping.',
        price: 8499, discount: 25, colors: ['Black & Silver'], sizes: ['5 Jars Set'],
        image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Nutribullet Pro 900W High-Speed Nutrient Extractor Blender',
        desc: '900 watts of power pulverizes tough seeds, fruits, and greens into silky smooth nutritious smoothies in under 60 seconds.',
        price: 6999, discount: 20, colors: ['Champagne Gold', 'Matte Black', 'Silver'], sizes: ['900W Set'],
        image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Roborock S8 Pro Ultra LiDAR Robot Vacuum & Mop with Auto Dock',
        desc: '6000Pa extreme suction, VibraRise 2.0 dual sonic mopping, 3D reactive obstacle avoidance, and all-in-one auto-emptying and washing dock.',
        price: 89999, discount: 15, colors: ['Pure White', 'Stealth Black'], sizes: ['All-in-One Station'],
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Ecovacs Deebot T20 Omni Smart Robot Vacuum Cleaner',
        desc: 'Hot-water mop washing station, auto mop lifting on carpets, 6000Pa power, TrueMapping 2.0 multi-floor scanning technology.',
        price: 74999, discount: 20, colors: ['Frost Silver'], sizes: ['Omni Dock Station'],
        image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // MOBILES & FLAGSHIP SMARTPHONES
  // -------------------------------------------------------------
  {
    category: 'Mobiles & Tablets',
    items: [
      {
        name: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
        desc: 'Grade 5 Titanium design with A18 Pro chip, 48MP Fusion camera with 5x telephoto optical zoom, and 33-hour battery life.',
        price: 144900, discount: 5, colors: ['Desert Titanium', 'Natural Titanium', 'Black Titanium', 'White Titanium'], sizes: ['256GB', '512GB', '1TB'],
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Samsung Galaxy S24 Ultra 5G AI Smartphone (12GB RAM, 512GB)',
        desc: 'Snapdragon 8 Gen 3 with Galaxy AI Live Translate and Circle to Search. 200MP camera and integrated S-Pen in titanium frame.',
        price: 129999, discount: 10, colors: ['Titanium Gray', 'Titanium Violet', 'Titanium Black'], sizes: ['256GB', '512GB'],
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Google Pixel 9 Pro 5G with Tensor G4 Chip',
        desc: 'Google AI powerhouse with Super Res Zoom up to 30x, Gemini Live multimodal assistant, and ultra-bright Super Actua OLED display.',
        price: 109999, discount: 8, colors: ['Obsidian', 'Porcelain', 'Hazel', 'Rose Quartz'], sizes: ['128GB', '256GB'],
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'OnePlus 12 5G (16GB RAM, 512GB Storage) Flowy Emerald',
        desc: '4th Gen Hasselblad camera with Sony LYT-808 sensor, 5400mAh battery with 100W SUPERVOOC charging, and 2K 120Hz ProXDR display.',
        price: 69999, discount: 12, colors: ['Flowy Emerald', 'Silky Black'], sizes: ['256GB', '512GB'],
        image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // IPODS, AUDIO PLAYERS & AI ASSISTANT SOUNDBARS
  // -------------------------------------------------------------
  {
    category: 'Audio Players & Smart Sound',
    items: [
      {
        name: 'Apple iPod Touch 256GB Space Gray (Special Collector Edition)',
        desc: 'A10 Fusion chip with 4-inch Retina display, Apple Lossless audio playback support, and 3.5mm headphone jack with Lightning port.',
        price: 28999, discount: 10, colors: ['Space Gray', 'Silver', 'PRODUCT(RED)'], sizes: ['128GB', '256GB'],
        image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'FiiO M11 Plus Android High-Res Lossless Audio Player',
        desc: 'Dual ES9068AS DAC chips with THX AAA-78 amplification, DSD256 decoding, 2.5mm / 3.5mm / 4.4mm balanced audio outputs.',
        price: 49990, discount: 12, colors: ['Aluminium Alloy Black'], sizes: ['64GB + MicroSD Slot'],
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Bose Smart Ultra Soundbar with Dolby Atmos & Alexa Voice',
        desc: 'Custom engineered upfiring dipole transducers with TrueSpace spatial processing and A.I. Dialogue Mode for crisp speech.',
        price: 89900, discount: 10, colors: ['Triple Black', 'Arctic White'], sizes: ['Single Soundbar Bar'],
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Amazon Echo Show 10 Smart Display & Speaker with Motion Screen',
        desc: '10.1-inch HD smart screen automatically moves with you during video calls and recipes. Premium directional stereo audio.',
        price: 24999, discount: 15, colors: ['Charcoal', 'Glacier White'], sizes: ['10.1 Inch Display'],
        image: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Apple HomePod 2nd Generation Spatial Audio Smart Speaker',
        desc: 'High-excursion woofer and 5 beamforming tweeters with Room Sensing technology and Siri home automation integration.',
        price: 32900, discount: 5, colors: ['Midnight', 'White'], sizes: ['Standard'],
        image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // BAGS & LUGGAGE
  // -------------------------------------------------------------
  {
    category: 'Bags & Luggage',
    items: [
      {
        name: 'Samsonite Hard-Shell 360 Expandable Trolley Suitcase (75cm)',
        desc: 'Lightweight polypropylene shell with TSA combination lock, dual spinner wheels, and scratch-resistant matte diamond texture.',
        price: 11499, discount: 30, colors: ['Midnight Navy', 'Metallic Silver', 'Ruby Red'], sizes: ['55cm Cabin', '68cm Medium', '75cm Large'],
        image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Nomatic Anti-Theft Waterproof Travel Laptop Backpack 30L',
        desc: 'Water-resistant tarpaulin material with magnetic water bottle pockets, TSA checkpoint-friendly 16-inch laptop compartment, and RFID blocking.',
        price: 8999, discount: 20, colors: ['Stealth Black'], sizes: ['20L', '30L Expandable'],
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1546938576-6e6a64f317cc?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Handcrafted Full-Grain Leather Weekend Duffle Bag',
        desc: 'Supple full-grain cowhide leather with heavy-duty YKK antique brass zippers, reinforced handles, and detachable padded shoulder strap.',
        price: 6499, discount: 15, colors: ['Vintage Cognac', 'Dark Chocolate Brown', 'Matte Black'], sizes: ['45 Litres'],
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Herschel Little America Classic Mountaineering Backpack',
        desc: 'Timeless silhouette featuring magnetic strap closures with metal pin clips, padded fleece-lined 15-inch laptop sleeve, and air mesh back.',
        price: 5299, discount: 18, colors: ['Forest Green / Tan', 'Raven Crosshatch', 'Navy'], sizes: ['25 Litres'],
        image: 'https://images.unsplash.com/photo-1546938576-6e6a64f317cc?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // SPORTS, CRICKET BATS, BASEBALL BATS & EQUIPMENT
  // -------------------------------------------------------------
  {
    category: 'Sports & Equipment',
    items: [
      {
        name: 'SS Ton Player Edition Grade 1 English Willow Cricket Bat',
        desc: 'Masterfully hand-crafted from top 1% Grade 1 English willow with 9-12 straight grains, massive 40mm thick edges, and dynamic balance.',
        price: 24999, discount: 15, colors: ['Natural Willow & White Grip', 'Black & Gold Grip'], sizes: ['Short Handle (SH)', 'Long Handle (LH)'],
        image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Gray-Nicolls Legend Professional English Willow Cricket Bat',
        desc: 'Laser-tested sweet spot profile with Powercurve face for enhanced ball rebound and ultra-light feather pickup.',
        price: 29999, discount: 10, colors: ['Heritage Maroon / Cream'], sizes: ['Short Handle (SH)'],
        image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Louisville Slugger Prime Maple Hardwood Baseball Bat (33-inch)',
        desc: 'Seamless MLB-grade rock maple timber with EXOPRO hard topcoat providing exceptional pop and acoustic cracking sound on contact.',
        price: 12499, discount: 12, colors: ['Natural Flame Birch', 'Matte Black / Gold'], sizes: ['32 Inch', '33 Inch', '34 Inch'],
        image: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Wilson Pro Staff 97 v14 Precision Carbon Tennis Racket',
        desc: 'Braid 45 construction with Paradigm Bending carbon tech engineered for unparalleled precision, control, and court feel.',
        price: 18999, discount: 15, colors: ['Bronze / Desert Gold'], sizes: ['Grip 2 (4 1/4")', 'Grip 3 (4 3/8")'],
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80']
      }
    ]
  },

  // -------------------------------------------------------------
  // VEHICLES & ELECTRIC MOBILITY
  // -------------------------------------------------------------
  {
    category: 'Vehicles & Mobility',
    items: [
      {
        name: 'Segway Ninebot Max G2 Smart Long-Range Electric Kick Scooter',
        desc: '1000W peak rear-wheel motor with 70km max range, front & rear hydraulic suspension, self-healing 10-inch tubeless tires, and Apple Find My.',
        price: 64999, discount: 15, colors: ['Dark Slate Gray'], sizes: ['Standard Foldable'],
        image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Trek Marlin 7 Gen 3 Hydraulic Mountain Bicycle (29-inch)',
        desc: 'Lightweight Alpha Silver Aluminium frame with RockShox Judy fork 100mm travel and Shimano Deore 1x10 wide-range drivetrain.',
        price: 52990, discount: 10, colors: ['Matte Dnister Black', 'Teal Azure', 'Crimson Red'], sizes: ['Medium (17.5")', 'Large (19.5")'],
        image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Ola S1 Pro Gen 2 High-Performance Smart Electric Scooter',
        desc: '11kW peak motor power with 195km certified IDC range, top speed of 120 km/h, touchscreen navigation with MoveOS 4 and cruise control.',
        price: 134999, discount: 8, colors: ['Jet Black', 'Matt White', 'Stellar Blue', 'Midnight Red'], sizes: ['4 kWh Battery Pack'],
        image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80']
      },
      {
        name: 'Specialized Sirrus X 3.0 All-Road Hybrid Urban Bicycle',
        desc: 'A1 Premium aluminium frame with internal cable routing, Pathfinder Sport 38c gravel tires, and Tektro hydraulic disc brakes.',
        price: 46990, discount: 12, colors: ['Cast Black', 'Gloss Sand'], sizes: ['M (54cm)', 'L (56cm)'],
        image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80']
      }
    ]
  }
];

// =========================================================================
// 2. SPECIFIC IMAGE REPLACEMENTS FOR EXISTING MISMATCHED / DUPLICATE PRODUCTS
// =========================================================================
const SPECIFIC_FIXES = [
  // MacBooks: Fix fruit apple image -> True Apple MacBook laptop photo
  {
    match: /MacBook/i,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80'
    ]
  },
  // Sony HT-A7000 Soundbar: Replace standalone small bookshelf speaker -> True Soundbar / Home Cinema
  {
    match: /Sony HT-A7000/i,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80']
  },
  // Sonos Era 300: High quality smart spatial speaker
  {
    match: /Sonos Era 300/i,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80']
  },
  // Samsung Galaxy Buds3 Pro: Distinct sleek metallic wireless earbuds photo
  {
    match: /Galaxy Buds/i,
    image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80']
  },
  // Sony WF-1000XM5: Distinct true Sony wireless earbuds
  {
    match: /WF-1000XM5/i,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80']
  },
  // Vinayaka / Ganesha idol: Pure authentic Brass Ganesha idol
  {
    match: /(Vinayaka|Ganesh)/i,
    image: 'https://images.unsplash.com/photo-1567591974584-f1832b45717a?w=800&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=800&auto=format&fit=crop&q=80']
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
  '1 Year Brand Warranty',
  '2 Years Comprehensive Manufacturer Warranty',
  '6 Months Limited Warranty',
  '3 Years Brand Warranty with Onsite Support',
  'Lifetime Replacement on Manufacturing Defects'
];

async function runMasterSeedAndFix() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // -------------------------------------------------------------
    // STEP 1: FIX EXISTING PRODUCTS WITH DUPLICATE / UNRELATED IMAGES
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Fixing existing mismatched / duplicate images in database ---');
    for (const fix of SPECIFIC_FIXES) {
      const result = await Product.updateMany(
        { name: fix.match },
        { $set: { image: fix.image, images: fix.images } }
      );
      console.log(`Fixed images for products matching ${fix.match}: ${result.modifiedCount} modified.`);
    }

    // -------------------------------------------------------------
    // STEP 2: SEED 1500 NEW PRODUCTS ACROSS THE REQUESTED CATEGORIES
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Provisioning 1500 new diverse products ---');
    const vendors = await User.find({ role: 'vendor' }).select('_id username email');
    if (vendors.length === 0) {
      console.error('No vendors found.');
      process.exit(1);
    }

    const priorityVendor = vendors.find(v => String(v._id) === '6aa1acc9bb5a7aeb3ecac734') || vendors[0];
    console.log(`Using ${vendors.length} vendors (Priority: ${priorityVendor.username || priorityVendor.email})`);

    const TARGET_NEW_PRODUCTS = 1500;
    const productsToInsert = [];
    const historyToInsert = [];

    // Flatten all category templates
    const allTemplates = [];
    RICH_CATALOG.forEach(group => {
      group.items.forEach(item => {
        allTemplates.push({ category: group.category, ...item });
      });
    });

    console.log(`Total rich template definitions: ${allTemplates.length}`);

    const brandPrefixes = [
      'Signature', 'Classic', 'Pro Edition', 'Apex', 'Elite', 'Heritage',
      'Nordic', 'Prestige', 'Ultra', 'Imperial', 'Master', 'Studio', 'Voyager',
      'Quantum', 'Zenith', 'Crux', 'Vanguard', 'Aurora', 'Titan', 'Aero'
    ];

    for (let i = 0; i < TARGET_NEW_PRODUCTS; i++) {
      const template = allTemplates[i % allTemplates.length];
      const prefix = brandPrefixes[(i + Math.floor(i / allTemplates.length)) % brandPrefixes.length];
      const serialNum = 100 + i;

      // Assign vendor (35% to priority vendor, rest distributed)
      const assignedVendor = (i % 3 === 0) ? priorityVendor : vendors[i % vendors.length];

      // Stock variation (some low stock for realism)
      let quantity;
      const randType = Math.random();
      if (randType < 0.04) {
        quantity = 0; // Out of stock
      } else if (randType < 0.16) {
        quantity = Math.floor(Math.random() * 9) + 1; // Low stock: 1 to 9
      } else {
        quantity = Math.floor(Math.random() * 85) + 15; // Healthy: 15 to 100
      }

      // Price & discount variation
      const priceVariation = 0.85 + (Math.random() * 0.3);
      const finalPrice = Math.round(template.price * priceVariation);
      const discount = Math.min(50, Math.max(5, Math.round(template.discount + (Math.random() * 8 - 4))));
      const rating = Number((4.1 + Math.random() * 0.85).toFixed(1));
      const ratingCount = Math.floor(Math.random() * 250) + 15;

      const productName = `${template.name} - ${prefix} (v${serialNum})`;
      const newId = new mongoose.Types.ObjectId();

      const productDoc = {
        _id: newId,
        name: productName,
        category: template.category,
        description: `${template.desc} Meticulously crafted for superior performance, uncompromising quality, and long-lasting durability. 100% genuine product with official warranty.`,
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
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 45 * 24 * 60 * 60 * 1000)),
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
        referenceId: `INIT-${String(newId).slice(-6).toUpperCase()}`,
        reason: 'Initial catalog inventory provisioning',
        actor: 'Vendor',
        metadata: { category: template.category, initialStock: quantity },
        createdAt: productDoc.createdAt
      });
    }

    console.log(`Inserting ${productsToInsert.length} new rich products in batches...`);
    const BATCH_SIZE = 300;
    for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
      const prodBatch = productsToInsert.slice(i, i + BATCH_SIZE);
      const histBatch = historyToInsert.slice(i, i + BATCH_SIZE);
      await Product.insertMany(prodBatch);
      await InventoryHistory.insertMany(histBatch);
      console.log(` - Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${prodBatch.length} products)...`);
    }

    const totalInDb = await Product.countDocuments({ isDeleted: false });
    console.log(`\n✅ Finished successfully! Total active products in database now: ${totalInDb}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during master seed and fix:', err);
    process.exit(1);
  }
}

runMasterSeedAndFix();

