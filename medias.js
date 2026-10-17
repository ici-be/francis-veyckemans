// Page des vidéos et podcasts : lit l'onglet « Médias » du tableau (sinon donnees/medias.csv).
// Les lecteurs (YouTube, Libsyn) ne se chargent qu'au clic : rien n'est envoyé à ces services avant.
(function () {
  "use strict";

  const { $, sansAccents, echapper, pluriel } = FV;
  const { t, valeur } = I18N;
  const CONF = window.CONFIG || {};
  let toutes = [];

  function telecharger() {
    const copie = () => fetch("donnees/medias.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      return r.text();
    });
    if (!CONF.tableau || !CONF.medias) return copie();
    return fetch(`https://docs.google.com/spreadsheets/d/${CONF.tableau}/export?format=csv&gid=${CONF.medias}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("erreur " + r.status))))
      .then((texte) => {
        if (!/^id,/.test(texte)) throw new Error("onglet illisible");
        return texte;
      })
      .catch(copie);
  }

  // identifiant YouTube ou Libsyn d'après l'adresse
  function lecteur(m) {
    const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/.exec(m.url || "");
    if (yt) return { genre: "youtube", id: yt[1] };
    const ls = /^libsyn:(\d+)$/.exec(m.id || "");
    if (ls) return { genre: "libsyn", id: ls[1] };
    return null;
  }

  telecharger()
    .then((texte) => {
      toutes = Papa.parse(texte, { header: true, skipEmptyLines: true }).data
        .filter((m) => (m.id || m.titre) && !/^(oui|x|1|true|vrai)$/i.test((m.masquer || "").trim()))
        .map((m) => {
          m.type = m.type || "vidéo";
          m._lecteur = lecteur(m);
          m._texte = sansAccents([m.titre, m.source, m.evenement, m.intervenants, m.date, m.langue, valeur(m.langue), m.notes].join(" "));
          return m;
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || "") || sansAccents(a.titre).localeCompare(sansAccents(b.titre)));
      const compte = {};
      toutes.forEach((m) => (compte[m.type] = (compte[m.type] || 0) + 1));
      Object.keys(compte).sort((a, b) => compte[b] - compte[a])
        .forEach((type) => $("#type").add(new Option(`${I18N.accord(2, type)} (${compte[type]})`, type)));
      const parts = Object.keys(compte).sort((a, b) => compte[b] - compte[a]).map((type) => pluriel(compte[type], type));
      $("#intro").textContent = parts.length > 1 ? t("{n} et {m}.", { n: parts.slice(0, -1).join(", "), m: parts.at(-1) }) : parts.join("") + ".";
      afficher();
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function dateLisible(d) {
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(d || "");
    if (!m) return echapper(d);
    if (!m[2]) return m[1];
    return `${m[3] ? parseInt(m[3], 10) + " " : ""}${I18N.mois(parseInt(m[2], 10) - 1)} ${m[1]}`;
  }

  // « 34:40 » → « 35 min »
  function dureeLisible(d) {
    const p = (d || "").split(":").map(Number);
    if (p.some(isNaN) || !p.length || !d) return "";
    const minutes = p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p[0] + (p[1] || 0) / 60;
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, "0")}` : `${Math.round(minutes)} min`;
  }

  function vignette(m) {
    const l = m._lecteur;
    const titre = echapper(m.titre);
    if (l && l.genre === "youtube") {
      return `<button type="button" class="media-lancer" data-genre="youtube" data-id="${l.id}" aria-label="${t("Lire la vidéo : {titre}", { titre })}">
        <img src="medias/${l.id}.jpg" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${l.id}/mqdefault.jpg'">
        <span class="media-jouer" aria-hidden="true"></span></button>`;
    }
    if (l && l.genre === "libsyn") {
      return `<button type="button" class="media-lancer media-audio" data-genre="libsyn" data-id="${l.id}" aria-label="${t("Écouter le podcast : {titre}", { titre })}">
        <span class="media-onde" aria-hidden="true"></span><span class="media-jouer" aria-hidden="true"></span></button>`;
    }
    return "";
  }

  function carte(m) {
    const source = t(m._lecteur && m._lecteur.genre === "youtube" ? "Voir sur YouTube" : m._lecteur ? "Page du podcast" : "Ouvrir");
    const evenement = m.evenement || m.source;
    const date = /^\d{4}$/.test(m.date || "") && (evenement || "").includes(m.date) ? "" : dateLisible(m.date);  // pas « e-SFAR 2021 · 2021 »
    const meta = [evenement, date, dureeLisible(m.duree), m.langue && m.langue !== (I18N.en ? "anglais" : "français") ? t("en {langue}", { langue: valeur(m.langue) }) : ""]
      .filter(Boolean).map(echapper).join(" · ");
    return `<article class="media cadre">
      <div class="media-lecteur">${vignette(m)}</div>
      <div class="media-texte">
        <h2 class="media-titre"${I18N.en && m.langue === "français" ? ' lang="fr"' : ""}>${echapper(m.titre)}</h2>
        <p class="media-meta">${meta}</p>
        ${m.intervenants ? `<p class="media-avec">${echapper(t("avec {noms}", { noms: m.intervenants }))}</p>` : ""}
        ${m.notes ? `<p class="media-note">${echapper(m.notes)}</p>` : ""}
        ${m.url ? `<a class="media-lien" href="${echapper(m.url)}" target="_blank" rel="noopener">${source} ↗</a>` : ""}
      </div>
    </article>`;
  }

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    const type = $("#type").value;
    const liste = toutes.filter((m) => mots.every((x) => m._texte.includes(x)) && (!type || m.type === type));
    $("#compte").textContent = liste.length === toutes.length ? "" : t("{n} sur {total}", { n: liste.length, total: toutes.length });
    $("#medias").innerHTML = liste.length ? liste.map(carte).join("") : `<p class="vide">${t("Rien ne correspond.")}</p>`;
  }

  // au clic, la vignette laisse place au lecteur
  $("#medias").addEventListener("click", (e) => {
    const b = e.target.closest(".media-lancer");
    if (!b) return;
    const titre = b.getAttribute("aria-label");
    const src = b.dataset.genre === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0`
      : `https://html5-player.libsyn.com/embed/episode/id/${b.dataset.id}/height/90/theme/custom/thumbnail/no/direction/forward/render-playlist/no/autoplay/yes/custom-color/1d6b70/`;
    const cadre = b.parentElement;
    cadre.classList.toggle("media-lecteur-audio", b.dataset.genre === "libsyn");
    cadre.innerHTML = `<iframe src="${src}" title="${titre}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
  });

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  $("#type").addEventListener("change", afficher);
})();
