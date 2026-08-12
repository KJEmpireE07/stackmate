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

      // Update Room lastActive if this connectionId is a Room ID
      const Room = require('./models/Room');
      await Room.findByIdAndUpdate(roomId, { lastActive: Date.now() }).catch(() => {});

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

  // Typing indicators — broadcast to others in the room only
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('userTyping');
  });
  socket.on('stopTyping', ({ roomId }) => {
    socket.to(roomId).emit('userStopTyping');
  });

  // Virtual room — presence events
  socket.on('roomJoin', ({ roomId, userId, position, status }) => {
    socket.join(roomId);
    socket.to(roomId).emit('partnerJoined', { userId, position, status });
    // Ask existing members to re-announce — uses roomAnnounce to avoid loop
    socket.to(roomId).emit('requestAnnounce');
  });

  // Re-announcement (one-way, doesn't trigger another requestAnnounce)
  socket.on('roomAnnounce', ({ roomId, position, status }) => {
    socket.to(roomId).emit('partnerJoined', { position, status });
  });

  socket.on('roomMove', ({ roomId, position }) => {
    socket.to(roomId).emit('partnerMoved', { position });
  });

  socket.on('roomStatus', ({ roomId, status }) => {
    socket.to(roomId).emit('partnerStatus', { status });
  });

  // Lounge TV Synchronized Music events
  socket.on('loungePlayMusic', ({ roomId, track, isPlaying, timestamp, senderId }) => {
    socket.to(roomId).emit('loungeSyncMusic', { track, isPlaying, timestamp, senderId });
  });

  socket.on('loungeStopMusic', ({ roomId, senderId }) => {
    socket.to(roomId).emit('loungeSyncStop', { senderId });
  });

  socket.on('disconnect', () => {
    // Notify all rooms this socket was in
    socket.rooms.forEach(room => {
      socket.to(room).emit('partnerLeft');
    });
  });

});

app.use(cors());
app.use(express.json());
// Browser-safe ES module endpoints for the interactive 3D room.
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build')));
app.use('/vendor/three/addons', express.static(path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/match', require('./routes/match'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/connect', require('./routes/connect'));
app.use('/api/chat',    require('./routes/chat'));
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/rooms',   require('./routes/rooms'));

// Fallback — serve 404 page for unknown routes
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`🚀 StackMate v2 running on http://localhost:${port}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Trying another port...`);
    const fallbackPort = PORT + 1;
    server.close(() => startServer(fallbackPort));
  } else {
    console.error('❌ Server error:', err.message);
    process.exit(1);
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    startServer(PORT);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
