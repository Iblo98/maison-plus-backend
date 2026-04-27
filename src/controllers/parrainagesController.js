const pool = require('../config/database');

// Générer un code de parrainage unique
const genererCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MP';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Obtenir mon code de parrainage
const getMonCode = async (req, res) => {
  try {
    const utilisateur_id = req.utilisateur.id;

    let user = await pool.query(
      'SELECT code_parrainage, credits_parrainage FROM utilisateurs WHERE id = $1',
      [utilisateur_id]
    );

    // Générer un code si pas encore de code
    if (!user.rows[0].code_parrainage) {
      let code;
      let unique = false;
      while (!unique) {
        code = genererCode();
        const existe = await pool.query(
          'SELECT id FROM utilisateurs WHERE code_parrainage = $1',
          [code]
        );
        if (existe.rows.length === 0) unique = true;
      }

      await pool.query(
        'UPDATE utilisateurs SET code_parrainage = $1 WHERE id = $2',
        [code, utilisateur_id]
      );

      user.rows[0].code_parrainage = code;
    }

    // Stats de parrainage
    const stats = await pool.query(
      `SELECT
        COUNT(*) as total_filleuls,
        COUNT(CASE WHEN statut = 'complete' THEN 1 END) as filleuls_actifs,
        SUM(credits_gagnes) as total_credits
       FROM parrainages WHERE parrain_id = $1`,
      [utilisateur_id]
    );

    // Liste des filleuls
    const filleuls = await pool.query(
      `SELECT p.*, u.prenom, u.nom, u.created_at as filleul_date
       FROM parrainages p
       JOIN utilisateurs u ON p.filleul_id = u.id
       WHERE p.parrain_id = $1
       ORDER BY p.created_at DESC`,
      [utilisateur_id]
    );

    res.json({
      succes: true,
      code_parrainage: user.rows[0].code_parrainage,
      credits_disponibles: user.rows[0].credits_parrainage || 0,
      stats: stats.rows[0],
      filleuls: filleuls.rows
    });

  } catch (erreur) {
    console.error('Erreur code parrainage:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Utiliser un code de parrainage lors de l'inscription
const utiliserCode = async (req, res) => {
  try {
    const { code_parrainage } = req.body;
    const filleul_id = req.utilisateur.id;

    if (!code_parrainage) {
      return res.status(400).json({ succes: false, message: 'Code obligatoire' });
    }

    // Trouver le parrain
    const parrain = await pool.query(
      'SELECT id FROM utilisateurs WHERE code_parrainage = $1',
      [code_parrainage.toUpperCase()]
    );

    if (parrain.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Code invalide' });
    }

    const parrain_id = parrain.rows[0].id;

    if (parrain_id === filleul_id) {
      return res.status(400).json({
        succes: false,
        message: 'Vous ne pouvez pas utiliser votre propre code'
      });
    }

    // Vérifier si déjà parrainé
    const dejaParraine = await pool.query(
      'SELECT id FROM parrainages WHERE filleul_id = $1',
      [filleul_id]
    );

    if (dejaParraine.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Vous avez déjà utilisé un code de parrainage'
      });
    }

    // Créer le parrainage
    await pool.query(
      `INSERT INTO parrainages (parrain_id, filleul_id, code_parrainage, statut, credits_gagnes)
       VALUES ($1, $2, $3, 'complete', 7)`,
      [parrain_id, filleul_id, code_parrainage.toUpperCase()]
    );

    // Donner 7 jours de sponsorisation gratuite au parrain
    await pool.query(
      'UPDATE utilisateurs SET credits_parrainage = credits_parrainage + 7 WHERE id = $1',
      [parrain_id]
    );

    // Donner 3 jours au filleul aussi
    await pool.query(
      'UPDATE utilisateurs SET credits_parrainage = credits_parrainage + 3 WHERE id = $1',
      [filleul_id]
    );

    res.json({
      succes: true,
      message: '🎉 Code appliqué ! Vous avez gagné 3 jours de sponsorisation gratuite !'
    });

  } catch (erreur) {
    console.error('Erreur utilisation code:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Utiliser des crédits pour sponsoriser
const utiliserCredits = async (req, res) => {
  try {
    const { annonce_id, nb_jours } = req.body;
    const utilisateur_id = req.utilisateur.id;

    const user = await pool.query(
      'SELECT credits_parrainage FROM utilisateurs WHERE id = $1',
      [utilisateur_id]
    );

    if (user.rows[0].credits_parrainage < nb_jours) {
      return res.status(400).json({
        succes: false,
        message: `Crédits insuffisants. Vous avez ${user.rows[0].credits_parrainage} jours disponibles`
      });
    }

    // Vérifier que l'annonce appartient à l'utilisateur
    const annonce = await pool.query(
      'SELECT id FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [annonce_id, utilisateur_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({ succes: false, message: 'Annonce non autorisée' });
    }

    // Sponsoriser l'annonce
    await pool.query(
      `UPDATE annonces SET
        est_sponsorisee = true,
        sponsorisee_jusqu_au = NOW() + INTERVAL '${parseInt(nb_jours)} days'
       WHERE id = $1`,
      [annonce_id]
    );

    // Déduire les crédits
    await pool.query(
      'UPDATE utilisateurs SET credits_parrainage = credits_parrainage - $1 WHERE id = $2',
      [nb_jours, utilisateur_id]
    );

    res.json({
      succes: true,
      message: `✅ Annonce sponsorisée pendant ${nb_jours} jours avec vos crédits !`
    });

  } catch (erreur) {
    console.error('Erreur utilisation crédits:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { getMonCode, utiliserCode, utiliserCredits };