const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel } = require('docx');

// Générer le PDF du dossier d'inscription
const genererPDFInscription = (utilisateur) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // En-tête
    doc.rect(0, 0, 612, 100).fill('#1A56DB');
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
      .text('MAISON+', 50, 30);
    doc.fontSize(12).font('Helvetica')
      .text('MaisonPlus — Plateforme Immobilière', 50, 62);
    doc.fontSize(10)
      .text(`Dossier généré le ${new Date().toLocaleString('fr-FR')}`, 350, 62, { align: 'right' });

    doc.moveDown(3);

    // Titre
    doc.fillColor('#1A56DB').fontSize(18).font('Helvetica-Bold')
      .text('DOSSIER D\'INSCRIPTION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#64748B').fontSize(11).font('Helvetica')
      .text(`Référence : MP-${utilisateur.id?.substring(0, 8).toUpperCase()}`, { align: 'center' });

    doc.moveDown(1.5);

    // Séparateur
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);

    // Informations personnelles
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold')
      .text('INFORMATIONS PERSONNELLES');
    doc.moveDown(0.5);

    const infos = [
      ['Type de compte', utilisateur.type_compte === 'professionnel' ? 'Professionnel / Entreprise' : 'Particulier'],
      ['Nom complet', `${utilisateur.prenom} ${utilisateur.nom}`],
      ['Email', utilisateur.email],
      ['Téléphone', utilisateur.telephone],
      ['Date d\'inscription', new Date(utilisateur.created_at).toLocaleString('fr-FR')],
      ['Statut', utilisateur.statut],
    ];

    infos.forEach(([label, valeur]) => {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold').text(label + ' :', 50, doc.y, { continued: true, width: 200 });
      doc.fillColor('#1E293B').font('Helvetica').text(' ' + (valeur || 'Non renseigné'));
    });

    doc.moveDown(1);

    // Informations entreprise si professionnel
    if (utilisateur.type_compte === 'professionnel') {
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
      doc.moveDown(1);
      doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('INFORMATIONS ENTREPRISE');
      doc.moveDown(0.5);

      const infosEntreprise = [
        ['Nom entreprise', utilisateur.nom_entreprise],
        ['RCCM', utilisateur.rccm],
        ['IFU', utilisateur.ifu],
        ['Secteur d\'activité', utilisateur.secteur_activite],
        ['Site web', utilisateur.site_web],
      ];

      infosEntreprise.forEach(([label, valeur]) => {
        doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold').text(label + ' :', 50, doc.y, { continued: true, width: 200 });
        doc.fillColor('#1E293B').font('Helvetica').text(' ' + (valeur || 'Non renseigné'));
      });

      doc.moveDown(1);
    }

    // KYC
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('VÉRIFICATION D\'IDENTITÉ (KYC)');
    doc.moveDown(0.5);

    const kyc = [
      ['Photo de profil', utilisateur.photo_profil_url ? '✓ Fournie' : '✗ Non fournie'],
      ['CNIB Recto', utilisateur.cnib_recto_url ? '✓ Fournie' : '✗ Non fournie'],
      ['CNIB Verso', utilisateur.cnib_verso_url ? '✓ Fournie' : '✗ Non fournie'],
      ['Mobile Money', utilisateur.mobile_money_numero ? `✓ ${utilisateur.mobile_money_operateur} - ${utilisateur.mobile_money_numero}` : '✗ Non renseigné'],
      ['Email vérifié', utilisateur.email_verifie ? '✓ Vérifié' : '✗ Non vérifié'],
    ];

    kyc.forEach(([label, valeur]) => {
      const estOk = valeur.startsWith('✓');
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold').text(label + ' :', 50, doc.y, { continued: true, width: 200 });
      doc.fillColor(estOk ? '#16A34A' : '#DC2626').font('Helvetica').text(' ' + valeur);
    });

    doc.moveDown(2);

    // Pied de page
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
      .text('Document confidentiel — MaisonPlus © 2026 — La plateforme immobilière de confiance au Burkina Faso et en Afrique', { align: 'center' });

    doc.end();
  });
};

// Générer le Word du dossier d'inscription
const genererWordInscription = async (utilisateur) => {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
  const borders = { top: border, bottom: border, left: border, right: border };

  const ligneTableau = (label, valeur, estOk = null) => new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 4000, type: WidthType.DXA },
        shading: { fill: 'F8FAFC' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: 'Arial', color: '64748B' })]
        })]
      }),
      new TableCell({
        borders,
        width: { size: 5000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({
            text: valeur || 'Non renseigné',
            size: 20,
            font: 'Arial',
            color: estOk === true ? '16A34A' : estOk === false ? 'DC2626' : '1E293B'
          })]
        })]
      })
    ]
  });

  const sections = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'MAISON+', bold: true, size: 48, font: 'Arial', color: '1A56DB' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'DOSSIER D\'INSCRIPTION', bold: true, size: 28, font: 'Arial', color: '1E293B' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({
        text: `Référence : MP-${utilisateur.id?.substring(0, 8).toUpperCase()} | Généré le ${new Date().toLocaleString('fr-FR')}`,
        size: 18, font: 'Arial', color: '64748B'
      })]
    }),

    // Infos personnelles
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: 'INFORMATIONS PERSONNELLES', bold: true, size: 24, font: 'Arial', color: '1A56DB' })]
    }),
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [
        ligneTableau('Type de compte', utilisateur.type_compte === 'professionnel' ? 'Professionnel / Entreprise' : 'Particulier'),
        ligneTableau('Nom complet', `${utilisateur.prenom} ${utilisateur.nom}`),
        ligneTableau('Email', utilisateur.email),
        ligneTableau('Téléphone', utilisateur.telephone),
        ligneTableau('Date d\'inscription', new Date(utilisateur.created_at).toLocaleString('fr-FR')),
        ligneTableau('Statut', utilisateur.statut),
      ]
    }),

    // KYC
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: 'VÉRIFICATION D\'IDENTITÉ (KYC)', bold: true, size: 24, font: 'Arial', color: '1A56DB' })]
    }),
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [
        ligneTableau('Photo de profil', utilisateur.photo_profil_url ? '✓ Fournie' : '✗ Non fournie', !!utilisateur.photo_profil_url),
        ligneTableau('CNIB Recto', utilisateur.cnib_recto_url ? '✓ Fournie' : '✗ Non fournie', !!utilisateur.cnib_recto_url),
        ligneTableau('CNIB Verso', utilisateur.cnib_verso_url ? '✓ Fournie' : '✗ Non fournie', !!utilisateur.cnib_verso_url),
        ligneTableau('Mobile Money', utilisateur.mobile_money_numero ? `✓ ${utilisateur.mobile_money_operateur} - ${utilisateur.mobile_money_numero}` : '✗ Non renseigné', !!utilisateur.mobile_money_numero),
        ligneTableau('Email vérifié', utilisateur.email_verifie ? '✓ Vérifié' : '✗ Non vérifié', utilisateur.email_verifie),
      ]
    }),

    // Pied de page
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [new TextRun({
        text: 'Document confidentiel — MaisonPlus © 2026 — La plateforme immobilière de confiance au Burkina Faso et en Afrique',
        size: 16, font: 'Arial', color: '94A3B8', italics: true
      })]
    }),
  ];

  // Ajouter section entreprise si professionnel
  if (utilisateur.type_compte === 'professionnel') {
    sections.splice(4, 0,
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'INFORMATIONS ENTREPRISE', bold: true, size: 24, font: 'Arial', color: '1A56DB' })]
      }),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          ligneTableau('Nom entreprise', utilisateur.nom_entreprise),
          ligneTableau('RCCM', utilisateur.rccm),
          ligneTableau('IFU', utilisateur.ifu),
          ligneTableau('Secteur d\'activité', utilisateur.secteur_activite),
          ligneTableau('Site web', utilisateur.site_web),
        ]
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: sections
    }]
  });

  return await Packer.toBuffer(doc);
};

// Générer reçu PDF de paiement
const genererRecuPaiement = (paiement) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // En-tête
    doc.rect(0, 0, 612, 100).fill('#1A56DB');
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
      .text('MAISON+', 50, 30);
    doc.fontSize(12).font('Helvetica')
      .text('Recu de paiement officiel', 50, 62);
    doc.fontSize(10)
      .text(`Date : ${new Date().toLocaleString('fr-FR')}`, 350, 62, { align: 'right' });

    doc.moveDown(3);

    // Badge statut
    const statutColor = paiement.statut === 'complete' ? '#16A34A' : '#D97706';
    doc.rect(50, doc.y, 512, 40).fill(statutColor);
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
      .text(
        paiement.statut === 'complete' ? '✓ PAIEMENT CONFIRME' : '⏳ PAIEMENT EN ATTENTE',
        50, doc.y - 28, { align: 'center', width: 512 }
      );

    doc.moveDown(2);

    // Référence
    doc.fillColor('#1A56DB').fontSize(12).font('Helvetica-Bold')
      .text('REFERENCE : ' + paiement.reference_transaction, { align: 'center' });

    doc.moveDown(1);

    // Séparateur
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);

    // Détails annonce
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold')
      .text('BIEN IMMOBILIER');
    doc.moveDown(0.5);

    const detailsAnnonce = [
      ['Titre', paiement.annonce_titre || 'N/A'],
      ['Type', paiement.type_transaction || 'N/A'],
      ['Catégorie', paiement.categorie || 'N/A'],
      ['Ville', paiement.ville || 'N/A'],
    ];

    detailsAnnonce.forEach(([label, valeur]) => {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold')
        .text(label + ' :', 50, doc.y, { continued: true, width: 200 });
      doc.fillColor('#1E293B').font('Helvetica').text(' ' + valeur);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);

    // Parties
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.5);

    const parties = [
      ['Acheteur/Locataire', `${paiement.acheteur_prenom || ''} ${paiement.acheteur_nom || ''}`],
      ['Email acheteur', paiement.acheteur_email || 'N/A'],
      ['Vendeur/Propriétaire', `${paiement.vendeur_prenom || ''} ${paiement.vendeur_nom || ''}`],
      ['Email vendeur', paiement.vendeur_email || 'N/A'],
    ];

    parties.forEach(([label, valeur]) => {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold')
        .text(label + ' :', 50, doc.y, { continued: true, width: 200 });
      doc.fillColor('#1E293B').font('Helvetica').text(' ' + valeur);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(1);

    // Détails financiers
    doc.fillColor('#1E293B').fontSize(14).font('Helvetica-Bold').text('DETAILS FINANCIERS');
    doc.moveDown(0.5);

    const montantTotal = parseFloat(paiement.montant || 0);
    const commission = parseFloat(paiement.commission_plateforme || 0);
    const montantVendeur = montantTotal - commission;
    const devise = paiement.devise || 'XOF';

    // Tableau financier
    const lignes = [
      ['Montant total', `${montantTotal.toLocaleString('fr-FR')} ${devise}`],
      ['Commission Maison+', `${commission.toLocaleString('fr-FR')} ${devise}`],
      ['Montant reçu par le vendeur', `${montantVendeur.toLocaleString('fr-FR')} ${devise}`],
      ['Mode de paiement', paiement.methode_paiement || 'Mobile Money'],
      ['Zone de paiement', paiement.zone === 1 ? 'Burkina Faso' : paiement.zone === 2 ? 'CEDEAO' : 'International'],
    ];

    lignes.forEach(([label, valeur], index) => {
      const bgColor = index % 2 === 0 ? '#F8FAFC' : 'white';
      doc.rect(50, doc.y, 512, 22).fill(bgColor);
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Bold')
        .text(label + ' :', 60, doc.y - 16, { continued: true, width: 250 });
      doc.fillColor('#1E293B').font('Helvetica-Bold').text(valeur, { align: 'right', width: 240 });
    });

    doc.moveDown(0.5);

    // Total en grand
    doc.rect(50, doc.y, 512, 40).fill('#1A56DB');
    doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
      .text(
        `TOTAL PAYE : ${montantTotal.toLocaleString('fr-FR')} ${devise}`,
        50, doc.y - 26, { align: 'center', width: 512 }
      );

    doc.moveDown(2.5);

    // Date et conditions
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
      .text(
        'Ce recu constitue une preuve officielle de paiement sur la plateforme MaisonPlus. ' +
        'En cas de litige, veuillez contacter maisonplus.immobf@gmail.com avec ce numero de reference.',
        { align: 'center' }
      );

    doc.moveDown(0.5);
    doc.fillColor('#94A3B8').fontSize(9)
      .text('© 2026 MaisonPlus — La plateforme immobiliere de confiance au Burkina Faso et en Afrique', {
        align: 'center'
      });

    doc.end();
  });
};

module.exports = { genererPDFInscription, genererWordInscription, genererRecuPaiement
 };