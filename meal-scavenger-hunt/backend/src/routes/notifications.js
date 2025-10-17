const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'notifications routes - implementation pending', endpoint: 'GET /notifications' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'notifications routes - implementation pending', endpoint: 'POST /notifications' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'notifications routes - implementation pending', endpoint: 'GET /notifications/:id', id: req.params.id });
});

module.exports = router;
