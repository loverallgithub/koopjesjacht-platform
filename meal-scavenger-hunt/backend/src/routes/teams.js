const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'teams routes - implementation pending', endpoint: 'GET /teams' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'teams routes - implementation pending', endpoint: 'POST /teams' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'teams routes - implementation pending', endpoint: 'GET /teams/:id', id: req.params.id });
});

module.exports = router;
