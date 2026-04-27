const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getPlans,
  getMonAbonnement,
  souscrire,
  annulerAbonnement
} = require('../controllers/abonnementsController');

router.get('/plans', getPlans);
router.get('/mon-abonnement', proteger, getMonAbonnement);
router.post('/souscrire', proteger, souscrire);
router.post('/annuler', proteger, annulerAbonnement);

module.exports = router;