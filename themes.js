// Page des thèmes : publications regroupées selon les mots de leur titre (donnees/themes.csv).
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel, revueHTML, citationsHTML, liensHTML } = FV;
  const { t } = I18N;
  let toutes = [];

  Promise.all([FV.charger(), fetch("donnees/themes.csv", { cache: "no-cache" }).then((r) => r.text())])
    .then(([liste, texte]) => {
      toutes = liste.filter((p) => !estAvis(p));
      const themes = Papa.parse(texte, { header: true, skipEmptyLines: true }).data
        .filter((th) => th.theme && th.mots)
        .map((th, i) => {
          const mots = th.mots.split(";").map((m) => sansAccents(m.trim())).filter(Boolean);
          const publications = toutes
            .filter((p) => mots.some((m) => sansAccents(p.titre).includes(m)))
            .sort((a, b) => (a._annee || 9999) - (b._annee || 9999) || sansAccents(a.titre).localeCompare(sansAccents(b.titre)));
          // site en anglais : colonnes theme_en et description_en, sinon le texte français
          const nom = (I18N.en && th.theme_en) || th.theme;
          const description = I18N.en ? th.description_en || (th.theme_en ? "" : th.description) : th.description;
          return { nom, description, ancre: "theme-" + (i + 1), publications };
        });
      afficher(themes);
    })
    .catch((e) => {
      $("#themes").innerHTML = `<p class="compte">${echapper(t("Les thèmes n'ont pas pu être chargés ({e}).", { e: e.message }))}</p>`;
    });

  function ficheHTML(p) {
    return `<li class="fiche">
      <span class="fiche-annee">${echapper(p.annee) || "—"}</span>
      <div class="cite-ici">
        <div class="titre">${echapper(p.titre)}</div>
        <div class="auteurs">${echapper(p._auteurs.slice(0, 6).join(", "))}${p._auteurs.length > 6 ? ", et al." : ""}</div>
        <div class="revue">${revueHTML(p)}${p._citations ? ` · ${citationsHTML(p, pluriel(p._citations, "citation"))}` : ""}</div>
        ${liensHTML(p)}
      </div>
    </li>`;
  }

  // Couleur associée au thème (harmonie avec les 4 couleurs --per0 à --per3)
  const COULEURS_THEMES = [0, 0, 2, 1, 1, 0, 2, 3];

  function friseHTML(publications, min, max, c) {
    if (!min || !max || max < min) return "";
    const compte = {};
    publications.forEach((p) => p._annee && (compte[p._annee] = (compte[p._annee] || 0) + 1));
    const haut = Math.max(3, ...Object.values(compte));
    const n = max - min + 1, L = 420, H = 34, pas = L / n, larg = Math.max(3, pas - 2);
    let svg = `<svg class="theme-frise" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" aria-hidden="true">`;
    for (let a = min; a <= max; a++) {
      const x = (a - min) * pas, v = compte[a] || 0;
      const h = v ? Math.max(3, ((H - 2) * v) / haut) : 0;
      const r = Math.min(2, larg / 2, h);
      svg += `<rect class="zone" data-annee="${a}" data-n="${v}" x="${x.toFixed(1)}" y="0" width="${pas.toFixed(1)}" height="${H}"/>`;
      if (v) {
        svg += `<path class="barre p${c}" d="M${(x + 1).toFixed(1)},${H} v${-(h - r).toFixed(1)} q0,${-r.toFixed(1)} ${r.toFixed(1)},${-r.toFixed(1)} h${(larg - 2 * r).toFixed(1)} q${r.toFixed(1)},0 ${r.toFixed(1)},${r.toFixed(1)} v${(h - r).toFixed(1)} z"/>`;
      } else {
        svg += `<g></g>`;
      }
    }
    svg += `</svg>`;
    return svg;
  }

  function afficher(themes) {
    const toutesAnnees = toutes.map((p) => p._annee).filter(Boolean);
    const minAnnee = toutesAnnees.length ? Math.min(...toutesAnnees) : 1985;
    const maxAnnee = toutesAnnees.length ? Math.max(...toutesAnnees) : 2026;

    $("#sommaire").innerHTML = themes.map((th) =>
      `<a href="#${th.ancre}">${echapper(th.nom)} <span>${th.publications.length}</span></a>`).join("");
    $("#themes").innerHTML = themes.map((th, i) => {
      const annees = th.publications.map((p) => p._annee).filter(Boolean);
      const periode = annees.length ? `${Math.min(...annees)} – ${Math.max(...annees)}` : "";
      const c = COULEURS_THEMES[i % COULEURS_THEMES.length];
      return `<details class="theme cadre" id="${th.ancre}">
        <summary>
          <div class="theme-entete">
            <div class="theme-texte">
              <h2>${echapper(th.nom)}</h2>
              <span class="theme-compte">${pluriel(th.publications.length, "publication")}${periode ? " · " + periode : ""}</span>
              ${th.description ? `<p>${echapper(th.description)}</p>` : ""}
            </div>
            ${friseHTML(th.publications, minAnnee, maxAnnee, c)}
          </div>
        </summary>
        <ol class="fiches">${th.publications.map(ficheHTML).join("")}</ol>
      </details>`;
    }).join("");
    // un lien du sommaire ouvre le thème
    const ouvrir = () => { const d = location.hash && document.querySelector(location.hash); if (d && d.tagName === "DETAILS") d.open = true; };
    addEventListener("hashchange", ouvrir);
    ouvrir();
  }

  const infobulle = $("#infobulle");
  if (infobulle) {
    $("#themes").addEventListener("mousemove", (e) => {
      const z = e.target.closest(".zone");
      if (!z) return (infobulle.hidden = true);
      const n = +z.dataset.n;
      infobulle.textContent = t("{a} : {n}", { a: z.dataset.annee, n: n ? pluriel(n, "publication") : t("aucune") });
      infobulle.hidden = false;
      infobulle.style.left = Math.min(e.clientX + 12, innerWidth - infobulle.offsetWidth - 8) + "px";
      infobulle.style.top = e.clientY - 36 + "px";
    });
    $("#themes").addEventListener("mouseleave", () => (infobulle.hidden = true));
  }

  FV.activerCiter($("#themes"), (id) => toutes.find((p) => p.id === id));
})();
