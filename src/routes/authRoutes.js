const express = require('express');
const router = express.Router();
const {
  inscription,
  connexion,
  verifierEmail,
  motDePasseOublie,
  reinitialiserMotDePasse
} = require('../controllers/authController');

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/verifier-email', verifierEmail);
router.post('/mot-de-passe-oublie', motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', reinitialiserMotDePasse);
router.get('/verifier-telephone', async (req, res) => {
  try {
    const { telephone } = req.query;
    const result = await pool.query(
      'SELECT id FROM utilisateurs WHERE telephone = $1',
      [telephone]
    );
    res.json({ existe: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ existe: false });
  }
});

router.get('/verifier-email', async (req, res) => {
  try {
    const { email } = req.query;
    const result = await pool.query(
      'SELECT id FROM utilisateurs WHERE email = $1',
      [email]
    );
    res.json({ existe: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ existe: false });
  }
});


module.exports = router;