// Tableau des publications : lit donnees/publications.csv et l'affiche avec recherche, filtres et tri.
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const champs = { recherche: $("#recherche"), type: $("#type"), position: $("#position"), pdf: $("#pdf") };
  const corps = $("#tableau tbody");
  const AUTEURS_MAX = 8;

  let toutes = [];
  let anneeChoisie = "";
  let tri = { cle: "annee", sens: -1 };

  // famille de couleur de la pastille, d'après le type
  const FAMILLES = [
    [/étude|article/, "article"],
    [/revue|recommandation/, "revue"],
    [/lettre|éditorial/, "lettre"],
    [/cas clinique/, "cas"],
    [/chapitre|livre|thèse/, "livre"],
  ];
  const famille = (type) => (FAMILLES.find(([re]) => re.test(type)) || [, "autre"])[1];

  const sansAccents = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const echapper = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const estLui = (nom) => /veyckemans/i.test(nom);

  // ---------------------------------------------------------------- chargement

  const CONF = window.CONFIG || {};

  // le tableau Google Sheets d'abord ; s'il est injoignable, la copie du dépôt
  function telecharger() {
    const copie = () => fetch("donnees/publications.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      const date = r.headers.get("Last-Modified");
      if (date) $("#maj").textContent = "— copie du " + new Date(date).toLocaleDateString("fr-BE", { year: "numeric", month: "long", day: "numeric" });
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
        $("#maj").textContent = "— en direct du tableau";
        return texte;
      })
      .catch(copie);
  }

  telecharger()
    .then((texte) => {
      const { data } = Papa.parse(texte, { header: true, skipEmptyLines: true });
      toutes = data
        .filter((p) => p.id || p.titre)
        .filter((p) => !/^(oui|x|1|true|vrai)$/i.test((p.masquer || "").trim()))
        .map(preparer);
      remplirTypes();
      lireAdresse();
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = "La liste n'a pas pu être chargée (" + e.message + ").";
    });

  function preparer(p) {
    const auteurs = (p.auteurs || "").split(/\s*,\s*/).filter(Boolean);
    const rang = auteurs.findIndex(estLui);
    p._auteurs = auteurs;
    p._position = rang === 0 ? "premier" : rang >= 0 && rang === auteurs.length - 1 ? "dernier" : "";
    p._annee = parseInt(p.annee, 10) || 0;
    p.type = p.type || "article";
    p._texte = sansAccents([p.titre, p.auteurs, p.revue, p.annee, p.type, p.notes, p.doi, p.pmid].join(" "));
    return p;
  }

  function remplirTypes() {
    const compte = {};
    toutes.forEach((p) => (compte[p.type] = (compte[p.type] || 0) + 1));
    Object.keys(compte)
      .sort((a, b) => compte[b] - compte[a])
      .forEach((t) => champs.type.add(new Option(`${t} (${compte[t]})`, t)));
  }

  // ---------------------------------------------------------------- filtres et adresse

  function filtrer(avecAnnee) {
    const mots = sansAccents(champs.recherche.value).split(/\s+/).filter(Boolean);
    const type = champs.type.value, position = champs.position.value, pdf = champs.pdf.checked;
    return toutes.filter((p) =>
      mots.every((m) => p._texte.includes(m)) &&
      (!type || p.type === type) &&
      (!position || p._position === position) &&
      (!pdf || p.lien_pdf) &&
      (!avecAnnee || !anneeChoisie || String(p._annee) === anneeChoisie));
  }

  function ecrireAdresse() {
    const q = new URLSearchParams();
    if (champs.recherche.value.trim()) q.set("q", champs.recherche.value.trim());
    if (champs.type.value) q.set("type", champs.type.value);
    if (champs.position.value) q.set("position", champs.position.value);
    if (champs.pdf.checked) q.set("pdf", "1");
    if (anneeChoisie) q.set("annee", anneeChoisie);
    const s = q.toString();
    history.replaceState(null, "", s ? "?" + s : location.pathname);
  }

  function lireAdresse() {
    const q = new URLSearchParams(location.search);
    champs.recherche.value = q.get("q") || "";
    champs.type.value = q.get("type") || "";
    champs.position.value = q.get("position") || "";
    champs.pdf.checked = q.get("pdf") === "1";
    anneeChoisie = q.get("annee") || "";
  }

  // ---------------------------------------------------------------- affichage

  function afficher() {
    const sansAnnee = filtrer(false);
    const liste = filtrer(true);
    trier(liste);
    dessinerGraphique(sansAnnee);
    remplirTableau(liste);
    $("#compte").textContent = liste.length === toutes.length
      ? `${toutes.length} publications`
      : `${liste.length} publication${liste.length > 1 ? "s" : ""} sur ${toutes.length}` + (anneeChoisie ? ` · année ${anneeChoisie}` : "");
    $("#annee-effacer").hidden = !anneeChoisie;
    document.querySelectorAll("#tableau th[data-tri]").forEach((th) => {
      th.setAttribute("aria-sort", th.dataset.tri === tri.cle ? (tri.sens > 0 ? "ascending" : "descending") : "none");
    });
    ecrireAdresse();
  }

  function trier(liste) {
    const { cle, sens } = tri;
    const val = (p) => (cle === "annee" ? p._annee : sansAccents(p[cle]));
    liste.sort((a, b) => {
      const x = val(a), y = val(b);
      if (x < y) return -sens;
      if (x > y) return sens;
      return b._annee - a._annee || sansAccents(a.titre).localeCompare(sansAccents(b.titre));
    });
  }

  function auteursHTML(p, tous) {
    const liste = tous || p._auteurs.length <= AUTEURS_MAX ? p._auteurs : p._auteurs.slice(0, AUTEURS_MAX - 2);
    let html = liste.map((a) => (estLui(a) ? `<b>${echapper(a)}</b>` : echapper(a))).join(", ");
    if (liste.length < p._auteurs.length) {
      const cache = p._auteurs.slice(liste.length);
      const lui = cache.some(estLui) ? `, …, <b>${echapper(cache.find(estLui))}</b>` : "";
      html += `${lui} <button type="button" class="plus" data-id="${echapper(p.id)}">et ${cache.length} autres</button>`;
    }
    return html;
  }

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
    return `<div class="liens">${l.join("")}</div>`;
  }

  function remplirTableau(liste) {
    if (!liste.length) {
      corps.innerHTML = `<tr><td colspan="5" class="vide">Aucune publication ne correspond à ces critères.</td></tr>`;
      return;
    }
    corps.innerHTML = liste.map((p) => `
      <tr>
        <td class="annee">${echapper(p.annee) || "—"}</td>
        <td class="titre-cell">
          <div class="titre">${echapper(p.titre)}</div>
          <div class="auteurs">${auteursHTML(p)}</div>
          ${p.notes && !/automatiquement/.test(p.notes) ? `<div class="note">${echapper(p.notes)}</div>` : ""}
        </td>
        <td class="revue">${revueHTML(p)}</td>
        <td class="type"><span class="pastille ${famille(p.type)}">${echapper(p.type)}</span></td>
        <td class="liens-cell">${liensHTML(p)}</td>
      </tr>`).join("");
  }

  // ---------------------------------------------------------------- graphique par année

  const infobulle = $("#infobulle");

  function dessinerGraphique(liste) {
    const annees = toutes.map((p) => p._annee).filter(Boolean);
    if (!annees.length) return;
    const min = Math.min(...annees), max = Math.max(...annees);
    const compte = {};
    liste.forEach((p) => p._annee && (compte[p._annee] = (compte[p._annee] || 0) + 1));
    const haut = Math.max(1, ...Object.values(compte));

    const g = $("#graphique");
    const n = max - min + 1, L = Math.max(280, g.clientWidth), H = 150, bas = 20, pas = L / n, larg = Math.max(2, pas - 2);
    const echelle = (v) => ((H - bas - 8) * v) / haut;
    let svg = `<svg viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" aria-hidden="true">`;
    // ligne de repère à la moitié du maximum, avec sa valeur
    const demi = Math.round(haut / 2);
    if (demi > 0) {
      const y = H - bas - echelle(demi);
      svg += `<line class="grille" x1="0" x2="${L}" y1="${y}" y2="${y}"/><text class="axe" x="0" y="${y - 4}">${demi}</text>`;
    }
    for (let a = min; a <= max; a++) {
      const x = (a - min) * pas, v = compte[a] || 0, h = echelle(v), y = H - bas - h;
      const r = Math.min(4, larg / 2, h);
      svg += `<rect class="zone" data-annee="${a}" data-n="${v}" x="${x}" y="0" width="${pas}" height="${H - bas}"/>`;
      if (v) svg += `<path class="barre${String(a) === anneeChoisie ? " active" : ""}" d="M${x + 1},${H - bas} v${-(h - r)} q0,${-r} ${r},${-r} h${larg - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>`;
      else svg += `<g></g>`;
      if (a % (pas < 14 ? 10 : 5) === 0) svg += `<text class="axe" x="${x + pas / 2}" y="${H - 4}" text-anchor="middle">${a}</text>`;
    }
    svg += `</svg>`;
    g.innerHTML = svg;
    g.classList.toggle("filtre", !!anneeChoisie);
  }

  let largeurGraphique = 0;
  new ResizeObserver(() => {
    const l = $("#graphique").clientWidth;
    if (toutes.length && l !== largeurGraphique) { largeurGraphique = l; dessinerGraphique(filtrer(false)); }
  }).observe($("#graphique"));

  $("#graphique").addEventListener("mousemove", (e) => {
    const z = e.target.closest(".zone");
    if (!z) return (infobulle.hidden = true);
    const n = +z.dataset.n;
    infobulle.textContent = `${z.dataset.annee} : ${n ? n + " publication" + (n > 1 ? "s" : "") : "aucune"}`;
    infobulle.hidden = false;
    infobulle.style.left = Math.min(e.clientX + 12, innerWidth - infobulle.offsetWidth - 8) + "px";
    infobulle.style.top = e.clientY - 36 + "px";
  });
  $("#graphique").addEventListener("mouseleave", () => (infobulle.hidden = true));
  $("#graphique").addEventListener("click", (e) => {
    const z = e.target.closest(".zone");
    if (!z || (z.dataset.n === "0" && z.dataset.annee !== anneeChoisie)) return;
    anneeChoisie = anneeChoisie === z.dataset.annee ? "" : z.dataset.annee;
    afficher();
  });
  $("#annee-effacer").addEventListener("click", () => { anneeChoisie = ""; afficher(); });

  // ---------------------------------------------------------------- événements

  let attente;
  champs.recherche.addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  [champs.type, champs.position, champs.pdf].forEach((c) => c.addEventListener("change", afficher));

  document.querySelectorAll("#tableau th[data-tri] button").forEach((b) =>
    b.addEventListener("click", () => {
      const cle = b.parentElement.dataset.tri;
      tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: cle === "annee" ? -1 : 1 };
      afficher();
    }));

  corps.addEventListener("click", (e) => {
    const b = e.target.closest(".plus");
    if (!b) return;
    const p = toutes.find((x) => x.id === b.dataset.id);
    if (p) b.parentElement.innerHTML = auteursHTML(p, true);
  });

  if (CONF.tableau) $("#lien-corriger").textContent = "Tableau des données";
  $("#lien-corriger").href = CONF.tableau
    ? `https://docs.google.com/spreadsheets/d/${CONF.tableau}/edit`
    : `https://github.com/${CONF.depot}/edit/${CONF.branche || "main"}/donnees/publications.csv`;
})();
