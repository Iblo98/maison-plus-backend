const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  estAdmin,
  getDashboard,
  modererAnnonce,
  getAnnoncesEnAttente,
  modererUtilisateur,
  getLitiges,
  resoudreLitige
} = require('../controllers/adminController');

// Toutes les routes admin nécessitent connexion + rôle admin
router.use(proteger, estAdmin);

router.get('/dashboard', getDashboard);
router.get('/annonces/en-attente', getAnnoncesEnAttente);
router.put('/annonces/:id/moderer', modererAnnonce);
router.put('/utilisateurs/:id/moderer', modererUtilisateur);
router.get('/litiges', getLitiges);
router.put('/litiges/:id/resoudre', resoudreLitige);

module.exports = router;