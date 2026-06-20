const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  connectionId: { type: String, required: true }, // which chat room
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:         { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);