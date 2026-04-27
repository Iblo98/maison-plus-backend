const express = require('express');
const router = express.Router();
const { getHistoriquePrix } = require('../controllers/historiquePrixController');

router.get('/:annonce_id', getHistoriquePrix);

module.exports = router;