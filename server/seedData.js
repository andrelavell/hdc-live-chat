const { initializeDatabase } = require('./config/database');
const Product = require('./models/Product');
require('dotenv').config();

const sampleProducts = [
  {
    id: 'prod_1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 299.99,
    category: 'Electronics',
    tags: ['wireless', 'headphones', 'noise-cancellation', 'premium'],
    features: ['Active Noise Cancellation', '30-hour battery life', 'Quick charge', 'Premium materials'],
    specifications: {
      battery: '30 hours',
      connectivity: 'Bluetooth 5.0',
      weight: '250g',
      colors: ['Black', 'Silver', 'Rose Gold']
    },
    availability: {
      inStock: true,
      quantity: 50
    },
    aiContext: `Premium Wireless Headphones - $299.99. These are our top-of-the-line headphones featuring active noise cancellation technology that blocks out 95% of ambient noise. Perfect for travel, work, or just enjoying music. Key features include 30-hour battery life, quick 15-minute charge gives 3 hours of playback, premium leather and metal construction, and Bluetooth 5.0 connectivity. Available in Black, Silver, and Rose Gold. Great for professionals, travelers, and audiophiles. Comes with 2-year warranty and free shipping.`
  },
  {
    id: 'prod_2',
    name: 'Smart Fitness Tracker',
    description: 'Advanced fitness tracker with heart rate monitoring and GPS',
    price: 199.99,
    category: 'Wearables',
    tags: ['fitness', 'tracker', 'heart-rate', 'gps', 'smart'],
    features: ['Heart Rate Monitoring', 'Built-in GPS', 'Sleep Tracking', 'Water Resistant'],
    specifications: {
      battery: '7 days',
      waterRating: 'IP68',
      display: '1.4 inch AMOLED',
      sensors: ['Heart Rate', 'GPS', 'Accelerometer', 'Gyroscope']
    },
    availability: {
      inStock: true,
      quantity: 75
    },
    aiContext: `Smart Fitness Tracker - $199.99. Comprehensive health and fitness monitoring device with built-in GPS for accurate workout tracking. Features 24/7 heart rate monitoring, sleep quality analysis, and tracks 20+ workout modes including running, cycling, swimming, and yoga. 7-day battery life, IP68 water resistance (safe for swimming), 1.4-inch bright AMOLED display. Syncs with smartphone apps for detailed analytics. Perfect for fitness enthusiasts, runners, and health-conscious individuals. Includes free fitness coaching app subscription for 6 months.`
  },
  {
    id: 'prod_3',
    name: 'Ergonomic Office Chair',
    description: 'Professional ergonomic chair for all-day comfort',
    price: 449.99,
    category: 'Furniture',
    tags: ['office', 'chair', 'ergonomic', 'professional', 'comfort'],
    features: ['Lumbar Support', 'Adjustable Height', 'Breathable Mesh', '360° Swivel'],
    specifications: {
      material: 'Breathable mesh and premium fabric',
      weightCapacity: '300 lbs',
      dimensions: '26"W x 26"D x 40-44"H',
      warranty: '5 years'
    },
    availability: {
      inStock: true,
      quantity: 25
    },
    aiContext: `Ergonomic Office Chair - $449.99. Professional-grade office chair designed for all-day comfort and productivity. Features advanced lumbar support system, breathable mesh back, premium fabric seat, and fully adjustable height and tilt. Supports up to 300 lbs, 360° swivel base with smooth-rolling casters. Perfect for home offices, corporate environments, and anyone who spends long hours at a desk. Helps reduce back pain and improve posture. 5-year warranty included. Assembly service available for additional $50.`
  },
  {
    id: 'prod_4',
    name: 'Organic Skincare Set',
    description: 'Complete organic skincare routine with natural ingredients',
    price: 89.99,
    category: 'Beauty',
    tags: ['organic', 'skincare', 'natural', 'beauty', 'routine'],
    features: ['100% Organic', 'Cruelty-Free', 'Suitable for All Skin Types', 'Eco-Friendly Packaging'],
    specifications: {
      includes: ['Cleanser 150ml', 'Toner 120ml', 'Serum 30ml', 'Moisturizer 50ml'],
      skinTypes: 'All skin types',
      certifications: ['USDA Organic', 'Leaping Bunny Certified']
    },
    availability: {
      inStock: true,
      quantity: 100
    },
    aiContext: `Organic Skincare Set - $89.99. Complete 4-step skincare routine featuring 100% organic, natural ingredients. Set includes gentle cleanser (150ml), balancing toner (120ml), vitamin C serum (30ml), and hydrating moisturizer (50ml). Suitable for all skin types including sensitive skin. Cruelty-free and USDA Organic certified. Eco-friendly packaging made from recycled materials. Perfect for those seeking natural beauty solutions. Results typically visible within 2-4 weeks of regular use. 30-day money-back guarantee if not completely satisfied.`
  }
];

async function seedDatabase() {
  try {
    // Initialize PostgreSQL connection
    await initializeDatabase();
    console.log('Connected to PostgreSQL');

    // Clear existing products
    await Product.destroy({ where: {} });
    console.log('Cleared existing products');

    // Insert sample products
    await Product.bulkCreate(sampleProducts);
    console.log(`Inserted ${sampleProducts.length} sample products`);

    console.log('Database seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleProducts };
