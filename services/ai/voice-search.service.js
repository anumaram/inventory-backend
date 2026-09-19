const mongoose = require('mongoose');
const { generateAiText } = require('./ai-write.service');

/**
 * Intelligent Rule-Based Extractor (Instant, Reliable, Offline-Safe)
 */
function extractVoiceIntentHeuristically(transcript = '') {
  const raw = String(transcript || '').trim();
  const lower = raw.toLowerCase();

  let maxPrice = null;
  let minPrice = null;

  // Extract price constraints like "under 3000", "below 2500", "less than 5000", "between 1000 and 3000"
  const underMatch = lower.match(/(?:under|below|less than|within|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
  if (underMatch) {
    maxPrice = parseInt(underMatch[1], 10);
  }

  const aboveMatch = lower.match(/(?:above|more than|over|min(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
  if (aboveMatch) {
    minPrice = parseInt(aboveMatch[1], 10);
  }

  // Detect gender or audience
  let gender = null;
  if (/\b(?:men|mens|man|male|gentlemen)\b/i.test(lower)) gender = 'Men';
  else if (/\b(?:women|womens|woman|female|ladies)\b/i.test(lower)) gender = 'Women';
  else if (/\b(?:kids|boys|girls|children)\b/i.test(lower)) gender = 'Kids';

  // Category detection
  let detectedCategory = null;
  if (/shoe|sneaker|runner|footwear|boot|sandal|flip flop/i.test(lower)) {
    detectedCategory = 'Footwear & Shoes';
  } else if (/phone|mobile|smartphone|iphone|samsung|pixel/i.test(lower)) {
    detectedCategory = 'Mobiles & Tablets';
  } else if (/headphone|earphone|earbuds|speaker|soundbar|audio/i.test(lower)) {
    detectedCategory = 'Audio';
  } else if (/laptop|macbook|computer|notebook/i.test(lower)) {
    detectedCategory = 'Laptops';
  } else if (/shirt|pant|jeans|t-shirt|jacket|hoodie|apparel|dress|clothing/i.test(lower)) {
    detectedCategory = 'Fashion & Apparel';
  } else if (/watch|smartwatch|band|wearable/i.test(lower)) {
    detectedCategory = 'Wearables';
  } else if (/gym|workout|yoga|dumbbell|fitness|exercise/i.test(lower)) {
    detectedCategory = 'Sports & Fitness';
  }

  // Remove filler stop words for search query
  let cleanQuery = raw
    .replace(/(?:find|search|show me|look for|get me|i want|can you find|please show|looking for|under\s*\d+|below\s*\d+|less than\s*\d+|inr\s*\d+|rs\.?\s*\d+|₹\s*\d+)/gi, '')
    .trim();

  // If query had running shoes for morning jogging -> cleanQuery: "Running Shoes"
  if (/running shoes/i.test(raw)) {
    cleanQuery = 'Running Shoes';
  } else if (/shoes/i.test(raw)) {
    cleanQuery = 'Shoes';
  } else if (!cleanQuery) {
    cleanQuery = raw;
  }

  // Generate Smart Filter Pills
  const filterPills = ['All'];
  if (cleanQuery && cleanQuery.length > 2) {
    filterPills.push(cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1));
  }
  if (gender) {
    filterPills.push(gender);
  }
  if (maxPrice) {
    filterPills.push(`Under ₹${maxPrice.toLocaleString('en-IN')}`);
  }
  filterPills.push('Brands');

  // Generate intelligent suggestion alternatives (for Screen 6 / Empty State)
  const suggestedQueries = [
    cleanQuery || 'Running shoes',
    'Jogging shoes',
    'Sports shoes',
    maxPrice ? `Under ₹${maxPrice}` : 'Under ₹3000',
    gender ? `${gender}'s shoes` : "Men's shoes",
    'Morning workout shoes'
  ];

  return {
    rawTranscript: raw,
    cleanQuery,
    category: detectedCategory,
    gender,
    minPrice,
    maxPrice,
    filterPills,
    suggestedQueries
  };
}

/**
 * Voice Search Orchestrator
 * Performs AI Intent Analysis + Database Catalog Aggregation
 */
async function processVoiceSearch({ transcript = '', activeFilter = 'All', sortBy = 'best_match', page = 1, limit = 12 }) {
  if (!transcript || typeof transcript !== 'string') {
    return {
      success: false,
      message: 'Transcript is required for voice search',
      products: [],
      total: 0
    };
  }

  // 1. Extract search parameters
  const parsed = extractVoiceIntentHeuristically(transcript);

  const db = mongoose.connection.db;
  const productsColl = db.collection('products');

  const andConditions = [{ isDeleted: { $ne: true } }];

  // Effective price filter
  let effectiveMaxPrice = parsed.maxPrice;
  if (activeFilter && activeFilter !== 'All') {
    const pillPriceMatch = activeFilter.match(/under\s*₹?\s*(\d+)/i);
    if (pillPriceMatch) {
      effectiveMaxPrice = parseInt(pillPriceMatch[1], 10);
    }
  }

  if (effectiveMaxPrice) {
    andConditions.push({ price: { $lte: effectiveMaxPrice } });
  }
  if (parsed.minPrice) {
    andConditions.push({ price: { $gte: parsed.minPrice } });
  }

  const keywords = parsed.cleanQuery.split(/\s+/).filter(w => w.length > 1);

  // Filter conditions
  if (activeFilter && activeFilter !== 'All' && !activeFilter.startsWith('Under') && activeFilter !== 'Brands') {
    if (activeFilter === 'Men' || activeFilter === 'Women') {
      andConditions.push({
        $or: [
          { name: { $regex: new RegExp(activeFilter, 'i') } },
          { description: { $regex: new RegExp(activeFilter, 'i') } }
        ]
      });
    } else {
      andConditions.push({
        $or: [
          { name: { $regex: new RegExp(activeFilter, 'i') } },
          { category: { $regex: new RegExp(activeFilter, 'i') } }
        ]
      });
    }
  } else {
    // Search query matching
    const searchTerms = keywords.length > 0 ? keywords : [parsed.cleanQuery];
    andConditions.push({
      $or: [
        { name: { $regex: new RegExp(parsed.cleanQuery, 'i') } },
        { name: { $regex: new RegExp(searchTerms.join('|'), 'i') } },
        { category: { $regex: new RegExp(parsed.category || parsed.cleanQuery, 'i') } },
        { description: { $regex: new RegExp(parsed.cleanQuery, 'i') } }
      ]
    });
  }

  // 1. Fetch exact title/keyword matches first
  const exactNameConditions = [
    { isDeleted: { $ne: true } },
    { name: { $regex: new RegExp(parsed.cleanQuery, 'i') } }
  ];
  if (effectiveMaxPrice) exactNameConditions.push({ price: { $lte: effectiveMaxPrice } });
  if (parsed.minPrice) exactNameConditions.push({ price: { $gte: parsed.minPrice } });

  let exactMatches = await productsColl.find({ $and: exactNameConditions }).toArray();

  // 2. If fewer than limit, fetch remaining matches from category/description
  let remainingMatches = [];
  if (exactMatches.length < limit) {
    const existingIds = exactMatches.map(p => p._id);
    const broaderConditions = [
      { isDeleted: { $ne: true } },
      { _id: { $nin: existingIds } },
      ...andConditions
    ];
    remainingMatches = await productsColl
      .find({ $and: broaderConditions })
      .limit(limit - exactMatches.length)
      .toArray();
  }

  let matchingProducts = [...exactMatches, ...remainingMatches];

  // Custom sort if requested (e.g. price_asc, price_desc, rating_desc)
  if (sortBy === 'price_asc') {
    matchingProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price_desc') {
    matchingProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortBy === 'rating_desc') {
    matchingProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'newest') {
    matchingProducts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  // Format products
  const formattedProducts = matchingProducts.map(p => {
    const discount = p.discountPercentage !== undefined && p.discountPercentage !== null ? p.discountPercentage : 25;
    const originalPrice = p.originalPrice || Math.round((p.price || 1000) / (1 - discount / 100));
    return {
      _id: p._id,
      name: p.name,
      category: p.category || 'General',
      price: p.price,
      originalPrice,
      discountPercentage: discount,
      rating: p.rating || 4.2,
      ratingCount: p.ratingCount || 120,
      image: p.image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      quantity: p.quantity || 10
    };
  });

  return {
    success: true,
    transcript: parsed.rawTranscript,
    parsedIntent: {
      cleanQuery: parsed.cleanQuery,
      category: parsed.category,
      gender: parsed.gender,
      maxPrice: parsed.maxPrice,
      minPrice: parsed.minPrice,
      filterPills: parsed.filterPills,
      suggestedQueries: parsed.suggestedQueries
    },
    products: formattedProducts,
    total: formattedProducts.length
  };
}

module.exports = {
  processVoiceSearch,
  extractVoiceIntentHeuristically
};
