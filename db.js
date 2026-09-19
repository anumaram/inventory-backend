const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory-app';

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 8000
  })
  .then(() => {
    const isAtlas = MONGO_URI.includes('mongodb.net');
    console.log(`MongoDB Connected successfully to ${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}`);
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));

