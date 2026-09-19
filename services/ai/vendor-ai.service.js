/**
 * Vendor AI Service (Atlas)
 * Handles Vendor AI Chat, Executive Dashboard Summaries, and AI Copywriting
 */

const { executeAiChat } = require('./ai-core.service');
const vendorTools = require('./vendor-tools.service');
const { vendorNlpDispatcher, VENDOR_DEFAULT_SUGGESTIONS } = require('./vendor-nlp.service');

const ATLAS_SYSTEM_PROMPT = `
You are Atlas, the AI Business and Inventory Assistant for store owners on the Inventory platform.
Your mission is to help vendors optimize their catalog, increase revenue, avoid stockouts, adjust prices, manage inventory levels, and liquidate dead inventory.

GUIDELINES:
1. Always be professional, concise, proactive, and data-driven.
2. Format currency in Indian Rupees (e.g., ₹1,499) with proper commas.
3. NEVER hallucinate metrics, prices, or sales numbers. Use the provided tools to query real business data.
4. When identifying low stock or dead stock, recommend clear actionable next steps (e.g. restock quantities, discounts).
5. Always provide friendly markdown formatting with bold headers and bullet points.

OPERATIONAL ACTIONS:
- If the vendor asks to change or update their name (e.g. "change my name to Jsai ventory"), store name, or phone number, call 'updateVendorProfile' immediately.
- If the vendor asks to view their profile, call 'getVendorProfile'.
- If the vendor asks to update AI settings, provider preference (Gemini, Groq, Cerebras, OpenRouter, Auto), reorder threshold, or dead stock days, call 'updateAtlasSettings'.
- If the vendor asks to update stock or restock a product, call 'updateProductStock'.
- If the vendor asks to change or update product price or discount, call 'updateProductPrice'.
- If the vendor asks for details or SKU info on a product, call 'getProductDetails'.
- If the vendor asks to view or inspect store operational settings, courier partner, dispatch time, return window, free shipping threshold, bank details, or UPI, call 'getVendorStoreSettings'.
- If the vendor asks to update store operational settings (e.g. dispatch time, courier partner, free shipping threshold, return window, warranty, bank account, IFSC, UPI), call 'updateVendorStoreSettings'.
- If the vendor asks to check their payouts, wallet earnings, commission deducted, or available withdrawal balance, call 'getVendorPayoutsAndEarnings'.
- If the vendor asks to withdraw or request a payout (e.g. "withdraw ₹5,000" or "request payout of 2000"), call 'requestVendorPayout'.
- If the vendor asks for sales analytics or revenue breakdown, call 'getVendorSalesAnalytics'.
- If the vendor asks for recent alerts or notifications, call 'getVendorNotifications'.
`.trim();

const ATLAS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getVendorSalesAnalysis',
      description: 'Analyze vendor sales, revenue, order count, and trends over a given timeframe (7d, 30d, 90d).',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['7d', '30d', '90d'],
            description: 'Timeframe for analysis. Defaults to 30d.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorInventoryHealth',
      description: 'Check inventory stock health: identify out-of-stock items, critical items (<=5 units), and warning items (<=15 units).',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorDemandForecast',
      description: 'Predict which products will deplete within 7, 14, or 30 days based on recent sales velocity.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorBestSellers',
      description: 'Retrieve the vendor top selling and highest revenue generating products.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorDeadStock',
      description: 'Identify slow-moving or dead stock products with zero sales in the past 30 days and calculate locked capital.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorPricingInsights',
      description: 'Compare product prices against category averages to suggest margin and price optimizations.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorReviewsSentiment',
      description: 'Analyze customer ratings, positive review themes, and common areas of improvement.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorOrdersOverview',
      description: 'Check status of pending orders, packed orders, and delivery fulfillment.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorProfile',
      description: 'Get vendor store profile details (name, store/business name, email, phone).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateVendorProfile',
      description: 'Update vendor profile name, business/store name, or contact phone.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'New owner/account name' },
          businessName: { type: 'string', description: 'New store or business name' },
          phone: { type: 'string', description: 'New contact phone number' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAtlasSettings',
      description: 'Retrieve Atlas AI configuration and preference settings.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateAtlasSettings',
      description: 'Update Atlas AI settings such as aiProviderPreference, reorderThreshold, deadStockDays, targetMarginPct, or voiceInputEnabled.',
      parameters: {
        type: 'object',
        properties: {
          aiProviderPreference: { type: 'string', enum: ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'] },
          reorderThreshold: { type: 'number', description: 'Low stock threshold units (e.g. 10)' },
          deadStockDays: { type: 'number', description: 'Days with zero sales to flag as dead stock (e.g. 30)' },
          targetMarginPct: { type: 'number', description: 'Target profit margin percentage (e.g. 25)' },
          voiceInputEnabled: { type: 'boolean' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateProductStock',
      description: 'Update product inventory stock level in the vendor catalog.',
      parameters: {
        type: 'object',
        properties: {
          productNameOrId: { type: 'string', description: 'Name or ID of the product to update' },
          stock: { type: 'number', description: 'Stock quantity' },
          adjustmentType: { type: 'string', enum: ['set', 'increment', 'decrement'], description: 'Whether to set exact stock or add/subtract' }
        },
        required: ['productNameOrId', 'stock']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateProductPrice',
      description: 'Update product selling price or discount percentage in the vendor catalog.',
      parameters: {
        type: 'object',
        properties: {
          productNameOrId: { type: 'string', description: 'Name or ID of the product' },
          price: { type: 'number', description: 'New selling price in INR' },
          discountPercentage: { type: 'number', description: 'Discount percentage (0-100)' }
        },
        required: ['productNameOrId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductDetails',
      description: 'Look up product details, current stock, pricing, and sales performance by name or ID.',
      parameters: {
        type: 'object',
        properties: {
          productNameOrId: { type: 'string', description: 'Name or ID of the product' }
        },
        required: ['productNameOrId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorStoreSettings',
      description: 'Retrieve vendor store operational settings (dispatch time, courier partner, free shipping threshold, return window, warranty, bank details, upi).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateVendorStoreSettings',
      description: 'Update vendor store operational and financial settings (storeName, phone, address, dispatchTime, courierPartner, freeShippingThreshold, returnWindow, warrantyPeriod, lowStockThreshold, notifyOnLowStock, notifyOnNewOrder, payoutFrequency, bankAccountNumber, bankIfsc, bankBeneficiaryName, upiId).',
      parameters: {
        type: 'object',
        properties: {
          storeName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          dispatchTime: { type: 'string', description: 'e.g. 1-2 business days' },
          courierPartner: { type: 'string', description: 'e.g. BlueDart, Delhivery, Standard Courier' },
          freeShippingThreshold: { type: 'number', description: 'Order amount for free delivery' },
          returnWindow: { type: 'number', description: 'Return window in days (e.g. 7)' },
          warrantyPeriod: { type: 'string', description: 'e.g. 1 Year Brand Warranty' },
          lowStockThreshold: { type: 'number', description: 'Low stock notification threshold' },
          notifyOnLowStock: { type: 'boolean' },
          notifyOnNewOrder: { type: 'boolean' },
          payoutFrequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          bankAccountNumber: { type: 'string' },
          bankIfsc: { type: 'string' },
          bankBeneficiaryName: { type: 'string' },
          upiId: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorPayoutsAndEarnings',
      description: 'Review vendor earnings, total commission deducted, refund adjustments, and available withdrawal balance.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'requestVendorPayout',
      description: 'Withdraw or request payout settlement from available balance to vendor bank account or UPI.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Withdrawal amount in INR (minimum ₹500)' },
          payoutMethod: { type: 'string', enum: ['bank_transfer', 'upi'] },
          payoutAccount: { type: 'string', description: 'Target bank account or UPI ID' },
          notes: { type: 'string' }
        },
        required: ['amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorSalesAnalytics',
      description: 'Get detailed sales analysis, revenue trends, units sold, and top products over a timeframe.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', enum: ['7d', '30d', '90d'] }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorNotifications',
      description: 'Review recent vendor notifications regarding orders, returns, and inventory stock alerts.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

async function executeAtlasTool(toolName, args, context = {}) {
  const vendorId = context.vendorId;
  switch (toolName) {
    case 'getVendorSalesAnalysis':
      return await vendorTools.getVendorSalesAnalysis({ vendorId, timeframe: args.timeframe || '30d' });
    case 'getVendorInventoryHealth':
      return await vendorTools.getVendorInventoryHealth({ vendorId });
    case 'getVendorDemandForecast':
      return await vendorTools.getVendorDemandForecast({ vendorId });
    case 'getVendorBestSellers':
      return await vendorTools.getVendorBestSellers({ vendorId });
    case 'getVendorDeadStock':
      return await vendorTools.getVendorDeadStock({ vendorId });
    case 'getVendorPricingInsights':
      return await vendorTools.getVendorPricingInsights({ vendorId });
    case 'getVendorReviewsSentiment':
      return await vendorTools.getVendorReviewsSentiment({ vendorId });
    case 'getVendorOrdersOverview':
      return await vendorTools.getVendorOrdersOverview({ vendorId });
    case 'getVendorProfile':
      return await vendorTools.getVendorProfile({ vendorId });
    case 'updateVendorProfile':
      return await vendorTools.updateVendorProfile({ vendorId, ...args });
    case 'getAtlasSettings':
      return await vendorTools.getAtlasSettings({ vendorId });
    case 'updateAtlasSettings':
      return await vendorTools.updateAtlasSettings({ vendorId, settings: args });
    case 'updateProductStock':
      return await vendorTools.updateProductStock({ vendorId, ...args });
    case 'updateProductPrice':
      return await vendorTools.updateProductPrice({ vendorId, ...args });
    case 'getProductDetails':
      return await vendorTools.getProductDetails({ vendorId, ...args });
    case 'getVendorStoreSettings':
      return await vendorTools.getVendorStoreSettings({ vendorId });
    case 'updateVendorStoreSettings':
      return await vendorTools.updateVendorStoreSettings({ vendorId, settings: args });
    case 'getVendorPayoutsAndEarnings':
      return await vendorTools.getVendorPayoutsAndEarnings({ vendorId });
    case 'requestVendorPayout':
      return await vendorTools.requestVendorPayout({ vendorId, ...args });
    case 'getVendorSalesAnalytics':
      return await vendorTools.getVendorSalesAnalytics({ vendorId, timeframe: args.timeframe || '30d' });
    case 'getVendorNotifications':
      return await vendorTools.getVendorNotifications({ vendorId });
    default:
      return { error: `Tool ${toolName} is not recognized.` };
  }
}

const ATLAS_AGENT_PROMPTS = {
  business_copilot: `
You are Atlas Business Copilot, the AI strategic partner for store owners.
Focus on sales trends, revenue velocity, top seller metrics, and holistic store profitability.
`,
  inventory_forecaster: `
You are Atlas Inventory & Restock Forecaster.
Focus on avoiding stockouts, predicting demand velocity, identifying dead stock (30+ days), and recommending restock quantities.
`,
  listing_copywriter: `
You are Atlas Product Listing & Marketing Copywriter.
Focus on SEO product titles, benefit-driven descriptions, search tags, and persuasive marketing copy.
`,
  pricing_strategist: `
You are Atlas Margin & Pricing Strategist.
Focus on competitive category price comparisons, margin optimization, and discount strategy.
`
};

/**
 * Handle vendor chat query
 */
async function chatWithVendorAi({
  vendorId,
  message,
  conversationHistory = [],
  agentMode = 'auto',
  aiProviderPreference = 'auto',
  pageContext = null
}) {
  let fullSystemPrompt = ATLAS_SYSTEM_PROMPT;
  if (pageContext?.title || pageContext?.path) {
    fullSystemPrompt += `\n\nCURRENT SCREEN CONTEXT:\nThe vendor is currently viewing the "${pageContext.title || pageContext.path}" screen in their merchant portal. Prioritize relevant data, decisions, operations, and recommendations directly related to this page.`;
  }

  const result = await executeAiChat({
    personality: 'Atlas',
    systemPrompt: fullSystemPrompt,
    tools: ATLAS_TOOLS,
    executeToolCall: executeAtlasTool,
    message,
    conversationHistory,
    context: { vendorId, agentMode, aiProviderPreference, pageContext },
    nlpFallback: vendorNlpDispatcher
  });

  if (!result.suggestions || result.suggestions.length === 0) {
    result.suggestions = VENDOR_DEFAULT_SUGGESTIONS.slice(0, 4);
  }

  return { ...result, agentMode };
}

/**
 * Generate AI Business Summary for Vendor Dashboard Card
 */
async function getVendorDashboardAiSummary({ vendorId }) {
  const [sales, health, forecast, orders] = await Promise.all([
    vendorTools.getVendorSalesAnalysis({ vendorId, timeframe: '30d' }),
    vendorTools.getVendorInventoryHealth({ vendorId }),
    vendorTools.getVendorDemandForecast({ vendorId }),
    vendorTools.getVendorOrdersOverview({ vendorId })
  ]);

  const observations = [];

  // Observation 1: Sales trend
  if (sales.revenueGrowthPercent >= 0) {
    observations.push({
      type: 'positive',
      icon: 'trending-up',
      title: 'Strong Sales Trajectory',
      text: `Revenue increased **${sales.revenueGrowthPercent}%** over the last 30 days (₹${sales.revenue.toLocaleString('en-IN')}).`
    });
  } else {
    observations.push({
      type: 'warning',
      icon: 'trending-down',
      title: 'Sales Volume Dip',
      text: `Revenue declined **${Math.abs(sales.revenueGrowthPercent)}%** compared to the prior period. Review top performing listings.`
    });
  }

  // Observation 2: Inventory risk
  if (health.criticalCount > 0 || health.outOfStockCount > 0) {
    observations.push({
      type: 'critical',
      icon: 'alert-triangle',
      title: 'Stock Replenishment Urgency',
      text: `${health.outOfStockCount} items out of stock and ${health.criticalCount} items critically low. Restock now to avoid lost orders.`
    });
  } else {
    observations.push({
      type: 'positive',
      icon: 'check-circle',
      title: 'Healthy Stock Levels',
      text: 'All active catalog items are adequately stocked with zero critical stockout risks.'
    });
  }

  // Observation 3: Demand forecasting
  if (forecast.criticalDepletionCount > 0) {
    observations.push({
      type: 'info',
      icon: 'clock',
      title: 'Fast-Moving Stock Depletion',
      text: `${forecast.criticalDepletionCount} top products are forecasted to deplete within 7 days based on current order volume.`
    });
  }

  // Observation 4: Orders
  if (orders.pendingOrders > 0) {
    observations.push({
      type: 'neutral',
      icon: 'package',
      title: 'Fulfillment Pipeline',
      text: `You have **${orders.pendingOrders} unfulfilled orders** ready for dispatch.`
    });
  }

  return {
    timeframe: 'Last 30 Days',
    metrics: {
      revenue: sales.revenue,
      revenueGrowthPercent: sales.revenueGrowthPercent,
      ordersCount: sales.orderCount,
      outOfStockCount: health.outOfStockCount,
      criticalCount: health.criticalCount,
      pendingOrdersCount: orders.pendingOrders
    },
    observations,
    quickSuggestions: [
      'Which items need restocking?',
      'Why did my sales drop?',
      'Show dead stock (30 days)',
      'Demand forecast'
    ]
  };
}

/**
 * AI Product Copywriting Assistant
 */
async function generateAiProductCopy({ name, category, keywords = '', tone = 'persuasive' }) {
  return await vendorTools.generateProductCopy({ name, category, keywords, tone });
}

module.exports = {
  chatWithVendorAi,
  getVendorDashboardAiSummary,
  generateAiProductCopy,
  ATLAS_TOOLS
};

