// Page des conférences : lit l'onglet « Conférences » du tableau (sinon donnees/conferences.csv).
(function () {
  "use strict";

  const { $, sansAccents, echapper, estLui, pluriel } = FV;
  const { t, valeur } = I18N;
  const CONF = window.CONFIG || {};
  const corps = $("#tableau tbody");
  let toutes = [];
  let tri = { cle: "date", sens: -1 };
  let villeChoisie = null;  // filtre posé en cliquant sur la carte
  let lieux = {};           // lieu tel qu'écrit dans le tableau → { ville, pays, lat, lon } (donnees/lieux.csv)

  function telecharger() {
    const copie = () => fetch("donnees/conferences.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      return r.text();
    });
    if (!CONF.tableau || !CONF.conferences) return copie();
    return fetch(`https://docs.google.com/spreadsheets/d/${CONF.tableau}/export?format=csv&gid=${CONF.conferences}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("erreur " + r.status))))
      .then((texte) => {
        if (!FV.enTeteComplet(texte, ["id", "date", "titre", "congres", "lieu", "type", "langue", "orateurs", "lien_info", "lien_diapos", "lien_video", "notes", "masquer"])) throw new Error("onglet abîmé");
        if ($("#maj")) $("#maj").textContent = "— " + t("en direct du tableau");
        return texte;
      })
      .catch(copie);
  }

  const lieuxCSV = fetch("donnees/lieux.csv", { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  Promise.all([telecharger(), lieuxCSV])
    .then(([texte, texteLieux]) => {
      Papa.parse(texteLieux, { header: true, skipEmptyLines: true }).data.forEach((l) => {
        lieux[(l.lieu || "").trim()] = { ville: l.ville || l.lieu, pays: l.pays || "", lat: parseFloat(l.lat), lon: parseFloat(l.lon) };
      });
      toutes = Papa.parse(texte, { header: true, skipEmptyLines: true }).data
        .filter((c) => (c.id || c.titre) && !/^(oui|x|1|true|vrai)$/i.test((c.masquer || "").trim()))
        .filter((c) => !(CONF.typesConferencesCaches || []).includes((c.type || "").trim()))
        .map((c) => {
          c.type = c.type || "conférence";
          c._ville = (lieux[(c.lieu || "").trim()] || {}).ville || (c.lieu || "").trim();
          c._lieu = lieuLisible(c.lieu);
          c._texte = sansAccents([c.titre, c.congres, c.lieu, c._lieu, c.orateurs, c.date, c.type, valeur(c.type), c.notes].join(" "));
          return c;
        });
      const compte = {};
      toutes.forEach((c) => (compte[c.type] = (compte[c.type] || 0) + 1));
      Object.keys(compte).sort((a, b) => compte[b] - compte[a])
        .forEach((type) => $("#type").add(new Option(`${valeur(type)} (${compte[type]})`, type)));
      const annees = toutes.map((c) => parseInt(c.date, 10)).filter(Boolean);
      if (annees.length)
        $("#intro").textContent = t("{n}, de {de} à {a}. La liste est encore incomplète.", { n: pluriel(toutes.length, "intervention"), de: Math.min(...annees), a: Math.max(...annees) });
      $("#recherche").value = new URLSearchParams(location.search).get("q") || "";  // lien « conferences.html?q=… »
      afficher();
      dessinerCarte();
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  // un point par ville, avec ses interventions (année et congrès)
  function dessinerCarte() {
    const parVille = {};
    toutes.forEach((c) => {
      if (!c._ville) return;
      const l = lieux[(c.lieu || "").trim()] || {};
      const v = (parVille[c._ville] = parVille[c._ville] || { ville: c._ville, pays: l.pays || "", lat: l.lat, lon: l.lon, n: 0, details: [] });
      v.n++;
      const ligne = `${(c.date || "").slice(0, 4)} ${c.congres || c.titre}`.trim();
      if (!v.details.includes(ligne)) v.details.push(ligne);
    });
    Object.values(parVille).forEach((v) => v.details.sort());
    FVCarte.dessiner($("#carte"), Object.values(parVille).sort((a, b) => b.n - a.n), {
      choisie: villeChoisie,
      surChoix: (ville) => {
        villeChoisie = ville;
        afficher();
        dessinerCarte();
      },
    }).catch(() => ($("#carte").hidden = true));
  }

  // lieu tel qu'écrit dans le tableau ; en anglais, « ville, pays » traduits d'après donnees/lieux.csv
  function lieuLisible(lieu) {
    const l = lieux[(lieu || "").trim()];
    if (!I18N.en || !l || !l.ville) return lieu || "";
    return [valeur(l.ville), l.pays && l.pays !== l.ville ? valeur(l.pays) : ""].filter(Boolean).join(", ");
  }

  // « 2015-11-13 » → « 13 nov. 2015 » (« 13 Nov 2015 » en anglais) ; une année seule reste telle quelle
  function dateLisible(d) {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(d || "");
    if (!m) return echapper(d) || "—";
    return `${m[3] ? parseInt(m[3], 10) + " " : ""}${I18N.mois(parseInt(m[2], 10) - 1)} ${m[1]}`;
  }

  function orateursHTML(c) {
    const liste = (c.orateurs || "").split(/\s*,\s*/).filter(Boolean);
    if (liste.length <= 1 && liste.every(estLui)) return "";  // seul orateur : inutile de le répéter
    let court = liste;
    if (liste.length > 8) {  // les six premiers, et lui s'il est plus loin dans la liste
      const lui = liste.slice(6).find(estLui);
      court = liste.slice(0, 6).concat(lui ? ["…", lui, "et al."] : ["et al."]);
    }
    return `<div class="auteurs">${court.map(echapper).join(", ")}</div>`;
  }

  function liensHTML(c) {
    const lien = (url, texte, cls) => `<a${cls ? ` class="${cls}"` : ""} href="${echapper(url)}" target="_blank" rel="noopener">${texte}</a>`;
    return `<div class="liens">${[
      c.lien_diapos && lien(c.lien_diapos, t("Diapos"), "pdf"),
      c.lien_video && lien(c.lien_video, t("Vidéo")),
      c.lien_info && lien(c.lien_info, t("Fiche")),
    ].filter(Boolean).join("")}</div>`;
  }

  function afficher() {
    const mots = sansAccents($("#recherche").value).split(/\s+/).filter(Boolean);
    const type = $("#type").value;
    const liste = toutes.filter((c) => mots.every((m) => c._texte.includes(m)) && (!type || c.type === type)
      && (!villeChoisie || c._ville === villeChoisie));
    const { cle, sens } = tri;
    const val = (c) => sansAccents(c[cle]);
    liste.sort((a, b) => (val(a) < val(b) ? -sens : val(a) > val(b) ? sens : (b.date || "").localeCompare(a.date || "")));
    $("#compte").textContent = (liste.length === toutes.length ? pluriel(toutes.length, "intervention") : t("{n} sur {total}", { n: liste.length, total: toutes.length }))
      + (villeChoisie ? ` · ${valeur(villeChoisie)}` : "");
    corps.innerHTML = liste.length ? liste.map((c) => `
      <tr>
        <td class="annee">${dateLisible(c.date)}</td>
        <td class="titre-cell">
          <div class="titre">${echapper(c.titre)}</div>
          ${orateursHTML(c)}
          ${c.notes ? `<div class="note">${echapper(c.notes)}</div>` : ""}
        </td>
        <td class="revue">${c.congres ? `<i>${echapper(c.congres)}</i>` : ""}${c._lieu ? `<div>${echapper(c._lieu)}</div>` : ""}</td>
        <td class="liens-cell">${liensHTML(c)}</td>
      </tr>`).join("") : `<tr><td colspan="4" class="vide">${t("Aucune intervention ne correspond.")}</td></tr>`;
    document.querySelectorAll("#tableau th[data-tri]").forEach((th) =>
      th.setAttribute("aria-sort", th.dataset.tri === tri.cle ? (tri.sens > 0 ? "ascending" : "descending") : "none"));
  }

  let attente;
  $("#recherche").addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(afficher, 150); });
  $("#type").addEventListener("change", afficher);
  document.querySelectorAll("#tableau th[data-tri] button").forEach((b) =>
    b.addEventListener("click", () => {
      const cle = b.parentElement.dataset.tri;
      tri = tri.cle === cle ? { cle, sens: -tri.sens } : { cle, sens: cle === "date" ? -1 : 1 };
      afficher();
    }));
})();
