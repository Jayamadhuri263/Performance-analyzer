const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', reportController.saveReport);
router.get('/:id', reportController.getReport);

module.exports = router;
