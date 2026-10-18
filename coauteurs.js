// Page des coauteurs : nombre de publications communes et période, noms complets d'après donnees/coauteurs.csv.
// Au-dessus du tableau : les thèmes (filtres) et, replié, le graphique des liens entre les principaux coauteurs.
(function () {
  "use strict";

  const { $, sansAccents, echapper, estAvis, pluriel } = FV;
  const { t } = I18N;
  const corps = $("#tableau tbody");
  let gens = [], themes = [], min = 0, max = 0;
  let tri = { cle: "n", sens: -1 };
  let theme = -1, avec = "";  // filtres du bandeau : thème choisi, coauteur dont on montre les coauteurs
  let parNom = {};

  // themes.csv absent ou illisible : la page fonctionne sans le bandeau
  const lesThemes = fetch("donnees/themes.csv", { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  Promise.all([FV.charger(), lesThemes])
    .then(([liste, texte]) => {
      themes = FV.lireThemes(texte);
      parNom = {};
      liste.filter((p) => !estAvis(p)).forEach((p) => {
        const noms = FV.coauteurs(p);
        const dans = themes.map((th) => FV.dansTheme(p, th));
        noms.forEach((nom) => {
          const g = (parNom[nom] = parNom[nom] || { nom, n: 0, de: Infinity, a: 0, th: themes.map(() => 0), liens: {} });
          g.n++;
          if (p._annee) { g.de = Math.min(g.de, p._annee); g.a = Math.max(g.a, p._annee); }
          dans.forEach((oui, i) => oui && g.th[i]++);
          // nombre de publications signées avec chacun des autres coauteurs
          noms.forEach((autre) => autre !== nom && (g.liens[autre] = (g.liens[autre] || 0) + 1));
        });
      });
      gens = Object.values(parNom);
      // thème dominant : celui des publications communes le plus fréquent, -1 si aucun
      gens.forEach((g) => {
        const m = Math.max(0, ...g.th);
        g.dom = m ? g.th.indexOf(m) : -1;
      });
      const annees = liste.map((p) => p._annee).filter(Boolean);
      min = Math.min(...annees);
      max = Math.max(...annees);
      const fideles = gens.filter((g) => g.n > 1).length;
      $("#intro").textContent = t("{n} coauteurs, dont {f} pour au moins deux publications. Un nom mène à la liste des publications communes.", { n: gens.length, f: fideles });
      preparerBandeau();
      afficher();
    })
    .catch((e) => {
      $("#intro").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    // pendant une recherche, ou quand on montre les coauteurs de quelqu'un, tous les coauteurs sont montrés : case cochée et grisée
    const caseTous = $("#tous");
    caseTous.disabled = mots.length > 0 || !!avec;
    caseTous.checked = caseTous.disabled || choixTous;
    const tous = caseTous.checked;
    const liste = gens.filter((g) => (tous || g.n > 1)
      && (theme < 0 || g.th[theme])
      && (!avec || g.nom === avec || g.liens[avec])
      && mots.every((m) => sansAccents(g.nom).includes(m)));
    const { cle, sens } = tri;
    const val = (g) => (cle === "nom" ? sansAccents(g.nom) : g[cle]);
    liste.sort((x, y) => (val(x) < val(y) ? -sens : val(x) > val(y) ? sens : sansAccents(x.nom).localeCompare(sansAccents(y.nom))));
    $("#compte").textContent = pluriel(liste.length, "coauteur");
    const actifs = [theme >= 0 && t("thème : {t}", { t: themes[theme].nom }), avec && t("coauteurs de {nom}", { nom: avec })].filter(Boolean);
    $("#filtre-actif").innerHTML = actifs.length
      ? `${echapper(actifs.join(" · "))} · <button type="button" class="lien-bouton" id="effacer">${echapper(t("effacer"))}</button>`
      : "";
    const duree = max - min + 1;
    corps.innerHTML = liste.length ? liste.map((g) => `
      <tr${g.nom === avec ? ' class="choisi"' : ""}>
        <td><a href="${I18N.lien("./?coauteur=" + encodeURIComponent(g.nom))}">${echapper(g.nom)}</a></td>
        <td class="nombre">${g.n}</td>
        <td class="periode-cell">${g.a ? `<div class="periode-boite">
          <span class="ligne-vie" aria-hidden="true"><span style="left:${((g.de - min) / duree) * 100}%;width:${Math.max(1.5, ((g.a - g.de + 1) / duree) * 100)}%"></span></span>
          <span class="periode-texte">${g.de === g.a ? g.de : `${g.de} – ${g.a}`}</span>
        </div>` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="3" class="vide">${t("Aucun coauteur ne correspond.")}</td></tr>`;
    document.querySelectorAll("#tableau th[data-tri]").forEach((th) =>
      th.setAttribute("aria-sort", th.dataset.tri === tri.cle ? (tri.sens > 0 ? "ascending" : "descending") : "none"));
    // bandeau : nombre de coauteurs par thème selon la case, thème choisi, points du graphique
    document.querySelectorAll("#themes-choix button").forEach((b, i) => {
      b.setAttribute("aria-pressed", i === theme);
      b.querySelector("span").textContent = gens.filter((g) => g.th[i] && (tous || g.n > 1)).length;
    });
    marquerArcs();
  }

  // ---------------------------------------------------------------- bandeau

  const couleur = (i) => (i < 0 ? "var(--th-x)" : `var(--th${i % 8})`);

  function preparerBandeau() {
    if (!themes.length) return;
    $("#themes-choix").innerHTML = themes.map((th, i) =>
      `<button type="button" class="pastille-filtre" aria-pressed="false"><i class="point-theme" style="background:${couleur(i)}" aria-hidden="true"></i>${echapper(th.nom)} <span></span></button>`).join("");
    document.querySelectorAll("#themes-choix button").forEach((b, i) =>
      b.addEventListener("click", () => { theme = theme === i ? -1 : i; afficher(); }));
    $("#bandeau").hidden = false;
    // le graphique n'est dessiné qu'à la première ouverture
    $("#liens").addEventListener("toggle", () => { if ($("#liens").open && !$("#arcs").firstChild) dessinerArcs(); });
  }

  // Arcs : les 40 principaux coauteurs alignés selon leur première publication commune,
  // un arc entre deux d'entre eux à partir de trois publications ensemble
  const L = 900, H = 124, BASE = 96, MARGE = 30, SEUIL = 3;

  function dessinerArcs() {
    const choisis = [...gens].sort((x, y) => y.n - x.n || sansAccents(x.nom).localeCompare(sansAccents(y.nom))).slice(0, 40);
    if (choisis.length < 2) return;
    const nMax = choisis[0].n;
    choisis.sort((x, y) => x.de - y.de || y.n - x.n);
    const pas = (L - 2 * MARGE) / (choisis.length - 1);
    const x = {};
    choisis.forEach((g, i) => (x[g.nom] = MARGE + i * pas));
    const rayon = (n) => 2.5 + 6.5 * Math.sqrt((n - 1) / Math.max(1, nMax - 1));
    const arcs = [];
    choisis.forEach((g, i) => choisis.slice(i + 1).forEach((h) => (g.liens[h.nom] || 0) >= SEUIL && arcs.push([g, h, g.liens[h.nom]])));
    let svg = `<svg class="arcs" viewBox="0 0 ${L} ${H}" role="group" aria-label="${echapper(t("Liens entre les principaux coauteurs"))}">`;
    svg += `<line class="arcs-base" x1="${MARGE - 10}" x2="${L - MARGE + 10}" y1="${BASE}" y2="${BASE}"/>`;
    svg += arcs.map(([g, h, n]) => {
      const x1 = x[g.nom], x2 = x[h.nom];
      const ry = 6 + 80 * Math.sqrt((x2 - x1) / (L - 2 * MARGE));
      const c = g.dom === h.dom ? couleur(g.dom) : "var(--encre-3)";
      return `<path class="arc" data-a="${echapper(g.nom)}" data-b="${echapper(h.nom)}" d="M${x1.toFixed(1)},${BASE} A${((x2 - x1) / 2).toFixed(1)},${ry.toFixed(1)} 0 0 1 ${x2.toFixed(1)},${BASE}" stroke="${c}" stroke-width="${Math.min(4, 0.6 + n / 5).toFixed(1)}"/>`;
    }).join("");
    // repères d'années : la première de chaque groupe, si la place le permet
    let dernier = -99;
    choisis.forEach((g, i) => {
      if ((i && choisis[i - 1].de === g.de) || x[g.nom] - dernier < 34) return;
      dernier = x[g.nom];
      svg += `<text class="arcs-annee" x="${dernier.toFixed(1)}" y="${H - 6}" text-anchor="middle">${g.de}</text>`;
    });
    svg += choisis.map((g) =>
      `<circle class="arcs-point" tabindex="0" role="button" aria-label="${echapper(g.nom)}, ${echapper(pluriel(g.n, "publication"))}" data-nom="${echapper(g.nom)}" cx="${x[g.nom].toFixed(1)}" cy="${BASE}" r="${rayon(g.n).toFixed(1)}" fill="${couleur(g.dom)}"/>`).join("");
    $("#arcs").innerHTML = svg + "</svg>";

    const dessin = $("#arcs svg"), bulle = $("#arcs-bulle");
    const survoler = (rond) => {
      const g = parNom[rond.dataset.nom];
      dessin.classList.add("survol");
      dessin.querySelectorAll(".arc").forEach((a) => a.classList.toggle("vu", a.dataset.a === g.nom || a.dataset.b === g.nom));
      dessin.querySelectorAll(".arcs-point").forEach((p) => p.classList.toggle("vu", p === rond || (g.liens[p.dataset.nom] || 0) >= SEUIL));
      const principaux = g.th.map((n, i) => [n, i]).filter(([n]) => n).sort((a, b) => b[0] - a[0]).slice(0, 2)
        .map(([n, i]) => `${themes[i].nom} (${n})`).join(", ");
      bulle.innerHTML = `<b>${echapper(g.nom)}</b>${echapper(pluriel(g.n, "publication"))} · ${g.de === g.a ? g.de : `${g.de} – ${g.a}`}`
        + (principaux ? `<br>${echapper(principaux)}` : "") + `<br>${echapper(t("Cliquer pour voir ses coauteurs."))}`;
      bulle.hidden = false;
      const cadre = $("#liens").getBoundingClientRect(), p = rond.getBoundingClientRect();
      const gauche = p.left + p.width / 2 - cadre.left - bulle.offsetWidth / 2;
      bulle.style.left = Math.max(0, Math.min(cadre.width - bulle.offsetWidth, gauche)) + "px";
      bulle.style.top = p.top - cadre.top - bulle.offsetHeight - 8 + "px";
    };
    const quitter = () => {
      dessin.classList.remove("survol");
      bulle.hidden = true;
    };
    const choisir = (rond) => {
      avec = avec === rond.dataset.nom ? "" : rond.dataset.nom;
      afficher();
    };
    dessin.addEventListener("mouseover", (e) => e.target.matches(".arcs-point") && survoler(e.target));
    dessin.addEventListener("mouseout", (e) => e.target.matches(".arcs-point") && quitter());
    dessin.addEventListener("focusin", (e) => e.target.matches(".arcs-point") && survoler(e.target));
    dessin.addEventListener("focusout", quitter);
    dessin.addEventListener("click", (e) => e.target.matches(".arcs-point") && choisir(e.target));
    dessin.addEventListener("keydown", (e) => {
      if (e.target.matches(".arcs-point") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); choisir(e.target); }
    });
    marquerArcs();
  }

  // thème choisi : les autres points et leurs arcs s'estompent ; coauteur choisi : point entouré
  function marquerArcs() {
    const dessin = $("#arcs svg");
    if (!dessin) return;
    const hors = (nom) => theme >= 0 && !parNom[nom].th[theme];
    dessin.querySelectorAll(".arcs-point").forEach((p) => {
      p.classList.toggle("estompe", hors(p.dataset.nom));
      p.classList.toggle("choisi", p.dataset.nom === avec);
    });
    dessin.querySelectorAll(".arc").forEach((a) => a.classList.toggle("estompe", hors(a.dataset.a) || hors(a.dataset.b)));
  }

  // ---------------------------------------------------------------- événements

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  let choixTous = $("#tous").checked;  // choix de l'utilisateur, rétabli quand la recherche est vidée
  $("#tous").addEventListener("change", () => { choixTous = $("#tous").checked; afficher(); });
  $("#filtre-actif").addEventListener("click", (e) => {
    if (e.target.id !== "effacer") return;
    theme = -1;
    avec = "";
    afficher();
  });
  document.querySelectorAll("#tableau th[data-tri] button").forEach((b) =>
    b.addEventListener("click", () => {
      const cle = b.parentElement.dataset.tri;
      tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: cle === "n" ? -1 : 1 };
      afficher();
    }));
})();
