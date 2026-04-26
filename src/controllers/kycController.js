const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');

// Upload photo de profil
const uploadPhotoProfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        succes: false,
        message: 'Photo de profil obligatoire'
      });
    }

    if (req.file.size < 50 * 1024) {
      return res.status(400).json({
        succes: false,
        message: 'Photo trop petite — qualité insuffisante'
      });
    }

    const resultat = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `maisonplus/profils/${req.utilisateur.id}`,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    await pool.query(
      'UPDATE utilisateurs SET photo_profil_url = $1, updated_at = NOW() WHERE id = $2',
      [resultat.secure_url, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Photo de profil mise à jour !',
      photo_url: resultat.secure_url
    });

  } catch (erreur) {
    console.error('Erreur upload photo profil:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Upload CNIB ou Passeport
const uploadCNIB = async (req, res) => {
  try {
    if (!req.files || !req.files.recto || !req.files.verso) {
      return res.status(400).json({
        succes: false,
        message: 'Les deux faces de la pièce d\'identité sont obligatoires (recto et verso)'
      });
    }

    // Détection doublon CNIB — vérifier si un autre compte a déjà soumis une CNIB
    const autresComptesAvecCNIB = await pool.query(
      `SELECT id, email, telephone FROM utilisateurs 
       WHERE (cnib_recto_url IS NOT NULL OR cnib_verso_url IS NOT NULL)
       AND id != $1
       AND statut != 'banni'`,
      [req.utilisateur.id]
    );

    if (autresComptesAvecCNIB.rows.length > 0) {
      // Logger pour l'admin sans bloquer
      console.warn(`⚠️ Vérification CNIB : l'utilisateur ${req.utilisateur.id} soumet une CNIB — ${autresComptesAvecCNIB.rows.length} autre(s) compte(s) avec CNIB existants`);
    }

    // Upload recto
    const rectoResultat = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `maisonplus/kyc/${req.utilisateur.id}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.files.recto[0].buffer);
    });

    // Upload verso
    const versoResultat = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `maisonplus/kyc/${req.utilisateur.id}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.files.verso[0].buffer);
    });

    await pool.query(
      `UPDATE utilisateurs SET
        cnib_recto_url = $1,
        cnib_verso_url = $2,
        statut = 'en_attente',
        updated_at = NOW()
       WHERE id = $3`,
      [rectoResultat.secure_url, versoResultat.secure_url, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Documents d\'identité soumis — en attente de vérification par notre équipe.',
      cnib_recto: rectoResultat.secure_url,
      cnib_verso: versoResultat.secure_url
    });

  } catch (erreur) {
    console.error('Erreur upload CNIB:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Enregistrer informations de paiement Mobile Money
const enregistrerPaiement = async (req, res) => {
  try {
    const { mobile_money_numero, mobile_money_operateur } = req.body;

    const operateursValides = [
      'Orange Money', 'MobiCash', 'Telecel Money', 'Coris Money', 'Autre'
    ];

    if (!mobile_money_numero || !mobile_money_operateur) {
      return res.status(400).json({
        succes: false,
        message: 'Numéro et opérateur Mobile Money obligatoires'
      });
    }

    if (!operateursValides.includes(mobile_money_operateur)) {
      return res.status(400).json({
        succes: false,
        message: 'Opérateur non reconnu'
      });
    }

    // Vérifier si ce numéro Mobile Money est déjà utilisé par un autre compte
    const numeroExiste = await pool.query(
      `SELECT id FROM utilisateurs 
       WHERE mobile_money_numero = $1 
       AND id != $2`,
      [mobile_money_numero, req.utilisateur.id]
    );

    if (numeroExiste.rows.length > 0) {
      return res.status(400).json({
        succes: false,
        message: 'Ce numéro Mobile Money est déjà associé à un autre compte'
      });
    }

    await pool.query(
      `UPDATE utilisateurs SET
        mobile_money_numero = $1,
        mobile_money_operateur = $2,
        updated_at = NOW()
       WHERE id = $3`,
      [mobile_money_numero, mobile_money_operateur, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Informations de paiement enregistrées avec succès !'
    });

  } catch (erreur) {
    console.error('Erreur enregistrement paiement:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Vérifier statut KYC
const getStatutKYC = async (req, res) => {
  try {
    const utilisateur = await pool.query(
      `SELECT 
        photo_profil_url,
        cnib_recto_url,
        cnib_verso_url,
        mobile_money_numero,
        mobile_money_operateur,
        email_verifie,
        est_verifie,
        statut
       FROM utilisateurs WHERE id = $1`,
      [req.utilisateur.id]
    );

    const u = utilisateur.rows[0];

    const etapes = {
      email_verifie: u.email_verifie,
      photo_profil: !!u.photo_profil_url,
      cnib_soumise: !!(u.cnib_recto_url && u.cnib_verso_url),
      paiement_configure: !!(u.mobile_money_numero),
      compte_verifie: u.est_verifie
    };

    const progression = Object.values(etapes).filter(Boolean).length;
    const total = Object.keys(etapes).length;

    res.json({
      succes: true,
      statut: u.statut,
      etapes,
      progression: `${progression}/${total}`,
      pourcentage: Math.round((progression / total) * 100)
    });

  } catch (erreur) {
    console.error('Erreur statut KYC:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

// Upload photo de couverture
const uploadPhotoCouverture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        succes: false,
        message: 'Photo de couverture obligatoire'
      });
    }

    const resultat = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `maisonplus/couvertures/${req.utilisateur.id}`,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 400, crop: 'fill' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    await pool.query(
      'UPDATE utilisateurs SET photo_couverture = $1, updated_at = NOW() WHERE id = $2',
      [resultat.secure_url, req.utilisateur.id]
    );

    res.json({
      succes: true,
      message: 'Photo de couverture mise à jour !',
      photo_url: resultat.secure_url
    });

  } catch (erreur) {
    console.error('Erreur upload couverture:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  uploadPhotoProfil,
  uploadPhotoCouverture,
  uploadCNIB,
  enregistrerPaiement,
  getStatutKYC
};