const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/match', require('./routes/match'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/connect', require('./routes/connect'));

// Fallback — serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 StackMate v2 running on http://localhost:${process.env.PORT || 3000}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
