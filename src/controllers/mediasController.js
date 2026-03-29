const cloudinary = require('../config/cloudinary');
const pool = require('../config/database');

// Vérifier la qualité d'une image
const verifierQualiteImage = (buffer) => {
  // Vérifier taille minimale (100KB minimum)
  if (buffer.length < 100 * 1024) {
    return { valide: false, message: 'Image trop petite - qualité insuffisante (minimum 100KB)' };
  }
  return { valide: true };
};

// Uploader les photos d'une annonce
const uploaderPhotos = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    // Vérifier que l'annonce appartient à l'utilisateur
    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [annonce_id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisé'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Aucune photo fournie'
      });
    }

    // Vérifier nombre minimum de photos
    const photosExistantes = await pool.query(
      "SELECT COUNT(*) FROM medias WHERE annonce_id = $1 AND type_media = 'photo'",
      [annonce_id]
    );
    const totalPhotos = parseInt(photosExistantes.rows[0].count) + req.files.length;

    if (totalPhotos < 2) {
      return res.status(400).json({
        succes: false,
        message: 'Minimum 2 photos requises par annonce'
      });
    }

    const photosUploadees = [];

    for (let i = 0; i < req.files.length; i++) {
      const fichier = req.files[i];

      // Vérifier la qualité
      const qualite = verifierQualiteImage(fichier.buffer);
      if (!qualite.valide) {
        return res.status(400).json({
          succes: false,
          message: `Photo ${i + 1} : ${qualite.message}`
        });
      }

      // Uploader sur Cloudinary
      const resultat = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `maisonplus/annonces/${annonce_id}`,
            resource_type: 'image',
            transformation: [
              { width: 1280, height: 960, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(fichier.buffer);
      });

      // Sauvegarder en base de données
      const estPrincipale = i === 0 && parseInt(photosExistantes.rows[0].count) === 0;

      const media = await pool.query(
        `INSERT INTO medias (annonce_id, type_media, url, public_id, est_principale, ordre)
         VALUES ($1, 'photo', $2, $3, $4, $5) RETURNING *`,
        [annonce_id, resultat.secure_url, resultat.public_id, estPrincipale, i]
      );

      photosUploadees.push(media.rows[0]);
    }

    res.status(201).json({
      succes: true,
      message: `${photosUploadees.length} photo(s) uploadée(s) avec succès !`,
      photos: photosUploadees
    });

  } catch (erreur) {
    console.error('Erreur upload photos:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de l\'upload des photos'
    });
  }
};

// Uploader les vidéos d'une annonce
const uploaderVideos = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [annonce_id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisé'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Aucune vidéo fournie'
      });
    }

    const videosUploadees = [];

    for (let i = 0; i < req.files.length; i++) {
      const fichier = req.files[i];

      const resultat = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `maisonplus/annonces/${annonce_id}/videos`,
            resource_type: 'video',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(fichier.buffer);
      });

      const media = await pool.query(
        `INSERT INTO medias (annonce_id, type_media, url, public_id, est_principale, ordre)
         VALUES ($1, 'video', $2, $3, false, $4) RETURNING *`,
        [annonce_id, resultat.secure_url, resultat.public_id, i]
      );

      videosUploadees.push(media.rows[0]);
    }

    res.status(201).json({
      succes: true,
      message: `${videosUploadees.length} vidéo(s) uploadée(s) avec succès !`,
      videos: videosUploadees
    });

  } catch (erreur) {
    console.error('Erreur upload vidéos:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de l\'upload des vidéos'
    });
  }
};

// Récupérer les médias d'une annonce
const getMedias = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    const medias = await pool.query(
      'SELECT * FROM medias WHERE annonce_id = $1 ORDER BY est_principale DESC, ordre ASC',
      [annonce_id]
    );

    res.json({
      succes: true,
      medias: medias.rows
    });

  } catch (erreur) {
    console.error('Erreur récupération médias:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Supprimer un média
const supprimerMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await pool.query(
      `SELECT m.* FROM medias m
       JOIN annonces a ON m.annonce_id = a.id
       WHERE m.id = $1 AND a.utilisateur_id = $2`,
      [id, req.utilisateur.id]
    );

    if (media.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Média introuvable ou non autorisé'
      });
    }

    // Supprimer de Cloudinary
    await cloudinary.uploader.destroy(media.rows[0].public_id, {
      resource_type: media.rows[0].type_media === 'video' ? 'video' : 'image'
    });

    // Supprimer de la base de données
    await pool.query('DELETE FROM medias WHERE id = $1', [id]);

    res.json({
      succes: true,
      message: 'Média supprimé avec succès'
    });

  } catch (erreur) {
    console.error('Erreur suppression média:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = { uploaderPhotos, uploaderVideos, getMedias, supprimerMedia };