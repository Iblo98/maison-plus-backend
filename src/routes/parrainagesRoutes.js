const express = require('express');
const router = express.Router();
const { proteger } = require('../middlewares/authMiddleware');
const {
  getMonCode,
  utiliserCode,
  utiliserCredits
} = require('../controllers/parrainagesController');

router.get('/mon-code', proteger, getMonCode);
router.post('/utiliser-code', proteger, utiliserCode);
router.post('/utiliser-credits', proteger, utiliserCredits);

module.exports = router;