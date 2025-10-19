const express = require('express');
const app = express();
const port = process.env.AGENT_PORT || 9001;

app.use(express.json());

// ============================================
// INTELLIGENT CLUE GENERATION ENGINE
// ============================================

/**
 * Generate contextually relevant clues based on:
 * - Shop name and cuisine type
 * - Location and nearby landmarks
 * - Difficulty level (1-5)
 * - Shop description and unique features
 */
function generateIntelligentClue(shopInfo, difficultyLevel = 3) {
  const { name, description, cuisine, location, address, landmark, unique_features } = shopInfo;

  // Extract key features for clue generation
  const features = extractFeatures(shopInfo);

  // Generate difficulty-appropriate clue
  const clue = generateClueByDifficulty(features, difficultyLevel);

  // Generate progressive hints
  const hints = generateProgressiveHints(features, difficultyLevel);

  // Calculate estimated time based on difficulty
  const estimatedTime = calculateEstimatedTime(difficultyLevel, location);

  return {
    clue: {
      text: clue,
      difficulty: difficultyLevel,
      estimated_time: estimatedTime,
      tags: generateTags(cuisine, features),
      answer: name,
      answer_location: location || address
    },
    hints
  };
}

/**
 * Extract relevant features from shop info
 */
function extractFeatures(shopInfo) {
  const { name, description, cuisine, location, address, landmark, unique_features } = shopInfo;

  // Common keywords for different cuisines
  const cuisineKeywords = {
    'Italian': ['pasta', 'pizza', 'risotto', 'italian', 'bella', 'trattoria', 'osteria'],
    'French': ['bistro', 'brasserie', 'café', 'croissant', 'wine', 'french', 'petit'],
    'Japanese': ['sushi', 'ramen', 'sake', 'tempura', 'bento', 'izakaya', 'sakura'],
    'Mexican': ['taco', 'burrito', 'tequila', 'salsa', 'guacamole', 'cantina'],
    'Thai': ['pad thai', 'curry', 'lemongrass', 'coconut', 'spicy', 'bangkok'],
    'Chinese': ['dim sum', 'wok', 'noodles', 'dumpling', 'beijing', 'dragon'],
    'Indian': ['curry', 'tandoor', 'naan', 'masala', 'spice', 'taj'],
    'Dutch': ['kroket', 'bitterballen', 'stamppot', 'dutch', 'hollands'],
    'Mediterranean': ['olive', 'mezze', 'grilled', 'fresh', 'salad']
  };

  // Extract keywords from description
  const descriptionLower = (description || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();

  const cuisineKeys = cuisineKeywords[cuisine] || [];
  const foundKeywords = cuisineKeys.filter(keyword =>
    descriptionLower.includes(keyword) || nameLower.includes(keyword)
  );

  return {
    name,
    cuisine,
    location,
    address,
    landmark: landmark || extractLandmark(location),
    keywords: foundKeywords,
    unique_features: unique_features || [],
    nameParts: name ? name.split(' ') : [],
    descriptionWords: description ? description.toLowerCase().split(' ') : []
  };
}

/**
 * Extract landmark from location
 */
function extractLandmark(location) {
  if (!location) return null;

  const landmarks = {
    'Frederikstraat': 'Chinatown area',
    'Frederik Hendrikplein': 'near the historic square',
    'Centrum': 'city center',
    'Statenkwartier': 'the embassy district',
    'Scheveningen': 'the beach',
    'Buitenhof': 'near the parliament buildings',
    'Noordeinde': 'near the Royal Palace',
    'Den Haag': 'The Hague'
  };

  for (const [key, value] of Object.entries(landmarks)) {
    if (location.includes(key)) return value;
  }

  return null;
}

/**
 * Generate clue based on difficulty level
 * Difficulty 1 (Easy): Very obvious, almost gives away the name
 * Difficulty 2 (Easy-Medium): Clear hints about cuisine and location
 * Difficulty 3 (Medium): Requires some deduction
 * Difficulty 4 (Medium-Hard): Cryptic with cultural references
 * Difficulty 5 (Hard): Very cryptic, riddle-like
 */
function generateClueByDifficulty(features, difficulty) {
  const { name, cuisine, location, landmark, keywords, nameParts } = features;

  switch(difficulty) {
    case 1: // Very Easy - Almost gives it away
      return `Looking for ${name}? You'll find this ${cuisine || 'restaurant'} in ${location}. Just look for the sign!`;

    case 2: // Easy - Clear description
      if (landmark) {
        return `Seek a ${cuisine || 'dining'} spot in ${location}, ${landmark}. ${keywords.length > 0 ? `Famous for their ${keywords[0]}.` : 'Look for the welcoming entrance.'}`;
      }
      return `Find the ${cuisine || 'restaurant'} in ${location}. ${keywords.length > 0 ? `They serve excellent ${keywords[0]}.` : ''}`;

    case 3: // Medium - Requires some thought
      if (nameParts.length > 1 && location) {
        return `Where "${nameParts[0]}" meets "${nameParts[nameParts.length - 1]}", ${cuisine || 'flavors'} await in ${location}.`;
      }
      if (keywords.length > 0 && location) {
        return `In ${location}, discover where ${cuisine || 'culinary'} traditions and ${keywords[0]} come together.`;
      }
      return `A ${cuisine || 'special'} place in ${location} where ${keywords[0] || 'great food'} is the specialty.`;

    case 4: // Medium-Hard - Cryptic with wordplay
      const crypticClue = generateCrypticClue(features);
      return crypticClue;

    case 5: // Very Hard - Riddle format
      const riddle = generateRiddle(features);
      return riddle;

    default:
      return `Seek out ${name} in ${location}.`;
  }
}

/**
 * Generate cryptic clue for difficulty 4
 */
function generateCrypticClue(features) {
  const { name, cuisine, location, landmark, keywords } = features;

  // Try to create wordplay with the name
  if (name.toLowerCase().includes('bella')) {
    return `Where beauty (bella) meets taste in ${location}'s ${cuisine || 'culinary'} quarter.`;
  }
  if (name.toLowerCase().includes('dragon')) {
    return `The mythical beast guards ${cuisine || 'Eastern'} treasures in ${location}.`;
  }
  if (name.toLowerCase().includes('sakura')) {
    return `Cherry blossoms bloom even indoors in ${location}'s ${cuisine || 'Japanese'} sanctuary.`;
  }
  if (name.toLowerCase().includes('golden') || name.toLowerCase().includes('gold')) {
    return `Seek the gilded ${cuisine || 'dining'} haven where ${location} meets luxury.`;
  }
  if (name.toLowerCase().includes('palace') || name.toLowerCase().includes('royal')) {
    return `Royalty dines here in ${location}, though no crown required.`;
  }

  // Generic cryptic clue
  if (landmark && keywords.length > 0) {
    return `${landmark}, where ${keywords[0]} and ${cuisine || 'exotic flavors'} hide in plain sight.`;
  }

  return `Decode this mystery: ${cuisine || 'flavors'} + ${location} = delicious discovery.`;
}

/**
 * Generate riddle for difficulty 5
 */
function generateRiddle(features) {
  const { cuisine, location, keywords, name } = features;

  const riddles = {
    'Italian': `I speak the language of Rome, serve circles of dough with toppings from ${location}. What am I called?`,
    'Japanese': `Raw fish is my poetry, rice my canvas, ${location} my gallery. Where do I create art?`,
    'Chinese': `Dragons dance, woks sing, ${location} echoes with ancient recipes. Which door opens to the Middle Kingdom?`,
    'French': `Butter, wine, and joie de vivre. In ${location}, I bring Paris to your plate. Où suis-je?`,
    'Thai': `Lemongrass whispers, chilies burn, coconut soothes. ${location} hides Southeast Asian secrets. Find me where?`,
    'Mexican': `Corn becomes art, peppers tell stories. South of the border flavors live in ${location}. ¿Dónde estoy?`,
    'Dutch': `Kroket and tradition, stamppot and pride. In ${location}, I serve the Netherlands on a plate. What's my name?`,
    'Indian': `Curry spices fill the air, tandoor fires burn bright. ${location}'s taste of the subcontinent awaits. Where?`
  };

  if (riddles[cuisine]) {
    return riddles[cuisine];
  }

  // Generic riddle
  if (keywords.length > 0) {
    return `In ${location}, I am known for ${keywords[0]}. My name has ${name.length} letters. What am I?`;
  }

  return `Where ${location} meets ${cuisine || 'world'} flavors, which door holds the answer?`;
}

/**
 * Generate progressive hints based on difficulty
 */
function generateProgressiveHints(features, difficulty) {
  const { name, cuisine, location, landmark, keywords, address } = features;

  // Hint 1: Location/Area hint
  let hint1 = {
    text: landmark ?
      `Look in ${location}, ${landmark}.` :
      `Search in the ${location} area.`,
    penalty_points: calculatePenalty(1, difficulty),
    level: 1,
    reveals: 'location'
  };

  // Hint 2: Cuisine/Feature hint
  let hint2Text = keywords.length > 0 ?
    `They're famous for their ${keywords[0]}${cuisine ? ` - it's ${cuisine} cuisine` : ''}.` :
    `It's a ${cuisine || 'dining'} establishment.`;

  if (difficulty >= 4 && address) {
    hint2Text = `Look on ${address || location}.`;
  }

  let hint2 = {
    text: hint2Text,
    penalty_points: calculatePenalty(2, difficulty),
    level: 2,
    reveals: 'cuisine_or_specialty'
  };

  // Hint 3: Name hint (varies by difficulty)
  let hint3Text;
  if (difficulty >= 4) {
    // For hard difficulties, give partial name
    const nameLength = name.length;
    const firstLetter = name.charAt(0);
    hint3Text = `The name starts with "${firstLetter}" and has ${nameLength} letters.`;
  } else if (difficulty === 3) {
    // Medium - give first word
    const nameParts = name.split(' ');
    hint3Text = nameParts.length > 1 ?
      `The first word in the name is "${nameParts[0]}".` :
      `The name is ${name.length} letters long and starts with "${name.charAt(0)}".`;
  } else {
    // Easy - be very direct
    const nameParts = name.split(' ');
    hint3Text = nameParts.length > 1 ?
      `It's called "${nameParts[0]} ..."` :
      `The name is "${name}".`;
  }

  let hint3 = {
    text: hint3Text,
    penalty_points: calculatePenalty(3, difficulty),
    level: 3,
    reveals: 'name_hint'
  };

  return [hint1, hint2, hint3];
}

/**
 * Calculate penalty points based on hint level and difficulty
 */
function calculatePenalty(hintLevel, difficulty) {
  const basePenalty = [15, 30, 50]; // Base penalties for hints 1, 2, 3
  const difficultyMultiplier = 1 + (difficulty - 3) * 0.2; // Adjust based on difficulty

  return Math.round(basePenalty[hintLevel - 1] * difficultyMultiplier);
}

/**
 * Calculate estimated time based on difficulty and location
 */
function calculateEstimatedTime(difficulty, location) {
  const baseTime = 10; // minutes
  const difficultyModifier = (difficulty - 1) * 3; // Add 3 mins per difficulty level above 1

  return baseTime + difficultyModifier;
}

/**
 * Generate relevant tags
 */
function generateTags(cuisine, features) {
  const tags = ['discovery', 'food'];

  if (cuisine) {
    tags.push(cuisine.toLowerCase());
  }

  if (features.landmark) {
    tags.push('landmark');
  }

  return tags;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'ClueGeneratorAgent',
    version: '2.0.0',
    features: [
      'Context-aware clue generation',
      'Location-based hints',
      'Difficulty scaling (1-5)',
      'Progressive hint system',
      'Multi-cuisine support',
      'Riddles and wordplay'
    ]
  });
});

// ============================================
// GENERATE CLUE ENDPOINT
// ============================================
app.post('/generate-clue', async (req, res) => {
  try {
    const { shop_info, difficulty_level, theme, language } = req.body;

    if (!shop_info || !shop_info.name) {
      return res.status(400).json({
        error: 'Missing required field: shop_info.name',
        required: {
          shop_info: {
            name: 'string (required)',
            description: 'string (optional)',
            cuisine: 'string (optional)',
            location: 'string (optional)',
            address: 'string (optional)',
            landmark: 'string (optional)',
            unique_features: 'array (optional)'
          },
          difficulty_level: 'number 1-5 (optional, default: 3)',
          language: 'string (optional, default: en)'
        }
      });
    }

    // Validate difficulty level
    const difficulty = Math.min(Math.max(difficulty_level || 3, 1), 5);

    // Generate intelligent clue
    const result = generateIntelligentClue(shop_info, difficulty);

    res.json(result);

  } catch (error) {
    console.error('Error generating clue:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================
// BATCH GENERATE CLUES (for multiple shops)
// ============================================
app.post('/generate-clues-batch', async (req, res) => {
  try {
    const { shops, difficulty_level } = req.body;

    if (!shops || !Array.isArray(shops)) {
      return res.status(400).json({
        error: 'Missing required field: shops (array of shop_info objects)'
      });
    }

    const results = shops.map((shop, index) => {
      try {
        const clueData = generateIntelligentClue(shop, difficulty_level || 3);
        return {
          shop_id: shop.id || index,
          shop_name: shop.name,
          success: true,
          ...clueData
        };
      } catch (error) {
        return {
          shop_id: shop.id || index,
          shop_name: shop.name,
          success: false,
          error: error.message
        };
      }
    });

    res.json({
      total_shops: shops.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (error) {
    console.error('Error generating batch clues:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Clue Generator Agent v2.0 listening on port ${port}`);
  console.log(`📋 Features:`);
  console.log(`   - Context-aware clue generation`);
  console.log(`   - Difficulty-based hint scaling`);
  console.log(`   - Location and cuisine intelligence`);
  console.log(`   - Riddles and wordplay for hard modes`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /generate-clue - Generate single clue`);
  console.log(`   POST /generate-clues-batch - Generate multiple clues`);
});

module.exports = app;
