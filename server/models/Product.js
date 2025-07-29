const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  specifications: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  availability: {
    type: DataTypes.JSONB,
    defaultValue: {
      inStock: true,
      quantity: 0
    }
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  shopifyProductId: {
    type: DataTypes.STRING
  },
  aiContext: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt automatically
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['category']
    },
    {
      fields: ['description']
    }
  ]
});

module.exports = Product;
