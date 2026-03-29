const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Voir son propre profil
const getMonProfil = async (req, res) => {
  try {
    const profil = await pool.query(
      `SELECT id, nom, prenom, email, telephone, photo_profil,
        photo_couverture, type_compte, statut, est_verifie,
        langue, created_at
       FROM utilisateurs WHERE id = $1`,
      [req.utilisateur.id]
    );

    // Statistiques
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_annonces,
        COUNT(CASE WHEN statut = 'publiee' THEN 1 END) as annonces_actives,
        COUNT(CASE WHEN statut = 'vendu' OR statut = 'loue' THEN 1 END) as annonces_conclues,
        SUM(nb_vues) as total_vues
       FROM annonces WHERE utilisateur_id = $1`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      profil: profil.rows[0],
      statistiques: stats.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur profil:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Voir le profil public d'un utilisateur
const getProfilPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const profil = await pool.query(
      `SELECT id, nom, prenom, photo_profil, photo_couverture,
        type_compte, est_verifie, created_at
       FROM utilisateurs WHERE id = $1`,
      [id]
    );

    if (profil.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable'
      });
    }

    // Annonces publiques
    const annonces = await pool.query(
      `SELECT id, titre, prix, ville, quartier, categorie,
        type_transaction, nb_vues, created_at
       FROM annonces 
       WHERE utilisateur_id = $1 AND statut = 'publiee'
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      succes: true,
      profil: profil.rows[0],
      annonces: annonces.rows
    });

  } catch (erreur) {
    console.error('Erreur profil public:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Modifier son profil
const modifierProfil = async (req, res) => {
  try {
    const { nom, prenom, telephone, langue } = req.body;

    const profilModifie = await pool.query(
      `UPDATE utilisateurs SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        telephone = COALESCE($3, telephone),
        langue = COALESCE($4, langue),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, nom, prenom, email, telephone, langue, updated_at`,
      [nom, prenom, telephone, langue, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Profil modifié avec succès !',
      profil: profilModifie.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur modification profil:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Changer le mot de passe
const changerMotDePasse = async (req, res) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Ancien et nouveau mot de passe obligatoires'
      });
    }

    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({
        succes: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Récupérer le mot de passe actuel
    const utilisateur = await pool.query(
      'SELECT mot_de_passe FROM utilisateurs WHERE id = $1',
      [req.utilisateur.id]
    );

    // Vérifier l'ancien mot de passe
    const valide = await bcrypt.compare(
      ancien_mot_de_passe,
      utilisateur.rows[0].mot_de_passe
    );

    if (!valide) {
      return res.status(400).json({
        succes: false,
        message: 'Ancien mot de passe incorrect'
      });
    }

    // Chiffrer et sauvegarder le nouveau
    const nouveauChiffre = await bcrypt.hash(nouveau_mot_de_passe, 12);

    await pool.query(
      'UPDATE utilisateurs SET mot_de_passe = $1, updated_at = NOW() WHERE id = $2',
      [nouveauChiffre, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Mot de passe modifié avec succès !'
    });

  } catch (erreur) {
    console.error('Erreur changement mot de passe:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Mes annonces
const getMesAnnonces = async (req, res) => {
  try {
    const annonces = await pool.query(
      `SELECT a.*, 
        (SELECT url FROM medias WHERE annonce_id = a.id 
         AND est_principale = true LIMIT 1) as photo_principale
       FROM annonces a
       WHERE a.utilisateur_id = $1
       ORDER BY a.created_at DESC`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      total: annonces.rows.length,
      annonces: annonces.rows
    });

  } catch (erreur) {
    console.error('Erreur mes annonces:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getMonProfil,
  getProfilPublic,
  modifierProfil,
  changerMotDePasse,
  getMesAnnonces
};