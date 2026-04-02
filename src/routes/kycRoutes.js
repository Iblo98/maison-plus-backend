const express = require('express');
const router = express.Router();
const multer = require('multer');
const { proteger } = require('../middlewares/authMiddleware');
const {
  uploadPhotoProfil,
  uploadCNIB,
  enregistrerPaiement,
  getStatutKYC
} = require('../controllers/kycController');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const typesAutorises = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (typesAutorises.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non autorisé. Utilisez JPG, PNG ou HEIC'));
    }
  }
});

// Statut KYC
router.get('/statut', proteger, getStatutKYC);

// Upload photo de profil
router.post('/photo-profil', proteger, upload.single('photo'), uploadPhotoProfil);

// Upload CNIB recto/verso
router.post('/cnib', proteger, upload.fields([
  { name: 'recto', maxCount: 1 },
  { name: 'verso', maxCount: 1 }
]), uploadCNIB);

// Enregistrer paiement Mobile Money
router.post('/paiement', proteger, enregistrerPaiement);

module.exports = router;