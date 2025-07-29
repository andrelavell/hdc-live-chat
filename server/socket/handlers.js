const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const openaiService = require('../services/openai');

const activeConnections = new Map(); // socketId -> { conversationId, customerId, isAgent }
const agentConnections = new Map(); // agentId -> socketId

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Customer joins chat
    socket.on('join_chat', async (data) => {
      try {
        const { customerId, customerInfo } = data;
        console.log('🔌 Customer joining chat:', customerId);
        
        // Find or create conversation (PostgreSQL/Sequelize syntax)
        let conversation = await Conversation.findOne({ 
          where: {
            customerId, 
            isLive: true 
          },
          order: [['createdAt', 'DESC']]
        });

        if (!conversation) {
          console.log('📝 Creating new conversation for customer:', customerId);
          conversation = await Conversation.create({
            id: uuidv4(),
            customerId,
            customerInfo,
            status: 'survey'
          });
        }

        // Store connection
        activeConnections.set(socket.id, {
          conversationId: conversation.id,
          customerId,
          isAgent: false
        });

        socket.join(conversation.id);
        socket.emit('conversation_joined', {
          conversationId: conversation.id,
          status: conversation.status,
          messages: conversation.messages,
          surveyCompleted: conversation.surveyCompleted
        });

        // Notify agents of new/active conversation
        io.to('agents').emit('conversation_update', {
          conversationId: conversation.id,
          status: conversation.status,
          customerInfo: conversation.customerInfo,
          isLive: true
        });

      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Agent joins admin dashboard
    socket.on('join_admin', (data) => {
      const { agentId } = data;
      socket.join('agents');
      agentConnections.set(agentId, socket.id);
      
      socket.emit('admin_joined', { agentId });
      console.log(`👤 Agent ${agentId} joined admin dashboard`);
    });

    // Handle customer messages
    socket.on('send_message', async (data) => {
      try {
        console.log('💬 Received message:', data);
        const connection = activeConnections.get(socket.id);
        if (!connection) {
          console.log('❌ No active connection found for socket:', socket.id);
          return;
        }

        const { content, messageId } = data;
        console.log('🔍 Looking for conversation:', connection.conversationId);
        const conversation = await Conversation.findOne({ 
          where: { id: connection.conversationId }
        });
        
        if (!conversation) {
          console.log('❌ Conversation not found:', connection.conversationId);
          return;
        }

        // Add customer message
        const customerMessage = {
          id: messageId || uuidv4(),
          sender: 'customer',
          content,
          timestamp: new Date()
        };

        console.log('📝 Adding message to conversation:', customerMessage);
        // Update messages array and save (PostgreSQL JSONB)
        const updatedMessages = [...(conversation.messages || []), customerMessage];
        await conversation.update({ messages: updatedMessages });

        // Broadcast to conversation participants
        io.to(conversation.id).emit('message_received', customerMessage);
        
        // Notify agents
        io.to('agents').emit('new_message', {
          conversationId: conversation.id,
          message: customerMessage,
          customerInfo: conversation.customerInfo
        });

        // Generate AI response if not taken over by agent
        if (conversation.status === 'ai_active') {
          await handleAIResponse(conversation, content, io);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle survey responses
    socket.on('survey_response', async (data) => {
      try {
        console.log('📋 Survey response received:', data);
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        const { field, value } = data;
        const conversation = await Conversation.findOne({ 
          where: { id: connection.conversationId }
        });
        
        if (!conversation) return;

        // Update customer info (PostgreSQL JSONB)
        const updatedCustomerInfo = {
          ...(conversation.customerInfo || {}),
          [field]: value
        };
        
        // Check if survey is complete
        const hasName = updatedCustomerInfo.name;
        const hasEmail = updatedCustomerInfo.email;
        
        let updatedMessages = conversation.messages || [];
        let surveyCompleted = conversation.surveyCompleted;
        let status = conversation.status;
        
        if (hasName && hasEmail && !surveyCompleted) {
          surveyCompleted = true;
          status = 'ai_active';
          
          // Send handoff message
          const handoffMessage = {
            id: uuidv4(),
            sender: 'ai',
            content: "Thanks! We're transferring you over to a rep!",
            timestamp: new Date()
          };
          
          updatedMessages = [...updatedMessages, handoffMessage];
        }

        // Update conversation with PostgreSQL syntax
        await conversation.update({
          customerInfo: updatedCustomerInfo,
          messages: updatedMessages,
          surveyCompleted,
          status
        });

        socket.emit('survey_updated', {
          surveyCompleted: conversation.surveyCompleted,
          status: conversation.status
        });

        if (conversation.surveyCompleted) {
          io.to(conversation.id).emit('message_received', handoffMessage);
        }

      } catch (error) {
        console.error('Error handling survey response:', error);
        socket.emit('error', { message: 'Failed to update survey' });
      }
    });

    // Agent takes over conversation
    socket.on('takeover_conversation', async (data) => {
      try {
        const { conversationId, agentId } = data;
        const conversation = await Conversation.findOne({ id: conversationId });
        
        if (!conversation) return;

        // Update conversation with PostgreSQL syntax
        await conversation.update({
          status: 'agent_takeover',
          agentId: agentId,
          agentTakeoverAt: new Date()
        });
        console.log('👤 Agent takeover saved:', agentId);

        // Join agent to conversation room
        socket.join(conversationId);

        // Notify customer and other agents
        io.to(conversationId).emit('agent_joined', { agentId });
        io.to('agents').emit('conversation_update', {
          conversationId,
          status: 'agent_takeover',
          agentId
        });

        socket.emit('takeover_success', { conversationId });

      } catch (error) {
        console.error('Error taking over conversation:', error);
        socket.emit('error', { message: 'Failed to take over conversation' });
      }
    });

    // Agent sends message
    socket.on('agent_message', async (data) => {
      try {
        const { conversationId, content, agentId } = data;
        const conversation = await Conversation.findOne({ id: conversationId });
        
        if (!conversation || conversation.agentId !== agentId) return;

        const agentMessage = {
          id: uuidv4(),
          sender: 'agent',
          content,
          timestamp: new Date(),
          agentId
        };

        // Update messages array and save (PostgreSQL JSONB)
        const updatedMessages = [...(conversation.messages || []), agentMessage];
        await conversation.update({ messages: updatedMessages });
        console.log('💾 Agent message saved to database:', agentMessage.id);

        io.to(conversationId).emit('message_received', agentMessage);

      } catch (error) {
        console.error('Error sending agent message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      const connection = activeConnections.get(socket.id);
      if (connection) {
        activeConnections.delete(socket.id);
        
        // If it was an agent, remove from agent connections
        for (const [agentId, socketId] of agentConnections.entries()) {
          if (socketId === socket.id) {
            agentConnections.delete(agentId);
            break;
          }
        }
      }
    });
  });
};

// Helper function to handle AI responses
async function handleAIResponse(conversation, customerMessage, io) {
  try {
    // Show typing indicator
    io.to(conversation.id).emit('typing_indicator', { 
      sender: 'ai', 
      isTyping: true 
    });

    // Generate AI response
    const aiResponse = await openaiService.generateResponse(
      customerMessage,
      conversation.messages,
      conversation.customerInfo
    );

    // Simulate typing delay
    setTimeout(async () => {
      const aiMessage = {
        id: uuidv4(),
        sender: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: {
          typing_duration: aiResponse.typingDuration,
          openai_model: aiResponse.model,
          tokens_used: aiResponse.tokensUsed
        }
      };

      // Update messages array and save (PostgreSQL JSONB)
      const updatedMessages = [...(conversation.messages || []), aiMessage];
      await conversation.update({ messages: updatedMessages });
      console.log('💾 AI message saved to database:', aiMessage.id);

      // Hide typing indicator and send message
      io.to(conversation.id).emit('typing_indicator', { 
        sender: 'ai', 
        isTyping: false 
      });
      
      io.to(conversation.id).emit('message_received', aiMessage);

      // Notify agents
      io.to('agents').emit('new_message', {
        conversationId: conversation.id,
        message: aiMessage,
        customerInfo: conversation.customerInfo
      });

    }, aiResponse.typingDuration);

  } catch (error) {
    console.error('Error handling AI response:', error);
    
    // Hide typing indicator on error
    io.to(conversation.id).emit('typing_indicator', { 
      sender: 'ai', 
      isTyping: false 
    });
  }
}

module.exports = { setupSocketHandlers };
