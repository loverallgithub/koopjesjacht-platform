const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'payments routes - implementation pending', endpoint: 'GET /payments' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'payments routes - implementation pending', endpoint: 'POST /payments' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'payments routes - implementation pending', endpoint: 'GET /payments/:id', id: req.params.id });
});

module.exports = router;
