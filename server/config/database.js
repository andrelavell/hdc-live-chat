const mongoose = require('mongoose');

const initializeDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hdc-live-chat';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️  Server will continue without database functionality');
    // Don't exit - let the server run without database
  }
};

module.exports = { initializeDatabase };
