const multer = require('multer');

// Stockage en mémoire (on envoie directement à Cloudinary)
const storage = multer.memoryStorage();

// Filtre — photos et vidéos uniquement
const filtrerFichiers = (req, file, cb) => {
  const typesAutorises = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/heic',
    'video/mp4', 'video/quicktime'
  ];

  if (typesAutorises.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non autorisé. Utilisez JPG, PNG, HEIC, MP4 ou MOV'), false);
  }
};

// Config upload photos (max 5 photos, 10MB chacune)
const uploadPhotos = multer({
  storage,
  fileFilter: filtrerFichiers,
  limits: { fileSize: 10 * 1024 * 1024 }
}).array('photos', 5);

// Config upload vidéos (max 4 vidéos, 100MB chacune)
const uploadVideos = multer({
  storage,
  fileFilter: filtrerFichiers,
  limits: { fileSize: 100 * 1024 * 1024 }
}).array('videos', 4);

module.exports = { uploadPhotos, uploadVideos };