/**
 * Admin AI Service (Titan)
 * Platform Intelligence, Executive Analytics, and Strategic Risk Detection
 */

const { executeAiChat } = require('./ai-core.service');
const adminTools = require('./admin-tools.service');
const { adminNlpDispatcher, ADMIN_DEFAULT_SUGGESTIONS } = require('./admin-nlp.service');

const TITAN_SYSTEM_PROMPT = `
You are Titan, the Platform Intelligence and Executive AI Assistant for the platform administration of the Inventory Platform.
Your mission is to provide leadership-level business intelligence, detect fraud/anomalies, monitor vendor performance drop-offs, manage merchant accounts, and safeguard ecosystem revenue.

GUIDELINES:
1. Speak with authoritative, analytical executive clarity.
2. Format currency in Indian Rupees (e.g., ₹2,40,500) with proper formatting.
3. NEVER hallucinate metrics, GMV, or sales numbers. Use the provided tools to query real platform records.
4. Highlight significant anomalies (e.g. vendor sales drops >20%, stockout risks, high-value spikes).
5. Always provide friendly markdown formatting with bold headers, tables where appropriate, and actionable recommendations.

OPERATIONAL ACTIONS:
- If the administrator asks to update their name (e.g. "change my name to Jyothisai k"), mobile number, or address, invoke 'updateAdminProfile' immediately.
- If the administrator asks to view their profile, invoke 'getAdminProfile'.
- If the administrator asks to update AI settings, provider preference (Gemini, Groq, Cerebras, OpenRouter, Auto), anomaly threshold, or timeframe, invoke 'updateTitanSettings'.
- If the administrator asks to suspend or activate a vendor, invoke 'updateVendorStatus'.
- If the administrator asks for information on a specific merchant, invoke 'getVendorDetails'.
- If the administrator asks to view or inspect platform store settings, commission rates, tax rates, shipping threshold, delivery fee, or maintenance mode, invoke 'getStoreSettings'.
- If the administrator asks to update any store setting (e.g. commission rate, tax rate, store name, email, phone, address, maintenance mode, shipping threshold), invoke 'updateStoreSettings'.
- If the administrator asks for sales analytics, GMV trends, revenue breakdown, or payment method split, invoke 'getSalesAnalytics'.
- If the administrator asks for customer analytics, user spenders, or customer retention, invoke 'getCustomerAnalytics'.
- If the administrator asks for vendor payouts overview, liabilities, or float, invoke 'getPlatformPayouts'.
- If the administrator asks to process, settle, or dispatch a payout to a vendor, invoke 'processVendorPayout'.
- If the administrator asks to broadcast a notification or alert to customers, vendors, or all, invoke 'sendPlatformNotification'.
- If the administrator asks to trigger, run, or dispatch monthly, annual, or scheduled email digests/reports, invoke 'triggerPlatformScheduledReport'.
`.trim();

const TITAN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getPlatformOverview',
      description: 'Retrieve platform-wide Gross Merchandise Value (GMV), total orders, growth trends, vendor count, and customer count.',
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
      name: 'getVendorPerformanceComparison',
      description: 'Compare all active merchants and detect vendors experiencing a sales drop greater than a threshold (default 20%).',
      parameters: {
        type: 'object',
        properties: {
          thresholdDropPercent: {
            type: 'number',
            description: 'Percentage drop to trigger an alert. Default is 20.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPlatformInventoryRisk',
      description: 'Audit platform-wide stockout bottlenecks, out-of-stock items, and calculate potential lost GMV risk.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPlatformAnomalies',
      description: 'Scan for high-value orders (>= ₹10,000), cancellation rate spikes, and suspicious account status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPaymentAndRefundAnalysis',
      description: 'Analyze payment method distribution (UPI, Card, Wallet, COD), refund volumes, and return rates.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['7d', '30d'],
            description: 'Timeframe for payment analysis. Defaults to 30d.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSupportTicketsSummary',
      description: 'Review unresolved support desk tickets, urgent complaints, and common ticket categories.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSecurityAuditSummary',
      description: 'Review administrative audit logs for sensitive events like permissions modifications or account suspensions.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generateExecutiveReportSummary',
      description: 'Generate a comprehensive executive business intelligence report synthesizing GMV, merchant stability, and recommendations.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['7d', '30d', '90d']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAdminProfile',
      description: 'Get administrator profile details (name, email, mobile, address, role).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateAdminProfile',
      description: 'Update administrator account profile such as name, mobile phone number, or address.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'New name for the administrator' },
          mobile: { type: 'string', description: 'New mobile phone number' },
          address: { type: 'string', description: 'New address' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTitanSettings',
      description: 'Retrieve Titan AI configuration and preference settings.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateTitanSettings',
      description: 'Update Titan AI settings such as aiProviderPreference, anomalyThresholdPct, defaultTimeframe, or voiceInputEnabled.',
      parameters: {
        type: 'object',
        properties: {
          aiProviderPreference: { type: 'string', enum: ['auto', 'gemini', 'openrouter', 'groq', 'cerebras', 'nlp'] },
          anomalyThresholdPct: { type: 'number', description: 'Anomaly threshold percentage (e.g. 20)' },
          defaultTimeframe: { type: 'string', enum: ['7d', '30d', '90d'] },
          voiceInputEnabled: { type: 'boolean' },
          alertNotifications: { type: 'boolean' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateVendorStatus',
      description: 'Suspend or activate a vendor/merchant account on the platform.',
      parameters: {
        type: 'object',
        properties: {
          vendorIdOrName: { type: 'string', description: 'Vendor business name or MongoDB ID' },
          status: { type: 'string', enum: ['active', 'suspended', 'pending_approval'] },
          reason: { type: 'string', description: 'Administrative reason for status change' }
        },
        required: ['vendorIdOrName', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getVendorDetails',
      description: 'Look up comprehensive merchant dossier, sales revenue, product count, and status by vendor name or ID.',
      parameters: {
        type: 'object',
        properties: {
          vendorIdOrName: { type: 'string', description: 'Vendor business name or ID' }
        },
        required: ['vendorIdOrName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getStoreSettings',
      description: 'Retrieve platform-wide store settings including store name, support email, address, commission rate, tax rate, delivery fee, return window, and maintenance mode status.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateStoreSettings',
      description: 'Update platform-wide store settings (storeName, supportEmail, supportPhone, address, defaultCommissionRate, defaultTaxRate, freeShippingThreshold, defaultDeliveryFee, returnWindowDays, lowStockThreshold, enableEmailNotifications, maintenanceMode).',
      parameters: {
        type: 'object',
        properties: {
          storeName: { type: 'string' },
          tagline: { type: 'string' },
          supportEmail: { type: 'string' },
          supportPhone: { type: 'string' },
          address: { type: 'string' },
          defaultCommissionRate: { type: 'number', description: 'Commission percentage (e.g. 5)' },
          defaultTaxRate: { type: 'number', description: 'Tax percentage (e.g. 18)' },
          freeShippingThreshold: { type: 'number', description: 'Free shipping order threshold in INR' },
          defaultDeliveryFee: { type: 'number', description: 'Default delivery fee in INR' },
          returnWindowDays: { type: 'number', description: 'Return window in days' },
          lowStockThreshold: { type: 'number', description: 'Platform low stock threshold' },
          enableEmailNotifications: { type: 'boolean' },
          maintenanceMode: { type: 'boolean', description: 'Enable or disable maintenance mode' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSalesAnalytics',
      description: 'Retrieve detailed sales analytics: GMV, completed orders, average order value, payment method breakdown, and top categories.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', enum: ['7d', '30d', '90d', 'today'], description: 'Timeframe for analysis' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCustomerAnalytics',
      description: 'Retrieve platform customer analytics, active buyers this month, repeat rate, and top spender accounts.',
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
      name: 'getPlatformPayouts',
      description: 'Review platform vendor payout liabilities, total settled payouts, outstanding merchant float, and recent payout transactions.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'processVendorPayout',
      description: 'Approve and process a payout settlement withdrawal to a vendor.',
      parameters: {
        type: 'object',
        properties: {
          vendorIdOrName: { type: 'string', description: 'Vendor business name or MongoDB ID' },
          amount: { type: 'number', description: 'Payout amount in INR' },
          notes: { type: 'string', description: 'Optional administrative notes' }
        },
        required: ['vendorIdOrName', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sendPlatformNotification',
      description: 'Broadcast an in-app alert or notification to customers, vendors, or all platform users.',
      parameters: {
        type: 'object',
        properties: {
          recipientType: { type: 'string', enum: ['customers', 'vendors', 'all'], description: 'Target audience' },
          title: { type: 'string', description: 'Notification title' },
          message: { type: 'string', description: 'Notification message body' },
          priority: { type: 'string', enum: ['normal', 'high'] }
        },
        required: ['title', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'triggerPlatformScheduledReport',
      description: 'Trigger, run, or dispatch scheduled platform revenue digest emails (monthly, six_month, annual, daily_vendor).',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['monthly', 'six_month', 'annual', 'daily_vendor', 'daily'] }
        }
      }
    }
  }
];

async function executeTitanTool(toolName, args, context = {}) {
  switch (toolName) {
    case 'getPlatformOverview':
      return await adminTools.getPlatformOverview({ timeframe: args.timeframe || '30d' });
    case 'getVendorPerformanceComparison':
      return await adminTools.getVendorPerformanceComparison({ thresholdDropPercent: args.thresholdDropPercent || 20 });
    case 'getPlatformInventoryRisk':
      return await adminTools.getPlatformInventoryRisk();
    case 'getPlatformAnomalies':
      return await adminTools.getPlatformAnomalies();
    case 'getPaymentAndRefundAnalysis':
      return await adminTools.getPaymentAndRefundAnalysis({ timeframe: args.timeframe || '30d' });
    case 'getSupportTicketsSummary':
      return await adminTools.getSupportTicketsSummary();
    case 'getSecurityAuditSummary':
      return await adminTools.getSecurityAuditSummary();
    case 'generateExecutiveReportSummary':
      return await adminTools.generateExecutiveReportSummary({ timeframe: args.timeframe || '30d' });
    case 'getAdminProfile':
      return await adminTools.getAdminProfile({ adminId: context.adminId });
    case 'updateAdminProfile':
      return await adminTools.updateAdminProfile({ adminId: context.adminId, ...args });
    case 'getTitanSettings':
      return await adminTools.getTitanSettings({ adminId: context.adminId });
    case 'updateTitanSettings':
      return await adminTools.updateTitanSettings({ adminId: context.adminId, settings: args });
    case 'updateVendorStatus':
      return await adminTools.updateVendorStatus(args);
    case 'getVendorDetails':
      return await adminTools.getVendorDetails(args);
    case 'getStoreSettings':
      return await adminTools.getStoreSettings();
    case 'updateStoreSettings':
      return await adminTools.updateStoreSettings({ settings: args });
    case 'getSalesAnalytics':
      return await adminTools.getSalesAnalytics({ timeframe: args.timeframe || '30d' });
    case 'getCustomerAnalytics':
      return await adminTools.getCustomerAnalytics({ timeframe: args.timeframe || '30d' });
    case 'getPlatformPayouts':
      return await adminTools.getPlatformPayouts();
    case 'processVendorPayout':
      return await adminTools.processVendorPayout(args);
    case 'sendPlatformNotification':
      return await adminTools.sendPlatformNotification(args);
    case 'triggerPlatformScheduledReport':
      return await adminTools.triggerPlatformScheduledReport(args);
    default:
      return { error: `Tool ${toolName} is not recognized.` };
  }
}

const TITAN_AGENT_PROMPTS = {
  platform_bi: `
You are Titan Platform BI, the executive platform operations intelligence copilot.
Focus on platform-wide Gross Merchandise Value (GMV), order volume trajectories, and cross-category market share.
`,
  risk_auditor: `
You are Titan Risk & Anomaly Auditor.
Focus on auditing merchants experiencing >20% revenue drops, high refund spikes, suspicious activity, and platform operational risks.
`,
  executive_reporter: `
You are Titan Strategic Executive Reporter.
Focus on synthesizing high-level C-suite summaries, quarterly performance digests, and executive KPI reviews.
`,
  logistics_fulfillment: `
You are Titan Logistics & Fulfillment Monitor.
Focus on warehouse inventory distributions, inter-warehouse transfers, delivery bottlenecks, and return processing queues.
`
};

/**
 * Handle admin chat query
 */
async function chatWithAdminAi({
  adminId,
  message,
  conversationHistory = [],
  agentMode = 'auto',
  aiProviderPreference = 'auto',
  pageContext = null
}) {
  const modeInstruction = TITAN_AGENT_PROMPTS[agentMode] || TITAN_AGENT_PROMPTS.platform_bi || '';
  let contextSnippet = '';
  if (pageContext?.title || pageContext?.path) {
    contextSnippet = `\n\nCURRENT ADMIN PORTAL SCREEN CONTEXT:
The platform administrator is currently viewing: "${pageContext.title || pageContext.path}" (${pageContext.path || ''}).
Tailor any insights, strategic recommendations, quick-links, or audits to this administrative domain when relevant.`;
  }

  const fullSystemPrompt = `${TITAN_SYSTEM_PROMPT}\n\nACTIVE AGENT ROLE:\n${modeInstruction}${contextSnippet}`.trim();

  const result = await executeAiChat({
    personality: 'Titan',
    systemPrompt: fullSystemPrompt,
    tools: TITAN_TOOLS,
    executeToolCall: executeTitanTool,
    message,
    conversationHistory,
    context: { adminId, agentMode, aiProviderPreference, pageContext },
    nlpFallback: adminNlpDispatcher
  });

  if (!result.suggestions || result.suggestions.length === 0) {
    result.suggestions = ADMIN_DEFAULT_SUGGESTIONS.slice(0, 4);
  }

  return { ...result, agentMode };
}

/**
 * Generate Platform Executive Summary for Admin Dashboard Card
 */
async function getAdminDashboardAiSummary() {
  const [overview, vendorComp, risk, anomalies] = await Promise.all([
    adminTools.getPlatformOverview({ timeframe: '30d' }),
    adminTools.getVendorPerformanceComparison({ thresholdDropPercent: 20 }),
    adminTools.getPlatformInventoryRisk(),
    adminTools.getPlatformAnomalies()
  ]);

  const observations = [];

  // Observation 1: Financial & Growth
  observations.push({
    type: overview.gmvGrowthPercent >= 0 ? 'positive' : 'warning',
    icon: overview.gmvGrowthPercent >= 0 ? 'trending-up' : 'trending-down',
    title: 'Platform GMV Trajectory',
    text: `Platform revenue reached **₹${overview.gmv.toLocaleString('en-IN')}** (${overview.gmvGrowthPercent >= 0 ? '+' : ''}${overview.gmvGrowthPercent}% vs prior 30d) with ${overview.orderCount} completed orders.`
  });

  // Observation 2: Merchant Health & Drops
  if (vendorComp.droppedVendors.length > 0) {
    observations.push({
      type: 'warning',
      icon: 'alert-triangle',
      title: 'Merchant Sales Alerts',
      text: `${vendorComp.droppedVendors.length} vendors experienced sales drops exceeding 20% this month. Review catalog availability.`
    });
  } else {
    observations.push({
      type: 'positive',
      icon: 'shield-check',
      title: 'Merchant Stability',
      text: `All ${vendorComp.totalActiveVendorsAnalyzed} active merchants maintained stable or growing sales velocities.`
    });
  }

  // Observation 3: Inventory Bottleneck
  if (risk.outOfStockCount > 0) {
    observations.push({
      type: 'critical',
      icon: 'package-x',
      title: 'Catalog Stockout Impact',
      text: `${risk.outOfStockCount} products out of stock platform-wide, representing ~₹${risk.potentialLostRevenueRisk.toLocaleString('en-IN')} in potential lost GMV.`
    });
  }

  // Observation 4: Anomalies & High-Value
  if (anomalies.highValueOrders.length > 0) {
    observations.push({
      type: 'info',
      icon: 'zap',
      title: 'High-Value Checkout Volume',
      text: `${anomalies.highValueOrders.length} orders exceeded ₹10,000 in the last 7 days with zero chargeback alerts.`
    });
  }

  return {
    timeframe: 'Last 30 Days',
    metrics: {
      gmv: overview.gmv,
      gmvGrowthPercent: overview.gmvGrowthPercent,
      orderCount: overview.orderCount,
      totalVendors: overview.totalVendors,
      totalCustomers: overview.totalCustomers,
      droppedVendorsCount: vendorComp.droppedVendors.length,
      outOfStockCount: risk.outOfStockCount,
      openTicketsCount: overview.openTicketsCount
    },
    observations,
    quickSuggestions: [
      'Platform Overview',
      'Vendors with >20% sales drop',
      'Platform Inventory Risk',
      'Anomaly Detection'
    ]
  };
}

module.exports = {
  chatWithAdminAi,
  getAdminDashboardAiSummary,
  generateAdminReport: adminTools.generateExecutiveReportSummary,
  TITAN_TOOLS
};

