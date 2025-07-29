const { Sequelize } = require('sequelize');

// Initialize sequelize immediately so models can use it
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/hdc_live_chat';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    console.log('⚠️  Server will continue without database functionality');
    // Don't exit - let the server run without database
  }
};

module.exports = { initializeDatabase, sequelize };
