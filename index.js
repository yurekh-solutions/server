require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Static serving for locally-stored uploads (when Cloudinary is not configured).
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/urbanav';
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas - UrbanAV');
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('/')[0] || 'Unknown'}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Server will start without database. Please check your MongoDB Atlas credentials.');
    console.log('📝 Check your .env file for MONGODB_URI configuration.');
  });

// Import routes
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payment');
const requirementRoutes = require('./routes/requirements');
const inquiryRoutes = require('./routes/inquiries');
const matchRoutes = require('./routes/match');
const otpRoutes = require('./routes/otp');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/upload');
const addressRoutes = require('./routes/addresses');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'UrbanAV API is running' });
});

// WebSocket - Real-time Chat
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // User joins
  socket.on('join', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} joined`);
    io.emit('user_status', { userId, status: 'online' });
  });

  // Join chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`💬 Socket ${socket.id} joined chat ${chatId}`);
  });

  // Send message
  socket.on('send_message', async (data) => {
    const { chatId, message, senderId, receiverId } = data;
    
    // Broadcast to chat room
    io.to(chatId).emit('receive_message', {
      chatId,
      message,
      senderId,
      timestamp: new Date(),
    });

    // Send push notification if receiver is offline
    if (receiverId && !activeUsers.has(receiverId)) {
      // TODO: Send FCM push notification
      console.log(`📱 Sending push notification to ${receiverId}`);
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      chatId: data.chatId,
    });
  });

  // Read receipt
  socket.on('message_read', (data) => {
    socket.to(data.chatId).emit('message_read_update', {
      chatId: data.chatId,
      userId: data.userId,
      messageId: data.messageId,
    });
  });

  // User disconnects
  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
        console.log(`👋 User ${userId} disconnected`);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 UrbanAV Server Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:8081'}`);
  console.log(`🔌 WebSocket: http://localhost:${PORT}`);
  console.log('\n' + '='.repeat(50));
});
