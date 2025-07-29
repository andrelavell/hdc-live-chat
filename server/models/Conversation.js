const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: { type: String, enum: ['customer', 'ai', 'agent'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  agentId: { type: String }, // Only for agent messages
  metadata: {
    typing_duration: Number, // For AI response timing
    openai_model: String,
    tokens_used: Number
  }
});

const conversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  customerInfo: {
    name: String,
    email: String,
    ipAddress: String,
    userAgent: String,
    shopifyCustomerId: String
  },
  status: { 
    type: String, 
    enum: ['survey', 'ai_active', 'agent_takeover', 'closed'], 
    default: 'survey' 
  },
  messages: [messageSchema],
  surveyCompleted: { type: Boolean, default: false },
  agentTakeoverAt: Date,
  agentId: String,
  isLive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: Date,
  tags: [String],
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
});

// Update the updatedAt field on save
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for performance
conversationSchema.index({ customerId: 1, createdAt: -1 });
conversationSchema.index({ status: 1, isLive: 1 });
conversationSchema.index({ agentId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
