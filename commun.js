// Fonctions communes aux pages : chargement des données, noms complets, citations bibliographiques.
window.FV = (function () {
  "use strict";

  const CONF = window.CONFIG || {};
  const { t } = I18N;
  const $ = (sel) => document.querySelector(sel);
  const sansAccents = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const echapper = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const estLui = (nom) => /veyckemans/i.test(nom);
  const estAvis = (p) => /faculty opinions/i.test(p.type);
  const oui = (v) => /^(oui|x|1|true|vrai)$/i.test((v || "").trim());
  const COLLECTIF = /group|network|collaborat|investigator|consortium|society|committee|team|study/i;
  const lireCSV = (texte) => Papa.parse(texte || "", { header: true, skipEmptyLines: true }).data;
  const pluriel = I18N.pluriel;

  // ---------------------------------------------------------------- chargement

  // le tableau Google Sheets d'abord ; s'il est injoignable, la copie du dépôt
  function telechargerPublications() {
    const copie = () => fetch("donnees/publications.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      const date = r.headers.get("Last-Modified");
      if (date && $("#maj")) $("#maj").textContent = t("copie du {date}", { date: new Date(date).toLocaleDateString(I18N.locale, { year: "numeric", month: "long", day: "numeric" }) });
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
        if ($("#maj")) $("#maj").textContent = t("en direct du tableau");
        return texte;
      })
      .catch(copie);
  }

  // fichiers annexes écrits par outils/collecter.py ; absents, le site fonctionne sans
  const annexe = (chemin) => fetch(chemin, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  function charger() {
    return Promise.all([
      telechargerPublications(),
      annexe("donnees/citations.csv"),
      annexe("donnees/coauteurs.csv"),
      annexe("donnees/resumes.csv"),
    ]).then(([publications, citations, coauteurs, resumes]) => {
      const nbCitations = {}, fichesOpenAlex = {}, textesResumes = {};
      lireCSV(citations).forEach((l) => {
        nbCitations[l.id] = parseInt(l.citations, 10);
        fichesOpenAlex[l.id] = l.openalex || "";
      });
      lireCSV(resumes).forEach((l) => {
        if (l.id && l.resume) textesResumes[l.id] = l.resume.trim();
      });
      const alias = {};
      lireCSV(coauteurs).forEach((l) => l.alias && l.nom && (alias[l.alias.trim()] = l.nom.trim()));
      const nomComplet = (n) => {
        for (let i = 0; i < 4 && alias[n] && alias[n] !== n; i++) n = alias[n];
        return n;
      };
      return lireCSV(publications)
        .filter((p) => p.id || p.titre)
        .filter((p) => !oui(p.masquer))
        .map((p) => preparer(p, nbCitations, fichesOpenAlex, textesResumes, nomComplet));
    });
  }

  function preparer(p, nbCitations, fichesOpenAlex, textesResumes, nomComplet) {
    const auteurs = (p.auteurs || "").split(/\s*,\s*/).filter(Boolean);
    p._auteurs = auteurs;
    p._noms = [...new Set(auteurs.map(nomComplet))].filter((n) => n !== "-");  // « - » dans coauteurs.csv : pas une personne
    p._annee = parseInt(p.annee, 10) || 0;
    p._citations = Number.isFinite(nbCitations[p.id]) ? nbCitations[p.id] : null;
    p._openalex = fichesOpenAlex[p.id] || "";  // « W123 » ou « W123|W456 » si l'article a plusieurs fiches OpenAlex
    p._resume = textesResumes[p.id] || "";
    p.type = p.type || "article";
    if (p.pdf_drive) p.lien_pdf = p.pdf_drive;  // PDF déposé dans le dossier Google Drive : prioritaire
    p._titre = estAvis(p) ? p.titre.replace(/^Faculty Opinions recommendation of\s*/i, "") : p.titre;
    p._texte = sansAccents([p.titre, p.auteurs, p._noms.join(" "), p.revue, p.annee, p.type, I18N.valeur(p.type), p.notes, p.doi, p.pmid, p._resume].join(" "));
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

  // nombre de citations ; lien vers la liste des articles citants dans OpenAlex quand on connaît la fiche
  function citationsHTML(p, texte) {
    if (!p._openalex) return `<span title="${t("Citations selon OpenAlex")}">${texte}</span>`;
    const url = `https://openalex.org/works?filter=cites:${encodeURIComponent(p._openalex)}`;
    return `<a class="citants" href="${url}" target="_blank" rel="noopener" title="${t("Articles qui citent cette publication (OpenAlex)")}"><span>${texte}</span></a>`;
  }

  function liensHTML(p) {
    const l = [];
    if (p.lien_pdf) l.push(`<a class="pdf" href="${echapper(p.lien_pdf)}" target="_blank" rel="noopener">PDF</a>`);
    if (p.lien_info) {
      const nom = /pubmed/.test(p.lien_info) ? "PubMed" : /doi\.org/.test(p.lien_info) ? "Article" : t("Fiche");
      l.push(`<a href="${echapper(p.lien_info)}" target="_blank" rel="noopener" title="${t("Page de l'article")}">${nom}</a>`);
    }
    if (p.pmid && !/pubmed/.test(p.lien_info || ""))
      l.push(`<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(p.pmid)}/" target="_blank" rel="noopener">PubMed</a>`);
    if (p._resume && !estAvis(p))
      l.push(`<button type="button" class="resumer" data-id="${echapper(p.id)}" aria-expanded="false">${t("Résumé")}</button>`);
    if (!estAvis(p)) l.push(`<button type="button" class="citer" data-id="${echapper(p.id)}" aria-expanded="false">${t("Citer")}</button>`);
    return `<div class="liens">${l.join("")}</div>`;
  }

  // ---------------------------------------------------------------- résumé (abstract) et surlignage

  const LABELS_RESUME = {
    BACKGROUND: "Contexte", CONTEXT: "Contexte", INTRODUCTION: "Introduction",
    OBJECTIVE: "Objectif", OBJECTIVES: "Objectifs", AIM: "Objectif", AIMS: "Objectifs", PURPOSE: "Objectif",
    METHODS: "Méthodes", METHOD: "Méthodes", "MATERIAL AND METHODS": "Méthodes", "MATERIALS AND METHODS": "Méthodes", "PATIENTS AND METHODS": "Méthodes",
    RESULTS: "Résultats", FINDINGS: "Résultats",
    CONCLUSION: "Conclusion", CONCLUSIONS: "Conclusions", DISCUSSION: "Discussion", SUMMARY: "Résumé",
  };

  function surligner(texte, mots) {
    let html = echapper(texte);
    const valides = (mots || []).map((m) => sansAccents(m)).filter((m) => m.length >= 2);
    if (!valides.length) return html;
    // surlignage insensible aux accents sur le texte échappé
    return html.replace(/([a-zA-ZÀ-ÖØ-öø-ÿ0-9-]+)/g, (mot) => {
      const norm = sansAccents(mot);
      return valides.some((m) => norm.includes(m)) ? `<mark>${mot}</mark>` : mot;
    });
  }

  function panneauResume(p) {
    const champ = $("#recherche");
    const mots = champ && champ.value ? champ.value.trim().split(/\s+/) : [];
    const blocs = (p._resume || "").split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
    const htmlBlocs = blocs.map((b) => {
      const m = /^([A-Z][A-Z\s/&-]{2,26})\s*:\s*(.+)$/s.exec(b);
      if (m) {
        const cle = m[1].trim().toUpperCase();
        const etiq = LABELS_RESUME[cle] ? t(LABELS_RESUME[cle]) : m[1].trim();
        return `<div class="resume-ligne"><span class="resume-etiq">${echapper(etiq)}</span><p>${surligner(m[2], mots)}</p></div>`;
      }
      return `<p class="resume-para">${surligner(b, mots)}</p>`;
    }).join("");
    return `<div class="resume-panneau" data-id="${echapper(p.id)}" role="region" aria-label="${t("Résumé de l'article")}">
      ${htmlBlocs}
    </div>`;
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
    return `${a} (${p.annee || t("s.d.")}). ${p.titre}.` + (source ? ` ${source}.` : "") + (p.doi ? ` https://doi.org/${p.doi}` : "");
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
      <div class="citation-tete">${boutons}<button type="button" class="copier">${t("Copier")}</button></div>
      <pre>${echapper(FORMATS[formatChoisi](p))}</pre></div>`;
  }

  // un clic sur « Citer » ou « Résumé » ouvre le panneau correspondant sous la publication
  function activerCiter(conteneur, trouver) {
    conteneur.addEventListener("click", (e) => {
      const b = e.target.closest(".resumer, .citer, .format, .copier");
      if (!b) return;
      if (b.classList.contains("resumer")) {
        const lieu = b.closest(".cite-ici") || b.closest("tr, li").querySelector(".cite-ici");
        const ouvert = lieu.querySelector(".resume-panneau");
        if (ouvert) ouvert.remove();
        b.setAttribute("aria-expanded", String(!ouvert));
        if (!ouvert) {
          const p = trouver(b.dataset.id);
          if (p) lieu.insertAdjacentHTML("beforeend", panneauResume(p));
        }
        return;
      }
      if (b.classList.contains("citer")) {
        // le panneau va dans l'élément .cite-ici de la publication (ancêtre du bouton, ou autre cellule de la même ligne)
        const lieu = b.closest(".cite-ici") || b.closest("tr, li").querySelector(".cite-ici");
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
          b.textContent = t("Copié");
          setTimeout(() => (b.textContent = t("Copier")), 1500);
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

  // ---------------------------------------------------------------- recherche transversale (⌘K)

  let cacheGlobal = null;
  function chargerTout() {
    if (cacheGlobal) return cacheGlobal;
    cacheGlobal = Promise.all([
      charger().catch(() => []),
      annexe("donnees/lectures.csv"),
      annexe("donnees/conferences.csv"),
      annexe("donnees/medias.csv"),
    ]).then(([pubs, txtLectures, txtConf, txtMedias]) => {
      const commentes = {};
      lireCSV(txtLectures).forEach((l) => (commentes[l.id] = l));
      const publications = pubs.filter((p) => !estAvis(p));
      const lectures = pubs.filter(estAvis).map((p) => {
        const c = commentes[p.id] || {};
        p._ref = [c.auteurs, c.revue, c.annee].filter(Boolean).join(", ");
        p._texte = sansAccents([p._titre, p._ref].join(" "));
        return p;
      });
      const parCoauteur = {};
      publications.forEach((p) => coauteurs(p).forEach((nom) => {
        const g = (parCoauteur[nom] = parCoauteur[nom] || { nom, n: 0, de: Infinity, a: 0, _texte: sansAccents(nom) });
        g.n++;
        if (p._annee) { g.de = Math.min(g.de, p._annee); g.a = Math.max(g.a, p._annee); }
      }));
      const listeCoauteurs = Object.values(parCoauteur).sort((a, b) => b.n - a.n);
      const conferences = lireCSV(txtConf)
        .filter((c) => (c.id || c.titre) && !oui(c.masquer) && !(CONF.typesConferencesCaches || []).includes((c.type || "").trim()))
        .map((c) => ({ ...c, _texte: sansAccents([c.titre, c.congres, c.lieu, c.date, c.orateurs].join(" ")) }));
      const medias = lireCSV(txtMedias)
        .filter((m) => (m.id || m.titre) && !oui(m.masquer))
        .map((m) => ({ ...m, _texte: sansAccents([m.titre, m.evenement, m.source, m.intervenants, m.date].join(" ")) }));
      return { publications, lectures, coauteurs: listeCoauteurs, conferences, medias };
    });
    return cacheGlobal;
  }

  function initialiserRechercheGlobale() {
    let dialogue = null;
    function ouvrir() {
      if (!dialogue) {
        dialogue = document.createElement("div");
        dialogue.className = "cmdk-fond";
        dialogue.setAttribute("role", "dialog");
        dialogue.setAttribute("aria-modal", "true");
        dialogue.setAttribute("aria-label", t("Rechercher dans tout le site"));
        dialogue.innerHTML = `
          <div class="cmdk-boite cadre">
            <div class="cmdk-entete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="cmdk-champ" placeholder="${echapper(t("Rechercher dans toutes les archives…"))}" autocomplete="off">
              <button type="button" class="cmdk-fermer" title="${echapper(t("Fermer"))}">${echapper(t("Échap"))}</button>
            </div>
            <div class="cmdk-corps" id="cmdk-corps">
              <p class="cmdk-aide">${echapper(t("Tapez un mot-clé (ex. curare, intubation, APRICOT, Pierre Robin, Lille…)"))}</p>
            </div>
          </div>`;
        document.body.appendChild(dialogue);
        const champ = dialogue.querySelector("#cmdk-champ");
        const corps = dialogue.querySelector("#cmdk-corps");
        dialogue.addEventListener("click", (e) => {
          if (e.target === dialogue || e.target.closest(".cmdk-fermer")) fermer();
        });
        let attente;
        champ.addEventListener("input", () => {
          clearTimeout(attente);
          attente = setTimeout(() => chercher(champ.value, corps), 100);
        });
      }
      dialogue.hidden = false;
      const champ = dialogue.querySelector("#cmdk-champ");
      champ.focus();
      champ.select();
      chargerTout();
    }

    function fermer() {
      if (dialogue) dialogue.hidden = true;
    }

    function chercher(requete, conteneur) {
      const q = requete.trim();
      const mots = sansAccents(q).split(/\s+/).filter(Boolean);
      if (!mots.length) {
        conteneur.innerHTML = `<p class="cmdk-aide">${echapper(t("Tapez un mot-clé (ex. curare, intubation, APRICOT, Pierre Robin, Lille…)"))}</p>`;
        return;
      }
      chargerTout().then((d) => {
        const filtre = (liste) => liste.filter((x) => mots.every((m) => x._texte.includes(m)));
        const pubs = filtre(d.publications);
        const lects = filtre(d.lectures);
        const confs = filtre(d.conferences);
        const meds = filtre(d.medias);
        const coauts = filtre(d.coauteurs);

        const groupes = [];
        if (pubs.length) {
          groupes.push(`
            <div class="cmdk-groupe">
              <div class="cmdk-titre"><span>${echapper(t("Publications"))} (${pubs.length})</span><a href="${I18N.lien("./?q=" + encodeURIComponent(q))}">${echapper(t("Ouvrir"))} →</a></div>
              <ul class="cmdk-liste">${pubs.slice(0, 5).map((p) => `
                <li><a href="${I18N.lien("./?q=" + encodeURIComponent(p.doi || p.titre.slice(0, 45)))}">
                  <span class="cmdk-item-titre">${surligner(p.titre, mots)}</span>
                  <span class="cmdk-item-meta">${echapper(p.annee || "")}${p.revue ? " · " + echapper(p.revue) : ""}</span>
                </a></li>`).join("")}
              </ul>
            </div>`);
        }
        if (lects.length) {
          groupes.push(`
            <div class="cmdk-groupe">
              <div class="cmdk-titre"><span>${echapper(t("Lectures commentées"))} (${lects.length})</span><a href="${I18N.lien("lectures.html?q=" + encodeURIComponent(q))}">${echapper(t("Ouvrir"))} →</a></div>
              <ul class="cmdk-liste">${lects.slice(0, 3).map((p) => `
                <li><a href="${I18N.lien("lectures.html?q=" + encodeURIComponent(p._titre.slice(0, 40)))}">
                  <span class="cmdk-item-titre">${surligner(p._titre, mots)}</span>
                  <span class="cmdk-item-meta">${echapper(p.annee || "")}${p._ref ? " · " + echapper(p._ref) : ""}</span>
                </a></li>`).join("")}
              </ul>
            </div>`);
        }
        if (confs.length) {
          groupes.push(`
            <div class="cmdk-groupe">
              <div class="cmdk-titre"><span>${echapper(t("Conférences"))} (${confs.length})</span><a href="${I18N.lien("conferences.html?q=" + encodeURIComponent(q))}">${echapper(t("Ouvrir"))} →</a></div>
              <ul class="cmdk-liste">${confs.slice(0, 3).map((c) => `
                <li><a href="${I18N.lien("conferences.html?q=" + encodeURIComponent(c.titre.slice(0, 40)))}">
                  <span class="cmdk-item-titre">${surligner(c.titre, mots)}</span>
                  <span class="cmdk-item-meta">${echapper((c.date || "").slice(0, 4))}${c.lieu ? " · " + echapper(c.lieu) : ""}</span>
                </a></li>`).join("")}
              </ul>
            </div>`);
        }
        if (meds.length) {
          groupes.push(`
            <div class="cmdk-groupe">
              <div class="cmdk-titre"><span>${echapper(t("Vidéos et podcasts"))} (${meds.length})</span><a href="${I18N.lien("medias.html")}">${echapper(t("Ouvrir"))} →</a></div>
              <ul class="cmdk-liste">${meds.slice(0, 3).map((m) => `
                <li><a href="${I18N.lien("medias.html")}">
                  <span class="cmdk-item-titre">${surligner(m.titre, mots)}</span>
                  <span class="cmdk-item-meta">${echapper(m.evenement || m.source || "")} · ${echapper((m.date || "").slice(0, 4))}</span>
                </a></li>`).join("")}
              </ul>
            </div>`);
        }
        if (coauts.length) {
          groupes.push(`
            <div class="cmdk-groupe">
              <div class="cmdk-titre"><span>${echapper(t("Coauteurs"))} (${coauts.length})</span><a href="${I18N.lien("coauteurs.html")}">${echapper(t("Ouvrir"))} →</a></div>
              <ul class="cmdk-liste cmdk-coauteurs">${coauts.slice(0, 6).map((g) => `
                <li><a href="${I18N.lien("./?coauteur=" + encodeURIComponent(g.nom))}">
                  <span class="cmdk-item-titre">${surligner(g.nom, mots)}</span>
                  <span class="cmdk-item-meta">${pluriel(g.n, "publication")}</span>
                </a></li>`).join("")}
              </ul>
            </div>`);
        }

        conteneur.innerHTML = groupes.length
          ? groupes.join("")
          : `<p class="cmdk-aide">${echapper(t("Aucun résultat dans les archives pour « {q} ».", { q }))}</p>`;
      });
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("#ouvrir-recherche")) ouvrir();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogue && !dialogue.hidden) fermer(); else ouvrir();
      } else if (e.key === "Escape" && dialogue && !dialogue.hidden) {
        fermer();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiserRechercheGlobale);
  else initialiserRechercheGlobale();

  return { $, sansAccents, echapper, estLui, estAvis, pluriel, charger, coauteurs, famille, revueHTML, citationsHTML, liensHTML, surligner, activerCiter, exporter };
})();
