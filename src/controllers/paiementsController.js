const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { creerNotification } = require('./notificationsController');
const { genererRecuPaiement } = require('../config/documents');
const nodemailer = require('nodemailer');

// Initier un paiement — Mode simulation
const initierPaiement = async (req, res) => {
  try {
    const { annonce_id, vendeur_id } = req.body;
    const acheteur_id = req.utilisateur.id;

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
    const commission = Math.round(parseFloat(a.prix) * 0.05);
    const montantVendeur = parseFloat(a.prix) - commission;
    const reference = `MP-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now()}`;

    // Notifications en arrière-plan
    creerNotification(
      acheteur_id,
      'paiement',
      '✅ Paiement simulé confirmé !',
      `Votre paiement de ${parseFloat(a.prix).toLocaleString('fr-FR')} XOF pour "${a.titre}" a été confirmé.`,
      `/annonces/${annonce_id}`
    ).catch(console.error);

    creerNotification(
      vendeur_id || a.utilisateur_id,
      'paiement',
      '💰 Paiement reçu !',
      `Vous avez reçu ${montantVendeur.toLocaleString('fr-FR')} XOF pour "${a.titre}".`,
      `/dashboard`
    ).catch(console.error);

    res.json({
      succes: true,
      reference,
      zone: 1,
      systeme: 'Simulation',
      montant: parseFloat(a.prix),
      commission,
      montant_vendeur: montantVendeur,
      devise: 'XOF',
      url_paiement: null,
      details: {
        type_commission: 'pourcentage',
        taux: '5%',
        commission_xof: `${commission.toLocaleString('fr-FR')} XOF`,
        vendeur_recoit: `${montantVendeur.toLocaleString('fr-FR')} XOF`
      }
    });

  } catch (erreur) {
    console.error('Erreur initiation paiement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Vérifier statut paiement
const verifierStatutPaiement = async (req, res) => {
  try {
    const { reference } = req.params;
    res.json({ succes: true, statut: 'simule', reference });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Historique des paiements
const getHistoriquePaiements = async (req, res) => {
  try {
    res.json({ succes: true, total: 0, paiements: [] });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Calculer commission
const getCommission = async (req, res) => {
  try {
    const { prix, categorie, type_transaction, pays } = req.query;

    if (!prix || !categorie || !type_transaction) {
      return res.status(400).json({
        succes: false,
        message: 'Prix, catégorie et type de transaction obligatoires'
      });
    }

    const prixNum = parseFloat(prix);
    const commission = Math.round(prixNum * 0.05);
    const montantVendeur = prixNum - commission;

    res.json({
      succes: true,
      zone: 1,
      systeme: 'Simulation',
      prix: prixNum,
      commission,
      montant_vendeur: montantVendeur,
      devise: 'XOF',
      type_commission: 'pourcentage',
      taux: '5%'
    });

  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Webhook CinetPay (placeholder)
const webhookCinetPay = async (req, res) => {
  res.json({ succes: true });
};

// Webhook Flutterwave (placeholder)
const webhookFlutterwave = async (req, res) => {
  res.json({ succes: true });
};

// Télécharger reçu PDF
const telechargerRecu = async (req, res) => {
  try {
    const { reference } = req.params;
    res.json({ succes: false, message: 'Reçu non disponible en mode simulation' });
  } catch (erreur) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Envoyer reçu par email
const envoyerRecuEmail = async (req, res) => {
  try {
    res.json({ succes: false, message: 'Reçu email non disponible en mode simulation' });
  } catch (erreur) {
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