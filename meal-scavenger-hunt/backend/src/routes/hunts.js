const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'hunts routes - implementation pending', endpoint: 'GET /hunts' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'hunts routes - implementation pending', endpoint: 'POST /hunts' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'hunts routes - implementation pending', endpoint: 'GET /hunts/:id', id: req.params.id });
});

module.exports = router;
