const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Product = require('../models/Product');

const router = express.Router();

// Get conversation history
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ id: conversationId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      id: conversation.id,
      status: conversation.status,
      messages: conversation.messages,
      customerInfo: conversation.customerInfo,
      surveyCompleted: conversation.surveyCompleted,
      createdAt: conversation.createdAt
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer's conversations
router.get('/customer/:customerId/conversations', async (req, res) => {
  try {
    const { customerId } = req.params;
    const conversations = await Conversation.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(conversations.map(conv => ({
      id: conv.id,
      status: conv.status,
      lastMessage: conv.messages[conv.messages.length - 1],
      createdAt: conv.createdAt,
      isLive: conv.isLive
    })));
  } catch (error) {
    console.error('Error fetching customer conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation
router.post('/conversation', async (req, res) => {
  try {
    const { customerId, customerInfo } = req.body;
    
    // Check if there's already an active conversation
    const existingConversation = await Conversation.findOne({
      customerId,
      isLive: true
    });

    if (existingConversation) {
      return res.json({
        id: existingConversation.id,
        status: existingConversation.status,
        messages: existingConversation.messages,
        surveyCompleted: existingConversation.surveyCompleted
      });
    }

    const conversation = new Conversation({
      id: uuidv4(),
      customerId,
      customerInfo: customerInfo || {},
      status: 'survey'
    });

    await conversation.save();

    res.status(201).json({
      id: conversation.id,
      status: conversation.status,
      messages: conversation.messages,
      surveyCompleted: conversation.surveyCompleted
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close conversation
router.post('/conversation/:conversationId/close', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ id: conversationId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'closed';
    conversation.isLive = false;
    conversation.closedAt = new Date();
    await conversation.save();

    // Notify via socket
    const io = req.app.get('io');
    io.to(conversationId).emit('conversation_closed');
    io.to('agents').emit('conversation_update', {
      conversationId,
      status: 'closed',
      isLive: false
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error closing conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products for AI context
router.get('/products', async (req, res) => {
  try {
    const { search, category, limit = 10 } = req.query;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .limit(parseInt(limit))
      .select('id name description price category tags availability');

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
