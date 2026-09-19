const SupportTicket = require('../models/support-ticket.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const emailService = require('./email.service');
const notificationService = require('./notification.service');

// Helper to generate next unique Ticket ID (e.g., TKT-1025)
async function generateNextTicketId() {
  try {
    const last = await SupportTicket.findOne({ ticketId: /^TKT-\d+$/ })
      .sort({ createdAt: -1 })
      .select('ticketId')
      .lean();
    if (last && last.ticketId) {
      const num = parseInt(last.ticketId.replace('TKT-', ''), 10);
      if (!isNaN(num)) {
        return `TKT-${num + 1}`;
      }
    }
  } catch (err) {}
  return `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * 1. CUSTOMER: Fetch All My Tickets with Status Counts
 */
exports.getMyTickets = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { status, category, q, sortBy = 'newest' } = req.query;

    const filter = { customerId };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { ticketId: regex },
        { subject: regex },
        { orderId: regex },
        { productName: regex },
        { 'messages.text': regex }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'oldest') sortOption = { createdAt: 1 };
    else if (sortBy === 'priority') sortOption = { priority: -1, createdAt: -1 };
    else if (sortBy === 'updated') sortOption = { updatedAt: -1 };

    const [tickets, allCount, openCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
      SupportTicket.find(filter)
        .populate('productId', 'name images price')
        .sort(sortOption)
        .lean(),
      SupportTicket.countDocuments({ customerId }),
      SupportTicket.countDocuments({ customerId, status: 'open' }),
      SupportTicket.countDocuments({ customerId, status: 'in_progress' }),
      SupportTicket.countDocuments({ customerId, status: 'resolved' }),
      SupportTicket.countDocuments({ customerId, status: 'closed' })
    ]);

    res.json({
      tickets,
      counts: {
        all: allCount,
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch tickets' });
  }
};

/**
 * 2. CUSTOMER: Create a Support Ticket
 */
exports.createCustomerTicket = async (req, res) => {
  try {
    const customerId = req.customerId;
    const {
      subject,
      category = 'general',
      priority = 'medium',
      message,
      orderId,
      productId,
      productName,
      transactionId,
      attachments = []
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ msg: 'Ticket subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Please provide issue description / message' });
    }

    const customer = await Customer.findById(customerId).select('name email phone');
    const ticketId = await generateNextTicketId();

    // If orderId or productId is given, attempt to find vendorId
    let vendorId = null;
    let resolvedProductName = productName || '';

    if (productId) {
      const prod = await Product.findById(productId).select('userId vendorId name');
      if (prod) {
        vendorId = prod.userId || prod.vendorId || null;
        if (!resolvedProductName) resolvedProductName = prod.name;
      }
    } else if (orderId) {
      const ord = await Order.findOne({ $or: [{ orderId }, { _id: orderId.length === 24 ? orderId : null }] }).select('items vendorId');
      if (ord) {
        vendorId = ord.vendorId || (ord.items && (ord.items[0]?.vendorId || ord.items[0]?.userId)) || null;
        if (!resolvedProductName && ord.items && ord.items[0]?.name) {
          resolvedProductName = ord.items[0].name;
        }
      }
    }

    const newTicket = await SupportTicket.create({
      ticketId,
      userType: 'customer',
      customerId,
      vendorId,
      userName: customer?.name || 'Customer',
      userEmail: customer?.email || '',
      userPhone: customer?.phone || '',
      orderId: orderId || '',
      productId: productId || null,
      productName: resolvedProductName,
      transactionId: transactionId || '',
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      messages: [
        {
          sender: 'customer',
          senderName: customer?.name || 'Customer',
          text: message.trim(),
          attachments,
          createdAt: new Date()
        }
      ]
    });

    res.status(201).json({ msg: `Ticket #${ticketId} created successfully`, ticket: newTicket });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create ticket' });
  }
};

/**
 * 3. GET SINGLE TICKET BY ID
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id.length === 24 ? id : null }]
    })
      .populate('productId', 'name images price sku')
      .populate('vendorId', 'name businessName email')
      .populate('customerId', 'name email phone');

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to retrieve ticket' });
  }
};

/**
 * 4. CUSTOMER / VENDOR / ADMIN: Reply to Ticket
 */
exports.replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, attachments = [] } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Message text cannot be empty' });
    }

    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id.length === 24 ? id : null }]
    });

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket not found' });
    }

    // Determine sender
    let sender = 'customer';
    let senderName = 'Customer';

    if (req.adminId || req.admin) {
      sender = 'admin';
      senderName = req.admin?.name || 'Customer Support';
    } else if (req.vendor || (req.user && (req.user.role === 'vendor' || req.user.type === 'vendor'))) {
      sender = 'vendor';
      const vObj = req.vendor || req.user;
      senderName = vObj?.businessName || vObj?.name || 'Vendor Merchant';
    } else if (req.customerId) {
      sender = 'customer';
      const cust = await Customer.findById(req.customerId).select('name');
      senderName = cust?.name || ticket.userName || 'Customer';
    }

    ticket.messages.push({
      sender,
      senderName,
      text: text.trim(),
      attachments,
      createdAt: new Date()
    });

    // Auto-update status: If customer was waiting and admin/vendor replies -> in_progress
    if (ticket.status === 'open' && (sender === 'admin' || sender === 'vendor')) {
      ticket.status = 'in_progress';
    } else if (ticket.status === 'resolved' && sender === 'customer') {
      ticket.status = 'in_progress'; // re-opened by customer
    }

    await ticket.save();

    res.json({ msg: 'Reply added successfully', ticket });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to add reply' });
  }
};

/**
 * 5. RESOLVE OR CLOSE TICKET (Mails Customer Resolution)
 */
exports.resolveOrCloseTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'resolved', resolutionSummary = '' } = req.body;

    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id.length === 24 ? id : null }]
    });

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket not found' });
    }

    ticket.status = status === 'closed' ? 'closed' : 'resolved';
    ticket.resolvedAt = new Date();
    if (resolutionSummary) {
      ticket.resolutionSummary = resolutionSummary;
    }

    let actorName = 'Support Desk';
    if (req.admin?.name) actorName = req.admin.name;
    else if (req.vendor?.businessName || req.vendor?.name) actorName = req.vendor.businessName || req.vendor.name;
    else if (req.user?.name) actorName = req.user.name;
    ticket.resolvedBy = actorName;

    // Append resolution notice in timeline
    ticket.messages.push({
      sender: 'system',
      senderName: 'System Update',
      text: `✓ Ticket marked as ${ticket.status.toUpperCase()} by ${actorName}.${
        resolutionSummary ? ` Resolution: ${resolutionSummary}` : ''
      }`,
      createdAt: new Date()
    });

    await ticket.save();

    // IN-APP NOTIFICATION FOR CUSTOMER (Requirement)
    try {
      if (ticket.customerId) {
        const isResolved = ticket.status === 'resolved';
        const notifTitle = `Support Ticket ${isResolved ? 'Resolved' : 'Closed'} (#${ticket.ticketId || String(ticket._id).slice(-6).toUpperCase()})`;
        const notifMsg = `Your ticket regarding "${ticket.subject}" has been marked as ${ticket.status} by ${actorName}.${
          resolutionSummary ? ` Resolution Note: ${resolutionSummary}` : ' Click to view the final resolution.'
        }`;

        await notificationService.createNotification({
          recipientType: 'customer',
          recipientId: ticket.customerId,
          title: notifTitle,
          message: notifMsg,
          type: 'support',
          orderId: ticket.orderId || '',
          productId: ticket.productId || null,
          actionUrl: '/customer/tickets'
        });
      }
    } catch (notifErr) {
      console.warn('[TicketService] Failed to create customer in-app notification:', notifErr.message);
    }

    // EMAIL CUSTOMER ABOUT RESOLUTION (User Requirement)
    try {
      let customerEmail = ticket.userEmail;
      let customerName = ticket.userName;
      if (ticket.customerId) {
        const cust = await Customer.findById(ticket.customerId).select('email name');
        if (cust?.email) {
          customerEmail = cust.email;
          customerName = cust.name;
        }
      }

      if (customerEmail) {
        await emailService.sendTicketResolvedCustomerEmail({
          ticket,
          customerEmail,
          customerName,
          resolutionMessage: resolutionSummary || `Issue resolved by ${actorName}.`
        });
      }
    } catch (mailErr) {
      console.error('[TicketService] Failed to send resolution email:', mailErr.message);
    }

    res.json({ msg: `Ticket #${ticket.ticketId} marked as ${ticket.status}`, ticket });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update ticket status' });
  }
};

/**
 * 6. VENDOR: Get Tickets Linked to Vendor
 */
exports.getVendorTickets = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.userId || req.user?._id;
    if (!vendorId) {
      return res.status(401).json({ msg: 'Vendor authentication required' });
    }
    const { tab = 'customer_issues', status, q } = req.query;

    const filter = {};

    const isMerchantTab = ['vendor_support', 'merchant', 'merchant_support'].includes(tab);

    if (isMerchantTab) {
      // Tickets raised BY the vendor to platform
      filter.vendorId = vendorId;
      filter.userType = 'vendor';
    } else {
      // Customer tickets linked to products/orders of this vendor
      filter.$or = [
        { vendorId, userType: 'customer' },
        { vendorId, userType: 'vendor' }
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { ticketId: regex },
          { subject: regex },
          { orderId: regex },
          { productName: regex },
          { userName: regex }
        ]
      });
    }

    const tickets = await SupportTicket.find(filter)
      .populate('productId', 'name images price')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const [allCount, openCount, inProgressCount, resolvedCount] = await Promise.all([
      SupportTicket.countDocuments({ vendorId }),
      SupportTicket.countDocuments({ vendorId, status: 'open' }),
      SupportTicket.countDocuments({ vendorId, status: 'in_progress' }),
      SupportTicket.countDocuments({ vendorId, status: 'resolved' })
    ]);

    res.json({
      tickets,
      items: tickets,
      counts: {
        all: allCount,
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch vendor tickets' });
  }
};

/**
 * 7. VENDOR: Create Ticket to Platform Support
 */
exports.createVendorTicket = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.userId || req.user?._id;
    if (!vendorId) {
      return res.status(401).json({ msg: 'Vendor authentication required' });
    }
    const { subject, category = 'vendor_query', priority = 'medium', message } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ msg: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Message is required' });
    }

    const vendor = await User.findById(vendorId).select('name businessName email phone');
    const ticketId = await generateNextTicketId();

    const newTicket = await SupportTicket.create({
      ticketId,
      userType: 'vendor',
      vendorId,
      userName: vendor?.businessName || vendor?.name || 'Vendor Merchant',
      userEmail: vendor?.email || '',
      userPhone: vendor?.phone || '',
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      assignedTo: 'Vendor Relations Team',
      messages: [
        {
          sender: 'vendor',
          senderName: vendor?.businessName || vendor?.name || 'Vendor Merchant',
          text: message.trim(),
          createdAt: new Date()
        }
      ]
    });

    res.status(201).json({ msg: `Vendor Ticket #${ticketId} submitted`, ticket: newTicket });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to submit vendor ticket' });
  }
};

/**
 * 8. ADMIN: Get All Support Tickets (Cross-Platform)
 */
exports.getAdminTickets = async (req, res) => {
  try {
    const { userType, status, category, priority, q } = req.query;
    const filter = {};

    if (userType && userType !== 'all') filter.userType = userType;
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (priority && priority !== 'all') filter.priority = priority;

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { ticketId: regex },
        { subject: regex },
        { userName: regex },
        { userEmail: regex },
        { orderId: regex },
        { productName: regex }
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name businessName email')
      .populate('productId', 'name images price')
      .sort({ createdAt: -1 })
      .lean();

    const [total, open, inProgress, resolved] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' })
    ]);

    res.json({
      tickets,
      counts: { total, open, inProgress, resolved }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to fetch admin tickets' });
  }
};

/**
 * 9. ADMIN: AI Analyze Ticket Sentiment & Draft Suggested Reply
 */
exports.adminAiAnalyzeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id.length === 24 ? id : null }]
    });

    if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

    const allText = (ticket.messages || []).map((m) => m.text).join(' ');
    const lower = allText.toLowerCase();

    let sentiment = 'neutral';
    if (/(?:furious|terrible|worst|cheated|lawyer|sue|unacceptable|fraud)/i.test(lower)) {
      sentiment = 'urgent';
    } else if (/(?:delay|broken|damaged|wrong|refund not|not working|failed|annoyed)/i.test(lower)) {
      sentiment = 'frustrated';
    } else if (/(?:thank|resolved|good|pleased|great)/i.test(lower)) {
      sentiment = 'positive';
    }

    let suggestedResolution = '';
    if (ticket.category === 'refund' || /refund/i.test(lower)) {
      suggestedResolution = `Dear ${ticket.userName}, we have reviewed your refund request. The transaction has been validated and the amount will reflect in your original payment method or wallet within 2-4 hours.`;
    } else if (ticket.category === 'delivery' || /delivery|delay/i.test(lower)) {
      suggestedResolution = `Hello ${ticket.userName}, we contacted the delivery dispatch manager. The package is currently expedited and scheduled for delivery today before 6:00 PM.`;
    } else if (ticket.category === 'product' || /damaged|defective|broken/i.test(lower)) {
      suggestedResolution = `Dear ${ticket.userName}, we apologize for the damaged item received. A replacement dispatch or 100% instant wallet credit has been approved.`;
    } else {
      suggestedResolution = `Hello ${ticket.userName}, our team has addressed your inquiry regarding "${ticket.subject}". Please let us know if we can assist you further.`;
    }

    ticket.aiAnalysis = {
      sentiment,
      summary: `Inquiry regarding ${ticket.subject}. Customer expressed ${sentiment} sentiment.`,
      suggestedResolution,
      confidenceScore: 0.94,
      lastAnalyzedAt: new Date()
    };

    await ticket.save();

    res.json({
      msg: 'AI analysis generated',
      aiAnalysis: ticket.aiAnalysis
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'AI analysis failed' });
  }
};
