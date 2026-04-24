const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const {
  calculerCommission,
  getZone,
  initierPaiementCinetPay,
  initierPaiementFlutterwave,
  verifierPaiementCinetPay,
  verifierPaiementFlutterwave
} = require('../config/paiement');
const { creerNotification } = require('./notificationsController');
const { genererPDFInscription } = require('../config/documents');
const { envoyerConfirmationInscription } = require('../config/email');

const { genererRecuPaiement } = require('../config/documents');
const { envoyerConfirmationInscription } = require('../config/email');
const nodemailer = require('nodemailer');
// Initier un paiement
const initierPaiement = async (req, res) => {
  try {
    const { annonce_id, vendeur_id } = req.body;
    const acheteur_id = req.utilisateur.id;

    // Récupérer l'annonce
    const annonce = await pool.query(
      `SELECT a.*, u.pays, u.email, u.nom, u.prenom, u.telephone
       FROM annonces a
       JOIN utilisateurs u ON a.utilisateur_id = u.id
       WHERE a.id = $1`,
      [annonce_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Annonce introuvable' });
    }

    const a = annonce.rows[0];

    // Récupérer infos acheteur
    const acheteur = await pool.query(
      'SELECT * FROM utilisateurs WHERE id = $1',
      [acheteur_id]
    );
    const ach = acheteur.rows[0];

    // Calculer commission
    const pays = ach.pays || 'BF';
    const zone = getZone(pays);
    const { commission, type, taux, devise } = calculerCommission(
      a.prix, a.categorie, a.type_transaction, pays
    );
    const montantVendeur = a.prix - commission;

    // Générer référence unique
    const reference = `MP-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;

    // Créer le paiement en base
    const paiement = await pool.query(
      `INSERT INTO paiements
        (annonce_id, acheteur_id, vendeur_id, montant, devise,
         commission_plateforme, taux_commission, statut, reference_transaction, zone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente', $8, $9)
       RETURNING *`,
      [annonce_id, acheteur_id, vendeur_id || a.utilisateur_id,
       a.prix, devise, commission, taux || 0, reference, zone]
    );

    const paiementId = paiement.rows[0].id;

    // Initier paiement selon la zone
    let reponse;
    if (zone <= 2) {
      reponse = await initierPaiementCinetPay({
        montant: a.prix,
        devise,
        description: `Paiement pour : ${a.titre}`,
        reference,
        nom: ach.nom,
        prenom: ach.prenom,
        email: ach.email,
        telephone: ach.telephone,
        pays
      });
    } else {
      reponse = await initierPaiementFlutterwave({
        montant: a.prix,
        devise,
        description: `Paiement pour : ${a.titre}`,
        reference,
        nom: ach.nom,
        prenom: ach.prenom,
        email: ach.email,
        telephone: ach.telephone
      });
    }

    res.json({
      succes: true,
      paiement_id: paiementId,
      reference,
      zone,
      systeme: zone <= 2 ? 'CinetPay' : 'Flutterwave',
      montant: a.prix,
      commission,
      montant_vendeur: montantVendeur,
      devise,
      url_paiement: reponse?.data?.payment_url || reponse?.data?.link || null,
      details: {
        type_commission: type,
        taux: taux ? `${taux}%` : 'Fixe',
        commission_xof: `${commission.toLocaleString('fr-FR')} ${devise}`,
        vendeur_recoit: `${montantVendeur.toLocaleString('fr-FR')} ${devise}`
      }
    });

  } catch (erreur) {
    console.error('Erreur initiation paiement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Webhook CinetPay
const webhookCinetPay = async (req, res) => {
  try {
    const { transaction_id, status } = req.body;

    if (status === 'ACCEPTED') {
      await traiterPaiementReussi(transaction_id, 'cinetpay');
    }

    res.json({ succes: true });
  } catch (erreur) {
    console.error('Erreur webhook CinetPay:', erreur);
    res.status(500).json({ succes: false });
  }
};

// Webhook Flutterwave
const webhookFlutterwave = async (req, res) => {
  try {
    const { data } = req.body;

    if (data?.status === 'successful') {
      await traiterPaiementReussi(data.tx_ref, 'flutterwave');
    }

    res.json({ succes: true });
  } catch (erreur) {
    console.error('Erreur webhook Flutterwave:', erreur);
    res.status(500).json({ succes: false });
  }
};

// Traiter un paiement réussi
const traiterPaiementReussi = async (reference, systeme) => {
  try {
    // Récupérer le paiement
    const paiement = await pool.query(
      `SELECT p.*, a.titre as annonce_titre,
        u_acheteur.email as acheteur_email,
        u_acheteur.nom as acheteur_nom,
        u_acheteur.prenom as acheteur_prenom,
        u_vendeur.email as vendeur_email,
        u_vendeur.nom as vendeur_nom,
        u_vendeur.prenom as vendeur_prenom
       FROM paiements p
       JOIN annonces a ON p.annonce_id = a.id
       JOIN utilisateurs u_acheteur ON p.acheteur_id = u_acheteur.id
       JOIN utilisateurs u_vendeur ON p.vendeur_id = u_vendeur.id
       WHERE p.reference_transaction = $1`,
      [reference]
    );

    if (paiement.rows.length === 0) return;

    const p = paiement.rows[0];

    // Mettre à jour le statut
    await pool.query(
      `UPDATE paiements SET
        statut = 'complete',
        methode_paiement = $1,
        updated_at = NOW()
       WHERE reference_transaction = $2`,
      [systeme, reference]
    );

    // Notification acheteur
    await creerNotification(
      p.acheteur_id,
      'paiement',
      'Paiement confirme !',
      `Votre paiement de ${p.montant.toLocaleString('fr-FR')} ${p.devise} pour "${p.annonce_titre}" a ete confirme.`,
      `/annonces/${p.annonce_id}`
    );

    // Notification vendeur
    await creerNotification(
      p.vendeur_id,
      'paiement',
      'Paiement recu !',
      `Vous avez recu un paiement de ${(p.montant - p.commission_plateforme).toLocaleString('fr-FR')} ${p.devise} pour "${p.annonce_titre}".`,
      `/dashboard`
    );

    console.log(`Paiement ${reference} traite avec succes`);
  } catch (erreur) {
    console.error('Erreur traitement paiement:', erreur);
  }
};

// Vérifier statut paiement
const verifierStatutPaiement = async (req, res) => {
  try {
    const { reference } = req.params;

    const paiement = await pool.query(
      `SELECT p.*, a.titre as annonce_titre
       FROM paiements p
       JOIN annonces a ON p.annonce_id = a.id
       WHERE p.reference_transaction = $1
       AND (p.acheteur_id = $2 OR p.vendeur_id = $2)`,
      [reference, req.utilisateur.id]
    );

    if (paiement.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Paiement introuvable' });
    }

    res.json({ succes: true, paiement: paiement.rows[0] });

  } catch (erreur) {
    console.error('Erreur vérification paiement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Historique des paiements
const getHistoriquePaiements = async (req, res) => {
  try {
    const paiements = await pool.query(
      `SELECT p.*, a.titre as annonce_titre, a.categorie,
        u_acheteur.nom as acheteur_nom, u_acheteur.prenom as acheteur_prenom,
        u_vendeur.nom as vendeur_nom, u_vendeur.prenom as vendeur_prenom
       FROM paiements p
       JOIN annonces a ON p.annonce_id = a.id
       JOIN utilisateurs u_acheteur ON p.acheteur_id = u_acheteur.id
       JOIN utilisateurs u_vendeur ON p.vendeur_id = u_vendeur.id
       WHERE p.acheteur_id = $1 OR p.vendeur_id = $1
       ORDER BY p.created_at DESC`,
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      total: paiements.rows.length,
      paiements: paiements.rows
    });

  } catch (erreur) {
    console.error('Erreur historique paiements:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Calculer commission (endpoint public)
const getCommission = async (req, res) => {
  try {
    const { prix, categorie, type_transaction, pays } = req.query;

    if (!prix || !categorie || !type_transaction) {
      return res.status(400).json({
        succes: false,
        message: 'Prix, catégorie et type de transaction obligatoires'
      });
    }

    const zone = getZone(pays || 'BF');
    const { commission, type, taux, devise } = calculerCommission(
      parseFloat(prix), categorie, type_transaction, pays || 'BF'
    );

    res.json({
      succes: true,
      zone,
      systeme: zone <= 2 ? 'CinetPay' : 'Flutterwave',
      prix: parseFloat(prix),
      commission,
      montant_vendeur: parseFloat(prix) - commission,
      devise,
      type_commission: type,
      taux: taux ? `${taux}%` : 'Fixe'
    });

  } catch (erreur) {
    console.error('Erreur calcul commission:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// Générer et télécharger le reçu PDF
const telechargerRecu = async (req, res) => {
  try {
    const { reference } = req.params;

    const paiement = await pool.query(
      `SELECT p.*,
        a.titre as annonce_titre, a.categorie, a.type_transaction, a.ville,
        u_acheteur.nom as acheteur_nom, u_acheteur.prenom as acheteur_prenom,
        u_acheteur.email as acheteur_email,
        u_vendeur.nom as vendeur_nom, u_vendeur.prenom as vendeur_prenom,
        u_vendeur.email as vendeur_email
       FROM paiements p
       JOIN annonces a ON p.annonce_id = a.id
       JOIN utilisateurs u_acheteur ON p.acheteur_id = u_acheteur.id
       JOIN utilisateurs u_vendeur ON p.vendeur_id = u_vendeur.id
       WHERE p.reference_transaction = $1
       AND (p.acheteur_id = $2 OR p.vendeur_id = $2)`,
      [reference, req.utilisateur.id]
    );

    if (paiement.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Paiement introuvable'
      });
    }

    const pdfBuffer = await genererRecuPaiement(paiement.rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="recu_${reference}.pdf"`);
    res.send(pdfBuffer);

  } catch (erreur) {
    console.error('Erreur génération reçu:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Envoyer reçu par email
const envoyerRecuEmail = async (req, res) => {
  try {
    const { reference } = req.params;

    const paiement = await pool.query(
      `SELECT p.*,
        a.titre as annonce_titre, a.categorie, a.type_transaction, a.ville,
        u_acheteur.nom as acheteur_nom, u_acheteur.prenom as acheteur_prenom,
        u_acheteur.email as acheteur_email,
        u_vendeur.nom as vendeur_nom, u_vendeur.prenom as vendeur_prenom,
        u_vendeur.email as vendeur_email
       FROM paiements p
       JOIN annonces a ON p.annonce_id = a.id
       JOIN utilisateurs u_acheteur ON p.acheteur_id = u_acheteur.id
       JOIN utilisateurs u_vendeur ON p.vendeur_id = u_vendeur.id
       WHERE p.reference_transaction = $1`,
      [reference]
    );

    if (paiement.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Paiement introuvable'
      });
    }

    const p = paiement.rows[0];
    const pdfBuffer = await genererRecuPaiement(p);

    // Envoyer à l'acheteur et au vendeur
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const montantTotal = parseFloat(p.montant || 0);
    const commission = parseFloat(p.commission_plateforme || 0);
    const montantVendeur = montantTotal - commission;
    const devise = p.devise || 'XOF';

    const emailOptions = {
      from: process.env.EMAIL_FROM,
      subject: `Maison+ — Reçu de paiement ${p.reference_transaction}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="color: #16A34A;">✓ Paiement confirmé !</h2>
            <p style="color: #64748b;">Votre reçu de paiement est joint en pièce jointe.</p>
            <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0; color: #64748b;">Référence : <strong>${p.reference_transaction}</strong></p>
              <p style="margin: 4px 0; color: #64748b;">Annonce : <strong>${p.annonce_titre}</strong></p>
              <p style="margin: 4px 0; color: #64748b;">Montant : <strong>${montantTotal.toLocaleString('fr-FR')} ${devise}</strong></p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              © 2026 MaisonPlus
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `recu_${p.reference_transaction}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    // Envoyer à l'acheteur
    await transporter.sendMail({
      ...emailOptions,
      to: p.acheteur_email
    });

    // Envoyer au vendeur avec montant reçu
    await transporter.sendMail({
      ...emailOptions,
      to: p.vendeur_email,
      subject: `Maison+ — Vous avez reçu un paiement — ${p.reference_transaction}`,
      html: emailOptions.html.replace(
        `Montant : <strong>${montantTotal.toLocaleString('fr-FR')} ${devise}</strong>`,
        `Montant reçu : <strong>${montantVendeur.toLocaleString('fr-FR')} ${devise}</strong>`
      )
    });

    res.json({
      succes: true,
      message: 'Reçu envoyé par email aux deux parties !'
    });

  } catch (erreur) {
    console.error('Erreur envoi reçu email:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  initierPaiement,
  webhookCinetPay,
  webhookFlutterwave,
  verifierStatutPaiement,
  getHistoriquePaiements,
  getCommission,
  telechargerRecu,
  envoyerRecuEmail
};