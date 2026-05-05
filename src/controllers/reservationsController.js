const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Créer une réservation
const creerReservation = async (req, res) => {
  try {
    const { annonce_id, date_debut, date_fin, message } = req.body;
    const locataire_id = req.utilisateur.id;

    if (!date_debut || !date_fin) {
      return res.status(400).json({ succes: false, message: 'Dates obligatoires' });
    }

    // Récupérer l'annonce
    const annonce = await pool.query(
      `SELECT a.*, u.email as proprio_email, u.prenom as proprio_prenom
       FROM annonces a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE a.id = $1 AND a.statut = 'publiee'`,
      [annonce_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Annonce introuvable' });
    }

    if (annonce.rows[0].utilisateur_id === locataire_id) {
      return res.status(400).json({
        succes: false,
        message: 'Vous ne pouvez pas réserver votre propre annonce'
      });
    }

    const a = annonce.rows[0];
    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
    const nbJours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));

    if (nbJours <= 0) {
      return res.status(400).json({
        succes: false,
        message: 'La date de fin doit être après la date de début'
      });
    }

    // Vérifier les conflits
    const conflit = await pool.query(
      `SELECT id FROM reservations
       WHERE annonce_id = $1
       AND statut IN ('en_attente', 'confirmee')
       AND (
         (date_debut <= $2 AND date_fin >= $2) OR
         (date_debut <= $3 AND date_fin >= $3) OR
         (date_debut >= $2 AND date_fin <= $3)
       )`,
      [annonce_id, date_debut, date_fin]
    );

    if (conflit.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Ces dates sont déjà réservées'
      });
    }

    // Calculer le prix
    let prixJournalier = parseFloat(a.prix);
    if (a.periode === 'mois') prixJournalier = parseFloat(a.prix) / 30;
    else if (a.periode === 'semaine') prixJournalier = parseFloat(a.prix) / 7;
    else if (a.periode === 'annee') prixJournalier = parseFloat(a.prix) / 365;

    const prixTotal = Math.round(prixJournalier * nbJours);

    // Créer la réservation
    const reservation = await pool.query(
      `INSERT INTO reservations
        (annonce_id, locataire_id, date_debut, date_fin, nb_jours, prix_total, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [annonce_id, locataire_id, date_debut, date_fin, nbJours, prixTotal, message || '']
    );

    // Notifier le propriétaire par email
    const locataire = await pool.query(
      'SELECT prenom, nom, email FROM utilisateurs WHERE id = $1',
      [locataire_id]
    );

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: a.proprio_email,
        subject: `🏠 Nouvelle demande de réservation — ${a.titre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A56DB; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🏠 Maison+</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Bonjour ${a.proprio_prenom} !</h2>
              <p>Vous avez une nouvelle demande de réservation pour <strong>${a.titre}</strong>.</p>
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p><strong>Locataire :</strong> ${locataire.rows[0].prenom} ${locataire.rows[0].nom}</p>
                <p><strong>Dates :</strong> ${new Date(date_debut).toLocaleDateString('fr-FR')} → ${new Date(date_fin).toLocaleDateString('fr-FR')}</p>
                <p><strong>Durée :</strong> ${nbJours} jours</p>
                <p><strong>Prix total :</strong> ${new Intl.NumberFormat('fr-FR').format(prixTotal)} XOF</p>
                ${message ? `<p><strong>Message :</strong> ${message}</p>` : ''}
              </div>
              <a href="${process.env.FRONTEND_URL}/reservations"
                style="display: block; background: #1A56DB; color: white; text-align: center;
                       padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                Gérer la réservation →
              </a>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Erreur email réservation:', emailErr);
    }

    res.status(201).json({
      succes: true,
      message: 'Demande de réservation envoyée !',
      reservation: reservation.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur réservation:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Mes réservations (en tant que locataire)
const getMesReservations = async (req, res) => {
  try {
    const reservations = await pool.query(
      `SELECT r.*, a.titre, a.ville, a.quartier, a.prix, a.periode,
        u.prenom as proprio_prenom, u.nom as proprio_nom,
        (SELECT url FROM medias WHERE annonce_id = a.id
         AND est_principale = true LIMIT 1) as photo_annonce
       FROM reservations r
       JOIN annonces a ON r.annonce_id = a.id
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE r.locataire_id = $1
       ORDER BY r.created_at DESC`,
      [req.utilisateur.id]
    );

    res.json({ succes: true, reservations: reservations.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Réservations reçues (en tant que propriétaire)
const getReservationsRecues = async (req, res) => {
  try {
    const reservations = await pool.query(
      `SELECT r.*, a.titre, a.ville,
        u.prenom as locataire_prenom, u.nom as locataire_nom,
        u.telephone as locataire_telephone, u.email as locataire_email
       FROM reservations r
       JOIN annonces a ON r.annonce_id = a.id
       JOIN utilisateurs u ON r.locataire_id = u.id
       WHERE a.utilisateur_id = $1
       ORDER BY r.created_at DESC`,
      [req.utilisateur.id]
    );

    res.json({ succes: true, reservations: reservations.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Confirmer ou refuser une réservation
const mettreAJourStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['confirmee', 'refusee', 'annulee'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ succes: false, message: 'Statut invalide' });
    }

    // Vérifier que c'est le propriétaire
    const reservation = await pool.query(
      `SELECT r.*, a.utilisateur_id, a.titre,
        u.email as locataire_email, u.prenom as locataire_prenom
       FROM reservations r
       JOIN annonces a ON r.annonce_id = a.id
       JOIN utilisateurs u ON r.locataire_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (reservation.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Réservation introuvable' });
    }

    if (reservation.rows[0].utilisateur_id !== req.utilisateur.id) {
      return res.status(403).json({ succes: false, message: 'Non autorisé' });
    }

    await pool.query(
      'UPDATE reservations SET statut = $1, updated_at = NOW() WHERE id = $2',
      [statut, id]
    );

    // Notifier le locataire
    const r = reservation.rows[0];
    const messages = {
      confirmee: '✅ Votre réservation a été confirmée !',
      refusee: '❌ Votre réservation a été refusée.',
      annulee: '🚫 Votre réservation a été annulée.'
    };

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: r.locataire_email,
        subject: `${messages[statut]} — ${r.titre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <div style="background: #1A56DB; padding: 20px; text-align: center;">
              <h1 style="color: white;">🏠 Maison+</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Bonjour ${r.locataire_prenom} !</h2>
              <p>${messages[statut]}</p>
              <p><strong>Annonce :</strong> ${r.titre}</p>
              <p><strong>Dates :</strong> ${new Date(r.date_debut).toLocaleDateString('fr-FR')} → ${new Date(r.date_fin).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Erreur email:', emailErr);
    }

    res.json({ succes: true, message: `Réservation ${statut}` });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  creerReservation,
  getMesReservations,
  getReservationsRecues,
  mettreAJourStatut
};