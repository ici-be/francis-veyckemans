// Page des coauteurs : nombre de publications communes et période, noms complets d'après donnees/coauteurs.csv.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel } = FV;
  const corps = $("#tableau tbody");
  let gens = [], min = 0, max = 0;
  let tri = { cle: "n", sens: -1 };

  FV.charger()
    .then((liste) => {
      const parNom = {};
      liste.filter((p) => !estAvis(p)).forEach((p) => FV.coauteurs(p).forEach((nom) => {
        const g = (parNom[nom] = parNom[nom] || { nom, n: 0, de: Infinity, a: 0 });
        g.n++;
        if (p._annee) { g.de = Math.min(g.de, p._annee); g.a = Math.max(g.a, p._annee); }
      }));
      gens = Object.values(parNom);
      const annees = liste.map((p) => p._annee).filter(Boolean);
      min = Math.min(...annees);
      max = Math.max(...annees);
      const fideles = gens.filter((g) => g.n > 1).length;
      $("#intro").textContent = `${gens.length} coauteurs, dont ${fideles} pour au moins deux publications. Un nom mène à la liste des publications communes.`;
      afficher();
    })
    .catch((e) => {
      $("#intro").textContent = "La liste n'a pas pu être chargée (" + e.message + ").";
    });

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    const tous = $("#tous").checked;
    const liste = gens.filter((g) => (tous || g.n > 1) && mots.every((m) => sansAccents(g.nom).includes(m)));
    const { cle, sens } = tri;
    const val = (g) => (cle === "nom" ? sansAccents(g.nom) : g[cle]);
    liste.sort((x, y) => (val(x) < val(y) ? -sens : val(x) > val(y) ? sens : sansAccents(x.nom).localeCompare(sansAccents(y.nom))));
    $("#compte").textContent = pluriel(liste.length, "coauteur");
    const duree = max - min + 1;
    corps.innerHTML = liste.length ? liste.map((g) => `
      <tr>
        <td><a href="./?coauteur=${encodeURIComponent(g.nom)}">${echapper(g.nom)}</a></td>
        <td class="nombre">${g.n}</td>
        <td class="periode-cell">
          <span class="ligne-vie" aria-hidden="true"><span style="left:${((g.de - min) / duree) * 100}%;width:${Math.max(1.5, ((g.a - g.de + 1) / duree) * 100)}%"></span></span>
          <span class="periode-texte">${g.de === g.a ? g.de : `${g.de} – ${g.a}`}</span>
        </td>
      </tr>`).join("") : `<tr><td colspan="3" class="vide">Aucun coauteur ne correspond.</td></tr>`;
    document.querySelectorAll("#tableau th[data-tri]").forEach((th) =>
      th.setAttribute("aria-sort", th.dataset.tri === tri.cle ? (tri.sens > 0 ? "ascending" : "descending") : "none"));
  }

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  $("#tous").addEventListener("change", afficher);
  document.querySelectorAll("#tableau th[data-tri] button").forEach((b) =>
    b.addEventListener("click", () => {
      const cle = b.parentElement.dataset.tri;
      tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: cle === "n" ? -1 : 1 };
      afficher();
    }));
})();
