# Archives de Francis Veyckemans

Site GitHub Pages qui rassemble les travaux de Francis Veyckemans en anesthésie pédiatrique.
Pages : publications, thèmes, lectures commentées (avis Faculty Opinions), coauteurs.

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `themes.html`, `lectures.html`, `coauteurs.html` | les pages (aucune compilation nécessaire) ; chacune a son script `.js` du même nom (`app.js` pour la première) |
| `commun.js`, `style.css` | chargement des données, boutons « Citer » et export BibTeX / RIS ; mise en page |
| **tableau Google Sheets** | **la liste des publications** : c'est là qu'on corrige ; le site le lit en direct |
| `donnees/publications.csv` | copie de secours du tableau (mise à jour chaque lundi), utilisée si Google est injoignable |
| `outils/collecter.py` | cherche les publications dans PubMed, OpenAlex, ORCID, et les livres à la BnF et au SUDOC, et les envoie au tableau |
| `outils/tableau.gs` | script du tableau : reçoit les envois de `collecter.py` (à coller dans Apps Script) |
| `donnees/citations.csv` | nombre de citations de chaque publication (OpenAlex), réécrit par chaque collecte |
| `donnees/coauteurs.csv` | forme complète « Nom Prénom » des variantes de noms (`alias,nom`) : complété par la collecte, corrigeable à la main (une ligne corrigée n'est plus modifiée) |
| `donnees/themes.csv` | les thèmes : nom, description, mots cherchés dans les titres (séparés par `;`, sans accents ni majuscules) |
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
`ajoute_le` (date d'ajout automatique).

Le `type` est libre ; les types existants : article, étude clinique, revue de la littérature,
recommandations, éditorial, commentaire, cas clinique, chapitre de livre, livre,
résumé de congrès, avis Faculty Opinions (F1000), dépôt universitaire (DIAL, Lirias), erratum.

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
