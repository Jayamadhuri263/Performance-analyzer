const express = require('express');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.get('/', historyController.getHistory);

module.exports = router;
