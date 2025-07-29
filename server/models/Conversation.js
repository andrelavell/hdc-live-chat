const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerInfo: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('survey', 'ai_active', 'agent_takeover', 'closed'),
    defaultValue: 'survey'
  },
  messages: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  surveyCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  agentTakeoverAt: {
    type: DataTypes.DATE
  },
  agentId: {
    type: DataTypes.STRING
  },
  isLive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  closedAt: {
    type: DataTypes.DATE
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt automatically
  indexes: [
    {
      fields: ['customerId', 'createdAt']
    },
    {
      fields: ['status', 'isLive']
    },
    {
      fields: ['agentId']
    }
  ]
});

module.exports = Conversation;
