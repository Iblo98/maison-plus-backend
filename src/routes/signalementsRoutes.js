const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const { creerSignalement, getMesSignalements } = require('../controllers/signalementsController');

router.post('/', proteger, creerSignalement);
router.get('/mes-signalements', proteger, getMesSignalements);

module.exports = router;