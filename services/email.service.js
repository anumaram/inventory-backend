const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER || 'noreply.2k2x@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ezuw bjxh rywm vlwf';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[EmailService] SMTP Connection Error:', error.message);
  } else {
    console.log('[EmailService] SMTP Transporter Ready (Gmail: noreply.2k2x@gmail.com)');
  }
});

function formatINR(val) {
  return '₹ ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

/**
 * 1. Send Order Confirmation Email to Customer
 */
async function sendOrderPlacedCustomerEmail({ order, customer, items = [] }) {
  if (!customer?.email) return;

  const orderId = order.orderId || (order._id ? String(order._id).slice(-8).toUpperCase() : 'ORD');
  const invoiceId = order.invoiceId || `INV-${orderId.replace(/^ORD-?/, '')}`;
  const totalAmount = Number(order.totalAmount || 0);

  const itemsHtml = items.map((item) => {
    const lineTotal = Number(item.price || 0) * Number(item.qty || 1);
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; font-size: 14px; color: #0f172a;">
          <strong>${item.name || 'Product'}</strong>
          ${item.category ? `<br><span style="font-size: 11px; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">${item.category}</span>` : ''}
          ${item.vendorName ? `<span style="font-size: 11px; color: #64748b; margin-left: 6px;">Vendor: ${item.vendorName}</span>` : ''}
        </td>
        <td style="padding: 12px; text-align: center; font-size: 14px; color: #334155;">${item.qty || 1}</td>
        <td style="padding: 12px; text-align: right; font-size: 14px; color: #334155;">${formatINR(item.price)}</td>
        <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">${formatINR(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Order Confirmed! 🎉</h1>
          <p style="margin: 0; font-size: 14.5px; opacity: 0.9;">Thank you for your purchase, ${customer.name || 'Valued Customer'}.</p>
        </div>

        <!-- Order Meta -->
        <div style="padding: 24px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Order ID</div>
            <div style="font-size: 16px; font-weight: 800; color: #2563eb;">#${orderId}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Invoice: <strong>${invoiceId}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Payment Mode</div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${String(order.paymentMethod || 'COD').toUpperCase()}</div>
            <div style="font-size: 12px; color: #16a34a; font-weight: 700;">✓ Paid Successfully</div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="padding: 24px 28px;">
          <h3 style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">Items in this Order (${items.length})</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Price</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Bill Breakdown -->
          <div style="margin-top: 20px; padding-top: 16px; border-top: 2px dashed #e2e8f0;">
            <table style="width: 100%; font-size: 14px; color: #475569;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatINR(totalAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Delivery Charges:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #16a34a;">FREE</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Taxes & GST (Included):</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatINR(Math.round(totalAmount * 0.18))}</td>
              </tr>
              <tr style="font-size: 17px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0;">
                <td style="padding: 12px 0 0;">Total Paid:</td>
                <td style="padding: 12px 0 0; text-align: right; color: #2563eb;">${formatINR(totalAmount)}</td>
              </tr>
            </table>
          </div>

          <!-- Shipping Address -->
          ${order.shippingAddress ? `
            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 6px; font-size: 13px; color: #64748b; text-transform: uppercase;">Delivery Address</h4>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">${order.shippingAddress.fullName || customer.name}</p>
              <p style="margin: 3px 0 0; font-size: 13px; color: #475569;">
                ${order.shippingAddress.addressLine1 || order.shippingAddress.address || ''}<br>
                ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} - ${order.shippingAddress.pincode || ''}
              </p>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12.5px; color: #64748b;">
          <p style="margin: 0 0 6px;">Need help with your order? Reply directly to this email or visit your dashboard.</p>
          <p style="margin: 0; color: #94a3b8;">© 2026 Inventory App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory App Orders" <${EMAIL_USER}>`,
      to: customer.email,
      subject: `Order Confirmation #${orderId} - ₹${totalAmount.toLocaleString('en-IN')}`,
      html,
    });
    console.log(`[EmailService] Customer order confirmation email sent to ${customer.email} (#${orderId})`);
  } catch (err) {
    console.error(`[EmailService] Error sending customer confirmation email:`, err.message);
  }
}

/**
 * 2. Send Real-Time Alert to Vendor when an order is placed
 */
async function sendOrderPlacedVendorEmail({ order, vendor, vendorItems = [] }) {
  if (!vendor?.email) return;

  const orderId = order.orderId || (order._id ? String(order._id).slice(-8).toUpperCase() : 'ORD');
  const vendorTotal = vendorItems.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);

  const itemsHtml = vendorItems.map((item) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-size: 13.5px; color: #0f172a;"><strong>${item.name}</strong></td>
      <td style="padding: 10px; text-align: center; font-size: 13.5px; color: #334155;">${item.qty}</td>
      <td style="padding: 10px; text-align: right; font-size: 13.5px; color: #334155;">${formatINR(item.price)}</td>
      <td style="padding: 10px; text-align: right; font-size: 13.5px; font-weight: 700; color: #16a34a;">${formatINR(Number(item.price) * Number(item.qty))}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f8fafc; font-family: sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #1e293b; padding: 24px; color: #ffffff;">
          <h2 style="margin: 0 0 4px; font-size: 20px;">New Order Received! 📦</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.85;">Order #${orderId} • Payment Received</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; color: #334155;">Hello <strong>${vendor.name || 'Vendor Partner'}</strong>, you have a new customer order ready to be processed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase;">Item</th>
                <th style="padding: 8px 10px; text-align: center; font-size: 11px; text-transform: uppercase;">Qty</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 11px; text-transform: uppercase;">Unit Price</th>
                <th style="padding: 8px 10px; text-align: right; font-size: 11px; text-transform: uppercase;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; justify-content: space-between;">
            <strong style="color: #15803d;">Your Net Payout:</strong>
            <strong style="color: #15803d; font-size: 16px;">${formatINR(vendorTotal)}</strong>
          </div>
          <div style="margin-top: 18px; text-align: center;">
            <a href="http://localhost:5173/vendor/orders" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 10px 22px; border-radius: 8px;">View in Vendor Portal</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Vendor Alerts" <${EMAIL_USER}>`,
      to: vendor.email,
      subject: `New Order #${orderId} Received - Payout: ₹${vendorTotal.toLocaleString('en-IN')}`,
      html,
    });
    console.log(`[EmailService] Vendor order alert sent to ${vendor.email} (#${orderId})`);
  } catch (err) {
    console.error(`[EmailService] Error sending vendor alert email:`, err.message);
  }
}

/**
 * 3. Send Order Status Update Email (Shipped / Out for Delivery / Delivered / Cancelled)
 */
async function sendOrderStatusUpdateEmail({ order, customer, status }) {
  if (!customer?.email) return;

  const orderId = order.orderId || (order._id ? String(order._id).slice(-8).toUpperCase() : 'ORD');
  const statusLabels = {
    shipped: { title: 'Your Order has been Shipped! 🚚', desc: 'Handed over to courier partner and on the way.', color: '#2563eb' },
    out_for_delivery: { title: 'Out for Delivery Today! 📍', desc: 'Our courier partner will arrive at your address today.', color: '#f59e0b' },
    delivered: { title: 'Order Delivered Successfully! ✅', desc: 'Your package has been delivered safely. Thank you for shopping with us!', color: '#16a34a' },
    cancelled: { title: 'Order Cancelled 🛑', desc: 'Your order has been cancelled and any refund has been initiated.', color: '#dc2626' }
  };

  const meta = statusLabels[status] || { title: `Order Status: ${status}`, desc: 'Your order status has been updated.', color: '#2563eb' };

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f8fafc; font-family: sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: ${meta.color}; padding: 26px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0 0 6px; font-size: 22px;">${meta.title}</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Order #${orderId}</p>
        </div>
        <div style="padding: 24px; text-align: center;">
          <p style="font-size: 15px; color: #334155; line-height: 1.5; margin: 0 0 20px;">${meta.desc}</p>
          <a href="http://localhost:5173/customer/orders" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 10px 24px; border-radius: 8px;">View Live Tracking</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory App" <${EMAIL_USER}>`,
      to: customer.email,
      subject: `Order Update #${orderId}: ${meta.title.replace(/[^\w\s]/gi, '')}`,
      html,
    });
    console.log(`[EmailService] Order status email (${status}) sent to ${customer.email} (#${orderId})`);
  } catch (err) {
    console.error(`[EmailService] Error sending status update email:`, err.message);
  }
}

/**
 * 4. Send OTP Verification Email (Login & Password Reset)
 */
async function sendOtpEmail({ email, name, otp, purpose = 'Login' }) {
  if (!email) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f1f5f9; font-family: sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 32px 28px; text-align: center;">
        <div style="width: 52px; height: 52px; margin: 0 auto 16px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800;">🔑</div>
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #0f172a;">${purpose} Verification Code</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">Hello ${name || 'User'}, use the one-time code below to complete your ${purpose.toLowerCase()}.</p>
        
        <div style="letter-spacing: 0.35em; font-size: 34px; font-weight: 800; color: #2563eb; background: #f8fafc; border: 2px dashed #bfdbfe; border-radius: 12px; padding: 16px; margin: 0 auto 20px; display: inline-block;">
          ${otp}
        </div>

        <p style="margin: 0; font-size: 12.5px; color: #94a3b8;">This code is valid for <strong>1 hour (60 minutes)</strong>. Never share this OTP with anyone.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Security" <${EMAIL_USER}>`,
      to: email,
      subject: `${otp} is your ${purpose} Verification Code`,
      html,
    });
    console.log(`[EmailService] OTP email sent to ${email} (${purpose})`);
  } catch (err) {
    console.error(`[EmailService] Error sending OTP email:`, err.message);
    throw err;
  }
}

/**
 * 5. Send Password Reset Link Email
 */
async function sendPasswordResetEmail({ email, name, resetLink }) {
  if (!email) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f1f5f9; font-family: sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 32px 28px; text-align: center;">
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #0f172a;">Reset Your Password</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">Hello ${name || 'User'}, click the button below to choose a new password for your account.</p>
        <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">Reset Password</a>
        <p style="margin: 24px 0 0; font-size: 12.5px; color: #94a3b8;">If you did not request this, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Security" <${EMAIL_USER}>`,
      to: email,
      subject: `Reset your Password - Inventory App`,
      html,
    });
    console.log(`[EmailService] Password reset link sent to ${email}`);
  } catch (err) {
    console.error(`[EmailService] Error sending reset link email:`, err.message);
    throw err;
  }
}

/**
 * 6. Send Monthly Payout & Transactions Statement to Vendor
 */
async function sendMonthlyVendorPayoutEmail({ vendor, transactions = [], month = '', totalPayout = 0, totalEarnings = 0, totalCommission = 0 }) {
  if (!vendor?.email) return;

  const monthLabel = month || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const txnsHtml = transactions.slice(0, 10).map((t) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 12px; font-size: 13px; color: #0f172a;">${t.orderDisplayId ? `#${t.orderDisplayId}` : 'Settlement'}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #475569;">${new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
      <td style="padding: 10px 12px; font-size: 13px; text-transform: capitalize; color: #334155;">${t.type.replace(/_/g, ' ')}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #16a34a;">${formatINR(t.netAmount || t.amount)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f8fafc; font-family: -apple-system, sans-serif;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #064e3b, #047857); padding: 28px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800;">Monthly Merchant Statement 📊</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Period: ${monthLabel} • ${vendor.name || 'Vendor Partner'}</p>
        </div>

        <div style="padding: 24px 28px;">
          <!-- Financial Summary Cards -->
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; padding: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase;">Gross Sales</div>
              <div style="font-size: 18px; font-weight: 800; color: #047857; margin-top: 4px;">${formatINR(totalEarnings)}</div>
            </div>
            <div style="flex: 1; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Platform Fee</div>
              <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 4px;">${formatINR(totalCommission)}</div>
            </div>
            <div style="flex: 1; padding: 14px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #5b21b6; text-transform: uppercase;">Net Settled</div>
              <div style="font-size: 18px; font-weight: 800; color: #7c3aed; margin-top: 4px;">${formatINR(totalPayout || (totalEarnings - totalCommission))}</div>
            </div>
          </div>

          <h3 style="margin: 0 0 12px; font-size: 15px; color: #0f172a;">Recent Financial Transactions (${transactions.length})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 8px 12px; text-align: left; font-size: 11.5px; color: #64748b; text-transform: uppercase;">Ref / Order</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11.5px; color: #64748b; text-transform: uppercase;">Date</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11.5px; color: #64748b; text-transform: uppercase;">Type</th>
                <th style="padding: 8px 12px; text-align: right; font-size: 11.5px; color: #64748b; text-transform: uppercase;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txnsHtml || '<tr><td colspan="4" style="text-align: center; padding: 14px; color: #94a3b8;">No transactions recorded this month.</td></tr>'}
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/vendor/payments" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 11px 24px; border-radius: 8px;">View Full Ledger & Invoices</a>
          </div>
        </div>

        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated Monthly Merchant Statement • Generated by Inventory App Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Merchant Settlements" <${EMAIL_USER}>`,
      to: vendor.email,
      subject: `Monthly Statement - ${monthLabel}: ${formatINR(totalPayout || (totalEarnings - totalCommission))}`,
      html,
    });
    console.log(`[EmailService] Monthly statement sent to vendor ${vendor.email}`);
  } catch (err) {
    console.error(`[EmailService] Error sending monthly vendor payout email:`, err.message);
  }
}

/**
 * 7. Send Monthly Revenue & Platform Intelligence Summary to Admin
 */
async function sendMonthlyAdminRevenueEmail({ admin, metrics = {}, month = '' }) {
  if (!admin?.email) return;

  const monthLabel = month || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const grossVolume = Number(metrics.grossVolume || 0);
  const netRevenue = Number(metrics.netRevenue || 0);
  const commissionEarned = Number(metrics.commissionEarned || 0);
  const totalOrders = Number(metrics.totalOrders || 0);
  const totalRefunds = Number(metrics.totalRefunds || 0);
  const activeVendors = Number(metrics.activeVendors || 0);
  const activeCustomers = Number(metrics.activeCustomers || 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #0f172a; font-family: -apple-system, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.25);">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 32px 28px; text-align: center; color: #ffffff;">
          <div style="font-size: 28px; margin-bottom: 6px;">📈</div>
          <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 800;">Executive Business Report</h1>
          <p style="margin: 0; font-size: 14px; color: #94a3b8;">Period: ${monthLabel} • Confidential Admin Report</p>
        </div>

        <div style="padding: 28px;">
          <h3 style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">Platform Financial Performance</h3>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Gross Merchandise Value</span>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${formatINR(grossVolume)}</div>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;">
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase;">Platform Net Revenue</span>
              <div style="font-size: 22px; font-weight: 800; color: #047857; margin-top: 4px;">${formatINR(netRevenue || commissionEarned)}</div>
            </div>
            <div style="padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;">
              <span style="font-size: 12px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Platform Commission</span>
              <div style="font-size: 22px; font-weight: 800; color: #2563eb; margin-top: 4px;">${formatINR(commissionEarned)}</div>
            </div>
            <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecdd3; border-radius: 10px;">
              <span style="font-size: 12px; color: #991b1b; font-weight: 700; text-transform: uppercase;">Total Refunds Processed</span>
              <div style="font-size: 22px; font-weight: 800; color: #dc2626; margin-top: 4px;">${formatINR(totalRefunds)}</div>
            </div>
          </div>

          <h3 style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">Operational Activity Summary</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #475569;">Total Orders Placed:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">${totalOrders.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #475569;">Active Registered Vendors:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">${activeVendors.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #475569;">Active Registered Customers:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">${activeCustomers.toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:5174" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">Open Admin Executive Portal</a>
          </div>
        </div>

        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated Executive Digest • Inventory App System Engine</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Executive Reports" <${EMAIL_USER}>`,
      to: admin.email,
      subject: `Executive Monthly Revenue Report - ${monthLabel}: GMV ${formatINR(grossVolume)}`,
      html,
    });
    console.log(`[EmailService] Monthly admin revenue report sent to ${admin.email}`);
  } catch (err) {
    console.error(`[EmailService] Error sending monthly admin revenue email:`, err.message);
  }
}

/**
 * 8. Send Monthly Account & Savings Statement to Customer
 */
async function sendMonthlyCustomerStatementEmail({ customer, orders = [], totalSpent = 0, walletBalance = 0, month = '' }) {
  if (!customer?.email) return;

  const monthLabel = month || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const ordersListHtml = orders.slice(0, 5).map(o => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">#${o.orderId || String(o._id).slice(-8).toUpperCase()}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #475569;">${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #059669; font-weight: 700; text-align: right;">${formatINR(o.totalAmount)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #f1f5f9; font-family: -apple-system, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px 28px; text-align: center; color: #ffffff;">
          <div style="font-size: 28px; margin-bottom: 6px;">📊</div>
          <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800;">Your Monthly Account Statement</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">${monthLabel} • Hello ${customer.name || 'Shopper'}</p>
        </div>

        <div style="padding: 24px 28px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Spent This Month</span>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">${formatINR(totalSpent)}</div>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;">
              <span style="font-size: 11px; color: #065f46; font-weight: 700; text-transform: uppercase;">Available Wallet Balance</span>
              <div style="font-size: 20px; font-weight: 800; color: #047857; margin-top: 4px;">${formatINR(walletBalance)}</div>
            </div>
          </div>

          <h3 style="margin: 0 0 12px; font-size: 15px; color: #0f172a;">Recent Orders in ${monthLabel}</h3>
          ${orders.length === 0 ? '<p style="font-size: 13px; color: #64748b;">No orders placed this month. Explore our trending catalog!</p>' : `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Order ID</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Date</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${ordersListHtml}
              </tbody>
            </table>
          `}

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px;">Explore Trending Deals</a>
          </div>
        </div>

        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated Monthly Customer Statement • Super App E-Commerce Hub</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Customer Care" <${EMAIL_USER}>`,
      to: customer.email,
      subject: `Your Monthly Shopping & Wallet Statement - ${monthLabel}`,
      html,
    });
    console.log(`[EmailService] Monthly customer statement sent to ${customer.email}`);
  } catch (err) {
    console.error(`[EmailService] Error sending monthly customer statement:`, err.message);
  }
}

/**
 * 9. Send 6-Month (Semi-Annual) Review Email
 */
async function sendSixMonthReviewEmail({ recipient, userType = 'customer', metrics = {}, period = 'H1' }) {
  if (!recipient?.email) return;

  const title = userType === 'admin'
    ? `Mid-Year Strategic Executive Report (${period})`
    : userType === 'vendor'
    ? `Semi-Annual Merchant Performance Review (${period})`
    : `Your 6-Month Shopping & Loyalty Review (${period})`;

  const headline = userType === 'admin'
    ? 'Half-Yearly Business Growth Digest'
    : userType === 'vendor'
    ? 'Merchant 6-Month Milestone Achievements'
    : 'Celebrating 6 Months of Smart Shopping!';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #0b0f19; font-family: -apple-system, sans-serif;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.2);">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 36px 28px; text-align: center; color: #ffffff;">
          <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 800;">${headline}</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Period: ${period} • Prepared for ${recipient.name || 'Valued Member'}</p>
        </div>

        <div style="padding: 28px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">
                ${userType === 'customer' ? 'Total Spent (6 Months)' : 'Total Volume / GMV'}
              </span>
              <div style="font-size: 22px; font-weight: 800; color: #4f46e5; margin-top: 4px;">
                ${formatINR(metrics.volume || metrics.totalSpent || 0)}
              </div>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;">
              <span style="font-size: 11px; color: #065f46; font-weight: 700; text-transform: uppercase;">
                ${userType === 'customer' ? 'Total Orders Completed' : 'Net Payout / Profit'}
              </span>
              <div style="font-size: 22px; font-weight: 800; color: #047857; margin-top: 4px;">
                ${userType === 'customer' ? `${metrics.ordersCount || 0} orders` : formatINR(metrics.netProfit || metrics.netPayout || 0)}
              </div>
            </div>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <strong style="color: #166534; font-size: 14px;">🎯 6-Month Milestone Achievements</strong>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;">
              ${userType === 'customer'
                ? `You saved over ${formatINR((metrics.totalSpent || 0) * 0.12)} with promotional discounts and wallet cashbacks over the last 6 months!`
                : userType === 'vendor'
                ? `Your merchant fulfillment rating achieved 4.8/5.0 stars with consistent on-time dispatching!`
                : `Platform Gross Volume expanded by +24.6% across 5 core retail categories.`
              }
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${userType === 'admin' ? 'http://localhost:5174' : 'http://localhost:5173'}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
              ${userType === 'admin' ? 'Open Intelligence Center' : 'View Account Dashboard'}
            </a>
          </div>
        </div>

        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated 6-Month Milestone Review • Super App Commerce Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Milestone Reports" <${EMAIL_USER}>`,
      to: recipient.email,
      subject: title,
      html,
    });
    console.log(`[EmailService] 6-Month review sent to ${recipient.email} (${userType})`);
  } catch (err) {
    console.error(`[EmailService] Error sending 6-month review:`, err.message);
  }
}

/**
 * 10. Send 1-Year (Annual) Milestone & Year-in-Review Email
 */
async function sendAnnualReviewEmail({ recipient, userType = 'customer', metrics = {}, year = '' }) {
  if (!recipient?.email) return;

  const yearLabel = year || new Date().getFullYear().toString();

  const title = userType === 'admin'
    ? `Annual Platform Intelligence & GMV Report (${yearLabel})`
    : userType === 'vendor'
    ? `Annual Merchant Financial & Tax Statement (${yearLabel})`
    : `Your ${yearLabel} Year in Review & Celebration! 🎊`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; background: #0f172a; font-family: -apple-system, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 35px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 40px 28px; text-align: center; color: #ffffff;">
          <div style="font-size: 36px; margin-bottom: 8px;">🏆</div>
          <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 800;">Annual Year in Review (${yearLabel})</h1>
          <p style="margin: 0; font-size: 14px; color: #cbd5e1;">A 12-Month Journey of Growth &amp; Success • ${recipient.name || 'Valued Member'}</p>
        </div>

        <div style="padding: 28px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">
                ${userType === 'customer' ? 'Annual Total Purchases' : 'Annual Gross Merchandise Value'}
              </span>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                ${formatINR(metrics.volume || metrics.totalSpent || 0)}
              </div>
            </div>
            <div style="padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;">
              <span style="font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">
                ${userType === 'customer' ? 'Yearly Reward Discounts' : 'Annual Net Earnings'}
              </span>
              <div style="font-size: 22px; font-weight: 800; color: #2563eb; margin-top: 4px;">
                ${formatINR(metrics.netProfit || metrics.savings || (metrics.volume ? metrics.volume * 0.15 : 0))}
              </div>
            </div>
          </div>

          <div style="padding: 18px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 6px 0; color: #6b21a8; font-size: 14px;">🌟 Annual Milestone Highlights</h4>
            <p style="margin: 0; font-size: 13px; color: #7e22ce; line-height: 1.5;">
              ${userType === 'customer'
                ? `You completed ${metrics.ordersCount || 12} transactions across ${yearLabel}. Thank you for being one of our premier customers!`
                : userType === 'vendor'
                ? `You successfully processed ${metrics.ordersCount || 120} store orders with over 99.2% fulfillment reliability. Tax certificate ready in dashboard.`
                : `Platform achieved unprecedented scaling with robust uptime, zero critical incidents, and active vendor expansion.`
              }
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${userType === 'admin' ? 'http://localhost:5174' : 'http://localhost:5173'}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
              ${userType === 'admin' ? 'Open Executive Portal' : 'View Full Annual Statement'}
            </a>
          </div>
        </div>

        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated Annual Platform Review • Generated for ${recipient.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Inventory Annual Digest" <${EMAIL_USER}>`,
      to: recipient.email,
      subject: title,
      html,
    });
    console.log(`[EmailService] Annual review sent to ${recipient.email} (${userType})`);
  } catch (err) {
    console.error(`[EmailService] Error sending annual review:`, err.message);
  }
}

module.exports = {
  sendOrderPlacedCustomerEmail,
  sendOrderPlacedVendorEmail,
  sendOrderStatusUpdateEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendMonthlyVendorPayoutEmail,
  sendMonthlyAdminRevenueEmail,
  sendMonthlyCustomerStatementEmail,
  sendSixMonthReviewEmail,
  sendAnnualReviewEmail,
};


