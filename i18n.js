// Langue du site : français par défaut, anglais avec « ?lang=en » dans l'adresse (gardé d'une page à l'autre).
// Chargé dans le <head> de chaque page, avant les autres scripts.
// Les textes français servent de clés : t("Rechercher") rend « Search » en anglais, le texte tel quel en français.
window.I18N = (function () {
  "use strict";

  const langue = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "fr";
  const en = langue === "en";
  document.documentElement.lang = langue;

  const EN = {
    // titres et descriptions des pages
    "Francis Veyckemans — Publications": "Francis Veyckemans — Publications",
    "Francis Veyckemans — Thèmes": "Francis Veyckemans — Themes",
    "Francis Veyckemans — Lectures commentées": "Francis Veyckemans — Article reviews",
    "Francis Veyckemans — Coauteurs": "Francis Veyckemans — Co-authors",
    "Francis Veyckemans — Conférences": "Francis Veyckemans — Presentations",
    "Francis Veyckemans — Vidéos et podcasts": "Francis Veyckemans — Videos and podcasts",
    "Francis Veyckemans — Maladies rares": "Francis Veyckemans — Rare diseases",
    "Francis Veyckemans — Liens": "Francis Veyckemans — Links",
    "Archives des travaux de Francis Veyckemans en anesthésie pédiatrique : publications scientifiques.":
      "Archive of Francis Veyckemans's work in paediatric anaesthesia: scientific publications.",
    "Publications regroupées par thème, d'après les mots de leur titre.":
      "Publications grouped by theme, based on the words in their titles.",
    "Articles recommandés et commentés par Francis Veyckemans pour Faculty Opinions (F1000).":
      "Articles recommended and reviewed by Francis Veyckemans for Faculty Opinions (F1000).",
    "Coauteurs des publications de Francis Veyckemans.": "Co-authors of Francis Veyckemans's publications.",
    "Conférences, communications et posters de Francis Veyckemans : congrès, lieux et dates.":
      "Lectures, oral communications and posters by Francis Veyckemans: meetings, venues and dates.",
    "Conférences enregistrées et entretiens de Francis Veyckemans en anesthésie pédiatrique.":
      "Recorded lectures and interviews of Francis Veyckemans in paediatric anaesthesia.",
    "Syndromes & maladies rares en pédiatrie : anesthésie — base de données tenue par Francis Veyckemans et Jean-Louis Scholtes.":
      "Syndromes & rare diseases in paediatrics: anaesthesia — database maintained by Francis Veyckemans and Jean-Louis Scholtes.",
    "Sociétés savantes, revues et ressources en lien avec les archives de Francis Veyckemans.":
      "Learned societies, journals and resources related to Francis Veyckemans's archive.",

    // en-tête et menu
    "Anesthésie pédiatrique · archives": "Paediatric anaesthesia · archive",
    "Thèmes": "Themes",
    "Lectures commentées": "Article reviews",
    "Coauteurs": "Co-authors",
    "Conférences": "Presentations",
    "Vidéos et podcasts": "Videos and podcasts",
    "Maladies rares": "Rare diseases",
    "Liens": "Links",

    // textes communs des pages
    "Chargement…": "Loading…",
    "Filtres": "Filters",
    "Rechercher": "Search",
    "Type": "Type",
    "Tous les types": "All types",
    "Titre": "Title",
    "Date": "Date",
    "La liste n'a pas pu être chargée ({e}).": "The list could not be loaded ({e}).",
    "{n} sur {total}": "{n} of {total}",

    // publications
    "Publications par année": "Publications by year",
    "Nombre de publications par année": "Number of publications per year",
    "Cliquer sur une barre ou une période pour filtrer la liste.": "Click a bar or a period to filter the list.",
    "titre, auteur, revue, mot…": "title, author, journal, word…",
    "avec PDF librement accessible": "with freely available PDF",
    "Exporter la sélection :": "Export selection:",
    "Année": "Year",
    "Titre et auteurs": "Title and authors",
    "Revue": "Journal",
    "Citations": "Citations",
    "Nombre de citations selon OpenAlex": "Number of citations according to OpenAlex",
    "Citations selon OpenAlex": "Citations according to OpenAlex",
    "Articles qui citent cette publication (OpenAlex)": "Articles citing this publication (OpenAlex)",
    "{n} publication sur {total}": "{n} publication of {total}",
    "{n} publications sur {total}": "{n} publications of {total}",
    "année {a}": "year {a}",
    "avec {nom}": "with {nom}",
    "Retirer ce filtre": "Remove this filter",
    "et {n} autres": "and {n} more",
    "Aucune publication ne correspond à ces critères.": "No publication matches these criteria.",
    "{a} : {n}": "{a}: {n}",
    "aucune": "none",
    "copie du {date}": "copy of {date}",
    "en direct du tableau": "live from the spreadsheet",
    "Page de l'article": "Article page",
    "Fiche": "Record",
    "Citer": "Cite",
    "Copier": "Copy",
    "Copié": "Copied",
    "s.d.": "n.d.",

    // thèmes
    "Publications regroupées d'après les mots de leur titre. Une publication peut appartenir à plusieurs thèmes.":
      "Publications grouped by the words in their titles. A publication may belong to several themes.",
    "Les thèmes n'ont pas pu être chargés ({e}).": "The themes could not be loaded ({e}).",

    // lectures commentées
    "Articles recommandés et commentés pour Faculty Opinions (F1000).": "Articles recommended and reviewed for Faculty Opinions (F1000).",
    "titre, auteur, revue…": "title, author, journal…",
    "{n} recommandé et commenté pour Faculty Opinions (F1000), de {de} à {a}.":
      "{n} recommended and reviewed for Faculty Opinions (F1000), from {de} to {a}.",
    "{n} recommandés et commentés pour Faculty Opinions (F1000), de {de} à {a}.":
      "{n} recommended and reviewed for Faculty Opinions (F1000), from {de} to {a}.",
    "Lire l'avis": "Read the review",
    "Article commenté": "Reviewed article",

    // coauteurs
    "nom…": "name…",
    "afficher aussi les coauteurs d'une seule publication": "also show co-authors of a single publication",
    "Nom": "Name",
    "Période": "Period",
    "{n} coauteurs, dont {f} pour au moins deux publications. Un nom mène à la liste des publications communes.":
      "{n} co-authors, {f} of them on at least two publications. A name leads to the list of joint publications.",
    "Aucun coauteur ne correspond.": "No co-author matches.",
    "Liens entre coauteurs": "Links between co-authors",
    "Les 40 coauteurs les plus fréquents, placés selon l'année de leur première publication commune. Un arc relie deux coauteurs d'au moins trois publications ensemble ; la couleur est celle du thème le plus fréquent (gris : aucun). Un clic sur un point affiche ses coauteurs dans le tableau.":
      "The 40 most frequent co-authors, placed by the year of their first joint publication. An arc links two co-authors of at least three publications together; the colour is that of their most frequent theme (grey: none). Clicking a point shows their co-authors in the table.",
    "Liens entre les principaux coauteurs": "Links between the main co-authors",
    "thème : {t}": "theme: {t}",
    "coauteurs de {nom}": "co-authors of {nom}",
    "effacer": "clear",
    "Cliquer pour voir ses coauteurs.": "Click to see their co-authors.",

    // conférences et carte
    "Lieux des conférences": "Presentation venues",
    "titre, congrès, ville, orateur…": "title, meeting, city, speaker…",
    "Congrès et lieu": "Meeting and venue",
    "{n}, de {de} à {a}. La liste est encore incomplète.": "{n}, from {de} to {a}. The list is still incomplete.",
    "Diapos": "Slides",
    "Vidéo": "Video",
    "Aucune intervention ne correspond.": "No presentation matches.",
    "Sans position connue : {lieux}.": "No known location: {lieux}.",
    "toutes les villes": "all cities",
    "Agrandir la carte": "Enlarge the map",
    "Réduire la carte": "Shrink the map",
    "Europe": "Europe",
    "Belgique et environs": "Belgium area",
    "Amérique du Nord": "North America",
    "Amérique du Sud": "South America",
    "Océan Indien": "Indian Ocean",
    "Afrique": "Africa",
    "Asie": "Asia",
    "Océanie": "Oceania",

    // vidéos et podcasts
    "titre, événement, intervenant…": "title, event, speaker…",
    "{n} et {m}.": "{n} and {m}.",
    "Lire la vidéo : {titre}": "Play the video: {titre}",
    "Écouter le podcast : {titre}": "Listen to the podcast: {titre}",
    "Voir sur YouTube": "Watch on YouTube",
    "Page du podcast": "Podcast page",
    "Ouvrir": "Open",
    "avec {noms}": "with {noms}",
    "en {langue}": "in {langue}",
    "Rien ne correspond.": "Nothing matches.",

    // liens
    "Rubriques": "Categories",
    "Autres": "Other",
    "Sociétés d'anesthésie": "Anaesthesia societies",
    "Revues": "Journals",
    "Formation": "Education",
    "Institutions": "Institutions",
    "Humanitaire": "Humanitarian",
    "Sources de ces archives": "Sources of this archive",

    // maladies rares
    "À savoir": "Good to know",
    "Explorateur des fiches": "Database explorer",
    "Accès direct à l'intégralité des fiches de la base UCLouvain par mot-clé, domaine clinique ou initiale.":
      "Direct access to all entries in the UCLouvain database by keyword, clinical domain or initial.",
    "Catégorie": "Category",
    "Toutes les catégories": "All categories",
    "Pierre Robin, Duchenne, hyperthermie maligne, Marfan…": "Pierre Robin, Duchenne, malignant hyperthermia, Marfan…",
    "Tous": "All",
    "Afficher la suite ({n} restantes)": "Show more ({n} remaining)",
    "Voies aériennes": "Airway",
    "Neuromusculaire": "Neuromuscular",
    "Métabolique & endocrinien": "Metabolic & endocrine",
    "Cardiopathie & vasculaire": "Cardiac & vascular",
    "Hématologie & immunité": "Haematology & immunity",
    "Squelette & tissus conjonctifs": "Skeletal & connective tissue",
    "Dermatologie & muqueuses": "Dermatology & mucosa",
    "Neurologie & épilepsie": "Neurology & epilepsy",
    "Rein, foie & digestif": "Renal, hepatic & GI",
    "Syndrome malformatif": "Malformation syndrome",

    // résumé, recherche globale et thème
    "Résumé": "Abstract",
    "Masquer le résumé": "Hide abstract",
    "Contexte": "Background",
    "Objectif": "Objective",
    "Objectifs": "Objectives",
    "Méthodes": "Methods",
    "Résultats": "Results",
    "Conclusion": "Conclusion",
    "Conclusions": "Conclusions",
    "Discussion": "Discussion",
    "Introduction": "Introduction",
    "Résumé de l'article": "Article abstract",
    "Rechercher dans tout le site": "Search across the entire site",
    "Rechercher dans toutes les archives…": "Search across all archives…",
    "Tapez un mot-clé (ex. curare, intubation, APRICOT, Pierre Robin, Lille…)":
      "Type a keyword (e.g. neuromuscular, intubation, APRICOT, Pierre Robin, Lille…)",
    "Aucun résultat dans les archives pour « {q} ».": "No results in the archive for “{q}”.",
    "Fermer": "Close",
    "Échap": "Esc",
    "Thème sombre": "Dark theme",
    "Thème clair": "Light theme",
    "Tous les thèmes": "All themes",

    // types de publications, de conférences et de médias
    "article": "article",
    "étude clinique": "clinical study",
    "revue de la littérature": "literature review",
    "recommandations": "guidelines",
    "éditorial": "editorial",
    "commentaire": "commentary",
    "cas clinique": "case report",
    "chapitre de livre": "book chapter",
    "livre": "book",
    "résumé de congrès": "conference abstract",
    "avis Faculty Opinions (F1000)": "Faculty Opinions review (F1000)",
    "dépôt universitaire": "institutional repository",
    "erratum": "erratum",
    "thèse": "thesis",
    "lettre": "letter",
    "conférence": "lecture",
    "communication": "oral communication",
    "poster": "poster",
    "atelier": "workshop",
    "vidéo": "video",
    "podcast": "podcast",

    // langues
    "français": "French",
    "anglais": "English",
    "néerlandais": "Dutch",
    "italien": "Italian",
    "allemand": "German",
    "espagnol": "Spanish",

    // pays et villes (donnees/lieux.csv)
    "Allemagne": "Germany", "Autriche": "Austria", "Belgique": "Belgium", "France": "France", "Grèce": "Greece",
    "Italie": "Italy", "La Réunion": "Réunion", "Pays-Bas": "Netherlands", "Royaume-Uni": "United Kingdom",
    "Suisse": "Switzerland", "Suède": "Sweden", "Turquie": "Turkey", "États-Unis": "United States",
    "Espagne": "Spain", "Portugal": "Portugal", "Danemark": "Denmark", "Norvège": "Norway", "Pologne": "Poland",
    "Irlande": "Ireland", "Luxembourg": "Luxembourg", "Canada": "Canada", "Maroc": "Morocco", "Tunisie": "Tunisia",
    "Algérie": "Algeria", "Sénégal": "Senegal", "Madagascar": "Madagascar", "Maurice": "Mauritius", "Mayotte": "Mayotte",
    "Anvers": "Antwerp", "Athènes": "Athens", "Bruxelles": "Brussels", "Florence": "Florence", "Genève": "Geneva",
    "La Nouvelle-Orléans": "New Orleans", "Liège": "Liège", "Londres": "London", "Nimègue": "Nijmegen",
    "Vienne": "Vienna", "Gand": "Ghent", "Louvain": "Leuven", "Malines": "Mechelen", "Bruges": "Bruges",
    "Lisbonne": "Lisbon", "Varsovie": "Warsaw", "Copenhague": "Copenhagen", "Prague": "Prague", "Rome": "Rome",
    "Venise": "Venice", "Milan": "Milan", "Munich": "Munich", "Cologne": "Cologne", "Édimbourg": "Edinburgh",
  };

  // pluriels anglais (le français ajoute un « s »)
  const MOTS = {
    publication: ["publication", "publications"], citation: ["citation", "citations"], article: ["article", "articles"],
    lecture: ["review", "reviews"], coauteur: ["co-author", "co-authors"], intervention: ["presentation", "presentations"],
    lien: ["link", "links"], "vidéo": ["video", "videos"], podcast: ["podcast", "podcasts"],
    syndrome: ["syndrome", "syndromes"], fiche: ["entry", "entries"],
  };

  // blocs de texte avec liens ou mise en forme : l'élément porte data-t="clé"
  const BLOCS = {
    "mr-intro": `<cite>Syndromes &amp; rare diseases in paediatrics: anaesthesia</cite> is a database
      maintained with Jean-Louis Scholtes. It gives a concise description of the pathophysiological and
      anaesthetic aspects of several thousand syndromes and rare diseases of childhood, to help prepare
      the anaesthesia of an affected child. It is updated every month.`,
    "mr-notes": `<li>Each entry can be found through the list of chapters, the alphabetical index or the word search.</li>
      <li>The entries are not peer-reviewed: this is a decision-support tool, complementary to
        <a href="https://www.orpha.net/" hreflang="fr">Orphanet</a>,
        <a href="https://www.orphananesthesia.eu/" hreflang="en">OrphanAnesthesia</a>
        and <a href="https://www.omim.org/" hreflang="en">OMIM</a>.</li>
      <li>Comments and suggestions are welcome and can be sent to the authors.</li>`,
    "mr-site": `On this site: the <a href="./?q=rare">publications</a> and
      <a href="conferences.html?q=rare">presentations</a> devoted to rare diseases.`,
  };

  const remplir = (texte, vars) => (vars ? texte.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : texte);
  const t = (fr, vars) => remplir(en && EN[fr] !== undefined ? EN[fr] : fr, vars);
  // traduction d'une valeur venue des données (type, pays…) : inchangée si elle n'est pas dans le dictionnaire
  const valeur = (fr) => (fr ? t(String(fr).trim()) : fr);
  // le mot accordé : en français, pluriel à partir de 2 ; en anglais, singulier pour 1 seulement
  const accord = (n, mot) => {
    if (!en) return mot + (n > 1 ? "s" : "");
    const [un, plusieurs] = MOTS[mot] || [t(mot), t(mot) + "s"];
    return n === 1 ? un : plusieurs;
  };
  const pluriel = (n, mot) => `${n} ${accord(n, mot)}`;
  const locale = en ? "en-GB" : "fr-BE";
  const mois = (i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: "short" });

  // adresse relative d'une page du site, avec la langue : « themes.html » → « themes.html?lang=en »
  function lien(url) {
    if (!en) return url;
    const [base, ancre] = url.split("#");
    const [chemin, requete] = base.split("?");
    const q = new URLSearchParams(requete || "");
    q.set("lang", "en");
    return `${chemin || "./"}?${q}${ancre !== undefined ? "#" + ancre : ""}`;
  }

  // adresse de la page courante dans l'autre langue (les filtres sont gardés)
  function autreLangue() {
    const q = new URLSearchParams(location.search);
    if (en) q.delete("lang"); else q.set("lang", "en");
    const s = q.toString();
    return location.pathname + (s ? "?" + s : "") + location.hash;
  }

  // thème clair / sombre : mémorisé dans localStorage, sinon clair (la préférence du système est ignorée)
  function themeActuel() {
    const f = document.documentElement.getAttribute("data-theme");
    if (f === "dark" || f === "light") return f;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  let majBoutonTheme = () => {};
  function appliquerTheme() {
    let pref = "light";
    try {
      const memo = localStorage.getItem("fv-theme");
      if (memo === "dark") pref = memo;
    } catch (e) {}
    document.documentElement.setAttribute("data-theme", pref);
    majBoutonTheme();
  }
  appliquerTheme();
  // page réaffichée par le bouton retour (cache du navigateur, fréquent sur Firefox mobile) ou thème changé
  // dans un autre onglet : le script ne repasse pas, on réapplique le choix mémorisé
  addEventListener("pageshow", (e) => e.persisted && appliquerTheme());
  addEventListener("storage", (e) => e.key === "fv-theme" && appliquerTheme());

  // ---------------------------------------------------------------- pages

  const ATTRIBUTS = ["placeholder", "aria-label", "title", "content"];
  const internes = (racine) => racine.querySelectorAll("a[href]:not([href^='http']):not([href^='#']):not([href^='mailto:'])");

  function traduirePage() {
    if (en) {
      document.title = t(document.title);
      document.querySelectorAll("[data-t]").forEach((el) => BLOCS[el.dataset.t] && (el.innerHTML = BLOCS[el.dataset.t]));
      const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
        const texte = n.nodeValue.trim();
        if (texte && EN[texte] !== undefined) n.nodeValue = n.nodeValue.replace(texte, EN[texte]);
      }
      document.querySelectorAll(ATTRIBUTS.map((a) => `[${a}]`).join(",")).forEach((el) => ATTRIBUTS.forEach((a) => {
        const v = el.getAttribute(a);
        if (v && EN[v.trim()] !== undefined) el.setAttribute(a, EN[v.trim()]);
      }));
      internes(document).forEach((a) => a.setAttribute("href", lien(a.getAttribute("href"))));
    }
    // barre d'outils en haut à droite : recherche globale (⌘K), thème clair/sombre, et choix de la langue FR | EN
    const nom = document.querySelector(".entete .nom");
    if (nom) {
      const outils = document.createElement("div");
      outils.className = "outils-entete";

      // bouton Recherche transversale (⌘K)
      const btnRech = document.createElement("button");
      btnRech.type = "button";
      btnRech.className = "outil-recherche";
      btnRech.id = "ouvrir-recherche";
      btnRech.title = t("Rechercher dans tout le site") + " (Ctrl+K / ⌘K)";
      btnRech.setAttribute("aria-label", t("Rechercher dans tout le site"));
      btnRech.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>${t("Rechercher")}</span><kbd>⌘K</kbd>`;
      outils.appendChild(btnRech);

      // bouton Thème clair / sombre
      const btnTheme = document.createElement("button");
      btnTheme.type = "button";
      btnTheme.className = "outil-theme";
      majBoutonTheme = () => {
        const sombre = themeActuel() === "dark";
        const label = sombre ? t("Thème clair") : t("Thème sombre");
        btnTheme.title = label;
        btnTheme.setAttribute("aria-label", label);
        btnTheme.innerHTML = sombre
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      };
      majBoutonTheme();
      btnTheme.addEventListener("click", () => {
        const nouveau = themeActuel() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nouveau);
        try { localStorage.setItem("fv-theme", nouveau); } catch (e) {}
        majBoutonTheme();
      });
      outils.appendChild(btnTheme);

      // choix de la langue : FR | EN
      const choix = document.createElement("span");
      choix.className = "langue";
      choix.setAttribute("role", "group");
      choix.setAttribute("aria-label", en ? "Language" : "Langue");
      [["fr", "FR", "Version française"], ["en", "EN", "English version"]].forEach(([code, sigle, titre]) => {
        const actif = code === langue;
        const b = document.createElement(actif ? "span" : "a");
        b.textContent = sigle;
        b.lang = code;
        b.title = titre;
        b.setAttribute("aria-label", titre);
        if (actif) b.setAttribute("aria-current", "true");
        else {
          b.href = autreLangue();
          b.hreflang = code;
          // l'adresse a pu changer depuis (filtres) : recalculée au moment du clic
          b.addEventListener("click", (e) => { e.preventDefault(); location.href = autreLangue(); });
        }
        choix.appendChild(b);
      });
      outils.appendChild(choix);
      nom.appendChild(outils);
    }
    document.documentElement.classList.remove("traduction");
  }

  // en anglais, la page reste cachée le temps de la traduire (pas d'éclair de français)
  if (en) document.documentElement.classList.add("traduction");
  document.addEventListener("DOMContentLoaded", () => {
    try { traduirePage(); } finally { document.documentElement.classList.remove("traduction"); }
  });

  return { langue, en, t, valeur, accord, pluriel, locale, mois, lien };
})();
