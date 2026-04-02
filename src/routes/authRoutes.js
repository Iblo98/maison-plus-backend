const express = require('express');
const router = express.Router();
const {
  inscription,
  connexion,
  verifierEmail,
  motDePasseOublie,
  reinitialiserMotDePasse
} = require('../controllers/authController');

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/verifier-email', verifierEmail);
router.post('/mot-de-passe-oublie', motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', reinitialiserMotDePasse);

module.exports = router;