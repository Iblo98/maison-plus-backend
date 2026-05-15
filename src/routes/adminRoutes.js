const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getDashboard,
  getTousUtilisateurs,
  modererUtilisateur,
  supprimerUtilisateur,
  getToutesAnnonces,
  modererAnnonce,
  supprimerAnnonce,
  getAnnoncesEnAttente,
  getSignalements,
  traiterSignalement,
  getConversationsAnnonce,
  getTransactions,
  getStatsPays,
  getLitiges,
  resoudreLitige
} = require('../controllers/adminController');

const estAdmin = (req, res, next) => {
  if (req.utilisateur.type_compte !== 'admin') {
    return res.status(403).json({
      succes: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};

router.use(proteger, estAdmin);

router.get('/dashboard', getDashboard);
router.get('/utilisateurs', getTousUtilisateurs);
router.put('/utilisateurs/:id/moderer', modererUtilisateur);
router.delete('/utilisateurs/:id', supprimerUtilisateur);
router.get('/annonces', getToutesAnnonces);
router.get('/annonces/en-attente', getAnnoncesEnAttente);
router.put('/annonces/:id/moderer', modererAnnonce);
router.delete('/annonces/:id', supprimerAnnonce);
router.get('/signalements', getSignalements);
router.put('/signalements/:id', traiterSignalement);
router.get('/conversations/:annonce_id', getConversationsAnnonce);
router.get('/transactions', getTransactions);
router.get('/pays', getStatsPays);
router.get('/litiges', getLitiges);
router.put('/litiges/:id/resoudre', resoudreLitige);

module.exports = router;