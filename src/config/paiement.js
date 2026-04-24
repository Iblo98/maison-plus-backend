const axios = require('axios');

// ═══════════════════════════════════════
// CALCUL DE COMMISSION PAR ZONE ET PRIX
// ═══════════════════════════════════════
const calculerCommission = (prix, categorie, type_transaction, pays = 'BF') => {
  
  // ZONE 1 — Burkina Faso
  if (pays === 'BF') {
    if (type_transaction === 'location') {
      if (prix < 50000) return { commission: 2000, type: 'fixe', devise: 'XOF' };
      if (prix < 100000) return { commission: 3000, type: 'fixe', devise: 'XOF' };
      if (prix < 200000) return { commission: 5000, type: 'fixe', devise: 'XOF' };
      if (prix < 500000) return { commission: Math.round(prix * 0.03), type: 'pourcentage', taux: 3, devise: 'XOF' };
      return { commission: Math.round(prix * 0.025), type: 'pourcentage', taux: 2.5, devise: 'XOF' };
    }
    if (type_transaction === 'vente') {
      if (prix < 5000000) return { commission: Math.round(prix * 0.015), type: 'pourcentage', taux: 1.5, devise: 'XOF' };
      if (prix < 20000000) return { commission: Math.round(prix * 0.01), type: 'pourcentage', taux: 1, devise: 'XOF' };
      return { commission: Math.round(prix * 0.005), type: 'pourcentage', taux: 0.5, devise: 'XOF' };
    }
    if (categorie === 'hotel') {
      if (prix < 10000) return { commission: 500, type: 'fixe', devise: 'XOF' };
      if (prix < 30000) return { commission: 1000, type: 'fixe', devise: 'XOF' };
      return { commission: Math.round(prix * 0.03), type: 'pourcentage', taux: 3, devise: 'XOF' };
    }
    if (categorie === 'restaurant') {
      return { commission: Math.max(200, Math.round(prix * 0.05)), type: 'pourcentage', taux: 5, devise: 'XOF' };
    }
    if (categorie === 'marketplace') {
      return { commission: Math.max(500, Math.round(prix * 0.03)), type: 'pourcentage', taux: 3, devise: 'XOF' };
    }
  }

  // ZONE 2 — CEDEAO
  const paysCEDEAO = ['CI', 'SN', 'ML', 'NE', 'TG', 'BJ', 'GN'];
  if (paysCEDEAO.includes(pays)) {
    if (type_transaction === 'location') {
      return { commission: Math.max(5000, Math.round(prix * 0.04)), type: 'pourcentage', taux: 4, devise: 'XOF' };
    }
    if (type_transaction === 'vente') {
      return { commission: Math.max(10000, Math.round(prix * 0.015)), type: 'pourcentage', taux: 1.5, devise: 'XOF' };
    }
    if (categorie === 'hotel') {
      return { commission: Math.max(1000, Math.round(prix * 0.05)), type: 'pourcentage', taux: 5, devise: 'XOF' };
    }
    if (categorie === 'restaurant') {
      return { commission: Math.max(500, Math.round(prix * 0.07)), type: 'pourcentage', taux: 7, devise: 'XOF' };
    }
    if (categorie === 'marketplace') {
      return { commission: Math.max(1000, Math.round(prix * 0.05)), type: 'pourcentage', taux: 5, devise: 'XOF' };
    }
  }

  // ZONE 3 — International (prix en USD)
  if (type_transaction === 'location') {
    return { commission: Math.max(10, Math.round(prix * 0.05)), type: 'pourcentage', taux: 5, devise: 'USD' };
  }
  if (type_transaction === 'vente') {
    return { commission: Math.round(prix * 0.02), type: 'pourcentage', taux: 2, devise: 'USD' };
  }
  if (categorie === 'hotel') {
    return { commission: Math.max(5, Math.round(prix * 0.08)), type: 'pourcentage', taux: 8, devise: 'USD' };
  }
  if (categorie === 'restaurant') {
    return { commission: Math.max(2, Math.round(prix * 0.10)), type: 'pourcentage', taux: 10, devise: 'USD' };
  }
  if (categorie === 'marketplace') {
    return { commission: Math.max(3, Math.round(prix * 0.07)), type: 'pourcentage', taux: 7, devise: 'USD' };
  }

  return { commission: Math.round(prix * 0.05), type: 'pourcentage', taux: 5, devise: 'XOF' };
};

// ═══════════════════════════════════════
// DÉTECTER LA ZONE PAR PAYS
// ═══════════════════════════════════════
const getZone = (pays) => {
  if (pays === 'BF') return 1;
  const paysCEDEAO = ['CI', 'SN', 'ML', 'NE', 'TG', 'BJ', 'GN'];
  if (paysCEDEAO.includes(pays)) return 2;
  return 3;
};

// ═══════════════════════════════════════
// CINETPAY — ZONE 1 ET 2
// ═══════════════════════════════════════
const initierPaiementCinetPay = async (donnees) => {
  const {
    montant, devise, description, reference,
    nom, prenom, email, telephone, pays
  } = donnees;

  // Mode test
  const apiKey = process.env.CINETPAY_API_KEY || 'TEST_API_KEY';
  const siteId = process.env.CINETPAY_SITE_ID || 'TEST_SITE_ID';

  const payload = {
    apikey: apiKey,
    site_id: siteId,
    transaction_id: reference,
    amount: montant,
    currency: devise || 'XOF',
    alternative_currency: '',
    description: description,
    customer_id: email,
    customer_name: nom,
    customer_surname: prenom,
    customer_email: email,
    customer_phone_number: telephone,
    customer_address: '',
    customer_city: '',
    customer_country: pays || 'BF',
    customer_state: pays || 'BF',
    customer_zip_code: '',
    notify_url: process.env.CINETPAY_NOTIFY_URL || 'http://localhost:3000/api/paiements/cinetpay/webhook',
    return_url: process.env.CINETPAY_RETURN_URL || 'http://localhost:3001/paiement/succes',
    channels: 'ALL',
    metadata: reference,
    lang: 'fr',
    invoice_data: {}
  };

  try {
    const response = await axios.post(
      process.env.CINETPAY_URL || 'https://api-checkout.cinetpay.com/v2/payment',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (erreur) {
    console.error('Erreur CinetPay:', erreur.response?.data || erreur.message);
    throw erreur;
  }
};

// ═══════════════════════════════════════
// FLUTTERWAVE — ZONE 3
// ═══════════════════════════════════════
const initierPaiementFlutterwave = async (donnees) => {
  const {
    montant, devise, description, reference,
    nom, prenom, email, telephone
  } = donnees;

  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'TEST_SECRET_KEY';

  const payload = {
    tx_ref: reference,
    amount: montant,
    currency: devise || 'USD',
    redirect_url: process.env.FLUTTERWAVE_RETURN_URL || 'http://localhost:3001/paiement/succes',
    customer: {
      email: email,
      phonenumber: telephone,
      name: `${prenom} ${nom}`
    },
    customizations: {
      title: 'Maison+',
      description: description,
      logo: 'https://maisonplus.bf/logo.png'
    },
    meta: {
      reference: reference
    }
  };

  try {
    const response = await axios.post(
      `${process.env.FLUTTERWAVE_URL || 'https://api.flutterwave.com/v3'}/payments`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (erreur) {
    console.error('Erreur Flutterwave:', erreur.response?.data || erreur.message);
    throw erreur;
  }
};

// ═══════════════════════════════════════
// VÉRIFIER PAIEMENT CINETPAY
// ═══════════════════════════════════════
const verifierPaiementCinetPay = async (transactionId) => {
  const apiKey = process.env.CINETPAY_API_KEY || 'TEST_API_KEY';
  const siteId = process.env.CINETPAY_SITE_ID || 'TEST_SITE_ID';

  try {
    const response = await axios.post(
      'https://api-checkout.cinetpay.com/v2/payment/check',
      {
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (erreur) {
    console.error('Erreur vérification CinetPay:', erreur.message);
    throw erreur;
  }
};

// ═══════════════════════════════════════
// VÉRIFIER PAIEMENT FLUTTERWAVE
// ═══════════════════════════════════════
const verifierPaiementFlutterwave = async (transactionId) => {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'TEST_SECRET_KEY';

  try {
    const response = await axios.get(
      `${process.env.FLUTTERWAVE_URL || 'https://api.flutterwave.com/v3'}/transactions/${transactionId}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (erreur) {
    console.error('Erreur vérification Flutterwave:', erreur.message);
    throw erreur;
  }
};

module.exports = {
  calculerCommission,
  getZone,
  initierPaiementCinetPay,
  initierPaiementFlutterwave,
  verifierPaiementCinetPay,
  verifierPaiementFlutterwave
};