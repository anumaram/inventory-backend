/**
 * Vendor Local Deterministic NLP Dispatcher (Atlas)
 * Handles vendor queries deterministically when offline or as NLP fallback
 */

const vendorTools = require('./vendor-tools.service');

const VENDOR_DEFAULT_SUGGESTIONS = [
  'Which items need restocking?',
  'Why did my sales drop?',
  'Show dead stock (30 days)',
  'Top selling products',
  'Demand forecast'
];

async function vendorNlpDispatcher({ message = '', vendorId = null }) {
  const raw = String(message || '').trim();
  const query = raw.toLowerCase();

  // ==========================================
  // 1. VENDOR PROFILE UPDATES & LOOKUP
  // ==========================================

  // 1a. Update Name (e.g. "change my name to Jsai ventory")
  const nameMatch = raw.match(/(?:(?:change|update|set)\s+(?:my\s+)?name\s+(?:to\s+|as\s+)|my\s+name\s+is\s+)(.+)/i);
  if (nameMatch) {
    const newName = nameMatch[1].trim().replace(/[.!?,]+$/, '');
    if (newName) {
      const updateRes = await vendorTools.updateVendorProfile({ vendorId, name: newName });
      return {
        message: updateRes.message || `I've updated your store owner name to **${newName}**!`,
        category: 'profile',
        action: updateRes.action,
        suggestions: ['My Store Profile', 'Which items need restocking?', 'Atlas Settings']
      };
    }
  }

  // 1b. Update Store or Business Name
  const storeNameMatch = raw.match(/(?:(?:change|update|set)\s+(?:my\s+)?(?:store|business|shop)\s*name\s+(?:to\s+|as\s+))(.+)/i);
  if (storeNameMatch) {
    const newStoreName = storeNameMatch[1].trim().replace(/[.!?,]+$/, '');
    if (newStoreName) {
      const updateRes = await vendorTools.updateVendorProfile({ vendorId, businessName: newStoreName });
      return {
        message: updateRes.message || `I've updated your store name to **${newStoreName}**!`,
        category: 'profile',
        action: updateRes.action,
        suggestions: ['My Store Profile', 'Which items need restocking?', 'Atlas Settings']
      };
    }
  }

  // 1c. Update Phone Number
  const phoneMatch = query.match(/(?:(?:change|update|set)\s+(?:my\s+)?(?:phone|mobile|contact)(?:\s+number)?\s+(?:to\s+|as\s+))([0-9+\s-]{8,15})/i);
  if (phoneMatch) {
    const newPhone = phoneMatch[1].trim().replace(/\s+/g, '');
    const updateRes = await vendorTools.updateVendorProfile({ vendorId, phone: newPhone });
    return {
      message: updateRes.message || `I've updated your contact phone number to **${newPhone}**!`,
      category: 'profile',
      action: updateRes.action,
      suggestions: ['My Store Profile', 'Which items need restocking?']
    };
  }

  // 1d. View Profile / Store Details
  if (/(?:my\s+details|my\s+profile|store\s+profile|who\s+am\s+i|store\s+details|account\s+details|my\s+info)/i.test(query)) {
    const profileRes = await vendorTools.getVendorProfile({ vendorId });
    return {
      message: `### 🏪 Vendor Store Profile\n\n${profileRes.summary}\n\nYou can say "Change my name to [Name]" or "Change store name to [Store]" to update your details anytime.`,
      category: 'profile',
      data: profileRes.vendor,
      suggestions: ['Which items need restocking?', 'Sales Performance', 'Atlas Settings'],
      actions: [{ label: 'Store Settings', url: '/vendor/settings' }]
    };
  }

  // ==========================================
  // 2. ATLAS AI SETTINGS MANAGEMENT
  // ==========================================

  // 2a. Switch AI Provider / Engine
  const modelMatch = query.match(/(?:(?:change|switch|set|use)\s+(?:ai\s+)?(?:model|provider|engine)\s+(?:to\s+)?(gemini|openrouter|groq|cerebras|nlp|auto)|(?:switch\s+to\s+)(gemini|openrouter|groq|cerebras|nlp|auto))/i);
  if (modelMatch) {
    const targetModel = (modelMatch[1] || modelMatch[2]).toLowerCase();
    const settingsRes = await vendorTools.updateAtlasSettings({
      vendorId,
      settings: { aiProviderPreference: targetModel }
    });
    return {
      message: `Switched Atlas AI provider preference to **${targetModel.toUpperCase()}**.\n\n${settingsRes.message}`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Atlas Settings', 'Which items need restocking?', 'Top selling products']
    };
  }

  // 2b. Change Reorder Threshold
  const reorderMatch = query.match(/(?:(?:set|change|update)\s+(?:reorder|restock)\s+threshold\s+(?:to\s+)?(\d+))/i);
  if (reorderMatch) {
    const units = parseInt(reorderMatch[1], 10);
    const settingsRes = await vendorTools.updateAtlasSettings({
      vendorId,
      settings: { reorderThreshold: units }
    });
    return {
      message: `Updated Atlas restock alert threshold to **${units} units**.\n\nItems at or below ${units} units will trigger critical restocking alerts.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Which items need restocking?', 'Atlas Settings']
    };
  }

  // 2c. Change Dead Stock Days
  const deadMatch = query.match(/(?:(?:set|change|update)\s+dead\s*stock\s+(?:period|days|timeframe)\s+(?:to\s+)?(\d+)(?:\s*days)?)/i);
  if (deadMatch) {
    const days = parseInt(deadMatch[1], 10);
    const settingsRes = await vendorTools.updateAtlasSettings({
      vendorId,
      settings: { deadStockDays: days }
    });
    return {
      message: `Atlas dead stock window updated to **${days} days**.\n\nProducts without sales for ${days} days will be flagged for liquidation.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Show dead stock', 'Atlas Settings']
    };
  }

  // 2d. Change Target Profit Margin
  const marginMatch = query.match(/(?:(?:set|change|update)\s+(?:target\s+)?margin\s+(?:to\s+)?(\d+)(?:%|\s*percent)?)/i);
  if (marginMatch) {
    const margin = parseInt(marginMatch[1], 10);
    const settingsRes = await vendorTools.updateAtlasSettings({
      vendorId,
      settings: { targetMarginPct: margin }
    });
    return {
      message: `Atlas target profit margin set to **${margin}%**.\n\nPricing optimization suggestions will target this benchmark.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Pricing insights', 'Atlas Settings']
    };
  }

  // 2e. Toggle Voice Input
  const voiceToggleMatch = query.match(/(turn\s+on|enable|turn\s+off|disable)\s+voice(?:\s+input)?/i);
  if (voiceToggleMatch) {
    const isEnable = /on|enable/i.test(voiceToggleMatch[1]);
    const settingsRes = await vendorTools.updateAtlasSettings({
      vendorId,
      settings: { voiceInputEnabled: isEnable }
    });
    return {
      message: `Atlas Voice Input has been **${isEnable ? 'enabled' : 'disabled'}**.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Atlas Settings']
    };
  }

  // 2f. View Settings
  if (/(?:show|view|get|what\s+are)\s+(?:my\s+)?(?:ai\s+)?settings|atlas\s+settings/i.test(query)) {
    const s = await vendorTools.getAtlasSettings({ vendorId });
    return {
      message: `### ⚙️ Atlas AI Configuration Settings\n\n${s.summary}\n\nYou can say "Switch model to Groq", "Set restock threshold to 15", or "Set dead stock to 45 days" to modify preferences anytime.`,
      category: 'settings',
      data: s.settings,
      suggestions: ['Switch model to Groq', 'Switch model to Gemini', 'Set restock threshold to 15'],
      action: { type: 'open_settings' }
    };
  }

  // ==========================================
  // 3. CATALOG & INVENTORY OPERATIONS
  // ==========================================

  // 3a. Update Stock / Restock Product
  const stockUpdateMatch = query.match(/(?:(?:update|set|change)\s+stock\s+(?:of|for)\s+(.+?)\s+to\s+(\d+)|restock\s+(.+?)\s+(?:with|by|to)\s+(\d+)|add\s+(\d+)\s+stock\s+to\s+(.+))/i);
  if (stockUpdateMatch) {
    let pName = '';
    let qty = 0;
    let type = 'set';

    if (stockUpdateMatch[1] && stockUpdateMatch[2]) {
      pName = stockUpdateMatch[1].trim();
      qty = parseInt(stockUpdateMatch[2], 10);
    } else if (stockUpdateMatch[3] && stockUpdateMatch[4]) {
      pName = stockUpdateMatch[3].trim();
      qty = parseInt(stockUpdateMatch[4], 10);
      type = /with|by/i.test(query) ? 'increment' : 'set';
    } else if (stockUpdateMatch[5] && stockUpdateMatch[6]) {
      qty = parseInt(stockUpdateMatch[5], 10);
      pName = stockUpdateMatch[6].trim();
      type = 'increment';
    }

    if (pName && !isNaN(qty)) {
      const stockRes = await vendorTools.updateProductStock({
        vendorId,
        productNameOrId: pName,
        stock: qty,
        adjustmentType: type
      });

      if (stockRes.error) {
        return {
          message: `⚠️ ${stockRes.error}`,
          suggestions: ['Which items need restocking?', 'Inventory health']
        };
      }

      return {
        message: stockRes.message,
        category: 'inventory',
        action: stockRes.action,
        suggestions: ['Which items need restocking?', 'Demand forecast'],
        actions: [{ label: 'View Inventory', url: '/vendor/inventory' }]
      };
    }
  }

  // 3b. Update Price of Product
  const priceUpdateMatch = query.match(/(?:(?:update|change|set)\s+price\s+(?:of|for)\s+(.+?)\s+to\s+(?:₹|rs\.?|inr\s*)?(\d+(?:\.\d+)?))/i);
  if (priceUpdateMatch) {
    const pName = priceUpdateMatch[1].trim();
    const newPrice = parseFloat(priceUpdateMatch[2]);
    if (pName && !isNaN(newPrice)) {
      const priceRes = await vendorTools.updateProductPrice({
        vendorId,
        productNameOrId: pName,
        price: newPrice
      });

      if (priceRes.error) {
        return {
          message: `⚠️ ${priceRes.error}`,
          suggestions: ['Pricing insights', 'Top selling products']
        };
      }

      return {
        message: priceRes.message,
        category: 'pricing',
        action: priceRes.action,
        suggestions: ['Pricing insights', 'Top selling products'],
        actions: [{ label: 'Manage Products', url: '/vendor/products' }]
      };
    }
  }

  // 3c. Product Details Lookup
  const skuLookupMatch = query.match(/(?:(?:details\s+(?:of|for)|sku\s+info|find\s+product|lookup\s+product)\s+(.+))/i);
  if (skuLookupMatch) {
    const pName = skuLookupMatch[1].trim().replace(/[.!?,]+$/, '');
    const details = await vendorTools.getProductDetails({ vendorId, productNameOrId: pName });
    if (details.error) {
      return {
        message: `⚠️ ${details.error}`,
        suggestions: ['Top selling products', 'Which items need restocking?']
      };
    }
    return {
      message: details.summary,
      category: 'product',
      data: details.product,
      suggestions: [`Update stock of ${details.product.name} to 50`, `Update price of ${details.product.name} to ₹${details.product.price}`],
      actions: [{ label: 'Edit Product', url: `/vendor/products` }]
    };
  }

  // ==========================================
  // 4. STORE INTELLIGENCE & ANALYTICS
  // ==========================================

  // 4a. Restock / Inventory Health
  if (/(?:restock|low\s*stock|out\s*of\s*stock|inventory\s*health|stock\s*alert|deplet|units?\s*left)/i.test(query)) {
    const health = await vendorTools.getVendorInventoryHealth({ vendorId });
    let reply = `### 📦 Inventory Health Overview\n\n${health.summaryText || health.summary || 'Overview of current stock status.'}\n\n`;

    const outItems = Array.isArray(health.outOfStockItems)
      ? health.outOfStockItems
      : (health.criticalItems || []).filter((it) => it.quantity === 0);
    const lowItems = (health.criticalItems || []).filter((it) => it.quantity > 0);

    if (outItems.length > 0) {
      reply += `**⚠️ Out of Stock Items (${health.outOfStockCount || outItems.length}):**\n`;
      outItems.slice(0, 5).forEach((it) => {
        reply += `- **${it.name}** (₹${it.price})\n`;
      });
      reply += '\n';
    }

    if (lowItems.length > 0) {
      reply += `**🚨 Critical Restock Urgency (≤ 10 units):**\n`;
      lowItems.slice(0, 5).forEach((it) => {
        reply += `- **${it.name}**: ${it.quantity} units remaining\n`;
      });
      reply += '\n';
    }

    return {
      message: reply.trim(),
      category: 'inventory',
      data: health,
      suggestions: ['Demand forecast', 'Show dead stock', 'Top selling products'],
      actions: [{ label: 'Go to Inventory', url: '/vendor/inventory' }]
    };
  }

  // 4b. Sales analysis & growth/drop
  if (/(?:sales|revenue|income|earnings|drop|decline|growth|trend|perform)/i.test(query)) {
    let timeframe = '30d';
    if (/7\s*days?|week/i.test(query)) timeframe = '7d';
    if (/90\s*days?|quarter/i.test(query)) timeframe = '90d';

    const sales = await vendorTools.getVendorSalesAnalysis({ vendorId, timeframe });
    let reply = `### 📈 Sales Performance Analysis (${sales.timeframe})\n\n`;
    reply += `${sales.narrative}\n\n`;
    reply += `- **Current Revenue:** ₹${sales.revenue.toLocaleString('en-IN')}\n`;
    reply += `- **Orders Fulfilled:** ${sales.orderCount} (${sales.orderGrowthPercent >= 0 ? '+' : ''}${sales.orderGrowthPercent}%)\n`;
    reply += `- **Units Sold:** ${sales.unitsSold}\n`;
    reply += `- **Revenue Growth:** ${sales.revenueGrowthPercent >= 0 ? '🟢 +' : '🔴 '}${sales.revenueGrowthPercent}%\n`;

    if (sales.topProduct) {
      reply += `\n**Top Performer:** ${sales.topProduct.name} generated ₹${sales.topProduct.revenue.toLocaleString('en-IN')}.`;
    }

    return {
      message: reply.trim(),
      category: 'sales',
      data: sales,
      suggestions: ['Which items need restocking?', 'Top selling products', 'Show dead stock'],
      actions: [{ label: 'View Analytics', url: '/vendor/analytics' }]
    };
  }

  // 4c. Demand forecasting
  if (/(?:demand|forecast|predict|run\s*out|stock\s*out|future\s*stock|depletion)/i.test(query)) {
    const forecast = await vendorTools.getVendorDemandForecast({ vendorId });
    let reply = `### 🔮 30-Day Demand & Depletion Forecast\n\n${forecast.summary}\n\n`;

    if (forecast.forecasts.length > 0) {
      reply += `| Product | Current Stock | Daily Sales | Projected Depletion |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      forecast.forecasts.slice(0, 6).forEach((f) => {
        reply += `| **${f.name}** | ${f.currentStock} units | ${f.dailySalesVelocity}/day | **${f.estimatedDaysUntilDepleted} days** (${f.urgency}) |\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'forecast',
      data: forecast,
      suggestions: ['Which items need restocking?', 'Why did my sales drop?', 'Top selling products'],
      actions: [{ label: 'Restock Products', url: '/vendor/inventory' }]
    };
  }

  // 4d. Best sellers / Top products
  if (/(?:best\s*seller|top\s*product|highest\s*sell|top\s*sell|popular|most\s*bought)/i.test(query)) {
    const best = await vendorTools.getVendorBestSellers({ vendorId });
    let reply = `### 🏆 Best Selling Products\n\n${best.summary}\n\n`;

    if (best.topProducts.length > 0) {
      best.topProducts.slice(0, 5).forEach((p, idx) => {
        reply += `${idx + 1}. **${p.name}** — ${p.unitsSold} units sold (₹${p.revenue.toLocaleString('en-IN')} revenue)\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'bestsellers',
      data: best,
      suggestions: ['Demand forecast', 'Pricing insights', 'Which items need restocking?'],
      actions: [{ label: 'Manage Products', url: '/vendor/products' }]
    };
  }

  // 4e. Dead stock / Slow moving
  if (/(?:dead\s*stock|unsold|slow\s*moving|not\s*selling|zero\s*sales|30\s*days|idle)/i.test(query)) {
    const dead = await vendorTools.getVendorDeadStock({ vendorId });
    let reply = `### 💤 Dead Stock & Idle Inventory Analysis\n\n${dead.summary}\n\n`;

    if (dead.deadStockItems.length > 0) {
      reply += `**Products with 0 sales in past 30 days:**\n`;
      dead.deadStockItems.slice(0, 5).forEach((item) => {
        reply += `- **${item.name}** (${item.category || 'General'}): ${item.stock} units locked (₹${item.lockedCapital.toLocaleString('en-IN')} tied capital)\n`;
      });
      reply += `\n**💡 AI Recommendation:** Consider creating a discount promotion or bundling these items with top sellers to liquidate locked capital.`;
    }

    return {
      message: reply.trim(),
      category: 'deadstock',
      data: dead,
      suggestions: ['Pricing insights', 'Top selling products', 'Which items need restocking?'],
      actions: [{ label: 'Run Discount / Promo', url: '/vendor/promotions' }]
    };
  }

  // 4f. Pricing insights & margins
  if (/(?:price|pricing|margin|competitor|cost|underpriced|overpriced)/i.test(query)) {
    const pricing = await vendorTools.getVendorPricingInsights({ vendorId });
    let reply = `### 🏷️ Pricing & Margin Insights\n\n${pricing.summary}\n\n`;

    if (pricing.pricingRecommendations.length > 0) {
      pricing.pricingRecommendations.slice(0, 5).forEach((rec) => {
        reply += `- **${rec.name}**: Current price ₹${rec.price}. Average category price is ₹${rec.categoryAverage}. *${rec.insight}*\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'pricing',
      data: pricing,
      suggestions: ['Top selling products', 'Why did my sales drop?', 'Show dead stock'],
      actions: [{ label: 'Edit Product Prices', url: '/vendor/products' }]
    };
  }

  // 4g. Customer reviews & sentiment
  if (/(?:review|rating|feedback|sentiment|customer\s*say|complaint|satisfaction)/i.test(query)) {
    const sentiment = await vendorTools.getVendorReviewsSentiment({ vendorId });
    let reply = `### 💬 Customer Reviews & Sentiment\n\n${sentiment.summary}\n\n`;
    reply += `**Top Positive Themes:**\n`;
    sentiment.positiveThemes.forEach((t) => { reply += `- ✅ ${t}\n`; });
    reply += `\n**Actionable Improvements:**\n`;
    sentiment.improvementAreas.forEach((t) => { reply += `- 🔧 ${t}\n`; });

    return {
      message: reply.trim(),
      category: 'sentiment',
      data: sentiment,
      suggestions: ['Why did my sales drop?', 'Which items need restocking?', 'Top selling products']
    };
  }

  // 4h. Orders overview
  if (/(?:(?:my\s+)?orders|pending\s+orders|fulfill|packing\s+orders|shipping\s+status|order\s+status|delivery\s+status|orders\s+overview)/i.test(query) && !/(?:dispatch\s+time|courier)/i.test(query)) {
    const orders = await vendorTools.getVendorOrdersOverview({ vendorId });
    let reply = `### 🚚 Orders & Fulfillment Status\n\n${orders.summary}\n\n`;
    reply += `- **New Orders (Placed):** ${orders.pendingOrders}\n`;
    reply += `- **In Packing:** ${orders.processingOrders}\n`;
    reply += `- **Completed / Delivered:** ${orders.deliveredOrders}\n`;

    return {
      message: reply.trim(),
      category: 'orders',
      data: orders,
      suggestions: ['Which items need restocking?', 'Why did my sales drop?', 'Demand forecast'],
      actions: [{ label: 'Process Orders', url: '/vendor/orders' }]
    };
  }

  // ==========================================
  // 5. VENDOR STORE OPERATIONAL SETTINGS
  // ==========================================

  // 5a. Update Dispatch Time
  const dispatchMatch = raw.match(/(?:(?:change|update|set)\s+dispatch\s+time\s+(?:to\s+)?)(.+)/i);
  if (dispatchMatch) {
    const time = dispatchMatch[1].trim().replace(/[.!?,]+$/, '');
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { dispatchTime: time } });
    return {
      message: res.message || `Updated dispatch time to **${time}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Store Settings', 'Payouts & Earnings', 'Inventory Health']
    };
  }

  // 5b. Update Courier Partner
  const courierMatch = raw.match(/(?:(?:change|update|set)\s+courier(?:\s+partner)?\s+(?:to\s+)?)(.+)/i);
  if (courierMatch) {
    const partner = courierMatch[1].trim().replace(/[.!?,]+$/, '');
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { courierPartner: partner } });
    return {
      message: res.message || `Updated courier partner to **${partner}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Store Settings', 'Payouts & Earnings']
    };
  }

  // 5c. Update Free Shipping Threshold
  const shipMatch = query.match(/(?:(?:change|update|set)\s+free\s+shipping(?:\s+threshold)?\s+(?:to\s+)?(?:₹\s*|rs\.?\s*)?(\d+))/i);
  if (shipMatch) {
    const threshold = parseInt(shipMatch[1], 10);
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { freeShippingThreshold: threshold } });
    return {
      message: res.message || `Updated free shipping threshold to **₹${threshold.toLocaleString('en-IN')}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Store Settings', 'Payouts & Earnings']
    };
  }

  // 5d. Update Return Window
  const retMatch = query.match(/(?:(?:change|update|set)\s+return\s+window\s+(?:to\s+)?(\d+)(?:\s*days?)?)/i);
  if (retMatch) {
    const days = parseInt(retMatch[1], 10);
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { returnWindow: days } });
    return {
      message: res.message || `Updated customer return window to **${days} days**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Store Settings', 'Payouts & Earnings']
    };
  }

  // 5e. Update UPI ID
  const upiMatch = raw.match(/(?:(?:change|update|set)\s+upi(?:\s+id)?\s+(?:to\s+)?)([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/i);
  if (upiMatch) {
    const upi = upiMatch[1].trim();
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { upiId: upi } });
    return {
      message: res.message || `Updated UPI ID to **${upi}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Payouts & Earnings', 'Store Settings']
    };
  }

  // 5f. Update Bank Account
  const bankMatch = query.match(/(?:(?:change|update|set)\s+bank\s+(?:account|a\/c)(?:\s+number)?\s+(?:to\s+)?)([0-9]{9,18})/i);
  if (bankMatch) {
    const acc = bankMatch[1].trim();
    const res = await vendorTools.updateVendorStoreSettings({ vendorId, settings: { bankAccountNumber: acc } });
    return {
      message: res.message || `Updated settlement bank account number!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Payouts & Earnings', 'Store Settings']
    };
  }

  // 5g. View Store Settings
  if (/(?:store\s*settings|operational\s*settings|courier\s*partner|dispatch\s*time|return\s*window|bank\s*details|upi\s*id)/i.test(query)) {
    const data = await vendorTools.getVendorStoreSettings({ vendorId });
    return {
      message: data.summary,
      category: 'settings',
      data: data.settings,
      suggestions: ['Payouts & Earnings', 'Sales Performance', 'Atlas Settings'],
      actions: [{ label: 'Store Settings', url: '/vendor/settings' }]
    };
  }

  // ==========================================
  // 6. VENDOR PAYOUTS & AVAILABLE BALANCE
  // ==========================================

  // 6a. Withdraw Payout
  const withdrawMatch = query.match(/(?:(?:withdraw|request\s+payout|payout\s+request|cash\s*out)(?:\s+of)?(?:\s+₹|\s+rs\.?)?\s*(\d+))/i);
  if (withdrawMatch) {
    const amount = parseInt(withdrawMatch[1], 10);
    const res = await vendorTools.requestVendorPayout({ vendorId, amount });
    return {
      message: res.error || res.message,
      category: 'payouts',
      action: res.action,
      suggestions: ['Payouts & Earnings', 'Sales Performance']
    };
  }

  // 6b. View Payouts & Balance
  if (/(?:payout|balance|earnings?|wallet\s*balance|my\s*revenue|available\s*payout)/i.test(query)) {
    const data = await vendorTools.getVendorPayoutsAndEarnings({ vendorId });
    return {
      message: data.summary,
      category: 'payouts',
      data,
      suggestions: ['Withdraw ₹1,000', 'Store Settings', 'Sales Performance'],
      actions: [{ label: 'View Payouts', url: '/vendor/payments' }]
    };
  }

  // ==========================================
  // 7. NOTIFICATIONS
  // ==========================================

  if (/(?:notifications?|alerts?|messages?|unread\s*alerts)/i.test(query)) {
    const data = await vendorTools.getVendorNotifications({ vendorId });
    return {
      message: data.summary,
      category: 'notifications',
      data: data.notifications,
      suggestions: ['Payouts & Earnings', 'Orders & Fulfillment'],
      actions: [{ label: 'Notifications', url: '/vendor/notifications' }]
    };
  }

  // ==========================================
  // 8. DEFAULT / GREETING
  // ==========================================
  return {
    message: `Hello! I'm **Atlas**, your AI Business & Store Assistant.\n\nI can help you monitor inventory, forecast demand, update product stock and prices, adjust your store profile, and tune AI settings.\n\nTry asking me:\n- *"Change my name to Jsai ventory"*\n- *"Switch model to Groq"*\n- *"Which items need restocking?"*\n- *"Update stock of [Product] to 50"*\n- *"Show dead stock"*`,
    category: 'general',
    suggestions: [
      'Change my name to Store Owner',
      'Which items need restocking?',
      'Why did my sales drop?',
      'Show dead stock',
      'Atlas Settings'
    ],
    actions: [
      { label: 'Inventory Health', url: '/vendor/inventory' },
      { label: 'Sales Analytics', url: '/vendor/analytics' }
    ]
  };
}

module.exports = {
  vendorNlpDispatcher,
  VENDOR_DEFAULT_SUGGESTIONS
};

