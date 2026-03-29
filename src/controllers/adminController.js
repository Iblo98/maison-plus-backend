const pool = require('../config/database');

// Middleware admin
const estAdmin = async (req, res, next) => {
  if (req.utilisateur.type_compte !== 'admin') {
    return res.status(403).json({
      succes: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};

// Tableau de bord admin
const getDashboard = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM utilisateurs) as total_utilisateurs,
        (SELECT COUNT(*) FROM utilisateurs WHERE statut = 'en_attente') as utilisateurs_en_attente,
        (SELECT COUNT(*) FROM annonces) as total_annonces,
        (SELECT COUNT(*) FROM annonces WHERE statut = 'en_attente') as annonces_en_attente,
        (SELECT COUNT(*) FROM annonces WHERE statut = 'publiee') as annonces_publiees,
        (SELECT COUNT(*) FROM messages WHERE est_suspect = true) as messages_suspects,
        (SELECT COUNT(*) FROM litiges WHERE statut = 'ouvert') as litiges_ouverts,
        (SELECT COUNT(*) FROM paiements WHERE statut = 'complete') as paiements_completes
    `);

    res.json({
      succes: true,
      dashboard: stats.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur dashboard:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Valider ou rejeter une annonce
const modererAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, motif } = req.body;

    const actionsValides = ['publier', 'rejeter', 'suspendre'];
    if (!actionsValides.includes(action)) {
      return res.status(400).json({
        succes: false,
        message: 'Action invalide. Utilisez: publier, rejeter ou suspendre'
      });
    }

    const statutMap = {
      'publier': 'publiee',
      'rejeter': 'rejetee',
      'suspendre': 'suspendue'
    };

    const annonce = await pool.query(
      `UPDATE annonces SET statut = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [statutMap[action], id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Annonce introuvable'
      });
    }

    res.json({
      succes: true,
      message: `Annonce ${action}ée avec succès !`,
      annonce: annonce.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur modération annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Lister les annonces en attente
const getAnnoncesEnAttente = async (req, res) => {
  try {
    const annonces = await pool.query(
      `SELECT a.*, u.nom, u.prenom, u.email, u.est_verifie,
        (SELECT url FROM medias WHERE annonce_id = a.id 
         AND est_principale = true LIMIT 1) as photo_principale
       FROM annonces a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE a.statut = 'en_attente'
       ORDER BY a.created_at ASC`
    );

    res.json({
      succes: true,
      total: annonces.rows.length,
      annonces: annonces.rows
    });

  } catch (erreur) {
    console.error('Erreur annonces en attente:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Gérer les utilisateurs
const modererUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const actionsValides = ['verifier', 'suspendre', 'bannir', 'activer'];
    if (!actionsValides.includes(action)) {
      return res.status(400).json({
        succes: false,
        message: 'Action invalide'
      });
    }

    const statutMap = {
      'verifier': 'verifie',
      'suspendre': 'suspendu',
      'bannir': 'banni',
      'activer': 'actif'
    };

    const estVerifie = action === 'verifier' ? true : undefined;

    let query = `UPDATE utilisateurs SET statut = $1, updated_at = NOW()`;
    const params = [statutMap[action]];

    if (estVerifie !== undefined) {
      query += `, est_verifie = $2 WHERE id = $3 RETURNING id, nom, prenom, email, statut, est_verifie`;
      params.push(estVerifie, id);
    } else {
      query += ` WHERE id = $2 RETURNING id, nom, prenom, email, statut, est_verifie`;
      params.push(id);
    }

    const utilisateur = await pool.query(query, params);

    if (utilisateur.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable'
      });
    }

    res.json({
      succes: true,
      message: `Utilisateur ${action}é avec succès !`,
      utilisateur: utilisateur.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur modération utilisateur:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Gérer les litiges
const getLitiges = async (req, res) => {
  try {
    const litiges = await pool.query(
      `SELECT l.*,
        p.nom as plaignant_nom, p.prenom as plaignant_prenom,
        a.nom as accuse_nom, a.prenom as accuse_prenom,
        pay.montant, pay.devise
       FROM litiges l
       JOIN utilisateurs p ON l.plaignant_id = p.id
       JOIN utilisateurs a ON l.accuse_id = a.id
       LEFT JOIN paiements pay ON l.paiement_id = pay.id
       WHERE l.statut = 'ouvert'
       ORDER BY l.created_at ASC`
    );

    res.json({
      succes: true,
      total: litiges.rows.length,
      litiges: litiges.rows
    });

  } catch (erreur) {
    console.error('Erreur litiges:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Résoudre un litige
const resoudreLitige = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, statut } = req.body;

    const litige = await pool.query(
      `UPDATE litiges SET
        decision = $1,
        statut = $2,
        admin_id = $3,
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [decision, statut, req.utilisateur.id, id]
    );

    if (litige.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Litige introuvable'
      });
    }

    res.json({
      succes: true,
      message: 'Litige résolu !',
      litige: litige.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur résolution litige:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  estAdmin,
  getDashboard,
  modererAnnonce,
  getAnnoncesEnAttente,
  modererUtilisateur,
  getLitiges,
  resoudreLitige
};