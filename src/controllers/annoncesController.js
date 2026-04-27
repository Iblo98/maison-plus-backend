const pool = require('../config/database');
const { verifierEtEnvoyerAlertes } = require('./alertesController');
const { enregistrerChangementPrix } = require('./historiquePrixController');
// Créer une annonce
const creerAnnonce = async (req, res) => {
  try {
    const {
      titre, description, categorie, type_transaction,
      prix, superficie, nb_pieces, ville, quartier,
      adresse_complete, disponible_du, disponible_au
    } = req.body;

    if (!titre || !categorie || !type_transaction || !prix || !ville) {
      return res.status(400).json({
        succes: false,
        message: 'Titre, catégorie, type, prix et ville sont obligatoires'
      });
    }

    const categoriesValides = ['maison', 'parcelle', 'hotel', 'marketplace', 'restaurant'];
    if (!categoriesValides.includes(categorie)) {
      return res.status(400).json({
        succes: false,
        message: 'Catégorie invalide'
      });
    }

    const nouvelleAnnonce = await pool.query(
      `INSERT INTO annonces 
        (utilisateur_id, titre, description, categorie, type_transaction,
         prix, superficie, nb_pieces, ville, quartier, adresse_complete,
         disponible_du, disponible_au, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'publiee')
       RETURNING *`,
      [
        req.utilisateur.id, titre, description, categorie, type_transaction,
        prix, superficie, nb_pieces, ville, quartier, adresse_complete,
        disponible_du, disponible_au
      ]
    );

    // Envoyer alertes aux utilisateurs intéressés
    verifierEtEnvoyerAlertes(nouvelleAnnonce.rows[0].id);

    res.status(201).json({
      succes: true,
      message: 'Annonce créée !',
      annonce: nouvelleAnnonce.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur création annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Lister toutes les annonces publiées
const getAnnonces = async (req, res) => {
  try {
    const {
      ville, categorie, type_transaction,
      prix_min, prix_max, superficie_min, superficie_max,
      nb_pieces_min, nb_pieces_max, recherche,
      latitude, longitude, rayon
    } = req.query;

    let query = `
      SELECT a.*, u.nom, u.prenom, u.est_verifie,
        (SELECT url FROM medias WHERE annonce_id = a.id
         AND est_principale = true LIMIT 1) as photo_principale
        ${latitude && longitude && rayon
          ? `, (6371 * acos(cos(radians($${1})) * cos(radians(a.latitude::float))
              * cos(radians(a.longitude::float) - radians($${2}))
              + sin(radians($${1})) * sin(radians(a.latitude::float)))) AS distance`
          : ''}
      FROM annonces a
      JOIN utilisateurs u ON a.utilisateur_id = u.id
      WHERE a.statut = 'publiee'
    `;

    const params = [];
    let compteur = 1;

    if (latitude && longitude && rayon) {
      params.push(latitude, longitude);
      compteur = 3;
      query += ` AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        AND (6371 * acos(cos(radians($1)) * cos(radians(a.latitude::float))
        * cos(radians(a.longitude::float) - radians($2))
        + sin(radians($1)) * sin(radians(a.latitude::float)))) <= $${compteur}`;
      params.push(rayon);
      compteur++;
    }

    if (recherche) {
      query += ` AND (a.titre ILIKE $${compteur} OR a.description ILIKE $${compteur} OR a.ville ILIKE $${compteur} OR a.quartier ILIKE $${compteur})`;
      params.push(`%${recherche}%`);
      compteur++;
    }
    if (ville) {
      query += ` AND a.ville ILIKE $${compteur}`;
      params.push(`%${ville}%`);
      compteur++;
    }
    if (categorie) {
      query += ` AND a.categorie = $${compteur}`;
      params.push(categorie);
      compteur++;
    }
    if (type_transaction) {
      query += ` AND a.type_transaction = $${compteur}`;
      params.push(type_transaction);
      compteur++;
    }
    if (prix_min) {
      query += ` AND a.prix >= $${compteur}`;
      params.push(prix_min);
      compteur++;
    }
    if (prix_max) {
      query += ` AND a.prix <= $${compteur}`;
      params.push(prix_max);
      compteur++;
    }
    if (superficie_min) {
      query += ` AND a.superficie >= $${compteur}`;
      params.push(superficie_min);
      compteur++;
    }
    if (superficie_max) {
      query += ` AND a.superficie <= $${compteur}`;
      params.push(superficie_max);
      compteur++;
    }
    if (nb_pieces_min) {
      query += ` AND a.nb_pieces >= $${compteur}`;
      params.push(nb_pieces_min);
      compteur++;
    }
    if (nb_pieces_max) {
      query += ` AND a.nb_pieces <= $${compteur}`;
      params.push(nb_pieces_max);
      compteur++;
    }

    query += latitude && longitude && rayon
      ? ` ORDER BY distance ASC`
      : ` ORDER BY a.est_sponsorisee DESC, a.created_at DESC`;

    const annonces = await pool.query(query, params);

    res.json({
      succes: true,
      total: annonces.rows.length,
      annonces: annonces.rows
    });

  } catch (erreur) {
    console.error('Erreur récupération annonces:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Voir une annonce en détail
const getAnnonce = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE annonces SET nb_vues = nb_vues + 1 WHERE id = $1',
      [id]
    );

    const annonce = await pool.query(
      `SELECT a.*, u.nom, u.prenom, u.photo_profil_url as photo_profil, u.est_verifie, u.telephone,
        (SELECT url FROM medias WHERE annonce_id = a.id
         AND est_principale = true LIMIT 1) as photo_principale
       FROM annonces a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Annonce introuvable'
      });
    }

    res.json({
      succes: true,
      annonce: annonce.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur récupération annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Modifier une annonce
const modifierAnnonce = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, description, prix, ville, quartier, disponible_du, disponible_au } = req.body;

    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisé'
      });
    }

    // Enregistrer historique prix si changement
    if (prix && parseFloat(prix) !== parseFloat(annonce.rows[0].prix)) {
      await enregistrerChangementPrix(id, annonce.rows[0].prix, prix);
    }

    const annonceModifiee = await pool.query(
      `UPDATE annonces SET
        titre = COALESCE($1, titre),
        description = COALESCE($2, description),
        prix = COALESCE($3, prix),
        ville = COALESCE($4, ville),
        quartier = COALESCE($5, quartier),
        disponible_du = COALESCE($6, disponible_du),
        disponible_au = COALESCE($7, disponible_au),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [titre, description, prix, ville, quartier, disponible_du, disponible_au, id]
    );

    res.json({
      succes: true,
      message: 'Annonce modifiée avec succès',
      annonce: annonceModifiee.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur modification annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer une annonce
const supprimerAnnonce = async (req, res) => {
  try {
    const { id } = req.params;

    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisé'
      });
    }

    await pool.query('DELETE FROM annonces WHERE id = $1', [id]);

    res.json({
      succes: true,
      message: 'Annonce supprimée avec succès'
    });

  } catch (erreur) {
    console.error('Erreur suppression annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Marquer annonce comme louée ou vendue
const marquerStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['loue', 'vendu', 'publiee'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        succes: false,
        message: 'Statut invalide. Utilisez: loue, vendu, publiee'
      });
    }

    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [id, req.utilisateur.id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisé'
      });
    }

    await pool.query(
      'UPDATE annonces SET statut = $1, updated_at = NOW() WHERE id = $2',
      [statut, id]
    );

    const messages = {
      'loue': 'Annonce marquée comme louée !',
      'vendu': 'Annonce marquée comme vendue !',
      'publiee': 'Annonce remise en ligne !'
    };

    res.json({
      succes: true,
      message: messages[statut]
    });

  } catch (erreur) {
    console.error('Erreur statut annonce:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  creerAnnonce,
  getAnnonces,
  getAnnonce,
  modifierAnnonce,
  supprimerAnnonce,
  marquerStatut
};