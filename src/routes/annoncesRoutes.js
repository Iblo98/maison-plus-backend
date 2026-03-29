const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  creerAnnonce,
  getAnnonces,
  getAnnonce,
  modifierAnnonce,
  supprimerAnnonce
} = require('../controllers/annoncesController');

// Routes publiques (sans connexion)
router.get('/', getAnnonces);
router.get('/:id', getAnnonce);

// Routes privées (connexion obligatoire)
router.post('/', proteger, creerAnnonce);
router.put('/:id', proteger, modifierAnnonce);
router.delete('/:id', proteger, supprimerAnnonce);

module.exports = router;