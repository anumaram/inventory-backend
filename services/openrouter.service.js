/**
 * OpenRouter Fallback AI Service
 * Standard OpenAI-compatible client providing secondary AI fallback with tool calling
 */

const {
  OPENROUTER_API_URL,
  DEFAULT_MODELS,
  getOpenRouterApiKey,
  isOpenRouterConfigured
} = require('../config/openrouter.config');
const {
  GROQ_API_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_FALLBACK_MODELS,
  getGroqApiKey,
  isGroqConfigured
} = require('../config/groq.config');
const {
  CEREBRAS_API_URL,
  CEREBRAS_DEFAULT_MODEL,
  CEREBRAS_FALLBACK_MODELS,
  getCerebrasApiKey,
  isCerebrasConfigured
} = require('../config/cerebras.config');

// OpenAI-compatible tool specifications for Darwin
const OPENROUTER_DARWIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'searchProducts',
      description: 'Search for products in the catalog by query, category, price range, or rating.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords like "running shoes", "laptops", "black shirt"' },
          category: { type: 'string', description: 'Specific category name' },
          minPrice: { type: 'number', description: 'Minimum price in INR' },
          maxPrice: { type: 'number', description: 'Maximum price/budget in INR' },
          sort: {
            type: 'string',
            enum: ['rating', 'price_asc', 'price_desc', 'trending', 'newest'],
            description: 'Sorting criteria'
          },
          limit: { type: 'integer', description: 'Max items to return (capped at 10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductDetails',
      description: 'Get full product details by MongoDB product ID.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Valid MongoDB product ID' }
        },
        required: ['productId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTrendingProducts',
      description: 'Get top trending and popular products.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Number of items (max 10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopRatedProducts',
      description: 'Get top customer rated products.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional category name filter' },
          limit: { type: 'integer', description: 'Max items' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compareProducts',
      description: 'Compare 2 or 3 products side-by-side by specifications and price.',
      parameters: {
        type: 'object',
        properties: {
          productIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of 2 to 3 valid product IDs'
          }
        },
        required: ['productIds']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSimilarProducts',
      description: 'Find products similar to a given product ID.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Source product ID' },
          limit: { type: 'integer', description: 'Max items' }
        },
        required: ['productId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAvailableCategories',
      description: 'List all available product categories in the catalog.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCart',
      description: 'Retrieve current customer shopping cart items.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addToCart',
      description: 'Add a product to customer cart.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID' },
          qty: { type: 'integer', description: 'Quantity (default 1)' }
        },
        required: ['productId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getWishlist',
      description: 'Get customer saved wishlist items.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addToWishlist',
      description: 'Save a product to customer wishlist.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID' }
        },
        required: ['productId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCustomerOrders',
      description: 'Get recent orders for the customer.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max orders' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'trackOrder',
      description: 'Look up live delivery and tracking status of an order by order ID or display number.',
      parameters: {
        type: 'object',
        properties: {
          orderIdentifier: { type: 'string', description: 'Order ID or display ID like ORD-12345' }
        },
        required: ['orderIdentifier']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'prepareCheckoutSummary',
      description: 'Prepare in-chat checkout summary with address, delivery option, and pricing breakdown.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Optional specific product ID for direct Buy Now' },
          qty: { type: 'integer', description: 'Quantity' },
          addressId: { type: 'string', description: 'Selected delivery address ID' },
          delivery: { type: 'string', enum: ['standard', 'express'], description: 'Delivery option' },
          paymentMethod: { type: 'string', enum: ['wallet', 'online', 'cod'], description: 'Payment method' },
          couponCode: { type: 'string', description: 'Optional coupon code or "AUTO_BEST" for best available coupon discount' },
          isSmartBuy: { type: 'boolean', description: 'Whether this checkout is a Smart Buy auto-applying the maximum discount coupon' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSmartBuyDeal',
      description: 'Calculate the Smart Buy price for a product after auto-applying all eligible coupons and promotional campaigns.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'Product ID to compute smart buy deal for' },
          query: { type: 'string', description: 'Optional product name or search keywords' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveDarwinSettings',
      description: 'Update customer Darwin assistant settings such as preferred AI model/engine, budget preference, voice input, suggested prompts, etc.',
      parameters: {
        type: 'object',
        properties: {
          aiProviderPreference: { type: 'string', enum: ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'], description: 'Preferred AI intelligence engine' },
          budgetPreference: { type: 'number', description: 'Customer shopping budget limit in INR' },
          voiceInputEnabled: { type: 'boolean', description: 'Enable or disable speech recognition voice input' },
          suggestedPromptsEnabled: { type: 'boolean', description: 'Enable or disable suggested prompts' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDarwinSettings',
      description: 'View current Darwin assistant settings and preferences.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateCustomerProfile',
      description: 'Update customer personal account profile details such as name, phone number, gender, or date of birth.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer full name (e.g. "Anusha M")' },
          phone: { type: 'string', description: 'Customer phone number' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], description: 'Customer gender' },
          dateOfBirth: { type: 'string', description: 'Customer date of birth (YYYY-MM-DD)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCustomerProfile',
      description: 'View current customer personal profile and account details (name, email, phone, wallet balance).',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

const DARWIN_SYSTEM_PROMPT = `You are Darwin, the expert AI shopping assistant for our e-commerce platform.
Your mission is to understand user shopping goals, search real catalog items using your tools, recommend matching products with reasons, compare specs side-by-side, assist with cart/wishlist, track orders, and update account/Darwin settings.

RULES:
1. Always use tools to look up real products, prices, and stock before making recommendations. NEVER fabricate or hallucinate products or prices.
2. Prices are strictly in Indian Rupees (₹).
3. When users ask for a category or budget (e.g. "shoes under 2000"), call searchProducts with maxPrice and query.
4. When users ask to compare products, call compareProducts. Provide a thorough side-by-side comparison and explicitly recommend which one is better and why.
5. When users ask to track an order or view recent orders, call the respective tool.
6. CRITICAL SETTINGS & PROFILE ACCESS:
   - You HAVE direct access to view and update customer account settings and personal profile info!
   - When the user asks to change their name (e.g. "change my name to Anusha", "my name is Anusha"), phone number, gender, or DOB, call 'updateCustomerProfile' immediately to make the change and confirm it warmly.
   - When the user asks to change Darwin settings (such as AI engine preference, budget threshold, voice input), call 'saveDarwinSettings' immediately and confirm the update.
   - NEVER say "I don't have access to account settings" or "To change your settings, open the app". You have the tools to do it directly!
7. CRITICAL FORMATTING & EMAIL DRAFTS:
   - Always respond in friendly, conversational natural language with clean Markdown formatting.
   - NEVER output raw JSON wrappers (like \`{"email": ...}\` or \`{"response": ...}\`) in your final message to the user!
   - If the user asks you to draft an email, letter, or message, format it directly in clean Markdown prose with a bold Subject line and proper paragraph spacing.
8. NEVER ask the user for MongoDB ObjectIds and NEVER display raw 24-character hexadecimal IDs (like 6aa69a82798f4285e3aab057) to the customer. Always refer to products by their real product names and orders by their customer-facing order IDs (e.g. #ORD-12345).
9. Keep your spoken explanations concise, friendly, and helpful. Always summarize the best match or highlight why a product fits their requirements.
10. SMART BUY & BEST PRICE: When users ask for "smart buy", "best price", "buy with coupon", or how to get the maximum discount on an item, calculate the best deal with 'getSmartBuyDeal' or prepare checkout with 'isSmartBuy: true'. Mention the final price, coupon code, and total savings clearly.`;

/**
 * Parse tool calls when models return tool invocations inside message text
 * Supports XML formats:
 * 1. <function=searchProducts><parameter=query>one8 shoes</parameter></function>
 * 2. <tool_call>searchProducts<arg_key>query</arg_key><arg_value>one8 shoes</arg_value></tool_call>
 * 3. <tool_call>{"name": "searchProducts", "arguments": {"query": "one8 shoes"}}</tool_call>
 */
function parseToolCallFromText(content) {
  if (!content || typeof content !== 'string') return null;

  // 1. JSON inside <tool_call> or markdown code block
  const jsonMatch =
    content.match(/<tool_call>[\s\r\n]*(\{[\s\S]*?\})[\s\r\n]*<\/tool_call>/i) ||
    content.match(/```(?:json)?\s*(\{\s*"(?:name|function)"[\s\S]*?\})\s*```/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const toolName = parsed.name || parsed.function?.name || parsed.function;
      let toolArgs = parsed.arguments || parsed.parameters || {};
      if (typeof toolArgs === 'string') {
        try { toolArgs = JSON.parse(toolArgs); } catch {}
      }
      if (toolName) return { toolName, toolArgs };
    } catch {}
  }

  // 2. Format: <function=name> <parameter=key>value</parameter> ... </function>
  const fnMatch = content.match(/<function=([a-zA-Z0-9_-]+)>([\s\S]*?)(?:<\/function>|<\/tool_call>|$)/i);
  if (fnMatch) {
    const toolName = fnMatch[1];
    const paramBlock = fnMatch[2];
    const toolArgs = {};
    const paramRegex = /<parameter=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/parameter>/gi;
    let pMatch;
    while ((pMatch = paramRegex.exec(paramBlock)) !== null) {
      const key = pMatch[1];
      let val = pMatch[2].trim();
      if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
      else if (val === 'true') val = true;
      else if (val === 'false') val = false;
      toolArgs[key] = val;
    }
    return { toolName, toolArgs };
  }

  // 3. Format: <tool_call>searchProducts<arg_key>query</arg_key><arg_value>one8 shoes</arg_value></tool_call>
  const toolCallMatch = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
  if (toolCallMatch) {
    const inner = toolCallMatch[1].trim();
    const nameMatch = inner.match(/^([a-zA-Z0-9_-]+)/);
    if (nameMatch) {
      const toolName = nameMatch[1];
      const toolArgs = {};
      const kvRegex = /<arg_key>([a-zA-Z0-9_-]+)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/gi;
      let kvMatch;
      while ((kvMatch = kvRegex.exec(inner)) !== null) {
        const key = kvMatch[1];
        let val = kvMatch[2].trim();
        if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        toolArgs[key] = val;
      }
      return { toolName, toolArgs };
    }
  }

  return null;
}

/**
 * Strips tool calling tags, internal artifacts, and MongoDB ObjectIds from user-facing text
 */
function stripToolCallArtifacts(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function=[^>]+>[\s\S]*?(?:<\/function>|$)/gi, '')
    .replace(/<\/?(?:tool_call|function|parameter|arg_key|arg_value)[^>]*>/gi, '')
    .replace(/```(?:json)?\s*\{\s*"(?:name|function)"[\s\S]*?\}\s*```/gi, '')
    .replace(/(?:Product\s+)?ID:\s*[0-9a-fA-F]{24}/gi, '')
    .replace(/\([0-9a-fA-F]{24}\)/gi, '')
    .replace(/\b[0-9a-fA-F]{24}\b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getDefaultMessageForTool(toolName, data) {
  switch (toolName) {
    case 'searchProducts':
    case 'getTrendingProducts':
    case 'getTopRatedProducts':
    case 'getSimilarProducts':
      return 'Here are the best matching products from our catalog:';
    case 'compareProducts':
      return data?.verdict?.reason || data?.insight || 'Here is the side-by-side comparison and recommendation:';
    case 'getCustomerOrders':
      return 'Here are your recent orders. You can track status or view details below:';
    case 'trackOrder':
      return 'Here is the current tracking status for your order:';
    case 'prepareCheckoutSummary':
      return 'I have prepared your order checkout summary below. Please review details to confirm:';
    case 'addToCart':
      return "Great! I've added this item to your cart.";
    case 'addToWishlist':
      return 'Added this item to your wishlist!';
    case 'getSmartBuyDeal':
      return 'Here is the Smart Buy deal with the maximum discount coupon applied:';
    default:
      return 'Here is what I found for you:';
  }
}

/**
 * Universal Darwin OpenAI-Compatible Chat Execution Engine
 * Powers OpenRouter (Tier 2), Groq (Tier 3), and Cerebras (Tier 4)
 */
async function chatWithDarwinOpenAiEngine({
  provider = 'openrouter',
  apiUrl = OPENROUTER_API_URL,
  apiKey,
  defaultModel = 'openrouter/free',
  fallbackModels = DEFAULT_MODELS,
  extraHeaders = {},
  message = '',
  customerId = null,
  conversationHistory = [],
  currentProductContext = null,
  compareProductIds = null,
  executeToolCall
}) {
  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY is not configured`);
  }

  // Construct message array
  const messages = [
    { role: 'system', content: DARWIN_SYSTEM_PROMPT }
  ];

  // Add past conversation context
  if (Array.isArray(conversationHistory)) {
    conversationHistory.slice(-6).forEach((msg) => {
      if (msg.content) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: String(msg.content)
        });
      }
    });
  }

  let userPrompt = message;
  if (currentProductContext?.name) {
    userPrompt = `[Context: User is currently viewing product "${currentProductContext.name}" priced at ₹${currentProductContext.price || 0}, Category: ${currentProductContext.category || 'General'}]\n\n${userPrompt}`;
  }
  if (Array.isArray(compareProductIds) && compareProductIds.length >= 2) {
    userPrompt += `\n[CRITICAL: The user wants to compare these exact product IDs: ${JSON.stringify(compareProductIds)}. Invoke compareProducts with productIds: ${JSON.stringify(compareProductIds)} and provide a thorough spec comparison and definitive winner recommendation.]`;
  }
  messages.push({ role: 'user', content: userPrompt });

  const modelsToTry = [defaultModel, ...fallbackModels.filter((m) => m && m !== defaultModel)];
  let choiceMessage = null;
  let activeModelUsed = defaultModel;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const curModel = modelsToTry[mIdx];
    try {
      const requestBody = {
        model: curModel,
        messages,
        tools: OPENROUTER_DARWIN_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2
      };

      if (provider === 'openrouter' && Array.isArray(fallbackModels) && fallbackModels.length > 0) {
        requestBody.models = fallbackModels;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(6500)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Darwin:${provider}] Model ${curModel} failed (${response.status}):`, errorText.slice(0, 160));
        if (mIdx < modelsToTry.length - 1 && (response.status === 404 || response.status === 400 || response.status === 422 || response.status === 429)) {
          continue;
        }
        throw new Error(`${provider} API error (${response.status}): ${errorText.slice(0, 160)}`);
      }

      const responseJson = await response.json();
      const choice = responseJson.choices && responseJson.choices[0];
      if (choice?.message) {
        choiceMessage = choice.message;
        activeModelUsed = curModel;
        break;
      }
    } catch (modelErr) {
      console.warn(`[Darwin:${provider}] Error with model ${curModel}:`, modelErr.message);
      if (mIdx < modelsToTry.length - 1) continue;
      throw modelErr;
    }
  }

  if (!choiceMessage) {
    throw new Error(`Invalid or empty response from ${provider}`);
  }

  let toolOutputData = null;
  let finalMessageText = choiceMessage.content || '';

  // Check 1: OpenAI standard tool_calls array
  if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
    const call = choiceMessage.tool_calls[0];
    const toolName = call.function.name;
    let toolArgs = {};
    try {
      toolArgs = typeof call.function.arguments === 'string'
        ? JSON.parse(call.function.arguments)
        : (call.function.arguments || {});
    } catch {
      toolArgs = {};
    }

    const toolResult = await executeToolCall(toolName, toolArgs, customerId);
    toolOutputData = { toolName, data: toolResult };

    // Send tool result back to synthesize answer
    messages.push(choiceMessage);
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(toolResult)
    });

    try {
      const secBody = {
        model: activeModelUsed,
        messages,
        temperature: 0.3
      };
      if (provider === 'openrouter' && Array.isArray(fallbackModels) && fallbackModels.length > 0) {
        secBody.models = fallbackModels;
      }

      const secondResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders
        },
        body: JSON.stringify(secBody),
        signal: AbortSignal.timeout(6500)
      });

      if (secondResponse.ok) {
        const secondJson = await secondResponse.json();
        const secondChoice = secondJson.choices && secondJson.choices[0];
        if (secondChoice?.message?.content) {
          finalMessageText = secondChoice.message.content;
        }
      }
    } catch (secErr) {
      console.warn(`[Darwin:${provider}] second pass error:`, secErr.message);
    }
  } else {
    // Check 2: models emitting tool call inside content as XML/text
    const parsedTextTool = parseToolCallFromText(choiceMessage.content);
    if (parsedTextTool) {
      try {
        const toolResult = await executeToolCall(parsedTextTool.toolName, parsedTextTool.toolArgs, customerId);
        toolOutputData = { toolName: parsedTextTool.toolName, data: toolResult };
      } catch (toolExecErr) {
        console.warn(`[Darwin:${provider}] text-parsed tool execution error:`, toolExecErr.message);
      }
    }
  }

  // Clean final text of all XML tags, tool-call leaks, and ObjectIds
  finalMessageText = stripToolCallArtifacts(finalMessageText);

  // If text became empty or was only the tool call, use a natural fallback
  if (!finalMessageText && toolOutputData) {
    finalMessageText = getDefaultMessageForTool(toolOutputData.toolName, toolOutputData.data);
  }

  // Format response data matching Darwin's standard structure
  const responseData = {
    message: finalMessageText || 'Here is what I found for you:',
    mode: provider,
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
    if (
      toolName === 'searchProducts' ||
      toolName === 'getTrendingProducts' ||
      toolName === 'getTopRatedProducts' ||
      toolName === 'getSimilarProducts'
    ) {
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
    } else if (toolName === 'getSmartBuyDeal' && data) {
      responseData.smartBuy = data;
      if (data.product) {
        responseData.products = [data.product];
      }
    }
  }

  // Safety fallback: if user asked to compare and we have product IDs but LLM didn't invoke tool
  const isCompareQuery = /(?:compare|which\s+(?:one\s+)?is\s+better|difference\s+between|versus|\bvs\b)/i.test(message);
  if (isCompareQuery && Array.isArray(compareProductIds) && compareProductIds.length >= 2 && !responseData.comparison) {
    try {
      const darwinTools = require('./darwin-tools.service');
      const comp = await darwinTools.compareProducts({ productIds: compareProductIds });
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
  const isOrdersQuery = /(?:recent\s+orders?|my\s+orders?|show\s+orders?|order\s+history|past\s+orders?|latest\s+orders?|previous\s+orders?)/i.test(message);
  if (isOrdersQuery && customerId && (!responseData.orders || responseData.orders.length === 0)) {
    try {
      const darwinTools = require('./darwin-tools.service');
      const orders = await darwinTools.getCustomerOrders({ customerId, limit: 5 });
      if (Array.isArray(orders) && orders.length > 0) {
        responseData.orders = orders;
        responseData.order = orders[0];
        responseData.message = `Here are your ${orders.length} recent orders:`;
      }
    } catch {}
  }

  // Safety fallback: if user asked for smart buy or checkout
  const isSmartBuyQuery = /(?:smart\s*buy|buy\s*(?:with\s*coupon|at\s*best\s*price)|best\s*price\s*buy|coupon\s*checkout)/i.test(message);
  const isCheckoutQuery = /(?:buy\s+(?:this|it|them|these|now)?|order\s+(?:this|it|them|these|now)?|checkout|proceed\s+to\s+checkout|place\s+(?:an?\s+|my\s+|the\s+)?ord(?:er|r)?)/i.test(message);

  if ((isSmartBuyQuery || isCheckoutQuery) && !responseData.checkout) {
    try {
      const darwinTools = require('./darwin-tools.service');
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
            : 'I have prepared your order checkout summary below. Please review details and confirm:';
        }
      } else if (targetProductId) {
        const deal = await darwinTools.calculateSmartBuyDeal({ productId: targetProductId });
        if (deal) {
          responseData.smartBuy = deal;
          responseData.message = deal.guideText || `Smart Buy: Available for ₹${deal.finalPrice.toLocaleString('en-IN')}. Sign in to complete your order!`;
        }
      }
    } catch (checkoutFallbackErr) {
      console.warn(`[Darwin:${provider}] checkout fallback error:`, checkoutFallbackErr.message);
    }
  }

  // Set focused contextual suggestions (3-4 items max)
  const { getContextualSuggestions } = require('./darwin-nlp.service');
  const hasProducts = Boolean(
    (responseData.products && responseData.products.length > 0) ||
    responseData.comparison ||
    currentProductContext?.productId
  );
  const isCheckout = Boolean(responseData.checkout);
  const isOrder = Boolean(responseData.order || (responseData.orders && responseData.orders.length > 0));
  const lowerMsg = String(message || '').toLowerCase();

  if (isCheckout) {
    responseData.suggestions = getContextualSuggestions(false, 'checkout');
  } else if (responseData.comparison) {
    responseData.suggestions = getContextualSuggestions(true, 'comparison');
  } else if (hasProducts) {
    responseData.suggestions = getContextualSuggestions(true);
  } else if (isOrder || isOrdersQuery) {
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

  return responseData;
}

/**
 * Tier 2: OpenRouter Gateway
 */
async function chatWithOpenRouter(args) {
  return await chatWithDarwinOpenAiEngine({
    provider: 'openrouter',
    apiUrl: OPENROUTER_API_URL,
    apiKey: getOpenRouterApiKey(),
    defaultModel: 'openrouter/free',
    fallbackModels: DEFAULT_MODELS,
    extraHeaders: {
      'HTTP-Referer': 'https://inventory-app.local',
      'X-Title': 'Darwin AI Shopping Assistant'
    },
    ...args
  });
}

/**
 * Tier 3: Groq LPU Cloud (High-speed LPU inference)
 */
async function chatWithGroq(args) {
  return await chatWithDarwinOpenAiEngine({
    provider: 'groq',
    apiUrl: GROQ_API_URL,
    apiKey: getGroqApiKey(),
    defaultModel: GROQ_DEFAULT_MODEL,
    fallbackModels: GROQ_FALLBACK_MODELS,
    ...args
  });
}

/**
 * Tier 4: Cerebras Wafer Cloud (Wafer-scale high-throughput inference)
 */
async function chatWithCerebras(args) {
  return await chatWithDarwinOpenAiEngine({
    provider: 'cerebras',
    apiUrl: CEREBRAS_API_URL,
    apiKey: getCerebrasApiKey(),
    defaultModel: CEREBRAS_DEFAULT_MODEL,
    fallbackModels: CEREBRAS_FALLBACK_MODELS,
    ...args
  });
}

module.exports = {
  chatWithOpenRouter,
  chatWithGroq,
  chatWithCerebras,
  chatWithDarwinOpenAiEngine,
  OPENROUTER_DARWIN_TOOLS
};

