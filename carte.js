// Carte des lieux (conférences, missions) : Europe, zoom Belgique et petites cartes « hors d'Europe ».
// Les fonds viennent de cartes/*.svg (outils/cartes.py) ; les lieux sont placés ici avec la même projection.
window.FVCarte = (function () {
  "use strict";

  const { t, valeur } = I18N;
  const echapper = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let chargement = null;
  // carte réduite par défaut (pour voir le tableau en dessous) ; le choix du visiteur est retenu
  let grande = false;
  try { grande = localStorage.getItem("fv-carte-grande") === "1"; } catch (e) { /* stockage indisponible */ }

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

  // diamètre pair : le point se centre sur un pixel entier, sans flou
  const taille = (n) => 2 * Math.round((7 + 5 * Math.sqrt(n)) / 2);

  function points(carte, lieux, choisie, etiquettes) {
    return lieux.map((l) => {
      const [x, y] = projeter(carte, l.lon, l.lat);
      const d = taille(l.n);
      const etiquette = etiquettes(l) ? `<span class="carte-nom" style="left:${x}%;top:${y}%;--decalage:${d / 2 + 4}px">${echapper(valeur(l.ville))}</span>` : "";
      return `<button type="button" class="carte-point${l.ville === choisie ? " choisi" : ""}" data-ville="${echapper(l.ville)}"
        style="left:${x}%;top:${y}%;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px"
        aria-label="${echapper(valeur(l.ville))}, ${I18N.pluriel(l.n, "intervention")}" aria-pressed="${l.ville === choisie}"></button>${etiquette}`;
    }).join("");
  }

  function fond(carte, contenu, extra = "") {
    return `<div class="carte" style="aspect-ratio:${carte.w}/${carte.h};--ratio:${(carte.w / carte.h).toFixed(4)}">${carte.svg}${extra}${contenu}</div>`;
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
   * options : { choisie, surChoix(ville ou null), unite: ["intervention", "interventions"] (par défaut : « intervention » traduit) }
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
      const [u1, u2] = options.unite || [];

      // cadre du zoom Belgique, reporté sur la carte d'Europe
      const [b0, b1] = [projeter(europe, belgique.cadre[0], belgique.cadre[3]), projeter(europe, belgique.cadre[2], belgique.cadre[1])];
      const repere = enBelgique.length
        ? `<span class="carte-repere" aria-hidden="true" style="left:${b0[0]}%;top:${b0[1]}%;width:${b1[0] - b0[0]}%;height:${b1[1] - b0[1]}%"></span>` : "";

      // chaque carte : largeur proportionnelle à son rapport largeur/hauteur, d'où des hauteurs égales sur une rangée
      const figure = (carte, classe, contenu, extra = "") => `
        <figure class="carte-fig ${classe}" style="--ratio:${(carte.w / carte.h).toFixed(4)}">
          <figcaption>${echapper(t(carte.titre))}</figcaption>
          ${fond(carte, contenu, extra)}
        </figure>`;
      const figures = [
        enEurope.length ? figure(europe, "carte-principale", points(europe, enEurope, choisie, (l) => l.n > 1 && !dansCadre(belgique, l)), repere) : "",
        enBelgique.length ? figure(belgique, "carte-zoom", points(belgique, enBelgique, choisie, () => true)) : "",
        // carte agrandie : les petites cartes passent à la ligne
        ailleurs.length && (enEurope.length || enBelgique.length) ? `<span class="carte-saut" aria-hidden="true"></span>` : "",
        ...ailleurs.map((g) => figure(g.r, "carte-petite", points(g.r, g.lieux, choisie, () => true))),
      ].join("");
      const sansCarteHTML = sansCarte.length
        ? `<p class="carte-sans">${echapper(t("Sans position connue : {lieux}.", { lieux: sansCarte.map((l) => valeur(l.ville)).join(", ") }))}</p>` : "";
      const parVille = Object.fromEntries(lieux.map((l) => [l.ville, l]));
      const resume = (l) => `<b>${echapper(valeur(l.ville))}</b> · ${echapper(valeur(l.pays))} · ${u2 ? `${l.n} ${l.n > 1 ? u2 : u1}` : I18N.pluriel(l.n, "intervention")}`;
      const choixHTML = choisie && parVille[choisie]
        ? `<p class="carte-choix">${resume(parVille[choisie])} · <button type="button" class="lien-bouton" data-effacer>${t("toutes les villes")}</button></p>` : "";

      const chevron = (haut) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${haut ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const libelle = () => t(grande ? "Réduire la carte" : "Agrandir la carte");
      conteneur.classList.toggle("carte-compacte", !grande);
      conteneur.innerHTML = `
        <button type="button" class="carte-taille" aria-expanded="${grande}" aria-label="${libelle()}" title="${libelle()}">${chevron(grande)}</button>
        <div class="carte-bloc">${figures}</div>
        ${choixHTML}${sansCarteHTML}
        <div class="carte-bulle" role="status" hidden></div>`;

      placerNoms(conteneur);
      window.removeEventListener("resize", conteneur._placer || (() => {}));
      conteneur._placer = () => placerNoms(conteneur);
      window.addEventListener("resize", conteneur._placer);

      // bulle au survol (ou au clavier) : le lieu et ses interventions
      const bulle = conteneur.querySelector(".carte-bulle");
      const montrer = (point) => {
        const l = parVille[point.dataset.ville];
        if (!l) return;
        bulle.innerHTML = resume(l) + (l.details && l.details.length
          ? `<span class="carte-liste">${l.details.slice(0, 6).map(echapper).join("<br>")}${l.details.length > 6 ? "<br>…" : ""}</span>` : "");
        bulle.hidden = false;
        const p = point.getBoundingClientRect(), c = conteneur.getBoundingClientRect();
        const largeur = bulle.offsetWidth;
        const x = Math.min(Math.max(p.left + p.width / 2 - c.left - largeur / 2, 8), c.width - largeur - 8);
        const dessous = p.top - c.top < bulle.offsetHeight + 16;  // pas la place au-dessus
        bulle.style.left = x + "px";
        bulle.style.top = (dessous ? p.bottom - c.top + 8 : p.top - c.top - bulle.offsetHeight - 8) + "px";
      };
      const cacher = () => (bulle.hidden = true);
      conteneur.onmouseover = (e) => { const b = e.target.closest(".carte-point"); if (b) montrer(b); };
      conteneur.onfocusin = conteneur.onmouseover;
      conteneur.onmouseout = (e) => { if (e.target.closest(".carte-point")) cacher(); };
      conteneur.onfocusout = conteneur.onmouseout;
      conteneur.onclick = (e) => {
        const taille = e.target.closest(".carte-taille");
        if (taille) {
          grande = !grande;
          try { localStorage.setItem("fv-carte-grande", grande ? "1" : "0"); } catch (err) { /* stockage indisponible */ }
          conteneur.classList.toggle("carte-compacte", !grande);
          taille.innerHTML = chevron(grande);
          taille.setAttribute("aria-expanded", String(grande));
          taille.setAttribute("aria-label", libelle());
          taille.title = libelle();
          cacher();
          placerNoms(conteneur);
          return;
        }
        if (e.target.closest("[data-effacer]")) return options.surChoix && options.surChoix(null);
        const b = e.target.closest(".carte-point");
        if (b && options.surChoix) options.surChoix(b.dataset.ville === choisie ? null : b.dataset.ville);
      };
    });
  }

  return { dessiner };
})();
