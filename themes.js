// Page des thèmes : publications regroupées selon les mots de leur titre (donnees/themes.csv).
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel, revueHTML, liensHTML } = FV;
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
        <div class="revue">${revueHTML(p)}${p._citations ? ` · ${pluriel(p._citations, "citation")}` : ""}</div>
        ${liensHTML(p)}
      </div>
    </li>`;
  }

  function afficher(themes) {
    $("#sommaire").innerHTML = themes.map((th) =>
      `<a href="#${th.ancre}">${echapper(th.nom)} <span>${th.publications.length}</span></a>`).join("");
    $("#themes").innerHTML = themes.map((th) => {
      const annees = th.publications.map((p) => p._annee).filter(Boolean);
      const periode = annees.length ? `${Math.min(...annees)} – ${Math.max(...annees)}` : "";
      return `<details class="theme cadre" id="${th.ancre}">
        <summary>
          <h2>${echapper(th.nom)}</h2>
          <span class="theme-compte">${pluriel(th.publications.length, "publication")}${periode ? " · " + periode : ""}</span>
          ${th.description ? `<p>${echapper(th.description)}</p>` : ""}
        </summary>
        <ol class="fiches">${th.publications.map(ficheHTML).join("")}</ol>
      </details>`;
    }).join("");
    // un lien du sommaire ouvre le thème
    const ouvrir = () => { const d = location.hash && document.querySelector(location.hash); if (d && d.tagName === "DETAILS") d.open = true; };
    addEventListener("hashchange", ouvrir);
    ouvrir();
  }

  FV.activerCiter($("#themes"), (id) => toutes.find((p) => p.id === id));
})();
