const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'users routes - implementation pending', endpoint: 'GET /users' });
});

router.post('/', (req, res) => {
  res.status(501).json({ message: 'users routes - implementation pending', endpoint: 'POST /users' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'users routes - implementation pending', endpoint: 'GET /users/:id', id: req.params.id });
});

module.exports = router;
