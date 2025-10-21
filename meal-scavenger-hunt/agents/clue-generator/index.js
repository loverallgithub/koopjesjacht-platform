const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9005;

app.use(cors());
app.use(express.json());

// Clue storage
const clues = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'clue-generator',
    timestamp: new Date().toISOString()
  });
});

// Generate single clue
app.post('/generate-clue', async (req, res) => {
  try {
    const {
      venue_name,
      venue_type,
      location,
      difficulty_level = 3,
      hunt_theme,
      shop_info
    } = req.body;

    if (!venue_name && !shop_info) {
      return res.status(400).json({ error: 'venue_name or shop_info required' });
    }

    const name = venue_name || shop_info?.name || 'Mystery Location';
    const type = venue_type || shop_info?.type || 'restaurant';
    const diff = difficulty_level || shop_info?.difficulty_level || 3;

    const clue = generateClueByDifficulty(name, type, location, diff, hunt_theme);
    const clue_id = uuidv4();

    const clueData = {
      clue_id,
      venue_name: name,
      venue_type: type,
      difficulty_level: diff,
      clue_text: clue.text,
      hint: clue.hint,
      solution: clue.solution,
      created_at: new Date().toISOString(),
      hunt_theme: hunt_theme || null
    };

    clues.set(clue_id, clueData);

    console.log(`[Clue Generator] Generated clue ${clue_id} for ${name} (difficulty: ${diff})`);

    res.json({
      success: true,
      data: clueData
    });
  } catch (error) {
    console.error('[Clue Generator] Error:', error);
    res.status(500).json({ error: 'Failed to generate clue' });
  }
});

// Generate batch of clues
app.post('/generate-batch', async (req, res) => {
  try {
    const { venues, hunt_theme, difficulty_level = 3 } = req.body;

    if (!venues || !Array.isArray(venues)) {
      return res.status(400).json({ error: 'venues array required' });
    }

    const generatedClues = venues.map((venue, index) => {
      const clue = generateClueByDifficulty(
        venue.name,
        venue.type,
        venue.location,
        venue.difficulty_level || difficulty_level,
        hunt_theme
      );

      const clue_id = uuidv4();
      const clueData = {
        clue_id,
        venue_id: venue.id,
        venue_name: venue.name,
        venue_type: venue.type,
        order: index + 1,
        difficulty_level: venue.difficulty_level || difficulty_level,
        clue_text: clue.text,
        hint: clue.hint,
        solution: clue.solution,
        created_at: new Date().toISOString()
      };

      clues.set(clue_id, clueData);
      return clueData;
    });

    res.json({
      success: true,
      count: generatedClues.length,
      data: generatedClues
    });
  } catch (error) {
    console.error('[Clue Generator] Batch error:', error);
    res.status(500).json({ error: 'Failed to generate clues' });
  }
});

// Get clues for hunt
app.get('/clues/:hunt_id', (req, res) => {
  const { hunt_id } = req.params;
  const huntClues = Array.from(clues.values()).filter(c => c.hunt_id === hunt_id);

  res.json({
    hunt_id,
    count: huntClues.length,
    data: huntClues
  });
});

// Get specific clue
app.get('/clue/:clue_id', (req, res) => {
  const { clue_id } = req.params;
  const clue = clues.get(clue_id);

  if (!clue) {
    return res.status(404).json({ error: 'Clue not found' });
  }

  res.json({ data: clue });
});

// Update clue
app.put('/clue/:clue_id', (req, res) => {
  const { clue_id } = req.params;
  const updates = req.body;

  const clue = clues.get(clue_id);

  if (!clue) {
    return res.status(404).json({ error: 'Clue not found' });
  }

  const updatedClue = {
    ...clue,
    ...updates,
    updated_at: new Date().toISOString()
  };

  clues.set(clue_id, updatedClue);

  res.json({
    success: true,
    data: updatedClue
  });
});

// Clue generation logic by difficulty
function generateClueByDifficulty(name, type, location, difficulty, theme) {
  const templates = {
    1: {
      // Very Easy - Direct hints
      text: `Find the ${type} called "${name}". Look for the sign with this name!`,
      hint: `It's a ${type} in the area`,
      solution: name
    },
    2: {
      // Easy - Simple riddle
      text: `Where hungry travelers seek comfort and joy, ${name.split(' ')[0]} welcomes all to employ.`,
      hint: `Look for a ${type} with "${name.split(' ')[0]}" in the name`,
      solution: name
    },
    3: {
      // Medium - Creative riddle
      text: generateMediumClue(name, type),
      hint: `Count the letters in "${name.split(' ')[0]}" for a clue`,
      solution: name
    },
    4: {
      // Hard - Abstract riddle
      text: generateHardClue(name, type, theme),
      hint: `Think about what makes this ${type} unique`,
      solution: name
    },
    5: {
      // Very Hard - Cryptic
      text: generateCrypticClue(name, type),
      hint: `Decode the hidden message in the clue`,
      solution: name
    }
  };

  return templates[difficulty] || templates[3];
}

function generateMediumClue(name, type) {
  const firstLetter = name.charAt(0);
  const wordCount = name.split(' ').length;

  return `Seek a ${type} where ${wordCount === 1 ? 'one word' : `${wordCount} words`} tell the tale, beginning with '${firstLetter}' without fail. A place of flavor, warmth, and care, find the answer waiting there.`;
}

function generateHardClue(name, type, theme) {
  const nameLength = name.replace(/\s/g, '').length;
  const vowels = (name.match(/[aeiou]/gi) || []).length;

  if (theme === 'historical') {
    return `In ${nameLength} letters lies the key, where ${vowels} vowels set history free. A ${type} of tales from days gone by, beneath its roof, the past won't die.`;
  }

  return `${nameLength} steps from mystery to truth, ${vowels} vowels guard eternal youth. This ${type} holds secrets in its name, seek it out to win the game.`;
}

function generateCrypticClue(name, type) {
  const reversed = name.split('').reverse().join('');
  const firstThree = name.substring(0, 3).toUpperCase();

  return `When "${firstThree}" meets the sky, and backwards "${reversed.substring(0, 3)}" catches the eye. A ${type} exists where puzzles play, solve this riddle to find your way.`;
}

// AI-style contextual clue generation (simulated)
app.post('/ai-generate', async (req, res) => {
  const {
    venue_name,
    venue_description,
    neighborhood,
    specialty,
    difficulty_level = 3
  } = req.body;

  // Simulate AI-generated clue with context
  const contextualClue = generateContextualClue(
    venue_name,
    venue_description,
    neighborhood,
    specialty,
    difficulty_level
  );

  const clue_id = uuidv4();
  const clueData = {
    clue_id,
    venue_name,
    clue_text: contextualClue.text,
    hint: contextualClue.hint,
    solution: venue_name,
    ai_generated: true,
    context_used: {
      neighborhood,
      specialty
    },
    created_at: new Date().toISOString()
  };

  clues.set(clue_id, clueData);

  res.json({
    success: true,
    data: clueData
  });
});

function generateContextualClue(name, description, neighborhood, specialty, difficulty) {
  const templates = [
    `In ${neighborhood}, where ${specialty} reigns supreme, find the place where quality is not just a dream. Look for ${name}'s welcoming door, where flavors dance and spirits soar.`,

    `Among ${neighborhood}'s finest, one stands tall, famous for ${specialty} that enthralls all. The name you seek is whispered with pride, ${name} awaits on the other side.`,

    `Where ${specialty} meets ${neighborhood}'s charm, ${name} keeps tradition warm. Seek the spot where locals know, quality and taste both flow.`
  ];

  return {
    text: templates[difficulty % templates.length],
    hint: `Famous for ${specialty} in ${neighborhood}`,
    solution: name
  };
}

app.listen(PORT, () => {
  console.log(`✅ Clue Generator Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
