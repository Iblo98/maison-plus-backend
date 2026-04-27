const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  toggleFavori,
  getMesFavoris,
  verifierFavori
} = require('../controllers/favorisController');

router.post('/toggle', proteger, toggleFavori);
router.get('/mes-favoris', proteger, getMesFavoris);
router.get('/verifier/:annonce_id', proteger, verifierFavori);

module.exports = router;