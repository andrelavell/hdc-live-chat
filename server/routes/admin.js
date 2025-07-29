const express = require('express');
const Conversation = require('../models/Conversation');
const Product = require('../models/Product');

const router = express.Router();

// Get all conversations with pagination and filters
router.get('/conversations', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      isLive, 
      agentId,
      search 
    } = req.query;

    let query = {};
    
    if (status) query.status = status;
    if (isLive !== undefined) query.isLive = isLive === 'true';
    if (agentId) query.agentId = agentId;
    if (search) {
      query.$or = [
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-messages'); // Exclude messages for performance

    const total = await Conversation.countDocuments(query);

    res.json({
      conversations: conversations.map(conv => ({
        id: conv.id,
        customerId: conv.customerId,
        customerInfo: conv.customerInfo,
        status: conv.status,
        isLive: conv.isLive,
        agentId: conv.agentId,
        messageCount: conv.messages?.length || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        agentTakeoverAt: conv.agentTakeoverAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific conversation with full message history
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ id: conversationId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get live conversations dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Loading dashboard data...');
    const { Op } = require('sequelize');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConversations,
      liveConversations,
      aiActiveCount,
      agentTakeoverCount,
      todayConversations
    ] = await Promise.all([
      Conversation.count(),
      Conversation.count({ where: { isLive: true } }),
      Conversation.count({ where: { status: 'ai_active', isLive: true } }),
      Conversation.count({ where: { status: 'agent_takeover', isLive: true } }),
      Conversation.count({
        where: {
          createdAt: { [Op.gte]: today }
        }
      })
    ]);

    // Get recent live conversations
    const recentLive = await Conversation.findAll({
      where: { isLive: true },
      order: [['updatedAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'customerInfo', 'status', 'agentId', 'updatedAt', 'messages']
    });

    console.log('📊 Dashboard stats:', { totalConversations, liveConversations, aiActiveCount, agentTakeoverCount, todayConversations });

    res.json({
      stats: {
        totalConversations,
        liveConversations,
        aiActiveCount,
        agentTakeoverCount,
        todayConversations
      },
      recentLive: recentLive.map(conv => ({
        id: conv.id,
        customerInfo: conv.customerInfo,
        status: conv.status,
        agentId: conv.agentId,
        lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
        updatedAt: conv.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Product management routes
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update product
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    
    if (productData.id) {
      // Update existing product
      const product = await Product.findOneAndUpdate(
        { id: productData.id },
        productData,
        { new: true, upsert: true }
      );
      res.json(product);
    } else {
      // Create new product
      const product = new Product({
        ...productData,
        id: require('uuid').v4()
      });
      await product.save();
      res.status(201).json(product);
    }
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    await Product.findOneAndDelete({ id: productId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const matchStage = Object.keys(dateFilter).length > 0 
      ? { createdAt: dateFilter } 
      : {};

    const analytics = await Conversation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
