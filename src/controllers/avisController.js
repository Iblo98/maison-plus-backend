const pool = require('../config/database');

// Créer un avis
const creerAvis = async (req, res) => {
  try {
    const { annonce_id, destinataire_id, note, commentaire } = req.body;
    const auteur_id = req.utilisateur.id;

    if (!note || note < 1 || note > 5) {
      return res.status(400).json({
        succes: false,
        message: 'La note doit être entre 1 et 5'
      });
    }

    if (!commentaire || commentaire.trim().length < 10) {
      return res.status(400).json({
        succes: false,
        message: 'Le commentaire doit contenir au moins 10 caractères'
      });
    }

    // Vérifier qu'on ne se note pas soi-même
    if (auteur_id === destinataire_id) {
      return res.status(400).json({
        succes: false,
        message: 'Vous ne pouvez pas vous noter vous-même'
      });
    }

    // Vérifier si avis déjà donné
    const avisExistant = await pool.query(
      'SELECT id FROM avis WHERE annonce_id = $1 AND auteur_id = $2',
      [annonce_id, auteur_id]
    );

    if (avisExistant.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Vous avez déjà laissé un avis pour cette annonce'
      });
    }

    const nouvelAvis = await pool.query(
      `INSERT INTO avis (annonce_id, auteur_id, destinataire_id, note, commentaire)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [annonce_id, auteur_id, destinataire_id, note, commentaire.trim()]
    );

    res.status(201).json({
      succes: true,
      message: 'Avis publié avec succès !',
      avis: nouvelAvis.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur création avis:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer les avis d'un utilisateur
const getAvisUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;

    const avis = await pool.query(
      `SELECT a.*, 
        u.nom as auteur_nom, u.prenom as auteur_prenom,
        u.photo_profil_url as auteur_photo,
        an.titre as annonce_titre
       FROM avis a
       JOIN utilisateurs u ON a.auteur_id = u.id
       JOIN annonces an ON a.annonce_id = an.id
       WHERE a.destinataire_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );

    // Calculer la moyenne
    const moyenne = await pool.query(
      `SELECT 
        ROUND(AVG(note)::numeric, 1) as moyenne,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE note = 5) as cinq,
        COUNT(*) FILTER (WHERE note = 4) as quatre,
        COUNT(*) FILTER (WHERE note = 3) as trois,
        COUNT(*) FILTER (WHERE note = 2) as deux,
        COUNT(*) FILTER (WHERE note = 1) as un
       FROM avis WHERE destinataire_id = $1`,
      [id]
    );

    res.json({
      succes: true,
      avis: avis.rows,
      statistiques: moyenne.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur récupération avis:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer les avis d'une annonce
const getAvisAnnonce = async (req, res) => {
  try {
    const { id } = req.params;

    const avis = await pool.query(
      `SELECT a.*,
        u.nom as auteur_nom, u.prenom as auteur_prenom,
        u.photo_profil_url as auteur_photo
       FROM avis a
       JOIN utilisateurs u ON a.auteur_id = u.id
       WHERE a.annonce_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );

    res.json({
      succes: true,
      total: avis.rows.length,
      avis: avis.rows
    });

  } catch (erreur) {
    console.error('Erreur avis annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer son avis
const supprimerAvis = async (req, res) => {
  try {
    const { id } = req.params;

    const avis = await pool.query(
      'SELECT * FROM avis WHERE id = $1 AND auteur_id = $2',
      [id, req.utilisateur.id]
    );

    if (avis.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Avis introuvable ou non autorisé'
      });
    }

    await pool.query('DELETE FROM avis WHERE id = $1', [id]);

    res.json({ succes: true, message: 'Avis supprimé' });

  } catch (erreur) {
    console.error('Erreur suppression avis:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  creerAvis,
  getAvisUtilisateur,
  getAvisAnnonce,
  supprimerAvis
};