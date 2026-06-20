const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// GET /api/chat/:connectionId — load message history
router.get('/:connectionId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ 
      connectionId: req.params.connectionId 
    })
    .populate('sender', 'name')  // attach sender's name
    .sort({ createdAt: 1 });     // oldest first
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;