const OpenAI = require('openai');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class OpenAIService {
  constructor() {
    // Default fallback prompt if database setting doesn't exist
    this.defaultSystemPrompt = `You are a helpful customer service representative for HDC store. You should:

1. Be friendly, professional, and helpful
2. Answer questions about products based on the product information provided
3. If you don't know something specific, politely say so and offer to connect them with a human agent
4. Keep responses concise but informative
5. Use a conversational tone that feels natural
6. If asked about shipping, returns, or policies, provide general helpful guidance but suggest contacting support for specifics

Product Information will be provided in the context when available.`;
  }

  async getSystemPrompt() {
    try {
      const promptSetting = await Settings.findOne({
        where: { key: 'ai_system_prompt' }
      });
      
      if (promptSetting && promptSetting.value) {
        console.log('🤖 Using custom AI prompt from database');
        return promptSetting.value;
      }
      
      console.log('🤖 Using default AI prompt (no custom prompt set)');
      return this.defaultSystemPrompt;
    } catch (error) {
      console.error('Error fetching AI prompt from database:', error);
      console.log('🤖 Falling back to default AI prompt');
      return this.defaultSystemPrompt;
    }
  }

  async generateResponse(message, conversationHistory = [], customerInfo = {}) {
    try {
      // Get relevant product information
      const productContext = await this.getProductContext(message);
      
      // Build conversation context
      const systemPrompt = await this.buildSystemPrompt(productContext, customerInfo);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.formatConversationHistory(conversationHistory),
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      
      // Calculate realistic typing duration (words per minute simulation)
      const typingDuration = this.calculateTypingDuration(response);

      return {
        content: response,
        typingDuration,
        tokensUsed: completion.usage.total_tokens,
        model: 'gpt-4'
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        content: "I'm having trouble processing your request right now. Let me connect you with a human agent who can help you better.",
        typingDuration: 2000,
        tokensUsed: 0,
        model: 'fallback'
      };
    }
  }

  async getProductContext(message) {
    try {
      console.log('🔍 Getting product context for message:', message);
      
      // PostgreSQL text search using ILIKE for keyword matching
      const { Op } = require('sequelize');
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${message}%` } },
            { description: { [Op.iLike]: `%${message}%` } },
            { aiContext: { [Op.iLike]: `%${message}%` } }
          ]
        },
        limit: 5
      });

      if (products.length === 0) {
        console.log('📦 No specific products found, getting fallback products');
        // Fallback: get some popular products
        const fallbackProducts = await Product.findAll({ limit: 3 });
        return fallbackProducts.map(p => p.aiContext).join('\n\n');
      }

      console.log(`📦 Found ${products.length} relevant products`);
      return products.map(product => 
        `Product: ${product.name}\nPrice: $${product.price}\nDescription: ${product.aiContext}`
      ).join('\n\n');
    } catch (error) {
      console.error('Error fetching product context:', error);
      return '';
    }
  }

  async buildSystemPrompt(productContext, customerInfo) {
    let prompt = await this.getSystemPrompt();
    
    if (customerInfo.name) {
      prompt += `\n\nCustomer's name is ${customerInfo.name}.`;
    }
    
    if (productContext) {
      prompt += `\n\nRelevant Product Information:\n${productContext}`;
    }
    
    return prompt;
  }

  formatConversationHistory(history) {
    return history.slice(-10).map(msg => ({
      role: msg.sender === 'customer' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  calculateTypingDuration(text) {
    // Faster typing simulation for better user experience
    const words = text.split(' ').length;
    const baseWPM = 120; // Much faster typing speed
    const variation = Math.random() * 20 - 10; // ±10 WPM variation
    const actualWPM = baseWPM + variation;
    
    // Convert to milliseconds, add small base delay
    const typingTime = (words / actualWPM) * 60 * 1000;
    const baseDelay = 500; // Reduced base delay
    
    return Math.max(typingTime + baseDelay, 800); // Minimum 0.8 seconds
  }
}

module.exports = new OpenAIService();
