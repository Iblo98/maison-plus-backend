const pool = require('../config/database');

// Mots suspects pour la modération
const MOTS_SUSPECTS = [
  'arnaque', 'escroquerie', 'virement', 'western union',
  'moneygram', 'bitcoin', 'crypto', 'urgent', 'secret',
  'whatsapp', 'telegram', 'signal'
];

const LIENS_SUSPECTS = /https?:\/\/|www\.|\.com|\.net|\.org/gi;

// Vérifier si un message est suspect
const estSuspect = (contenu) => {
  const contenuMin = contenu.toLowerCase();
  const motTrouve = MOTS_SUSPECTS.some(mot => contenuMin.includes(mot));
  const lienTrouve = LIENS_SUSPECTS.test(contenu);
  return motTrouve || lienTrouve;
};

// Envoyer un message
const envoyerMessage = async (req, res) => {
  try {
    const { annonce_id, destinataire_id, contenu } = req.body;

    if (!annonce_id || !destinataire_id || !contenu) {
      return res.status(400).json({
        succes: false,
        message: 'Annonce, destinataire et contenu sont obligatoires'
      });
    }

    // Vérifier que l'annonce existe
    const annonce = await pool.query(
      'SELECT * FROM annonces WHERE id = $1',
      [annonce_id]
    );

    if (annonce.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Annonce introuvable'
      });
    }
// Empêcher l'acheteur de contacter lui-même son annonce
if (annonce.rows[0].utilisateur_id === req.utilisateur.id && 
    annonce.rows[0].utilisateur_id === destinataire_id) {
  return res.status(400).json({
    succes: false,
    message: 'Vous ne pouvez pas vous contacter vous-même'
  });
}
    
    // Vérifier que c'est bien l'acheteur qui initie (pas le propriétaire)
    const conversationExiste = await pool.query(
      `SELECT * FROM messages 
       WHERE annonce_id = $1 
       AND ((expediteur_id = $2 AND destinataire_id = $3)
       OR (expediteur_id = $3 AND destinataire_id = $2))`,
      [annonce_id, req.utilisateur.id, destinataire_id]
    );

    // Si première fois, vérifier que c'est l'acheteur qui initie
    if (conversationExiste.rows.length === 0) {
      if (annonce.rows[0].utilisateur_id !== destinataire_id) {
        return res.status(400).json({
          succes: false,
          message: 'Seul l\'acheteur peut initier une conversation'
        });
      }
    }

    // Vérifier si le message est suspect
    const suspect = estSuspect(contenu);

    if (suspect) {
      return res.status(400).json({
        succes: false,
        message: 'Message non envoyé — contenu suspect détecté. Évitez les liens et mots liés aux arnaques.'
      });
    }

    // Enregistrer le message
    const message = await pool.query(
      `INSERT INTO messages 
        (annonce_id, expediteur_id, destinataire_id, contenu, est_suspect)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [annonce_id, req.utilisateur.id, destinataire_id, contenu, suspect]
    );

    res.status(201).json({
      succes: true,
      message: 'Message envoyé !',
      data: message.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur envoi message:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer une conversation
const getConversation = async (req, res) => {
  try {
    const { annonce_id, utilisateur_id } = req.params;

    const messages = await pool.query(
      `SELECT m.*, 
        e.nom as expediteur_nom, e.prenom as expediteur_prenom,
        e.photo_profil as expediteur_photo,
        d.nom as destinataire_nom, d.prenom as destinataire_prenom
       FROM messages m
       JOIN utilisateurs e ON m.expediteur_id = e.id
       JOIN utilisateurs d ON m.destinataire_id = d.id
       WHERE m.annonce_id = $1
       AND ((m.expediteur_id = $2 AND m.destinataire_id = $3)
       OR (m.expediteur_id = $3 AND m.destinataire_id = $2))
       AND m.est_suspect = false
       ORDER BY m.created_at ASC`,
      [annonce_id, req.utilisateur.id, utilisateur_id]
    );

    // Marquer les messages comme lus
    await pool.query(
      `UPDATE messages SET est_lu = true 
       WHERE annonce_id = $1 AND destinataire_id = $2 AND est_lu = false`,
      [annonce_id, req.utilisateur.id]
    );

    res.json({
      succes: true,
      total: messages.rows.length,
      messages: messages.rows
    });

  } catch (erreur) {
    console.error('Erreur récupération conversation:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

// Récupérer toutes les conversations d'un utilisateur
const getMesConversations = async (req, res) => {
  try {
    const conversations = await pool.query(
      `SELECT DISTINCT ON (m.annonce_id, 
        LEAST(m.expediteur_id, m.destinataire_id),
        GREATEST(m.expediteur_id, m.destinataire_id))
        m.*,
        a.titre as annonce_titre,
        a.prix as annonce_prix,
        e.nom as expediteur_nom, e.prenom as expediteur_prenom,
        e.photo_profil_url as expediteur_photo,
        d.nom as destinataire_nom, d.prenom as destinataire_prenom,
        d.photo_profil_url as destinataire_photo,
        (SELECT COUNT(*) FROM messages 
         WHERE annonce_id = m.annonce_id 
         AND destinataire_id = $1 
         AND est_lu = false) as non_lus
       FROM messages m
       JOIN annonces a ON m.annonce_id = a.id
       JOIN utilisateurs e ON m.expediteur_id = e.id
       JOIN utilisateurs d ON m.destinataire_id = d.id
       WHERE (m.expediteur_id = $1 OR m.destinataire_id = $1)
       AND m.est_suspect = false
       ORDER BY m.annonce_id, 
        LEAST(m.expediteur_id, m.destinataire_id),
        GREATEST(m.expediteur_id, m.destinataire_id),
        m.created_at DESC`,
      [req.utilisateur.id]
    );
    res.json({
      succes: true,
      total: conversations.rows.length,
      conversations: conversations.rows
    });

  } catch (erreur) {
    console.error('Erreur récupération conversations:', erreur);
    res.status(500).json({
      succes: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = { envoyerMessage, getConversation, getMesConversations };