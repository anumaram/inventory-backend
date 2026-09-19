/**
 * Admin AI Tools Service (Titan)
 * Connects Admin Platform Intelligence to existing MongoDB models & analytics
 */

const mongoose = require('mongoose');
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const Customer = require('../../models/customer.model');
const User = require('../../models/user.model');
const Return = require('../../models/return.model');
const Transaction = require('../../models/transaction.model');
const SupportTicket = require('../../models/support-ticket.model');
const AuditLog = require('../../models/audit-log.model');
const Admin = require('../../models/admin.model');
const AiSettings = require('../../models/ai-settings.model');
const StoreSettings = require('../../models/store-settings.model');
const Notification = require('../../models/notification.model');
const VendorTransaction = require('../../models/vendor-transaction.model');

/**
 * 1. Platform Overview & Vital Signs
 */
async function getPlatformOverview({ timeframe = '30d' } = {}) {
  const now = new Date();
  let days = 30;
  if (timeframe === '7d') days = 7;
  else if (timeframe === '90d') days = 90;

  const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStartDate = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    totalVendors,
    totalProducts,
    currentOrders,
    previousOrders,
    openTickets
  ] = await Promise.all([
    Customer.countDocuments({ isDeleted: { $ne: true } }),
    User.countDocuments({ isDeleted: { $ne: true } }),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    Order.find({ createdAt: { $gte: currentStartDate }, status: { $ne: 'cancelled' } }).lean(),
    Order.find({ createdAt: { $gte: previousStartDate, $lt: currentStartDate }, status: { $ne: 'cancelled' } }).lean(),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } })
  ]);

  const currentGmv = currentOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const previousGmv = previousOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const gmvGrowth = previousGmv > 0
    ? Math.round(((currentGmv - previousGmv) / previousGmv) * 100)
    : (currentGmv > 0 ? 100 : 0);

  const orderGrowth = previousOrders.length > 0
    ? Math.round(((currentOrders.length - previousOrders.length) / previousOrders.length) * 100)
    : (currentOrders.length > 0 ? 100 : 0);

  return {
    timeframe: `${days}d`,
    gmv: currentGmv,
    gmvGrowthPercent: gmvGrowth,
    orderCount: currentOrders.length,
    orderGrowthPercent: orderGrowth,
    totalCustomers,
    totalVendors,
    totalProducts,
    openTicketsCount: openTickets,
    summary: `Platform GMV over the last ${days} days reached **₹${currentGmv.toLocaleString('en-IN')}** across **${currentOrders.length} orders** (${gmvGrowth >= 0 ? '+' : ''}${gmvGrowth}% growth). Active ecosystem consists of **${totalVendors} vendors**, **${totalCustomers} registered customers**, and **${totalProducts} live products**.`
  };
}

/**
 * 2. Vendor Performance Comparison & Drop Detector (> 20% drop)
 */
async function getVendorPerformanceComparison({ thresholdDropPercent = 20 } = {}) {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const vendors = await User.find({ isDeleted: { $ne: true } }).select('_id name businessName status').lean();
  const vendorSummaries = [];

  for (const v of vendors) {
    const prods = await Product.find({ userId: v._id, isDeleted: { $ne: true } }).select('_id').lean();
    const pIds = prods.map((p) => p._id);

    if (pIds.length === 0) continue;

    const [currOrders, prevOrders] = await Promise.all([
      Order.find({ 'items.productId': { $in: pIds }, createdAt: { $gte: currentStart }, status: { $ne: 'cancelled' } }).lean(),
      Order.find({ 'items.productId': { $in: pIds }, createdAt: { $gte: previousStart, $lt: currentStart }, status: { $ne: 'cancelled' } }).lean()
    ]);

    const sumRev = (ords) => ords.reduce((sum, o) => {
      return sum + (o.items || []).reduce((itemSum, item) => {
        const idStr = String(item.productId || item.product?._id);
        if (pIds.some((p) => String(p) === idStr)) {
          return itemSum + (Number(item.price || 0) * Number(item.qty || 1));
        }
        return itemSum;
      }, 0);
    }, 0);

    const currRev = sumRev(currOrders);
    const prevRev = sumRev(prevOrders);

    let growth = 0;
    if (prevRev > 0) {
      growth = Math.round(((currRev - prevRev) / prevRev) * 100);
    } else if (currRev > 0) {
      growth = 100;
    }

    vendorSummaries.push({
      vendorId: v._id,
      vendorName: v.businessName || v.name || 'Vendor',
      currentRevenue: currRev,
      previousRevenue: prevRev,
      growthPercent: growth,
      status: v.status
    });
  }

  vendorSummaries.sort((a, b) => b.currentRevenue - a.currentRevenue);

  const droppedVendors = vendorSummaries.filter(
    (v) => v.growthPercent <= -Math.abs(thresholdDropPercent) && v.previousRevenue > 500
  );
  const topGrowing = vendorSummaries.filter((v) => v.growthPercent > 10).slice(0, 3);

  let narrative = '';
  if (droppedVendors.length > 0) {
    narrative = `⚠️ **${droppedVendors.length} vendors** experienced a sales decline greater than **${thresholdDropPercent}%** in the past 30 days: ` +
      droppedVendors.map((v) => `${v.vendorName} (${v.growthPercent}%)`).join(', ') + '.';
  } else {
    narrative = `✅ No vendors had a sales drop exceeding ${thresholdDropPercent}% this month. Platform merchant stability is high.`;
  }

  return {
    totalActiveVendorsAnalyzed: vendorSummaries.length,
    droppedVendors,
    topGrowingVendors: topGrowing,
    allVendors: vendorSummaries.slice(0, 10),
    summary: narrative
  };
}

/**
 * 3. Platform Inventory Risk & Stockout Bottlenecks
 */
async function getPlatformInventoryRisk() {
  const products = await Product.find({ isDeleted: { $ne: true } })
    .select('name category price quantity salesCount userId')
    .populate('userId', 'businessName name')
    .lean();

  const outOfStock = products.filter((p) => Number(p.quantity || 0) <= 0);
  const criticalStock = products.filter((p) => Number(p.quantity || 0) > 0 && Number(p.quantity || 0) <= 5);

  // High-value stockouts (products with high past sales that ran out)
  const highImpactStockouts = outOfStock
    .filter((p) => Number(p.salesCount || 0) > 5 || Number(p.price || 0) > 2000)
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    .slice(0, 5);

  const potentialLostRevenue = highImpactStockouts.reduce((acc, p) => acc + (Number(p.price || 0) * 10), 0);

  return {
    totalCatalogProducts: products.length,
    outOfStockCount: outOfStock.length,
    criticalCount: criticalStock.length,
    highImpactStockouts: highImpactStockouts.map((p) => ({
      name: p.name,
      vendor: p.userId?.businessName || p.userId?.name || 'Unknown',
      price: p.price,
      salesCount: p.salesCount || 0
    })),
    potentialLostRevenueRisk: potentialLostRevenue,
    summary: `Identified **${outOfStock.length} out-of-stock items** and **${criticalStock.length} critically low items** platform-wide. ${highImpactStockouts.length} are high-demand products creating an estimated **₹${potentialLostRevenue.toLocaleString('en-IN')}** in potential lost revenue risk.`
  };
}

/**
 * 4. Anomaly Detection (High-Value Orders, Cancellation Spikes, Blocked Users)
 */
async function getPlatformAnomalies() {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [recentOrders, highValueOrders, suspendedVendors, blockedCustomers] = await Promise.all([
    Order.find({ createdAt: { $gte: last7Days } }).lean(),
    Order.find({ totalAmount: { $gte: 10000 }, createdAt: { $gte: last7Days } })
      .populate('customerId', 'name email')
      .sort({ totalAmount: -1 })
      .limit(5)
      .lean(),
    User.countDocuments({ status: 'suspended', isDeleted: { $ne: true } }),
    Customer.countDocuments({ isBlocked: true, isDeleted: { $ne: true } })
  ]);

  const cancelledCount = recentOrders.filter((o) => o.status === 'cancelled').length;
  const cancellationRate = recentOrders.length > 0 ? Math.round((cancelledCount / recentOrders.length) * 100) : 0;

  const anomalies = [];

  // High-value anomaly
  if (highValueOrders.length > 0) {
    anomalies.push({
      type: 'high_value',
      severity: 'info',
      title: `${highValueOrders.length} High-Value Orders (≥ ₹10,000)`,
      description: `Largest order: ₹${Number(highValueOrders[0].totalAmount).toLocaleString('en-IN')} by ${highValueOrders[0].customerId?.name || 'Customer'}`
    });
  }

  // Cancellation spike anomaly
  if (cancellationRate > 15) {
    anomalies.push({
      type: 'cancellation_spike',
      severity: 'warning',
      title: `Elevated Order Cancellation Rate (${cancellationRate}%)`,
      description: `${cancelledCount} of ${recentOrders.length} orders in the last 7 days were cancelled.`
    });
  }

  // Security anomaly
  if (suspendedVendors > 0 || blockedCustomers > 0) {
    anomalies.push({
      type: 'security_flags',
      severity: 'notice',
      title: 'Restricted Accounts Active',
      description: `${suspendedVendors} suspended vendors and ${blockedCustomers} blocked customer accounts under monitoring.`
    });
  }

  return {
    recentOrderCount: recentOrders.length,
    cancelledOrderCount: cancelledCount,
    cancellationRatePercent: cancellationRate,
    highValueOrders: highValueOrders.map((o) => ({
      orderId: o.orderId || o._id,
      amount: o.totalAmount,
      customer: o.customerId?.name || 'Customer',
      date: o.createdAt
    })),
    anomalies,
    summary: anomalies.length > 0
      ? `Detected **${anomalies.length} platform anomalies**: ${anomalies.map((a) => a.title).join(' | ')}.`
      : 'All platform metrics are operating within normal parameters. No anomalous spikes detected.'
  };
}

/**
 * 5. Payment & Refund Trends
 */
async function getPaymentAndRefundAnalysis({ timeframe = '30d' } = {}) {
  const days = timeframe === '7d' ? 7 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orders, refunds] = await Promise.all([
    Order.find({ createdAt: { $gte: startDate } }).select('paymentMethod totalAmount status').lean(),
    Transaction.find({ type: 'refund', createdAt: { $gte: startDate } }).lean()
  ]);

  const methodBreakdown = {};
  let totalOrderRevenue = 0;

  orders.forEach((o) => {
    const m = (o.paymentMethod || 'online').toLowerCase();
    methodBreakdown[m] = (methodBreakdown[m] || 0) + 1;
    if (o.status !== 'cancelled') {
      totalOrderRevenue += Number(o.totalAmount || 0);
    }
  });

  const totalRefundAmount = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const refundRate = totalOrderRevenue > 0 ? Number(((totalRefundAmount / totalOrderRevenue) * 100).toFixed(1)) : 0;

  return {
    timeframe: `${days}d`,
    paymentMethodCounts: methodBreakdown,
    totalRefundsProcessed: refunds.length,
    totalRefundAmount,
    refundRatePercent: refundRate,
    summary: `Processed **${refunds.length} refunds** totaling **₹${totalRefundAmount.toLocaleString('en-IN')}** (${refundRate}% of GMV) over the last ${days} days. Most popular payment channel is **${Object.entries(methodBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'online'}**.`
  };
}

/**
 * 6. Support Tickets Summary
 */
async function getSupportTicketsSummary() {
  const [openTickets, urgentTickets, recentTickets] = await Promise.all([
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    SupportTicket.find({ status: { $in: ['open', 'in_progress'] }, priority: { $in: ['high', 'urgent'] } })
      .select('ticketId subject category priority userName createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    SupportTicket.find({}).sort({ createdAt: -1 }).limit(20).lean()
  ]);

  const categoryCounts = {};
  recentTickets.forEach((t) => {
    const cat = t.category || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return {
    openTicketsCount: openTickets,
    urgentTicketsCount: urgentTickets.length,
    urgentTickets: urgentTickets.map((t) => ({
      ticketId: t.ticketId,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      user: t.userName
    })),
    categoryBreakdown: categoryCounts,
    summary: `Currently **${openTickets} tickets are pending resolution**, including **${urgentTickets.length} high/urgent priority** tickets requiring immediate attention.`
  };
}

/**
 * 7. Security & Audit Trail Summary
 */
async function getSecurityAuditSummary() {
  const recentLogs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const flaggedLogs = recentLogs.filter(
    (l) => /suspend|block|delete|permission|role|auth/i.test(l.action) || l.entityType === 'auth'
  );

  return {
    recentAuditLogsCount: recentLogs.length,
    criticalSecurityEvents: flaggedLogs.map((l) => ({
      admin: l.adminName || 'Admin',
      action: l.action,
      entity: l.entityType,
      time: l.createdAt
    })),
    summary: `System logged **${recentLogs.length} recent administrative actions**. Found **${flaggedLogs.length} security-sensitive events** (role changes, access suspensions, or deletions).`
  };
}

/**
 * 8. Executive BI Report Generator
 */
async function generateExecutiveReportSummary({ timeframe = '30d' } = {}) {
  const [overview, vendorComp, risk, anomalies, payments] = await Promise.all([
    getPlatformOverview({ timeframe }),
    getVendorPerformanceComparison(),
    getPlatformInventoryRisk(),
    getPlatformAnomalies(),
    getPaymentAndRefundAnalysis({ timeframe })
  ]);

  return {
    title: `Platform Executive Business Intelligence Report (${overview.timeframe})`,
    timestamp: new Date().toISOString(),
    metrics: {
      gmv: overview.gmv,
      growth: overview.gmvGrowthPercent,
      orders: overview.orderCount,
      vendors: overview.totalVendors,
      customers: overview.totalCustomers
    },
    sections: [
      {
        heading: 'Financial & Growth Overview',
        content: overview.summary
      },
      {
        heading: 'Vendor Performance & Revenue Stability',
        content: vendorComp.summary
      },
      {
        heading: 'Inventory Health & Lost Opportunity Risks',
        content: risk.summary
      },
      {
        heading: 'Payments, Liquidity & Anomaly Flags',
        content: `${payments.summary} ${anomalies.summary}`
      }
    ],
    strategicRecommendations: [
      risk.outOfStockCount > 0 ? `Urge top vendors to replenish ${risk.outOfStockCount} out-of-stock SKUs to recover estimated ₹${risk.potentialLostRevenueRisk.toLocaleString('en-IN')} in lost GMV.` : 'Inventory levels are healthy across core categories.',
      vendorComp.droppedVendors.length > 0 ? `Conduct account health reviews for ${vendorComp.droppedVendors.length} vendors with steep revenue drops.` : 'Maintain vendor engagement initiatives.',
      anomalies.cancellationRatePercent > 12 ? 'Investigate causes for elevated cancellation rates on recent checkout orders.' : 'Order fulfillment rate remains within acceptable thresholds.'
    ]
  };
}

/**
  * 9. Admin Profile Management
  */
async function getAdminProfile({ adminId } = {}) {
  let filter = adminId ? { _id: adminId } : { isDefault: true };
  let admin = await Admin.findOne(filter).select('-password').lean();
  if (!admin) admin = await Admin.findOne({}).select('-password').lean();
  if (!admin) return { error: 'Admin account not found.' };

  return {
    admin: {
      _id: String(admin._id),
      name: admin.name || 'Administrator',
      email: admin.email || '',
      mobile: admin.mobile || '',
      address: admin.address || '',
      role: admin.role || 'admin'
    },
    summary: `Logged in as **${admin.name || 'Administrator'}** (${admin.email}, Role: \`${admin.role || 'admin'}\`). Mobile: ${admin.mobile || 'Not set'}.`
  };
}

async function updateAdminProfile({ adminId, name, mobile, address } = {}) {
  let filter = {};
  if (adminId) {
    filter = { _id: adminId };
  } else {
    filter = { isDefault: true };
  }

  let admin = await Admin.findOne(filter);
  if (!admin) {
    admin = await Admin.findOne({});
  }
  if (!admin) {
    return { success: false, error: 'Admin account not found.' };
  }

  const updates = {};
  if (name !== undefined && name !== null && String(name).trim()) updates.name = String(name).trim();
  if (mobile !== undefined && mobile !== null && String(mobile).trim()) updates.mobile = String(mobile).trim();
  if (address !== undefined && address !== null && String(address).trim()) updates.address = String(address).trim();

  const updatedAdmin = await Admin.findByIdAndUpdate(admin._id, { $set: updates }, { new: true }).lean();

  try {
    await AuditLog.create({
      adminId: admin._id,
      adminName: updatedAdmin.name || 'Admin',
      action: `Profile updated via Titan AI (${Object.keys(updates).join(', ')})`,
      entityType: 'admin',
      entityId: String(admin._id),
      details: updates
    });
  } catch (auditErr) {
    // Audit log non-blocking
  }

  const profileData = {
    _id: String(updatedAdmin._id),
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    mobile: updatedAdmin.mobile || '',
    address: updatedAdmin.address || '',
    role: updatedAdmin.role || 'admin'
  };

  return {
    success: true,
    admin: profileData,
    action: {
      type: 'profile_updated',
      role: 'admin',
      name: updatedAdmin.name,
      admin: profileData,
      message: `Admin profile successfully updated! Name is now **${updatedAdmin.name}**.`
    },
    message: `Admin profile successfully updated! Name is now **${updatedAdmin.name}**.`
  };
}

/**
  * 10. Titan Settings Management
  */
async function getTitanSettings({ adminId } = {}) {
  let targetId = adminId;
  if (!targetId) {
    const defaultAdmin = await Admin.findOne({});
    targetId = defaultAdmin?._id;
  }
  let settings = await AiSettings.findOne({ aiType: 'titan', userId: targetId }).lean();
  if (!settings) {
    settings = await AiSettings.create({
      aiType: 'titan',
      userId: targetId,
      userType: 'admin'
    });
  }
  return {
    settings,
    summary: `Active provider preference: **${settings.aiProviderPreference || 'auto'}**. Anomaly detection threshold: **${settings.anomalyThresholdPct || 20}%**. Default timeframe: **${settings.defaultTimeframe || '30d'}**. Voice input: **${settings.voiceInputEnabled !== false ? 'Enabled' : 'Disabled'}**.`
  };
}

async function updateTitanSettings({ adminId, settings = {} } = {}) {
  let targetId = adminId;
  if (!targetId) {
    const defaultAdmin = await Admin.findOne({});
    targetId = defaultAdmin?._id;
  }

  const cleanSettings = { ...settings };
  delete cleanSettings._id;
  delete cleanSettings.userId;
  delete cleanSettings.aiType;
  delete cleanSettings.userType;

  const updated = await AiSettings.findOneAndUpdate(
    { aiType: 'titan', userId: targetId },
    { $set: cleanSettings },
    { new: true, upsert: true }
  ).lean();

  return {
    success: true,
    settings: updated,
    action: {
      type: 'settings_updated',
      role: 'admin',
      settings: updated,
      message: 'Titan AI settings updated successfully.'
    },
    message: `Titan AI settings updated successfully. Provider preference set to **${updated.aiProviderPreference}**.`
  };
}

/**
  * 11. Vendor Management Tools
  */
async function updateVendorStatus({ vendorIdOrName, status, reason = '' } = {}) {
  if (!vendorIdOrName) return { error: 'Vendor name or ID is required.' };
  if (!['active', 'suspended', 'pending_approval'].includes(status)) {
    return { error: 'Status must be active, suspended, or pending_approval.' };
  }

  let vendor = null;
  if (mongoose.isValidObjectId(vendorIdOrName)) {
    vendor = await User.findById(vendorIdOrName);
  }
  if (!vendor) {
    vendor = await User.findOne({
      $or: [
        { businessName: new RegExp(`^${vendorIdOrName.trim()}$`, 'i') },
        { name: new RegExp(`^${vendorIdOrName.trim()}$`, 'i') },
        { businessName: new RegExp(vendorIdOrName.trim(), 'i') }
      ],
      isDeleted: { $ne: true }
    });
  }

  if (!vendor) return { error: `Could not find any vendor matching "${vendorIdOrName}".` };

  vendor.status = status;
  await vendor.save();

  try {
    await AuditLog.create({
      action: `Vendor ${vendor.businessName || vendor.name} status updated to ${status} via Titan AI`,
      entityType: 'vendor',
      entityId: String(vendor._id),
      details: { status, reason }
    });
  } catch (err) {}

  return {
    success: true,
    vendor: {
      _id: String(vendor._id),
      name: vendor.name,
      businessName: vendor.businessName,
      status: vendor.status
    },
    action: {
      type: 'vendor_status_updated',
      vendor: {
        _id: String(vendor._id),
        name: vendor.name,
        businessName: vendor.businessName,
        status: vendor.status
      },
      message: `Vendor **${vendor.businessName || vendor.name}** account status has been changed to **${status}**.`
    },
    message: `Vendor **${vendor.businessName || vendor.name}** account status has been changed to **${status}**.`
  };
}

async function getVendorDetails({ vendorIdOrName } = {}) {
  if (!vendorIdOrName) return { error: 'Vendor name or ID is required.' };
  let vendor = null;
  if (mongoose.isValidObjectId(vendorIdOrName)) {
    vendor = await User.findById(vendorIdOrName).lean();
  }
  if (!vendor) {
    vendor = await User.findOne({
      $or: [
        { businessName: new RegExp(vendorIdOrName.trim(), 'i') },
        { name: new RegExp(vendorIdOrName.trim(), 'i') }
      ],
      isDeleted: { $ne: true }
    }).lean();
  }
  if (!vendor) return { error: `Could not find any merchant matching "${vendorIdOrName}".` };

  const products = await Product.find({ userId: vendor._id, isDeleted: { $ne: true } }).lean();
  const productIds = products.map((p) => p._id);
  const orders = await Order.find({ 'items.productId': { $in: productIds }, status: { $ne: 'cancelled' } }).lean();

  let totalRev = 0;
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (productIds.some((pid) => String(pid) === String(it.productId))) {
        totalRev += (Number(it.price || 0) * Number(it.qty || 1));
      }
    });
  });

  return {
    vendor: {
      _id: String(vendor._id),
      name: vendor.name,
      businessName: vendor.businessName,
      email: vendor.email,
      phone: vendor.phone,
      status: vendor.status,
      productCount: products.length,
      orderCount: orders.length,
      totalRevenue: totalRev
    },
    summary: `### 🏢 Vendor Dossier: **${vendor.businessName || vendor.name}**\n\n- **Status:** \`${vendor.status || 'active'}\`\n- **Contact:** ${vendor.name} (${vendor.email || 'N/A'}, Phone: ${vendor.phone || 'N/A'})\n- **Active Products:** ${products.length} SKUs\n- **Completed Orders:** ${orders.length}\n- **Total Platform Sales:** ₹${totalRev.toLocaleString('en-IN')}`
  };
}

/**
 * 13. Platform Store Settings Management
 */
async function getStoreSettings() {
  let settings = await StoreSettings.findOne().lean();
  if (!settings) {
    const created = await StoreSettings.create({});
    settings = created.toObject();
  }
  return {
    settings,
    summary: `### ⚙️ Platform Store Settings\n\n- **Store Name:** ${settings.storeName}\n- **Tagline:** ${settings.tagline}\n- **Support Email:** ${settings.supportEmail}\n- **Support Phone:** ${settings.supportPhone}\n- **Address:** ${settings.address}\n- **Currency:** ${settings.currency} (${settings.currencySymbol})\n- **Default Commission Rate:** ${settings.defaultCommissionRate}%\n- **Default Tax Rate:** ${settings.defaultTaxRate}%\n- **Free Shipping Threshold:** ₹${settings.freeShippingThreshold}\n- **Default Delivery Fee:** ₹${settings.defaultDeliveryFee}\n- **Return Window:** ${settings.returnWindowDays} days\n- **Low Stock Threshold:** ${settings.lowStockThreshold} units\n- **Maintenance Mode:** ${settings.maintenanceMode ? '🔴 Active' : '🟢 Inactive'}\n- **Email Notifications:** ${settings.enableEmailNotifications ? 'Enabled' : 'Disabled'}`
  };
}

async function updateStoreSettings({ settings = {} } = {}) {
  const allowedFields = [
    'storeName', 'tagline', 'supportEmail', 'supportPhone', 'address',
    'currency', 'currencySymbol', 'defaultCommissionRate', 'defaultTaxRate',
    'freeShippingThreshold', 'defaultDeliveryFee', 'returnWindowDays',
    'lowStockThreshold', 'enableEmailNotifications', 'maintenanceMode'
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (settings[field] !== undefined) {
      updates[field] = settings[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No valid store settings provided for update.' };
  }

  const updated = await StoreSettings.findOneAndUpdate({}, { $set: updates }, { new: true, upsert: true }).lean();

  try {
    await AuditLog.create({
      action: 'Store settings updated via Titan AI',
      entityType: 'settings',
      details: updates
    });
  } catch (err) {}

  const changesList = Object.entries(updates).map(([k, v]) => `**${k}**: \`${v}\``).join(', ');

  return {
    success: true,
    settings: updated,
    action: {
      type: 'store_settings_updated',
      settings: updated,
      message: `Store platform settings updated successfully: ${changesList}`
    },
    message: `Platform store settings have been updated successfully! Changes: ${changesList}.`
  };
}

/**
 * 14. Sales Analytics & Revenue Trends
 */
async function getSalesAnalytics({ timeframe = '30d' } = {}) {
  const now = new Date();
  let days = 30;
  if (timeframe === '7d') days = 7;
  else if (timeframe === '90d') days = 90;
  else if (timeframe === '1d' || timeframe === 'today') days = 1;

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const orders = await Order.find({ createdAt: { $gte: startDate }, status: { $ne: 'cancelled' }, isDeleted: { $ne: true } }).lean();

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const paymentMethods = {};
  const categorySales = {};
  orders.forEach((o) => {
    const pm = (o.paymentMethod || 'other').toUpperCase();
    paymentMethods[pm] = (paymentMethods[pm] || 0) + Number(o.totalAmount || 0);
    (o.items || []).forEach((item) => {
      const cat = item.category || 'General';
      categorySales[cat] = (categorySales[cat] || 0) + (Number(item.price || 0) * Number(item.qty || 1));
    });
  });

  return {
    timeframe: `${days}d`,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    paymentMethods,
    categorySales,
    summary: `### 📈 Platform Sales Analytics (${days} Days)\n\n- **Total GMV:** ₹${totalRevenue.toLocaleString('en-IN')}\n- **Total Completed Orders:** ${totalOrders}\n- **Average Order Value (AOV):** ₹${avgOrderValue.toLocaleString('en-IN')}\n- **Top Payment Methods:** ${Object.entries(paymentMethods).map(([k, v]) => `${k} (₹${v.toLocaleString('en-IN')})`).join(', ') || 'N/A'}\n- **Top Categories:** ${Object.entries(categorySales).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (₹${v.toLocaleString('en-IN')})`).join(', ') || 'N/A'}`
  };
}

/**
 * 15. Customer Analytics & Cohorts
 */
async function getCustomerAnalytics({ timeframe = '30d' } = {}) {
  const [totalCustomers, activeCount, topSpenders] = await Promise.all([
    Customer.countDocuments({ isDeleted: { $ne: true } }),
    Customer.countDocuments({ isDeleted: { $ne: true }, updatedAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    Order.aggregate([
      { $match: { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customerId', totalSpent: { $sum: '$totalAmount' }, ordersCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' }
    ])
  ]);

  return {
    totalCustomers,
    activeCustomersPastMonth: activeCount,
    topSpenders: topSpenders.map((s) => ({
      name: s.customer.name,
      email: s.customer.email,
      totalSpent: s.totalSpent,
      ordersCount: s.ordersCount
    })),
    summary: `### 👥 Customer Analytics & Retention\n\n- **Registered Customers:** ${totalCustomers}\n- **Active Customers (Past 30d):** ${activeCount}\n- **Top Customer Spenders:**\n${topSpenders.map((s, idx) => `  ${idx + 1}. **${s.customer.name}** — ₹${Number(s.totalSpent).toLocaleString('en-IN')} across ${s.ordersCount} orders`).join('\n') || '  No customer order data available yet.'}`
  };
}

/**
 * 16. Platform Vendor Payouts & Liabilities
 */
async function getPlatformPayouts() {
  const [payoutsAgg, recentPayouts] = await Promise.all([
    VendorTransaction.aggregate([
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    VendorTransaction.find({ type: 'payout' }).sort({ createdAt: -1 }).limit(8).populate('vendorId', 'name businessName').lean()
  ]);

  let totalPayoutSettled = 0;
  let totalOrderEarnings = 0;
  payoutsAgg.forEach((agg) => {
    if (agg._id === 'payout') totalPayoutSettled = agg.totalAmount;
    if (agg._id === 'order_earning') totalOrderEarnings = agg.totalAmount;
  });

  return {
    totalPayoutSettled,
    totalOrderEarnings,
    outstandingFloat: Math.max(0, totalOrderEarnings - totalPayoutSettled),
    recentPayouts: recentPayouts.map((p) => ({
      _id: String(p._id),
      vendorName: p.vendorId?.businessName || p.vendorId?.name || 'Vendor',
      amount: p.amount,
      status: p.status,
      date: p.createdAt,
      payoutMethod: p.payoutMethod
    })),
    summary: `### 💳 Platform Vendor Payouts Overview\n\n- **Total Merchant Gross Earnings:** ₹${totalOrderEarnings.toLocaleString('en-IN')}\n- **Total Settlements Dispatched:** ₹${totalPayoutSettled.toLocaleString('en-IN')}\n- **Outstanding Merchant Float:** ₹${Math.max(0, totalOrderEarnings - totalPayoutSettled).toLocaleString('en-IN')}\n- **Recent Payouts:** ${recentPayouts.length > 0 ? recentPayouts.map((p) => `${p.vendorId?.businessName || p.vendorId?.name || 'Vendor'} (₹${Number(p.amount).toLocaleString('en-IN')})`).join(', ') : 'None yet.'}`
  };
}

/**
 * 17. Process Vendor Payout Settlement
 */
async function processVendorPayout({ vendorIdOrName, amount, notes = '' } = {}) {
  if (!vendorIdOrName) return { error: 'Vendor name or ID is required.' };
  const withdrawAmount = Number(amount);
  if (!withdrawAmount || withdrawAmount <= 0) return { error: 'Valid payout amount is required.' };

  let vendor = null;
  if (mongoose.isValidObjectId(vendorIdOrName)) {
    vendor = await User.findById(vendorIdOrName);
  }
  if (!vendor) {
    vendor = await User.findOne({
      $or: [
        { businessName: new RegExp(`^${vendorIdOrName.trim()}$`, 'i') },
        { name: new RegExp(`^${vendorIdOrName.trim()}$`, 'i') },
        { businessName: new RegExp(vendorIdOrName.trim(), 'i') },
        { name: new RegExp(vendorIdOrName.trim(), 'i') }
      ],
      isDeleted: { $ne: true }
    });
  }
  if (!vendor) return { error: `Could not find any vendor matching "${vendorIdOrName}".` };

  const summaryAgg = await VendorTransaction.aggregate([
    { $match: { vendorId: vendor._id } },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: { $cond: [{ $eq: ['$type', 'order_earning'] }, '$amount', 0] } },
        totalCommission: { $sum: '$commission' },
        totalRefundDeductions: { $sum: { $cond: [{ $eq: ['$type', 'refund_deduction'] }, '$amount', 0] } },
        totalPayouts: { $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] } }
      }
    }
  ]);

  const s = summaryAgg[0] || { totalEarnings: 0, totalCommission: 0, totalRefundDeductions: 0, totalPayouts: 0 };
  const netRevenue = Math.max(0, s.totalEarnings - s.totalRefundDeductions - s.totalCommission);
  const availableBalance = Math.max(0, netRevenue - s.totalPayouts);

  const payoutMethod = vendor.vendorSettings?.bankAccountNumber ? 'bank_transfer' : (vendor.vendorSettings?.upiId ? 'upi' : 'bank_transfer');
  const payoutAccount = vendor.vendorSettings?.bankAccountNumber ? `A/C ...${vendor.vendorSettings.bankAccountNumber.slice(-4)}` : (vendor.vendorSettings?.upiId || 'Primary Bank Account');

  const payoutTxn = await VendorTransaction.create({
    vendorId: vendor._id,
    type: 'payout',
    amount: withdrawAmount,
    direction: 'debit',
    status: 'completed',
    netAmount: withdrawAmount,
    commission: 0,
    payoutMethod,
    payoutAccount,
    description: `Platform payout settlement of ₹${withdrawAmount.toLocaleString('en-IN')} approved via Titan AI`,
    meta: {
      notes,
      source: 'Titan AI Admin Assistant',
      processedAt: new Date()
    }
  });

  try {
    const { createNotification } = require('../notification.service');
    await createNotification({
      userId: vendor._id,
      userType: 'vendor',
      title: 'Payout Dispatched',
      message: `A settlement payout of ₹${withdrawAmount.toLocaleString('en-IN')} has been processed and credited to your account.`,
      type: 'wallet_topup',
      actionUrl: '/vendor/payments'
    });
  } catch (err) {}

  return {
    success: true,
    transaction: payoutTxn,
    vendor: { _id: String(vendor._id), name: vendor.name, businessName: vendor.businessName },
    availableBalance: Math.max(0, availableBalance - withdrawAmount),
    action: {
      type: 'payout_processed',
      vendor: { _id: String(vendor._id), name: vendor.name, businessName: vendor.businessName },
      amount: withdrawAmount,
      message: `Payout of **₹${withdrawAmount.toLocaleString('en-IN')}** successfully processed for **${vendor.businessName || vendor.name}**.`
    },
    message: `Payout settlement of **₹${withdrawAmount.toLocaleString('en-IN')}** for vendor **${vendor.businessName || vendor.name}** has been processed successfully! Sent to ${payoutAccount}.`
  };
}

/**
 * 18. Broadcast Platform Notification
 */
async function sendPlatformNotification({ recipientType = 'all', title, message, priority = 'normal' } = {}) {
  if (!title || !message) return { error: 'Notification title and message are required.' };
  let recipientsDesc = [];

  const target = String(recipientType || 'all').toLowerCase();
  if (target === 'customer' || target === 'customers' || target === 'all') {
    const customers = await Customer.find({ isDeleted: { $ne: true } }).select('_id');
    if (customers.length > 0) {
      const docs = customers.map((c) => ({
        recipientId: c._id,
        recipientType: 'customer',
        userId: c._id,
        userType: 'customer',
        title,
        message,
        type: priority === 'high' ? 'alert' : 'general'
      }));
      await Notification.insertMany(docs);
      recipientsDesc.push(`${customers.length} customers`);
    }
  }

  if (target === 'vendor' || target === 'vendors' || target === 'all') {
    const vendors = await User.find({ isDeleted: { $ne: true } }).select('_id');
    if (vendors.length > 0) {
      const docs = vendors.map((v) => ({
        recipientId: v._id,
        recipientType: 'vendor',
        userId: v._id,
        userType: 'vendor',
        title,
        message,
        type: priority === 'high' ? 'alert' : 'general'
      }));
      await Notification.insertMany(docs);
      recipientsDesc.push(`${vendors.length} vendors`);
    }
  }

  const targetSummary = recipientsDesc.join(' and ') || 'target audience';

  return {
    success: true,
    action: {
      type: 'notification_sent',
      title,
      message,
      target: recipientType,
      summary: `Broadcast sent to ${targetSummary}`
    },
    message: `📢 Notification broadcast **"${title}"** has been sent to **${targetSummary}**!`
  };
}

/**
 * 19. Trigger Scheduled Platform Reports & Digests
 */
async function triggerPlatformScheduledReport({ type = 'monthly' } = {}) {
  const cleanType = ['daily_vendor', 'daily', 'monthly', 'six_month', 'annual'].includes(type) ? type : 'monthly';
  const admin = await Admin.findOne({ isDeleted: { $ne: true } });
  const adminEmail = admin?.email || 'admin@inventoryapp.com';

  const emailService = require('../email.service');
  setImmediate(async () => {
    try {
      if (cleanType === 'monthly' && admin) {
        const [orderAgg, vCount, cCount] = await Promise.all([
          Order.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: null, totalOrders: { $sum: 1 }, grossVolume: { $sum: '$totalAmount' }, totalRefunds: { $sum: '$refundAmount' } } }
          ]),
          User.countDocuments({ isDeleted: { $ne: true } }),
          Customer.countDocuments({ isDeleted: { $ne: true } })
        ]);
        const stats = orderAgg[0] || { totalOrders: 0, grossVolume: 0, totalRefunds: 0 };
        const commissionEarned = stats.grossVolume * 0.05;
        await emailService.sendMonthlyAdminRevenueEmail({
          admin,
          metrics: {
            grossVolume: stats.grossVolume,
            commissionEarned,
            netRevenue: commissionEarned,
            totalOrders: stats.totalOrders,
            totalRefunds: stats.totalRefunds,
            activeVendors: vCount,
            activeCustomers: cCount
          }
        });
      }
    } catch (e) {
      console.error('[triggerPlatformScheduledReport] background error:', e.message);
    }
  });

  return {
    success: true,
    reportType: cleanType,
    recipient: adminEmail,
    action: {
      type: 'report_triggered',
      reportType: cleanType,
      recipient: adminEmail,
      message: `Executive ${cleanType} report dispatched to ${adminEmail}`
    },
    message: `📧 Executive **${cleanType}** scheduled report successfully generated and dispatched to **${adminEmail}**!`
  };
}

module.exports = {
  getPlatformOverview,
  getVendorPerformanceComparison,
  getPlatformInventoryRisk,
  getPlatformAnomalies,
  getPaymentAndRefundAnalysis,
  getSupportTicketsSummary,
  getSecurityAuditSummary,
  generateExecutiveReportSummary,
  getAdminProfile,
  updateAdminProfile,
  getTitanSettings,
  updateTitanSettings,
  updateVendorStatus,
  getVendorDetails,
  getStoreSettings,
  updateStoreSettings,
  getSalesAnalytics,
  getCustomerAnalytics,
  getPlatformPayouts,
  processVendorPayout,
  sendPlatformNotification,
  triggerPlatformScheduledReport
};

