const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Plans de sponsorisation
const PLANS = {
  starter: { duree: 7, montant: 2500, label: 'Starter — 7 jours' },
  standard: { duree: 14, montant: 4500, label: 'Standard — 14 jours' },
  premium: { duree: 30, montant: 8000, label: 'Premium — 30 jours' }
};

// Récupérer les plans disponibles
const getPlans = async (req, res) => {
  res.json({
    succes: true,
    plans: PLANS
  });
};

// Initier une sponsorisation
const initierSponsorisation = async (req, res) => {
  try {
    const { annonce_id, plan } = req.body;
    const utilisateur_id = req.utilisateur.id;

    if (!PLANS[plan]) {
      return res.status(400).json({
        succes: false,
        message: 'Plan invalide. Choisissez: starter, standard ou premium'
      });
    }

    // Vérifier que l'annonce appartient à l'utilisateur
    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1 AND utilisateur_id = $2',
      [annonce_id, utilisateur_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(403).json({
        succes: false,
        message: 'Annonce introuvable ou non autorisée'
      });
    }

    // Vérifier si déjà sponsorisée
    if (annonce.rows[0].est_sponsorisee &&
        new Date(annonce.rows[0].sponsorisee_jusqu_au) > new Date()) {
      return res.status(400).json({
        succes: false,
        message: 'Cette annonce est déjà sponsorisée',
        jusqu_au: annonce.rows[0].sponsorisee_jusqu_au
      });
    }

    const planChoisi = PLANS[plan];
    const reference = `SPON-${uuidv4().substring(0, 8).toUpperCase()}`;
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + planChoisi.duree);

    // Créer la sponsorisation en attente
    const sponsorisation = await pool.query(
      `INSERT INTO sponsorisations
        (annonce_id, utilisateur_id, duree_jours, montant, statut,
         date_debut, date_fin, reference_paiement)
       VALUES ($1, $2, $3, $4, 'en_attente', $5, $6, $7)
       RETURNING *`,
      [annonce_id, utilisateur_id, planChoisi.duree,
       planChoisi.montant, dateDebut, dateFin, reference]
    );

    res.json({
      succes: true,
      sponsorisation: sponsorisation.rows[0],
      plan: planChoisi,
      reference,
      message: `Plan ${planChoisi.label} initié — ${planChoisi.montant.toLocaleString('fr-FR')} XOF`
    });

  } catch (erreur) {
    console.error('Erreur sponsorisation:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Activer une sponsorisation (après paiement)
const activerSponsorisation = async (req, res) => {
  try {
    const { reference } = req.params;

    const sponsorisation = await pool.query(
      'SELECT * FROM sponsorisations WHERE reference_paiement = $1',
      [reference]
    );

    if (sponsorisation.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Sponsorisation introuvable'
      });
    }

    const s = sponsorisation.rows[0];

    // Activer la sponsorisation
    await pool.query(
      `UPDATE sponsorisations SET statut = 'active' WHERE reference_paiement = $1`,
      [reference]
    );

    // Mettre à jour l'annonce
    await pool.query(
      `UPDATE annonces SET
        est_sponsorisee = true,
        sponsorisee_jusqu_au = $1,
        updated_at = NOW()
       WHERE id = $2`,
      [s.date_fin, s.annonce_id]
    );

    res.json({
      succes: true,
      message: 'Sponsorisation activée !',
      date_fin: s.date_fin
    });

  } catch (erreur) {
    console.error('Erreur activation sponsorisation:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Annuler une sponsorisation expirée (cron job simulé)
const nettoyerSporisationsExpirees = async () => {
  try {
    await pool.query(
      `UPDATE annonces SET
        est_sponsorisee = false,
        sponsorisee_jusqu_au = NULL
       WHERE est_sponsorisee = true
       AND sponsorisee_jusqu_au < NOW()`
    );
    console.log('Sponsorisations expirées nettoyées');
  } catch (erreur) {
    console.error('Erreur nettoyage sponsorisations:', erreur);
  }
};

// Historique des sponsorisations
const getHistorique = async (req, res) => {
  try {
    const sponsorisations = await pool.query(
      `SELECT s.*, a.titre as annonce_titre, a.ville
       FROM sponsorisations s
       JOIN annonces a ON s.annonce_id = a.id
       WHERE s.utilisateur_id = $1
       ORDER BY s.created_at DESC`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      sponsorisations: sponsorisations.rows
    });

  } catch (erreur) {
    console.error('Erreur historique sponsorisations:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Activer manuellement pour test (mode dev)
const activerManuel = async (req, res) => {
  try {
    const { annonce_id, duree_jours } = req.body;

    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + (duree_jours || 7));

    await pool.query(
      `UPDATE annonces SET
        est_sponsorisee = true,
        sponsorisee_jusqu_au = $1,
        updated_at = NOW()
       WHERE id = $2 AND utilisateur_id = $3`,
      [dateFin, annonce_id, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: `Annonce sponsorisée jusqu'au ${dateFin.toLocaleDateString('fr-FR')}`,
      date_fin: dateFin
    });

  } catch (erreur) {
    console.error('Erreur activation manuelle:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getPlans,
  initierSponsorisation,
  activerSponsorisation,
  nettoyerSporisationsExpirees,
  getHistorique,
  activerManuel
};