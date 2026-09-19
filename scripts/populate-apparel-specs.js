const mongoose = require('mongoose');

const COLOR_MAP = {
  white: '#ffffff',
  black: '#1e293b',
  blue: '#2563eb',
  navy: '#1e3a8a',
  indigo: '#312e81',
  grey: '#64748b',
  gray: '#64748b',
  charcoal: '#334155',
  red: '#dc2626',
  green: '#16a34a',
  olive: '#556b2f',
  yellow: '#eab308',
  camel: '#c19a6b',
  brown: '#8b5a2b',
  pink: '#ec4899',
  purple: '#9333ea',
  orange: '#ea580c',
  beige: '#d4b996',
  cream: '#fef3c7',
  gold: '#d97706',
  silver: '#94a3b8'
};

function detectGender(name) {
  const n = name.toLowerCase();
  if (/\b(women|woman|women's|female|girl|ladies|saree|kurti|maxi dress|bangles|heels)\b/.test(n)) {
    return 'Women';
  }
  if (/\b(men|man|men's|male|boy|gents)\b/.test(n)) {
    return 'Men';
  }
  return 'Unisex';
}

function detectClothingType(name, category) {
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();

  if (/\b(saree|dress|maxi|gown|lehenga|anarkali|salwar|kurti)\b/.test(n)) {
    return 'dress';
  }
  if (/\b(shirt|t-shirt|tee|polo|hoodie|sweatshirt|jacket|blazer|kurta|sweater|cardigan|vest|coat|top)\b/.test(n)) {
    return 'top';
  }
  if (/\b(pant|pants|jean|jeans|denim|trouser|trousers|chinos|jogger|joggers|cargo|cargos|shorts|skirt|trackpant|trackpants|leggings|pyjama)\b/.test(n)) {
    return 'bottom';
  }
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|loafer|loafers|sandal|sandals|heels|clog|clogs|flats|slippers|slide|slides|footwear)\b/.test(n) || c.includes('shoe') || c.includes('footwear')) {
    return 'footwear';
  }
  if (/\b(bag|backpack|messenger|tote|handbag|luggage|suitcase)\b/.test(n) || c.includes('bag')) {
    return 'bag';
  }
  if (/\b(watch|sunglasses|glasses|belt|wallet|tie|cap|hat|bangle|bangles|jewel|necklace)\b/.test(n)) {
    return 'accessory';
  }
  return 'top'; // Default fallback
}

function detectColor(name, type) {
  const n = name.toLowerCase();
  for (const [colorWord, hex] of Object.entries(COLOR_MAP)) {
    if (n.includes(colorWord)) {
      return hex;
    }
  }
  // Default stylish palette based on type
  if (type === 'top') return '#3b82f6';
  if (type === 'bottom') return '#1e293b';
  if (type === 'footwear') return '#ffffff';
  if (type === 'dress') return '#db2777';
  if (type === 'bag') return '#78350f';
  return '#475569';
}

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  const Product = require('../models/product.model');

  const products = await Product.find({
    $or: [
      { category: { $in: ['Fashion', 'Fashion & Apparel', 'Footwear & Shoes', 'shoes', 'Bags & Luggage', 'Wearables'] } },
      { name: /shirt|pant|jean|shoe|sneaker|dress|hoodie|jacket|t-shirt|trouser|boot|sandals/i }
    ]
  });

  console.log(`Found ${products.length} products to classify for 3D Avatar virtual dressing...`);

  let updatedCount = 0;
  for (const p of products) {
    const gender = detectGender(p.name);
    const clothingType = detectClothingType(p.name, p.category);
    const primaryColor = detectColor(p.name, clothingType);

    p.gender = gender;
    p.clothingType = clothingType;
    if (!p.colors || p.colors.length === 0) {
      p.colors = [primaryColor];
    }
    await p.save();
    updatedCount++;
  }

  console.log(`Successfully classified and updated ${updatedCount} apparel products in MongoDB!`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

