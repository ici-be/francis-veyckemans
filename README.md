# Archives de Francis Veyckemans

Site GitHub Pages qui rassemble les travaux de Francis Veyckemans en anesthésie pédiatrique.
Première section : la liste de ses publications scientifiques.

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js` | la page (aucune compilation nécessaire) |
| `donnees/publications.csv` | **la liste des publications** : c'est le seul fichier à modifier |
| `outils/collecter.py` | cherche les publications dans PubMed, OpenAlex et ORCID et complète le CSV |
| `config.js` | nom du dépôt GitHub (pour le lien « Proposer une correction ») |
| `.github/workflows/publier.yml` | publie le site à chaque modification, et lance la collecte le 1er du mois |

## Corriger ou compléter la liste

Le fichier `donnees/publications.csv` s'ouvre dans un tableur (LibreOffice Calc, Excel)
ou directement sur GitHub (bouton crayon ✏️). Une ligne = une publication.

**Le script automatique ne remplit que les cases vides.** Tout ce qu'un humain écrit est donc
conservé lors des mises à jour suivantes.

| Pour… | faire… |
|---|---|
| corriger un titre, une revue, une année… | remplacer le texte dans la case |
| ajouter un lien vers un PDF | coller l'adresse dans `lien_pdf` |
| retirer une publication (homonyme, doublon, erratum…) | écrire `oui` dans `masquer` — **ne pas supprimer la ligne**, sinon elle reviendrait à la prochaine collecte |
| empêcher toute modification automatique d'une ligne | écrire `oui` dans `verrouille` (utile si l'on veut volontairement laisser une case vide) |
| ajouter une remarque visible sous le titre | l'écrire dans `notes` |
| ajouter une publication absente des bases | ajouter une ligne ; remplir au moins `id` (n'importe quel code unique, par exemple `manuel-2019-1`), `annee`, `titre`, `auteurs` |

Colonnes : `id`, `annee`, `titre`, `auteurs` (séparés par des virgules), `revue`, `volume`,
`numero`, `pages`, `type`, `langue`, `doi`, `pmid`, `pmcid`, `lien_info` (page de l'article),
`lien_pdf`, `notes`, `masquer`, `verrouille`, `sources` (où l'article a été trouvé),
`ajoute_le` (date d'ajout automatique).

Le `type` est libre ; les types existants : article, étude clinique, revue de la littérature,
recommandations, éditorial, lettre / commentaire, cas clinique, chapitre de livre, livre,
résumé de congrès, avis Faculty Opinions (F1000), dépôt universitaire (DIAL, Lirias), erratum.

Avec un tableur : enregistrer au **format CSV**, encodage **UTF-8**, séparateur **virgule**,
guillemets autour du texte.

## Lancer la collecte à la main

```sh
pip install requests
python3 outils/collecter.py --simulation   # montre ce qui changerait
python3 outils/collecter.py                # complète donnees/publications.csv
```

## Voir le site sur son ordinateur

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

## Mise en ligne (une seule fois)

1. Créer un dépôt sur GitHub et y pousser ce dossier.
2. Dans le dépôt : *Settings → Pages → Source : **GitHub Actions***.
3. Adapter `config.js` au nom du dépôt.
