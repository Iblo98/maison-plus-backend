const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getDashboard,
  modererAnnonce,
  getAnnoncesEnAttente,
  modererUtilisateur,
  getLitiges,
  resoudreLitige
} = require('../controllers/adminController');

// Middleware admin
const estAdmin = (req, res, next) => {
  if (req.utilisateur.type_compte !== 'admin') {
    return res.status(403).json({
      succes: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};

// Toutes les routes admin nécessitent connexion + rôle admin
router.use(proteger);
router.use(estAdmin);

router.get('/dashboard', getDashboard);
router.get('/annonces/en-attente', getAnnoncesEnAttente);
router.put('/annonces/:id/moderer', modererAnnonce);
router.put('/utilisateurs/:id/moderer', modererUtilisateur);
router.get('/litiges', getLitiges);
router.put('/litiges/:id/resoudre', resoudreLitige);

module.exports = router;