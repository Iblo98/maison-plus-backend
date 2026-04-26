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

// Système de filtrage des messages suspects
const analyserMessage = (contenu) => {
  const resultats = {
    estSuspect: false,
    raisons: []
  };

  const texte = contenu.toLowerCase();

  // Liens externes suspects
  const liensExternes = [
    'whatsapp', 'wa.me', 'telegram', 't.me',
    'facebook', 'fb.com', 'instagram',
    'http://', 'https://', 'www.',
    'bit.ly', 'tinyurl'
  ];
  liensExternes.forEach(lien => {
    if (texte.includes(lien)) {
      resultats.estSuspect = true;
      resultats.raisons.push(`Lien externe détecté : ${lien}`);
    }
  });

  // Mots suspects d'arnaque
  const motsArnaque = [
    'western union', 'moneygram', 'wire transfer',
    'virement urgent', 'transfert urgent',
    'arnaque', 'scam', 'fraud',
    'cliquez ici', 'click here',
    'gagner de l\'argent', 'make money',
    'investissement garanti', 'guaranteed investment',
    'mot de passe', 'password', 'code secret',
    'données bancaires', 'numéro de carte',
    'prince nigerian', 'héritage',
  ];
  motsArnaque.forEach(mot => {
    if (texte.includes(mot)) {
      resultats.estSuspect = true;
      resultats.raisons.push(`Mot suspect détecté : ${mot}`);
    }
  });

  // Numéros de téléphone (pattern Burkina et international)
  const regexTelephone = /(\+?226\s?)?([0-9]{2}\s?){4}|(\+?[0-9]{10,13})/g;
  if (regexTelephone.test(contenu)) {
    resultats.estSuspect = true;
    resultats.raisons.push('Numéro de téléphone détecté');
  }

  // Emails dans le message
  const regexEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (regexEmail.test(contenu)) {
    resultats.estSuspect = true;
    resultats.raisons.push('Adresse email détectée');
  }

  return resultats;
};

// Envoyer un message
const envoyerMessage = async (req, res) => {
  try {
    const { annonce_id, destinataire_id, contenu } = req.body;

    if (!contenu || contenu.trim().length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Le message ne peut pas être vide'
      });
    }

    if (contenu.length > 2000) {
      return res.status(400).json({
        succes: false,
        message: 'Le message ne peut pas dépasser 2000 caractères'
      });
    }

    // Vérifier l'annonce
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

    // Analyser le message
    const analyse = analyserMessage(contenu);

    if (analyse.estSuspect) {
      // Enregistrer le message comme suspect mais bloquer l'envoi
      await pool.query(
        `INSERT INTO messages
          (annonce_id, expediteur_id, destinataire_id, contenu, est_suspect)
         VALUES ($1, $2, $3, $4, true)`,
        [annonce_id, req.utilisateur.id, destinataire_id, contenu]
      );

      return res.status(400).json({
        succes: false,
        message: 'Votre message contient des éléments non autorisés sur Maison+. Évitez de partager des liens, numéros de téléphone ou emails dans les messages.',
        raisons: analyse.raisons
      });
    }

    // Envoyer le message normal
    const message = await pool.query(
      `INSERT INTO messages
        (annonce_id, expediteur_id, destinataire_id, contenu, est_suspect)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [annonce_id, req.utilisateur.id, destinataire_id, contenu]
    );

    // Marquer les anciens messages comme lus
    await pool.query(
      `UPDATE messages SET est_lu = true
       WHERE annonce_id = $1
       AND destinataire_id = $2
       AND expediteur_id = $3
       AND est_lu = false`,
      [annonce_id, req.utilisateur.id, destinataire_id]
    );

    res.status(201).json({
      succes: true,
      message: 'Message envoyé !',
      data: message.rows[0]
    });

  } catch (erreur) {
    console.error('Erreur envoi message:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
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

// Exporter une conversation en PDF
const exporterConversation = async (req, res) => {
  try {
    const { annonce_id, destinataire_id } = req.params;
    const utilisateur_id = req.utilisateur.id;

    // Récupérer les messages
    const messages = await pool.query(
      `SELECT m.*,
        u_exp.nom as expediteur_nom, u_exp.prenom as expediteur_prenom,
        u_dest.nom as destinataire_nom, u_dest.prenom as destinataire_prenom,
        a.titre as annonce_titre, a.ville as annonce_ville
       FROM messages m
       JOIN utilisateurs u_exp ON m.expediteur_id = u_exp.id
       JOIN utilisateurs u_dest ON m.destinataire_id = u_dest.id
       JOIN annonces a ON m.annonce_id = a.id
       WHERE m.annonce_id = $1
       AND ((m.expediteur_id = $2 AND m.destinataire_id = $3)
       OR (m.expediteur_id = $3 AND m.destinataire_id = $2))
       ORDER BY m.created_at ASC`,
      [annonce_id, utilisateur_id, destinataire_id]
    );

    if (messages.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Aucun message trouvé'
      });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="conversation_${annonce_id}.pdf"`);
      res.send(pdfBuffer);
    });

    const m = messages.rows[0];

    // En-tête
    doc.rect(0, 0, 612, 80).fill('#1A56DB');
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('MAISON+', 50, 20);
    doc.fontSize(11).font('Helvetica')
      .text('Export de conversation', 50, 48);
    doc.fontSize(9)
      .text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 350, 48, { align: 'right' });

    doc.moveDown(3);

    // Infos conversation
    doc.fillColor('#1A56DB').fontSize(13).font('Helvetica-Bold')
      .text('DÉTAILS DE LA CONVERSATION');
    doc.moveDown(0.5);

    doc.fillColor('#1E293B').fontSize(10).font('Helvetica');
    doc.text(`Annonce : ${m.annonce_titre} — ${m.annonce_ville}`);
    doc.text(`Entre : ${m.expediteur_prenom} ${m.expediteur_nom} et ${m.destinataire_prenom} ${m.destinataire_nom}`);
    doc.text(`Nombre de messages : ${messages.rows.length}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);

    // Messages
    doc.fillColor('#1A56DB').fontSize(13).font('Helvetica-Bold')
      .text('HISTORIQUE DES MESSAGES');
    doc.moveDown(0.5);

    messages.rows.forEach((msg) => {
      const estExpediteur = msg.expediteur_id === utilisateur_id;
      const nomEnvoyeur = `${msg.expediteur_prenom} ${msg.expediteur_nom}`;
      const date = new Date(msg.created_at).toLocaleString('fr-FR');

      // Fond coloré selon l'expéditeur
      const bgColor = estExpediteur ? '#EFF6FF' : '#F0FDF4';
      const textColor = estExpediteur ? '#1E40AF' : '#166534';

      doc.rect(50, doc.y, 512, 50).fill(bgColor).stroke('#E2E8F0');

      const yPos = doc.y - 45;

      doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold')
        .text(`${nomEnvoyeur} — ${date}`, 60, yPos + 5);

      doc.fillColor('#1E293B').fontSize(10).font('Helvetica')
        .text(msg.contenu, 60, yPos + 18, {
          width: 490,
          lineBreak: true
        });

      if (msg.est_suspect) {
        doc.fillColor('#EF4444').fontSize(8)
          .text('⚠️ Message suspect', 60, doc.y - 5);
      }

      doc.moveDown(0.8);
    });

    // Pied de page
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
      .text(
        'Ce document est un export officiel de conversation sur la plateforme MaisonPlus. ' +
        'Il peut être utilisé comme preuve en cas de litige.',
        { align: 'center' }
      );
    doc.text('© 2026 MaisonPlus — maisonplus.immobf@gmail.com', { align: 'center' });

    doc.end();

  } catch (erreur) {
    console.error('Erreur export conversation:', erreur);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  envoyerMessage,
  getConversations: getMesConversations,
  getMessages: getConversation,
  exporterConversation
};