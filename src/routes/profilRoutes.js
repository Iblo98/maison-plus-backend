const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getMonProfil,
  getProfilPublic,
  modifierProfil,
  changerMotDePasse,
  getMesAnnonces
} = require('../controllers/profilController');

// Routes publiques
router.get('/public/:id', getProfilPublic);

// Routes privées
router.get('/moi', proteger, getMonProfil);
router.put('/moi', proteger, modifierProfil);
router.put('/moi/mot-de-passe', proteger, changerMotDePasse);
router.get('/moi/annonces', proteger, getMesAnnonces);

module.exports = router;