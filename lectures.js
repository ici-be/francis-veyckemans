// Page des lectures commentées : les avis Faculty Opinions (F1000), regroupés par année.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel } = FV;
  const { t } = I18N;
  let avis = [];
  let commentes = {};  // id de l'avis → article commenté (donnees/lectures.csv)

  const lectures = fetch("donnees/lectures.csv", { cache: "no-cache" })
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "")
    .then((texte) => Papa.parse(texte, { header: true, skipEmptyLines: true }).data.forEach((l) => (commentes[l.id] = l)));

  Promise.all([FV.charger(), lectures])
    .then(([liste]) => {
      avis = liste.filter(estAvis).sort((a, b) => b._annee - a._annee || sansAccents(a._titre).localeCompare(sansAccents(b._titre)));
      const annees = avis.map((p) => p._annee).filter(Boolean);
      if (avis.length)
        $("#intro").textContent = t(avis.length > 1 ? "{n} recommandés et commentés pour Faculty Opinions (F1000), de {de} à {a}." : "{n} recommandé et commenté pour Faculty Opinions (F1000), de {de} à {a}.",
          { n: pluriel(avis.length, "article"), de: Math.min(...annees), a: Math.max(...annees) });
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    const texte = (p) => sansAccents([p._titre, ...Object.values(commentes[p.id] || {})].join(" "));
    const liste = avis.filter((p) => mots.every((m) => texte(p).includes(m)));
    $("#compte").textContent = liste.length === avis.length ? pluriel(avis.length, "lecture") : t("{n} sur {total}", { n: liste.length, total: avis.length });
    const parAnnee = {};
    liste.forEach((p) => (parAnnee[p.annee || "—"] = parAnnee[p.annee || "—"] || []).push(p));
    $("#lectures").innerHTML = Object.keys(parAnnee).sort((a, b) => b.localeCompare(a)).map((a) => `
      <section class="lectures-annee">
        <h2>${echapper(a)}</h2>
        <ul class="lectures-liste">${parAnnee[a].map((p) => `
          <li>${lecture(p)}</li>`).join("")}
        </ul>
      </section>`).join("");
  }

  // l'avis, puis la référence de l'article commenté et ses liens
  function lecture(p) {
    const c = commentes[p.id] || {};
    const lien = (url, texte) => `<a href="${echapper(url)}" target="_blank" rel="noopener">${texte}</a>`;
    const ref = [c.auteurs, c.revue ? `<i>${echapper(c.revue)}</i>` : "", c.annee].filter(Boolean)
      .map((x, i) => (i === 1 ? x : echapper(x))).join(", ");
    const liens = [
      p.lien_info && lien(p.lien_info, t("Lire l'avis")),
      c.doi && lien(`https://doi.org/${c.doi}`, t("Article commenté")),
      c.pmid && lien(`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(c.pmid)}/`, "PubMed"),
      c.pdf && lien(c.pdf, "PDF"),
    ].filter(Boolean);
    return `
            <div class="lecture">
              <span class="titre">${echapper(p._titre)}</span>
              ${ref ? `<span class="lecture-ref">${ref}</span>` : ""}
            </div>
            <span class="lecture-liens">${liens.join("")}</span>`;
  }

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
})();
