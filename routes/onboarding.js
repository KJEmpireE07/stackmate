const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/onboarding/save
router.post('/save', auth, async (req, res) => {
  try {
    const {
      role, university, program, year,
      skills, learning,
      shortTermGoal, longTermGoal,
      hoursPerWeek, workStyle, projectInterests,
      bio
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        role, university, program, year,
        skills, learning,
        shortTermGoal, longTermGoal,
        hoursPerWeek, workStyle, projectInterests,
        bio,
        onboardingComplete: true
      },
      { new: true }
    ).select('-password');

    res.json({ message: 'Onboarding complete!', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
