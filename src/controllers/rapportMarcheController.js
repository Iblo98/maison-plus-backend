const pool = require('../config/database');

const getRapportMarche = async (req, res) => {
  try {
    const { ville, categorie, type_transaction } = req.query;

    const villeFiltre = ville ? `AND ville ILIKE '%${ville}%'` : '';
    const categorieFiltre = categorie ? `AND categorie = '${categorie}'` : '';
    const typeFiltre = type_transaction ? `AND type_transaction = '${type_transaction}'` : '';

    // Prix moyen par ville
    const prixParVille = await pool.query(`
      SELECT
        ville,
        type_transaction,
        categorie,
        COUNT(*) as nb_annonces,
        ROUND(AVG(prix::numeric)) as prix_moyen,
        ROUND(MIN(prix::numeric)) as prix_min,
        ROUND(MAX(prix::numeric)) as prix_max,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix::numeric)) as prix_median
      FROM annonces
      WHERE statut IN ('publiee', 'loue', 'vendu')
      ${villeFiltre} ${categorieFiltre} ${typeFiltre}
      GROUP BY ville, type_transaction, categorie
      HAVING COUNT(*) >= 2
      ORDER BY nb_annonces DESC
      LIMIT 20
    `);

    // Prix moyen par quartier
    const prixParQuartier = await pool.query(`
      SELECT
        quartier,
        ville,
        COUNT(*) as nb_annonces,
        ROUND(AVG(prix::numeric)) as prix_moyen,
        ROUND(MIN(prix::numeric)) as prix_min,
        ROUND(MAX(prix::numeric)) as prix_max
      FROM annonces
      WHERE statut IN ('publiee', 'loue', 'vendu')
      AND quartier IS NOT NULL
      AND quartier != ''
      ${villeFiltre} ${categorieFiltre}
      GROUP BY quartier, ville
      HAVING COUNT(*) >= 2
      ORDER BY prix_moyen DESC
      LIMIT 15
    `);

    // Evolution des prix par mois
    const evolutionPrix = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as mois,
        DATE_TRUNC('month', created_at) as date_mois,
        ROUND(AVG(prix::numeric)) as prix_moyen,
        COUNT(*) as nb_annonces
      FROM annonces
      WHERE statut IN ('publiee', 'loue', 'vendu')
      AND created_at >= NOW() - INTERVAL '12 months'
      ${villeFiltre} ${categorieFiltre}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY date_mois ASC
    `);

    // Stats globales
    const statsGlobales = await pool.query(`
      SELECT
        COUNT(*) as total_annonces,
        COUNT(CASE WHEN statut = 'publiee' THEN 1 END) as annonces_actives,
        COUNT(CASE WHEN statut = 'loue' THEN 1 END) as annonces_louees,
        COUNT(CASE WHEN statut = 'vendu' THEN 1 END) as annonces_vendues,
        ROUND(AVG(prix::numeric)) as prix_moyen_global,
        COUNT(DISTINCT ville) as nb_villes,
        COUNT(DISTINCT utilisateur_id) as nb_proprietaires
      FROM annonces
      ${ville ? `WHERE ville ILIKE '%${ville}%'` : ''}
    `);

    // Top quartiers les plus chers
    const topQuartiers = await pool.query(`
      SELECT
        quartier,
        ville,
        ROUND(AVG(prix::numeric)) as prix_moyen,
        COUNT(*) as nb_annonces
      FROM annonces
      WHERE statut IN ('publiee', 'loue', 'vendu')
      AND quartier IS NOT NULL AND quartier != ''
      ${villeFiltre}
      GROUP BY quartier, ville
      HAVING COUNT(*) >= 2
      ORDER BY prix_moyen DESC
      LIMIT 5
    `);

    res.json({
      succes: true,
      rapport: {
        stats_globales: statsGlobales.rows[0],
        prix_par_ville: prixParVille.rows,
        prix_par_quartier: prixParQuartier.rows,
        evolution_prix: evolutionPrix.rows,
        top_quartiers: topQuartiers.rows
      }
    });

  } catch (erreur) {
    console.error('Erreur rapport marché:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { getRapportMarche };