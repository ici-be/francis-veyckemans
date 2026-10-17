# Archives de Francis Veyckemans

Site GitHub Pages qui rassemble les travaux de Francis Veyckemans en anesthésie pédiatrique.
Pages : publications, thèmes, lectures commentées (avis Faculty Opinions), coauteurs.

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `themes.html`, `lectures.html`, `coauteurs.html` | les pages (aucune compilation nécessaire) ; chacune a son script `.js` du même nom (`app.js` pour la première) |
| `i18n.js` | langue du site : français par défaut, anglais avec `?lang=en` ; dictionnaire des textes anglais et bouton FR / EN de l'en-tête |
| `commun.js`, `style.css` | chargement des données, boutons « Citer » et export BibTeX / RIS ; mise en page |
| **tableau Google Sheets** | **la liste des publications** : c'est là qu'on corrige ; le site le lit en direct |
| `donnees/publications.csv` | copie de secours du tableau (mise à jour chaque lundi), utilisée si Google est injoignable |
| `outils/collecter.py` | cherche les publications dans PubMed, OpenAlex, ORCID, et les livres à la BnF et au SUDOC, et les envoie au tableau |
| `outils/tableau.gs` | script du tableau : reçoit les envois de `collecter.py` (à coller dans Apps Script) |
| `donnees/citations.csv` | nombre de citations de chaque publication (OpenAlex), réécrit par chaque collecte |
| `donnees/coauteurs.csv` | forme complète « Nom Prénom » des variantes de noms (`alias,nom`) : complété par la collecte, corrigeable à la main (une ligne corrigée n'est plus modifiée) ; `nom` = `-` retire de la page Coauteurs ce qui n'est pas une personne (pays, association…) |
| `donnees/themes.csv` | les thèmes : nom, description (et leur version anglaise `theme_en`, `description_en`), mots cherchés dans les titres (séparés par `;`, sans accents ni majuscules) |
| `carte.js`, `cartes/` | carte des lieux (Europe, Belgique, hors d'Europe) et ses fonds vectoriels (Natural Earth) |
| `config.js` | identifiant du tableau ; les quatre périodes affichées au-dessus du graphique |
| `.github/workflows/publier.yml` | publie le site à chaque push, et lance la collecte chaque lundi |

## Corriger ou compléter la liste

Ouvrir le tableau : https://docs.google.com/spreadsheets/d/17bUrP_chpuZXRbxyL96DIlUFHj47GjZQdmftGOaZ0JU/edit (identifiant dans `config.js`). Une ligne = une publication.
Les corrections apparaissent sur le site dès qu'on recharge la page.
Pour permettre à quelqu'un de corriger : *Partager* → l'inviter comme **Éditeur**.

**La collecte automatique ne remplit que les cases vides.** Tout ce qu'un humain écrit est donc
conservé lors des mises à jour suivantes.

| Pour… | faire… |
|---|---|
| corriger un titre, une revue, une année… | remplacer le texte dans la case |
| ajouter un lien vers un PDF | coller l'adresse dans `lien_pdf` |
| retirer une publication (homonyme, doublon, erratum…) | cocher `masquer` — **ne pas supprimer la ligne**, sinon elle reviendrait à la prochaine collecte |
| empêcher toute modification automatique d'une ligne | cocher `verrouille` (utile si l'on veut volontairement laisser une case vide) |
| ajouter une remarque visible sous le titre | l'écrire dans `notes` |
| ajouter une publication absente des bases | ajouter une ligne ; remplir au moins `id` (n'importe quel code unique, par exemple `manuel-2019-1`), `annee`, `titre`, `auteurs` |

Ne pas renommer ni déplacer les colonnes, ni l'onglet « Publications » (il doit rester le premier).

Colonnes : `id`, `annee`, `titre`, `auteurs` (séparés par des virgules), `revue`, `volume`,
`numero`, `pages`, `type`, `langue`, `doi`, `pmid`, `pmcid`, `lien_info` (page de l'article),
`lien_pdf`, `notes`, `masquer`, `verrouille`, `sources` (où l'article a été trouvé),
`ajoute_le` (date d'ajout automatique), `pdf_drive` (lien du PDF déposé dans Google Drive, rempli par le script).

Le `type` est libre ; les types existants : article, étude clinique, revue de la littérature,
recommandations, éditorial, commentaire, cas clinique, chapitre de livre, livre,
résumé de congrès, avis Faculty Opinions (F1000), dépôt universitaire, erratum.

## Ajouter des PDF (dossier Google Drive)

Déposer les PDF dans le dossier **« pdf »** du Google Drive, à côté du tableau. Dans l'heure qui suit,
chaque fichier est rattaché à son article et le bouton **PDF** apparaît sur le site
(le PDF du dossier remplace alors le lien PDF trouvé automatiquement).

- Le fichier peut garder son nom d'origine. Pour le reconnaître, le script cherche dans le nom du
  fichier puis dans la première page du PDF un **DOI**, un **PMID** ou le **titre** de l'article.
- L'onglet **« PDF »** du tableau liste les fichiers, l'article rattaché et la façon dont il a été trouvé.
  Fichier non reconnu ou mal rattaché : écrire dans sa colonne `article` l'id de l'article
  (colonne `id` de l'onglet Publications), son DOI ou son PMID.
- Retirer un fichier du dossier retire son lien du site.
- Pour ne pas attendre : menu **Archives → Lier les PDF et les présentations maintenant** dans le tableau.

Installation (une seule fois), dans l'éditeur Apps Script du tableau, après y avoir recollé
`outils/tableau.gs` : *Services ＋ → Drive API → Ajouter*, puis exécuter la fonction `installerPdf`.

## Conférences

La page Conférences lit l'onglet **« Conférences »** du tableau (même fonctionnement que les publications :
`masquer`, `verrouille`, `notes`, et la collecte ne remplit que les cases vides). La collecte y ajoute les exposés,
communications et posters déposés dans **DIAL**, le dépôt de l'UCLouvain (surtout 2014-2016) ; le reste s'ajoute à la main.

Colonnes : `id` (code unique, par exemple `manuel-2019-lille`), `date` (`AAAA-MM-JJ`, ou seulement `AAAA`), `titre`,
`congres`, `lieu`, `type` (conférence, communication, poster, atelier…), `langue`, `orateurs`, `lien_info`,
`lien_diapos`, `lien_video`, `notes`, `masquer`, `verrouille`, `sources`, `ajoute_le`.

**Carte** : chaque `lieu` de l'onglet est placé sur la carte d'après `donnees/lieux.csv` (`lieu,ville,pays,lat,lon`).
La collecte y ajoute tout seul les lieux nouveaux (recherche dans OpenStreetMap) ; un lieu introuvable est ajouté
sans coordonnées : compléter `lat` et `lon` à la main (clic droit sur Google Maps → coordonnées). Plusieurs lieux
peuvent pointer vers la même `ville` (« Woluwe-Saint-Lambert » → Bruxelles). Europe et zoom Belgique toujours affichés,
petites cartes « hors d'Europe » (Amérique du Nord, Amérique du Sud, Afrique, Asie, Océanie) seulement quand un lieu
s'y trouve. Cliquer sur un point n'affiche que les interventions de cette ville. Les fonds de carte (`cartes/`) se
régénèrent avec `python3 outils/cartes.py` (cadrage dans ce fichier) ; le module `carte.js` servira aussi aux missions.

**Diapositives** : déposer les présentations (PDF, PowerPoint ou Google Slides) dans le dossier **« presentations »**
du Google Drive, à côté du tableau. Chaque fichier est rattaché à sa conférence d'après son nom (id, titre ou partie du
titre, ou date `AAAA-MM-JJ`), sinon d'après le titre lu dans le PDF ; il est noté dans l'onglet **« Présentations »**
(colonne `conférence` à corriger avec l'id si besoin) et le bouton **Diapos** apparaît sur la page. Installation : dans
Apps Script, exécuter `installerPresentations`.

Installation (une seule fois) : recoller `outils/tableau.gs` dans Apps Script, exécuter `installerConferences`,
faire *Déployer → Gérer les déploiements → ✎ → Nouvelle version*, puis mettre le numéro (gid) affiché dans le
journal dans `config.js`, ligne `conferences:`. Tant que ce numéro est vide, la page lit `donnees/conferences.csv`.

## Vidéos et podcasts

La page lit `donnees/medias.csv` (ou l'onglet **« Médias »** du tableau, une fois installé avec la fonction
`installerMedias` d'Apps Script et son gid mis dans `config.js`, ligne `medias:`). Une ligne par enregistrement :
`id` (`yt:` + identifiant YouTube, `libsyn:` + numéro d'épisode, ou un code libre), `date` (`AAAA-MM-JJ`, `AAAA-MM` ou `AAAA`),
`titre`, `type` (vidéo, podcast…), `source`, `evenement`, `duree` (`34:40`), `langue`, `intervenants` (les autres
personnes), `url`, `notes`, `masquer`. Une vidéo YouTube s'affiche avec sa vignette ; le lecteur ne se charge qu'au clic
(sans cookies). La collecte du lundi enregistre la vignette de chaque nouvelle vidéo dans `medias/<identifiant>.jpg` ; en attendant, elle est lue chez YouTube.

## Liens

La page Liens lit `donnees/liens.csv` (ou l'onglet **« Liens »** du tableau, une fois installé avec la fonction
`installerLiens` d'Apps Script et son gid mis dans `config.js`, ligne `liens:`). Colonnes : `id` (code unique),
`categorie` (les rubriques s'affichent dans l'ordre où elles apparaissent), `nom`, `description`, `url`, `langue`, `masquer`.
Colonnes facultatives pour le site en anglais : `description_en`, et `categorie_en` pour une rubrique absente du dictionnaire de `i18n.js`
(sinon la description française s'affiche).

## Site en anglais

Le site s'ouvre en français ; le bouton **EN** en haut à droite ajoute `?lang=en` à l'adresse, gardé de page en page
(**FR** revient au français). Les textes des pages sont traduits dans `i18n.js` : chaque texte français y sert de clé.
Un texte ajouté dans une page ou un script doit y recevoir sa traduction, sinon il reste en français sur le site anglais.
Les types de publications et de conférences, les langues, les pays et les villes de la carte y sont aussi traduits ;
les titres, revues et congrès restent tels qu'écrits dans le tableau. Les périodes du graphique ont leur nom anglais
dans `config.js` (`nom_en`), les thèmes dans `donnees/themes.csv`.

## Lancer la collecte à la main

```sh
pip install requests
python3 outils/collecter.py configurer <URL du script> <clé>   # une seule fois
python3 outils/collecter.py --simulation   # montre ce qui changerait
python3 outils/collecter.py                # envoie les nouveautés au tableau, puis en fait une copie
python3 outils/collecter.py copie          # copie seulement le tableau dans donnees/publications.csv
```

## Voir le site sur son ordinateur

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

## Installer le tableau (une seule fois)

1. Créer un tableau Google Sheets vide (par exemple « Archives F. Veyckemans — publications »).
2. *Extensions → Apps Script* : remplacer le contenu de `Code.gs` par `outils/tableau.gs`, enregistrer.
3. Choisir la fonction `installer`, cliquer sur ▶ *Exécuter*, accepter l'autorisation.
   L'onglet « Publications » se remplit avec la liste actuelle ; le journal affiche la **clé secrète**.
4. *Déployer → Nouveau déploiement* → type *Application Web* ; exécuter en tant que : *Moi* ;
   accès : *Tout le monde*. Copier l'**URL**.
5. *Partager* le tableau : « Tous les utilisateurs disposant du lien » → *Lecteur*.
6. Mettre l'identifiant du tableau (entre `/d/` et `/edit` dans son adresse) dans `config.js`, ligne `tableau:`.
7. Sur GitHub : *Settings → Secrets and variables → Actions* → créer `ARCHIVES_URL` (l'URL)
   et `ARCHIVES_CLE` (la clé).

## Mise en ligne du site

1. Créer un dépôt sur GitHub et y pousser ce dossier.
2. Dans le dépôt : *Settings → Pages → Source : **GitHub Actions***.
3. Adapter `config.js` au nom du dépôt.
