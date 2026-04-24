const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');

// Upload document officiel
const uploadDocument = async (req, res) => {
  try {
    const { annonce_id, type_document, nom } = req.body;

    // Vérifier que l'annonce appartient à l'utilisateur
    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [annonce_id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisée'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        succes: false,
        message: 'Fichier obligatoire'
      });
    }

    // Upload vers Cloudinary
    const resultat = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `maisonplus/documents/${annonce_id}`,
          resource_type: 'raw',
          format: 'pdf'
        },
        (erreur, resultat) => {
          if (erreur) reject(erreur);
          else resolve(resultat);
        }
      );
      stream.end(req.file.buffer);
    });

    // Sauvegarder en base
    const document = await pool.query(
      `INSERT INTO documents_annonce
        (annonce_id, nom, type_document, url, taille)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [annonce_id, nom || req.file.originalname,
       type_document || 'autre', resultat.secure_url,
       req.file.size]
    );

    res.status(201).json({
      succes: true,
      message: 'Document uploadé avec succès !',
      document: document.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur upload document:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer les documents d'une annonce
const getDocuments = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    const documents = await pool.query(
      `SELECT * FROM documents_annonce
       WHERE annonce_id = $1
       ORDER BY created_at DESC`,
      [annonce_id]
    );

    res.json({
      succes: true,
      documents: documents.rows
    });

  } catch (erreur) {
    console.error('Erreur récupération documents:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer un document
const supprimerDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await pool.query(
      `SELECT d.* FROM documents_annonce d
       JOIN annonces a ON d.annonce_id = a.id
       WHERE d.id = $1 AND a.utilisateur_id = $2`,
      [id, req.utilisateur.id]
    );

    if (document.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Document introuvable ou non autorisé'
      });
    }

    await pool.query('DELETE FROM documents_annonce WHERE id = $1', [id]);

    res.json({ succes: true, message: 'Document supprimé' });

  } catch (erreur) {
    console.error('Erreur suppression document:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  supprimerDocument
};