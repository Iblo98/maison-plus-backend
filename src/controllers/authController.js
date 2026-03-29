const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

// Inscription
const inscription = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!nom || !prenom || !email || !telephone || !mot_de_passe) {
      return res.status(400).json({
        succes: false,
        message: 'Tous les champs sont obligatoires'
      });
    }

    // Vérifier si l'email existe déjà
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

    // Vérifier si le téléphone existe déjà
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

    // Créer l'utilisateur
    const nouvelUtilisateur = await pool.query(
      `INSERT INTO utilisateurs 
        (nom, prenom, email, telephone, mot_de_passe) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nom, prenom, email, telephone, type_compte, statut, created_at`,
      [nom, prenom, email, telephone, motDePasseChiffre]
    );

    const utilisateur = nouvelUtilisateur.rows[0];

    // Générer le token JWT
    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      succes: true,
      message: 'Compte créé avec succès !',
      token,
      utilisateur
    });

  } catch (erreur) {
    console.error('Erreur inscription:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur, réessayez plus tard'
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

    // Chercher l'utilisateur
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

    // Vérifier le mot de passe
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

    // Générer le token
    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      succes: true,
      message: 'Connexion réussie !',
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        type_compte: utilisateur.type_compte,
        statut: utilisateur.statut
      }
    });

  } catch (erreur) {
    console.error('Erreur connexion:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur, réessayez plus tard'
    });
  }
};

module.exports = { inscription, connexion };