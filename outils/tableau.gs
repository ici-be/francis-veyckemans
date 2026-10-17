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
 */

const ONGLET = 'Publications';
const LISTE_DU_SITE = 'https://raw.githubusercontent.com/ici-be/francis-veyckemans/main/donnees/publications.csv';
const CASES = ['masquer', 'verrouille'];          // colonnes en cases à cocher
const LARGEURS = { titre: 420, auteurs: 260, revue: 180, notes: 220, lien_info: 160, lien_pdf: 160 };

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
  const feuille = SpreadsheetApp.getActive().getSheetByName(ONGLET);
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

  // tri : année décroissante, puis titre
  const ia = col('annee'), it = col('titre');
  const corps = valeurs.slice(1).sort((a, b) =>
    (parseInt(b[ia], 10) || 0) - (parseInt(a[ia], 10) || 0) || String(a[it]).localeCompare(String(b[it]), 'fr'));
  // les cases à cocher sont réécrites en booléens, le reste en texte
  const toutes = [entete].concat(corps);
  feuille.getRange(1, 1, toutes.length, entete.length).setNumberFormat('@').setValues(toutes);
  mettreEnForme(feuille, entete, 2, corps.length);
  return rapport;
}

function repondre(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
