const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/ai/explain  — generate a match explanation for two users
router.post('/explain', auth, async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ message: 'partnerId required' });

    // Fetch both profiles
    const [me, partner] = await Promise.all([
      User.findById(req.user.id).select('-password'),
      User.findById(partnerId).select('-password')
    ]);

    if (!me || !partner) return res.status(404).json({ message: 'User not found' });

    // Build a structured prompt from real profile data
    const prompt = `
You are helping college students understand why they would make great coding partners.

Student A (${me.name}):
- Skills: ${(me.skills || []).join(', ') || 'not listed'}
- Currently learning: ${(me.learning || []).join(', ') || 'not listed'}
- Short-term goal: ${me.shortTermGoal || 'not listed'}
- Long-term goal: ${me.longTermGoal || 'not listed'}
- Project interests: ${(me.projectInterests || []).join(', ') || 'not listed'}
- Work style: ${me.workStyle || 'flexible'}, ${me.hoursPerWeek || '?'} hrs/week
- Year: ${me.year || '?'}

Student B (${partner.name}):
- Skills: ${(partner.skills || []).join(', ') || 'not listed'}
- Currently learning: ${(partner.learning || []).join(', ') || 'not listed'}
- Short-term goal: ${partner.shortTermGoal || 'not listed'}
- Long-term goal: ${partner.longTermGoal || 'not listed'}
- Project interests: ${(partner.projectInterests || []).join(', ') || 'not listed'}
- Work style: ${partner.workStyle || 'flexible'}, ${partner.hoursPerWeek || '?'} hrs/week
- Year: ${partner.year || '?'}

Write 2-3 sentences explaining specifically why these two students would make great coding partners.
Focus on how their skills complement each other, their shared goals, and what they could build together.
Be specific, encouraging, and direct. Do not use generic phrases like "great team" or "work well together".
    `.trim();

    const completion = await groq.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      messages:   [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;
    res.json({ explanation: text });

  } catch (err) {
    console.error('AI explain error:', err.message);
    res.status(500).json({ message: 'AI explanation failed. Try again.' });
  }
});

module.exports = router;
