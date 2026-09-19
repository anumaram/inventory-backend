const path = require('path');
const fs = require('fs');

// Auto-load .env if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch (e) {}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('./db');
const { startOrderStatusScheduler } = require('./services/order-status.service');
const { startReturnStatusScheduler } = require('./services/return-status.service');
const { startEmailCronScheduler } = require('./services/email-cron.service');
const { startSubscriptionScheduler } = require('./services/subscription-scheduler.service');
const { seedWarehousesIfEmpty } = require('./services/location.service');

// Start schedulers once MongoDB connection is open
if (mongoose.connection.readyState === 1) {
  startOrderStatusScheduler();
  startReturnStatusScheduler();
  startEmailCronScheduler();
  startSubscriptionScheduler();
  seedWarehousesIfEmpty();
} else {
  mongoose.connection.once('open', () => {
    startOrderStatusScheduler();
    startReturnStatusScheduler();
    startEmailCronScheduler();
    startSubscriptionScheduler();
    seedWarehousesIfEmpty();
  });
}

const app = express();
app.disable('etag');

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      try {
        const hostname = new URL(origin).hostname;
        const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(hostname);
        const isVercel = /\.vercel\.app$/.test(hostname);
        const isNetlify = /\.netlify\.app$/.test(hostname);
        const isRender = /\.onrender\.com$/.test(hostname);

        const customAllowed = (process.env.ALLOWED_ORIGINS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (isLocalhost || isVercel || isNetlify || isRender || customAllowed.includes(origin)) {
          return callback(null, true);
        }
      } catch (e) {
        // In case of non-URL origin strings
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      return callback(new Error('Not allowed by CORS: ' + origin));
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/auth', require('./routes/auth.routes'));
app.use('/customers', require('./routes/customer.routes'));
app.use('/products', require('./routes/product.routes'));
app.use('/orders', require('./routes/order.routes'));
app.use('/wishlist', require('./routes/wishlist.routes'));
app.use('/cart', require('./routes/cart.routes'));
app.use('/addresses', require('./routes/address.routes'));
app.use('/location', require('./routes/location.routes'));
app.use('/notifications', require('./routes/notification.routes'));
app.use('/returns', require('./routes/return.routes'));
app.use('/admin/api', require('./routes/admin.routes'));
app.use('/transactions', require('./routes/transaction.routes'));
app.use('/vendor/transactions', require('./routes/vendor-transaction.routes'));
app.use('/tickets', require('./routes/ticket.routes'));
app.use('/darwin', require('./routes/darwin.routes'));
app.use('/vendor-ai', require('./routes/vendor-ai.routes'));
app.use('/admin-ai', require('./routes/admin-ai.routes'));
app.use('/admin/api/admin-ai', require('./routes/admin-ai.routes'));
app.use('/admin/api/tickets', require('./routes/ticket.routes'));
app.use('/ai-write', require('./routes/ai-write.routes'));
app.use('/admin/api/ai-write', require('./routes/ai-write.routes'));
app.use('/subscriptions', require('./routes/subscription.routes'));
app.use('/avatar', require('./routes/avatar.routes'));
app.use('/price-history', require('./routes/price-history.routes'));
app.use('/shared-cart', require('./routes/shared-cart.routes'));
app.use('/warranties', require('./routes/warranty.routes'));
app.use('/admin/api/warranties', require('./routes/warranty.routes'));
app.use('/visual-search', require('./routes/visual-search.routes'));
app.use('/', require('./routes/product-qa.routes'));
app.use('/api', require('./routes/product-qa.routes'));
app.use('/recommendations', require('./routes/recommendation.routes'));
app.use('/rewards', require('./routes/rewards.routes'));

// Static assets (banners, icons, public assets)
const publicAssetsPath = path.join(__dirname, '..', 'inventory-react-app', 'public');
app.use(express.static(publicAssetsPath));

const adminFrontendPath = path.join(__dirname, '..', 'admin-frontend');
app.use('/admin', express.static(adminFrontendPath));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminFrontendPath, 'index.html'));
});
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(adminFrontendPath, 'index.html'));
});

app.get('/', (req, res) => {
  res.send('API Running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Do the startup synchronization only after MongoDB is ready. With
  // bufferCommands disabled, running it earlier would fail and defer the next
  // real attempt until the hourly interval.
  if (mongoose.connection.readyState === 1) {
    startOrderStatusScheduler();
  } else {
    mongoose.connection.once('connected', startOrderStatusScheduler);
  }
});
