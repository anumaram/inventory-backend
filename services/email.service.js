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

module.exports = {
  sendOrderPlacedCustomerEmail,
  sendOrderPlacedVendorEmail,
  sendOrderStatusUpdateEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
};

