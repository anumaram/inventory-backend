/**
 * Admin Local Deterministic NLP Dispatcher (Titan)
 * Provides instant responses for administrative & platform intelligence queries
 */

const adminTools = require('./admin-tools.service');

const ADMIN_DEFAULT_SUGGESTIONS = [
  'Platform Overview',
  'Vendors with >20% sales drop',
  'Platform Inventory Risk',
  'Anomaly Detection',
  'Support Tickets Summary',
  'Executive BI Report'
];

async function adminNlpDispatcher({ message = '', adminId = null }) {
  const raw = String(message || '').trim();
  const query = raw.toLowerCase();

  // ==========================================
  // 1. ADMIN PROFILE UPDATES & LOOKUP
  // ==========================================

  // 1a. Update Name
  const nameMatch = raw.match(/(?:(?:change|update|set)\s+(?:my\s+)?name\s+(?:to\s+|as\s+)|my\s+name\s+is\s+)(.+)/i);
  if (nameMatch) {
    const newName = nameMatch[1].trim().replace(/[.!?,]+$/, '');
    if (newName) {
      const updateRes = await adminTools.updateAdminProfile({ adminId, name: newName });
      return {
        message: updateRes.message || `I've updated your administrator account name to **${newName}**!`,
        category: 'profile',
        action: updateRes.action,
        suggestions: ['My Profile', 'Titan Settings', 'Platform Overview']
      };
    }
  }

  // 1b. Update Phone / Mobile
  const phoneMatch = query.match(/(?:(?:change|update|set)\s+(?:my\s+)?(?:phone|mobile)(?:\s+number)?\s+(?:to\s+|as\s+))([0-9+\s-]{8,15})/i);
  if (phoneMatch) {
    const newMobile = phoneMatch[1].trim().replace(/\s+/g, '');
    const updateRes = await adminTools.updateAdminProfile({ adminId, mobile: newMobile });
    return {
      message: updateRes.message || `I've updated your mobile phone number to **${newMobile}**!`,
      category: 'profile',
      action: updateRes.action,
      suggestions: ['My Profile', 'Titan Settings', 'Platform Overview']
    };
  }

  // 1c. View Profile
  if (/(?:my\s+details|my\s+profile|admin\s+profile|who\s+am\s+i|my\s+account|personal\s+details)/i.test(query)) {
    const profileRes = await adminTools.getAdminProfile({ adminId });
    return {
      message: `### 👤 Administrator Profile\n\n${profileRes.summary}\n\nYou can tell me "Change my name to [Name]" or "Change my mobile to [Number]" to update your account credentials anytime.`,
      category: 'profile',
      data: profileRes.admin,
      suggestions: ['Titan Settings', 'Platform Overview', 'Vendors with >20% sales drop'],
      actions: [{ label: 'View Profile', url: '/profile' }]
    };
  }

  // ==========================================
  // 2. TITAN AI SETTINGS MANAGEMENT
  // ==========================================

  // 2a. Switch AI Provider / Engine
  const modelMatch = query.match(/(?:(?:change|switch|set|use)\s+(?:ai\s+)?(?:model|provider|engine)\s+(?:to\s+)?(gemini|openrouter|groq|cerebras|nlp|auto)|(?:switch\s+to\s+)(gemini|openrouter|groq|cerebras|nlp|auto))/i);
  if (modelMatch) {
    const targetModel = (modelMatch[1] || modelMatch[2]).toLowerCase();
    const settingsRes = await adminTools.updateTitanSettings({
      adminId,
      settings: { aiProviderPreference: targetModel }
    });
    return {
      message: `Switched Titan AI provider preference to **${targetModel.toUpperCase()}**.\n\n${settingsRes.message}`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Titan Settings', 'Platform Overview', 'Executive BI Report']
    };
  }

  // 2b. Change Anomaly Threshold
  const anomalyMatch = query.match(/(?:(?:set|change|update)\s+(?:anomaly\s+)?threshold\s+(?:to\s+)?(\d+)(?:%|\s*percent)?)/i);
  if (anomalyMatch) {
    const pct = parseInt(anomalyMatch[1], 10);
    const settingsRes = await adminTools.updateTitanSettings({
      adminId,
      settings: { anomalyThresholdPct: pct }
    });
    return {
      message: `Updated Titan anomaly detection threshold to **${pct}%**.\n\nTransactions and merchant sales declines beyond ${pct}% will be flagged for review.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Anomaly Detection', 'Titan Settings', 'Platform Overview']
    };
  }

  // 2c. Change Timeframe
  const tfMatch = query.match(/(?:(?:set|change|update)\s+(?:default\s+)?timeframe\s+(?:to\s+)?(7d|30d|90d|7\s*days?|30\s*days?|90\s*days?))/i);
  if (tfMatch) {
    let tf = '30d';
    const rawTf = tfMatch[1].toLowerCase();
    if (rawTf.includes('7')) tf = '7d';
    else if (rawTf.includes('90')) tf = '90d';
    const settingsRes = await adminTools.updateTitanSettings({
      adminId,
      settings: { defaultTimeframe: tf }
    });
    return {
      message: `Titan default reporting timeframe set to **${tf}**.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Platform Overview', 'Executive BI Report', 'Titan Settings']
    };
  }

  // 2d. Toggle Voice Input or Alert Notifications
  const toggleMatch = query.match(/(turn\s+on|enable|turn\s+off|disable)\s+(voice(?:\s+input)?|alerts?|notifications?)/i);
  if (toggleMatch) {
    const isEnable = /on|enable/i.test(toggleMatch[1]);
    const isVoice = /voice/i.test(toggleMatch[2]);
    const update = isVoice ? { voiceInputEnabled: isEnable } : { alertNotifications: isEnable };
    const settingsRes = await adminTools.updateTitanSettings({ adminId, settings: update });
    return {
      message: `Titan ${isVoice ? 'Voice Input' : 'Alert Notifications'} has been **${isEnable ? 'enabled' : 'disabled'}**.`,
      category: 'settings',
      action: settingsRes.action,
      suggestions: ['Titan Settings', 'Platform Overview']
    };
  }

  // 2e. View Settings
  if (/(?:show|view|get|what\s+are)\s+(?:my\s+)?(?:ai\s+)?settings|titan\s+settings/i.test(query)) {
    const s = await adminTools.getTitanSettings({ adminId });
    return {
      message: `### ⚙️ Titan AI Configuration Settings\n\n${s.summary}\n\nYou can say "Switch model to Groq", "Set anomaly threshold to 15%", or "Disable voice" to modify your preferences.`,
      category: 'settings',
      data: s.settings,
      suggestions: ['Switch model to Groq', 'Switch model to Gemini', 'Set anomaly threshold to 25%'],
      action: { type: 'open_settings' }
    };
  }

  // ==========================================
  // 3. VENDOR ACCOUNT MANAGEMENT
  // ==========================================

  // 3a. Suspend or Activate Merchant Account
  const vendorStatusMatch = query.match(/(?:(suspend|block|deactivate|activate|unblock)\s+(?:vendor|merchant)\s+(.+))/i);
  if (vendorStatusMatch) {
    const actionWord = vendorStatusMatch[1].toLowerCase();
    const vendorTarget = vendorStatusMatch[2].trim().replace(/[.!?,]+$/, '');
    const newStatus = /suspend|block|deactivate/i.test(actionWord) ? 'suspended' : 'active';
    const res = await adminTools.updateVendorStatus({ vendorIdOrName: vendorTarget, status: newStatus });
    if (res.error) {
      return {
        message: `⚠️ ${res.error}`,
        suggestions: ['Vendors with >20% sales drop', 'Platform Overview']
      };
    }
    return {
      message: res.message,
      category: 'vendors',
      action: res.action,
      suggestions: ['Vendors with >20% sales drop', 'Platform Overview'],
      actions: [{ label: 'View Vendors', url: '/vendors' }]
    };
  }

  // 3b. Vendor Details / Dossier Lookup
  const vendorLookupMatch = query.match(/(?:(?:lookup|find|details\s+(?:for|of)|check|inspect|dossier\s+(?:for|of))\s+(?:vendor|merchant)\s+(.+))/i);
  if (vendorLookupMatch) {
    const target = vendorLookupMatch[1].trim().replace(/[.!?,]+$/, '');
    const details = await adminTools.getVendorDetails({ vendorIdOrName: target });
    if (details.error) {
      return {
        message: `⚠️ ${details.error}`,
        suggestions: ['Vendors with >20% sales drop', 'Platform Overview']
      };
    }
    return {
      message: details.summary,
      category: 'vendors',
      data: details.vendor,
      suggestions: [`Suspend vendor ${details.vendor.businessName || details.vendor.name}`, 'Vendors with >20% sales drop'],
      actions: [{ label: 'View All Vendors', url: '/vendors' }]
    };
  }

  // ==========================================
  // 4. BUSINESS INTELLIGENCE & ANALYTICS
  // ==========================================

  // 4a. Vendor performance & drop detection
  if (/(?:vendor|merchant|drop|sales\s*drop|20%|comparison|underperform|decline)/i.test(query)) {
    const data = await adminTools.getVendorPerformanceComparison({ thresholdDropPercent: 20 });
    let reply = `### 🏢 Vendor Performance & Drop Analysis\n\n${data.summary}\n\n`;

    if (data.droppedVendors.length > 0) {
      reply += `| Vendor | Prior Revenue | Current Revenue | Change |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      data.droppedVendors.forEach((v) => {
        reply += `| **${v.vendorName}** | ₹${v.previousRevenue.toLocaleString('en-IN')} | ₹${v.currentRevenue.toLocaleString('en-IN')} | **🔴 ${v.growthPercent}%** |\n`;
      });
      reply += `\n*Action recommended: Contact underperforming vendors to identify catalog or pricing bottlenecks.*`;
    }

    if (data.topGrowingVendors.length > 0) {
      reply += `\n\n**🚀 Top Growing Vendors:**\n`;
      data.topGrowingVendors.forEach((v) => {
        reply += `- **${v.vendorName}**: +${v.growthPercent}% growth (₹${v.currentRevenue.toLocaleString('en-IN')})\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'vendors',
      data,
      suggestions: ['Platform Overview', 'Platform Inventory Risk', 'Executive BI Report'],
      actions: [{ label: 'View Vendors', url: '/vendors' }]
    };
  }

  // 4b. Inventory Risks & Stockout Bottlenecks
  if (/(?:inventory|stock|risk|bottleneck|out\s*of\s*stock|critical\s*stock|lost\s*revenue)/i.test(query)) {
    const data = await adminTools.getPlatformInventoryRisk();
    let reply = `### 📦 Platform Inventory Risk Intelligence\n\n${data.summary}\n\n`;

    if (data.highImpactStockouts.length > 0) {
      reply += `**🚨 High-Impact Out of Stock SKUs:**\n`;
      data.highImpactStockouts.forEach((it) => {
        reply += `- **${it.name}** (${it.vendor}): ₹${it.price} | Sold ${it.salesCount} units previously\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'inventory',
      data,
      suggestions: ['Vendors with >20% sales drop', 'Anomaly Detection', 'Platform Overview'],
      actions: [{ label: 'View Products Catalog', url: '/products' }]
    };
  }

  // 4c. Anomalies & High-Value Orders
  if (/(?:anomal|spike|fraud|suspicious|10,?000|cancellation|high\s*value|flag)/i.test(query)) {
    const data = await adminTools.getPlatformAnomalies();
    let reply = `### 🚨 Platform Anomaly Detection\n\n${data.summary}\n\n`;

    if (data.anomalies.length > 0) {
      data.anomalies.forEach((a) => {
        reply += `- **${a.title}**: ${a.description}\n`;
      });
    }

    if (data.highValueOrders.length > 0) {
      reply += `\n**Top High-Value Orders (Last 7 Days):**\n`;
      data.highValueOrders.forEach((o) => {
        reply += `- Order #${o.orderId}: **₹${Number(o.amount).toLocaleString('en-IN')}** by ${o.customer}\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'anomalies',
      data,
      suggestions: ['Payment & Refund Trends', 'Support Tickets Summary', 'Platform Overview'],
      actions: [{ label: 'View Orders', url: '/orders' }]
    };
  }

  // 4d. Payments & Refunds
  if (/(?:payment|refund|gateway|upi|cod|wallet|failure)/i.test(query)) {
    const data = await adminTools.getPaymentAndRefundAnalysis({ timeframe: '30d' });
    let reply = `### 💳 Payment & Refund Insights (30 Days)\n\n${data.summary}\n\n`;

    reply += `**Payment Method Breakdown:**\n`;
    Object.entries(data.paymentMethodCounts).forEach(([method, count]) => {
      reply += `- **${method.toUpperCase()}**: ${count} orders\n`;
    });

    return {
      message: reply.trim(),
      category: 'payments',
      data,
      suggestions: ['Anomaly Detection', 'Platform Overview', 'Executive BI Report'],
      actions: [{ label: 'View Transactions', url: '/finance' }]
    };
  }

  // 4e. Support Tickets
  if (/(?:ticket|support|complaint|helpdesk|urgent\s*ticket|customer\s*issue)/i.test(query)) {
    const data = await adminTools.getSupportTicketsSummary();
    let reply = `### 🎫 Support Desk Overview\n\n${data.summary}\n\n`;

    if (data.urgentTickets.length > 0) {
      reply += `**Urgent & High Priority Tickets:**\n`;
      data.urgentTickets.forEach((t) => {
        reply += `- [${t.ticketId}] **${t.subject}** (${t.category}) by ${t.user}\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'support',
      data,
      suggestions: ['Security Audit Trail', 'Platform Overview', 'Anomaly Detection'],
      actions: [{ label: 'Open Support Tickets', url: '/support' }]
    };
  }

  // 4f. Security & Audit
  if (/(?:security|audit|log|permission|admin\s*action|suspension|hack|breach)/i.test(query)) {
    const data = await adminTools.getSecurityAuditSummary();
    let reply = `### 🛡️ Security & System Audit Trail\n\n${data.summary}\n\n`;

    if (data.criticalSecurityEvents.length > 0) {
      reply += `**Recent Sensitive Administrative Actions:**\n`;
      data.criticalSecurityEvents.forEach((e) => {
        const timeStr = new Date(e.time).toLocaleString('en-IN');
        reply += `- **${e.admin}**: \`${e.action}\` on \`${e.entity}\` (${timeStr})\n`;
      });
    }

    return {
      message: reply.trim(),
      category: 'security',
      data,
      suggestions: ['Support Tickets Summary', 'Anomaly Detection', 'Platform Overview'],
      actions: [{ label: 'View Audit Logs', url: '/audit-logs' }]
    };
  }

  // 4g. Executive Report
  if (/(?:executive\s*report|bi\s*report|board\s*report|business\s*report|generate\s*report)/i.test(query)) {
    const data = await adminTools.generateExecutiveReportSummary({ timeframe: '30d' });
    let reply = `### 📊 ${data.title}\n\n`;

    data.sections.forEach((s) => {
      reply += `#### ${s.heading}\n${s.content}\n\n`;
    });

    reply += `#### 💡 Strategic Recommendations\n`;
    data.strategicRecommendations.forEach((r) => {
      reply += `- ${r}\n`;
    });

    return {
      message: reply.trim(),
      category: 'report',
      data,
      suggestions: ['Platform Overview', 'Vendors with >20% sales drop', 'Anomaly Detection']
    };
  }

  // 4h. Platform Overview / Vital Signs (Explicit Match)
  if (/(?:platform\s*overview|overview|gmv|gross\s*merchandise|total\s*sales|platform\s*stats|vital\s*signs)/i.test(query)) {
    const overview = await adminTools.getPlatformOverview({ timeframe: '30d' });
    let reply = `### 🌐 Platform Executive Overview (30 Days)\n\n${overview.summary}\n\n`;
    reply += `- **GMV:** ₹${overview.gmv.toLocaleString('en-IN')} (${overview.gmvGrowthPercent >= 0 ? '+' : ''}${overview.gmvGrowthPercent}%)\n`;
    reply += `- **Total Orders:** ${overview.orderCount} (${overview.orderGrowthPercent >= 0 ? '+' : ''}${overview.orderGrowthPercent}%)\n`;
    reply += `- **Active Merchants:** ${overview.totalVendors}\n`;
    reply += `- **Registered Customers:** ${overview.totalCustomers}\n`;
    reply += `- **Open Support Tickets:** ${overview.openTicketsCount}\n`;

    return {
      message: reply.trim(),
      category: 'overview',
      data: overview,
      suggestions: ADMIN_DEFAULT_SUGGESTIONS,
      actions: [
        { label: 'View Analytics', url: '/analytics' },
        { label: 'View Orders', url: '/orders' }
      ]
    };
  }

  // ==========================================
  // 5. PLATFORM STORE SETTINGS MANAGEMENT
  // ==========================================

  // 5a. Update Commission Rate
  const commMatch = query.match(/(?:(?:change|update|set)\s+commission(?:\s+rate)?\s+(?:to\s+)?(\d+(?:\.\d+)?))/i);
  if (commMatch) {
    const rate = parseFloat(commMatch[1]);
    const res = await adminTools.updateStoreSettings({ settings: { defaultCommissionRate: rate } });
    return {
      message: res.message || `Updated platform default commission rate to **${rate}%**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Platform Store Settings', 'Platform Overview', 'Sales Analytics']
    };
  }

  // 5b. Toggle Maintenance Mode
  if (/(?:turn\s+(?:on|off)|enable|disable|activate|deactivate)\s+maintenance(?:\s+mode)?/i.test(query)) {
    const enable = /(?:on|enable|activate)/i.test(query);
    const res = await adminTools.updateStoreSettings({ settings: { maintenanceMode: enable } });
    return {
      message: res.message || `Maintenance mode is now **${enable ? 'ENABLED (Platform Under Maintenance)' : 'DISABLED (Platform Live)'}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Platform Store Settings', 'Platform Overview']
    };
  }

  // 5c. Update Tax Rate
  const taxMatch = query.match(/(?:(?:change|update|set)\s+tax(?:\s+rate)?\s+(?:to\s+)?(\d+(?:\.\d+)?))/i);
  if (taxMatch) {
    const rate = parseFloat(taxMatch[1]);
    const res = await adminTools.updateStoreSettings({ settings: { defaultTaxRate: rate } });
    return {
      message: res.message || `Updated platform default tax rate to **${rate}%**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Platform Store Settings', 'Sales Analytics']
    };
  }

  // 5d. Update Free Shipping Threshold
  const shippingMatch = query.match(/(?:(?:change|update|set)\s+free\s+shipping(?:\s+threshold)?\s+(?:to\s+)?(?:₹\s*|rs\.?\s*)?(\d+))/i);
  if (shippingMatch) {
    const threshold = parseInt(shippingMatch[1], 10);
    const res = await adminTools.updateStoreSettings({ settings: { freeShippingThreshold: threshold } });
    return {
      message: res.message || `Updated free shipping order threshold to **₹${threshold.toLocaleString('en-IN')}**!`,
      category: 'settings',
      action: res.action,
      suggestions: ['Platform Store Settings', 'Sales Analytics']
    };
  }

  // 5e. View Platform Store Settings
  if (/(?:store\s*settings|platform\s*settings|view\s*settings|commission\s*rate|tax\s*rate|shipping\s*threshold)/i.test(query)) {
    const data = await adminTools.getStoreSettings();
    return {
      message: data.summary,
      category: 'settings',
      data: data.settings,
      suggestions: ['Change commission to 6%', 'Sales Analytics', 'Platform Overview'],
      actions: [{ label: 'Store Settings', url: '/settings' }]
    };
  }

  // ==========================================
  // 6. SALES & CUSTOMER ANALYTICS
  // ==========================================

  // 6a. Sales Analytics
  if (/(?:sales\s*analytics|revenue\s*analytics|gmv\s*trend|sales\s*trend|sales\s*breakdown|category\s*sales)/i.test(query)) {
    const data = await adminTools.getSalesAnalytics({ timeframe: '30d' });
    return {
      message: data.summary,
      category: 'analytics',
      data,
      suggestions: ['Customer Analytics', 'Platform Overview', 'Vendors with >20% sales drop'],
      actions: [{ label: 'View Sales Analytics', url: '/analytics/sales' }]
    };
  }

  // 6b. Customer Analytics
  if (/(?:customer\s*analytics|customer\s*spenders|top\s*customers|customer\s*cohort|customer\s*retention)/i.test(query)) {
    const data = await adminTools.getCustomerAnalytics({ timeframe: '30d' });
    return {
      message: data.summary,
      category: 'analytics',
      data,
      suggestions: ['Sales Analytics', 'Platform Overview'],
      actions: [{ label: 'View Customer Analytics', url: '/analytics/customers' }]
    };
  }

  // ==========================================
  // 7. PAYOUTS & SETTLEMENTS
  // ==========================================

  // 7a. Process Payout (e.g. "payout ₹5000 to Apex" or "process payout of 5000 to Apex")
  const payoutProcessMatch = query.match(/(?:(?:process|pay|settle|send|dispatch)\s+(?:vendor\s+)?payout(?:\s+of\s+)?(?:₹\s*|rs\.?\s*)?(\d+)\s+(?:to\s+)(.+)|(?:process|pay|settle|send)\s+(.+)\s+(?:a\s+)?payout(?:\s+of\s+)?(?:₹\s*|rs\.?\s*)?(\d+))/i);
  if (payoutProcessMatch) {
    const amount = parseInt(payoutProcessMatch[1] || payoutProcessMatch[4], 10);
    const vendorName = (payoutProcessMatch[2] || payoutProcessMatch[3] || '').trim();
    if (amount > 0 && vendorName) {
      const res = await adminTools.processVendorPayout({ vendorIdOrName: vendorName, amount });
      return {
        message: res.error || res.message,
        category: 'payouts',
        action: res.action,
        suggestions: ['Platform Payouts', 'Sales Analytics']
      };
    }
  }

  // 7b. View Payouts Overview
  if (/(?:payouts?|vendor\s+payouts?|payout\s+liabilit(?:y|ies)|pending\s+payouts?|merchant\s+payouts?)/i.test(query)) {
    const data = await adminTools.getPlatformPayouts();
    return {
      message: data.summary,
      category: 'payouts',
      data,
      suggestions: ['Sales Analytics', 'Platform Overview'],
      actions: [{ label: 'View Payouts', url: '/payouts' }]
    };
  }

  // ==========================================
  // 8. NOTIFICATIONS & BROADCASTS
  // ==========================================

  const broadcastMatch = raw.match(/(?:(?:broadcast|send)\s+(?:a\s+)?(?:notification|alert|announcement)\s+(?:to\s+)?(all|customers?|vendors?)(?:\s*[:\-]\s*|\s+with\s+(?:title\s+)?["']?)([^"'\n]+)(?:["']?\s+(?:message\s+)?["']?([^"'\n]+)["']?)?)/i);
  if (broadcastMatch) {
    const target = broadcastMatch[1].trim();
    const title = broadcastMatch[2].trim();
    const msg = (broadcastMatch[3] || title).trim();
    const res = await adminTools.sendPlatformNotification({ recipientType: target, title, message: msg });
    return {
      message: res.message || `Broadcast notification sent!`,
      category: 'notifications',
      action: res.action,
      suggestions: ['Platform Overview', 'Platform Store Settings']
    };
  }

  // ==========================================
  // 9. SCHEDULED EMAIL REPORTS & DIGESTS
  // ==========================================

  if (/(?:(?:trigger|send|dispatch|run)\s+(?:scheduled\s+)?(?:email\s+)?(?:report|digest|statement)|monthly\s+email|annual\s+email|six\s*month\s+email)/i.test(query)) {
    let type = 'monthly';
    if (/annual/i.test(query)) type = 'annual';
    else if (/six\s*month/i.test(query)) type = 'six_month';
    else if (/daily/i.test(query)) type = 'daily_vendor';

    const res = await adminTools.triggerPlatformScheduledReport({ type });
    return {
      message: res.message,
      category: 'reports',
      action: res.action,
      suggestions: ['Platform Overview', 'Sales Analytics']
    };
  }

  // ==========================================
  // 10. DEFAULT CONVERSATIONAL GREETING & GUIDANCE
  // ==========================================
  return {
    message: `Hello! I'm **Titan**, your Platform Intelligence and Executive Copilot.\n\nI can analyze platform-wide GMV, audit underperforming merchants, detect anomalies, update your administrator profile or AI settings, and manage merchant accounts.\n\nWhat would you like to inspect today?`,
    category: 'general',
    suggestions: [
      'Change my name to Super Admin',
      'Platform Overview',
      'Vendors with >20% sales drop',
      'Titan Settings',
      'Anomaly Detection'
    ],
    actions: [
      { label: 'Platform Analytics', url: '/analytics' },
      { label: 'Orders Overview', url: '/orders' }
    ]
  };
}

module.exports = {
  adminNlpDispatcher,
  ADMIN_DEFAULT_SUGGESTIONS
};

