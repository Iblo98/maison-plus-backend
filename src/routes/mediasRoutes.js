const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const { uploadPhotos, uploadVideos } = require('../middlewares/uploadMiddleware');
const {
  uploaderPhotos,
  uploaderVideos,
  getMedias,
  supprimerMedia
} = require('../controllers/mediasController');

// Routes publiques
router.get('/:annonce_id', getMedias);

// Routes privées
router.post('/:annonce_id/photos', proteger, (req, res, next) => {
  uploadPhotos(req, res, (err) => {
    if (err) {
      return res.status(400).json({ succes: false, message: err.message });
    }
    next();
  });
}, uploaderPhotos);

router.post('/:annonce_id/videos', proteger, (req, res, next) => {
  uploadVideos(req, res, (err) => {
    if (err) {
      return res.status(400).json({ succes: false, message: err.message });
    }
    next();
  });
}, uploaderVideos);

router.delete('/:id', proteger, supprimerMedia);

module.exports = router;