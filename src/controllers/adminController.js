const pool = require('../config/database');

// Dashboard admin
const getDashboard = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM utilisateurs) as total_utilisateurs,
        (SELECT COUNT(*) FROM annonces) as total_annonces,
        (SELECT COUNT(*) FROM paiements) as total_paiements,
        (SELECT COUNT(*) FROM litiges) as total_litiges,
        (SELECT COALESCE(SUM(commission_plateforme), 0) FROM paiements WHERE statut = 'complete') as total_commissions,
        (SELECT COALESCE(SUM(commission_plateforme), 0) FROM paiements 
         WHERE statut = 'complete' 
         AND created_at >= date_trunc('month', NOW())) as commissions_mois,
        (SELECT COUNT(*) FROM paiements WHERE statut = 'complete') as paiements_completes
    `);

    const derniersUtilisateurs = await pool.query(`
      SELECT id, nom, prenom, email, telephone, type_compte, 
             statut, photo_profil_url, email_verifie, 
             cnib_recto_url, created_at
      FROM utilisateurs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    const dernieresAnnonces = await pool.query(`
      SELECT a.*, u.nom, u.prenom,
        (SELECT url FROM medias WHERE annonce_id = a.id 
         AND est_principale = true LIMIT 1) as photo_principale
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      ORDER BY a.created_at DESC 
      LIMIT 5
    `);

    res.json({
      succes: true,
      stats: stats.rows[0],
      derniers_utilisateurs: derniersUtilisateurs.rows,
      dernieres_annonces: dernieresAnnonces.rows
    });

  } catch (erreur) {
    console.error('Erreur dashboard admin:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Tous les utilisateurs
const getTousUtilisateurs = async (req, res) => {
  try {
    const { recherche, type_compte, statut } = req.query;

    let query = `
      SELECT id, nom, prenom, email, telephone, type_compte,
             statut, photo_profil_url, email_verifie,
             cnib_recto_url, cnib_verso_url, mobile_money_numero,
             mobile_money_operateur, nom_entreprise, rccm, ifu,
             created_at
      FROM utilisateurs
      WHERE 1=1
    `;
    const params = [];
    let compteur = 1;

    if (recherche) {
      query += ` AND (nom ILIKE $${compteur} OR prenom ILIKE $${compteur} OR email ILIKE $${compteur} OR telephone ILIKE $${compteur})`;
      params.push(`%${recherche}%`);
      compteur++;
    }
    if (type_compte) {
      query += ` AND type_compte = $${compteur}`;
      params.push(type_compte);
      compteur++;
    }
    if (statut) {
      query += ` AND statut = $${compteur}`;
      params.push(statut);
      compteur++;
    }

    query += ' ORDER BY created_at DESC';

    const utilisateurs = await pool.query(query, params);

    res.json({
      succes: true,
      total: utilisateurs.rows.length,
      utilisateurs: utilisateurs.rows
    });

  } catch (erreur) {
    console.error('Erreur liste utilisateurs:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Toutes les annonces
const getToutesAnnonces = async (req, res) => {
  try {
    const { recherche, statut, categorie } = req.query;

    let query = `
      SELECT a.*, u.nom, u.prenom, u.email,
        (SELECT url FROM medias WHERE annonce_id = a.id 
         AND est_principale = true LIMIT 1) as photo_principale
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let compteur = 1;

    if (recherche) {
      query += ` AND (a.titre ILIKE $${compteur} OR a.ville ILIKE $${compteur} OR a.quartier ILIKE $${compteur})`;
      params.push(`%${recherche}%`);
      compteur++;
    }
    if (statut) {
      query += ` AND a.statut = $${compteur}`;
      params.push(statut);
      compteur++;
    }
    if (categorie) {
      query += ` AND a.categorie = $${compteur}`;
      params.push(categorie);
      compteur++;
    }

    query += ' ORDER BY a.created_at DESC';

    const annonces = await pool.query(query, params);

    res.json({
      succes: true,
      total: annonces.rows.length,
      annonces: annonces.rows
    });

  } catch (erreur) {
    console.error('Erreur liste annonces:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Modérer une annonce
const modererAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, motif } = req.body;

    const statutsValides = ['publiee', 'rejetee', 'suspendue', 'en_attente'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        succes: false,
        message: 'Statut invalide'
      });
    }

    await pool.query(
      'UPDATE annonces SET statut = $1, updated_at = NOW() WHERE id = $2',
      [statut, id]
    );

    res.json({
      succes: true,
      message: `Annonce ${statut} avec succès`
    });

  } catch (erreur) {
    console.error('Erreur modération annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Annonces en attente
const getAnnoncesEnAttente = async (req, res) => {
  try {
    const annonces = await pool.query(`
      SELECT a.*, u.nom, u.prenom, u.email,
        (SELECT url FROM medias WHERE annonce_id = a.id 
         AND est_principale = true LIMIT 1) as photo_principale
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      WHERE a.statut = 'en_attente'
      ORDER BY a.created_at ASC
    `);

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

// Modérer un utilisateur
const modererUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['actif', 'banni', 'suspendu', 'en_attente'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        succes: false,
        message: 'Statut invalide'
      });
    }

    // Ne pas modifier le compte admin
    const utilisateur = await pool.query(
      'SELECT type_compte FROM utilisateurs WHERE id = $1',
      [id]
    );
    if (utilisateur.rows[0]?.type_compte === 'admin') {
      return res.status(403).json({
        succes: false,
        message: 'Impossible de modifier un compte admin'
      });
    }

    await pool.query(
      'UPDATE utilisateurs SET statut = $1, updated_at = NOW() WHERE id = $2',
      [statut, id]
    );

    res.json({
      succes: true,
      message: `Utilisateur ${statut} avec succès`
    });

  } catch (erreur) {
    console.error('Erreur modération utilisateur:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Litiges
const getLitiges = async (req, res) => {
  try {
    const litiges = await pool.query(`
      SELECT l.*,
        u_plaignant.nom as plaignant_nom,
        u_plaignant.prenom as plaignant_prenom,
        u_accuse.nom as accuse_nom,
        u_accuse.prenom as accuse_prenom,
        p.montant, p.reference_transaction
      FROM litiges l
      JOIN utilisateurs u_plaignant ON l.plaignant_id = u_plaignant.id
      JOIN utilisateurs u_accuse ON l.accuse_id = u_accuse.id
      JOIN paiements p ON l.paiement_id = p.id
      ORDER BY l.created_at DESC
    `);

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

// Résoudre litige
const resoudreLitige = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, statut } = req.body;

    await pool.query(
      `UPDATE litiges SET 
        statut = $1, 
        decision = $2,
        admin_id = $3,
        updated_at = NOW()
       WHERE id = $4`,
      [statut || 'resolu', decision, req.utilisateur.id, id]
    );

    res.json({
      succes: true,
      message: 'Litige résolu avec succès'
    });

  } catch (erreur) {
    console.error('Erreur résolution litige:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getDashboard,
  getTousUtilisateurs,
  getToutesAnnonces,
  modererAnnonce,
  getAnnoncesEnAttente,
  modererUtilisateur,
  getLitiges,
  resoudreLitige
};