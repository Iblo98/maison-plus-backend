const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const {
  envoyerEmailVerification,
  envoyerEmailReinitialisation,
  envoyerEmailBienvenue
} = require('../config/email');

// Inscription
const inscription = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe } = req.body;

    if (!nom || !prenom || !email || !telephone || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Tous les champs sont obligatoires'
      });
    }

    if (mot_de_passe.length < 8) {
      return res.status(400).json({
        succes: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Vérifier email existant
    const emailExiste = await pool.query(
      'SELECT id FROM utilisateurs WHERE email = $1',
      [email]
    );
    if (emailExiste.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier téléphone existant
    const telExiste = await pool.query(
      'SELECT id FROM utilisateurs WHERE telephone = $1',
      [telephone]
    );
    if (telExiste.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Ce numéro de téléphone est déjà utilisé'
      });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 12);

    // Générer token de vérification email
    const emailToken = crypto.randomBytes(32).toString('hex');
    const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Créer l'utilisateur
    const nouvelUtilisateur = await pool.query(
      `INSERT INTO utilisateurs 
        (nom, prenom, email, telephone, mot_de_passe,
         email_verification_token, email_verification_expires, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente')
       RETURNING id, nom, prenom, email, telephone, type_compte, statut`,
      [nom, prenom, email, telephone, motDePasseChiffre,
       emailToken, emailTokenExpires]
    );

    const utilisateur = nouvelUtilisateur.rows[0];

    // Envoyer email de vérification
    try {
      await envoyerEmailVerification(email, prenom, emailToken);
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr);
    }

    // Générer token JWT
    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      succes: true,
      message: 'Compte créé ! Vérifiez votre email pour activer votre compte.',
      token,
      utilisateur
    });

  } catch (erreur) {
    console.error('Erreur inscription:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Vérification email
const verifierEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        succes: false,
        message: 'Token manquant'
      });
    }

    const utilisateur = await pool.query(
      `SELECT * FROM utilisateurs 
       WHERE email_verification_token = $1 
       AND email_verification_expires > NOW()`,
      [token]
    );

    if (utilisateur.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Token invalide ou expiré'
      });
    }

    await pool.query(
      `UPDATE utilisateurs SET
        email_verifie = true,
        statut = 'actif',
        email_verification_token = NULL,
        email_verification_expires = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [utilisateur.rows[0].id]
    );

    // Envoyer email de bienvenue
    try {
      await envoyerEmailBienvenue(
        utilisateur.rows[0].email,
        utilisateur.rows[0].prenom
      );
    } catch (err) {
      console.error('Erreur email bienvenue:', err);
    }

    res.json({
      succes: true,
      message: 'Email vérifié avec succès ! Votre compte est maintenant actif.'
    });

  } catch (erreur) {
    console.error('Erreur vérification email:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Connexion
const connexion = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Email et mot de passe obligatoires'
      });
    }

    const resultat = await pool.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (resultat.rows.length === 0) {
      return res.status(401).json({
        succes: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const utilisateur = resultat.rows[0];

    const motDePasseValide = await bcrypt.compare(
      mot_de_passe,
      utilisateur.mot_de_passe
    );

    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (utilisateur.statut === 'banni') {
      return res.status(403).json({
        succes: false,
        message: 'Votre compte a été banni'
      });
    }

    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      succes: true,
      message: 'Connexion réussie !',
      token,
      emailVerifie: utilisateur.email_verifie,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        type_compte: utilisateur.type_compte,
        statut: utilisateur.statut,
        est_verifie: utilisateur.est_verifie,
        photo_profil: utilisateur.photo_profil_url
      }
    });

  } catch (erreur) {
    console.error('Erreur connexion:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Mot de passe oublié
const motDePasseOublie = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        succes: false,
        message: 'Email obligatoire'
      });
    }

    const utilisateur = await pool.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email]
    );

    // On répond toujours OK pour ne pas révéler si l'email existe
    if (utilisateur.rows.length === 0) {
      return res.json({
        succes: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await pool.query(
      `UPDATE utilisateurs SET
        reset_password_token = $1,
        reset_password_expires = $2,
        updated_at = NOW()
       WHERE email = $3`,
      [resetToken, resetExpires, email]
    );

    try {
      await envoyerEmailReinitialisation(
        email,
        utilisateur.rows[0].prenom,
        resetToken
      );
    } catch (err) {
      console.error('Erreur email réinitialisation:', err);
    }

    res.json({
      succes: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
    });

  } catch (erreur) {
    console.error('Erreur mot de passe oublié:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Réinitialiser le mot de passe
const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { token, nouveau_mot_de_passe } = req.body;

    if (!token || !nouveau_mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Token et nouveau mot de passe obligatoires'
      });
    }

    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({
        succes: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    const utilisateur = await pool.query(
      `SELECT * FROM utilisateurs 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW()`,
      [token]
    );

    if (utilisateur.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Token invalide ou expiré'
      });
    }

    const motDePasseChiffre = await bcrypt.hash(nouveau_mot_de_passe, 12);

    await pool.query(
      `UPDATE utilisateurs SET
        mot_de_passe = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = NOW()
       WHERE id = $2`,
      [motDePasseChiffre, utilisateur.rows[0].id]
    );

    res.json({
      succes: true,
      message: 'Mot de passe réinitialisé avec succès !'
    });

  } catch (erreur) {
    console.error('Erreur réinitialisation:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = {
  inscription,
  connexion,
  verifierEmail,
  motDePasseOublie,
  reinitialiserMotDePasse
};