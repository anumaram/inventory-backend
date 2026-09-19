const mongoose = require('mongoose');
const Product = require('../models/product.model');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
    console.log('MongoDB Connected for Avatar Tagging');

    const products = await Product.find({ isDeleted: { $ne: true } });
    console.log(`Analyzing ${products.length} catalog products...`);

    let taggedCount = 0;

    for (const p of products) {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();

      let templateId = '';
      let clothingType = '';
      let subType = '';
      let genderArr = ['unisex'];
      let color = '#2563eb';

      // Detect gender
      if (/women|female|lady|girl|saree|lehenga|skirt|dress/.test(name) || /women/.test(cat)) {
        genderArr = ['female'];
      } else if (/men|male|boy|suit|blazer/.test(name) || /men/.test(cat)) {
        genderArr = ['male', 'unisex'];
      }

      // Detect clothing category & template
      if (/hoodie|sweatshirt|pullover/.test(name)) {
        templateId = 'tpl_hoodie';
        clothingType = 'top';
        subType = 'hoodie';
        color = '#475569';
      } else if (/t-shirt|tee|round neck|crewneck/.test(name)) {
        templateId = 'tpl_tshirt';
        clothingType = 'top';
        subType = 'tshirt';
        color = '#2563eb';
      } else if (/shirt|oxford|formal shirt|casual shirt/.test(name)) {
        templateId = 'tpl_shirt';
        clothingType = 'top';
        subType = 'shirt';
        color = '#3b82f6';
      } else if (/jacket|bomber|coat|blazer|outerwear|windbreaker/.test(name)) {
        templateId = 'tpl_jacket';
        clothingType = 'outerwear';
        subType = 'jacket';
        color = '#1e293b';
      } else if (/jean|denim/.test(name)) {
        templateId = 'tpl_jeans';
        clothingType = 'bottom';
        subType = 'jeans';
        color = '#1e3a8a';
      } else if (/pant|trouser|chino|cargo|jogger/.test(name)) {
        templateId = 'tpl_pants';
        clothingType = 'bottom';
        subType = 'pants';
        color = '#334155';
      } else if (/dress|gown|frock|maxi/.test(name)) {
        templateId = 'tpl_dress';
        clothingType = 'dress';
        subType = 'dress';
        color = '#ec4899';
        genderArr = ['female'];
      } else if (/shoe|sneaker|running|walking|clog|loafers|boot/.test(name) || /footwear/.test(cat)) {
        templateId = /boot/.test(name) ? 'tpl_shoes_boots' : 'tpl_shoes_sneakers';
        clothingType = 'shoes';
        subType = 'sneakers';
        color = '#ffffff';
      } else if (/sunglass|spectacle|eyewear|glasses/.test(name)) {
        templateId = 'tpl_accessory_glasses';
        clothingType = 'accessories';
        subType = 'sunglasses';
        color = '#0f172a';
      } else if (/cap|hat|beanie/.test(name)) {
        templateId = 'tpl_accessory_cap';
        clothingType = 'accessories';
        subType = 'cap';
        color = '#2563eb';
      }

      if (templateId) {
        p.avatarCompatible = true;
        p.avatarTemplateId = templateId;
        p.clothingType = clothingType;
        p.subType = subType;
        p.gender = genderArr;
        p.avatarColor = p.colors && p.colors[0] && p.colors[0] !== 'N/A' ? p.colors[0] : color;
        p.avatarTexture = p.image || (p.images && p.images[0]) || '';
        await p.save();
        taggedCount++;
      }
    }

    console.log(`Successfully tagged ${taggedCount} products with 3D Avatar templates!`);
    process.exit(0);
  } catch (err) {
    console.error('Error tagging products:', err);
    process.exit(1);
  }
}

run();

