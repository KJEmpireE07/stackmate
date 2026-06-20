const express = require('express');
const http = require('http');       // Node's built-in HTTP module
const { Server } = require('socket.io');  // Socket.io
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);  // wrap Express inside http server
const io = new Server(server);          // attach Socket.io to that server

const Message = require('./models/Message');

io.on('connection', (socket) => {

  // User joins a chat room (room = connectionId between two partners)
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });

  // User sends a message
  socket.on('sendMessage', async ({ roomId, senderId, text }) => {
    try {
      // Save to database so messages persist after refresh
      const message = await Message.create({
        connectionId: roomId,
        sender: senderId,
        text
      });

      // Send to everyone in the room (both users see it instantly)
      io.to(roomId).emit('newMessage', {
        _id: message._id,
        sender: senderId,
        text,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error('Message error:', err.message);
    }
  });

});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/match', require('./routes/match'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/connect', require('./routes/connect'));
app.use('/api/chat',    require('./routes/chat'));

// Fallback — serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 StackMate v2 running on http://localhost:${process.env.PORT || 3000}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
