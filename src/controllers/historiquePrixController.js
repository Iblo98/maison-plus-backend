const pool = require('../config/database');

// Récupérer l'historique des prix d'une annonce
const getHistoriquePrix = async (req, res) => {
  try {
    const { annonce_id } = req.params;

    // Prix actuel
    const annonce = await pool.query(
      'SELECT prix, created_at FROM annonces WHERE id = $1',
      [annonce_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Annonce introuvable' });
    }

    // Historique des changements
    const historique = await pool.query(
      `SELECT * FROM historique_prix
       WHERE annonce_id = $1
       ORDER BY created_at ASC`,
      [annonce_id]
    );

    res.json({
      succes: true,
      prix_actuel: annonce.rows[0].prix,
      historique: historique.rows
    });

  } catch (erreur) {
    console.error('Erreur historique prix:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Enregistrer un changement de prix (appelé automatiquement)
const enregistrerChangementPrix = async (annonce_id, ancien_prix, nouveau_prix) => {
  try {
    if (parseFloat(ancien_prix) === parseFloat(nouveau_prix)) return;

    await pool.query(
      `INSERT INTO historique_prix (annonce_id, ancien_prix, nouveau_prix)
       VALUES ($1, $2, $3)`,
      [annonce_id, ancien_prix, nouveau_prix]
    );
  } catch (erreur) {
    console.error('Erreur enregistrement historique prix:', erreur);
  }
};

module.exports = { getHistoriquePrix, enregistrerChangementPrix };