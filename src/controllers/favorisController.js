const pool = require('../config/database');

// Ajouter ou retirer un favori (toggle)
const toggleFavori = async (req, res) => {
  try {
    const { annonce_id } = req.body;
    const utilisateur_id = req.utilisateur.id;

    // Vérifier si déjà en favori
    const existe = await pool.query(
      'SELECT id FROM favoris WHERE utilisateur_id = $1 AND annonce_id = $2',
      [utilisateur_id, annonce_id]
    );

    if (existe.rows.length > 0) {
      // Retirer des favoris
      await pool.query(
        'DELETE FROM favoris WHERE utilisateur_id = $1 AND annonce_id = $2',
        [utilisateur_id, annonce_id]
      );
      res.json({ succes: true, favori: false, message: 'Retiré des favoris' });
    } else {
      // Ajouter aux favoris
      await pool.query(
        'INSERT INTO favoris (utilisateur_id, annonce_id) VALUES ($1, $2)',
        [utilisateur_id, annonce_id]
      );
      res.json({ succes: true, favori: true, message: 'Ajouté aux favoris !' });
    }
  } catch (erreur) {
    console.error('Erreur toggle favori:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer tous les favoris de l'utilisateur
const getMesFavoris = async (req, res) => {
  try {
    const utilisateur_id = req.utilisateur.id;

    const favoris = await pool.query(
      `SELECT a.*, f.created_at as favori_date,
        u.nom, u.prenom, u.photo_profil_url as photo_profil
       FROM favoris f
       JOIN annonces a ON f.annonce_id = a.id
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE f.utilisateur_id = $1
       AND a.statut = 'publiee'
       ORDER BY f.created_at DESC`,
      [utilisateur_id]
    );

    res.json({
      succes: true,
      total: favoris.rows.length,
      favoris: favoris.rows
    });
  } catch (erreur) {
    console.error('Erreur mes favoris:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Vérifier si une annonce est en favori
const verifierFavori = async (req, res) => {
  try {
    const { annonce_id } = req.params;
    const utilisateur_id = req.utilisateur.id;

    const favori = await pool.query(
      'SELECT id FROM favoris WHERE utilisateur_id = $1 AND annonce_id = $2',
      [utilisateur_id, annonce_id]
    );

    res.json({
      succes: true,
      favori: favori.rows.length > 0
    });
  } catch (erreur) {
    console.error('Erreur vérification favori:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  toggleFavori,
  getMesFavoris,
  verifierFavori
};