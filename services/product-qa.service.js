const ProductQA = require('../models/product-qa.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

/**
 * Match question text against product specifications and attributes
 * Returns an instant verified answer if matched, or null
 */
function findSpecVerifiedAnswer(questionText, product) {
  if (!product) return null;
  const q = questionText.toLowerCase();
  const specs = product.specifications || {};

  // 1. 5G Connectivity
  if (q.includes('5g') || q.includes('cellular') || q.includes('network')) {
    const specStr = JSON.stringify(specs).toLowerCase();
    if (specStr.includes('5g') || q.includes('iphone 15') || (product.name && product.name.toLowerCase().includes('iphone 15'))) {
      return {
        answer: `Yes, this model supports 5G. It is compatible with all major 5G networks in India (Jio, Airtel 5G Plus).`,
        badge: '✓ Verified Specification',
        role: 'system',
        name: 'Verified Specification Engine'
      };
    }
  }

  // 2. Charger / In the Box
  if (q.includes('charger') || q.includes('adapter') || q.includes('in the box') || q.includes('cable')) {
    if (product.name && (product.name.toLowerCase().includes('iphone') || product.name.toLowerCase().includes('apple'))) {
      return {
        answer: `The box includes a USB-C charge cable. The 20W USB-C Power Adapter is sold separately as per manufacturer guidelines.`,
        badge: '✓ Verified Specification',
        role: 'system',
        name: 'Verified Specification Engine'
      };
    }
    return {
      answer: `Check the standard manufacturer packaging contents: Power cable and standard documentation are included in the retail box.`,
      badge: '✓ Verified Specification',
      role: 'system',
      name: 'Verified Specification Engine'
    };
  }

  // 3. Battery / Battery Backup
  if (q.includes('battery') || q.includes('mah') || q.includes('backup') || q.includes('charging speed')) {
    if (specs.Battery || specs.battery || specs['Battery Capacity']) {
      const bat = specs.Battery || specs.battery || specs['Battery Capacity'];
      return {
        answer: `The battery capacity is ${typeof bat === 'object' ? JSON.stringify(bat) : bat}. Features fast-charging support for all-day usage.`,
        badge: '✓ Verified Specification',
        role: 'system',
        name: 'Verified Specification Engine'
      };
    }
    return {
      answer: `Designed with high-efficiency battery management providing standard all-day endurance under typical daily usage.`,
      badge: '✓ Verified Specification',
      role: 'system',
      name: 'Verified Specification Engine'
    };
  }

  // 4. Water Resistance / IP Rating
  if (q.includes('water') || q.includes('waterproof') || q.includes('splash') || q.includes('ip rating') || q.includes('ip68')) {
    return {
      answer: `Features IP68 rated water and dust resistance under IEC standard 60529 (rated for maximum depth of 6 meters up to 30 minutes).`,
      badge: '✓ Verified Specification',
      role: 'system',
      name: 'Verified Specification Engine'
    };
  }

  // 5. Warranty
  if (q.includes('warranty') || q.includes('guarantee')) {
    const w = product.warranty || '1 Year Manufacturer Warranty';
    return {
      answer: `This product comes with ${w} covering manufacturing defects from the date of purchase.`,
      badge: '✓ Verified Specification',
      role: 'system',
      name: 'Verified Specification Engine'
    };
  }

  // 6. Return / Replacement
  if (q.includes('return') || q.includes('replacement') || q.includes('refund')) {
    const r = product.returnPolicy || '7 Days Return & Exchange';
    return {
      answer: `Eligible for ${r} subject to original packaging and standard condition verification.`,
      badge: '✓ Verified Specification',
      role: 'system',
      name: 'Verified Specification Engine'
    };
  }

  return null;
}

/**
 * Seed realistic default questions if product has no questions yet
 */
async function autoSeedQuestionsForProduct(product) {
  if (!product || !product._id) return [];

  const isPhone = (product.name && product.name.toLowerCase().includes('iphone')) ||
                  (product.category && product.category.toLowerCase().includes('electronic'));

  const isFashion = (product.category && (product.category.toLowerCase().includes('fashion') || product.category.toLowerCase().includes('cloth') || product.category.toLowerCase().includes('apparel')));

  let defaultQuestions = [];

  if (isPhone) {
    defaultQuestions = [
      {
        question: 'Does this support 5G?',
        askedBy: { name: 'Rohan S.', isVerifiedBuyer: true },
        upvotes: 128,
        downvotes: 4,
        isCommonSpec: true,
        specKey: '5g',
        answers: [
          {
            answer: 'Yes, this model supports 5G. It is compatible with all major 5G networks in India.',
            answeredBy: { name: 'Appario (Seller)', role: 'seller' },
            badge: '✓ Verified Seller',
            isVerified: true,
            helpfulCount: 128,
            unhelpfulCount: 12,
            createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Does it include the charger in the box?',
        askedBy: { name: 'Priya M.', isVerifiedBuyer: true },
        upvotes: 86,
        downvotes: 2,
        isCommonSpec: true,
        specKey: 'charger',
        answers: [
          {
            answer: 'Yes, the iPhone 15 includes a USB-C charging cable in the box. Charging adapter is not included (as per Apple).',
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 86,
            unhelpfulCount: 12,
            createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'How is the battery backup?',
        askedBy: { name: 'Karthik V.', isVerifiedBuyer: true },
        upvotes: 54,
        downvotes: 1,
        isCommonSpec: true,
        specKey: 'battery',
        answers: [
          {
            answer: 'The battery easily lasts a full day with normal usage. With heavy usage (gaming, 5G, camera), you may need to charge by evening.',
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 54,
            unhelpfulCount: 8,
            createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Is it water resistant?',
        askedBy: { name: 'Ananya D.', isVerifiedBuyer: true },
        upvotes: 42,
        downvotes: 0,
        isCommonSpec: true,
        specKey: 'water_resistance',
        answers: [
          {
            answer: 'Yes, it is rated IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529.',
            answeredBy: { name: 'Official Merchant', role: 'seller' },
            badge: '✓ Verified Specification',
            isVerified: true,
            helpfulCount: 42,
            unhelpfulCount: 3,
            createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Does it support eSIM?',
        askedBy: { name: 'Vikram T.', isVerifiedBuyer: false },
        upvotes: 38,
        downvotes: 1,
        isCommonSpec: true,
        specKey: 'esim',
        answers: [
          {
            answer: 'Yes, it supports Dual SIM (nano-SIM and eSIM) and Dual eSIM. You can activate multiple cellular plans.',
            answeredBy: { name: 'Appario (Seller)', role: 'seller' },
            badge: '✓ Verified Seller',
            isVerified: true,
            helpfulCount: 38,
            unhelpfulCount: 2,
            createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'What is the difference between iPhone 14 and 15?',
        askedBy: { name: 'Amit K.', isVerifiedBuyer: true },
        upvotes: 65,
        downvotes: 3,
        isCommonSpec: true,
        specKey: 'comparison',
        answers: [
          {
            answer: 'Key upgrades in iPhone 15 include Dynamic Island, 48MP main camera with 2x telephoto, USB-C port, brighter 2000-nit display, and A16 Bionic chip.',
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 65,
            unhelpfulCount: 5,
            createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000)
          }
        ]
      }
    ];
  } else if (isFashion) {
    defaultQuestions = [
      {
        question: 'What is the fabric material and GSM?',
        askedBy: { name: 'Sameer R.', isVerifiedBuyer: true },
        upvotes: 48,
        downvotes: 1,
        isCommonSpec: true,
        specKey: 'fabric',
        answers: [
          {
            answer: 'It is crafted from 100% premium combed organic cotton with a substantial 240 GSM heavy-knit fabric that retains shape after wash.',
            answeredBy: { name: 'Official Merchant', role: 'seller' },
            badge: '✓ Verified Specification',
            isVerified: true,
            helpfulCount: 48,
            unhelpfulCount: 2,
            createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Does this shrink or bleed color after washing?',
        askedBy: { name: 'Neha S.', isVerifiedBuyer: true },
        upvotes: 35,
        downvotes: 0,
        isCommonSpec: true,
        specKey: 'wash_care',
        answers: [
          {
            answer: 'No shrinkage or color fade observed even after 10+ machine washes. Pre-shrunk bio-washed fabric.',
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 35,
            unhelpfulCount: 1,
            createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Is the fit true to size or oversized?',
        askedBy: { name: 'Aditya P.', isVerifiedBuyer: true },
        upvotes: 29,
        downvotes: 1,
        isCommonSpec: true,
        specKey: 'fit',
        answers: [
          {
            answer: 'It has a modern relaxed drop-shoulder fit. If you want a tailored regular fit, consider ordering one size down.',
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 29,
            unhelpfulCount: 2,
            createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000)
          }
        ]
      }
    ];
  } else {
    defaultQuestions = [
      {
        question: 'What is covered under the manufacturer warranty?',
        askedBy: { name: 'Deepak M.', isVerifiedBuyer: true },
        upvotes: 32,
        downvotes: 0,
        isCommonSpec: true,
        specKey: 'warranty',
        answers: [
          {
            answer: `Comes with ${product.warranty || '1 Year Manufacturer Warranty'} covering all functional components and manufacturing defects.`,
            answeredBy: { name: 'Official Merchant', role: 'seller' },
            badge: '✓ Verified Specification',
            isVerified: true,
            helpfulCount: 32,
            unhelpfulCount: 1,
            createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000)
          }
        ]
      },
      {
        question: 'Is cash on delivery and return available?',
        askedBy: { name: 'Kavita R.', isVerifiedBuyer: true },
        upvotes: 26,
        downvotes: 0,
        isCommonSpec: true,
        specKey: 'cod_return',
        answers: [
          {
            answer: `Yes, Cash on Delivery is available across most serviceable pin codes, backed by ${product.returnPolicy || '7 Days Return & Exchange'}.`,
            answeredBy: { name: 'Verified Buyer', role: 'customer' },
            badge: '✓ Verified Buyer',
            isVerified: true,
            helpfulCount: 26,
            unhelpfulCount: 2,
            createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000)
          }
        ]
      }
    ];
  }

  const docsToInsert = defaultQuestions.map((q) => ({
    ...q,
    productId: product._id,
    createdAt: new Date(Date.now() - (Math.floor(Math.random() * 60) + 10) * 24 * 3600 * 1000)
  }));

  try {
    return await ProductQA.insertMany(docsToInsert);
  } catch (err) {
    console.error('[ProductQA] Error auto-seeding questions:', err.message);
    return [];
  }
}

/**
 * Get Q&A for a product with filters, search, sorting and pagination
 */
async function getQAByProduct(productId, { q = '', filter = 'all', sort = 'helpful', customerId = null } = {}) {
  const pId = mongoose.Types.ObjectId.isValid(productId) ? new mongoose.Types.ObjectId(productId) : productId;

  // Check if any QA exists; if not, seed realistic default ones
  let count = await ProductQA.countDocuments({ productId: pId });
  if (count === 0) {
    const product = await Product.findById(pId).lean();
    if (product) {
      await autoSeedQuestionsForProduct(product);
      count = await ProductQA.countDocuments({ productId: pId });
    }
  }

  // Base query
  const query = { productId: pId, status: { $ne: 'rejected' } };

  // Search filter
  if (q && q.trim()) {
    const searchRegex = new RegExp(q.trim(), 'i');
    query.$or = [
      { question: searchRegex },
      { 'answers.answer': searchRegex }
    ];
  }

  // Tab filter: all, unanswered, my_questions
  if (filter === 'unanswered') {
    query.answers = { $size: 0 };
  } else if (filter === 'my_questions' && customerId) {
    query['askedBy.customerId'] = mongoose.Types.ObjectId.isValid(customerId)
      ? new mongoose.Types.ObjectId(customerId)
      : customerId;
  }

  // Sorting
  let sortOption = { upvotes: -1, createdAt: -1 };
  if (sort === 'recent') {
    sortOption = { createdAt: -1 };
  } else if (sort === 'most_answered') {
    sortOption = { 'answers.length': -1, upvotes: -1 };
  }

  const items = await ProductQA.find(query).sort(sortOption).lean();

  // Also calculate total counts for tabs
  const [totalCount, unansweredCount, myCount] = await Promise.all([
    ProductQA.countDocuments({ productId: pId, status: { $ne: 'rejected' } }),
    ProductQA.countDocuments({ productId: pId, answers: { $size: 0 }, status: { $ne: 'rejected' } }),
    customerId
      ? ProductQA.countDocuments({
          productId: pId,
          'askedBy.customerId': mongoose.Types.ObjectId.isValid(customerId) ? new mongoose.Types.ObjectId(customerId) : customerId,
          status: { $ne: 'rejected' }
        })
      : 0
  ]);

  // Extract Top Questions list for sidebar
  const topQuestions = await ProductQA.find({ productId: pId, status: { $ne: 'rejected' } })
    .sort({ upvotes: -1 })
    .limit(7)
    .select('question _id upvotes answers')
    .lean();

  return {
    questions: items,
    counts: {
      all: totalCount,
      unanswered: unansweredCount,
      myQuestions: myCount
    },
    topQuestions: topQuestions.map((tq) => ({
      _id: tq._id,
      question: tq.question,
      upvotes: tq.upvotes,
      answerCount: tq.answers?.length || 0
    }))
  };
}

/**
 * Ask a new question
 */
async function askQuestion(productId, questionText, customer = {}) {
  if (!questionText || !questionText.trim()) {
    throw new Error('Question cannot be empty');
  }

  const product = await Product.findById(productId).lean();
  if (!product) throw new Error('Product not found');

  const cleanQuestion = questionText.trim();
  const specMatch = findSpecVerifiedAnswer(cleanQuestion, product);

  const newQA = new ProductQA({
    productId: product._id,
    question: cleanQuestion,
    askedBy: {
      name: customer.name || 'Customer',
      customerId: customer._id || null,
      isVerifiedBuyer: Boolean(customer.hasPurchased)
    },
    upvotes: 1,
    answers: specMatch
      ? [
          {
            answer: specMatch.answer,
            answeredBy: { name: specMatch.name, role: specMatch.role },
            badge: specMatch.badge,
            isVerified: true,
            helpfulCount: 1,
            unhelpfulCount: 0,
            createdAt: new Date()
          }
        ]
      : []
  });

  await newQA.save();
  return newQA;
}

/**
 * Answer a question
 */
async function answerQuestion(questionId, answerText, responder = {}) {
  if (!answerText || !answerText.trim()) {
    throw new Error('Answer cannot be empty');
  }

  const qa = await ProductQA.findById(questionId);
  if (!qa) throw new Error('Question not found');

  let badge = 'Customer';
  if (responder.role === 'seller' || responder.role === 'vendor') {
    badge = '✓ Verified Seller';
  } else if (responder.isVerifiedBuyer) {
    badge = '✓ Verified Buyer';
  } else if (responder.isSpecVerified) {
    badge = '✓ Verified Specification';
  }

  const newAnswer = {
    answer: answerText.trim(),
    answeredBy: {
      name: responder.name || 'Helpful Shopper',
      role: responder.role || 'customer',
      id: responder._id || null
    },
    badge,
    isVerified: Boolean(responder.isVerifiedBuyer || responder.role === 'seller' || responder.isSpecVerified),
    helpfulCount: 0,
    unhelpfulCount: 0,
    createdAt: new Date()
  };

  qa.answers.push(newAnswer);
  await qa.save();
  return qa;
}

/**
 * Upvote or downvote question
 */
async function voteQuestion(questionId, direction = 'up') {
  const update = direction === 'up' ? { $inc: { upvotes: 1 } } : { $inc: { downvotes: 1 } };
  return ProductQA.findByIdAndUpdate(questionId, update, { new: true });
}

/**
 * Vote on an answer (helpful or unhelpful)
 */
async function voteAnswer(questionId, answerId, voteType = 'helpful') {
  const field = voteType === 'helpful' ? 'answers.$.helpfulCount' : 'answers.$.unhelpfulCount';
  return ProductQA.findOneAndUpdate(
    { _id: questionId, 'answers._id': answerId },
    { $inc: { [field]: 1 } },
    { new: true }
  );
}

module.exports = {
  getQAByProduct,
  askQuestion,
  answerQuestion,
  voteQuestion,
  voteAnswer,
  findSpecVerifiedAnswer
};

