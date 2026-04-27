const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Créer une alerte
const creerAlerte = async (req, res) => {
  try {
    const {
      nom, categorie, type_transaction, ville,
      prix_min, prix_max, superficie_min, nb_pieces_min
    } = req.body;
    const utilisateur_id = req.utilisateur.id;

    if (!nom) {
      return res.status(400).json({ succes: false, message: 'Nom de l\'alerte obligatoire' });
    }

    const alerte = await pool.query(
      `INSERT INTO alertes
        (utilisateur_id, nom, categorie, type_transaction, ville,
         prix_min, prix_max, superficie_min, nb_pieces_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [utilisateur_id, nom, categorie || null, type_transaction || null,
       ville || null, prix_min || null, prix_max || null,
       superficie_min || null, nb_pieces_min || null]
    );

    res.status(201).json({
      succes: true,
      message: 'Alerte créée !',
      alerte: alerte.rows[0]
    });
  } catch (erreur) {
    console.error('Erreur création alerte:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer mes alertes
const getMesAlertes = async (req, res) => {
  try {
    const alertes = await pool.query(
      `SELECT * FROM alertes
       WHERE utilisateur_id = $1
       ORDER BY created_at DESC`,
      [req.utilisateur.id]
    );
    res.json({ succes: true, alertes: alertes.rows });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Supprimer une alerte
const supprimerAlerte = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM alertes WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    res.json({ succes: true, message: 'Alerte supprimée' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Activer/désactiver une alerte
const toggleAlerte = async (req, res) => {
  try {
    const alerte = await pool.query(
      `UPDATE alertes SET est_active = NOT est_active
       WHERE id = $1 AND utilisateur_id = $2
       RETURNING *`,
      [req.params.id, req.utilisateur.id]
    );
    res.json({
      succes: true,
      alerte: alerte.rows[0],
      message: alerte.rows[0].est_active ? 'Alerte activée' : 'Alerte désactivée'
    });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Vérifier et envoyer les alertes (appelé automatiquement)
const verifierEtEnvoyerAlertes = async (annonceId) => {
  try {
    // Récupérer l'annonce
    const annonceRes = await pool.query(
      'SELECT * FROM annonces WHERE id = $1',
      [annonceId]
    );
    if (annonceRes.rows.length === 0) return;
    const annonce = annonceRes.rows[0];

    // Trouver les alertes correspondantes
    const alertes = await pool.query(
      `SELECT a.*, u.email, u.prenom, u.nom
       FROM alertes a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE a.est_active = true
       AND a.utilisateur_id != $1
       AND (a.categorie IS NULL OR a.categorie = $2)
       AND (a.type_transaction IS NULL OR a.type_transaction = $3)
       AND (a.ville IS NULL OR LOWER(a.ville) = LOWER($4))
       AND (a.prix_min IS NULL OR $5 >= a.prix_min)
       AND (a.prix_max IS NULL OR $5 <= a.prix_max)`,
      [annonce.utilisateur_id, annonce.categorie,
       annonce.type_transaction, annonce.ville, annonce.prix]
    );

    // Envoyer un email pour chaque alerte
    for (const alerte of alertes.rows) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: alerte.email,
          subject: `🏠 Nouvelle annonce pour votre alerte "${alerte.nom}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A56DB; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🏠 Maison+</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1E293B;">Bonjour ${alerte.prenom} !</h2>
                <p style="color: #64748B;">
                  Une nouvelle annonce correspond à votre alerte <strong>"${alerte.nom}"</strong> :
                </p>
                <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #E2E8F0;">
                  <h3 style="color: #1E293B; margin: 0 0 10px 0;">${annonce.titre}</h3>
                  <p style="color: #64748B; margin: 5px 0;">📍 ${annonce.quartier || ''}, ${annonce.ville}</p>
                  <p style="color: #F97316; font-weight: bold; font-size: 20px; margin: 10px 0;">
                    ${new Intl.NumberFormat('fr-FR').format(annonce.prix)} XOF
                    ${annonce.type_transaction === 'location' ? `/${annonce.periode || 'mois'}` : ''}
                  </p>
                  ${annonce.superficie ? `<p style="color: #64748B;">📐 ${annonce.superficie} m²</p>` : ''}
                </div>
                <a href="${process.env.FRONTEND_URL}/annonces/${annonce.id}"
                  style="display: block; background: #1A56DB; color: white; text-align: center;
                         padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                  Voir l'annonce →
                </a>
              </div>
              <div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 12px;">
                © 2026 MaisonPlus — Vous recevez cet email car vous avez une alerte active.
              </div>
            </div>
          `
        });

        // Mettre à jour la date de dernière notification
        await pool.query(
          'UPDATE alertes SET derniere_notification = NOW() WHERE id = $1',
          [alerte.id]
        );
      } catch (emailErr) {
        console.error('Erreur envoi email alerte:', emailErr);
      }
    }
  } catch (erreur) {
    console.error('Erreur vérification alertes:', erreur);
  }
};

module.exports = {
  creerAlerte,
  getMesAlertes,
  supprimerAlerte,
  toggleAlerte,
  verifierEtEnvoyerAlertes
};