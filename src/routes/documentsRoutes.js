const express = require('express');
const router = express.Router();
const multer = require('multer');
const { proteger } = require('../middlewares/authMiddleware');
const {
  uploadDocument,
  getDocuments,
  supprimerDocument
} = require('../controllers/documentsController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const typesAutorises = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    if (typesAutorises.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF et images sont acceptés'));
    }
  }
});

router.post('/upload', proteger, upload.single('document'), uploadDocument);
router.get('/annonce/:annonce_id', getDocuments);
router.delete('/:id', proteger, supprimerDocument);

module.exports = router;