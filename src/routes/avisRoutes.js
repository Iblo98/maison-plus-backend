const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  creerAvis,
  getAvisUtilisateur,
  getAvisAnnonce,
  supprimerAvis
} = require('../controllers/avisController');

router.post('/', proteger, creerAvis);
router.get('/utilisateur/:id', getAvisUtilisateur);
router.get('/annonce/:id', getAvisAnnonce);
router.delete('/:id', proteger, supprimerAvis);

module.exports = router;