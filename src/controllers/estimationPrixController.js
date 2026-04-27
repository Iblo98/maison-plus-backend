const pool = require('../config/database');

const estimerPrix = async (req, res) => {
  try {
    const {
      categorie,
      type_transaction,
      ville,
      quartier,
      superficie,
      nb_pieces
    } = req.body;

    if (!categorie || !type_transaction || !ville) {
      return res.status(400).json({
        succes: false,
        message: 'Catégorie, type et ville sont obligatoires'
      });
    }

    // Chercher des annonces similaires
    let query = `
      SELECT prix, superficie, nb_pieces, quartier
      FROM annonces
      WHERE categorie = $1
      AND type_transaction = $2
      AND ville ILIKE $3
      AND statut IN ('publiee', 'loue', 'vendu')
    `;
    const params = [categorie, type_transaction, `%${ville}%`];
    let compteur = 4;

    if (quartier) {
      query += ` AND quartier ILIKE $${compteur}`;
      params.push(`%${quartier}%`);
      compteur++;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const annonces = await pool.query(query, params);

    if (annonces.rows.length < 3) {
      // Pas assez de données — chercher plus large
      const annoncesLarges = await pool.query(
        `SELECT prix, superficie, nb_pieces
         FROM annonces
         WHERE categorie = $1
         AND type_transaction = $2
         AND statut IN ('publiee', 'loue', 'vendu')
         ORDER BY created_at DESC LIMIT 30`,
        [categorie, type_transaction]
      );

      if (annoncesLarges.rows.length < 2) {
        return res.json({
          succes: true,
          estimation: null,
          message: 'Pas assez de données pour estimer le prix',
          nb_annonces_analysees: 0
        });
      }

      annonces.rows = annoncesLarges.rows;
    }

    const prix = annonces.rows.map(a => parseFloat(a.prix));

    // Calcul statistique
    prix.sort((a, b) => a - b);

    const moyenne = prix.reduce((a, b) => a + b, 0) / prix.length;
    const mediane = prix[Math.floor(prix.length / 2)];

    // Écart-type pour filtrer les valeurs aberrantes
    const variance = prix.reduce((acc, p) => acc + Math.pow(p - moyenne, 2), 0) / prix.length;
    const ecartType = Math.sqrt(variance);

    // Filtrer les valeurs aberrantes (±2 écarts-types)
    const prixFiltres = prix.filter(p =>
      p >= moyenne - 2 * ecartType &&
      p <= moyenne + 2 * ecartType
    );

    const prixMoyen = prixFiltres.reduce((a, b) => a + b, 0) / prixFiltres.length;

    // Ajustements selon superficie
    let prixAjuste = prixMoyen;
    if (superficie) {
      const superficieNum = parseFloat(superficie);
      const superficieMoyenne = annonces.rows
        .filter(a => a.superficie)
        .reduce((acc, a) => acc + parseFloat(a.superficie), 0) /
        annonces.rows.filter(a => a.superficie).length;

      if (superficieMoyenne && superficieNum) {
        const ratio = superficieNum / superficieMoyenne;
        prixAjuste = prixMoyen * Math.pow(ratio, 0.6);
      }
    }

    // Fourchette de prix
    const prixMin = Math.round(prixAjuste * 0.85);
    const prixMax = Math.round(prixAjuste * 1.15);
    const prixEstime = Math.round(prixAjuste);

    // Niveau de confiance
    let confiance = 'faible';
    if (annonces.rows.length >= 10) confiance = 'élevée';
    else if (annonces.rows.length >= 5) confiance = 'moyenne';

    res.json({
      succes: true,
      estimation: {
        prix_estime: prixEstime,
        prix_min: prixMin,
        prix_max: prixMax,
        prix_median: Math.round(mediane),
        confiance,
        nb_annonces_analysees: annonces.rows.length,
        devise: 'XOF'
      }
    });

  } catch (erreur) {
    console.error('Erreur estimation prix:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { estimerPrix };