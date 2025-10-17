const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'qr routes - implementation pending', endpoint: 'GET /qr' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'qr routes - implementation pending', endpoint: 'POST /qr' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'qr routes - implementation pending', endpoint: 'GET /qr/:id', id: req.params.id });
});

module.exports = router;
