const express = require('express');
const analyzeController = require('../controllers/analyzeController');

const router = express.Router();

router.post('/', analyzeController.analyze);

module.exports = router;
