// Validation automatique des données entreprise

const validerRCCM = (rccm) => {
  if (!rccm) return { valide: false, message: 'RCCM manquant' };
  // Format BF-OUA-2024-B-12345 ou formats similaires
  const regex = /^[A-Z]{2}-[A-Z]{2,5}-\d{4}-[A-Z]-\d{3,6}$/i;
  if (!regex.test(rccm.trim())) {
    return { valide: false, message: 'Format RCCM invalide (ex: BF-OUA-2024-B-12345)' };
  }
  return { valide: true };
};

const validerIFU = (ifu) => {
  if (!ifu) return { valide: false, message: 'IFU manquant' };
  // IFU = 10 chiffres au Burkina Faso
  const regex = /^\d{10}$/;
  if (!regex.test(ifu.trim())) {
    return { valide: false, message: 'Format IFU invalide (10 chiffres requis)' };
  }
  return { valide: true };
};

const validerEntreprise = (donnees) => {
  const erreurs = [];
  const avertissements = [];
  let score = 0;

  // Nom entreprise
  if (!donnees.nom_entreprise || donnees.nom_entreprise.trim().length < 3) {
    erreurs.push('Nom d\'entreprise invalide (minimum 3 caractères)');
  } else {
    score += 20;
  }

  // Secteur
  const secteursValides = [
    'immobilier', 'hotellerie', 'auberge',
    'restauration', 'commerce', 'services', 'construction', 'autre'
  ];
  if (!donnees.secteur_activite || !secteursValides.includes(donnees.secteur_activite)) {
    erreurs.push('Secteur d\'activité invalide');
  } else {
    score += 20;
  }

  // RCCM
  if (donnees.rccm) {
    const resultRCCM = validerRCCM(donnees.rccm);
    if (!resultRCCM.valide) {
      avertissements.push(resultRCCM.message);
    } else {
      score += 30;
    }
  } else {
    avertissements.push('RCCM non fourni — recommandé pour la vérification');
  }

  // IFU
  if (donnees.ifu) {
    const resultIFU = validerIFU(donnees.ifu);
    if (!resultIFU.valide) {
      avertissements.push(resultIFU.message);
    } else {
      score += 30;
    }
  } else {
    avertissements.push('IFU non fourni — recommandé pour la vérification');
  }

  // Déterminer le statut
  let statut;
  let badge;
  let message;

  if (erreurs.length > 0) {
    statut = 'rejete';
    badge = false;
    message = `Inscription rejetée : ${erreurs.join(', ')}`;
  } else if (score >= 80) {
    statut = 'verifie';
    badge = true;
    message = 'Compte professionnel vérifié automatiquement ! 🎉';
  } else if (score >= 40) {
    statut = 'en_attente';
    badge = false;
    message = 'Compte créé — en attente de vérification complète (RCCM et IFU requis)';
  } else {
    statut = 'en_attente';
    badge = false;
    message = 'Compte créé — veuillez compléter vos informations professionnelles';
  }

  return {
    valide: erreurs.length === 0,
    statut,
    badge,
    score,
    erreurs,
    avertissements,
    message
  };
};

module.exports = { validerEntreprise, validerRCCM, validerIFU };