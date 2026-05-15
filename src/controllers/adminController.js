const pool = require('../config/database');

// Dashboard admin
const getDashboard = async (req, res) => {
  try {
    const [
      utilisateurs, annonces, reservations, signalements,
      revenus, nouveaux, avis
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM utilisateurs'),
      pool.query('SELECT COUNT(*) FROM annonces'),
      pool.query("SELECT COUNT(*) FROM reservations WHERE statut IN ('payee','confirmee')"),
      pool.query("SELECT COUNT(*) FROM signalements WHERE statut = 'en_attente'"),
      pool.query("SELECT COALESCE(SUM(prix_total * 0.05), 0) as total FROM reservations WHERE statut IN ('payee','confirmee')"),
      pool.query("SELECT COUNT(*) FROM utilisateurs WHERE created_at >= NOW() - INTERVAL '30 days'"),
      pool.query('SELECT COUNT(*) FROM avis'),
    ]);

    const statsMensuels = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as mois,
        COUNT(*) as nb_transactions,
        COALESCE(SUM(prix_total * 0.05), 0) as revenus
      FROM reservations
      WHERE statut IN ('payee','confirmee')
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    const statsHebdo = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('week', created_at), 'DD Mon') as semaine,
        COUNT(*) as nb_transactions,
        COALESCE(SUM(prix_total * 0.05), 0) as revenus
      FROM reservations
      WHERE statut IN ('payee','confirmee')
      AND created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY DATE_TRUNC('week', created_at)
    `);

    const parCategorie = await pool.query(`
      SELECT categorie, COUNT(*) as nb
      FROM annonces GROUP BY categorie ORDER BY nb DESC
    `);

    const parPays = await pool.query(`
      SELECT COALESCE(pays, 'BF') as pays, COUNT(*) as nb
      FROM utilisateurs GROUP BY COALESCE(pays, 'BF') ORDER BY nb DESC
    `);

    const meilleurMois = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Month YYYY') as mois,
        COALESCE(SUM(prix_total * 0.05), 0) as revenus
      FROM reservations WHERE statut IN ('payee','confirmee')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY revenus DESC LIMIT 1
    `);

    const derniersUtilisateurs = await pool.query(`
      SELECT id, nom, prenom, email, type_compte, statut, created_at
      FROM utilisateurs ORDER BY created_at DESC LIMIT 5
    `);

    const dernieresAnnonces = await pool.query(`
      SELECT a.id, a.titre, a.categorie, a.statut, a.created_at,
        u.nom, u.prenom,
        (SELECT url FROM medias WHERE annonce_id = a.id AND est_principale = true LIMIT 1) as photo
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      ORDER BY a.created_at DESC LIMIT 5
    `);

    res.json({
      succes: true,
      stats: {
        utilisateurs: parseInt(utilisateurs.rows[0].count),
        annonces: parseInt(annonces.rows[0].count),
        transactions: parseInt(reservations.rows[0].count),
        signalements_urgents: parseInt(signalements.rows[0].count),
        revenus_total: parseFloat(revenus.rows[0].total),
        nouveaux_30j: parseInt(nouveaux.rows[0].count),
        avis: parseInt(avis.rows[0].count),
        meilleur_mois: meilleurMois.rows[0] || null,
      },
      graphiques: {
        mensuel: statsMensuels.rows,
        hebdo: statsHebdo.rows,
        par_categorie: parCategorie.rows,
        par_pays: parPays.rows,
      },
      derniers_utilisateurs: derniersUtilisateurs.rows,
      dernieres_annonces: dernieresAnnonces.rows,
    });
  } catch (erreur) {
    console.error('Erreur dashboard admin:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Tous les utilisateurs
const getTousUtilisateurs = async (req, res) => {
  try {
    const { recherche = '', type_compte = '', statut = '' } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (recherche) {
      params.push(`%${recherche}%`);
      where += ` AND (nom ILIKE $${i} OR prenom ILIKE $${i} OR email ILIKE $${i} OR telephone ILIKE $${i})`;
      i++;
    }
    if (type_compte) { params.push(type_compte); where += ` AND type_compte = $${i++}`; }
    if (statut) { params.push(statut); where += ` AND statut = $${i++}`; }

    const utilisateurs = await pool.query(
      `SELECT id, nom, prenom, email, telephone, type_compte, statut,
        pays, est_verifie, badge_pro, photo_profil_url,
        nom_entreprise, rccm, ifu, created_at,
        (SELECT COUNT(*) FROM annonces WHERE utilisateur_id = utilisateurs.id) as nb_annonces,
        (SELECT COUNT(*) FROM reservations WHERE locataire_id = utilisateurs.id) as nb_reservations
       FROM utilisateurs ${where} ORDER BY created_at DESC`,
      params
    );

    res.json({ succes: true, total: utilisateurs.rows.length, utilisateurs: utilisateurs.rows });
  } catch (erreur) {
    console.error('Erreur liste utilisateurs:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Modérer un utilisateur
const modererUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, duree_jours } = req.body;

    const statutsValides = ['actif', 'suspendu', 'banni'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ succes: false, message: 'Statut invalide' });
    }

    const utilisateur = await pool.query('SELECT type_compte FROM utilisateurs WHERE id = $1', [id]);
    if (utilisateur.rows[0]?.type_compte === 'admin') {
      return res.status(403).json({ succes: false, message: 'Impossible de modifier un admin' });
    }

    await pool.query('UPDATE utilisateurs SET statut = $1, updated_at = NOW() WHERE id = $2', [statut, id]);

    const messages = {
      actif: 'Compte réactivé',
      suspendu: `Compte suspendu${duree_jours ? ` pour ${duree_jours} jours` : ''}`,
      banni: 'Compte banni définitivement'
    };

    res.json({ succes: true, message: messages[statut] });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer utilisateur
const supprimerUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await pool.query('SELECT type_compte FROM utilisateurs WHERE id = $1', [id]);
    if (utilisateur.rows[0]?.type_compte === 'admin') {
      return res.status(403).json({ succes: false, message: 'Impossible de supprimer un admin' });
    }
    await pool.query('DELETE FROM utilisateurs WHERE id = $1', [id]);
    res.json({ succes: true, message: 'Utilisateur supprimé' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Toutes les annonces
const getToutesAnnonces = async (req, res) => {
  try {
    const { recherche = '', statut = '', categorie = '' } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (recherche) {
      params.push(`%${recherche}%`);
      where += ` AND (a.titre ILIKE $${i} OR a.ville ILIKE $${i})`;
      i++;
    }
    if (statut) { params.push(statut); where += ` AND a.statut = $${i++}`; }
    if (categorie) { params.push(categorie); where += ` AND a.categorie = $${i++}`; }

    const annonces = await pool.query(
      `SELECT a.*, u.nom, u.prenom, u.email,
        (SELECT url FROM medias WHERE annonce_id = a.id AND est_principale = true LIMIT 1) as photo
       FROM annonces a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       ${where} ORDER BY a.created_at DESC`,
      params
    );

    res.json({ succes: true, total: annonces.rows.length, annonces: annonces.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Modérer annonce
const modererAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    await pool.query('UPDATE annonces SET statut = $1, updated_at = NOW() WHERE id = $2', [statut, id]);
    res.json({ succes: true, message: `Annonce ${statut}` });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer annonce
const supprimerAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM annonces WHERE id = $1', [id]);
    res.json({ succes: true, message: 'Annonce supprimée' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Annonces en attente
const getAnnoncesEnAttente = async (req, res) => {
  try {
    const annonces = await pool.query(`
      SELECT a.*, u.nom, u.prenom, u.email,
        (SELECT url FROM medias WHERE annonce_id = a.id AND est_principale = true LIMIT 1) as photo
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      WHERE a.statut = 'en_attente' ORDER BY a.created_at ASC
    `);
    res.json({ succes: true, total: annonces.rows.length, annonces: annonces.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Signalements
const getSignalements = async (req, res) => {
  try {
    const signalements = await pool.query(`
      SELECT s.*,
        a.titre as annonce_titre, a.id as annonce_id,
        u.nom as auteur_nom, u.prenom as auteur_prenom, u.email as auteur_email,
        p.nom as proprio_nom, p.prenom as proprio_prenom, p.email as proprio_email
      FROM signalements s
      JOIN annonces a ON s.annonce_id = a.id
      JOIN utilisateurs u ON s.auteur_id = u.id
      JOIN utilisateurs p ON a.utilisateur_id = p.id
      ORDER BY CASE WHEN s.statut = 'en_attente' THEN 0 ELSE 1 END, s.created_at DESC
    `);
    res.json({ succes: true, signalements: signalements.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Traiter signalement
const traiterSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, action_annonce } = req.body;

    await pool.query('UPDATE signalements SET statut = $1 WHERE id = $2', [statut, id]);

    if (action_annonce) {
      const s = await pool.query('SELECT annonce_id FROM signalements WHERE id = $1', [id]);
      if (s.rows.length > 0) {
        await pool.query('UPDATE annonces SET statut = $1 WHERE id = $2', [action_annonce, s.rows[0].annonce_id]);
      }
    }

    res.json({ succes: true, message: 'Signalement traité' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Conversations annonce signalée
const getConversationsAnnonce = async (req, res) => {
  try {
    const { annonce_id } = req.params;
    const messages = await pool.query(`
      SELECT m.*, u.nom as expediteur_nom, u.prenom as expediteur_prenom
      FROM messages m
      JOIN utilisateurs u ON m.expediteur_id = u.id
      WHERE m.annonce_id = $1 ORDER BY m.created_at ASC
    `, [annonce_id]);
    res.json({ succes: true, messages: messages.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Transactions
const getTransactions = async (req, res) => {
  try {
    const { periode = 'mois' } = req.query;

    let interval, trunc, format;
    if (periode === 'semaine') { interval = '12 weeks'; trunc = 'week'; format = 'DD Mon'; }
    else if (periode === 'annee') { interval = '3 years'; trunc = 'year'; format = 'YYYY'; }
    else { interval = '12 months'; trunc = 'month'; format = 'Mon YYYY'; }

    const stats = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('${trunc}', created_at), '${format}') as periode,
        COUNT(*) as nb_transactions,
        COALESCE(SUM(prix_total), 0) as volume,
        COALESCE(SUM(prix_total * 0.05), 0) as revenus
      FROM reservations
      WHERE statut IN ('payee','confirmee')
      AND created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('${trunc}', created_at)
      ORDER BY DATE_TRUNC('${trunc}', created_at)
    `);

    const totaux = await pool.query(`
      SELECT 
        COUNT(*) as nb_total,
        COALESCE(SUM(prix_total), 0) as volume_total,
        COALESCE(SUM(prix_total * 0.05), 0) as revenus_total
      FROM reservations WHERE statut IN ('payee','confirmee')
    `);

    res.json({ succes: true, stats: stats.rows, totaux: totaux.rows[0] });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Stats pays
const getStatsPays = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COALESCE(pays, 'BF') as pays,
        COUNT(*) as nb_utilisateurs,
        COUNT(*) FILTER (WHERE type_compte = 'professionnel') as nb_pros
      FROM utilisateurs
      GROUP BY COALESCE(pays, 'BF')
      ORDER BY nb_utilisateurs DESC
    `);
    res.json({ succes: true, pays: stats.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Litiges
const getLitiges = async (req, res) => {
  try {
    const litiges = await pool.query(`
      SELECT l.*,
        u1.nom as plaignant_nom, u1.prenom as plaignant_prenom,
        u2.nom as accuse_nom, u2.prenom as accuse_prenom
      FROM litiges l
      JOIN utilisateurs u1 ON l.plaignant_id = u1.id
      JOIN utilisateurs u2 ON l.accuse_id = u2.id
      ORDER BY l.created_at DESC
    `);
    res.json({ succes: true, litiges: litiges.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Résoudre litige
const resoudreLitige = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, statut } = req.body;
    await pool.query(
      'UPDATE litiges SET statut = $1, decision = $2, admin_id = $3, updated_at = NOW() WHERE id = $4',
      [statut || 'resolu', decision, req.utilisateur.id, id]
    );
    res.json({ succes: true, message: 'Litige résolu' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getDashboard,
  getTousUtilisateurs,
  modererUtilisateur,
  supprimerUtilisateur,
  getToutesAnnonces,
  modererAnnonce,
  supprimerAnnonce,
  getAnnoncesEnAttente,
  getSignalements,
  traiterSignalement,
  getConversationsAnnonce,
  getTransactions,
  getStatsPays,
  getLitiges,
  resoudreLitige
};