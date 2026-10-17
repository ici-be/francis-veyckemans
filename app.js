// Page des publications : tableau avec recherche, filtres, tri, graphique par année et repères.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estLui, estAvis, pluriel, famille, revueHTML, citationsHTML, liensHTML, surligner } = FV;
  const { t, valeur } = I18N;
  const champs = { recherche: $("#recherche"), type: $("#type"), pdf: $("#pdf") };
  const corps = $("#tableau tbody");
  const AUTEURS_MAX = 8;
  const PERIODES = (window.CONFIG || {}).periodes || [];

  let toutes = [];
  // filtres posés en cliquant (graphique, repères, page des coauteurs)
  let choix = { annee: "", periode: "", revue: "", coauteur: "" };
  let tri = { cle: "annee", sens: -1 };

  const periodeDe = (annee) => PERIODES.findIndex((p) => annee >= p.de && (!p.a || annee <= p.a));
  const nomPeriode = (i) => { const p = PERIODES[i]; return p ? `${p.de} – ${p.a || ""}`.trim() : ""; };

  // ---------------------------------------------------------------- chargement

  FV.charger()
    .then((liste) => {
      toutes = liste.filter((p) => !estAvis(p));  // les avis Faculty Opinions ont leur page
      remplirTypes();
      lireAdresse();
      dessinerPeriodes();
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function remplirTypes() {
    const compte = {};
    toutes.forEach((p) => (compte[p.type] = (compte[p.type] || 0) + 1));
    Object.keys(compte)
      .sort((a, b) => compte[b] - compte[a])
      .forEach((type) => champs.type.add(new Option(`${valeur(type)} (${compte[type]})`, type)));
  }

  // ---------------------------------------------------------------- filtres et adresse

  function filtrer(avecAnnee) {
    const mots = sansAccents(champs.recherche.value).split(/\s+/).filter(Boolean);
    const type = champs.type.value, pdf = champs.pdf.checked;
    const periode = PERIODES[choix.periode];
    return toutes.filter((p) =>
      mots.every((m) => p._texte.includes(m)) &&
      (!type || p.type === type) &&
      (!pdf || p.lien_pdf) &&
      (!choix.revue || p.revue === choix.revue) &&
      (!choix.coauteur || p._noms.includes(choix.coauteur)) &&
      (!avecAnnee || !choix.annee || String(p._annee) === choix.annee) &&
      (!avecAnnee || !periode || periodeDe(p._annee) === +choix.periode));
  }

  function ecrireAdresse() {
    const q = new URLSearchParams();
    if (champs.recherche.value.trim()) q.set("q", champs.recherche.value.trim());
    if (champs.type.value) q.set("type", champs.type.value);
    if (champs.pdf.checked) q.set("pdf", "1");
    if (choix.annee) q.set("annee", choix.annee);
    if (choix.periode !== "") q.set("periode", nomPeriode(choix.periode).replace(/ – /, "-"));
    if (choix.revue) q.set("revue", choix.revue);
    if (choix.coauteur) q.set("coauteur", choix.coauteur);
    if (tri.cle !== "annee" || tri.sens !== -1) q.set("tri", (tri.sens > 0 ? "" : "-") + tri.cle);
    if (I18N.en) q.set("lang", "en");
    const s = q.toString();
    history.replaceState(null, "", s ? "?" + s : location.pathname);
  }

  function lireAdresse() {
    const q = new URLSearchParams(location.search);
    champs.recherche.value = q.get("q") || "";
    champs.type.value = q.get("type") || "";
    champs.pdf.checked = q.get("pdf") === "1";
    const periode = PERIODES.findIndex((p) => p.de === parseInt(q.get("periode"), 10));
    choix = {
      annee: q.get("annee") || "",
      periode: periode >= 0 ? String(periode) : "",
      revue: q.get("revue") || "",
      coauteur: q.get("coauteur") || "",
    };
    const t = q.get("tri");
    if (t) tri = { cle: t.replace(/^-/, ""), sens: t.startsWith("-") ? -1 : 1 };
  }

  // ---------------------------------------------------------------- affichage

  function afficher() {
    const sansAnnee = filtrer(false);
    const liste = filtrer(true);
    trier(liste);
    dessinerGraphique(sansAnnee);
    remplirTableau(liste);
    afficherChoix();
    $("#compte").textContent = liste.length === toutes.length
      ? pluriel(toutes.length, "publication")
      : t(liste.length > 1 ? "{n} publications sur {total}" : "{n} publication sur {total}", { n: liste.length, total: toutes.length });
    $("#exporter").hidden = !liste.length;
    document.querySelectorAll("#periodes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.periode === choix.periode)));
    document.querySelectorAll("#tableau th[data-tri]").forEach((th) => {
      th.setAttribute("aria-sort", th.dataset.tri === tri.cle ? (tri.sens > 0 ? "ascending" : "descending") : "none");
    });
    ecrireAdresse();
  }

  // filtres posés en cliquant, chacun avec sa croix
  function afficherChoix() {
    const etiquettes = [];
    if (choix.annee) etiquettes.push(["annee", t("année {a}", { a: choix.annee })]);
    if (choix.periode !== "") etiquettes.push(["periode", nomPeriode(choix.periode)]);
    if (choix.revue) etiquettes.push(["revue", choix.revue]);
    if (choix.coauteur) etiquettes.push(["coauteur", t("avec {nom}", { nom: choix.coauteur })]);
    $("#choix").innerHTML = etiquettes.map(([cle, texte]) =>
      `<button type="button" class="etiquette" data-cle="${cle}" title="${t("Retirer ce filtre")}">${echapper(texte)} <span aria-hidden="true">×</span></button>`).join("");
  }

  function trier(liste) {
    const { cle, sens } = tri;
    const val = (p) => (cle === "annee" ? p._annee : cle === "citations" ? (p._citations ?? -1) : sansAccents(p[cle]));
    liste.sort((a, b) => {
      const x = val(a), y = val(b);
      if (x < y) return -sens;
      if (x > y) return sens;
      return b._annee - a._annee || sansAccents(a.titre).localeCompare(sansAccents(b.titre));
    });
  }

  function auteursHTML(p, tous) {
    const liste = tous || p._auteurs.length <= AUTEURS_MAX ? p._auteurs : p._auteurs.slice(0, AUTEURS_MAX - 2);
    let html = liste.map(echapper).join(", ");
    if (liste.length < p._auteurs.length) {
      const cache = p._auteurs.slice(liste.length);
      const lui = cache.some(estLui) ? `, …, ${echapper(cache.find(estLui))}` : "";
      html += `${lui} <button type="button" class="plus" data-id="${echapper(p.id)}">${t("et {n} autres", { n: cache.length })}</button>`;
    }
    return html;
  }

  function remplirTableau(liste) {
    if (!liste.length) {
      corps.innerHTML = `<tr><td colspan="6" class="vide">${t("Aucune publication ne correspond à ces critères.")}</td></tr>`;
      return;
    }
    const mots = champs.recherche.value.trim().split(/\s+/).filter(Boolean);
    corps.innerHTML = liste.map((p) => `
      <tr>
        <td class="annee">${echapper(p.annee) || "—"}</td>
        <td class="titre-cell cite-ici">
          <div class="titre">${surligner(p.titre, mots)}</div>
          <div class="auteurs">${auteursHTML(p)}</div>
          ${p.notes && !/automatiquement/.test(p.notes) ? `<div class="note">${echapper(p.notes)}</div>` : ""}
        </td>
        <td class="revue">${revueHTML(p)}</td>
        <td class="type"><span class="pastille ${famille(p.type)}">${echapper(valeur(p.type))}</span></td>
        <td class="citations">${p._citations ? citationsHTML(p, `${p._citations}<span class="unite"> ${I18N.accord(p._citations, "citation")}</span>`) : ""}</td>
        <td class="liens-cell">${liensHTML(p)}</td>
      </tr>`).join("");
  }

  // ---------------------------------------------------------------- périodes et graphique par année

  function dessinerPeriodes() {
    $("#periodes").innerHTML = PERIODES.map((p, i) =>
      `<button type="button" class="periode p${i}" data-periode="${i}" aria-pressed="false"><b>${nomPeriode(i)}</b> ${echapper((I18N.en && p.nom_en) || p.nom)}</button>`).join("");
    $("#periodes").hidden = !PERIODES.length;
  }

  $("#periodes").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    choix.periode = choix.periode === b.dataset.periode ? "" : b.dataset.periode;
    choix.annee = "";
    afficher();
  });

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
      const periode = periodeDe(a);
      const actif = String(a) === choix.annee || (choix.periode !== "" && periode === +choix.periode);
      svg += `<rect class="zone" data-annee="${a}" data-n="${v}" x="${x}" y="0" width="${pas}" height="${H - bas}"/>`;
      if (v) svg += `<path class="barre p${periode}${actif ? " active" : ""}" d="M${x + 1},${H - bas} v${-(h - r)} q0,${-r} ${r},${-r} h${larg - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>`;
      else svg += `<g></g>`;
      if (a % (pas < 14 ? 10 : 5) === 0) svg += `<text class="axe" x="${x + pas / 2}" y="${H - 4}" text-anchor="middle">${a}</text>`;
    }
    svg += `</svg>`;
    g.innerHTML = svg;
    g.classList.toggle("filtre", !!choix.annee || choix.periode !== "");
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
    infobulle.textContent = t("{a} : {n}", { a: z.dataset.annee, n: n ? pluriel(n, "publication") : t("aucune") });
    infobulle.hidden = false;
    infobulle.style.left = Math.min(e.clientX + 12, innerWidth - infobulle.offsetWidth - 8) + "px";
    infobulle.style.top = e.clientY - 36 + "px";
  });
  $("#graphique").addEventListener("mouseleave", () => (infobulle.hidden = true));
  $("#graphique").addEventListener("click", (e) => {
    const z = e.target.closest(".zone");
    if (!z || (z.dataset.n === "0" && z.dataset.annee !== choix.annee)) return;
    choix.annee = choix.annee === z.dataset.annee ? "" : z.dataset.annee;
    choix.periode = "";
    afficher();
  });

  // ---------------------------------------------------------------- événements

  let attente;
  champs.recherche.addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  [champs.type, champs.pdf].forEach((c) => c.addEventListener("change", afficher));

  $("#choix").addEventListener("click", (e) => {
    const b = e.target.closest(".etiquette");
    if (!b) return;
    choix[b.dataset.cle] = "";
    afficher();
  });

  document.querySelectorAll("#tableau th[data-tri] button").forEach((b) =>
    b.addEventListener("click", () => {
      const cle = b.parentElement.dataset.tri;
      tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: cle === "annee" || cle === "citations" ? -1 : 1 };
      afficher();
    }));

  corps.addEventListener("click", (e) => {
    const b = e.target.closest(".plus");
    if (!b) return;
    const p = toutes.find((x) => x.id === b.dataset.id);
    if (p) b.parentElement.innerHTML = auteursHTML(p, true);
  });
  FV.activerCiter(corps, (id) => toutes.find((p) => p.id === id));

  $("#exporter").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-format]");
    if (!b) return;
    const liste = filtrer(true);
    trier(liste);
    FV.exporter(liste, b.dataset.format);
  });
})();
