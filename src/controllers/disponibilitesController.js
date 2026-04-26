const pool = require('../config/database');

// Récupérer les disponibilités d'une annonce
const getDisponibilites = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    const disponibilites = await pool.query(
      `SELECT * FROM disponibilites
       WHERE annonce_id = $1
       AND date_fin >= CURRENT_DATE
       ORDER BY date_debut ASC`,
      [annonce_id]
    );

    res.json({
      succes: true,
      disponibilites: disponibilites.rows
    });

  } catch (erreur) {
    console.error('Erreur disponibilités:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Ajouter une période indisponible
const ajouterDisponibilite = async (req, res) => {
  try {
    const { annonce_id, date_debut, date_fin, statut, motif } = req.body;

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

    if (new Date(date_debut) > new Date(date_fin)) {
      return res.status(400).json({
        succes: false,
        message: 'La date de début doit être avant la date de fin'
      });
    }

    const disponibilite = await pool.query(
      `INSERT INTO disponibilites
        (annonce_id, date_debut, date_fin, statut, motif)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [annonce_id, date_debut, date_fin,
       statut || 'indisponible', motif || '']
    );

    res.status(201).json({
      succes: true,
      message: 'Période ajoutée !',
      disponibilite: disponibilite.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur ajout disponibilité:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer une période
const supprimerDisponibilite = async (req, res) => {
  try {
    const { id } = req.params;

    const disponibilite = await pool.query(
      `SELECT d.* FROM disponibilites d
       JOIN annonces a ON d.annonce_id = a.id
       WHERE d.id = $1 AND a.utilisateur_id = $2`,
      [id, req.utilisateur.id]
    );

    if (disponibilite.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Période introuvable ou non autorisée'
      });
    }

    await pool.query('DELETE FROM disponibilites WHERE id = $1', [id]);

    res.json({ succes: true, message: 'Période supprimée' });

  } catch (erreur) {
    console.error('Erreur suppression disponibilité:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Vérifier si une date est disponible
const verifierDisponibilite = async (req, res) => {
  try {
    const { annonce_id, date_debut, date_fin } = req.query;

    const conflit = await pool.query(
      `SELECT * FROM disponibilites
       WHERE annonce_id = $1
       AND statut = 'indisponible'
       AND (
         (date_debut <= $2 AND date_fin >= $2) OR
         (date_debut <= $3 AND date_fin >= $3) OR
         (date_debut >= $2 AND date_fin <= $3)
       )`,
      [annonce_id, date_debut, date_fin]
    );

    res.json({
      succes: true,
      disponible: conflit.rows.length === 0,
      conflits: conflit.rows
    });

  } catch (erreur) {
    console.error('Erreur vérification:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getDisponibilites,
  ajouterDisponibilite,
  supprimerDisponibilite,
  verifierDisponibilite
};