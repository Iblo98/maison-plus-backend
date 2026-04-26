const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getDisponibilites,
  ajouterDisponibilite,
  supprimerDisponibilite,
  verifierDisponibilite
} = require('../controllers/disponibilitesController');

router.get('/annonce/:annonce_id', getDisponibilites);
router.get('/verifier', verifierDisponibilite);
router.post('/', proteger, ajouterDisponibilite);
router.delete('/:id', proteger, supprimerDisponibilite);

module.exports = router;