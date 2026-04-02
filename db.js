const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

mongoose
  .connect('mongodb://127.0.0.1:27017/inventory-app', {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));
