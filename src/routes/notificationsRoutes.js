const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getNotifications,
  marquerLu,
  supprimerNotification
} = require('../controllers/notificationsController');

router.get('/', proteger, getNotifications);
router.put('/:id/lu', proteger, marquerLu);
router.delete('/:id', proteger, supprimerNotification);

module.exports = router;