const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'shops routes - implementation pending', endpoint: 'GET /shops' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'shops routes - implementation pending', endpoint: 'POST /shops' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'shops routes - implementation pending', endpoint: 'GET /shops/:id', id: req.params.id });
});

module.exports = router;
