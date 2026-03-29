const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/database');

const authRoutes = require('./routes/authRoutes');
const annoncesRoutes = require('./routes/annoncesRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annoncesRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🏠 Bienvenue sur l\'API Maison+ !',
    version: '1.0.0',
    statut: 'En ligne',
    routes: [
      'POST /api/auth/inscription',
      'POST /api/auth/connexion',
      'GET  /api/annonces',
      'GET  /api/annonces/:id',
      'POST /api/annonces',
      'PUT  /api/annonces/:id',
      'DELETE /api/annonces/:id'
    ]
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Maison+ démarré sur le port ${PORT}`);
});