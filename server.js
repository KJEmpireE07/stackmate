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

// Phase 0: Workspace Data Foundation
// Maps socket.id to user's workspace state
const workspaceUsers = new Map();

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

  // ── PHASE 0: Virtual Workspace Foundation ──
  socket.on('joinWorkspace', ({ roomId, userId }) => {
    socket.join(roomId);
    const state = {
      socketId: socket.id,
      roomId,
      userId,
      currentZone: 'lounge', // default zone
      presence: 'Online',
      cameraEnabled: false,
      micEnabled: false,
      joinedAt: Date.now(),
      lastActive: Date.now()
    };
    workspaceUsers.set(socket.id, state);
    
    // Broadcast to room that a new user joined the workspace
    socket.to(roomId).emit('workspaceUserJoined', state);

    // Send all current users in the room to the joining user
    const roomUsers = Array.from(workspaceUsers.values()).filter(u => u.roomId === roomId && u.socketId !== socket.id);
    socket.emit('workspaceState', roomUsers);
  });

  socket.on('updateZone', ({ zone }) => {
    const state = workspaceUsers.get(socket.id);
    if (state) {
      state.currentZone = zone;
      state.lastActive = Date.now();
      io.to(state.roomId).emit('workspaceUserUpdated', state);
    }
  });

  socket.on('updatePresence', ({ presence }) => {
    const state = workspaceUsers.get(socket.id);
    if (state) {
      state.presence = presence;
      state.lastActive = Date.now();
      io.to(state.roomId).emit('workspaceUserUpdated', state);
    }
  });

  socket.on('updateMedia', ({ cameraEnabled, micEnabled }) => {
    const state = workspaceUsers.get(socket.id);
    if (state) {
      if (cameraEnabled !== undefined) state.cameraEnabled = cameraEnabled;
      if (micEnabled !== undefined) state.micEnabled = micEnabled;
      state.lastActive = Date.now();
      io.to(state.roomId).emit('workspaceUserUpdated', state);
    }
  });

  socket.on('disconnect', () => {
    // Notify all rooms this socket was in
    socket.rooms.forEach(room => {
      socket.to(room).emit('partnerLeft');
    });

    // Workspace disconnect logic
    const state = workspaceUsers.get(socket.id);
    if (state) {
      io.to(state.roomId).emit('workspaceUserLeft', { socketId: socket.id, userId: state.userId });
      workspaceUsers.delete(socket.id);
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
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/rooms',   require('./routes/rooms'));

// Fallback — serve 404 page for unknown routes
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
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
