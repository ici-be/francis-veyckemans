// Page des lectures commentées : les avis Faculty Opinions (F1000), regroupés par année.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel } = FV;
  let avis = [];

  FV.charger()
    .then((liste) => {
      avis = liste.filter(estAvis).sort((a, b) => b._annee - a._annee || sansAccents(a._titre).localeCompare(sansAccents(b._titre)));
      const annees = avis.map((p) => p._annee).filter(Boolean);
      if (avis.length)
        $("#intro").textContent = `${pluriel(avis.length, "article")} recommandé${avis.length > 1 ? "s" : ""} et commenté${avis.length > 1 ? "s" : ""} pour Faculty Opinions (F1000), de ${Math.min(...annees)} à ${Math.max(...annees)}.`;
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = "La liste n'a pas pu être chargée (" + e.message + ").";
    });

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    const liste = avis.filter((p) => mots.every((m) => sansAccents(p._titre).includes(m)));
    $("#compte").textContent = liste.length === avis.length ? pluriel(avis.length, "lecture") : `${liste.length} sur ${avis.length}`;
    const parAnnee = {};
    liste.forEach((p) => (parAnnee[p.annee || "—"] = parAnnee[p.annee || "—"] || []).push(p));
    $("#lectures").innerHTML = Object.keys(parAnnee).sort((a, b) => b.localeCompare(a)).map((a) => `
      <section class="lectures-annee">
        <h2>${echapper(a)}</h2>
        <ul class="lectures-liste">${parAnnee[a].map((p) => `
          <li>
            <span class="titre">${echapper(p._titre)}</span>
            ${p.lien_info ? `<a href="${echapper(p.lien_info)}" target="_blank" rel="noopener">Lire l'avis</a>` : ""}
          </li>`).join("")}
        </ul>
      </section>`).join("");
  }

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
})();
