const { getGeminiModel, isGeminiConfigured } = require('../config/gemini.config');
const { isOpenRouterConfigured } = require('../config/openrouter.config');
const { isGroqConfigured } = require('../config/groq.config');
const { isCerebrasConfigured } = require('../config/cerebras.config');
const { chatWithOpenRouter, chatWithGroq, chatWithCerebras } = require('./openrouter.service');
const darwinTools = require('./darwin-tools.service');
const { processNlpQuery } = require('./darwin-nlp.service');
const DarwinConversation = require('../models/darwin-conversation.model');
const DarwinSettings = require('../models/darwin-settings.model');

// Gemini Function Declarations
const DARWIN_TOOL_DECLARATIONS = [
  {
    name: 'searchProducts',
    description: 'Search for products in the MongoDB catalog matching search query, category, price range, or rating.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term or keywords (e.g., "running shoes", "laptop")' },
        category: { type: 'STRING', description: 'Product category name' },
        minPrice: { type: 'NUMBER', description: 'Minimum price in INR' },
        maxPrice: { type: 'NUMBER', description: 'Maximum price/budget in INR' },
        sort: {
          type: 'STRING',
          enum: ['rating', 'price_asc', 'price_desc', 'trending', 'newest'],
          description: 'Sort criteria'
        },
        limit: { type: 'INTEGER', description: 'Max items to return (capped at 10)' }
      }
    }
  },
  {
    name: 'getProductDetails',
    description: 'Get detailed product information for a specific product ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Valid MongoDB product ID' }
      },
      required: ['productId']
    }
  },
  {
    name: 'getTrendingProducts',
    description: 'Get the top trending and best-selling products.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max items to return (default 6, max 10)' }
      }
    }
  },
  {
    name: 'getTopRatedProducts',
    description: 'Get top rated customer products, optionally within a category.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', description: 'Optional category filter' },
        limit: { type: 'INTEGER', description: 'Max items to return' }
      }
    }
  },
  {
    name: 'compareProducts',
    description: 'Compare 2 to 3 products side-by-side using real specifications, price, rating, warranty, and return policies.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Array of 2 to 3 valid product IDs to compare'
        }
      },
      required: ['productIds']
    }
  },
  {
    name: 'getSimilarProducts',
    description: 'Find products similar to a given product ID in category and specifications.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Reference product ID' },
        limit: { type: 'INTEGER', description: 'Number of similar items' }
      },
      required: ['productId']
    }
  },
  {
    name: 'getCart',
    description: "Get the current authenticated customer's shopping cart.",
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'addToCart',
    description: "Add a product to the customer's shopping cart.",
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Product ID to add' },
        qty: { type: 'INTEGER', description: 'Quantity (must be at least 1)' }
      },
      required: ['productId']
    }
  },
  {
    name: 'getWishlist',
    description: "Get the customer's saved wishlist items.",
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'addToWishlist',
    description: "Save a product to the customer's wishlist.",
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Product ID to save' }
      },
      required: ['productId']
    }
  },
  {
    name: 'getCustomerOrders',
    description: "Get recent orders placed by the authenticated customer.",
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Max orders to return (default 5)' }
      }
    }
  },
  {
    name: 'trackOrder',
    description: 'Retrieve real-time tracking status, estimated delivery, and timeline for an order.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderId: { type: 'STRING', description: 'Order ID to track (e.g., "ORD12345678")' }
      },
      required: ['orderId']
    }
  },
  {
    name: 'prepareCheckoutSummary',
    description: 'Prepare an order checkout summary for customer review before final confirmation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Product ID to buy, or omit to checkout current cart' },
        qty: { type: 'INTEGER', description: 'Quantity' },
        delivery: { type: 'STRING', enum: ['standard', 'express'], description: 'Delivery option' }
      }
    }
  },
  {
    name: 'saveDarwinSettings',
    description: 'Update customer Darwin assistant settings such as preferred AI model/engine, budget preference, voice input, suggested prompts, etc.',
    parameters: {
      type: 'OBJECT',
      properties: {
        aiProviderPreference: { type: 'STRING', enum: ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'], description: 'Preferred AI intelligence engine' },
        budgetPreference: { type: 'NUMBER', description: 'Customer shopping budget limit in INR' },
        voiceInputEnabled: { type: 'BOOLEAN', description: 'Enable or disable speech recognition voice input' },
        suggestedPromptsEnabled: { type: 'BOOLEAN', description: 'Enable or disable suggested prompts' }
      }
    }
  },
  {
    name: 'getDarwinSettings',
    description: 'View current Darwin assistant settings and preferences.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'updateCustomerProfile',
    description: 'Update customer personal account profile details such as name, phone number, gender, or date of birth.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Customer full name (e.g. "Anusha M")' },
        phone: { type: 'STRING', description: 'Customer phone number' },
        gender: { type: 'STRING', enum: ['male', 'female', 'other'], description: 'Customer gender' },
        dateOfBirth: { type: 'STRING', description: 'Customer date of birth (YYYY-MM-DD)' }
      }
    }
  },
  {
    name: 'getCustomerProfile',
    description: 'View current customer personal profile and account details (name, email, phone, wallet balance).',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'getSmartBuyDeal',
    description: 'Calculate the best possible price for a product after auto-applying eligible coupons and campaign promotions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Product ID to evaluate' }
      },
      required: ['productId']
    }
  },
  {
    name: 'addCustomerAddress',
    description: 'Add and save a new shipping/delivery address to the customer account address book in MongoDB. Can parse unstructured address queries with pincodes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        addressText: { type: 'STRING', description: 'Raw address text to parse (e.g. "pinathadivada denkada mandal 535006")' },
        addressLine1: { type: 'STRING', description: 'Street address, house number, area or colony' },
        addressLine2: { type: 'STRING', description: 'Apartment, suite, landmark (optional)' },
        city: { type: 'STRING', description: 'City, town, or mandal name' },
        state: { type: 'STRING', description: 'State name (e.g., Andhra Pradesh)' },
        pincode: { type: 'STRING', description: '6-digit postal pincode (e.g., 535006)' },
        fullName: { type: 'STRING', description: 'Contact person full name' },
        phone: { type: 'STRING', description: '10-digit mobile phone number' },
        type: { type: 'STRING', enum: ['home', 'work', 'other'], description: 'Address category' },
        isDefault: { type: 'BOOLEAN', description: 'Set as default shipping address' }
      }
    }
  },
  {
    name: 'getCustomerAddresses',
    description: 'List all saved delivery addresses in customer profile.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'updateCustomerAddress',
    description: 'Update an existing saved address by address ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        addressId: { type: 'STRING', description: 'ID of the address to update' },
        addressLine1: { type: 'STRING' },
        addressLine2: { type: 'STRING' },
        city: { type: 'STRING' },
        state: { type: 'STRING' },
        pincode: { type: 'STRING' },
        fullName: { type: 'STRING' },
        phone: { type: 'STRING' },
        type: { type: 'STRING', enum: ['home', 'work', 'other'] }
      },
      required: ['addressId']
    }
  },
  {
    name: 'deleteCustomerAddress',
    description: 'Remove/delete a delivery address from customer profile.',
    parameters: {
      type: 'OBJECT',
      properties: {
        addressId: { type: 'STRING', description: 'ID of the address to delete' }
      },
      required: ['addressId']
    }
  },
  {
    name: 'setDefaultAddress',
    description: 'Set a specific address as the default delivery address.',
    parameters: {
      type: 'OBJECT',
      properties: {
        addressId: { type: 'STRING', description: 'ID of the address to set as default' }
      },
      required: ['addressId']
    }
  }
];

const DARWIN_SYSTEM_INSTRUCTION = `
You are Darwin, the helpful, intelligent, and friendly AI shopping assistant for our e-commerce store.
Your goal is to help customers discover products, compare options, manage their cart & wishlist, track orders, update profile/settings, manage delivery addresses, and place orders smoothly.

CRITICAL RULES:
1. When recommending or searching, invoke the 'searchProducts', 'getTrendingProducts', or 'getTopRatedProducts' tools.
2. PRODUCT COMPARISON: When the customer asks to "compare", "compare these", "which is better", or "difference between":
   - Invoke the 'compareProducts' tool with the relevant product IDs.
   - In your text response, provide a thorough, structured comparison: highlight price difference, ratings, warranty, and key specifications.
   - EXPLICITLY GIVE A DEFINITIVE RECOMMENDATION / VERDICT on which product is better overall, and which is better for budget vs performance.
3. CUSTOMER ORDERS: When the customer asks for "my recent order", "past orders", or "order history", invoke the 'getCustomerOrders' tool. Keep your text brief (e.g. "Here are your recent orders. You can track or reorder any item below.") because interactive order cards are displayed directly.
4. ORDER TRACKING: When tracking a specific order, invoke 'trackOrder'.
5. PURCHASING & CHECKOUT: When the customer says "buy this", "checkout", "place order", or wants to purchase, invoke 'prepareCheckoutSummary' with the product ID or cart items so they can review shipping & payment and confirm with 1 click.
5b. SMART BUY: When recommending products, highlight the best available coupon and Smart Buy final price so customers know how much they save!
6. CRITICAL SETTINGS, PROFILE & ADDRESS ACCESS:
   - You HAVE direct access to view and update customer account settings, delivery addresses, and personal profile info!
   - When the user asks to add, save, or update their delivery address (e.g. "pinathadivada denkada mandal 535006 search for this address and add as my address", "add address...", "my new address is..."):
     YOU MUST INVOKE THE 'addCustomerAddress' TOOL IMMEDIATELY with the address text!
     NEVER hallucinate saying you updated or added the address without actually calling 'addCustomerAddress'.
   - When the user asks to view their addresses, invoke 'getCustomerAddresses'.
   - When the user asks to change their name (e.g. "change my name to Anusha", "my name is Anusha"), phone number, gender, or DOB, invoke 'updateCustomerProfile' immediately to make the change and confirm it warmly.
   - When the user asks to change Darwin settings (such as AI engine preference, budget threshold, voice input), invoke 'saveDarwinSettings' immediately and confirm the update.
   - NEVER say "I don't have access to account settings" or "To change your settings, open the app". You have the tools to do it directly!
7. CRITICAL FORMATTING & EMAIL DRAFTS:
   - Always respond in friendly, conversational natural language with clean Markdown formatting.
   - NEVER output raw JSON wrappers (like \`{"email": ...}\` or \`{"response": ...}\`) in your final message to the user!
   - If the user asks you to draft an email, letter, or message, format it directly in clean Markdown prose with a bold Subject line and proper paragraph spacing.
8. NEVER invent fake products, fake prices, ratings, stock, or tracking numbers. All data MUST come from your controlled tools.
9. Always keep responses friendly, helpful, and shopping-oriented.
10. NEVER ask the customer for MongoDB ObjectIds and NEVER display raw 24-character hexadecimal IDs (like 6aa69a82798f4285e3aab057) in your message. Always refer to products by their real product names and orders by customer-facing order IDs (e.g. #ORD-12345).
11. SMART ACTIVE DELIVERY ADDRESS & LOCATION AWARENESS:
    - You are aware of the customer's active delivery address currently selected in the store topbar/navbar.
    - When discussing shipping, local dark store fulfillment, or preparing checkout, ALWAYS prioritize this active navbar location!
    - If the user asks where their order will be delivered, state their active navbar address.
    - If the user asks to deliver elsewhere, invoke 'setDefaultAddress' or 'addCustomerAddress' to switch locations.
`;

/**
 * Executes a controlled tool based on validated arguments and authenticated customer identity.
 */
async function executeToolCall(name, args = {}, customerId = null, activeDeliveryAddress = null) {
  switch (name) {
    case 'searchProducts': {
      const prods = await darwinTools.searchProducts(args);
      return darwinTools.attachSmartBuyDealsToProducts(prods, customerId);
    }

    case 'getProductDetails': {
      const p = await darwinTools.getProductDetails(args);
      if (p) {
        const enriched = await darwinTools.attachSmartBuyDealsToProducts([p], customerId);
        return enriched[0] || p;
      }
      return p;
    }

    case 'getTrendingProducts': {
      const trending = await darwinTools.getTrendingProducts(args);
      return darwinTools.attachSmartBuyDealsToProducts(trending, customerId);
    }

    case 'getTopRatedProducts': {
      const topRated = await darwinTools.getTopRatedProducts(args);
      return darwinTools.attachSmartBuyDealsToProducts(topRated, customerId);
    }

    case 'compareProducts':
      return darwinTools.compareProducts(args);

    case 'getSimilarProducts': {
      const similar = await darwinTools.getSimilarProducts(args);
      return darwinTools.attachSmartBuyDealsToProducts(similar, customerId);
    }

    case 'getCart':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getCart({ customerId });

    case 'addToCart':
      if (!customerId) return { error: 'Customer must be logged in to add items to cart.' };
      return darwinTools.addToCart({
        customerId,
        productId: args.productId,
        qty: args.qty || 1
      });

    case 'getWishlist':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getWishlist({ customerId });

    case 'addToWishlist':
      if (!customerId) return { error: 'Customer must be logged in to add items to wishlist.' };
      return darwinTools.addToWishlist({
        customerId,
        productId: args.productId
      });

    case 'getCustomerOrders':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getCustomerOrders({ customerId, limit: args.limit || 5 });

    case 'trackOrder':
      if (!customerId) return { error: 'Customer must be logged in to track orders.' };
      return darwinTools.trackOrder({
        customerId,
        orderId: args.orderId
      });

    case 'prepareCheckoutSummary':
      if (!customerId) return { error: 'Customer must be logged in to checkout.' };
      return darwinTools.prepareCheckoutSummary({
        customerId,
        productId: args.productId,
        qty: args.qty || 1,
        addressId: args.addressId || null,
        delivery: args.delivery || 'standard',
        couponCode: args.couponCode || '',
        isSmartBuy: Boolean(args.isSmartBuy),
        activeDeliveryAddress
      });

    case 'getSmartBuyDeal':
      return darwinTools.calculateSmartBuyDeal({
        product: { _id: args.productId },
        customerId
      });

    case 'saveDarwinSettings':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.saveDarwinSettings({ customerId, settings: args });

    case 'getDarwinSettings':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getDarwinSettings({ customerId });

    case 'updateCustomerProfile':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.updateCustomerProfile({ customerId, ...args });

    case 'getCustomerProfile':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getCustomerProfile({ customerId });

    case 'addCustomerAddress':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.addCustomerAddress({ customerId, ...args });

    case 'getCustomerAddresses':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.getCustomerAddresses({ customerId });

    case 'updateCustomerAddress':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.updateCustomerAddress({ customerId, ...args });

    case 'deleteCustomerAddress':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.deleteCustomerAddress({ customerId, ...args });

    case 'setDefaultAddress':
      if (!customerId) return { error: 'Customer is not logged in.' };
      return darwinTools.setDefaultAddress({ customerId, ...args });

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Main chat handler:
 * - Uses Gemini when configured & healthy
 */
async function chatWithDarwin({
  message = '',
  customerId = null,
  conversationId = null,
  conversationHistory = [],
  currentProductContext = null,
  aiProviderPreference = null,
  compareProductIds = null,
  pageContext = null,
  activeDeliveryAddress = null
}) {
  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) {
    return {
      message: "Hi! I'm Darwin 👋 Tell me what you're looking for and I'll find the best options!",
      mode: 'system',
      suggestions: [
        'Trending products',
        'Last orders',
        'Hot deals',
        'This month bills'
      ]
    };
  }

  // Bound tool executor that includes activeDeliveryAddress
  const boundExecuteToolCall = (name, args) => executeToolCall(name, args, customerId, activeDeliveryAddress);

  // Auto-detect comparison queries and resolve product IDs from history if not passed directly
  const isCompareQuery = /(?:compare|which\s+(?:one\s+)?is\s+better|difference\s+between|versus|\bvs\b)/i.test(trimmedMessage);
  let effectiveCompareIds = Array.isArray(compareProductIds) && compareProductIds.length >= 2 ? compareProductIds : null;
  if (!effectiveCompareIds && isCompareQuery && Array.isArray(conversationHistory)) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const prev = conversationHistory[i];
      if (prev.structuredData?.products?.length >= 2) {
        effectiveCompareIds = prev.structuredData.products.slice(0, 3).map((p) => String(p._id || p.productId));
        break;
      }
    }
  }

  // Resolve preferred AI engine
  let preferredMode = aiProviderPreference;
  if (!preferredMode && customerId) {
    try {
      const custSettings = await DarwinSettings.findOne({ customerId }).lean();
      if (custSettings?.aiProviderPreference) {
        preferredMode = custSettings.aiProviderPreference;
      }
    } catch {}
  }
  if (!['gemini', 'openrouter', 'groq', 'cerebras', 'nlp'].includes(preferredMode)) {
    preferredMode = 'auto';
  }

  let responseData = null;

  // Option A: Direct Local NLP / Smart Search Mode
  if (preferredMode === 'nlp') {
    responseData = await processNlpQuery({
      message: trimmedMessage,
      customerId,
      currentProductContext,
      compareProductIds: effectiveCompareIds,
      conversationHistory,
      activeDeliveryAddress
    });
    responseData.mode = 'nlp';
  }

  // Option B: User explicitly chose Groq
  if (!responseData && preferredMode === 'groq') {
    if (isGroqConfigured()) {
      try {
        responseData = await chatWithGroq({
          message: trimmedMessage,
          customerId,
          conversationHistory,
          currentProductContext,
          compareProductIds: effectiveCompareIds,
          executeToolCall: boundExecuteToolCall
        });
      } catch (groqErr) {
        console.warn('[Darwin] Preferred Groq failed, falling forward:', groqErr.message);
      }
    }
  }

  // Option C: User explicitly chose Cerebras
  if (!responseData && preferredMode === 'cerebras') {
    if (isCerebrasConfigured()) {
      try {
        responseData = await chatWithCerebras({
          message: trimmedMessage,
          customerId,
          conversationHistory,
          currentProductContext,
          compareProductIds: effectiveCompareIds,
          executeToolCall: boundExecuteToolCall
        });
      } catch (cerebrasErr) {
        console.warn('[Darwin] Preferred Cerebras failed, falling forward:', cerebrasErr.message);
      }
    }
  }

  // Option D: User explicitly chose OpenRouter
  if (!responseData && preferredMode === 'openrouter') {
    if (isOpenRouterConfigured()) {
      try {
        responseData = await chatWithOpenRouter({
          message: trimmedMessage,
          customerId,
          conversationHistory,
          currentProductContext,
          compareProductIds: effectiveCompareIds,
          executeToolCall: boundExecuteToolCall
        });
      } catch (openRouterErr) {
        console.warn('[Darwin] Preferred OpenRouter failed, falling forward:', openRouterErr.message);
      }
    }
  }

  // Option E: Gemini preferred OR Auto Router (Gemini primary)
  if (!responseData && (preferredMode === 'gemini' || preferredMode === 'auto')) {
    const geminiAvailable = isGeminiConfigured();
    if (geminiAvailable) {
      try {
        const model = getGeminiModel();
        if (model) {
        // Build history for Gemini
        const historyParts = [];
        if (Array.isArray(conversationHistory)) {
          conversationHistory.slice(-8).forEach((h) => {
            if (h.role === 'user' || h.role === 'model') {
              historyParts.push({
                role: h.role,
                parts: [{ text: h.content || '' }]
              });
            }
          });
        }

        // Add system instruction & tool declarations to chat
        const chat = model.startChat({
          history: historyParts,
          tools: [{ functionDeclarations: DARWIN_TOOL_DECLARATIONS }],
          systemInstruction: {
            parts: [{ text: DARWIN_SYSTEM_INSTRUCTION }]
          }
        });

        // Contextual user message
        let promptWithContext = trimmedMessage;
        if (activeDeliveryAddress) {
          const locDesc = [activeDeliveryAddress.house, activeDeliveryAddress.area, activeDeliveryAddress.city, activeDeliveryAddress.state, activeDeliveryAddress.pincode].filter(Boolean).join(', ');
          promptWithContext += `\n[Active Delivery Location: The customer currently has selected "${locDesc || activeDeliveryAddress.formattedAddress || 'Selected Address'}" in the store topbar. SMART PRIORITY: Prioritize this active navbar address for shipping checks, fulfillment estimates, and conversational checkout unless the customer specifies otherwise.]`;
        }
        if (currentProductContext?.productId) {
          promptWithContext += `\n[User is currently viewing product ID: ${currentProductContext.productId}]`;
        }
        if (pageContext?.title || pageContext?.path) {
          promptWithContext += `\n[Context: The customer is currently on the "${pageContext.title || pageContext.path}" page in the store. Prioritize relevant decisions, operations, and actions for this screen.]`;
        }
        if (effectiveCompareIds && effectiveCompareIds.length >= 2) {
          promptWithContext += `\n[CRITICAL: The user wants to compare these exact product IDs: ${JSON.stringify(effectiveCompareIds)}. You MUST invoke the 'compareProducts' tool with productIds: ${JSON.stringify(effectiveCompareIds)}, provide a thorough specification comparison, and explicitly state which one is better overall, and which is better for budget vs performance.]`;
        }

        const initialResult = await chat.sendMessage(promptWithContext);
        const functionCalls = initialResult.response.functionCalls();

        let toolOutputData = null;
        let finalMessage = '';

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          const toolResult = await executeToolCall(call.name, call.args, customerId, activeDeliveryAddress);
          toolOutputData = { toolName: call.name, data: toolResult };

          // Send function execution response back to Gemini
          try {
            const secondResult = await chat.sendMessage([
              {
                functionResponse: {
                  name: call.name,
                  response: { result: toolResult }
                }
              }
            ]);
            finalMessage = secondResult.response.text();
          } catch (secondErr) {
            const synthPrompt = `The customer asked: "${promptWithContext}"\nExecuted tool "${call.name}" with arguments: ${JSON.stringify(call.args)}\nResult from store database: ${JSON.stringify(toolResult).slice(0, 4000)}\nSynthesize a warm, helpful, well-formatted response with prices in ₹.`;
            const synthRes = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: synthPrompt }] }],
              systemInstruction: { parts: [{ text: DARWIN_SYSTEM_INSTRUCTION }] }
            });
            finalMessage = synthRes.response.text();
          }
        } else {
          finalMessage = initialResult.response.text();
        }

        // Structure response fields based on tool output
        responseData = {
          message: finalMessage || "Here is what I found for you:",
          mode: 'gemini',
          products: [],
          comparison: null,
          order: null,
          orders: [],
          checkout: null,
          action: null,
          suggestions: ['Compare these', 'Show best deals', 'Trending products']
        };

        if (toolOutputData) {
          const { toolName, data } = toolOutputData;
          if (toolName === 'searchProducts' || toolName === 'getTrendingProducts' || toolName === 'getTopRatedProducts' || toolName === 'getSimilarProducts') {
            responseData.products = Array.isArray(data) ? data : [];
          } else if (toolName === 'getProductDetails' && data) {
            responseData.products = [data];
          } else if (toolName === 'compareProducts') {
            responseData.comparison = data;
            responseData.products = data?.products || [];
          } else if (toolName === 'trackOrder') {
            responseData.order = data;
          } else if (toolName === 'getCustomerOrders') {
            responseData.orders = Array.isArray(data) ? data : [];
            if (Array.isArray(data) && data.length > 0) {
              responseData.order = data[0];
            }
          } else if (toolName === 'prepareCheckoutSummary') {
            responseData.checkout = data;
          } else if (toolName === 'addToCart' || toolName === 'addToWishlist') {
            responseData.action = data;
          } else if (toolName === 'saveDarwinSettings') {
            responseData.action = { type: 'settings_updated', settings: data, success: true, message: 'Settings updated successfully!' };
          } else if (toolName === 'updateCustomerProfile') {
            responseData.action = { type: 'profile_updated', profile: data?.profile, success: true, message: data?.message || 'Profile updated successfully!' };
          } else if (toolName === 'getCart') {
            responseData.products = Array.isArray(data) ? data.map((c) => c.product).filter(Boolean) : [];
          }
        }

        // Safety fallback: if user asked to compare and we have product IDs but LLM didn't invoke tool
        if (isCompareQuery && effectiveCompareIds && effectiveCompareIds.length >= 2 && !responseData.comparison) {
          try {
            const comp = await darwinTools.compareProducts({ productIds: effectiveCompareIds });
            if (!comp.error && comp.products?.length >= 2) {
              responseData.comparison = comp;
              responseData.products = comp.products;
              if (!responseData.message || responseData.message.includes('Product ID') || responseData.message.includes('provide the')) {
                responseData.message = comp.verdict?.reason || comp.insight || `Here is a side-by-side comparison between **${comp.products[0].name}** and **${comp.products[1].name}**:`;
              }
            }
          } catch {}
        }

        // Safety fallback: if user asked for recent orders
        const isOrdersQuery = /(?:recent\s+orders?|my\s+orders?|show\s+orders?|order\s+history|past\s+orders?|latest\s+orders?|previous\s+orders?)/i.test(trimmedMessage);
        if (isOrdersQuery && customerId && (!responseData.orders || responseData.orders.length === 0)) {
          try {
            const orders = await darwinTools.getCustomerOrders({ customerId, limit: 5 });
            if (Array.isArray(orders) && orders.length > 0) {
              responseData.orders = orders;
              responseData.order = orders[0];
              responseData.message = `Here are your ${orders.length} recent orders:`;
            }
          } catch {}
        }

        // Safety fallback: if user wants to buy / checkout
        const isSmartBuyQuery = /(?:smart\s*buy|buy\s*(?:with\s*coupon|at\s*best\s*price)|best\s*price\s*buy|coupon\s*checkout)/i.test(trimmedMessage);
        const isCheckoutQuery = /(?:buy\s+(?:this|it|them|these|now)?|order\s+(?:this|it|them|these|now)?|checkout|proceed\s+to\s+checkout|place\s+(?:an?\s+|my\s+|the\s+)?ord(?:er|r)?)/i.test(trimmedMessage);
        if ((isSmartBuyQuery || isCheckoutQuery) && !responseData.checkout) {
          try {
            let targetProductId = currentProductContext?.productId || null;
            if (!targetProductId && effectiveCompareIds && effectiveCompareIds.length > 0) {
              targetProductId = effectiveCompareIds[0];
            }
            if (!targetProductId && responseData.products && responseData.products.length > 0) {
              targetProductId = responseData.products[0]._id;
            }

            if (customerId) {
              const summary = await darwinTools.prepareCheckoutSummary({
                customerId,
                productId: targetProductId,
                qty: 1,
                isSmartBuy: true
              });
              if (summary) {
                responseData.checkout = summary;
                const couponMsg = summary.couponCode
                  ? ` with coupon **${summary.couponCode}** applied (Saving ₹${summary.couponDiscount.toLocaleString('en-IN')})`
                  : '';
                responseData.message = isSmartBuyQuery
                  ? `⚡ **Smart Buy Activated**! Total: **₹${summary.total.toLocaleString('en-IN')}**${couponMsg}. Review details below and confirm:`
                  : `I have prepared your order checkout summary below. Please select your payment method and click Confirm to place your order:`;
              }
            } else if (targetProductId) {
              const deal = await darwinTools.calculateSmartBuyDeal({ productId: targetProductId });
              if (deal) {
                responseData.smartBuy = deal;
                responseData.message = deal.guideText || `Smart Buy: Available for ₹${deal.finalPrice.toLocaleString('en-IN')}. Sign in to complete your order!`;
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[Darwin] Gemini request failed, trying OpenRouter fallback:', err.message);
      responseData = null;
    }
  }
}

  // Tier 2: OpenRouter AI Fallback with live tool capabilities
  if (!responseData && isOpenRouterConfigured()) {
    try {
      responseData = await chatWithOpenRouter({
        message: trimmedMessage,
        customerId,
        conversationHistory,
        currentProductContext,
        compareProductIds: effectiveCompareIds,
        executeToolCall
      });
    } catch (openRouterErr) {
      console.warn('[Darwin] OpenRouter request failed, falling back to Groq:', openRouterErr.message);
      responseData = null;
    }
  }

  // Tier 3: Groq LPU AI Fallback with live tool capabilities
  if (!responseData && isGroqConfigured()) {
    try {
      responseData = await chatWithGroq({
        message: trimmedMessage,
        customerId,
        conversationHistory,
        currentProductContext,
        compareProductIds: effectiveCompareIds,
        executeToolCall
      });
    } catch (groqErr) {
      console.warn('[Darwin] Groq request failed, falling back to Cerebras:', groqErr.message);
      responseData = null;
    }
  }

  // Tier 4: Cerebras Wafer AI Fallback with live tool capabilities
  if (!responseData && isCerebrasConfigured()) {
    try {
      responseData = await chatWithCerebras({
        message: trimmedMessage,
        customerId,
        conversationHistory,
        currentProductContext,
        compareProductIds: effectiveCompareIds,
        executeToolCall
      });
    } catch (cerebrasErr) {
      console.warn('[Darwin] Cerebras request failed, falling back to Local NLP:', cerebrasErr.message);
      responseData = null;
    }
  }

  // Tier 5: Local Deterministic NLP Dispatcher Fallback
  if (!responseData) {
    responseData = await processNlpQuery({
      message: trimmedMessage,
      customerId,
      currentProductContext,
      compareProductIds: effectiveCompareIds,
      conversationHistory,
      activeDeliveryAddress
    });
  }

  // Final sanitization of outbound message from XML tags and ObjectIds
  if (responseData && responseData.message && typeof responseData.message === 'string') {
    responseData.message = responseData.message
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<function=[^>]+>[\s\S]*?(?:<\/function>|$)/gi, '')
      .replace(/<\/?(?:tool_call|function|parameter|arg_key|arg_value)[^>]*>/gi, '')
      .replace(/```(?:json)?\s*\{\s*"(?:name|function)"[\s\S]*?\}\s*```/gi, '')
      .replace(/(?:Product\s+)?ID:\s*[0-9a-fA-F]{24}/gi, '')
      .replace(/\([0-9a-fA-F]{24}\)/gi, '')
      .replace(/\b[0-9a-fA-F]{24}\b/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!responseData.message) {
      responseData.message = "Here is what I found for you:";
    }
  }

  // Ensure contextual suggestions are focused & relevant (3-4 items max)
  if (responseData) {
    const { getContextualSuggestions } = require('./darwin-nlp.service');
    const hasProducts = Boolean(
      (responseData.products && responseData.products.length > 0) ||
      responseData.comparison ||
      currentProductContext?.productId
    );
    const isCheckout = Boolean(responseData.checkout);
    const isOrder = Boolean(responseData.order || (responseData.orders && responseData.orders.length > 0));
    const lowerMsg = String(trimmedMessage || '').toLowerCase();

    if (isCheckout) {
      responseData.suggestions = getContextualSuggestions(false, 'checkout');
    } else if (responseData.comparison) {
      responseData.suggestions = getContextualSuggestions(true, 'comparison');
    } else if (hasProducts) {
      responseData.suggestions = getContextualSuggestions(true);
    } else if (isOrder || /(?:recent\s+orders?|my\s+orders?|track)/i.test(lowerMsg)) {
      responseData.suggestions = getContextualSuggestions(false, 'orders');
    } else if (/(?:bills?|monthly\s+spending)/i.test(lowerMsg)) {
      responseData.suggestions = getContextualSuggestions(false, 'bills');
    } else if (/(?:txn\s+payments?|transactions?|wallet)/i.test(lowerMsg)) {
      responseData.suggestions = getContextualSuggestions(false, 'payments');
    } else if (/(?:settings?|model|engine|switch)/i.test(lowerMsg)) {
      responseData.suggestions = getContextualSuggestions(false, 'settings');
    } else if (/(?:profile|my\s+details|name)/i.test(lowerMsg)) {
      responseData.suggestions = getContextualSuggestions(false, 'profile');
    } else {
      responseData.suggestions = getContextualSuggestions(false);
    }
  }

  // Save to persistent conversation history if customer is authenticated
  if (customerId) {
    try {
      const settings = await DarwinSettings.findOne({ customerId }).lean();
      if (!settings || settings.saveConversationsEnabled !== false) {
        let conv = null;
        if (conversationId) {
          conv = await DarwinConversation.findOne({
            _id: conversationId,
            $or: [{ userId: customerId }, { customerId }],
            isDeleted: { $ne: true }
          });
        }
        if (!conv) {
          const derivedTitle = trimmedMessage.slice(0, 36) || 'Shopping Chat';
          conv = await DarwinConversation.create({
            aiType: 'darwin',
            userId: customerId,
            userType: 'customer',
            customerId,
            title: derivedTitle,
            messages: []
          });
        }

        conv.messages.push({
          role: 'user',
          content: trimmedMessage,
          timestamp: new Date()
        });

        conv.messages.push({
          role: 'model',
          content: responseData.message,
          structuredData: {
            products: responseData.products,
            comparison: responseData.comparison,
            order: responseData.order,
            orders: responseData.orders,
            checkout: responseData.checkout,
            action: responseData.action,
            suggestions: responseData.suggestions
          },
          mode: responseData.mode,
          timestamp: new Date()
        });

        await conv.save();
        responseData.conversationId = String(conv._id);
      }
    } catch (saveErr) {
      console.warn('[Darwin] Could not save conversation:', saveErr.message);
    }
  }

  return responseData;
}

/**
 * Direct action execution (e.g., clicking Add to Cart on Darwin product card)
 */
async function executeDirectAction({ action, payload = {}, customerId }) {
  if (!customerId) {
    throw new Error('Please sign in to perform this action.');
  }

  switch (action) {
    case 'addToCart':
      return darwinTools.addToCart({
        customerId,
        productId: payload.productId,
        qty: payload.qty || 1
      });

    case 'removeFromCart':
      return darwinTools.removeFromCart({
        customerId,
        productId: payload.productId
      });

    case 'addToWishlist':
      return darwinTools.addToWishlist({
        customerId,
        productId: payload.productId
      });

    case 'removeFromWishlist':
      return darwinTools.removeFromWishlist({
        customerId,
        productId: payload.productId
      });

    case 'prepareCheckout':
      return darwinTools.prepareCheckoutSummary({
        customerId,
        productId: payload.productId || null,
        qty: payload.qty || 1,
        addressId: payload.addressId || null,
        delivery: payload.delivery || 'standard',
        paymentMethod: payload.paymentMethod || 'wallet',
        couponCode: payload.couponCode || '',
        isSmartBuy: Boolean(payload.isSmartBuy),
        activeDeliveryAddress: payload.activeDeliveryAddress || null
      });

    case 'confirmOrder': {
      // Normalize paymentMethod
      const validMethods = ['upi', 'wallet', 'cod', 'card', 'netbanking'];
      const rawMethod = String(payload.paymentMethod || 'upi').toLowerCase();
      const sanitizedMethod = validMethods.includes(rawMethod) ? rawMethod : 'upi';

      let chosenAddressId = payload.addressId;
      if (!chosenAddressId) {
        const defaultAddr = await darwinTools.getDefaultAddress({
          customerId,
          activeDeliveryAddress: payload.activeDeliveryAddress || null
        });
        if (defaultAddr?._id) {
          chosenAddressId = String(defaultAddr._id);
        }
      }

      // Calls existing checkoutCart in cart.service with customer ID
      const reqMock = {
        customerId,
        customer: { _id: customerId },
        body: {
          addressId: chosenAddressId,
          delivery: payload.delivery || 'standard',
          deliveryMethod: payload.delivery || 'standard',
          paymentMethod: sanitizedMethod,
          couponCode: payload.couponCode || '',
          items: Array.isArray(payload.items) ? payload.items : undefined
        }
      };

      let responsePayload = null;
      let responseStatusCode = 200;

      const resMock = {
        status(code) {
          responseStatusCode = code;
          return this;
        },
        json(data) {
          responsePayload = data;
          return this;
        }
      };

      const cartService = require('./cart.service');
      await cartService.checkoutCart(reqMock, resMock);

      if (responseStatusCode >= 400) {
        throw new Error(responsePayload?.msg || 'Could not place order.');
      }

      return {
        success: true,
        order: responsePayload?.order || (Array.isArray(responsePayload?.orders) ? responsePayload.orders[0] : responsePayload),
        orders: responsePayload?.orders || [],
        message: 'Order placed successfully!'
      };
    }

    default:
      throw new Error(`Unsupported Darwin action: ${action}`);
  }
}

/**
 * Suggestions for welcome state & quick prompts
 */
async function getStarterSuggestions() {
  const categories = await darwinTools.getAvailableCategories();
  const geminiReady = isGeminiConfigured();
  const openRouterReady = isOpenRouterConfigured();
  const groqReady = isGroqConfigured();
  const cerebrasReady = isCerebrasConfigured();
  const activeMode = geminiReady ? 'gemini' : (openRouterReady ? 'openrouter' : (groqReady ? 'groq' : (cerebrasReady ? 'cerebras' : 'nlp')));

  return {
    providerStatus: {
      geminiAvailable: geminiReady,
      openrouterAvailable: openRouterReady,
      groqAvailable: groqReady,
      cerebrasAvailable: cerebrasReady,
      activeMode
    },
    quickPrompts: [
      'Trending products',
      'Last orders',
      'Hot deals',
      'This month bills',
      'Change settings'
    ],
    categories: categories.slice(0, 8),
    useCases: [
      { id: 'trending', title: 'Trending products', query: 'Show trending products', icon: 'Sparkles' },
      { id: 'orders', title: 'Last orders', query: 'Show last orders', icon: 'Truck' },
      { id: 'bills', title: 'This month bills', query: 'Show this month bills', icon: 'FileText' },
      { id: 'payments', title: 'Txn payments', query: 'Show txn payments', icon: 'CreditCard' },
      { id: 'details', title: 'My details', query: 'Show my details', icon: 'User' },
      { id: 'recomms', title: 'Recommended products', query: 'Show recommended products', icon: 'Sparkles' },
      { id: 'deals', title: 'Hot deals', query: 'Show hot deals', icon: 'Percent' },
      { id: 'discounts', title: 'Big discounts', query: 'Show big discounts', icon: 'Tag' },
      { id: 'address', title: 'Add address', query: 'Add address', icon: 'MapPin' },
      { id: 'methods', title: 'Payment methods', query: 'Show payment methods', icon: 'Wallet' },
      { id: 'settings', title: 'Change settings', query: 'Change settings', icon: 'Settings' },
      { id: 'notifs', title: 'Recent notifications', query: 'Show recent notifications', icon: 'Bell' },
      { id: 'ticket', title: 'Create a ticket', query: 'Create a ticket', icon: 'LifeBuoy' }
    ]
  };
}

module.exports = {
  chatWithDarwin,
  executeDirectAction,
  getStarterSuggestions
};

