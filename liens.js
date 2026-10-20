// Page des liens : lit l'onglet « Liens » du tableau (sinon donnees/liens.csv), regroupés par catégorie
// dans l'ordre où elles apparaissent dans le tableau.
(function () {
  "use strict";

  const { $, echapper, pluriel } = FV;
  const { t } = I18N;
  const CONF = window.CONFIG || {};

  function telecharger() {
    const copie = () => fetch("donnees/liens.csv", { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      return r.text();
    });
    if (!CONF.tableau || !CONF.liens) return copie();
    return fetch(`https://docs.google.com/spreadsheets/d/${CONF.tableau}/export?format=csv&gid=${CONF.liens}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("erreur " + r.status))))
      .then((texte) => {
        if (!FV.enTeteComplet(texte, ["id", "categorie", "nom", "description", "url", "langue", "masquer"])) throw new Error("onglet abîmé");
        return texte;
      })
      .catch(copie);
  }

  const ancre = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const domaine = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };

  telecharger()
    .then((texte) => {
      const liens = Papa.parse(texte, { header: true, skipEmptyLines: true }).data
        .filter((l) => l.url && l.nom && !/^(oui|x|1|true|vrai)$/i.test((l.masquer || "").trim()));
      const groupes = [];
      liens.forEach((l) => {
        // site en anglais : colonnes categorie_en et description_en si le tableau les a, sinon le dictionnaire de i18n.js
        const nom = (I18N.en && (l.categorie_en || "").trim()) || t((l.categorie || "").trim() || "Autres");
        l._fr = I18N.en && !(l.description_en || "").trim();  // description restée en français
        if (I18N.en && !l._fr) l.description = l.description_en.trim();
        let g = groupes.find((x) => x.nom === nom);
        if (!g) groupes.push((g = { nom, liens: [] }));
        g.liens.push(l);
      });
      $("#compte").textContent = "";
      $("#sommaire").innerHTML = groupes.map((g) => `<a href="#${ancre(g.nom)}">${echapper(g.nom)} <span>${g.liens.length}</span></a>`).join("");
      $("#liens").innerHTML = groupes.map((g) => `
        <section class="liens-groupe" id="${ancre(g.nom)}" aria-label="${echapper(g.nom)}">
          <h2>${echapper(g.nom)}</h2>
          <ul class="liens-liste">${g.liens.map((l) => `
            <li>
              <a href="${echapper(l.url)}" target="_blank" rel="noopener"${l.langue && l.langue !== "français" ? ` hreflang="${{ anglais: "en", italien: "it", néerlandais: "nl", allemand: "de", espagnol: "es" }[l.langue] || ""}"` : ""}>${echapper(l.nom)}</a>
              <span class="liens-domaine">${echapper(domaine(l.url))}</span>
              ${l.description ? `<p${l._fr ? ' lang="fr"' : ""}>${echapper(l.description)}</p>` : ""}
            </li>`).join("")}
          </ul>
        </section>`).join("");
      if (!liens.length) $("#compte").textContent = pluriel(0, "lien");
    })
    .catch((e) => {
      $("#compte").textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });
})();
