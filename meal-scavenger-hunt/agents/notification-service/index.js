const express = require('express');
const app = express();
const port = process.env.AGENT_PORT || 9005;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'NotificationServiceAgent' });
});

// Main clue generation endpoint
app.post('/health', async (req, res) => {
  try {
    const { shop_info, difficulty_level, theme, language } = req.body;

    // Placeholder implementation
    // In production, this would call SmythOS API
    const clue = {
      text: `Find the place where ${shop_info?.name || 'mystery'} awaits...`,
      difficulty: difficulty_level || 3,
      estimated_time: 10,
      tags: ['discovery', 'food']
    };

    const hints = [
      { text: 'Look for a cozy spot...', penalty_points: 20, level: 1 },
      { text: 'Near the city center...', penalty_points: 40, level: 2 },
      { text: 'Famous for their coffee...', penalty_points: 60, level: 3 }
    ];

    res.json({ clue, hints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Clue Generator Agent listening on port ${port}`);
});
