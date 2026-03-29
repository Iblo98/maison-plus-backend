const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  envoyerMessage,
  getConversation,
  getMesConversations
} = require('../controllers/messagesController');

// Toutes les routes nécessitent une connexion
router.post('/', proteger, envoyerMessage);
router.get('/mes-conversations', proteger, getMesConversations);
router.get('/:annonce_id/:utilisateur_id', proteger, getConversation);

module.exports = router;