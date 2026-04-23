const pool = require('../config/database');

// Créer une notification
const creerNotification = async (utilisateurId, type, titre, message, lien = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (utilisateur_id, type, titre, message, lien)
       VALUES ($1, $2, $3, $4, $5)`,
      [utilisateurId, type, titre, message, lien]
    );
  } catch (erreur) {
    console.error('Erreur création notification:', erreur);
  }
};

// Récupérer les notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await pool.query(
      `SELECT * FROM notifications 
       WHERE utilisateur_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.utilisateur.id]
    );

    const nonLues = await pool.query(
      `SELECT COUNT(*) FROM notifications 
       WHERE utilisateur_id = $1 AND est_lu = false`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      notifications: notifications.rows,
      non_lues: parseInt(nonLues.rows[0].count)
    });

  } catch (erreur) {
    console.error('Erreur notifications:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Marquer comme lu
const marquerLu = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'toutes') {
      await pool.query(
        'UPDATE notifications SET est_lu = true WHERE utilisateur_id = $1',
        [req.utilisateur.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET est_lu = true WHERE id = $1 AND utilisateur_id = $2',
        [id, req.utilisateur.id]
      );
    }

    res.json({ succes: true, message: 'Notifications marquées comme lues' });

  } catch (erreur) {
    console.error('Erreur marquer lu:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer une notification
const supprimerNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND utilisateur_id = $2',
      [id, req.utilisateur.id]
    );
    res.json({ succes: true, message: 'Notification supprimée' });
  } catch (erreur) {
    console.error('Erreur suppression notification:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  creerNotification,
  getNotifications,
  marquerLu,
  supprimerNotification
};