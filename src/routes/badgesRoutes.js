const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const { getBadges, getMesBadges } = require('../controllers/badgesController');

router.get('/mes-badges', proteger, getMesBadges);
router.get('/:utilisateur_id', getBadges);

module.exports = router;