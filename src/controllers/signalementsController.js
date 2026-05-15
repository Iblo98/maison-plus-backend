const pool = require('../config/database');
const { creerNotification } = require('./notificationsController');

const raisonsValides = [
  'annonce_frauduleuse',
  'prix_incorrect',
  'photos_incorrectes',
  'bien_inexistant',
  'arnaque',
  'contenu_inapproprie',
  'autre'
];

// Créer un signalement
const creerSignalement = async (req, res) => {
  try {
    const { annonce_id, raison, description } = req.body;
    const auteur_id = req.utilisateur.id;

    if (!raisonsValides.includes(raison)) {
      return res.status(400).json({ succes: false, message: 'Raison invalide' });
    }

    // Vérifier si déjà signalé
    const dejaSignale = await pool.query(
      'SELECT id FROM signalements WHERE annonce_id = $1 AND auteur_id = $2',
      [annonce_id, auteur_id]
    );

    if (dejaSignale.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Vous avez déjà signalé cette annonce'
      });
    }

    // Vérifier que ce n'est pas sa propre annonce
    const annonce = await pool.query(
      'SELECT utilisateur_id, titre FROM annonces WHERE id = $1',
      [annonce_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Annonce introuvable' });
    }

    if (annonce.rows[0].utilisateur_id === auteur_id) {
      return res.status(400).json({
        succes: false,
        message: 'Vous ne pouvez pas signaler votre propre annonce'
      });
    }

    const signalement = await pool.query(
      `INSERT INTO signalements (annonce_id, auteur_id, raison, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [annonce_id, auteur_id, raison, description || '']
    );

    // Notifier les admins
    const admins = await pool.query(
      "SELECT id FROM utilisateurs WHERE type_compte = 'admin'"
    );

    admins.rows.forEach(admin => {
      creerNotification(
        admin.id,
        'signalement',
        '🚨 Nouvelle annonce signalée',
        `L'annonce "${annonce.rows[0].titre}" a été signalée : ${raison.replace(/_/g, ' ')}`,
        `/admin/signalements`
      ).catch(console.error);
    });

    res.status(201).json({
      succes: true,
      message: 'Signalement envoyé ! Notre équipe va examiner cette annonce.',
      signalement: signalement.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur signalement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Mes signalements
const getMesSignalements = async (req, res) => {
  try {
    const signalements = await pool.query(
      `SELECT s.*, a.titre as annonce_titre
       FROM signalements s
       JOIN annonces a ON s.annonce_id = a.id
       WHERE s.auteur_id = $1
       ORDER BY s.created_at DESC`,
      [req.utilisateur.id]
    );
    res.json({ succes: true, signalements: signalements.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { creerSignalement, getMesSignalements };