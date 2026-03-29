const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const proteger = async (req, res, next) => {
  try {
    // Vérifier si le token existe
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        succes: false,
        message: 'Accès refusé - Token manquant'
      });
    }

    // Extraire le token
    const token = authHeader.split(' ')[1];

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe encore
    const resultat = await pool.query(
      'SELECT id, nom, prenom, email, type_compte, statut FROM utilisateurs WHERE id = $1',
      [decoded.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(401).json({
        succes: false,
        message: 'Utilisateur introuvable'
      });
    }

    // Vérifier que le compte n'est pas banni
    if (resultat.rows[0].statut === 'banni') {
      return res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.utilisateur = resultat.rows[0];
    next();

  } catch (erreur) {
    return res.status(401).json({
      succes: false,
      message: 'Token invalide ou expiré'
    });
  }
};

module.exports = { proteger };