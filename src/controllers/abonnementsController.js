const pool = require('../config/database');

const plans = {
  starter: {
    nom: 'Starter',
    prix: 5000,
    nb_annonces_max: 10,
    duree_jours: 30,
    avantages: [
      '10 annonces actives',
      'Badge Pro sur le profil',
      'Statistiques avancées',
      'Support prioritaire'
    ]
  },
  business: {
    nom: 'Business',
    prix: 15000,
    nb_annonces_max: 50,
    duree_jours: 30,
    avantages: [
      '50 annonces actives',
      'Badge Pro Gold',
      'Statistiques avancées',
      '5 sponsorisations offertes',
      'Support prioritaire 24/7'
    ]
  },
  enterprise: {
    nom: 'Enterprise',
    prix: 40000,
    nb_annonces_max: 999,
    duree_jours: 30,
    avantages: [
      'Annonces illimitées',
      'Badge Pro Platinum',
      'Statistiques avancées',
      '20 sponsorisations offertes',
      'API accès',
      'Support dédié'
    ]
  }
};

// Récupérer les plans disponibles
const getPlans = async (req, res) => {
  res.json({ succes: true, plans });
};

// Récupérer mon abonnement
const getMonAbonnement = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT plan_premium, badge_pro, nb_annonces_max FROM utilisateurs WHERE id = $1',
      [req.utilisateur.id]
    );

    const abonnement = await pool.query(
      `SELECT * FROM abonnements
       WHERE utilisateur_id = $1
       AND statut = 'actif'
       AND date_fin > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [req.utilisateur.id]
    );

    const nbAnnonces = await pool.query(
      `SELECT COUNT(*) as total FROM annonces
       WHERE utilisateur_id = $1 AND statut = 'publiee'`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      plan_actuel: user.rows[0].plan_premium || 'gratuit',
      badge_pro: user.rows[0].badge_pro || false,
      nb_annonces_max: user.rows[0].nb_annonces_max || 3,
      nb_annonces_actuelles: parseInt(nbAnnonces.rows[0].total),
      abonnement: abonnement.rows[0] || null
    });
  } catch (erreur) {
    console.error('Erreur abonnement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Souscrire à un plan (mode test)
const souscrire = async (req, res) => {
  try {
    const { plan } = req.body;
    const utilisateur_id = req.utilisateur.id;

    if (!plans[plan]) {
      return res.status(400).json({ succes: false, message: 'Plan invalide' });
    }

    const planChoisi = plans[plan];
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + planChoisi.duree_jours);

    // Désactiver l'ancien abonnement
    await pool.query(
      `UPDATE abonnements SET statut = 'expire'
       WHERE utilisateur_id = $1 AND statut = 'actif'`,
      [utilisateur_id]
    );

    // Créer le nouvel abonnement
    await pool.query(
      `INSERT INTO abonnements
        (utilisateur_id, plan, prix, nb_annonces_max, date_fin, statut)
       VALUES ($1, $2, $3, $4, $5, 'actif')`,
      [utilisateur_id, plan, planChoisi.prix,
       planChoisi.nb_annonces_max, dateFin]
    );

    // Mettre à jour l'utilisateur
    await pool.query(
      `UPDATE utilisateurs SET
        plan_premium = $1,
        badge_pro = true,
        nb_annonces_max = $2
       WHERE id = $3`,
      [plan, planChoisi.nb_annonces_max, utilisateur_id]
    );

    // Donner des crédits de sponsorisation selon le plan
    const creditsBonus = plan === 'business' ? 5 : plan === 'enterprise' ? 20 : 0;
    if (creditsBonus > 0) {
      await pool.query(
        'UPDATE utilisateurs SET credits_parrainage = credits_parrainage + $1 WHERE id = $2',
        [creditsBonus, utilisateur_id]
      );
    }

    res.json({
      succes: true,
      message: `🎉 Bienvenue sur le plan ${planChoisi.nom} ! Votre badge Pro est activé.`,
      plan: plan,
      date_fin: dateFin
    });

  } catch (erreur) {
    console.error('Erreur souscription:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Annuler l'abonnement
const annulerAbonnement = async (req, res) => {
  try {
    await pool.query(
      `UPDATE abonnements SET statut = 'annule'
       WHERE utilisateur_id = $1 AND statut = 'actif'`,
      [req.utilisateur.id]
    );

    await pool.query(
      `UPDATE utilisateurs SET
        plan_premium = 'gratuit',
        badge_pro = false,
        nb_annonces_max = 3
       WHERE id = $1`,
      [req.utilisateur.id]
    );

    res.json({ succes: true, message: 'Abonnement annulé' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { getPlans, getMonAbonnement, souscrire, annulerAbonnement };