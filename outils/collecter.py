#!/usr/bin/env python3
"""Collecte les publications de Francis Veyckemans et complète donnees/publications.csv.

Sources interrogées : PubMed, OpenAlex (qui inclut les données d'Unpaywall pour les PDF
en accès libre) et son profil ORCID.

Règles, pour que les corrections faites à la main ne soient jamais perdues :
- une ligne déjà présente n'est jamais supprimée ;
- une case déjà remplie n'est jamais modifiée : le script ne remplit que les cases vides ;
- une ligne avec « oui » dans la colonne verrouille n'est pas touchée du tout ;
- un article nouveau est ajouté à la fin, avec la date du jour dans ajoute_le.

Usage : python3 outils/collecter.py [--simulation]
  --simulation : affiche ce qui changerait, sans écrire le fichier.
"""
import csv
import datetime
import re
import sys
import time
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "donnees" / "publications.csv"

ORCID = "0000-0001-9670-8588"
# OpenAlex a éclaté ses publications entre plusieurs profils d'auteur
OPENALEX_AUTEURS = [
    "A5031410557", "A5065935614", "A5113506534", "A5029451482",
    "A5081804673", "A5109360318", "A5148869488", "A5038694507",
]
PUBMED_REQUETE = "Veyckemans F[Author]"

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
    ("Comment", "lettre / commentaire"),
    ("Letter", "lettre / commentaire"),
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
    auteurs = []
    for a in art.iterfind(".//AuthorList/Author"):
        nom, ini = a.findtext("LastName"), a.findtext("Initials")
        if nom:
            auteurs.append(f"{nom} {ini or ''}".strip())
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
        "_source": "PubMed",
    }


# ---------------------------------------------------------------- OpenAlex

TYPES_OPENALEX = {
    "review": "revue de la littérature", "editorial": "éditorial", "letter": "lettre / commentaire",
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


def main():
    simulation = "--simulation" in sys.argv
    existantes = []
    if FICHIER.exists():
        with FICHIER.open(newline="", encoding="utf-8") as f:
            existantes = list(csv.DictReader(f))

    index = Index()
    for f in existantes:
        index.ajouter(f)

    # PubMed d'abord : ses métadonnées sont les plus soignées pour la médecine
    trouvees = pubmed() + openalex() + orcid()
    aujourdhui = datetime.date.today().isoformat()
    nouvelles, modifiees = [], {}
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
        if fiche.get("verrouille", "").strip().lower() == "oui":
            continue
        remplies = completer(fiche, r)
        sources = [s for s in (fiche.get("sources") or "").split(", ") if s]
        if r["_source"] not in sources:
            sources.append(r["_source"])
            fiche["sources"] = ", ".join(sources)
        if remplies and fiche not in nouvelles:
            modifiees.setdefault(id(fiche), (fiche, set()))[1].update(remplies)
        index.indexer(fiche)  # un DOI ou PMID découvert permet d'autres rapprochements

    pris = {f["id"] for f in index.fiches if f.get("id")}
    for f in nouvelles:
        f["type"] = f.get("type") or "article"
        f["id"] = nouvel_id(f, pris)
        pris.add(f["id"])

    print(f"\n{len(nouvelles)} publication(s) nouvelle(s), {len(modifiees)} complétée(s).", file=sys.stderr)
    for f, cols in modifiees.values():
        print(f"  complétée : {f['id']} ({', '.join(sorted(cols))})", file=sys.stderr)
    if simulation:
        for f in nouvelles:
            print(f"  nouvelle : {f['annee']} {f['titre'][:90]}", file=sys.stderr)
        return

    toutes = existantes + nouvelles
    toutes.sort(key=lambda f: (-(int(f["annee"]) if f.get("annee", "").isdigit() else 0), f.get("titre", "")))
    FICHIER.parent.mkdir(exist_ok=True)
    with FICHIER.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES, extrasaction="ignore")
        w.writeheader()
        w.writerows(toutes)
    print(f"Écrit : {FICHIER.relative_to(RACINE)} ({len(toutes)} lignes)", file=sys.stderr)


if __name__ == "__main__":
    main()
