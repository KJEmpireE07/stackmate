const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Connection = require('../models/Connection');

/**
 * Matching Algorithm — scores a potential partner out of 100
 * Factors:
 *  - Complementary skills (30pts): what you're learning = their skills, and vice versa
 *  - Aligned goals       (25pts): same short-term + long-term goals
 *  - Project interests   (20pts): overlap in project interest tags
 *  - Work style          (15pts): availability hours + sync/async match
 *  - Year proximity      (10pts): same or close year of study
 */
function calculateMatchScore(me, them) {
  let score = 0;
  const breakdown = { skills: 0, goals: 0, interests: 0, workStyle: 0, year: 0 };

  // — Complementary Skills (30pts) —
  const myLearning    = (me.learning   || []).map(s => s.toLowerCase());
  const theirSkills   = (them.skills   || []).map(s => s.toLowerCase());
  const theirLearning = (them.learning || []).map(s => s.toLowerCase());
  const mySkills      = (me.skills     || []).map(s => s.toLowerCase());

  const comp1 = myLearning.filter(s => theirSkills.includes(s)).length;
  const comp2 = theirLearning.filter(s => mySkills.includes(s)).length;
  const compTotal = myLearning.length + theirLearning.length || 1;
  breakdown.skills = Math.min(30, Math.round(((comp1 + comp2) / compTotal) * 30));
  score += breakdown.skills;

  // — Goals (25pts) —
  if (me.shortTermGoal && me.shortTermGoal === them.shortTermGoal) breakdown.goals += 15;
  if (me.longTermGoal  && me.longTermGoal  === them.longTermGoal)  breakdown.goals += 10;
  score += breakdown.goals;

  // — Project Interests (20pts) —
  const myInt   = (me.projectInterests   || []).map(s => s.toLowerCase());
  const theirInt = (them.projectInterests || []).map(s => s.toLowerCase());
  const overlap = myInt.filter(i => theirInt.includes(i)).length;
  const intMax  = Math.min(myInt.length, theirInt.length) || 1;
  breakdown.interests = Math.min(20, Math.round((overlap / intMax) * 20));
  score += breakdown.interests;

  // — Work Style (15pts) —
  const styleMatch = me.workStyle === them.workStyle || me.workStyle === 'both' || them.workStyle === 'both';
  if (styleMatch) breakdown.workStyle += 8;
  const hoursDiff = Math.abs((me.hoursPerWeek || 5) - (them.hoursPerWeek || 5));
  if (hoursDiff <= 5)       breakdown.workStyle += 7;
  else if (hoursDiff <= 10) breakdown.workStyle += 3;
  score += breakdown.workStyle;

  // — Year Proximity (10pts) —
  const yearDiff = Math.abs((me.year || 1) - (them.year || 1));
  breakdown.year = yearDiff === 0 ? 10 : yearDiff === 1 ? 7 : yearDiff === 2 ? 3 : 0;
  score += breakdown.year;

  return { score, breakdown };
}

const MAX_CONNECTIONS = 3;

// GET /api/match/top
router.get('/top', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);

    // Check if the current user has already hit their own limit
    const myAcceptedCount = await Connection.countDocuments({
      $or: [{ from: me._id }, { to: me._id }],
      status: 'accepted'
    });
    const atLimit = myAcceptedCount >= MAX_CONNECTIONS;

    // Get all connections for this user (any status) to exclude from discover
    const myConnections = await Connection.find({
      $or: [{ from: me._id }, { to: me._id }]
    });
    const connectedIds = myConnections.map(c =>
      c.from.toString() === me._id.toString() ? c.to.toString() : c.from.toString()
    );

    // Find users who have already reached MAX accepted connections
    // Using aggregation: count accepted connections per user, pick those >= MAX
    const maxedOut = await Connection.aggregate([
      { $match: { status: 'accepted' } },
      { $project: { users: ['$from', '$to'] } },
      { $unwind: '$users' },
      { $group: { _id: '$users', count: { $sum: 1 } } },
      { $match: { count: { $gte: MAX_CONNECTIONS } } },
      { $project: { _id: 1 } }
    ]);
    const maxedOutIds = maxedOut.map(u => u._id.toString());

    // Fetch potential matches — exclude connected, maxed-out, and self
    const excludeIds = [...new Set([...connectedIds, ...maxedOutIds])];

    const others = await User.find({
      _id: { $ne: me._id, $nin: excludeIds },
      onboardingComplete: true
    });

    const matches = others.map(them => {
      const { score, breakdown } = calculateMatchScore(me, them);
      return {
        user: {
          _id: them._id,
          name: them.name,
          program: them.program,
          university: them.university,
          year: them.year,
          skills: them.skills,
          learning: them.learning,
          shortTermGoal: them.shortTermGoal,
          longTermGoal: them.longTermGoal,
          projectInterests: them.projectInterests,
          hoursPerWeek: them.hoursPerWeek,
          workStyle: them.workStyle,
          bio: them.bio
        },
        matchScore: score,
        breakdown
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json({ matches, atLimit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
