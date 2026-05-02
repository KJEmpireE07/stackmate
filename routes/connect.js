const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Connection = require('../models/Connection');

const MAX_CONNECTIONS = 3;

// Helper — count accepted connections for a user
async function countAccepted(userId) {
  return Connection.countDocuments({
    $or: [{ from: userId }, { to: userId }],
    status: 'accepted'
  });
}

// POST /api/connect/request
router.post('/request', auth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Target user required' });

    // Check sender's limit
    const senderCount = await countAccepted(req.user.id);
    if (senderCount >= MAX_CONNECTIONS)
      return res.status(400).json({ message: `You've reached the maximum of ${MAX_CONNECTIONS} connections. Remove one to connect with someone new.` });

    // Check if connection already exists
    const existing = await Connection.findOne({
      $or: [
        { from: req.user.id, to },
        { from: to, to: req.user.id }
      ]
    });
    if (existing) return res.status(400).json({ message: 'Connection already exists' });

    const connection = await Connection.create({ from: req.user.id, to });
    res.json({ message: 'Connection request sent!', connection });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/connect/requests  — incoming pending requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await Connection.find({ to: req.user.id, status: 'pending' })
      .populate('from', 'name program university year skills bio');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/connect/all  — all accepted connections
router.get('/all', auth, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ from: req.user.id }, { to: req.user.id }],
      status: 'accepted'
    }).populate('from to', 'name program university year skills bio');
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/connect/respond  — accept or reject
router.put('/respond', auth, async (req, res) => {
  try {
    const { connectionId, status } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    if (status === 'accepted') {
      // Check both sides haven't hit the limit
      const connection = await Connection.findOne({ _id: connectionId, to: req.user.id });
      if (!connection) return res.status(404).json({ message: 'Connection request not found' });

      const [receiverCount, senderCount] = await Promise.all([
        countAccepted(req.user.id),
        countAccepted(connection.from.toString())
      ]);
      if (receiverCount >= MAX_CONNECTIONS)
        return res.status(400).json({ message: `You've reached your limit of ${MAX_CONNECTIONS} connections.` });
      if (senderCount >= MAX_CONNECTIONS)
        return res.status(400).json({ message: `This user has already reached their connection limit.` });
    }

    const connection = await Connection.findOneAndUpdate(
      { _id: connectionId, to: req.user.id },
      { status },
      { new: true }
    );
    if (!connection) return res.status(404).json({ message: 'Connection request not found' });

    res.json({ message: `Request ${status}`, connection });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
