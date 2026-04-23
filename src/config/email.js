const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email de vérification du compte
const envoyerEmailVerification = async (email, nom, token) => {
  const lienVerification = `${process.env.FRONTEND_URL}/verifier-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Maison+ — Vérifiez votre adresse email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Bonjour ${nom} !</h2>
          <p style="color: #64748b;">Merci de vous être inscrit sur Maison+. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${lienVerification}" 
              style="background: #1A56DB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Vérifier mon email
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 MaisonPlus — La plateforme immobilière de confiance au Burkina Faso
          </p>
        </div>
      </div>
    `
  });
};

// Email de réinitialisation du mot de passe
const envoyerEmailReinitialisation = async (email, nom, token) => {
  const lienReinit = `${process.env.FRONTEND_URL}/reinitialiser-mot-de-passe?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Maison+ — Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Bonjour ${nom} !</h2>
          <p style="color: #64748b;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${lienReinit}"
              style="background: #1A56DB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 MaisonPlus — La plateforme immobilière de confiance au Burkina Faso
          </p>
        </div>
      </div>
    `
  });
};

// Email de bienvenue après vérification
const envoyerEmailBienvenue = async (email, nom) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Maison+ — Bienvenue sur la plateforme !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Bienvenue ${nom} !</h2>
          <p style="color: #64748b;">Votre compte est vérifié. Vous pouvez maintenant publier des annonces et contacter des propriétaires sur Maison+.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}"
              style="background: #16A34A; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Accéder à Maison+
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 MaisonPlus — La plateforme immobilière de confiance au Burkina Faso
          </p>
        </div>
      </div>
    `
  });
};

// Email admin avec dossier PDF et Word en pièces jointes
const envoyerDossierAdmin = async (utilisateur, pdfBuffer, wordBuffer) => {
  const dateHeure = new Date().toLocaleString('fr-FR');
  const reference = `MP-${utilisateur.id?.substring(0, 8).toUpperCase()}`;
  const typeCompte = utilisateur.type_compte === 'professionnel' ? 'Professionnel' : 'Particulier';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: `[Maison+] Nouveau dossier ${typeCompte} — ${utilisateur.prenom} ${utilisateur.nom} — ${dateHeure}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Nouveau dossier d'inscription</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b; width: 40%;">Référence</td>
              <td style="padding: 8px; color: #1e293b;">${reference}</td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Type de compte</td>
              <td style="padding: 8px; color: #1e293b;">${typeCompte}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Nom complet</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.prenom} ${utilisateur.nom}</td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Téléphone</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.telephone}</td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Date et heure</td>
              <td style="padding: 8px; color: #1e293b;">${dateHeure}</td>
            </tr>
            ${utilisateur.type_compte === 'professionnel' ? `
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Entreprise</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.nom_entreprise || 'N/A'}</td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">RCCM</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.rccm || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">IFU</td>
              <td style="padding: 8px; color: #1e293b;">${utilisateur.ifu || 'N/A'}</td>
            </tr>
            ` : ''}
          </table>
          <p style="color: #64748b; margin-top: 20px; font-size: 13px;">
            Le dossier complet est joint en pièces jointes (PDF et Word).
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 MaisonPlus — Dossier classé le ${dateHeure}
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `dossier_${reference}_${utilisateur.nom}_${utilisateur.prenom}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      },
      {
        filename: `dossier_${reference}_${utilisateur.nom}_${utilisateur.prenom}.docx`,
        content: wordBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    ]
  });
};

// Email de confirmation à l'utilisateur avec document
const envoyerConfirmationInscription = async (utilisateur, pdfBuffer) => {
  const reference = `MP-${utilisateur.id?.substring(0, 8).toUpperCase()}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: utilisateur.email,
    subject: `Maison+ — Confirmation de votre inscription (${reference})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1A56DB; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Maison<span style="color: #4ADE80;">+</span></h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1e293b;">Bienvenue ${utilisateur.prenom} !</h2>
          <p style="color: #64748b;">Votre inscription sur Maison+ a bien été enregistrée. Voici votre dossier de confirmation.</p>
          
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 13px;">Référence dossier</p>
            <p style="margin: 4px 0 0; color: #1A56DB; font-size: 20px; font-weight: bold;">${reference}</p>
          </div>

          <p style="color: #64748b;">Pour activer votre compte, complétez les étapes suivantes :</p>
          <ol style="color: #64748b; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Vérifiez votre adresse email</li>
            <li style="margin-bottom: 8px;">Ajoutez votre photo de profil</li>
            <li style="margin-bottom: 8px;">Soumettez votre CNIB ou passeport</li>
            <li style="margin-bottom: 8px;">Configurez votre Mobile Money</li>
          </ol>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/kyc"
              style="background: #1A56DB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Compléter mon profil
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px;">
            Votre dossier de confirmation est joint en pièce jointe (PDF).
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 MaisonPlus — La plateforme immobilière de confiance au Burkina Faso
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `confirmation_inscription_${reference}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
};

module.exports = {
  envoyerEmailVerification,
  envoyerEmailReinitialisation,
  envoyerEmailBienvenue,
  envoyerDossierAdmin,
  envoyerConfirmationInscription
};