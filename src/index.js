const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
require('./config/database');

const authRoutes = require('./routes/authRoutes');
const annoncesRoutes = require('./routes/annoncesRoutes');
const mediasRoutes = require('./routes/mediasRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const profilRoutes = require('./routes/profilRoutes');
const adminRoutes = require('./routes/adminRoutes');
const kycRoutes = require('./routes/kycRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const paiementsRoutes = require('./routes/paiementsRoutes');
const deviseRoutes = require('./routes/deviseRoutes');
const avisRoutes = require('./routes/avisRoutes');
const sponsorisationsRoutes = require('./routes/sponsorisationsRoutes');
const { creerNotification } = require('./controllers/notificationsController');
const { nettoyerSporisationsExpirees } = require('./controllers/sponsorisationsController');
const documentsRoutes = require('./routes/documentsRoutes');
const disponibilitesRoutes = require('./routes/disponibilitesRoutes');
const favorisRoutes = require('./routes/favorisRoutes');
const alertesRoutes = require('./routes/alertesRoutes');
const app = express();
const serveur = http.createServer(app);

// ✅ CORS wildcard — autorise tout
app.use(cors());

// ✅ Body parsers AVANT les routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Socket.io
const io = new Server(serveur, {
  cors: { origin: '*' }
});

app.set('io', io);

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/medias', mediasRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/profil', profilRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/devise', deviseRoutes);
app.use('/api/avis', avisRoutes);
app.use('/api/sponsorisations', sponsorisationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/disponibilites', disponibilitesRoutes);
app.use('/api/favoris', favorisRoutes);
app.use('/api/alertes', alertesRoutes);
app.get('/', (req, res) => {
  res.json({ message: '🏠 Bienvenue sur l\'API Maison+ !', version: '1.0.0', statut: 'En ligne' });
});

// Socket.io events
const utilisateursConnectes = new Map();

io.on('connection', (socket) => {
  socket.on('rejoindre', (utilisateurId) => {
    socket.join(`user_${utilisateurId}`);
    utilisateursConnectes.set(utilisateurId, socket.id);
  });

  socket.on('rejoindre_conversation', ({ annonceId, userId1, userId2 }) => {
    const salle = `conv_${annonceId}_${[userId1, userId2].sort().join('_')}`;
    socket.join(salle);
  });

  socket.on('nouveau_message', async (message) => {
    const salle = `conv_${message.annonce_id}_${[message.expediteur_id, message.destinataire_id].sort().join('_')}`;
    io.to(salle).emit('message_recu', message);
    io.to(`user_${message.destinataire_id}`).emit('notification_message', message);

    await creerNotification(
      message.destinataire_id,
      'message',
      'Nouveau message',
      `${message.expediteur_prenom || 'Quelqu\'un'} vous a envoyé un message`,
      `/messages?annonce=${message.annonce_id}&destinataire=${message.expediteur_id}`
    );

    io.to(`user_${message.destinataire_id}`).emit('nouvelle_notification', {
      type: 'message',
      titre: 'Nouveau message',
      message: `${message.expediteur_prenom || 'Quelqu\'un'} vous a envoyé un message`
    });
  });

  socket.on('disconnect', () => {
    utilisateursConnectes.forEach((socketId, userId) => {
      if (socketId === socket.id) utilisateursConnectes.delete(userId);
    });
  });
});

// Nettoyage sponsorisations expirées
setInterval(nettoyerSporisationsExpirees, 3600000);
nettoyerSporisationsExpirees();

const PORT = process.env.PORT || 3000;
serveur.listen(PORT, () => {
  console.log(`🚀 Serveur Maison+ démarré sur le port ${PORT}`);
});