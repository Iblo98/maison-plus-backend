const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/database');

const authRoutes = require('./routes/authRoutes');
const annoncesRoutes = require('./routes/annoncesRoutes');
const mediasRoutes = require('./routes/mediasRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const profilRoutes = require('./routes/profilRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/medias', mediasRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/profil', profilRoutes);
app.use('/api/admin', adminRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🏠 Bienvenue sur l\'API Maison+ !',
    version: '1.0.0',
    statut: 'En ligne',
    routes: {
      auth: [
        'POST /api/auth/inscription',
        'POST /api/auth/connexion'
      ],
      annonces: [
        'GET    /api/annonces',
        'GET    /api/annonces/:id',
        'POST   /api/annonces',
        'PUT    /api/annonces/:id',
        'DELETE /api/annonces/:id'
      ],
      medias: [
        'GET    /api/medias/:annonce_id',
        'POST   /api/medias/:annonce_id/photos',
        'POST   /api/medias/:annonce_id/videos',
        'DELETE /api/medias/:id'
      ],
      messages: [
        'POST /api/messages',
        'GET  /api/messages/mes-conversations',
        'GET  /api/messages/:annonce_id/:utilisateur_id'
      ],
      profil: [
        'GET /api/profil/moi',
        'PUT /api/profil/moi',
        'PUT /api/profil/moi/mot-de-passe',
        'GET /api/profil/moi/annonces',
        'GET /api/profil/public/:id'
      ],
      admin: [
        'GET /api/admin/dashboard',
        'GET /api/admin/annonces/en-attente',
        'PUT /api/admin/annonces/:id/moderer',
        'PUT /api/admin/utilisateurs/:id/moderer',
        'GET /api/admin/litiges',
        'PUT /api/admin/litiges/:id/resoudre'
      ]
    }
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Maison+ démarré sur le port ${PORT}`);
});