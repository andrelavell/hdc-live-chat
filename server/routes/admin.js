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

    const { Op } = require('sequelize');
    let whereClause = {};
    
    if (status) whereClause.status = status;
    if (isLive !== undefined) whereClause.isLive = isLive === 'true';
    if (agentId) whereClause.agentId = agentId;
    if (search) {
      whereClause[Op.or] = [
        { '$customerInfo.name$': { [Op.iLike]: `%${search}%` } },
        { '$customerInfo.email$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    const conversations = await Conversation.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      attributes: { exclude: ['messages'] } // Exclude messages for performance
    });

    const total = await Conversation.count({ where: whereClause });

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
    const conversation = await Conversation.findOne({ 
      where: { id: conversationId }
    });
    
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
    const { Op } = require('sequelize');
    let whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (category) {
      whereClause.category = category;
    }

    const products = await Product.findAll({
      where: whereClause,
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Product.count({ where: whereClause });

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
      const [product, created] = await Product.upsert(
        productData,
        { returning: true }
      );
      res.json(product);
    } else {
      // Create new product
      const product = await Product.create({
        ...productData,
        id: require('uuid').v4()
      });
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
    await Product.destroy({ where: { id: productId } });
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
    const { Op, fn, col } = require('sequelize');
    let whereClause = {};
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    // PostgreSQL equivalent of MongoDB aggregation
    const analytics = await Conversation.findAll({
      where: whereClause,
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        'status',
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('createdAt')), 'status'],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
