#!/usr/bin/env python3
"""Collecte les publications de Francis Veyckemans et complète le tableau Google Sheets.

Sources interrogées : PubMed, OpenAlex (qui inclut les données d'Unpaywall pour les PDF
en accès libre), son profil ORCID, et pour les livres le catalogue de la BnF et le SUDOC.

Règles, pour que les corrections faites à la main ne soient jamais perdues :
- une ligne déjà présente n'est jamais supprimée ;
- une case déjà remplie n'est jamais modifiée : le script ne remplit que les cases vides ;
- une ligne dont la case « verrouille » est cochée n'est pas touchée du tout ;
- un article nouveau est ajouté, avec la date du jour dans ajoute_le.

Le tableau est celui de config.js (tableau: "…"). Le script lit le tableau, cherche les
nouveautés et les envoie au script du tableau (outils/tableau.gs), qui les écrit. Il enregistre
ensuite une copie du tableau dans donnees/publications.csv (secours si Google est injoignable).
Sans tableau dans config.js, c'est donnees/publications.csv qui est complété directement.

Il écrit aussi deux fichiers que personne n'a besoin de remplir dans le tableau :
- donnees/citations.csv : nombre de citations de chaque publication (OpenAlex), réécrit à chaque fois ;
- donnees/coauteurs.csv : forme complète « Nom Prénom » des variantes de noms d'auteurs
  (« Pirotte T », « Thierry Pirotte » → « Pirotte Thierry »). Les lignes existantes, éventuellement
  corrigées à la main, sont conservées : seules les variantes nouvelles sont ajoutées.

Usage :
  python3 outils/collecter.py                       collecte et envoi au tableau
  python3 outils/collecter.py --simulation          affiche ce qui changerait, sans rien écrire
  python3 outils/collecter.py annexes               met à jour seulement citations.csv et coauteurs.csv
  python3 outils/collecter.py copie                 copie le tableau dans donnees/publications.csv
  python3 outils/collecter.py configurer URL CLÉ    enregistre l'accès au script du tableau
                                                    (dans ~/.config/archives-fv/, hors du dépôt)
Sur GitHub, l'URL et la clé viennent des secrets ARCHIVES_URL et ARCHIVES_CLE.
"""
import collections
import csv
import datetime
import json
import os
import re
import sys
import time
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "donnees" / "publications.csv"
CITATIONS = RACINE / "donnees" / "citations.csv"
COAUTEURS = RACINE / "donnees" / "coauteurs.csv"

ORCID = "0000-0001-9670-8588"
# OpenAlex a éclaté ses publications entre plusieurs profils d'auteur
OPENALEX_AUTEURS = [
    "A5031410557", "A5065935614", "A5113506534", "A5029451482",
    "A5081804673", "A5109360318", "A5148869488", "A5038694507",
]
PUBMED_REQUETE = "Veyckemans F[Author]"
IDREF = "096506385"  # sa notice d'autorité dans le catalogue universitaire français (SUDOC)

COLONNES = [
    "id", "annee", "titre", "auteurs", "revue", "volume", "numero", "pages",
    "type", "langue", "doi", "pmid", "pmcid", "lien_info", "lien_pdf",
    "notes", "masquer", "verrouille", "sources", "ajoute_le",
]
# colonnes que le script remplit ; les autres sont réservées aux humains
COLONNES_AUTO = [
    "annee", "titre", "auteurs", "revue", "volume", "numero", "pages",
    "type", "langue", "doi", "pmid", "pmcid", "lien_info", "lien_pdf",
]

session = requests.Session()
session.headers["User-Agent"] = "archives-francis-veyckemans (github pages)"


def get(url, **kw):
    for essai in range(4):
        try:
            r = session.get(url, timeout=60, **kw)
            if r.status_code == 429 or r.status_code >= 500:
                raise requests.HTTPError(r.status_code)
            r.raise_for_status()
            return r
        except (requests.RequestException, requests.HTTPError):
            if essai == 3:
                raise
            time.sleep(2 * (essai + 1))


def cle_titre(titre):
    t = unicodedata.normalize("NFKD", titre or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", t)[:80]


def norm_doi(doi):
    doi = (doi or "").strip().lower()
    return re.sub(r"^(https?://)?(dx\.)?doi\.org/", "", doi)


def nettoyer(texte):
    texte = re.sub(r"<[^>]+>", "", texte or "")  # balises <i>, <sup>… dans les titres
    return re.sub(r"\s+", " ", texte).strip().rstrip(".")


# ---------------------------------------------------------------- PubMed

TYPES_PUBMED = [  # du plus spécifique au plus général
    ("Published Erratum", "erratum"),
    ("Retraction of Publication", "erratum"),
    ("Practice Guideline", "recommandations"),
    ("Guideline", "recommandations"),
    ("Consensus Development Conference", "recommandations"),
    ("Editorial", "éditorial"),
    ("Comment", "commentaire"),
    ("Letter", "commentaire"),
    ("Systematic Review", "revue de la littérature"),
    ("Meta-Analysis", "revue de la littérature"),
    ("Review", "revue de la littérature"),
    ("Case Reports", "cas clinique"),
    ("Clinical Trial", "étude clinique"),
    ("Randomized Controlled Trial", "étude clinique"),
    ("Multicenter Study", "étude clinique"),
    ("Observational Study", "étude clinique"),
]
LANGUES = {"eng": "anglais", "fre": "français", "dut": "néerlandais", "ger": "allemand",
           "spa": "espagnol", "ita": "italien", "en": "anglais", "fr": "français",
           "nl": "néerlandais", "de": "allemand", "es": "espagnol", "it": "italien"}


def pubmed():
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    ids = get(base + "esearch.fcgi", params={
        "db": "pubmed", "term": PUBMED_REQUETE, "retmax": 2000, "retmode": "json",
    }).json()["esearchresult"]["idlist"]
    resultats = []
    for i in range(0, len(ids), 200):
        xml = get(base + "efetch.fcgi", params={
            "db": "pubmed", "id": ",".join(ids[i:i + 200]), "retmode": "xml",
        }).content
        for art in ET.fromstring(xml).iter("PubmedArticle"):
            resultats.append(lire_pubmed(art))
        time.sleep(0.4)
    print(f"PubMed : {len(resultats)} articles", file=sys.stderr)
    return resultats


def lire_pubmed(art):
    txt = lambda chemin: "".join(art.find(chemin).itertext()) if art.find(chemin) is not None else ""
    auteurs, noms = [], []
    for a in art.iterfind(".//AuthorList/Author"):
        nom, ini = a.findtext("LastName"), a.findtext("Initials")
        if nom:
            auteurs.append(f"{nom} {ini or ''}".strip())
            noms.append((nom, a.findtext("ForeName") or ""))
        elif a.findtext("CollectiveName"):
            auteurs.append(a.findtext("CollectiveName"))
    annee = art.findtext(".//JournalIssue/PubDate/Year") or ""
    if not annee:
        m = re.search(r"\d{4}", art.findtext(".//JournalIssue/PubDate/MedlineDate") or "")
        annee = m.group(0) if m else ""
    types = [t.text for t in art.iterfind(".//PublicationTypeList/PublicationType")]
    type_ = next((nom for cle, nom in TYPES_PUBMED if cle in types), "article")
    ids = {i.get("IdType"): i.text for i in art.iterfind(".//PubmedData/ArticleIdList/ArticleId")}
    titre = nettoyer(txt(".//ArticleTitle")) or nettoyer(txt(".//VernacularTitle"))
    return {
        "annee": annee,
        "titre": titre.strip("[]"),  # PubMed met entre crochets les titres traduits
        "auteurs": ", ".join(auteurs),
        "revue": art.findtext(".//Journal/ISOAbbreviation") or art.findtext(".//Journal/Title") or "",
        "volume": art.findtext(".//JournalIssue/Volume") or "",
        "numero": art.findtext(".//JournalIssue/Issue") or "",
        "pages": art.findtext(".//Pagination/MedlinePgn") or "",
        "type": type_,
        "langue": LANGUES.get(art.findtext(".//Language") or "", art.findtext(".//Language") or ""),
        "doi": norm_doi(ids.get("doi")),
        "pmid": ids.get("pubmed") or art.findtext(".//PMID") or "",
        "pmcid": ids.get("pmc") or "",
        "_noms": noms,
        "_source": "PubMed",
    }


# ---------------------------------------------------------------- OpenAlex

TYPES_OPENALEX = {
    "review": "revue de la littérature", "editorial": "éditorial", "letter": "commentaire",
    "erratum": "erratum", "book-chapter": "chapitre de livre", "book": "livre",
    "dissertation": "thèse", "paratext": "erratum", "retraction": "erratum",
}

# suppléments de revues où paraissent les résumés de congrès (EJA, Anesthesiology, BJA…)
RESUME_CONGRES = re.compile(r"^10\.1097/0000(3643|0542|0539|7890|5176|0115550)-\d{6}\d*-|^10\.1136/rapm-|^10\.1016/s0007-0912\(18\)|^10\.1016/s1569-1993|^10\.1203/00006450-")


def openalex():
    resultats = []
    for auteur in OPENALEX_AUTEURS:
        page = 1  # pagination par numéro : le « cursor » exige une clé d'API
        while True:
            d = get("https://api.openalex.org/works", params={
                "filter": f"author.id:{auteur}", "per_page": 200, "page": page,
            }).json()
            for w in d["results"]:
                r = lire_openalex(w)
                if r:
                    resultats.append(r)
            if page * 200 >= d["meta"]["count"] or not d["results"]:
                break
            page += 1
    print(f"OpenAlex : {len(resultats)} entrées", file=sys.stderr)
    return resultats


def lire_openalex(w):
    noms = [a.get("raw_author_name") or a["author"].get("display_name") or "" for a in w.get("authorships", [])]
    if not any("veyckemans" in cle_titre(n) for n in noms):
        return None  # attribution douteuse
    if not w.get("title"):
        return None
    loc = w.get("primary_location") or {}
    oa = w.get("best_oa_location") or {}
    biblio = w.get("biblio") or {}
    pages = biblio.get("first_page") or ""
    if biblio.get("last_page") and biblio["last_page"] != pages:
        pages += "-" + biblio["last_page"]
    ids = w.get("ids") or {}
    pmid = (ids.get("pmid") or "").rsplit("/", 1)[-1]
    pmcid = (ids.get("pmcid") or "").rsplit("/", 1)[-1]
    if pmcid and not pmcid.upper().startswith("PMC"):
        pmcid = "PMC" + pmcid
    titre = nettoyer(w["title"])
    revue = ((loc.get("source") or {}).get("display_name")) or ""
    type_ = TYPES_OPENALEX.get(w.get("type"), "")
    if titre.startswith("Faculty Opinions recommendation"):
        type_ = "avis Faculty Opinions (F1000)"
    elif titre in ("Liste des auteurs", "List of contributors"):
        return None
    elif RESUME_CONGRES.search(norm_doi(w.get("doi"))) or re.match(r"^([A-Z]{1,2}[\.-]?\d+[\.:]? |Room )", titre):
        type_ = "résumé de congrès"
    elif not w.get("doi") and re.search(r"DIAL|Digital Access|Lirias", revue):
        type_ = type_ or "dépôt universitaire (DIAL, Lirias)"
    return {
        "annee": str(w.get("publication_year") or ""),
        "titre": titre,
        "auteurs": ", ".join(noms),
        "revue": revue,
        "volume": biblio.get("volume") or "",
        "numero": biblio.get("issue") or "",
        "pages": pages,
        "type": type_,
        "langue": LANGUES.get(w.get("language") or "", ""),
        "doi": norm_doi(w.get("doi")),
        "pmid": pmid,
        "pmcid": pmcid,
        "lien_pdf": oa.get("pdf_url") or "",
        "_page": loc.get("landing_page_url") or "",
        "_citations": w.get("cited_by_count"),
        "_affiches": [a["author"].get("display_name") or "" for a in w.get("authorships", [])],
        "_source": "OpenAlex",
    }


# ---------------------------------------------------------------- ORCID

def orcid():
    d = get(f"https://pub.orcid.org/v3.0/{ORCID}/works", headers={"Accept": "application/json"}).json()
    resultats = []
    for g in d.get("group", []):
        s = g["work-summary"][0]
        doi = next((e["external-id-value"] for e in s.get("external-ids", {}).get("external-id", [])
                    if e["external-id-type"] == "doi"), "")
        date = (s.get("publication-date") or {}).get("year") or {}
        resultats.append({
            "titre": nettoyer(((s.get("title") or {}).get("title") or {}).get("value")),
            "annee": date.get("value") or "",
            "revue": (s.get("journal-title") or {}).get("value") or "",
            "doi": norm_doi(doi),
            "_source": "ORCID",
        })
    print(f"ORCID : {len(resultats)} entrées", file=sys.stderr)
    return resultats


# ---------------------------------------------------------------- livres (BnF, SUDOC)

ROLES_AUTEUR = {"Auteur", "Auteur du texte", "Éditeur scientifique", "Directeur de publication", "Coordinateur"}


def livres():
    """Ses livres, d'après le catalogue de la BnF puis le SUDOC (même livre : même ISBN)."""
    notices = []
    xml = get("https://catalogue.bnf.fr/api/SRU", params={
        "version": "1.2", "operation": "searchRetrieve", "recordSchema": "unimarcxchange",
        "query": 'bib.author all "veyckemans francis"', "maximumRecords": 200,
    }).content
    for rec in ET.fromstring(xml).iter():
        if rec.tag.endswith("}record") and rec.get("format") == "UNIMARC":
            notices.append(lire_unimarc(rec, "BnF"))
    roles = get(f"https://www.idref.fr/services/biblio/{IDREF}.json").json()["sudoc"]["result"]["role"]
    for role in roles if isinstance(roles, list) else [roles]:
        if role.get("roleName") not in ROLES_AUTEUR:
            continue  # pas les thèses dont il était directeur
        docs = role["doc"] if isinstance(role["doc"], list) else [role["doc"]]
        for d in docs:
            if d.get("referentiel") == "sudoc":
                notices.append(lire_unimarc(ET.fromstring(get(f"https://www.sudoc.fr/{d['ppn']}.xml").content), "SUDOC"))
    resultats, par_isbn = [], {}
    for n in notices:
        if not n:
            continue
        deja = par_isbn.get(n["_isbn"]) if n["_isbn"] else None
        if deja:
            for c, v in n.items():
                deja.setdefault(c, v) if deja.get(c) else deja.__setitem__(c, v)
            continue
        resultats.append(n)
        if n["_isbn"]:
            par_isbn[n["_isbn"]] = n
    print(f"BnF et SUDOC : {len(resultats)} livres", file=sys.stderr)
    return resultats


def isbn13(isbn):
    chiffres = re.sub(r"[^0-9Xx]", "", isbn or "")
    if len(chiffres) == 10:  # conversion ISBN-10 → ISBN-13
        base = "978" + chiffres[:9]
        cle = (10 - sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(base)) % 10) % 10
        return base + str(cle)
    return chiffres if len(chiffres) == 13 else ""


def lire_unimarc(rec, source):
    champs = {}
    for df in rec:
        if df.tag.endswith("datafield"):
            sous = {}
            for sf in df:
                sous.setdefault(sf.get("code"), []).append((sf.text or "").strip())
            champs.setdefault(df.get("tag"), []).append(sous)
    sf = lambda tag, code: next((s[code][0] for s in champs.get(tag, []) if code in s), "")
    titre = sf("200", "a")
    if not titre:
        return None
    if sf("200", "e"):
        titre += " : " + sf("200", "e")
    auteurs = []
    for tag in ("700", "701", "702"):
        for a in champs.get(tag, []):
            nom, prenom = (a.get("a") or [""])[0], (a.get("b") or [""])[0]
            if nom and (tag != "702" or "veyckemans" in nom.lower()):
                initiales = "".join(p[0] for p in re.split(r"[\s-]+", prenom) if p)
                auteurs.append(f"{nom} {initiales}".strip())
    if not any("veyckemans" in a.lower() for a in auteurs):
        return None
    editeur = sf("214", "c") or sf("210", "c")
    lieu = sf("214", "a") or sf("210", "a")
    annee = re.search(r"\d{4}", sf("214", "d") or sf("210", "d") or sf("100", "a")[9:13] or "")
    details = [f"{lieu} : {editeur}" if lieu and editeur else editeur, sf("205", "a")]
    lien = next((c.text for c in rec if c.tag.endswith("controlfield") and c.get("tag") == "003"), "")
    return {
        "annee": annee.group(0) if annee else "",
        "titre": nettoyer(titre),
        "auteurs": ", ".join(auteurs),
        "revue": nettoyer(" · ".join(d for d in details if d).replace("[", "").replace("]", "")),
        "type": "livre",
        "langue": LANGUES.get(sf("101", "a"), sf("101", "a")),
        "_page": lien.replace("http://", "https://"),
        "_isbn": isbn13(sf("010", "a")),
        "_source": source,
    }


# ---------------------------------------------------------------- fusion

class Index:
    """Retrouve une fiche par DOI, PMID ou titre (+ année proche)."""

    def __init__(self):
        self.fiches, self.par_doi, self.par_pmid, self.par_titre = [], {}, {}, {}

    def trouver(self, r):
        if r.get("doi") and r["doi"] in self.par_doi:
            return self.par_doi[r["doi"]]
        if r.get("pmid") and r["pmid"] in self.par_pmid:
            return self.par_pmid[r["pmid"]]
        for f in self.par_titre.get(cle_titre(r.get("titre")), []):
            # même titre mais identifiants différents : publication distincte (texte co-publié dans deux revues)
            if any(f.get(c) and r.get(c) and f[c] != r[c] for c in ("doi", "pmid")):
                continue
            a, b = f.get("annee"), r.get("annee")
            if not a or not b or abs(int(a) - int(b)) <= 1:
                return f
        if r.get("type") == "livre":
            # un livre peut être catalogué avec ou sans sous-titre (« …, tome 2 »)
            cle = cle_titre(r.get("titre"))
            for f in self.fiches:
                autre = cle_titre(f.get("titre"))
                if f.get("type") == "livre" and len(min(cle, autre, key=len)) > 15 \
                        and (autre.startswith(cle) or cle.startswith(autre)) and abs(int(f.get("annee") or 0) - int(r.get("annee") or 0)) <= 1:
                    return f
        return None

    def ajouter(self, f):
        self.fiches.append(f)
        self.indexer(f)

    def indexer(self, f):
        if f.get("doi"):
            self.par_doi.setdefault(f["doi"], f)
        if f.get("pmid"):
            self.par_pmid.setdefault(f["pmid"], f)
        if f.get("titre") and len(cle_titre(f["titre"])) > 15:
            liste = self.par_titre.setdefault(cle_titre(f["titre"]), [])
            if f not in liste:
                liste.append(f)


def completer(fiche, r):
    """Remplit les cases vides de fiche avec les valeurs de r. Renvoie les colonnes remplies."""
    remplies = []
    for c in COLONNES_AUTO:
        if not (fiche.get(c) or "").strip() and r.get(c):
            fiche[c] = r[c]
            remplies.append(c)
    return remplies


def liens(r):
    """Calcule lien_info et lien_pdf à partir des identifiants."""
    if r.get("doi"):
        r.setdefault("lien_info", f"https://doi.org/{r['doi']}")
    elif r.get("pmid"):
        r.setdefault("lien_info", f"https://pubmed.ncbi.nlm.nih.gov/{r['pmid']}/")
    elif r.get("_page"):
        r.setdefault("lien_info", r["_page"])
    if not r.get("lien_pdf") and r.get("pmcid"):
        r["lien_pdf"] = f"https://europepmc.org/articles/{r['pmcid']}?pdf=render"


def nouvel_id(fiche, pris):
    base = ("doi:" + fiche["doi"]) if fiche.get("doi") else ("pmid:" + fiche["pmid"]) if fiche.get("pmid") \
        else f"{fiche.get('annee') or 'sd'}-{cle_titre(fiche.get('titre'))[:30]}"
    id_, n = base, 2
    while id_ in pris:
        id_, n = f"{base}-{n}", n + 1
    return id_


def oui(v):
    return (v or "").strip().lower() in ("oui", "x", "1", "true", "vrai")


# ---------------------------------------------------------------- citations et noms complets

def ecrire_citations(paires):
    """Nombre de citations OpenAlex par publication (le plus grand si l'article a plusieurs fiches OpenAlex)."""
    compte = {}
    for fiche, r in paires:
        if r.get("_citations") is not None and fiche.get("id"):
            compte[fiche["id"]] = max(compte.get(fiche["id"], 0), r["_citations"])
    with CITATIONS.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "citations"])
        w.writerows(sorted(compte.items()))
    print(f"Écrit : {CITATIONS.relative_to(RACINE)} ({len(compte)} lignes)", file=sys.stderr)


def simple(texte):
    return unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode().lower().strip()


INITIALES = re.compile(r"^(.*\S)\s+([A-Z]{1,4})$")  # « Pirotte T », « de Ville de Goyet J »
COLLECTIF = re.compile(r"group|network|collaborat|investigator|consortium|society|committee|team|study", re.I)


def prenom_complet(prenom):
    return any(len(m) >= 2 and m != m.upper() for m in re.split(r"[\s.-]+", prenom or ""))


def ecrire_coauteurs(fiches, trouvees):
    """Associe chaque variante de nom à « Nom Prénom », d'après les prénoms de PubMed et d'OpenAlex.

    Deux variantes désignent la même personne si elles ont le même nom de famille et la même
    initiale de prénom (« Pirotte T » = « Thierry Pirotte »). Les homonymes éventuels se corrigent
    à la main dans coauteurs.csv."""
    familles = {simple(nom) for r in trouvees for nom, _ in r.get("_noms", [])}

    def cle(brut):
        m = INITIALES.match(brut)
        if m:
            return simple(m.group(1)), m.group(2)[0].lower()
        b = simple(brut)
        nom = max((f for f in familles if b.endswith(" " + f)), key=len, default=b.rsplit(" ", 1)[-1])
        return nom, b[:1]

    complets = {}  # clé -> Counter des « Nom Prénom »
    for r in trouvees:
        for nom, prenom in r.get("_noms", []):
            if prenom_complet(prenom):
                complets.setdefault((simple(nom), simple(prenom)[:1]), collections.Counter())[f"{nom} {prenom}"] += 1
        for affiche in r.get("_affiches", []):
            mots = affiche.split()
            nom = cle(affiche)[0]
            n = len(nom.split())
            if nom in familles and len(mots) > n and prenom_complet(" ".join(mots[:-n])):
                complets.setdefault(cle(affiche), collections.Counter())[" ".join(mots[-n:] + mots[:-n])] += 1

    variantes = collections.Counter(a.strip() for f in fiches for a in (f.get("auteurs") or "").split(",") if a.strip())
    groupes = {}
    for brut in variantes:
        if not COLLECTIF.search(brut) and len(brut.split()) <= 5:
            groupes.setdefault(cle(brut), []).append(brut)

    alias = {}
    if COAUTEURS.exists():
        with COAUTEURS.open(newline="", encoding="utf-8") as f:
            alias = {l["alias"]: l["nom"] for l in csv.DictReader(f) if l.get("alias")}
    ajoutes = 0
    for k, bruts in groupes.items():
        if complets.get(k):
            forme = complets[k].most_common(1)[0][0]
        else:  # pas de prénom connu : la variante « Nom I » la plus fréquente
            forme = max(bruts, key=lambda b: (bool(INITIALES.match(b)), variantes[b]))
        for b in bruts:
            if b != forme and b not in alias:
                alias[b] = forme
                ajoutes += 1
    with COAUTEURS.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["alias", "nom"])
        w.writerows(sorted(alias.items(), key=lambda a: (simple(a[1]), simple(a[0]))))
    print(f"Écrit : {COAUTEURS.relative_to(RACINE)} ({len(alias)} lignes, {ajoutes} nouvelle(s))", file=sys.stderr)


# ---------------------------------------------------------------- tableau Google Sheets

CONFIG_LOCALE = Path.home() / ".config" / "archives-fv" / "config.json"


def id_tableau():
    """SHEET_ID lu dans config.js, pour n'avoir qu'un seul endroit où le changer."""
    m = re.search(r'tableau:\s*"([^"]*)"', (RACINE / "config.js").read_text(encoding="utf-8"))
    return m.group(1) if m else ""


def lire_tableau(sheet_id):
    r = get(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export", params={"format": "csv", "gid": 0})
    r.encoding = "utf-8"
    return list(csv.DictReader(r.text.splitlines()))


def acces_script():
    """URL et clé du script du tableau : variables d'environnement (GitHub) ou fichier local."""
    url, cle = os.environ.get("ARCHIVES_URL"), os.environ.get("ARCHIVES_CLE")
    if not (url and cle) and CONFIG_LOCALE.exists():
        c = json.loads(CONFIG_LOCALE.read_text())
        url, cle = c.get("url"), c.get("cle")
    if not (url and cle):
        sys.exit("Script du tableau non configuré : python3 outils/collecter.py configurer <URL> <clé>")
    return url, cle


def envoyer(url, cle, ajouter, completer_, essai=False):
    r = session.post(url, data=json.dumps({"cle": cle, "ajouter": ajouter, "completer": completer_, "essai": essai}),
                     headers={"Content-Type": "text/plain"}, timeout=300)  # text/plain : pas de pré-vol CORS
    r.raise_for_status()
    rep = r.json()
    if rep.get("erreur"):
        sys.exit("Le script du tableau a refusé l'envoi : " + rep["erreur"])
    return rep


def ecrire_csv(lignes):
    FICHIER.parent.mkdir(exist_ok=True)
    with FICHIER.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES, extrasaction="ignore")
        w.writeheader()
        w.writerows(lignes)
    print(f"Écrit : {FICHIER.relative_to(RACINE)} ({len(lignes)} lignes)", file=sys.stderr)


# ---------------------------------------------------------------- programme

def main():
    args = sys.argv[1:]
    if args[:1] == ["configurer"]:
        if len(args) != 3:
            sys.exit("Usage : python3 outils/collecter.py configurer <URL du script> <clé>")
        CONFIG_LOCALE.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_LOCALE.write_text(json.dumps({"url": args[1], "cle": args[2]}))
        CONFIG_LOCALE.chmod(0o600)
        print(f"Enregistré dans {CONFIG_LOCALE}", file=sys.stderr)
        return

    sheet_id = id_tableau()
    if args[:1] == ["copie"]:
        if not sheet_id:
            sys.exit("Aucun tableau dans config.js.")
        ecrire_csv(lire_tableau(sheet_id))
        return

    simulation = "--simulation" in args
    annexes = args[:1] == ["annexes"]
    if sheet_id:
        url, cle = (None, None) if simulation or annexes else acces_script()
        existantes = lire_tableau(sheet_id)
        print(f"Tableau : {len(existantes)} lignes", file=sys.stderr)
    else:
        existantes = []
        if FICHIER.exists():
            with FICHIER.open(newline="", encoding="utf-8") as f:
                existantes = list(csv.DictReader(f))

    index = Index()
    for f in existantes:
        index.ajouter(f)

    # PubMed d'abord : ses métadonnées sont les plus soignées pour la médecine
    trouvees = pubmed() + openalex() + orcid() + livres()
    aujourdhui = datetime.date.today().isoformat()
    nouvelles, modifiees, paires = [], {}, []
    for r in trouvees:
        liens(r)
        fiche = index.trouver(r)
        if fiche is None:
            if r["_source"] == "ORCID":
                continue  # trop peu d'informations pour créer une fiche seule
            fiche = {c: "" for c in COLONNES}
            fiche["ajoute_le"] = aujourdhui
            if r.get("type") == "erratum":
                fiche["masquer"] = "oui"
                fiche["notes"] = "masqué automatiquement (erratum)"
            index.ajouter(fiche)
            nouvelles.append(fiche)
        paires.append((fiche, r))
        if oui(fiche.get("verrouille")):
            continue
        remplies = completer(fiche, r)
        sources = [s for s in (fiche.get("sources") or "").split(", ") if s]
        if r["_source"] not in sources:
            sources.append(r["_source"])
            fiche["sources"] = ", ".join(sources)
            remplies.append("sources")
        if remplies and fiche not in nouvelles:
            modifiees.setdefault(id(fiche), (fiche, set()))[1].update(remplies)
        index.indexer(fiche)  # un DOI ou PMID découvert permet d'autres rapprochements

    pris = {f["id"] for f in index.fiches if f.get("id")}
    for f in nouvelles:
        f["type"] = f.get("type") or "article"
        f["id"] = nouvel_id(f, pris)
        pris.add(f["id"])

    completees = [(f, cols - {"sources"}) for f, cols in modifiees.values() if cols - {"sources"}]
    print(f"\n{len(nouvelles)} publication(s) nouvelle(s), {len(completees)} complétée(s).", file=sys.stderr)
    for f, cols in completees:
        print(f"  complétée : {f['id']} ({', '.join(sorted(cols))})", file=sys.stderr)
    if simulation:
        for f in nouvelles:
            print(f"  nouvelle : {f['annee']} {f['titre'][:90]}", file=sys.stderr)
        return

    ecrire_citations(paires)
    ecrire_coauteurs(index.fiches, trouvees)
    if annexes:
        return

    if sheet_id:
        a_completer = [{
            "id": f["id"],
            "remplir": {c: f[c] for c in cols if c != "sources"},
            "remplacer": {"sources": f["sources"]} if "sources" in cols else {},
        } for f, cols in modifiees.values()]
        if nouvelles or a_completer:
            rep = envoyer(url, cle, [{c: f.get(c, "") for c in COLONNES} for f in nouvelles], a_completer)
            print(f"Tableau : {len(rep['ajoutees'])} ajoutée(s), {len(rep['completees'])} complétée(s)", file=sys.stderr)
            for i in rep["ignorees"]:
                print(f"  ignorée : {i}", file=sys.stderr)
        ecrire_csv(lire_tableau(sheet_id))  # copie de secours dans le dépôt
        return

    toutes = existantes + nouvelles
    toutes.sort(key=lambda f: (-(int(f["annee"]) if f.get("annee", "").isdigit() else 0), f.get("titre", "")))
    ecrire_csv(toutes)


if __name__ == "__main__":
    main()
