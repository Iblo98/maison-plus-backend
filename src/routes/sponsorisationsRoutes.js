const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getPlans,
  initierSponsorisation,
  activerSponsorisation,
  getHistorique,
  activerManuel
} = require('../controllers/sponsorisationsController');

// Plans disponibles (public)
router.get('/plans', getPlans);

// Initier une sponsorisation
router.post('/initier', proteger, initierSponsorisation);

// Activer après paiement
router.post('/activer/:reference', proteger, activerSponsorisation);

// Historique
router.get('/historique', proteger, getHistorique);

// Activation manuelle (test)
router.post('/activer-manuel', proteger, activerManuel);

module.exports = router;