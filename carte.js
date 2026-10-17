// Carte des lieux (conférences, missions) : Europe, zoom Belgique et petites cartes « hors d'Europe ».
// Les fonds viennent de cartes/*.svg (outils/cartes.py) ; les lieux sont placés ici avec la même projection.
window.FVCarte = (function () {
  "use strict";

  const echapper = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let chargement = null;

  // les paramètres des cartes et leurs fonds SVG, chargés une seule fois
  function charger() {
    if (!chargement) {
      chargement = fetch("cartes/cartes.json").then((r) => r.json()).then((cartes) =>
        Promise.all(cartes.map((c) => fetch(c.fichier).then((r) => r.text()).then((svg) => ({ ...c, svg })))));
    }
    return chargement;
  }

  // azimutale équivalente de Lambert, comme outils/cartes.py
  function projeter(carte, lon, lat) {
    const rad = Math.PI / 180;
    const l0 = carte.centre[0] * rad, p0 = carte.centre[1] * rad, l = lon * rad, p = lat * rad;
    const cosC = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
    const k = Math.sqrt(2 / (1 + cosC));
    const x = k * Math.cos(p) * Math.sin(l - l0);
    const y = -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0));
    return [((x - carte.x0) * carte.k) / carte.w * 100, ((y - carte.y0) * carte.k) / carte.h * 100];  // en % de la carte
  }

  const dansCadre = (carte, l) => {
    const [lon0, lat0, lon1, lat1] = carte.cadre;
    return l.lon >= lon0 && l.lon <= lon1 && l.lat >= lat0 && l.lat <= lat1;
  };

  const taille = (n) => Math.round(7 + 5 * Math.sqrt(n));

  function points(carte, lieux, choisie, etiquettes) {
    return lieux.map((l) => {
      const [x, y] = projeter(carte, l.lon, l.lat);
      const d = taille(l.n);
      const etiquette = etiquettes(l) ? `<span class="carte-nom" style="left:${x}%;top:${y}%;--decalage:${d / 2 + 4}px">${echapper(l.ville)}</span>` : "";
      return `<button type="button" class="carte-point${l.ville === choisie ? " choisi" : ""}" data-ville="${echapper(l.ville)}"
        style="left:${x}%;top:${y}%;width:${d}px;height:${d}px"
        aria-label="${echapper(l.ville)}, ${l.n} ${l.n > 1 ? "interventions" : "intervention"}" aria-pressed="${l.ville === choisie}"></button>${etiquette}`;
    }).join("");
  }

  function fond(carte, contenu, extra = "") {
    return `<div class="carte" style="aspect-ratio:${carte.w}/${carte.h}">${carte.svg}${extra}${contenu}</div>`;
  }

  // noms des villes : à droite du point, sinon à gauche, sinon cachés s'ils chevauchent un autre nom ou un point
  function placerNoms(conteneur) {
    conteneur.querySelectorAll(".carte").forEach((carte) => {
      const pris = [...carte.querySelectorAll(".carte-point")].map((p) => p.getBoundingClientRect());
      const touche = (a) => pris.some((b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1);
      const cadre = carte.getBoundingClientRect();
      carte.querySelectorAll(".carte-nom").forEach((nom) => {
        nom.hidden = false;
        let placee = false;
        for (const cote of ["droite", "gauche"]) {
          nom.classList.toggle("gauche", cote === "gauche");
          const r = nom.getBoundingClientRect();
          const dedans = r.left >= cadre.left && r.right <= cadre.right;
          // son propre point ne compte pas : le nom en est décalé
          if (dedans && !touche(r)) { pris.push(r); placee = true; break; }
        }
        if (!placee) nom.hidden = true;
      });
    });
  }

  /**
   * lieux : [{ ville, pays, lat, lon, n, details: [texte…] }]
   * options : { choisie, surChoix(ville ou null), unite: ["intervention", "interventions"] }
   */
  function dessiner(conteneur, lieux, options = {}) {
    return charger().then((cartes) => {
      const parId = Object.fromEntries(cartes.map((c) => [c.id, c]));
      const europe = parId.europe, belgique = parId.belgique;
      const regions = cartes.filter((c) => c.id !== "europe" && c.id !== "belgique");
      const avecCoordonnees = lieux.filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lon));
      const enEurope = avecCoordonnees.filter((l) => dansCadre(europe, l));
      const enBelgique = enEurope.filter((l) => dansCadre(belgique, l));
      const ailleurs = regions.map((r) => ({ r, lieux: avecCoordonnees.filter((l) => !dansCadre(europe, l) && dansCadre(r, l)) }))
        .filter((g) => g.lieux.length);
      const places = new Set([...enEurope, ...ailleurs.flatMap((g) => g.lieux)]);
      const sansCarte = lieux.filter((l) => !places.has(l));
      const choisie = options.choisie || null;
      const [u1, u2] = options.unite || ["intervention", "interventions"];

      // cadre du zoom Belgique, reporté sur la carte d'Europe
      const [b0, b1] = [projeter(europe, belgique.cadre[0], belgique.cadre[3]), projeter(europe, belgique.cadre[2], belgique.cadre[1])];
      const repere = enBelgique.length
        ? `<span class="carte-repere" aria-hidden="true" style="left:${b0[0]}%;top:${b0[1]}%;width:${b1[0] - b0[0]}%;height:${b1[1] - b0[1]}%"></span>` : "";

      const europeHTML = enEurope.length ? `
        <figure class="carte-principale">
          <figcaption>${echapper(europe.titre)}</figcaption>
          ${fond(europe, points(europe, enEurope, choisie, (l) => l.n > 1 && !dansCadre(belgique, l)), repere)}
        </figure>` : "";
      const belgiqueHTML = enBelgique.length ? `
        <figure class="carte-zoom">
          <figcaption>${echapper(belgique.titre)}</figcaption>
          ${fond(belgique, points(belgique, enBelgique, choisie, () => true))}
        </figure>` : "";
      const ailleursHTML = ailleurs.length ? `
        <div class="carte-ailleurs">
          <p class="carte-titre">Hors d'Europe</p>
          <div class="carte-petites">${ailleurs.map((g) => `
            <figure class="carte-petite">
              <figcaption>${echapper(g.r.titre)}</figcaption>
              ${fond(g.r, points(g.r, g.lieux, choisie, () => true))}
            </figure>`).join("")}
          </div>
        </div>` : "";
      const sansCarteHTML = sansCarte.length
        ? `<p class="carte-sans">Sans position connue : ${sansCarte.map((l) => echapper(l.ville)).join(", ")}.</p>` : "";

      conteneur.innerHTML = `
        <div class="carte-bloc">
          ${europeHTML}
          <div class="carte-cote">${belgiqueHTML}${ailleursHTML}</div>
        </div>
        <p class="carte-detail" aria-live="polite"></p>
        ${sansCarteHTML}`;

      placerNoms(conteneur);
      window.removeEventListener("resize", conteneur._placer || (() => {}));
      conteneur._placer = () => placerNoms(conteneur);
      window.addEventListener("resize", conteneur._placer);

      const detail = conteneur.querySelector(".carte-detail");
      const parVille = Object.fromEntries(lieux.map((l) => [l.ville, l]));
      const montrer = (ville) => {
        const l = parVille[ville];
        if (!l) {
          detail.innerHTML = choisie ? `<b>${echapper(choisie)}</b> · <button type="button" class="lien-bouton" data-effacer>toutes les villes</button>`
            : "Survoler un point pour voir le lieu ; cliquer pour n'afficher que ses interventions.";
          return;
        }
        detail.innerHTML = `<b>${echapper(l.ville)}</b> · ${echapper(l.pays)} · ${l.n} ${l.n > 1 ? u2 : u1}`
          + (ville === choisie ? ` · <button type="button" class="lien-bouton" data-effacer>toutes les villes</button>` : "")
          + (l.details && l.details.length ? `<span class="carte-liste">${l.details.map(echapper).join(" · ")}</span>` : "");
      };
      montrer(choisie);

      conteneur.onmouseover = (e) => { const b = e.target.closest(".carte-point"); if (b) montrer(b.dataset.ville); };
      conteneur.onfocusin = conteneur.onmouseover;
      conteneur.onmouseleave = () => montrer(choisie);
      conteneur.onclick = (e) => {
        if (e.target.closest("[data-effacer]")) return options.surChoix && options.surChoix(null);
        const b = e.target.closest(".carte-point");
        if (b && options.surChoix) options.surChoix(b.dataset.ville === choisie ? null : b.dataset.ville);
      };
    });
  }

  return { dessiner };
})();
