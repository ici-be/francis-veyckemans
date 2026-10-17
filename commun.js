// Fonctions communes aux pages : chargement des données, noms complets, citations bibliographiques.
window.FV = (function () {
  "use strict";

  const CONF = window.CONFIG || {};
  const $ = (sel) => document.querySelector(sel);
  const sansAccents = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const echapper = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const estLui = (nom) => /veyckemans/i.test(nom);
  const estAvis = (p) => /faculty opinions/i.test(p.type);
  const oui = (v) => /^(oui|x|1|true|vrai)$/i.test((v || "").trim());
  const COLLECTIF = /group|network|collaborat|investigator|consortium|society|committee|team|study/i;
  const lireCSV = (texte) => Papa.parse(texte || "", { header: true, skipEmptyLines: true }).data;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

  // ---------------------------------------------------------------- chargement

  // le tableau Google Sheets d'abord ; s'il est injoignable, la copie du dépôt
  function telechargerPublications() {
    const copie = () => fetch("donnees/publications.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      const date = r.headers.get("Last-Modified");
      if (date && $("#maj")) $("#maj").textContent = "copie du " + new Date(date).toLocaleDateString("fr-BE", { year: "numeric", month: "long", day: "numeric" });
      return r.text();
    });
    if (!CONF.tableau) return copie();
    return fetch(`https://docs.google.com/spreadsheets/d/${CONF.tableau}/export?format=csv&gid=0&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("erreur " + r.status);
        return r.text();
      })
      .then((texte) => {
        if (!/^id,/.test(texte)) throw new Error("tableau illisible");
        if ($("#maj")) $("#maj").textContent = "en direct du tableau";
        return texte;
      })
      .catch(copie);
  }

  // fichiers annexes écrits par outils/collecter.py ; absents, le site fonctionne sans
  const annexe = (chemin) => fetch(chemin, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  function charger() {
    return Promise.all([telechargerPublications(), annexe("donnees/citations.csv"), annexe("donnees/coauteurs.csv")])
      .then(([publications, citations, coauteurs]) => {
        const nbCitations = {};
        lireCSV(citations).forEach((l) => (nbCitations[l.id] = parseInt(l.citations, 10)));
        const alias = {};
        lireCSV(coauteurs).forEach((l) => l.alias && l.nom && (alias[l.alias.trim()] = l.nom.trim()));
        const nomComplet = (n) => {
          for (let i = 0; i < 4 && alias[n] && alias[n] !== n; i++) n = alias[n];
          return n;
        };
        return lireCSV(publications)
          .filter((p) => p.id || p.titre)
          .filter((p) => !oui(p.masquer))
          .map((p) => preparer(p, nbCitations, nomComplet));
      });
  }

  function preparer(p, nbCitations, nomComplet) {
    const auteurs = (p.auteurs || "").split(/\s*,\s*/).filter(Boolean);
    p._auteurs = auteurs;
    p._noms = [...new Set(auteurs.map(nomComplet))].filter((n) => n !== "-");  // « - » dans coauteurs.csv : pas une personne
    p._annee = parseInt(p.annee, 10) || 0;
    p._citations = Number.isFinite(nbCitations[p.id]) ? nbCitations[p.id] : null;
    p.type = p.type || "article";
    if (p.pdf_drive) p.lien_pdf = p.pdf_drive;  // PDF déposé dans le dossier Google Drive : prioritaire
    p._titre = estAvis(p) ? p.titre.replace(/^Faculty Opinions recommendation of\s*/i, "") : p.titre;
    p._texte = sansAccents([p.titre, p.auteurs, p._noms.join(" "), p.revue, p.annee, p.type, p.notes, p.doi, p.pmid].join(" "));
    return p;
  }

  // coauteurs de la liste (noms complets), sans lui-même ni les groupes d'étude
  const coauteurs = (p) => p._noms.filter((n) => !estLui(n) && !COLLECTIF.test(n));

  // ---------------------------------------------------------------- affichage commun

  const FAMILLES = [
    [/étude|article/, "article"],
    [/revue|recommandation/, "revue"],
    [/commentaire|lettre|éditorial/, "lettre"],
    [/cas clinique/, "cas"],
    [/chapitre|livre|thèse/, "livre"],
  ];
  const famille = (type) => (FAMILLES.find(([re]) => re.test(type)) || [, "autre"])[1];

  function revueHTML(p) {
    let html = p.revue ? `<i>${echapper(p.revue)}</i>` : "";
    let ref = p.volume || "";
    if (p.numero) ref += `(${p.numero})`;
    if (p.pages) ref += (ref ? ":" : "p. ") + p.pages;
    if (ref) html += (html ? " " : "") + echapper(ref);
    return html;
  }

  function liensHTML(p) {
    const l = [];
    if (p.lien_pdf) l.push(`<a class="pdf" href="${echapper(p.lien_pdf)}" target="_blank" rel="noopener">PDF</a>`);
    if (p.lien_info) {
      const nom = /pubmed/.test(p.lien_info) ? "PubMed" : /doi\.org/.test(p.lien_info) ? "Article" : "Fiche";
      l.push(`<a href="${echapper(p.lien_info)}" target="_blank" rel="noopener" title="Page de l'article">${nom}</a>`);
    }
    if (p.pmid && !/pubmed/.test(p.lien_info || ""))
      l.push(`<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(p.pmid)}/" target="_blank" rel="noopener">PubMed</a>`);
    if (!estAvis(p)) l.push(`<button type="button" class="citer" data-id="${echapper(p.id)}" aria-expanded="false">Citer</button>`);
    return `<div class="liens">${l.join("")}</div>`;
  }

  // ---------------------------------------------------------------- citer et exporter

  const bornesPages = (p) => (p.pages || "").split(/[-–]/);

  function vancouver(p) {
    const a = p._auteurs.length > 6 ? p._auteurs.slice(0, 6).join(", ") + ", et al" : p._auteurs.join(", ");
    let ref = p.annee || "";
    if (p.volume) ref += `;${p.volume}`;
    if (p.numero) ref += `(${p.numero})`;
    if (p.pages) ref += `:${p.pages}`;
    return [a, p.titre, p.revue, ref].filter(Boolean).join(". ") + "." + (p.doi ? ` doi:${p.doi}` : "");
  }

  function apa(p) {
    const a = p._auteurs.length > 1 ? p._auteurs.slice(0, -1).join(", ") + ", & " + p._auteurs.at(-1) : p._auteurs.join("");
    let source = p.revue || "";
    if (p.volume) source += `, ${p.volume}`;
    if (p.numero) source += `(${p.numero})`;
    if (p.pages) source += `, ${p.pages}`;
    return `${a} (${p.annee || "s.d."}). ${p.titre}.` + (source ? ` ${source}.` : "") + (p.doi ? ` https://doi.org/${p.doi}` : "");
  }

  function cleBib(p) {
    const nom = sansAccents((p._auteurs[0] || "anonyme").split(/\s+/)[0]).replace(/[^a-z]/g, "");
    const mot = sansAccents(p.titre).split(/\W+/).find((m) => m.length > 3) || "";
    return nom + (p.annee || "") + mot;
  }

  function bibtex(p) {
    const genre = /chapitre/.test(p.type) ? "incollection" : /^livre/.test(p.type) ? "book" : "article";
    const champs = [
      ["author", p._auteurs.join(" and ")], ["title", p.titre],
      [genre === "incollection" ? "booktitle" : "journal", p.revue], ["year", p.annee],
      ["volume", p.volume], ["number", p.numero], ["pages", (p.pages || "").replace(/-/, "--")],
      ["doi", p.doi], ["pmid", p.pmid],
    ].filter(([, v]) => v);
    return `@${genre}{${cleBib(p)},\n` + champs.map(([k, v]) => `  ${k} = {${v}}`).join(",\n") + "\n}";
  }

  function ris(p) {
    const genre = /chapitre/.test(p.type) ? "CHAP" : /^livre/.test(p.type) ? "BOOK" : "JOUR";
    const [debut, fin] = bornesPages(p);
    const l = [["TY", genre], ...p._auteurs.map((a) => ["AU", a]), ["TI", p.titre], ["JO", p.revue], ["PY", p.annee],
      ["VL", p.volume], ["IS", p.numero], ["SP", debut], ["EP", fin], ["DO", p.doi], ["UR", p.lien_info], ["ER", ""]];
    return l.filter(([k, v]) => v || k === "ER").map(([k, v]) => `${k}  - ${v}`).join("\n");
  }

  const FORMATS = { Vancouver: vancouver, APA: apa, BibTeX: bibtex, RIS: ris };
  let formatChoisi = "Vancouver";

  function panneauCitation(p) {
    const boutons = Object.keys(FORMATS).map((f) =>
      `<button type="button" class="format" aria-pressed="${f === formatChoisi}" data-format="${f}">${f}</button>`).join("");
    return `<div class="citation" data-id="${echapper(p.id)}">
      <div class="citation-tete">${boutons}<button type="button" class="copier">Copier</button></div>
      <pre>${echapper(FORMATS[formatChoisi](p))}</pre></div>`;
  }

  // un clic sur « Citer » ouvre le panneau sous la publication ; trouver(id) rend la publication
  function activerCiter(conteneur, trouver) {
    conteneur.addEventListener("click", (e) => {
      const b = e.target.closest(".citer, .format, .copier");
      if (!b) return;
      if (b.classList.contains("citer")) {
        const lieu = b.closest(".cite-ici");
        const ouvert = lieu.querySelector(".citation");
        if (ouvert) ouvert.remove();
        b.setAttribute("aria-expanded", String(!ouvert));
        if (!ouvert) lieu.insertAdjacentHTML("beforeend", panneauCitation(trouver(b.dataset.id)));
        return;
      }
      const panneau = b.closest(".citation");
      if (b.classList.contains("format")) {
        formatChoisi = b.dataset.format;
        panneau.outerHTML = panneauCitation(trouver(panneau.dataset.id));
      } else {
        navigator.clipboard.writeText(panneau.querySelector("pre").textContent).then(() => {
          b.textContent = "Copié";
          setTimeout(() => (b.textContent = "Copier"), 1500);
        });
      }
    });
  }

  function exporter(liste, format) {
    const texte = liste.map(format === "RIS" ? ris : bibtex).join("\n\n") + "\n";
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([texte], { type: "text/plain;charset=utf-8" }));
    lien.download = `veyckemans-publications.${format === "RIS" ? "ris" : "bib"}`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  return { $, sansAccents, echapper, estLui, estAvis, pluriel, charger, coauteurs, famille, revueHTML, liensHTML, activerCiter, exporter };
})();
