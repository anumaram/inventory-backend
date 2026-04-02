const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');

const app = express();
app.disable('etag');

app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:4300',
      'http://127.0.0.1:4300'
    ],
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
app.use('/admin/api', require('./routes/admin.routes'));

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
});
