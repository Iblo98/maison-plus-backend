const pool = require('../config/database');

// Calculer et mettre à jour les badges d'un utilisateur
const calculerBadges = async (utilisateur_id) => {
  try {
    const user = await pool.query(
      `SELECT u.*,
        (SELECT COUNT(*) FROM annonces WHERE utilisateur_id = u.id AND statut = 'publiee') as nb_annonces,
        (SELECT COUNT(*) FROM paiements WHERE vendeur_id = u.id AND statut = 'complete') as nb_ventes,
        (SELECT AVG(note) FROM avis WHERE vendeur_id = u.id) as note_moyenne,
        (SELECT COUNT(*) FROM avis WHERE vendeur_id = u.id) as nb_avis
       FROM utilisateurs u WHERE u.id = $1`,
      [utilisateur_id]
    );

    if (user.rows.length === 0) return;
    const u = user.rows[0];

    const badges = [];
    let score = 0;

    // Badge Email vérifié
    if (u.email_verifie) {
      badges.push({ id: 'email_verifie', label: 'Email vérifié', icone: '✉️', couleur: 'blue' });
      score += 10;
    }

    // Badge Téléphone vérifié
    if (u.telephone) {
      badges.push({ id: 'telephone_verifie', label: 'Téléphone vérifié', icone: '📱', couleur: 'green' });
      score += 10;
    }

    // Badge CNIB vérifiée
    if (u.cnib_recto_url && u.cnib_verso_url) {
      badges.push({ id: 'identite_verifiee', label: 'Identité vérifiée', icone: '🪪', couleur: 'purple' });
      score += 20;
    }

    // Badge Mobile Money configuré
    if (u.mobile_money_numero) {
      badges.push({ id: 'paiement_verifie', label: 'Paiement vérifié', icone: '💳', couleur: 'orange' });
      score += 10;
    }

    // Badge Propriétaire certifié (admin a validé)
    if (u.est_verifie) {
      badges.push({ id: 'proprietaire_certifie', label: 'Propriétaire certifié', icone: '✅', couleur: 'green' });
      score += 30;
    }

    // Badge Photo de profil
    if (u.photo_profil_url) {
      badges.push({ id: 'photo_profil', label: 'Photo de profil', icone: '📸', couleur: 'blue' });
      score += 5;
    }

    // Badge Vendeur actif (au moins 3 annonces)
    if (parseInt(u.nb_annonces) >= 3) {
      badges.push({ id: 'vendeur_actif', label: 'Vendeur actif', icone: '🏠', couleur: 'blue' });
      score += 10;
    }

    // Badge Vendeur expérimenté (au moins 5 ventes)
    if (parseInt(u.nb_ventes) >= 5) {
      badges.push({ id: 'vendeur_experimente', label: 'Vendeur expérimenté', icone: '⭐', couleur: 'yellow' });
      score += 20;
    }

    // Badge Bien noté (note >= 4.5)
    if (parseFloat(u.note_moyenne) >= 4.5 && parseInt(u.nb_avis) >= 3) {
      badges.push({ id: 'bien_note', label: 'Très bien noté', icone: '🌟', couleur: 'yellow' });
      score += 15;
    }

    // Badge Top vendeur (score >= 80)
    if (score >= 80) {
      badges.push({ id: 'top_vendeur', label: 'Top vendeur', icone: '🏆', couleur: 'gold' });
    }

    // Mettre à jour les badges et le score
    await pool.query(
      'UPDATE utilisateurs SET badges = $1, score_confiance = $2 WHERE id = $3',
      [JSON.stringify(badges), score, utilisateur_id]
    );

    return { badges, score };
  } catch (erreur) {
    console.error('Erreur calcul badges:', erreur);
  }
};

// Récupérer les badges d'un utilisateur
const getBadges = async (req, res) => {
  try {
    const { utilisateur_id } = req.params;

    // Recalculer les badges
    const result = await calculerBadges(utilisateur_id);

    res.json({
      succes: true,
      badges: result?.badges || [],
      score_confiance: result?.score || 0
    });
  } catch (erreur) {
    console.error('Erreur récupération badges:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Récupérer mes badges
const getMesBadges = async (req, res) => {
  try {
    const result = await calculerBadges(req.utilisateur.id);

    res.json({
      succes: true,
      badges: result?.badges || [],
      score_confiance: result?.score || 0
    });
  } catch (erreur) {
    console.error('Erreur récupération mes badges:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = { getBadges, getMesBadges, calculerBadges };