const darwinTools = require('./darwin-tools.service');
const Order = require('../models/order.model');
const Customer = require('../models/customer.model');
const Transaction = require('../models/transaction.model');
const Address = require('../models/address.model');
const PaymentMethod = require('../models/payment-method.model');
const Notification = require('../models/notification.model');
const SupportTicket = require('../models/support-ticket.model');

// Focused suggestions when a product is viewed / searched / in context (3-4 items)
const PRODUCT_SUGGESTIONS = [
  '⚡ Smart Buy',
  'Place an order',
  'Add to cart',
  'Add to wishlist'
];

// Focused suggestions for general / account queries (3-4 items)
const GENERAL_SUGGESTIONS = [
  'Trending products',
  'Last orders',
  'Hot deals',
  'This month bills'
];

function getContextualSuggestions(hasProducts = false, category = null) {
  if (category === 'checkout') {
    return ['Confirm & Place Order', 'Change Address', 'Cancel'];
  }
  if (category === 'orders') {
    return ['Track order', 'This month bills', 'Create a ticket'];
  }
  if (category === 'bills') {
    return ['Txn payments', 'Payment methods', 'My details'];
  }
  if (category === 'payments') {
    return ['This month bills', 'Payment methods', 'Last orders'];
  }
  if (category === 'profile') {
    return ['Add address', 'Payment methods', 'Change settings'];
  }
  if (category === 'address') {
    return ['Payment methods', 'Place an order', 'My details'];
  }
  if (category === 'payment_methods') {
    return ['Txn payments', 'This month bills', 'Add address'];
  }
  if (category === 'settings') {
    return ['My details', 'Trending products', 'Last orders'];
  }
  if (category === 'notifications') {
    return ['Last orders', 'This month bills', 'Hot deals'];
  }
  if (category === 'ticket') {
    return ['Last orders', 'My details', 'Recent notifications'];
  }
  if (category === 'comparison') {
    return ['⚡ Smart Buy', 'Place an order', 'Show similar items'];
  }
  if (category === 'trending' || category === 'deals') {
    return ['⚡ Smart Buy', 'Place an order', 'Compare these'];
  }

  // When products are displayed (search / category / product view)
  if (hasProducts) {
    return ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
  }

  // Normal default
  return ['Trending products', 'Last orders', 'Hot deals', 'This month bills'];
}

// Utility to extract numbers e.g. "under 2000", "below 50,000", "under ₹60,000"
function extractMaxPrice(text) {
  const match = text.match(/(?:under|below|less\s+than|within|upto|up\s+to|budget(?:\s+of)?)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  // Check "60k", "50k", "2k"
  const kMatch = text.match(/(?:under|below|less\s+than|within)\s*(?:₹|rs\.?|inr)?\s*([0-9.]+)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }
  return null;
}

function extractOrderNumber(text) {
  const match = text.match(/\b(ORD[0-9A-Z]+|[0-9a-f]{24})\b/i);
  if (match) return match[1].toUpperCase();
  const numMatch = text.match(/(?:order\s*#?\s*)([0-9A-Za-z_-]+)/i);
  if (numMatch) return numMatch[1];
  return null;
}

function cleanSearchKeywords(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim();

  // Strip conversational / intent prefixes
  s = s
    .replace(/^(?:hey|hi|hello|darwin|please|can\s+you|could\s+you|would\s+you)\s+/gi, '')
    .replace(/^(?:are\s+(?:we|you)\s+have|do\s+(?:we|you)\s+have|have\s+(?:we|you)\s+got|is\s+there\s+any|are\s+there\s+any|do\s+you\s+sell)\s+/gi, '')
    .replace(/^(?:show\s+(?:me\s+)?(?:more\s+)?options(?:\s+similar\s+to|\s+for)?|options\s+similar\s+to|similar\s+to|alternative\s+to)\s+/gi, '')
    .replace(/^(?:i\s+want\s+to\s+buy|i\s+want\s+to\s+see|i\s+want|i\s+need|i\s+am\s+looking\s+for|looking\s+for|search\s+for|find\s+me|show\s+me|show|find|search|give\s+me|get\s+me|tell\s+me\s+about)\s+/gi, '')
    .replace(/(?:under|below|less\s+than|within|upto|up\s+to)\s*(?:₹|rs\.?|inr)?\s*[0-9,]+k?/gi, '')
    .replace(/(?:for\s+coding|for\s+travel|for\s+gym|for\s+my\s+sister|for\s+men|for\s+women)/gi, '')
    .replace(/(?:to|in|into|from)\s+(?:my\s+)?cart/gi, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s.replace(/\s+(?:available|in\s+stock|options?|products?|items?)$/gi, '').trim();
  return s;
}

/**
 * Deterministic local NLP dispatcher
 */
async function processNlpQuery({
  message = '',
  customerId = null,
  currentProductContext = null,
  compareProductIds = null,
  conversationHistory = [],
  activeDeliveryAddress = null
}) {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  const result = {
    message: '',
    mode: 'nlp',
    products: [],
    comparison: null,
    order: null,
    orders: [],
    checkout: null,
    action: null,
    suggestions: []
  };

  // 1. GREETING & INTRO
  if (/^(hi|hello|hey|greetings|hola|darwin|start|sup)\b/i.test(lower)) {
    result.message = "Hi! I'm Darwin, your AI shopping assistant 👋 Tell me what you're looking for and I'll find the best options, compare specs, or check your orders!";
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 2. ORDER TRACKING / WHERE IS MY ORDER
  if (
    /(where\s+is\s+my\s+order|track(?:\s+my)?\s+order|order\s+status|when\s+will.*arrive|delivery\s+update)/i.test(lower)
  ) {
    if (!customerId) {
      result.message = 'Please log in to your customer account so I can look up your orders and tracking details.';
      result.suggestions = ['Find laptops', 'What is trending?'];
      return result;
    }

    const explicitOrderId = extractOrderNumber(raw);
    if (explicitOrderId) {
      try {
        const tracking = await darwinTools.trackOrder({ customerId, orderId: explicitOrderId });
        result.message = `Here is the current tracking status for Order #${tracking.orderId}:`;
        result.order = tracking;
        result.suggestions = ['Show all my orders', 'Help with returns', 'Continue shopping'];
        return result;
      } catch (err) {
        result.message = err.message || `I couldn't find Order #${explicitOrderId}. Here are your recent orders:`;
      }
    }

    // Lookup latest order
    const orders = await darwinTools.getCustomerOrders({ customerId, limit: 3 });
    if (!orders || orders.length === 0) {
      result.message = "You don't have any orders yet. Once you place an order, you can track it live right here!";
      result.suggestions = ['Trending products', 'Find running shoes', 'Browse categories'];
      return result;
    }

    const latest = orders[0];
    try {
      const tracking = await darwinTools.trackOrder({ customerId, orderId: latest.orderId });
      result.message = `Your latest order #${tracking.orderId} is currently ${tracking.status?.replace(/_/g, ' ')}. Expected delivery: ${tracking.estimatedDelivery}.`;
      result.order = tracking;
      result.suggestions = ['Show all my orders', 'Track another order', 'Continue shopping'];
      return result;
    } catch {
      result.message = `Here are your recent orders. Your latest order is #${latest.orderId} with status: ${latest.status}.`;
      result.suggestions = ['Show my cart', 'Continue shopping'];
      return result;
    }
  }

  // 3. SHOW RECENT ORDERS
  if (/(my\s+(?:recent\s+|latest\s+|last\s+|past\s+)?orders?|recent\s+orders?|latest\s+orders?|last\s+orders?|show\s+orders?|order\s+history|past\s+orders?|previous\s+orders?)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please sign in to view your order history.';
      return result;
    }
    const orders = await darwinTools.getCustomerOrders({ customerId, limit: 5 });
    if (!orders || orders.length === 0) {
      result.message = "You don't have any past orders yet. Browse our catalog and start shopping today!";
      result.suggestions = getContextualSuggestions(false);
      return result;
    }
    result.message = `Here are your ${orders.length} recent order${orders.length > 1 ? 's' : ''}. You can track status or view details below:`;
    result.orders = orders;
    result.order = orders[0];
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 4. VIEW CART / CART TOTAL
  if (/(show\s+(?:my\s+)?cart|what(?:'s|\s+is)\s+in\s+(?:my\s+)?cart|view\s+cart|cart\s+total)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view your shopping cart.';
      return result;
    }
    const cartItems = await darwinTools.getCart({ customerId });
    if (!cartItems || cartItems.length === 0) {
      result.message = 'Your shopping cart is currently empty.';
      result.suggestions = ['Show trending products', 'Laptops under ₹60K', 'Best deals'];
      return result;
    }
    const total = cartItems.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.qty, 0);
    result.message = `Your cart has ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} totaling ₹${total.toLocaleString('en-IN')}.`;
    result.products = cartItems.map((c) => c.product).filter(Boolean);
    result.suggestions = getContextualSuggestions(true);
    return result;
  }

  // 5. VIEW WISHLIST
  if (/(show\s+(?:my\s+)?wishlist|view\s+wishlist|saved\s+items|my\s+favorites)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view your saved wishlist.';
      return result;
    }
    const wishlistItems = await darwinTools.getWishlist({ customerId });
    if (!wishlistItems || wishlistItems.length === 0) {
      result.message = 'Your wishlist is currently empty. Click the heart icon on any product to save it for later!';
      result.suggestions = getContextualSuggestions(false);
      return result;
    }
    result.message = `You have ${wishlistItems.length} saved item${wishlistItems.length > 1 ? 's' : ''} in your wishlist:`;
    result.products = wishlistItems;
    result.suggestions = getContextualSuggestions(true);
    return result;
  }

  // 6. ADD TO CART
  const addToCartMatch = lower.match(/(?:add|put)\s+(.+?)\s+(?:in|into|to)\s+(?:my\s+)?cart/i) ||
                         lower.match(/(?:add\s+(?:this|it|item)?\s*to\s*(?:my\s*)?cart|buy\s+this\s+now|add\s+to\s+cart)/i);
  if (addToCartMatch) {
    if (!customerId) {
      result.message = 'Please sign in to add items to your cart.';
      return result;
    }

    let targetProductId = currentProductContext?.productId;
    let targetProductName = currentProductContext?.name || '';

    // If a specific product was mentioned, e.g. "Add HP Pavilion 14 Lapto to cart"
    const namedItem = addToCartMatch[1] && !['this', 'it', 'the item', 'these', 'them'].includes(addToCartMatch[1].trim().toLowerCase())
      ? addToCartMatch[1].trim()
      : null;

    if (namedItem) {
      const searchRes = await darwinTools.searchProducts({ query: namedItem, limit: 1 });
      if (searchRes && searchRes.length > 0) {
        targetProductId = searchRes[0]._id;
        targetProductName = searchRes[0].name;
      }
    }

    // If still no target product, check conversation history for recently shown products
    if (!targetProductId && Array.isArray(conversationHistory)) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prev = conversationHistory[i];
        const prods = prev.structuredData?.products || prev.products || [];
        if (prods.length > 0) {
          targetProductId = prods[0]._id || prods[0].productId;
          targetProductName = prods[0].name;
          break;
        }
      }
    }

    if (targetProductId) {
      try {
        const actionRes = await darwinTools.addToCart({ customerId, productId: targetProductId, qty: 1 });
        result.message = `Great! I've added **${actionRes.product?.name || targetProductName}** to your cart.`;
        result.action = actionRes;
        result.suggestions = getContextualSuggestions(true);
        return result;
      } catch (err) {
        result.message = `Could not add to cart: ${err.message}`;
        return result;
      }
    }

    result.message = 'Which product would you like to add to your cart? Please select a product below or tell me what to search for!';
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 6b. SMART BUY ("smart buy", "⚡ smart buy", "buy with coupon", "best deal buy")
  if (/(?:smart\s*buy|buy\s*(?:with\s*coupon|at\s*best\s*price)|best\s*price\s*buy|coupon\s*checkout)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please sign in to complete your Smart Buy purchase.';
      return result;
    }

    let targetProductId = currentProductContext?.productId || null;
    let targetProductName = '';
    if (!targetProductId && Array.isArray(conversationHistory)) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prev = conversationHistory[i];
        const prods = prev.structuredData?.products || prev.products || [];
        if (prods.length > 0) {
          targetProductId = prods[0]._id || prods[0].productId;
          targetProductName = prods[0].name;
          break;
        }
      }
    }

    try {
      const summary = await darwinTools.prepareCheckoutSummary({
        customerId,
        productId: targetProductId,
        qty: 1,
        isSmartBuy: true,
        activeDeliveryAddress
      });

      const couponMsg = summary.couponCode
        ? ` with coupon **${summary.couponCode}** applied (Saving ₹${summary.couponDiscount.toLocaleString('en-IN')})`
        : '';

      result.message = summary.address
        ? `⚡ **Smart Buy Activated**! I've prepared your checkout${couponMsg}. Final Total: **₹${summary.total.toLocaleString('en-IN')}**. Review details below and click Confirm Order to complete!`
        : `⚡ **Smart Buy Activated**! Total: **₹${summary.total.toLocaleString('en-IN')}**${couponMsg}. Please add a delivery address to complete your order.`;

      result.checkout = summary;
      result.suggestions = ['Confirm & Place Order', 'Change Address', 'Payment methods'];
      return result;
    } catch (err) {
      result.message = err.message || 'Unable to start Smart Buy checkout right now.';
      result.suggestions = getContextualSuggestions(false);
      return result;
    }
  }

  // 7. CONVERSATIONAL CHECKOUT START ("Buy this", "Order them", "Buy them", "Checkout", "Place an order")
  if (/(?:buy\s+(?:this|it|them|these|now)?|order\s+(?:this|it|them|these|now)?|checkout|proceed\s+to\s+checkout|place\s+(?:an?\s+|my\s+|the\s+)?ord(?:er|r)?)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please sign in to complete your purchase.';
      return result;
    }

    let targetProductId = currentProductContext?.productId || null;
    if (!targetProductId && Array.isArray(conversationHistory)) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prev = conversationHistory[i];
        const prods = prev.structuredData?.products || prev.products || [];
        if (prods.length > 0) {
          targetProductId = prods[0]._id || prods[0].productId;
          break;
        }
      }
    }

    try {
      const summary = await darwinTools.prepareCheckoutSummary({
        customerId,
        productId: targetProductId,
        qty: 1,
        isSmartBuy: true,
        activeDeliveryAddress
      });

      const couponMsg = summary.couponCode
        ? ` (Coupon **${summary.couponCode}** applied, saving ₹${summary.couponDiscount.toLocaleString('en-IN')})`
        : '';

      result.message = summary.address
        ? `I can help you place this order${couponMsg}! I'll use your delivery address at ${summary.address.addressLine1}, ${summary.address.city}. Total amount: **₹${summary.total.toLocaleString('en-IN')}**. Would you like me to confirm and place this order?`
        : `I can help place your order${couponMsg}! Please add a delivery address to complete your purchase.`;

      result.checkout = summary;
      result.suggestions = ['Confirm & Place Order', 'Change Address', 'Payment methods', 'Cancel'];
      return result;
    } catch (err) {
      result.message = err.message || 'Unable to start checkout right now.';
      result.suggestions = ['View Cart', 'Continue shopping'];
      return result;
    }
  }

  // 8. PRODUCT COMPARISON ("compare these", "which is better", "compare laptops", "compare X and Y")
  if (/(?:compare|which\s+(?:one\s+)?is\s+better|difference\s+between|versus|\bvs\b)/i.test(lower)) {
    let targetIds = [];
    if (Array.isArray(compareProductIds) && compareProductIds.length >= 2) {
      targetIds = compareProductIds;
    } else if (currentProductContext?.productId) {
      targetIds.push(currentProductContext.productId);
      const similar = await darwinTools.getSimilarProducts({ productId: currentProductContext.productId, limit: 2 });
      similar.forEach((s) => targetIds.push(s._id));
    } else {
      // Look back in conversationHistory for last bot message with products
      if (Array.isArray(conversationHistory)) {
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const prev = conversationHistory[i];
          const prods = prev.structuredData?.products || prev.products || [];
          if (Array.isArray(prods) && prods.length >= 2) {
            targetIds = prods.slice(0, 3).map((p) => p._id || p.productId);
            break;
          }
        }
      }

      // If still fewer than 2 products, collect from across recent history
      if (targetIds.length < 2 && Array.isArray(conversationHistory)) {
        const collected = [];
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const prev = conversationHistory[i];
          const prods = prev.structuredData?.products || prev.products || [];
          if (Array.isArray(prods)) {
            prods.forEach((p) => {
              const id = p._id || p.productId;
              if (id && !collected.includes(String(id))) {
                collected.push(String(id));
              }
            });
          }
          if (collected.length >= 2) break;
        }
        if (collected.length >= 2) {
          targetIds = collected.slice(0, 3);
        }
      }

      // If still fewer than 2 products, extract from query (e.g. "compare HP Pavilion and Dell Inspiron")
      if (targetIds.length < 2) {
        const compMatch = raw.match(/(?:compare|difference\s+between|vs\.?)\s+([a-zA-Z0-9\s,&-]+)/i);
        const queryText = compMatch ? compMatch[1].trim() : raw;
        const splitTerms = queryText.split(/\s+(?:and|vs\.?|versus|with|or)\s+/i).filter(Boolean);

        if (splitTerms.length >= 2) {
          for (const term of splitTerms.slice(0, 3)) {
            const cleaned = cleanSearchKeywords(term);
            if (cleaned) {
              const matched = await darwinTools.searchProducts({ query: cleaned, limit: 1 });
              if (matched.length > 0 && !targetIds.includes(matched[0]._id)) {
                targetIds.push(matched[0]._id);
              }
            }
          }
        }

        if (targetIds.length < 2) {
          const targetQuery = cleanSearchKeywords(queryText);
          let items = targetQuery ? await darwinTools.searchProducts({ query: targetQuery, limit: 2 }) : [];
          if (items.length < 2) {
            items = await darwinTools.getTrendingProducts({ limit: 2 });
          }
          targetIds = items.map((it) => it._id);
        }
      }
    }

    if (targetIds.length >= 2) {
      const comp = await darwinTools.compareProducts({ productIds: targetIds.slice(0, 3) });
      if (!comp.error && comp.products?.length >= 2) {
        const p1 = comp.products[0];
        const p2 = comp.products[1];
        const verdictText = comp.verdict?.reason || comp.insight || '';
        result.message = verdictText
          ? `Here is a side-by-side comparison between **${p1.name}** and **${p2.name}**:\n\n${verdictText}`
          : `Here is a side-by-side comparison between **${p1.name}** and **${p2.name}**:`;
        result.comparison = comp;
        result.products = comp.products;
        result.suggestions = getContextualSuggestions(true);
        return result;
      }
    }

    result.message = "I couldn't find enough items to compare. Tell me what products you'd like to compare (e.g., 'Compare laptops under ₹60K')!";
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 9. SIMILAR PRODUCTS ("show similar", "something like this", "alternatives", "options similar to TV")
  if (/(?:(?:show\s+)?(?:more\s+)?options\s+similar\s+to|similar(?:\s+items?|\s+products?)?|like\s+this|alternative|other\s+options)/i.test(lower)) {
    if (currentProductContext?.productId) {
      const similar = await darwinTools.getSimilarProducts({
        productId: currentProductContext.productId,
        limit: 6
      });
      if (similar.length > 0) {
        const enriched = await darwinTools.attachSmartBuyDealsToProducts(similar, customerId);
        result.message = 'Here are some great alternatives similar to what you are viewing:';
        result.products = enriched;
        result.smartBuy = enriched[0]?.smartBuy || null;
        result.suggestions = getContextualSuggestions(true);
        return result;
      }
    }

    // Check if query specifies a target (e.g. "similar to TV" or "options similar to TV")
    const similarTargetMatch = raw.match(/(?:similar\s+to|options\s+(?:similar\s+to|for)|alternative\s+to)\s+(.+)/i);
    if (similarTargetMatch) {
      const targetQuery = cleanSearchKeywords(similarTargetMatch[1]);
      if (targetQuery) {
        // Intent separation: First look for similar products to the reference item
        let matched = await darwinTools.getSimilarProducts({ query: targetQuery, limit: 6 });
        if (!matched || matched.length === 0) {
          matched = await darwinTools.searchProducts({ query: targetQuery, limit: 6 });
        }
        if (matched.length > 0) {
          const enriched = await darwinTools.attachSmartBuyDealsToProducts(matched, customerId);
          const topItem = enriched.find((p) => p.smartBuy?.isBestValue) || enriched[0];
          result.smartBuy = topItem.smartBuy;
          let tip = '';
          if (topItem.smartBuy?.couponCode) {
            tip = `\n\n💡 **Best Smart Buy Deal**: Apply coupon **${topItem.smartBuy.couponCode}** on **${topItem.name}** for **₹${topItem.smartBuy.finalPrice.toLocaleString('en-IN')}** (Save ₹${topItem.smartBuy.totalSavings.toLocaleString('en-IN')})!`;
          }
          result.message = `Here are options and alternatives similar to **${targetQuery}**:${tip}`;
          result.products = enriched;
          result.suggestions = ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
          return result;
        }
      }
    }
  }

  // 10. TRENDING / BEST SELLERS
  if (/(?:trending(?:\s+prods?|\s+products?)?|popular|best\s+sellers?|what('s|\s+is)\s+hot)/i.test(lower)) {
    const rawTrending = await darwinTools.getTrendingProducts({ limit: 6 });
    const trending = await darwinTools.attachSmartBuyDealsToProducts(rawTrending, customerId);
    let tip = '';
    if (trending.length > 0) {
      const topDeal = trending.find((p) => p.smartBuy?.isBestValue) || trending[0];
      result.smartBuy = topDeal.smartBuy;
      if (topDeal.smartBuy?.couponCode) {
        tip = `\n\n💡 **Best Smart Buy Deal for ${topDeal.name}**: Apply coupon **${topDeal.smartBuy.couponCode}** to buy now for **₹${topDeal.smartBuy.finalPrice.toLocaleString('en-IN')}** (Save ₹${topDeal.smartBuy.totalSavings.toLocaleString('en-IN')})!`;
      }
    }
    result.message = `Here are today's trending and most popular products right now:${tip}`;
    result.products = trending;
    result.suggestions = ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
    return result;
  }

  // 11. BEST DEALS / OFFERS / DISCOUNTS
  if (/(?:best\s+deals|hot\s+deals?|discounts?|big\s+discounts?|offers?|sale|cheapest)/i.test(lower)) {
    const rawDeals = await darwinTools.searchProducts({ sort: 'price_asc', limit: 6 });
    const deals = await darwinTools.attachSmartBuyDealsToProducts(rawDeals, customerId);
    let tip = '';
    if (deals.length > 0) {
      const topDeal = deals.find((p) => p.smartBuy?.isBestValue) || deals[0];
      result.smartBuy = topDeal.smartBuy;
      if (topDeal.smartBuy?.couponCode) {
        tip = `\n\n💡 **Best Smart Buy Deal for ${topDeal.name}**: Apply coupon **${topDeal.smartBuy.couponCode}** for extra ₹${topDeal.smartBuy.couponDiscount.toLocaleString('en-IN')} off! Final price: **₹${topDeal.smartBuy.finalPrice.toLocaleString('en-IN')}**.`;
      }
    }
    result.message = `Here are the best deals and highest-discount items available today:${tip}`;
    result.products = deals;
    result.suggestions = ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
    return result;
  }

  // 12. CATEGORIES
  if (/(?:categories|what\s+do\s+you\s+sell|what\s+can\s+i\s+buy)/i.test(lower)) {
    const cats = await darwinTools.getAvailableCategories();
    result.message = `We have products across ${cats.length} categories: ${cats.slice(0, 6).join(', ')}. Which category would you like to explore?`;
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 13. SUPPORT TICKET / CREATE A TICKET & STATUS CHECK
  if (/(?:create\s+(?:a\s+)?ticket|support\s+ticket|raise\s+(?:a\s+)?ticket|help\s+ticket|contact\s+support|customer\s+support|help\s+me\s+with\s+(?:an?\s+)?issue|ticket\s+status|status\s+of\s+(?:ticket\s+)?tkt|my\s+tickets?)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please sign in to your account so our customer support team can link your ticket directly to your profile and orders.';
      result.suggestions = getContextualSuggestions(false);
      return result;
    }

    // Check if user specifically asked about status of a specific ticket ID (e.g. TKT-1001)
    const ticketMatch = query.match(/TKT-\d+/i);
    if (ticketMatch) {
      const specificTicketId = ticketMatch[0].toUpperCase();
      const ticket = await SupportTicket.findOne({ ticketId: specificTicketId, customerId }).lean();
      if (ticket) {
        const lastMsg = (ticket.messages && ticket.messages.length > 0) ? ticket.messages[ticket.messages.length - 1] : null;
        result.message = `**Ticket #${ticket.ticketId}: ${ticket.subject}**\n\n• **Status:** ${ticket.status.toUpperCase()}\n• **Priority:** ${ticket.priority.toUpperCase()}\n• **Category:** ${ticket.category}\n${ticket.orderId ? `• **Order:** ${ticket.orderId}\n` : ''}${lastMsg ? `• **Latest Update (${lastMsg.senderName || lastMsg.sender}):** "${lastMsg.text}"\n` : ''}\nWould you like to open your Support Center to reply or view full conversation?`;
        result.action = {
          type: 'open_support',
          ticketId: ticket.ticketId,
          label: `Open Ticket #${ticket.ticketId}`,
          success: true
        };
        result.suggestions = ['View All My Tickets', 'Ask for Help', 'Track My Order'];
        return result;
      }
    }

    // Check if user provided details to automatically create a ticket
    // e.g. "raise ticket for order ORD-1234: damaged screen" or "create ticket: refund not received"
    const isExplicitCreate = /(?:create|raise|file|open)\s+(?:a\s+)?ticket/i.test(lower) && lower.length > 25;
    if (isExplicitCreate) {
      try {
        const Customer = require('../models/customer.model');
        const cust = await Customer.findById(customerId).select('name email phone');

        // Extract order ID if present
        const orderMatch = query.match(/(?:ORD[A-Z0-9_-]+|ORD-[A-Z0-9]+)/i);
        const matchedOrderId = orderMatch ? orderMatch[0].toUpperCase() : '';

        // Generate clean subject
        let cleanSubject = query
          .replace(/(?:please\s+)?(?:create|raise|file|open)\s+(?:a\s+)?ticket\s+(?:for|about|regarding)?/i, '')
          .replace(/order\s+(?:#)?(?:ORD[A-Z0-9_-]+)?/i, '')
          .replace(/[:\-–]/g, ' ')
          .trim();
        if (cleanSubject.length < 5) cleanSubject = `Support Inquiry from ${cust?.name || 'Customer'}`;
        cleanSubject = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1);

        // Detect category
        let detectedCategory = 'general';
        if (/refund|wallet|money back/i.test(lower)) detectedCategory = 'refund';
        else if (/payment|charged|debit|upi/i.test(lower)) detectedCategory = 'payment';
        else if (/deliver|delay|transit|tracking/i.test(lower)) detectedCategory = 'delivery';
        else if (/damage|broken|wrong|size|quality|defect/i.test(lower)) detectedCategory = 'product';
        else if (/order|cancel/i.test(lower)) detectedCategory = 'order';

        const lastTkt = await SupportTicket.findOne({ ticketId: /^TKT-\d+$/ }).sort({ createdAt: -1 }).select('ticketId').lean();
        let newNum = 1050;
        if (lastTkt && lastTkt.ticketId) {
          const parsed = parseInt(lastTkt.ticketId.replace('TKT-', ''), 10);
          if (!isNaN(parsed)) newNum = parsed + 1;
        }
        const newTicketId = `TKT-${newNum}`;

        const createdTicket = await SupportTicket.create({
          ticketId: newTicketId,
          userType: 'customer',
          customerId,
          userName: cust?.name || 'Customer',
          userEmail: cust?.email || '',
          userPhone: cust?.phone || '',
          orderId: matchedOrderId,
          subject: cleanSubject,
          category: detectedCategory,
          priority: /urgent|fraud|damaged|emergency/i.test(lower) ? 'urgent' : 'high',
          status: 'open',
          messages: [
            {
              sender: 'customer',
              senderName: cust?.name || 'Customer',
              text: query,
              createdAt: new Date()
            },
            {
              sender: 'ai',
              senderName: 'Darwin AI Assistant',
              text: `Hello ${cust?.name || 'there'}! I have automatically logged this ticket for you and routed it to our specialized ${detectedCategory.toUpperCase()} resolution team. You will be updated here in real-time.`,
              createdAt: new Date()
            }
          ]
        });

        result.message = `🎉 **Support Ticket #${createdTicket.ticketId} Created!**\n\n• **Subject:** ${createdTicket.subject}\n• **Category:** ${createdTicket.category.toUpperCase()}\n• **Priority:** ${createdTicket.priority.toUpperCase()}\n${matchedOrderId ? `• **Linked Order:** ${matchedOrderId}\n` : ''}\nOur 24x7 customer support team has received your request. You can open the Support Center to chat with our agents or view updates.`;
        result.action = {
          type: 'open_support',
          ticketId: createdTicket.ticketId,
          label: `Open Ticket #${createdTicket.ticketId}`,
          success: true
        };
        result.suggestions = ['View My Tickets', 'Track Orders', 'Help Center'];
        return result;
      } catch (createErr) {
        console.error('[Darwin] Error auto-creating ticket:', createErr.message);
      }
    }

    // Default overview of active tickets
    const tickets = await SupportTicket.find({ customerId }).sort({ createdAt: -1 }).limit(3).lean();
    let ticketSummary = '';
    if (tickets.length > 0) {
      ticketSummary = `\n\n**Your Active Support Tickets:**\n` + tickets.map(t => `• **#${t.ticketId}**: ${t.subject} (${t.status.toUpperCase()})`).join('\n');
    }
    result.message = `I can help you create a customer support ticket or check status right away! Our support team is available 24/7 to resolve issues regarding orders, deliveries, returns, or refunds.${ticketSummary}\n\nYou can click below to open your Support Center to submit a new ticket or chat with support agents:`;
    result.action = {
      type: 'open_support',
      label: 'Open Support Center',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'ticket');
    return result;
  }

  // 14. THIS MONTH BILLS / MONTHLY SPENDING
  if (/(?:this\s+month\s+bills?|bills?|monthly\s+spending|monthly\s+expenses?|spending\s+this\s+month|how\s+much\s+did\s+i\s+spend)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view your monthly bills and spending summary.';
      result.suggestions = getContextualSuggestions(false, 'bills');
      return result;
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleString('default', { month: 'long' });
    const monthOrders = await Order.find({
      customerId,
      createdAt: { $gte: startOfMonth },
      isDeleted: { $ne: true }
    }).lean();

    const totalSpent = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const cust = await Customer.findById(customerId).select('wallet').lean();
    const walletBal = Number(cust?.wallet?.balance || 0);

    result.message = `Here is your billing summary for **${monthName} ${now.getFullYear()}**:\n\n• **Orders Placed This Month:** ${monthOrders.length}\n• **Total Amount Spent:** ₹${totalSpent.toLocaleString('en-IN')}\n• **Current Wallet Balance:** ₹${walletBal.toLocaleString('en-IN')}\n\nYou can inspect individual invoices and full payment receipts in your Payments & Transactions sidepanel below:`;
    result.action = {
      type: 'open_payments',
      label: 'View Detailed Bills & Invoices',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'bills');
    return result;
  }

  // 15. TXN PAYMENTS / TRANSACTIONS & WALLET
  if (/(?:txn\s+payments?|transactions?|transaction\s+history|payment\s+history|wallet\s+transactions?|my\s+payments?)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view your transaction and payment history.';
      result.suggestions = getContextualSuggestions(false, 'payments');
      return result;
    }
    const txns = await Transaction.find({ customerId }).sort({ createdAt: -1 }).limit(4).lean();
    const cust = await Customer.findById(customerId).select('wallet').lean();
    const walletBal = Number(cust?.wallet?.balance || 0);

    let txnList = '';
    if (txns.length > 0) {
      txnList = `\n\n**Recent Transactions:**\n` + txns.map(t => {
        const sign = t.direction === 'credit' ? '+' : '-';
        return `• **${t.description || t.type}**: ${sign}₹${Number(t.amount || 0).toLocaleString('en-IN')} (${t.status.toUpperCase()})`;
      }).join('\n');
    }

    result.message = `Your store wallet balance is **₹${walletBal.toLocaleString('en-IN')}**.${txnList}\n\nYou can open your Payments & Transactions panel to view complete ledger history, recharge your wallet, or download receipts:`;
    result.action = {
      type: 'open_payments',
      label: 'Open Payments & Wallet',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'payments');
    return result;
  }

  // 16. UPDATE NAME / PROFILE DETAILS (DIRECT ACTION)
  const nameUpdateMatch = raw.match(/(?:(?:change|update|set)\s+(?:my\s+)?name\s+(?:to\s+|as\s+)|my\s+name\s+is\s+)(.+)/i);
  if (nameUpdateMatch) {
    if (!customerId) {
      result.message = 'Please sign in to your account to update your profile name.';
      result.suggestions = getContextualSuggestions(false, 'profile');
      return result;
    }
    const newName = nameUpdateMatch[1].trim().replace(/[.!?,]+$/, '');
    if (newName) {
      try {
        const updateRes = await darwinTools.updateCustomerProfile({ customerId, name: newName });
        result.message = `I've updated your account name to **${newName}**! Your profile details have been saved.`;
        result.action = {
          type: 'profile_updated',
          profile: updateRes.profile,
          success: true
        };
        result.suggestions = getContextualSuggestions(false, 'profile');
        return result;
      } catch (err) {
        result.message = `Could not update name: ${err.message}`;
        result.suggestions = getContextualSuggestions(false, 'profile');
        return result;
      }
    }
  }

  // 16b. UPDATE PHONE NUMBER (DIRECT ACTION)
  const phoneUpdateMatch = lower.match(/(?:(?:change|update|set)\s+(?:my\s+)?phone(?:\s+number)?\s+(?:to\s+|as\s+))([0-9+\s-]{8,15})/i);
  if (phoneUpdateMatch) {
    if (!customerId) {
      result.message = 'Please sign in to your account to update your phone number.';
      result.suggestions = getContextualSuggestions(false, 'profile');
      return result;
    }
    const newPhone = phoneUpdateMatch[1].trim().replace(/\s+/g, '');
    try {
      const updateRes = await darwinTools.updateCustomerProfile({ customerId, phone: newPhone });
      result.message = `I've updated your account phone number to **${newPhone}**!`;
      result.action = {
        type: 'profile_updated',
        profile: updateRes.profile,
        success: true
      };
      result.suggestions = getContextualSuggestions(false, 'profile');
      return result;
    } catch (err) {
      result.message = `Could not update phone: ${err.message}`;
      result.suggestions = getContextualSuggestions(false, 'profile');
      return result;
    }
  }

  // 16c. VIEW MY DETAILS / PROFILE
  if (/(?:my\s+details|profile|account\s+details|my\s+info|my\s+account|personal\s+details)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view your personal account details.';
      result.suggestions = getContextualSuggestions(false, 'profile');
      return result;
    }
    const cust = await Customer.findById(customerId).lean();
    if (!cust) {
      result.message = 'Could not find your customer profile.';
      return result;
    }
    result.message = `Here are your account details:\n\n• **Name:** ${cust.name || 'N/A'}\n• **Email:** ${cust.email || 'N/A'}\n• **Phone:** ${cust.phone || 'Not set'}\n• **Wallet Balance:** ₹${Number(cust.wallet?.balance || 0).toLocaleString('en-IN')}\n\nYou can tell me "Change my name to [Name]" or click below to edit your profile:`;
    result.action = {
      type: 'open_profile',
      label: 'Edit My Details',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'profile');
    return result;
  }

  // 17. ADD ADDRESS / MY ADDRESSES (REAL CREATION & MANAGEMENT)
  if (/(?:add\s+as\s+(?:my\s+)?ad?dr?ess|add\s+(?:an?\s+)?(?:new\s+)?ad?dr?ess|save\s+(?:this\s+)?ad?dr?ess|set\s+(?:as\s+)?(?:my\s+)?ad?dr?ess|my\s+ad?dr?esses?|delivery\s+ad?dr?esses?|ad?dr?ess\s+book|manage\s+ad?dr?ess|\b[1-9][0-9]{5}\b.*(?:ad?dr?ess|deliver))/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to view, save, and manage your delivery addresses.';
      result.suggestions = getContextualSuggestions(false, 'address');
      return result;
    }

    // Check if query contains address details (pincode, street, mandal, or specific location)
    const hasAddressDetails = /\b[1-9][0-9]{5}\b/i.test(raw) || /(?:denkada|vizianagaram|mandal|street|road|plot|door|colony|nagar|apartment)/i.test(raw);
    const isExplicitAdd = /(?:add|save|set|deliver\s+to|update.*ad?dr?ess)/i.test(lower);

    if (hasAddressDetails && isExplicitAdd) {
      try {
        const addRes = await darwinTools.addCustomerAddress({
          customerId,
          addressText: raw
        });
        result.message = addRes.summary || `I've successfully saved your address to your profile and set it as your default delivery location!\n\n**${addRes.address.fullName}**\n${addRes.address.formatted}\nPhone: ${addRes.address.phone}`;
        result.action = addRes.action || {
          type: 'address_added',
          address: addRes.address,
          success: true
        };
        result.suggestions = ['Place an order', 'Trending products', 'Payment methods'];
        return result;
      } catch (addErr) {
        result.message = `Could not save address: ${addErr.message}. You can open your Address Book below to verify.`;
        result.action = { type: 'open_addresses', label: 'Open Address Book', success: false };
        result.suggestions = getContextualSuggestions(false, 'address');
        return result;
      }
    }

    const addresses = await Address.find({ customerId, isDeleted: { $ne: true } }).lean();
    let addrText = '';
    if (addresses.length > 0) {
      addrText = `\n\n**Saved Addresses (${addresses.length}):**\n` + addresses.slice(0, 3).map(a => `• **${a.fullName}** (${a.type}): ${a.addressLine1}, ${a.city} - ${a.pincode}`).join('\n');
    } else {
      addrText = '\n\nYou do not have any saved delivery addresses yet.';
    }
    result.message = `You can manage your delivery addresses or add a new address below:${addrText}`;
    result.action = {
      type: 'open_addresses',
      label: 'Manage Addresses',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'address');
    return result;
  }

  // 18. PAYMENT METHODS
  if (/(?:payment\s+m[e|n]thods?|saved\s+cards?|upi\s+methods?|manage\s+payment)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to manage your saved payment methods.';
      result.suggestions = getContextualSuggestions(false, 'payment_methods');
      return result;
    }
    const methods = await PaymentMethod.find({ customerId, isDeleted: { $ne: true } }).lean();
    let methodText = '';
    if (methods.length > 0) {
      methodText = `\n\n**Saved Payment Options (${methods.length}):**\n` + methods.map(m => `• **${(m.type || 'Card').toUpperCase()}**: ${m.cardNumber ? '•••• ' + m.cardNumber.slice(-4) : (m.upiId || 'Saved Account')}`).join('\n');
    } else {
      methodText = '\n\nYou have not added any saved payment methods yet.';
    }
    result.message = `You can manage your cards, UPI handles, and default payment methods below:${methodText}`;
    result.action = {
      type: 'open_payment_methods',
      label: 'Manage Payment Methods',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'payment_methods');
    return result;
  }

  // 19a. SWITCH AI MODEL / ENGINE (DIRECT ACTION)
  const switchAiMatch = lower.match(/(?:switch|change|set)\s+(?:ai|model|engine|provider)?\s*(?:to\s+)?(gemini|openrouter|nlp|smart\s+search|auto)\b/i);
  if (switchAiMatch) {
    const rawMode = switchAiMatch[1].toLowerCase().replace(/\s+/g, '');
    let targetMode = 'auto';
    let label = 'Auto Router';
    if (rawMode.includes('gemini')) { targetMode = 'gemini'; label = 'Google Gemini AI'; }
    else if (rawMode.includes('openrouter')) { targetMode = 'openrouter'; label = 'OpenRouter Backup AI'; }
    else if (rawMode.includes('nlp') || rawMode.includes('smartsearch')) { targetMode = 'nlp'; label = 'Smart Search Mode'; }

    if (customerId) {
      try {
        await darwinTools.saveDarwinSettings({ customerId, settings: { aiProviderPreference: targetMode } });
      } catch {}
    }
    result.message = `I've switched Darwin's AI engine to **${label}**! Your preference is now saved and active.`;
    result.action = {
      type: 'settings_updated',
      settings: { aiProviderPreference: targetMode },
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'settings');
    return result;
  }

  // 19b. UPDATE BUDGET LIMIT (DIRECT ACTION)
  const budgetMatch = lower.match(/(?:set|change|update)\s+budget(?:\s+(?:limit|threshold|preference))?\s+(?:to\s+)?(?:₹|rs\.?)?\s*([0-9,]+)/i);
  if (budgetMatch) {
    const budgetVal = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (customerId) {
      try {
        await darwinTools.saveDarwinSettings({ customerId, settings: { budgetPreference: budgetVal } });
      } catch {}
    }
    result.message = `I've set your preferred shopping budget limit to **₹${budgetVal.toLocaleString('en-IN')}**!`;
    result.action = {
      type: 'settings_updated',
      settings: { budgetPreference: budgetVal },
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'settings');
    return result;
  }

  // 19c. CHANGE SETTINGS (DIALOG / MENU)
  if (/(?:change\s+settings?|darwin\s+settings?|settings?|ai\s+settings?|assistant\s+settings?)/i.test(lower)) {
    result.message = `You can customize Darwin's settings and AI engine at any time! You can tell me to "Switch to Gemini", "Set budget to 5000", or open Darwin Settings below:`;
    result.action = {
      type: 'open_settings',
      label: 'Open Darwin Settings',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'settings');
    return result;
  }

  // 20. RECENT NOTIFICATIONS
  if (/(?:recent\s+notifications?|notifications?|my\s+alerts?|order\s+updates)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please log in to check your recent notifications and alerts.';
      result.suggestions = getContextualSuggestions(false, 'notifications');
      return result;
    }
    const notifs = await Notification.find({ recipientId: customerId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    let notifText = '';
    if (notifs.length > 0) {
      notifText = `\n\n**Recent Updates:**\n` + notifs.map(n => `• **${n.title}**: ${n.message}`).join('\n');
    } else {
      notifText = "\n\nYou're all caught up! No unread notifications right now.";
    }
    result.message = `Here are your recent alerts and order updates:${notifText}`;
    result.action = {
      type: 'open_notifications',
      label: 'View All Notifications',
      success: true
    };
    result.suggestions = getContextualSuggestions(false, 'notifications');
    return result;
  }

  // 21. RECOMMENDED PRODUCTS
  if (/(?:recommended\s+products?|recommeneded\s+products?|for\s+me|suggestions\s+for\s+me|recommended\s+for\s+me)/i.test(lower)) {
    const recommended = await darwinTools.getTopRatedProducts({ limit: 6 });
    result.message = "Here are our top recommended products chosen for you:";
    result.products = recommended;
    result.suggestions = getContextualSuggestions(true);
    return result;
  }

  // 22. HOT DEALS & BIG DISCOUNTS
  if (/(?:hot\s+deals?|big\s+discounts?|top\s+deals?|mega\s+discounts?|best\s+offers?|sale|highest\s+discounts?)/i.test(lower)) {
    const deals = await darwinTools.searchProducts({ sort: 'price_asc', limit: 6 });
    result.message = "Here are today's hottest deals and biggest discounts available now:";
    result.products = deals;
    result.suggestions = getContextualSuggestions(true);
    return result;
  }

  // 23. ADD TO WISHLIST (Intent trigger)
  if (/(?:add\s+(?:this\s+)?to\s+(?:my\s+)?wh?ish?list|save\s+(?:this\s+)?to\s+(?:my\s+)?wh?ish?list|wh?ish?list(?:\s+this)?|save\s+for\s+later)/i.test(lower)) {
    if (!customerId) {
      result.message = 'Please sign in to save items to your wishlist.';
      result.suggestions = getContextualSuggestions(false);
      return result;
    }
    let targetProductId = currentProductContext?.productId;
    let targetProductName = currentProductContext?.name || '';
    if (!targetProductId && Array.isArray(conversationHistory)) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prev = conversationHistory[i];
        const prods = prev.structuredData?.products || prev.products || [];
        if (prods.length > 0) {
          targetProductId = prods[0]._id || prods[0].productId;
          targetProductName = prods[0].name;
          break;
        }
      }
    }
    if (targetProductId) {
      try {
        const actionRes = await darwinTools.addToWishlist({ customerId, productId: targetProductId });
        result.message = `Saved **${actionRes.product?.name || targetProductName}** to your wishlist!`;
        result.action = actionRes;
        result.suggestions = getContextualSuggestions(true);
        return result;
      } catch (err) {
        result.message = `Could not save to wishlist: ${err.message}`;
        result.suggestions = getContextualSuggestions(false);
        return result;
      }
    }
    result.message = 'Which product would you like to save to your wishlist? Tell me what you are looking for!';
    result.suggestions = getContextualSuggestions(false);
    return result;
  }

  // 23b. SHOPPING Q&A ("What is return policy?", "Is there warranty?", "How does shipping work?", "Accepted payment methods")
  if (/(?:return\s+policy|how\s+to\s+return|warranty\s+(?:policy|coverage)?|shipping\s+(?:time|speed|cost)|delivery\s+(?:time|speed|options)|accepted\s+payment|cod\s+available|refund\s+process)/i.test(lower)) {
    const qa = await darwinTools.getShoppingQA({
      topic: raw,
      productId: currentProductContext?.productId
    });

    let extraPolicy = '';
    if (qa.productPolicy) {
      extraPolicy = `\n\n**For ${qa.productPolicy.productName}**:\n• Return Policy: ${qa.productPolicy.returnPolicy}\n• Warranty: ${qa.productPolicy.warranty}`;
    }

    result.message = `### 📋 ${qa.title}\n${qa.answer}\n\n**Key Highlights:**\n${qa.highlights.map((h) => `• ${h}`).join('\n')}${extraPolicy}`;
    result.suggestions = ['Trending products', 'Hot deals', 'Last orders'];
    return result;
  }

  // 23c. COMPLEMENTARY UPSELLING ("accessories for", "pairs with", "complement", "upsell")
  if (/(?:accessories\s+(?:for|with)|complement|pairs?\s+(?:with|well)|goes\s+well\s+with|upsell|addon)/i.test(lower)) {
    const complementary = await darwinTools.getComplementaryProducts({
      productId: currentProductContext?.productId,
      category: currentProductContext?.category
    });
    if (complementary.length > 0) {
      result.message = currentProductContext?.name
        ? `Here are top recommended accessories and complementary items for **${currentProductContext.name}**:`
        : 'Here are popular complementary items and accessories recommended for your shopping:';
      result.products = complementary;
      result.suggestions = ['⚡ Smart Buy', 'Add to cart', 'Compare these'];
      return result;
    }
  }

  // 23d. PRICE ASSISTANT ("shoes below 2000 with good ratings", "products between 500 and 1500")
  const priceRangeMatch = raw.match(/(?:between|from)\s*₹?\s*(\d+)\s*(?:and|to|-)\s*₹?\s*(\d+)/i);
  const ratingMatch = raw.match(/(?:good|top|high|best)?\s*ratings?|(\d(?:\.\d)?)\s*(?:star|\*)/i);
  if (priceRangeMatch || (/(?:under|below|less\s+than|budget\s+of)\s*₹?\s*\d+/i.test(lower) && ratingMatch)) {
    let minPrice = 0;
    let maxPrice = Infinity;
    if (priceRangeMatch) {
      minPrice = parseInt(priceRangeMatch[1], 10);
      maxPrice = parseInt(priceRangeMatch[2], 10);
    } else {
      maxPrice = extractMaxPrice(raw) || Infinity;
    }

    let minRating = 0;
    if (ratingMatch) {
      minRating = ratingMatch[1] ? parseFloat(ratingMatch[1]) : 4.0;
    }

    const keywords = cleanSearchKeywords(raw)
      .replace(/(?:between|from|to|and|under|below|less\s+than|ratings?|stars?|\d+)/gi, '')
      .trim();

    const priceAssisted = await darwinTools.searchProductsByPriceAndRating({
      minPrice,
      maxPrice,
      minRating,
      query: keywords,
      limit: 6
    });

    if (priceAssisted.length > 0) {
      const bestDeal = priceAssisted.find((p) => p.smartBuy?.isBestValue) || priceAssisted[0];
      result.smartBuy = bestDeal.smartBuy;
      let tip = '';
      if (bestDeal.smartBuy?.couponCode) {
        tip = `\n\n💡 **Best Value Deal**: Get **${bestDeal.name}** for **₹${bestDeal.smartBuy.finalPrice.toLocaleString('en-IN')}** with coupon **${bestDeal.smartBuy.couponCode}** (Save ₹${bestDeal.smartBuy.totalSavings.toLocaleString('en-IN')})!`;
      }

      result.message = `Here are the top-rated items matching your price range (₹${minPrice.toLocaleString('en-IN')} - ₹${maxPrice === Infinity ? 'Any' : maxPrice.toLocaleString('en-IN')})${minRating ? ` with ${minRating}★+ rating` : ''}:${tip}`;
      result.products = priceAssisted;
      result.suggestions = ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
      return result;
    }
  }

  // 24. PRODUCT SEARCH (Default & Natural queries)
  const maxPrice = extractMaxPrice(raw);
  const keywords = cleanSearchKeywords(raw);

  const searchArgs = {
    query: keywords,
    maxPrice: maxPrice || undefined,
    limit: 6
  };

  const rawFound = await darwinTools.searchProducts(searchArgs);

  if (rawFound.length > 0) {
    const found = await darwinTools.attachSmartBuyDealsToProducts(rawFound, customerId);
    const topProd = found.find((p) => p.smartBuy?.isBestValue) || found[0];
    result.smartBuy = topProd.smartBuy;

    let smartBuyTip = '';
    if (topProd.smartBuy && topProd.smartBuy.couponCode) {
      smartBuyTip = `\n\n💡 **Smart Buy Deal for ${topProd.name}**:\n• Regular Price: ~~₹${topProd.smartBuy.sellingPrice.toLocaleString('en-IN')}~~\n• Best Coupon: **${topProd.smartBuy.couponCode}** (Extra ₹${topProd.smartBuy.couponDiscount.toLocaleString('en-IN')} OFF)\n${topProd.smartBuy.promotionTitle ? `• Campaign: ${topProd.smartBuy.promotionTitle}\n` : ''}• ⚡ **Final Smart Buy Price: ₹${topProd.smartBuy.finalPrice.toLocaleString('en-IN')}** (Save ₹${topProd.smartBuy.totalSavings.toLocaleString('en-IN')})\n👉 Choose **⚡ Smart Buy** on any product card below to enter checkout with coupon auto-applied!`;
    }

    result.message = maxPrice
      ? `I found ${found.length} options within your budget of ₹${maxPrice.toLocaleString('en-IN')}:${smartBuyTip}`
      : `Here are ${found.length} great options matching "${keywords || 'your search'}":${smartBuyTip}`;
    result.products = found;
    result.suggestions = ['⚡ Smart Buy', 'Place an order', 'Add to cart', 'Compare these'];
    return result;
  }

  // Fallback: broaden search
  const fallbackProducts = await darwinTools.getTrendingProducts({ limit: 4 });
  result.message = `I couldn't find exact matches for "${raw}". However, here are some of our most popular trending items you might like:`;
  result.products = fallbackProducts;
  result.suggestions = ['Trending products', 'Last orders', 'Hot deals', 'This month bills'];

  if (result.message && typeof result.message === 'string') {
    result.message = result.message
      .replace(/(?:Product\s+)?ID:\s*[0-9a-fA-F]{24}/gi, '')
      .replace(/\([0-9a-fA-F]{24}\)/gi, '')
      .replace(/\b[0-9a-fA-F]{24}\b/g, '')
      .trim();
  }

  return result;
}

module.exports = {
  processNlpQuery,
  extractMaxPrice,
  extractOrderNumber,
  getContextualSuggestions,
  PRODUCT_SUGGESTIONS,
  GENERAL_SUGGESTIONS
};
