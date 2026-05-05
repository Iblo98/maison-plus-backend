const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  creerReservation,
  getMesReservations,
  getReservationsRecues,
  mettreAJourStatut
} = require('../controllers/reservationsController');

router.post('/', proteger, creerReservation);
router.get('/mes-reservations', proteger, getMesReservations);
router.get('/recues', proteger, getReservationsRecues);
router.put('/:id/statut', proteger, mettreAJourStatut);

module.exports = router;