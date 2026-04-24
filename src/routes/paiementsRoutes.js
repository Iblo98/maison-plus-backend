const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  initierPaiement,
  webhookCinetPay,
  webhookFlutterwave,
  verifierStatutPaiement,
  getHistoriquePaiements,
  getCommission,
  telechargerRecu,
  envoyerRecuEmail
} = require('../controllers/paiementsController');

// Télécharger reçu PDF
router.get('/recu/:reference', proteger, telechargerRecu);

// Envoyer reçu par email
router.post('/recu/:reference/email', proteger, envoyerRecuEmail);

// Calculer commission (public)
router.get('/commission', getCommission);

// Initier un paiement
router.post('/initier', proteger, initierPaiement);

// Vérifier statut
router.get('/statut/:reference', proteger, verifierStatutPaiement);

// Historique
router.get('/historique', proteger, getHistoriquePaiements);

// Webhooks (appelés par CinetPay et Flutterwave)
router.post('/cinetpay/webhook', webhookCinetPay);
router.post('/flutterwave/webhook', webhookFlutterwave);

module.exports = router;