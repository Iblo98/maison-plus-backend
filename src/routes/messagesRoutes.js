const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  envoyerMessage,
  getConversations,
  getMessages,
  exporterConversation
} = require('../controllers/messagesController');

router.post('/', proteger, envoyerMessage);
router.get('/mes-conversations', proteger, getConversations);
router.get('/exporter/:annonce_id/:destinataire_id', proteger, exporterConversation);
router.get('/:annonce_id/:utilisateur_id', proteger, getMessages);

module.exports = router;