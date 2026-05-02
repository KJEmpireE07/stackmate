const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Who they are
  role: { type: String, enum: ['student', 'professional'], default: 'student' },

  // Academic info (student)
  university: { type: String, default: '' },
  program:    { type: String, default: '' },   // e.g. "Computer Science"
  year:       { type: Number, default: 1 },    // 1st, 2nd, 3rd, 4th year

  // Skills
  skills:   [{ type: String }],  // What they already know
  learning: [{ type: String }],  // What they're currently learning

  // Goals
  shortTermGoal: { type: String, default: '' }, // hackathon | internship | project | freelance
  longTermGoal:  { type: String, default: '' }, // startup | job | research | freelance

  // Work style
  hoursPerWeek:     { type: Number, default: 5 },
  workStyle:        { type: String, enum: ['sync', 'async', 'both'], default: 'both' },
  projectInterests: [{ type: String }], // Web, AI/ML, Mobile, IoT, Game Dev, etc.

  bio: { type: String, default: '' },

  onboardingComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
