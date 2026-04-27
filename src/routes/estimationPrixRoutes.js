const express = require('express');
const router = express.Router();
const { estimerPrix } = require('../controllers/estimationPrixController');

router.post('/', estimerPrix);

module.exports = router;