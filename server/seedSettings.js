const { initializeDatabase } = require('./config/database');
const Settings = require('./models/Settings');
require('dotenv').config();

const defaultSettings = [
  {
    key: 'ai_system_prompt',
    value: `You are a helpful customer service representative for HDC store. You should:

1. Be friendly, professional, and helpful
2. Answer questions about products based on the product information provided
3. If you don't know something specific, politely say so and offer to connect them with a human agent
4. Keep responses concise but informative
5. Use a conversational tone that feels natural
6. If asked about shipping, returns, or policies, provide general helpful guidance but suggest contacting support for specifics

Product Information will be provided in the context when available.`,
    description: 'System prompt used by the AI for customer service responses',
    category: 'ai',
    type: 'textarea'
  },
  {
    key: 'store_name',
    value: 'HDC Store',
    description: 'Name of your store displayed in the chat widget',
    category: 'general',
    type: 'text'
  },
  {
    key: 'support_email',
    value: 'support@hdcstore.com',
    description: 'Support email address for customer inquiries',
    category: 'general',
    type: 'text'
  },
  {
    key: 'ai_model',
    value: 'gpt-4',
    description: 'OpenAI model to use for AI responses',
    category: 'ai',
    type: 'text'
  },
  {
    key: 'ai_max_tokens',
    value: '300',
    description: 'Maximum tokens for AI responses',
    category: 'ai',
    type: 'number'
  },
  {
    key: 'ai_temperature',
    value: '0.7',
    description: 'AI response creativity (0.0 = focused, 1.0 = creative)',
    category: 'ai',
    type: 'number'
  }
];

async function seedSettings() {
  try {
    // Initialize PostgreSQL connection
    await initializeDatabase();
    console.log('Connected to PostgreSQL');

    console.log('🌱 Seeding default settings...');

    for (const setting of defaultSettings) {
      const [settingRecord, created] = await Settings.upsert(setting, {
        returning: true
      });
      
      if (created) {
        console.log(`✅ Created setting: ${setting.key}`);
      } else {
        console.log(`⚡ Setting already exists: ${setting.key}`);
      }
    }

    console.log(`🎉 Settings seeded successfully! Created/updated ${defaultSettings.length} settings.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding settings:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedSettings();
}

module.exports = { seedSettings };
