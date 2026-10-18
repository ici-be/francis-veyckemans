// Page des lectures commentées : les avis Faculty Opinions (F1000), regroupés par année et filtrables par thème.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel, surligner } = FV;
  const { t } = I18N;
  let avis = [];
  let commentes = {};  // id de l'avis → article commenté (donnees/lectures.csv)
  let themes = [];
  let themeChoisi = "";

  const lecturesCSV = fetch("donnees/lectures.csv", { cache: "no-cache" })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "")
    .then((texte) => Papa.parse(texte, { header: true, skipEmptyLines: true }).data.forEach((l) => (commentes[l.id] = l)));

  const themesCSV = fetch("donnees/themes.csv", { cache: "no-cache" })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");

  Promise.all([FV.charger(), lecturesCSV, themesCSV])
    .then(([liste, , txtThemes]) => {
      avis = liste.filter(estAvis).sort((a, b) => b._annee - a._annee || sansAccents(a._titre).localeCompare(sansAccents(b._titre)));
      themes = Papa.parse(txtThemes, { header: true, skipEmptyLines: true }).data
        .filter((th) => th.theme && th.mots)
        .map((th, i) => {
          const mots = th.mots.split(";").map((m) => sansAccents(m.trim())).filter(Boolean);
          const nom = (I18N.en && th.theme_en) || th.theme;
          return { cle: "th-" + i, nom, mots, couleur: `var(--th${i % 8})` };  // même couleur que sur la page Thèmes
        });
      avis.forEach((p) => {
        const c = commentes[p.id] || {};
        p._texteLecture = sansAccents([p._titre, c.titre, c.auteurs, c.revue, c.annee].join(" "));
        p._themes = themes.filter((th) => th.mots.some((m) => p._texteLecture.includes(m))).map((th) => th.cle);
      });
      const annees = avis.map((p) => p._annee).filter(Boolean);
      if (avis.length)
        $("#intro").textContent = t(avis.length > 1 ? "{n} recommandés et commentés pour Faculty Opinions (F1000), de {de} à {a}." : "{n} recommandé et commenté pour Faculty Opinions (F1000), de {de} à {a}.",
          { n: pluriel(avis.length, "article"), de: Math.min(...annees), a: Math.max(...annees) });
      const q = new URLSearchParams(location.search).get("q");
      if (q) $("#recherche").value = q;
      dessinerThemes();
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function dessinerThemes() {
    const barre = $("#themes-lectures");
    if (!barre || !themes.length) return;
    const actifs = themes
      .map((th) => ({ ...th, n: avis.filter((p) => p._themes.includes(th.cle)).length }))
      .filter((th) => th.n > 0);
    if (!actifs.length) return;
    barre.innerHTML = `<button type="button" class="pastille-filtre" data-theme="" aria-pressed="${themeChoisi === ""}">${echapper(t("Tous les thèmes"))} <span>${avis.length}</span></button>` +
      actifs.map((th) => `<button type="button" class="pastille-filtre" data-theme="${th.cle}" aria-pressed="${themeChoisi === th.cle}"><i class="point-theme" style="background:${th.couleur}" aria-hidden="true"></i>${echapper(th.nom)} <span>${th.n}</span></button>`).join("");
  }

  function afficher() {
    const brut = $("#recherche").value.trim().split(/\s+/).filter(Boolean);
    const mots = brut.map(sansAccents).filter(Boolean);
    const liste = avis.filter((p) =>
      (!themeChoisi || p._themes.includes(themeChoisi)) &&
      mots.every((m) => p._texteLecture.includes(m)));
    $("#compte").textContent = liste.length === avis.length ? pluriel(avis.length, "lecture") : t("{n} sur {total}", { n: liste.length, total: avis.length });
    document.querySelectorAll("#themes-lectures .pastille-filtre").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.theme === themeChoisi)));
    const parAnnee = {};
    liste.forEach((p) => (parAnnee[p.annee || "—"] = parAnnee[p.annee || "—"] || []).push(p));
    $("#lectures").innerHTML = Object.keys(parAnnee).sort((a, b) => b.localeCompare(a)).map((a) => `
      <section class="lectures-annee">
        <h2>${echapper(a)}</h2>
        <ul class="lectures-liste">${parAnnee[a].map((p) => `
          <li class="lecture-carte">${lecture(p, brut)}</li>`).join("")}
        </ul>
      </section>`).join("");
  }

  // l'avis, puis la référence de l'article commenté, ses thèmes et ses liens
  function lecture(p, mots) {
    const c = commentes[p.id] || {};
    const lien = (url, texte, cls) => `<a${cls ? ` class="${cls}"` : ""} href="${echapper(url)}" target="_blank" rel="noopener">${texte}</a>`;
    const ref = [c.auteurs, c.revue ? `<i>${echapper(c.revue)}</i>` : "", c.annee].filter(Boolean)
      .map((x, i) => (i === 1 ? x : echapper(x))).join(", ");
    const badges = (p._themes || []).map((cle) => {
      const th = themes.find((x) => x.cle === cle);
      return th ? `<span class="pastille-mini"><i class="point-theme" style="background:${th.couleur}" aria-hidden="true"></i>${echapper(th.nom)}</span>` : "";
    }).join("");
    const liens = [
      p.lien_info && lien(p.lien_info, t("Lire l'avis")),
      c.doi && lien(`https://doi.org/${c.doi}`, t("Article commenté")),
      c.pmid && lien(`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(c.pmid)}/`, "PubMed"),
      c.pdf && lien(c.pdf, "PDF", "pdf"),
    ].filter(Boolean);
    return `
            <div class="lecture">
              <span class="titre">${surligner(p._titre, mots)}</span>
              ${ref ? `<span class="lecture-ref">${ref}</span>` : ""}
              ${badges ? `<div class="lecture-badges">${badges}</div>` : ""}
            </div>
            <span class="lecture-liens liens">${liens.join("")}</span>`;
  }

  $("#themes-lectures").addEventListener("click", (e) => {
    const b = e.target.closest(".pastille-filtre");
    if (!b) return;
    themeChoisi = themeChoisi === b.dataset.theme ? "" : b.dataset.theme;
    afficher();
  });

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
})();
