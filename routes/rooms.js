const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');

// POST /api/rooms/create
router.post('/create', auth, async (req, res) => {
  try {
    const { name, category, members } = req.body;
    if (!name || !category || !members || !Array.isArray(members)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Include the creator in the members list
    const roomMembers = [...new Set([...members, req.user.id])];

    const room = await Room.create({
      name,
      category,
      creator: req.user.id,
      members: roomMembers,
      lastActive: Date.now()
    });

    res.json({ message: 'Room created successfully', room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.id })
      .sort({ lastActive: -1 })
      .populate('members', 'name')
      .lean();

    // Get the latest message for each room
    for (const room of rooms) {
      const latestMessage = await Message.findOne({ connectionId: room._id.toString() })
        .sort({ createdAt: -1 })
        .populate('sender', 'name')
        .lean();
      
      if (latestMessage) {
        room.latestMessage = {
          text: latestMessage.text,
          senderName: latestMessage.sender.name,
          createdAt: latestMessage.createdAt
        };
      }
    }

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('members', 'name university program year')
      .lean();

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check membership
    const isMember = room.members.some(m => m._id.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
