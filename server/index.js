const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const { initializeDatabase } = require('./config/database');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Serve chat widget
app.get('/widget/chat-widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/widget/chat-widget.js'));
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0'
  });
});

// Make io available to routes
app.set('io', io);

// Start server first
server.listen(PORT, () => {
  console.log(`🚀 HDC Live Chat server running on port ${PORT}`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`💬 Widget endpoint: http://localhost:${PORT}/widget/chat-widget.js`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Initialize database and socket handlers after server starts
initializeDatabase();
setupSocketHandlers(io);

module.exports = { app, io };
