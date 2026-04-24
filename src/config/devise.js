const axios = require('axios');

// Taux de change par défaut (si l'API est indisponible)
let tauxCache = {
  USD_TO_XOF: 600,
  XOF_TO_USD: 1 / 600,
  derniereMaj: null
};

// Récupérer le taux de change en temps réel
const getTauxChange = async () => {
  try {
    // Vérifier si le cache est récent (moins de 1 heure)
    if (tauxCache.derniereMaj &&
        (Date.now() - tauxCache.derniereMaj) < 3600000) {
      return tauxCache;
    }

    // API gratuite de taux de change
    const response = await axios.get(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );

    const taux = response.data.rates;
    const xofParUsd = taux.XOF || 600;

    tauxCache = {
      USD_TO_XOF: xofParUsd,
      XOF_TO_USD: 1 / xofParUsd,
      EUR_TO_XOF: taux.XOF / taux.EUR,
      derniereMaj: Date.now()
    };

    return tauxCache;
  } catch (erreur) {
    console.error('Erreur récupération taux:', erreur.message);
    return tauxCache;
  }
};

// Convertir XOF vers USD
const xofVersUsd = async (montantXOF) => {
  const taux = await getTauxChange();
  return Math.round(montantXOF * taux.XOF_TO_USD * 100) / 100;
};

// Convertir USD vers XOF
const usdVersXof = async (montantUSD) => {
  const taux = await getTauxChange();
  return Math.round(montantUSD * taux.USD_TO_XOF);
};

// Formater le prix avec les deux devises
const formaterPrixDouble = async (montantXOF) => {
  const usd = await xofVersUsd(montantXOF);
  return {
    xof: montantXOF,
    usd: usd,
    xof_formate: new Intl.NumberFormat('fr-FR').format(montantXOF) + ' XOF',
    usd_formate: '$' + usd.toFixed(2)
  };
};

module.exports = {
  getTauxChange,
  xofVersUsd,
  usdVersXof,
  formaterPrixDouble
};