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

module.exports = {
  envoyerEmailVerification,
  envoyerEmailReinitialisation,
  envoyerEmailBienvenue
};