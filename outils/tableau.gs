/**
 * Script du tableau Google Sheets des publications.
 *
 * Installation (une seule fois) :
 *  1. Créer un tableau Google Sheets vide. Extensions → Apps Script. Remplacer le contenu de
 *     Code.gs par ce fichier, enregistrer.
 *  2. Choisir la fonction installer, cliquer sur ▶ Exécuter, accepter l'autorisation.
 *     L'onglet « Publications » est rempli avec la liste du site, et le journal affiche la clé secrète.
 *     (Pour la revoir plus tard : choisir la fonction afficherCle et l'exécuter.)
 *  3. Déployer → Nouveau déploiement → type « Application Web » ;
 *     Exécuter en tant que : Moi ; Qui a accès : Tout le monde. Copier l'URL.
 *  4. Partager le tableau : « Tous les utilisateurs disposant du lien » → Lecteur
 *     (le site le lit ; seules les personnes invitées comme éditeurs peuvent le modifier).
 *
 * Après une modification de ce code : Déployer → Gérer les déploiements → ✎ →
 * Version : Nouvelle version (l'URL reste la même).
 *
 * Ce que fait un envoi de outils/collecter.py (toujours avec la clé) :
 *  - « ajouter » : les publications dont l'id n'est pas encore dans le tableau sont ajoutées ;
 *  - « completer » : pour une publication déjà là, seules les cases vides sont remplies,
 *    et rien n'est touché si la case « verrouille » est cochée ;
 *    la colonne « sources » (où l'article a été trouvé) est la seule mise à jour d'office ;
 *  - avec « essai », rien n'est écrit : la réponse dit ce qui serait fait.
 * Puis l'onglet est trié par année (la plus récente en haut), puis par titre.
 * Un envoi avec « onglet: 'Conférences' » fait la même chose dans l'onglet des conférences
 * (trié par date). Cet onglet se crée une fois avec la fonction installerConferences.
 *
 * PDF déposés dans Google Drive (voir plus bas, lierPdfs) :
 *  1. Dans l'éditeur Apps Script : Services ＋ → « Drive API » → Ajouter
 *     (permet de lire le texte des PDF pour y trouver le DOI ; sans cela, seul le nom du fichier sert).
 *  2. Choisir la fonction installerPdf, cliquer sur ▶ Exécuter, accepter l'autorisation.
 *     Elle crée le dossier « pdf » à côté du tableau (ou reprend celui qui existe), le partage en
 *     lecture avec le lien, et programme une vérification toutes les heures.
 *  Ensuite, il suffit de déposer des PDF dans le dossier. Chaque fichier est rattaché à un article
 *  (DOI ou PMID dans le nom du fichier ou dans le texte du PDF, sinon titre), noté dans l'onglet
 *  « PDF », et son lien est écrit dans la colonne pdf_drive : le site affiche alors le bouton PDF.
 *  Fichier non reconnu : écrire dans l'onglet « PDF », colonne « article », l'id de l'article
 *  (ou son DOI, ou son PMID). Rattachement erroné : corriger cette case de la même façon.
 *  Menu Archives → Lier les PDF maintenant, pour ne pas attendre l'heure suivante.
 */

const ONGLET = 'Publications';
const LISTE_DU_SITE = 'https://raw.githubusercontent.com/ici-be/francis-veyckemans/main/donnees/publications.csv';
const CASES = ['masquer', 'verrouille'];          // colonnes en cases à cocher
const LARGEURS = { titre: 420, auteurs: 260, revue: 180, notes: 220, lien_info: 160, lien_pdf: 160, congres: 260, lieu: 180, orateurs: 220 };
const ONGLET_CONFERENCES = 'Conférences';
const COLONNES_CONFERENCES = ['id', 'date', 'titre', 'congres', 'lieu', 'type', 'langue', 'orateurs', 'lien_info',
  'lien_diapos', 'lien_video', 'notes', 'masquer', 'verrouille', 'sources', 'ajoute_le'];

function installer() {
  const classeur = SpreadsheetApp.getActive();
  const feuille = classeur.getSheets()[0];      // premier onglet : gid=0, comme dans config.js
  if (feuille.getLastRow() > 1) {
    Logger.log('Le premier onglet contient déjà des données : elles ne sont pas réimportées.');
    return afficherCle();
  }
  feuille.setName(ONGLET);

  const lignes = Utilities.parseCsv(UrlFetchApp.fetch(LISTE_DU_SITE).getContentText('UTF-8'));
  const entete = lignes[0];
  feuille.getRange(1, 1, feuille.getMaxRows(), entete.length).setNumberFormat('@');  // tout en texte : « 3-4 » ne devient pas une date
  feuille.getRange(1, 1, lignes.length, entete.length).setValues(lignes);
  mettreEnForme(feuille, entete, 2, lignes.length - 1);
  feuille.getRange(1, 1, lignes.length, entete.length).createFilter();

  Logger.log((lignes.length - 1) + ' publications importées.');
  afficherCle();
}

/** Affiche la clé secrète dans le journal (et la crée si elle n'existe pas encore). */
function afficherCle() {
  const proprietes = PropertiesService.getScriptProperties();
  let cle = proprietes.getProperty('CLE');
  if (!cle) {
    cle = Utilities.getUuid();
    proprietes.setProperty('CLE', cle);
  }
  Logger.log('Clé secrète : ' + cle);
}

function mettreEnForme(feuille, entete, premiere, nombre) {
  if (premiere === 2) {
    feuille.setFrozenRows(1);
    feuille.setFrozenColumns(3);
    feuille.getRange(1, 1, 1, entete.length).setFontWeight('bold').setBackground('#e3f0ef');
    entete.forEach((nom, i) => { if (LARGEURS[nom]) feuille.setColumnWidth(i + 1, LARGEURS[nom]); });
    feuille.getRange(1, 1, feuille.getMaxRows(), entete.length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
  if (nombre < 1) return;
  CASES.forEach((nom) => {
    const col = entete.indexOf(nom) + 1;
    if (!col) return;
    const zone = feuille.getRange(premiere, col, nombre, 1);
    const valeurs = zone.getValues().map(([v]) => [estOui(v)]);
    zone.setNumberFormat('General').insertCheckboxes().setValues(valeurs);
  });
}

function estOui(v) {
  return v === true || /^(oui|x|1|true|vrai)$/i.test(String(v).trim());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const demande = JSON.parse(e.postData.contents);
    if (demande.cle !== PropertiesService.getScriptProperties().getProperty('CLE')) {
      return repondre({ erreur: 'clé incorrecte' });
    }
    return repondre(traiter(demande));
  } catch (err) {
    return repondre({ erreur: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function traiter(demande) {
  const feuille = SpreadsheetApp.getActive().getSheetByName(demande.onglet || ONGLET);
  if (!feuille) throw new Error('Onglet introuvable : ' + demande.onglet);
  const valeurs = feuille.getDataRange().getValues();
  const entete = valeurs[0].map(String);
  const col = (nom) => entete.indexOf(nom);
  const parId = {};
  valeurs.slice(1).forEach((ligne, i) => { if (ligne[col('id')]) parId[ligne[col('id')]] = i + 1; });

  const rapport = { ajoutees: [], completees: [], ignorees: [] };

  (demande.completer || []).forEach(({ id, remplir, remplacer }) => {
    const i = parId[id];
    if (!i) return rapport.ignorees.push(id + ' (introuvable)');
    const ligne = valeurs[i];
    if (estOui(ligne[col('verrouille')])) return rapport.ignorees.push(id + ' (verrouillée)');
    const faites = [];
    Object.keys(remplir || {}).forEach((nom) => {
      const c = col(nom);
      if (c >= 0 && String(ligne[c]).trim() === '' && remplir[nom]) { ligne[c] = remplir[nom]; faites.push(nom); }
    });
    Object.keys(remplacer || {}).forEach((nom) => {
      const c = col(nom);
      if (c >= 0 && String(ligne[c]) !== remplacer[nom]) { ligne[c] = remplacer[nom]; faites.push(nom); }
    });
    if (faites.length) rapport.completees.push(id + ' (' + faites.join(', ') + ')');
  });

  const nouvelles = (demande.ajouter || []).filter((p) => p.id && !parId[p.id]);
  nouvelles.forEach((p) => {
    valeurs.push(entete.map((nom) => (CASES.includes(nom) ? estOui(p[nom]) : p[nom] || '')));
    rapport.ajoutees.push(p.id);
  });

  if (demande.essai || (!rapport.completees.length && !nouvelles.length)) return rapport;

  // tri : date (conférences) ou année (publications), la plus récente en haut, puis titre
  const ia = col('date') >= 0 ? col('date') : col('annee'), it = col('titre');
  const corps = valeurs.slice(1).sort((a, b) =>
    String(b[ia]).localeCompare(String(a[ia])) || String(a[it]).localeCompare(String(b[it]), 'fr'));
  // les cases à cocher sont réécrites en booléens, le reste en texte
  const toutes = [entete].concat(corps);
  feuille.getRange(1, 1, toutes.length, entete.length).setNumberFormat('@').setValues(toutes);
  mettreEnForme(feuille, entete, 2, corps.length);
  return rapport;
}

function repondre(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}


// ---------------------------------------------------------------- PDF déposés dans Google Drive

const ONGLET_PDF = 'PDF';
const ENTETE_PDF = ['fichier', 'article', 'rattaché par', 'lien', 'id_fichier'];
const PDF_PAR_PASSAGE = 15;  // lire le texte d'un PDF prend quelques secondes : le reste attend le passage suivant

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Archives').addItem('Lier les PDF maintenant', 'lierPdfs').addToUi();
}

function installerPdf() {
  const tableau = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  const parents = tableau.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existants = parent.getFoldersByName('pdf');
  const dossier = existants.hasNext() ? existants.next() : parent.createFolder('pdf');
  try {
    dossier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    Logger.log('Partage du dossier à faire à la main (« Tous les utilisateurs disposant du lien ») : ' + err);
  }
  PropertiesService.getScriptProperties().setProperty('DOSSIER_PDF', dossier.getId());
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'lierPdfs')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('lierPdfs').timeBased().everyHours(1).create();
  Logger.log('Dossier des PDF : ' + dossier.getUrl());
  Logger.log(typeof Drive === 'undefined'
    ? 'Service « Drive API » absent : seuls les noms de fichiers serviront à reconnaître les articles.'
    : 'Service « Drive API » présent : le texte des PDF sera lu.');
  lierPdfs();
}

function lierPdfs() {
  const idDossier = PropertiesService.getScriptProperties().getProperty('DOSSIER_PDF');
  if (!idDossier) throw new Error('Lancer d\'abord installerPdf.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const classeur = SpreadsheetApp.getActive();
    const pub = classeur.getSheetByName(ONGLET);
    protegerEntete(pub);
    let entete = pub.getRange(1, 1, 1, pub.getLastColumn()).getValues()[0].map(String);
    if (!entete.includes('pdf_drive')) {
      pub.getRange(1, entete.length + 1).setValue('pdf_drive').setFontWeight('bold').setBackground('#e3f0ef');
      entete.push('pdf_drive');
    }
    const lignes = pub.getRange(2, 1, Math.max(1, pub.getLastRow() - 1), entete.length).getValues();
    const col = (nom) => entete.indexOf(nom);
    const index = indexArticles(lignes, col);

    let feuille = classeur.getSheetByName(ONGLET_PDF);
    if (!feuille) {
      feuille = classeur.insertSheet(ONGLET_PDF);
      feuille.getRange(1, 1, 1, ENTETE_PDF.length).setValues([ENTETE_PDF]).setFontWeight('bold').setBackground('#e3f0ef');
      feuille.setFrozenRows(1);
      feuille.setColumnWidth(1, 360);
      feuille.setColumnWidth(2, 260);
      feuille.setColumnWidth(3, 220);
    }
    const suivis = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, ENTETE_PDF.length).getValues() : [];
    const parFichier = {};
    suivis.forEach((s) => { parFichier[s[4]] = s; });

    // nouveaux fichiers du dossier
    const presents = {};
    let lus = 0;
    const fichiers = DriveApp.getFolderById(idDossier).getFilesByType(MimeType.PDF);
    while (fichiers.hasNext()) {
      const f = fichiers.next();
      presents[f.getId()] = true;
      const deja = parFichier[f.getId()];
      if (deja) {
        if (deja[2] === 'retiré du dossier') deja[2] = 'remis dans le dossier';
        continue;
      }
      if (lus >= PDF_PAR_PASSAGE) continue;
      lus++;
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* partage hérité du dossier */ }
      const r = reconnaitre(f, index);
      const ligne = [f.getName(), r.id || '', r.id ? r.par : 'non reconnu : indiquer l\'id, le DOI ou le PMID', 
        'https://drive.google.com/file/d/' + f.getId() + '/view', f.getId()];
      suivis.push(ligne);
      parFichier[f.getId()] = ligne;
    }
    suivis.forEach((s) => { if (!presents[s[4]]) s[2] = 'retiré du dossier'; });

    // lien voulu pour chaque article (l'id peut avoir été corrigé à la main, ou être un DOI / PMID)
    const voulu = {};
    const nosLiens = {};
    suivis.forEach((s) => {
      nosLiens[s[3]] = true;
      const id = resoudre(String(s[1]).trim(), index);
      if (s[1] && !id) s[2] = 'article introuvable : vérifier l\'id';
      else if (id && /^(non reconnu|article introuvable)/.test(s[2])) s[2] = 'à la main';
      if (id && presents[s[4]] && !voulu[id]) voulu[id] = s[3];
    });

    // colonne pdf_drive : on ne touche qu'aux liens vides ou venant de ce dossier
    const cPdf = col('pdf_drive'), cId = col('id');
    const colonne = lignes.map((l) => {
      const actuel = String(l[cPdf] || '');
      const cible = voulu[l[cId]];
      if (cible) return [actuel && !nosLiens[actuel] ? actuel : cible];
      return [nosLiens[actuel] ? '' : actuel];
    });
    pub.getRange(2, cPdf + 1, colonne.length, 1).setValues(colonne);
    if (suivis.length) feuille.getRange(2, 1, suivis.length, ENTETE_PDF.length).setValues(suivis);
  } finally {
    lock.releaseLock();
  }
}

function cleTexte(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function indexArticles(lignes, col) {
  const index = { ids: {}, dois: {}, pmids: {}, titres: [] };
  lignes.forEach((l) => {
    const id = String(l[col('id')] || '');
    if (!id) return;
    index.ids[id] = true;
    const doi = String(l[col('doi')] || '').toLowerCase().trim();
    if (doi) index.dois[doi] = id;
    const pmid = String(l[col('pmid')] || '').trim();
    if (pmid) index.pmids[pmid] = id;
    const titre = cleTexte(l[col('titre')]);
    if (titre.length >= 25) index.titres.push([titre, id]);
  });
  index.titres.sort((a, b) => b[0].length - a[0].length);  // le titre le plus long d'abord
  return index;
}

/** id de l'article désigné par un id, un DOI (avec ou sans https://doi.org/) ou un PMID. */
function resoudre(valeur, index) {
  if (!valeur) return '';
  if (index.ids[valeur]) return valeur;
  const doi = valeur.toLowerCase().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '').replace(/^doi:/, '');
  return index.dois[doi] || index.pmids[valeur] || '';
}

/** Rattache un PDF à un article : DOI, PMID ou titre, dans le nom puis dans le texte du fichier. */
function reconnaitre(fichier, index) {
  const nom = fichier.getName().replace(/\.pdf$/i, '');
  const bas = nom.toLowerCase();
  for (const doi in index.dois) {
    if (bas.includes(doi) || bas.includes(doi.replace(/\//g, '_'))) return { id: index.dois[doi], par: 'DOI (nom du fichier)' };
  }
  for (const m of bas.match(/\d{6,8}/g) || []) {
    if (index.pmids[m]) return { id: index.pmids[m], par: 'PMID (nom du fichier)' };
  }
  const cleNom = cleTexte(nom);
  if (cleNom.length >= 20) {
    const t = index.titres.find(([titre]) => titre.startsWith(cleNom) || cleNom.includes(titre));
    if (t) return { id: t[1], par: 'titre (nom du fichier)' };
  }
  const texte = texteDuPdf(fichier).slice(0, 5000);  // la première page : pas les références
  for (const m of texte.toLowerCase().match(/10\.\d{4,9}\/[^\s"<>]+/g) || []) {
    const doi = m.replace(/[.,;)\]]+$/, '');
    if (index.dois[doi]) return { id: index.dois[doi], par: 'DOI (texte du PDF)' };
  }
  const cleT = cleTexte(texte);
  const t = cleT && index.titres.find(([titre]) => cleT.includes(titre));
  if (t) return { id: t[1], par: 'titre (texte du PDF)' };
  return {};
}

/** Texte du PDF, par conversion temporaire en document Google (service avancé « Drive API »). */
function texteDuPdf(fichier) {
  if (typeof Drive === 'undefined') return '';
  let copie;
  try {
    copie = Drive.Files.copy({ name: 'texte temporaire', title: 'texte temporaire', mimeType: MimeType.GOOGLE_DOCS }, fichier.getId());
    return DocumentApp.openById(copie.id).getBody().getText();
  } catch (err) {
    Logger.log('Texte illisible pour ' + fichier.getName() + ' : ' + err);
    return '';
  } finally {
    if (copie) DriveApp.getFileById(copie.id).setTrashed(true);
  }
}

/** Avertissement avant toute modification de la ligne d'en-tête (le site et la collecte en dépendent). */
function protegerEntete(feuille) {
  const deja = feuille.getProtections(SpreadsheetApp.ProtectionType.RANGE).some((p) => p.getRange().getRow() === 1);
  if (!deja) feuille.getRange('1:1').protect().setDescription('En-tête : ne pas modifier').setWarningOnly(true);
  if (String(feuille.getRange(1, 1).getValue()) !== 'id') Logger.log('Attention : la cellule A1 doit contenir « id ».');
}

// ---------------------------------------------------------------- onglet des conférences

/** Crée l'onglet « Conférences » (vide : la collecte le remplit) et affiche son numéro (gid) pour config.js. */
function installerConferences() {
  const classeur = SpreadsheetApp.getActive();
  let feuille = classeur.getSheetByName(ONGLET_CONFERENCES);
  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_CONFERENCES);
    feuille.getRange(1, 1, feuille.getMaxRows(), COLONNES_CONFERENCES.length).setNumberFormat('@');
    feuille.getRange(1, 1, 1, COLONNES_CONFERENCES.length).setValues([COLONNES_CONFERENCES]);
    mettreEnForme(feuille, COLONNES_CONFERENCES, 2, 0);
    feuille.getRange(1, 1, feuille.getMaxRows(), COLONNES_CONFERENCES.length).createFilter();
    protegerEntete(feuille);
  }
  Logger.log('Onglet « ' + ONGLET_CONFERENCES + ' » : gid = ' + feuille.getSheetId() + ' (à mettre dans config.js, ligne conferences:)');
}
