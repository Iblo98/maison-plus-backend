const express = require('express');
const router = express.Router();
const { getTauxChange, xofVersUsd, usdVersXof } = require('../config/devise');

// Récupérer le taux actuel
router.get('/taux', async (req, res) => {
  try {
    const taux = await getTauxChange();
    res.json({
      succes: true,
      taux: {
        USD_TO_XOF: taux.USD_TO_XOF,
        XOF_TO_USD: taux.XOF_TO_USD,
        derniereMaj: taux.derniereMaj
      }
    });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
});

// Convertir un montant
router.get('/convertir', async (req, res) => {
  try {
    const { montant, de, vers } = req.query;

    if (!montant || !de || !vers) {
      return res.status(400).json({
        succes: false,
        message: 'Paramètres manquants: montant, de, vers'
      });
    }

    let resultat;
    if (de === 'XOF' && vers === 'USD') {
      resultat = await xofVersUsd(parseFloat(montant));
    } else if (de === 'USD' && vers === 'XOF') {
      resultat = await usdVersXof(parseFloat(montant));
    } else {
      return res.status(400).json({
        succes: false,
        message: 'Devises non supportées. Utilisez XOF ou USD'
      });
    }

    res.json({
      succes: true,
      montant_original: parseFloat(montant),
      devise_origine: de,
      montant_converti: resultat,
      devise_cible: vers
    });
  } catch (err) {
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
});

module.exports = router;