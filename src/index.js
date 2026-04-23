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
const kycRoutes = require('./routes/kycRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/medias', mediasRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/profil', profilRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kyc', kycRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🏠 Bienvenue sur l\'API Maison+ !',
    version: '1.0.0',
    statut: 'En ligne'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Maison+ démarré sur le port ${PORT}`);
});