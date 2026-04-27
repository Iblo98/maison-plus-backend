const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  creerAlerte,
  getMesAlertes,
  supprimerAlerte,
  toggleAlerte
} = require('../controllers/alertesController');

router.post('/', proteger, creerAlerte);
router.get('/mes-alertes', proteger, getMesAlertes);
router.delete('/:id', proteger, supprimerAlerte);
router.put('/:id/toggle', proteger, toggleAlerte);

module.exports = router;