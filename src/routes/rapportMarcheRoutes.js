const express = require('express');
const router = express.Router();
const { getRapportMarche } = require('../controllers/rapportMarcheController');

router.get('/', getRapportMarche);

module.exports = router;