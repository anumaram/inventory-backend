const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

require('./db');
const { startOrderStatusScheduler } = require('./services/order-status.service');
const { startReturnStatusScheduler } = require('./services/return-status.service');
const { startEmailCronScheduler } = require('./services/email-cron.service');

// Start schedulers once MongoDB connection is open
if (mongoose.connection.readyState === 1) {
  startOrderStatusScheduler();
  startReturnStatusScheduler();
  startEmailCronScheduler();
} else {
  mongoose.connection.once('open', () => {
    startOrderStatusScheduler();
    startReturnStatusScheduler();
    startEmailCronScheduler();
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

      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
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
app.use('/notifications', require('./routes/notification.routes'));
app.use('/returns', require('./routes/return.routes'));
app.use('/admin/api', require('./routes/admin.routes'));
app.use('/transactions', require('./routes/transaction.routes'));
app.use('/vendor/transactions', require('./routes/vendor-transaction.routes'));

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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  // Do the startup synchronization only after MongoDB is ready. With
  // bufferCommands disabled, running it earlier would fail and defer the next
  // real attempt until the hourly interval.
  if (mongoose.connection.readyState === 1) {
    startOrderStatusScheduler();
  } else {
    mongoose.connection.once('connected', startOrderStatusScheduler);
  }
});
