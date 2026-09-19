const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory-app';

// Helpers to generate realistic specifications based on category & name
function getSpecsForPhone(name, price = 20000) {
  const isApple = /iphone|apple/i.test(name);
  const isSamsung = /samsung|galaxy/i.test(name);
  const isFlagship = price > 40000;

  return {
    'General': {
      'Brand': isApple ? 'Apple' : isSamsung ? 'Samsung' : 'OnePlus',
      'Model Name': name,
      'SIM Type': 'Dual SIM (nano + eSIM)',
      'Touchscreen': 'Yes, Capacitive Multi-touch',
      'Quick Charging': 'Yes, Fast Charging Supported'
    },
    'Processor': {
      'Processor Core': 'Octa Core',
      'Primary Clock Speed': isApple ? '3.46 GHz' : isFlagship ? '3.2 GHz' : '2.8 GHz',
      'Processor Brand': isApple ? 'Apple A16 Bionic / A17 Pro' : isFlagship ? 'Qualcomm Snapdragon 8 Gen 2' : 'MediaTek Dimensity 7050',
      'Operating System': isApple ? 'iOS 17' : 'Android 14'
    },
    'Display': {
      'Display Size': isFlagship ? '6.7 inch' : '6.1 inch',
      'Resolution': '2796 x 1290 Pixels (FHD+)',
      'Resolution Type': isApple ? 'Super Retina XDR OLED' : 'Dynamic AMOLED 2X',
      'Refresh Rate': isFlagship ? '120 Hz ProMotion' : '90 Hz',
      'Other Display Features': 'HDR10+, 1000 nits (typ), 2000 nits (peak), Ceramic Shield'
    },
    'Camera': {
      'Primary Camera': isFlagship ? '48MP + 12MP + 12MP Triple Camera' : '50MP + 8MP Dual Camera',
      'Optical Zoom': isFlagship ? '3x - 5x Optical Zoom' : '2x In-sensor Zoom',
      'Secondary Camera': '12MP TrueDepth Front Camera',
      'Video Recording': '4K at 24 fps, 25 fps, 30 fps, or 60 fps with Dolby Vision HDR',
      'Camera Features': 'Photonic Engine, Deep Fusion, Smart HDR 5, Night mode portrait'
    },
    'Battery & Charging': {
      'Battery Capacity': isApple ? '3349 mAh' : '5000 mAh',
      'Charging Speed': isApple ? '20W Fast Charging (50% in 30 mins)' : '67W Turbo Charge',
      'Wireless Charging': 'Yes, 15W Qi / MagSafe Wireless Charging'
    },
    'Connectivity': {
      'Network Type': '5G, 4G VOLTE, 4G, 3G, 2G',
      'Supported Networks': '5G Sub-6 GHz, Gigabit LTE',
      'Bluetooth Version': 'v5.3',
      'Wi-Fi': 'Wi-Fi 6 (802.11ax) with 2x2 MIMO',
      'NFC': 'Yes with reader mode',
      'Audio Jack': 'Type-C'
    },
    'In The Box & Warranty': {
      'In The Box': 'Handset, USB-C to USB-C Cable, Documentation, SIM Eject Tool',
      'Warranty Summary': '1 Year Manufacturer Warranty for Device and 6 Months for In-Box Accessories'
    }
  };
}

function getSpecsForLaptop(name, price = 50000) {
  const isMac = /macbook|apple/i.test(name);
  const isGaming = /gaming|rtx|nitro|tuf|legion/i.test(name);

  return {
    'General': {
      'Brand': isMac ? 'Apple' : /hp/i.test(name) ? 'HP' : /dell/i.test(name) ? 'Dell' : 'Lenovo',
      'Model Name': name,
      'Series': isMac ? 'MacBook Air / Pro' : isGaming ? 'Gaming Series' : 'Slim & Light Series',
      'Color': 'Space Grey / Shadow Black',
      'Weight': isMac ? '1.24 kg' : '1.85 kg'
    },
    'Processor': {
      'Processor Brand': isMac ? 'Apple' : /ryzen/i.test(name) ? 'AMD' : 'Intel',
      'Processor Name': isMac ? 'Apple M2 Chip' : isGaming ? 'Intel Core i7 13th Gen' : 'Intel Core i5 12th Gen',
      'Clock Speed': 'Up to 4.7 GHz Turbo Boost',
      'Number of Cores': isMac ? '8-Core CPU' : '10 Cores (6P + 4E)',
      'Operating System': isMac ? 'macOS Sonoma' : 'Windows 11 Home 64-bit'
    },
    'Memory & Storage': {
      'RAM': price > 70000 ? '16 GB DDR5' : '8 GB DDR5',
      'Storage Capacity': price > 80000 ? '1 TB PCIe NVMe M.2 SSD' : '512 GB PCIe NVMe M.2 SSD',
      'RAM Speed': '4800 MHz / 5200 MHz'
    },
    'Display': {
      'Screen Size': '15.6 inch (39.62 cm)',
      'Resolution': '1920 x 1080 Pixels (Full HD)',
      'Screen Type': 'IPS Anti-Glare Micro-Edge Display',
      'Refresh Rate': isGaming ? '144 Hz' : '60 Hz',
      'Brightness': '300 nits, 100% sRGB'
    },
    'Graphics': {
      'Dedicated Graphics': isGaming ? 'NVIDIA GeForce RTX 4060 (8GB GDDR6)' : 'Intel Iris Xe Graphics / Integrated'
    },
    'Connectivity & Ports': {
      'USB Ports': '2x USB 3.2 Gen 1 Type-A, 1x USB Type-C (Thunderbolt 4)',
      'HDMI Port': '1x HDMI 2.1',
      'Wireless': 'Wi-Fi 6E (802.11ax) + Bluetooth v5.3',
      'Headphone Jack': '3.5 mm Combo Audio Jack'
    },
    'Battery & Power': {
      'Battery Backup': 'Up to 10 Hours Normal Usage',
      'Power Adapter': '65W / 100W Type-C Fast Charger'
    },
    'In The Box & Warranty': {
      'In The Box': 'Laptop, Power Adapter, Power Cable, User Manual',
      'Warranty': '1 Year Onsite Manufacturer Warranty'
    }
  };
}

function getSpecsForTV(name, price = 35000) {
  return {
    'General': {
      'Brand': /samsung/i.test(name) ? 'Samsung' : /sony/i.test(name) ? 'Sony' : /lg/i.test(name) ? 'LG' : 'Xiaomi',
      'Model Name': name,
      'Launch Year': '2024',
      'Color': 'Carbon Black'
    },
    'Display': {
      'Screen Size': /65/i.test(name) ? '65 inch' : /43/i.test(name) ? '43 inch' : '55 inch',
      'Resolution': 'Ultra HD (4K) 3840 x 2160 Pixels',
      'Panel Type': 'Crystal UHD / Quantum Dot LED Panel',
      'Refresh Rate': '60 Hz (up to 120 Hz Motion Rate)',
      'HDR Support': 'HDR10, HDR10+, HLG'
    },
    'Smart TV Features': {
      'Smart TV': 'Yes',
      'Operating System': 'Google TV / Tizen OS',
      'Supported Apps': 'Netflix, Amazon Prime Video, Disney+ Hotstar, YouTube, Zee5',
      'Voice Assistant': 'Google Assistant & Alexa Built-in',
      'Screen Mirroring': 'Yes (Chromecast & Apple AirPlay 2)'
    },
    'Audio': {
      'Speaker Output': '20 W - 30 W Powerful Stereo Speakers',
      'Sound Technology': 'Dolby Audio, Dolby Atmos, DTS Virtual:X',
      'Speaker Type': '2 Channel Down-Firing Speakers'
    },
    'Connectivity': {
      'HDMI Ports': '3 HDMI Ports (1 with eARC support)',
      'USB Ports': '2 USB Ports (Type-A)',
      'Wi-Fi': 'Built-in Wi-Fi (2.4 GHz / 5 GHz Dual Band)',
      'Bluetooth': 'Yes, Bluetooth v5.0',
      'Optical Digital Audio Output': '1'
    },
    'In The Box & Warranty': {
      'In The Box': '1 LED TV, 1 Smart Remote, 2 AAA Batteries, 1 Wall Mount Kit, 1 Table Stand, 1 User Manual',
      'Warranty Summary': '1 Year Comprehensive Warranty on Product + 1 Year Additional on Panel'
    }
  };
}

function getSpecsForAudio(name, price = 5000) {
  return {
    'General': {
      'Brand': /sony/i.test(name) ? 'Sony' : /boat/i.test(name) ? 'boAt' : /jbl/i.test(name) ? 'JBL' : 'Bose',
      'Model Name': name,
      'Headphone Type': /earbud|airpod|tws/i.test(name) ? 'True Wireless Stereo (TWS)' : 'Over-Ear Wireless Headphones',
      'Color': 'Matte Black / Platinum Silver'
    },
    'Audio Features': {
      'Driver Size': '40 mm Dynamic Driver / 11 mm Bass Drivers',
      'Frequency Response': '20 Hz - 20,000 Hz',
      'Active Noise Cancellation': 'Yes, Hybrid Active Noise Cancellation (up to 35 dB)',
      'Transparency Mode': 'Ambient Sound Awareness Mode',
      'Microphone': 'Quad Mics with AI Environmental Noise Reduction'
    },
    'Battery & Charging': {
      'Battery Life': 'Up to 36 Hours Total Playback',
      'Quick Charging': '10 Minutes Charge = 5 Hours Playback',
      'Charging Port': 'Type-C Fast Charging'
    },
    'Connectivity': {
      'Bluetooth Version': 'v5.3',
      'Wireless Range': '10 meters (33 feet)',
      'Dual Pairing': 'Yes, Multipoint Connection (Connect 2 devices simultaneously)',
      'Latency': 'Ultra-low 45ms Gaming Latency'
    },
    'In The Box & Warranty': {
      'In The Box': 'Headphones / Earbuds, Charging Case, USB-C Cable, Extra Ear Tips, User Guide',
      'Warranty': '1 Year Manufacturer Replacement Warranty'
    }
  };
}

function getSpecsForWearable(name) {
  return {
    'General': {
      'Brand': /apple/i.test(name) ? 'Apple' : /samsung/i.test(name) ? 'Samsung' : 'Noise / Fire-Boltt',
      'Model Name': name,
      'Dial Shape': 'Round / Curved Rectangle',
      'Strap Material': 'Liquid Silicone / Stainless Steel Mesh'
    },
    'Display': {
      'Display Size': '1.43 inch (3.63 cm)',
      'Display Type': 'AMOLED Always-On Display',
      'Resolution': '466 x 466 Pixels, 326 PPI',
      'Brightness': '1000 nits Peak Brightness'
    },
    'Fitness & Health Tracking': {
      'Heart Rate Monitor': '24/7 Optical Heart Rate Sensor',
      'SpO2 Monitor': 'Blood Oxygen Saturation Level Monitor',
      'Sleep Monitor': 'REM, Deep Sleep, and Nap Tracking',
      'Sports Modes': '110+ Workout and Athletic Modes'
    },
    'Connectivity & Battery': {
      'Bluetooth Calling': 'Yes, High-fidelity Speaker & Mic for direct calls',
      'Battery Life': 'Up to 7 Days Normal Use, 2 Days with AOD',
      'Water Resistance': 'IP68 & 5 ATM Water Resistant (Swim proof)'
    },
    'In The Box & Warranty': {
      'In The Box': 'Smartwatch, Magnetic Charging Cable, User Manual, Warranty Card',
      'Warranty': '1 Year Manufacturer Brand Warranty'
    }
  };
}

function getSpecsForAppliance(name) {
  return {
    'General': {
      'Product Name': name,
      'Body Material': 'Stainless Steel & Impact-Resistant ABS Food Grade',
      'Color': 'Brushed Metallic / Classic Black'
    },
    'Power & Performance': {
      'Power Consumption': '750 W - 1200 W Heavy Duty Motor',
      'Operating Voltage': '220 - 240 V, 50 Hz',
      'Energy Efficiency': '5 Star BEE Rating Inverter Technology',
      'Speed Settings': '3 Speed Control with Pulse Function'
    },
    'Safety & Build': {
      'Overload Protection': 'Automatic Thermal Cut-off Switch',
      'Locking Mechanism': 'Dual Safety Interlock Lid',
      'Blades': '304 Grade Hardened Stainless Steel Blades'
    },
    'In The Box & Warranty': {
      'In The Box': 'Main Unit, 3 Multipurpose Jars, Spatula, User Manual, Warranty Card',
      'Warranty': '2 Years Comprehensive Product Warranty + 5 Years Motor Warranty'
    }
  };
}

async function populateAllTechSpecs() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB at', MONGO_URI);

  const db = mongoose.connection.db;
  const productsCollection = db.collection('products');

  const cursor = productsCollection.find({
    isDeleted: { $ne: true }
  });

  let updatedCount = 0;
  let skippedCount = 0;

  while (await cursor.hasNext()) {
    const p = await cursor.next();
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();

    let specs = null;

    if (cat.includes('mobile') || cat.includes('smartphone') || name.includes('phone') || name.includes('iphone') || name.includes('galaxy')) {
      specs = getSpecsForPhone(p.name, p.price);
    } else if (cat.includes('laptop') || name.includes('laptop') || name.includes('macbook') || name.includes('notebook')) {
      specs = getSpecsForLaptop(p.name, p.price);
    } else if (cat.includes('tv') || name.includes('tv') || name.includes('television') || name.includes('led') || name.includes('oled')) {
      specs = getSpecsForTV(p.name, p.price);
    } else if (cat.includes('audio') || cat.includes('sound') || name.includes('headphone') || name.includes('earphone') || name.includes('earbud') || name.includes('speaker') || name.includes('tws')) {
      specs = getSpecsForAudio(p.name, p.price);
    } else if (cat.includes('wearable') || name.includes('watch') || name.includes('smartwatch') || name.includes('band')) {
      specs = getSpecsForWearable(p.name);
    } else if (cat.includes('appliance') || cat.includes('kitchen') || name.includes('mixer') || name.includes('grinder') || name.includes('oven') || name.includes('fridge') || name.includes('refrigerator') || name.includes('washing machine')) {
      specs = getSpecsForAppliance(p.name);
    } else if (cat.includes('electronics') || cat.includes('camera') || cat.includes('gaming')) {
      // General electronics fallback
      if (name.includes('camera') || cat.includes('camera')) {
        specs = {
          'General': { 'Brand': 'Sony / Canon', 'Type': 'Digital Mirrorless Camera', 'Mount': 'E-Mount' },
          'Sensor & Image': { 'Effective Pixels': '24.2 Megapixels', 'Sensor Type': 'Full-Frame Exmor R CMOS', 'ISO': '100 - 51200' },
          'Video': { 'Recording': '4K UHD at 60 fps', 'Format': 'XAVC S, AVCHD' },
          'Warranty': { 'Warranty Summary': '2 Years Official Brand Warranty' }
        };
      } else {
        specs = {
          'General': { 'Product': p.name, 'Category': p.category },
          'Power & Performance': { 'Voltage': '220 - 240 V', 'Frequency': '50 Hz' },
          'Connectivity': { 'Wireless': 'Supported', 'Ports': 'High-Speed USB' },
          'Warranty': { 'Warranty Summary': '1 Year Manufacturer Warranty' }
        };
      }
    }

    if (specs) {
      await productsCollection.updateOne(
        { _id: p._id },
        {
          $set: {
            specifications: specs,
            warrantyMonths: p.warrantyMonths || 12,
            updatedAt: new Date()
          }
        }
      );
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n==============================================`);
  console.log(`✅ SPECIFICATIONS POPULATION COMPLETE!`);
  console.log(`Updated with rich technical specifications: ${updatedCount} products`);
  console.log(`Cleanly skipped non-tech (groceries, food, apparel): ${skippedCount} products`);
  console.log(`==============================================\n`);

  process.exit(0);
}

populateAllTechSpecs().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

