// Page Maladies rares : explorateur complet des ~3 500 fiches de la base UCLouvain (MRP / MRP_ENG).
(function () {
  "use strict";

  const { $, sansAccents, echapper, surligner, pluriel } = FV;
  const { t, valeur, en } = I18N;

  const BASE = en ? "https://sites.uclouvain.be/anesthweekly/MRP_ENG/?" : "https://sites.uclouvain.be/anesthweekly/MRP/?";
  const LANG = en ? "en" : "fr";
  const PAS = 120;

  const FAMILLE_CAT = {
    "Voies aériennes": "article",
    "Neuromusculaire": "cas",
    "Métabolique & endocrinien": "lettre",
    "Cardiopathie & vasculaire": "cas",
    "Hématologie & immunité": "revue",
    "Squelette & tissus conjonctifs": "livre",
    "Dermatologie & muqueuses": "lettre",
    "Neurologie & épilepsie": "autre",
    "Rein, foie & digestif": "article",
    "Syndrome malformatif": "revue",
  };

  const champ = $("#mr-recherche");
  const selectCat = $("#mr-categorie");
  const zoneLettres = $("#mr-lettres");
  const compte = $("#mr-compte");
  const grille = $("#mr-fiches");
  const zonePlus = $("#mr-plus");

  let fiches = [];
  let lettreChoisie = "";
  let limite = PAS;

  function lettreInitiale(titre) {
    const m = /[a-zA-Z]/.exec(sansAccents(titre));
    return m ? m[0].toUpperCase() : "#";
  }

  fetch("donnees/maladies_rares.csv", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("erreur " + r.status);
      return r.text();
    })
    .then((texte) => {
      fiches = Papa.parse(texte, { header: true, skipEmptyLines: true }).data
        .filter((f) => f.langue === LANG && f.slug && f.titre)
        .map((f) => {
          const cat = f.categorie || "Syndrome malformatif";
          const catTrad = valeur(cat);
          const lettre = lettreInitiale(f.titre);
          return {
            slug: f.slug,
            titre: f.titre,
            categorie: cat,
            catTrad,
            famille: FAMILLE_CAT[cat] || "autre",
            lettre,
            _texte: sansAccents(f.titre + " " + cat + " " + catTrad),
          };
        });
      remplirCategories();
      dessinerLettres();
      afficher();
    })
    .catch((e) => {
      compte.textContent = t("La liste n'a pas pu être chargée ({e}).", { e: e.message });
    });

  function remplirCategories() {
    const nb = {};
    fiches.forEach((f) => (nb[f.categorie] = (nb[f.categorie] || 0) + 1));
    Object.keys(nb)
      .sort((a, b) => nb[b] - nb[a])
      .forEach((cat) => selectCat.add(new Option(`${valeur(cat)} (${nb[cat]})`, cat)));
  }

  function dessinerLettres() {
    const presentes = new Set(fiches.map((f) => f.lettre));
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    zoneLettres.innerHTML =
      `<button type="button" class="mr-lettre" data-lettre="" aria-pressed="${lettreChoisie === ""}">${echapper(t("Tous"))}</button>` +
      alphabet.map((l) => `<button type="button" class="mr-lettre" data-lettre="${l}" aria-pressed="${lettreChoisie === l}" ${presentes.has(l) ? "" : "disabled"}>${l}</button>`).join("");
  }

  function filtrer() {
    const mots = sansAccents(champ.value).split(/\s+/).filter(Boolean);
    const cat = selectCat.value;
    return fiches.filter((f) =>
      (!lettreChoisie || f.lettre === lettreChoisie) &&
      (!cat || f.categorie === cat) &&
      mots.every((m) => f._texte.includes(m))
    );
  }

  function afficher() {
    const liste = filtrer();
    const q = champ.value.trim();
    const motsBruts = q ? q.split(/\s+/) : [];

    document.querySelectorAll("#mr-lettres .mr-lettre").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lettre === lettreChoisie)));

    compte.textContent = liste.length === fiches.length
      ? pluriel(fiches.length, "fiche")
      : t("{n} sur {total}", { n: liste.length, total: fiches.length });

    if (!liste.length) {
      grille.innerHTML = `<p class="vide">${echapper(t("Rien ne correspond."))}</p>`;
      zonePlus.hidden = true;
      return;
    }

    const visibles = liste.slice(0, limite);
    grille.innerHTML = visibles.map((f) => `
      <a class="mr-fiche" href="${echapper(BASE + f.slug)}" target="_blank" rel="noopener">
        <span class="mr-fiche-titre">${surligner(f.titre, motsBruts)}</span>
        <span class="mr-fiche-meta">
          <span class="pastille ${f.famille}">${echapper(f.catTrad)}</span>
          <span class="mr-fleche" aria-hidden="true">↗</span>
        </span>
      </a>`).join("");

    if (liste.length > limite) {
      const reste = liste.length - limite;
      zonePlus.hidden = false;
      zonePlus.innerHTML = `<button type="button" class="mr-btn-plus">${echapper(t("Afficher la suite ({n} restantes)", { n: reste }))}</button>`;
    } else {
      zonePlus.hidden = true;
    }
  }

  zoneLettres.addEventListener("click", (e) => {
    const b = e.target.closest(".mr-lettre");
    if (!b || b.disabled) return;
    lettreChoisie = lettreChoisie === b.dataset.lettre ? "" : b.dataset.lettre;
    limite = PAS;
    afficher();
  });

  selectCat.addEventListener("change", () => {
    limite = PAS;
    afficher();
  });

  zonePlus.addEventListener("click", (e) => {
    if (e.target.closest(".mr-btn-plus")) {
      limite += PAS * 2;
      afficher();
    }
  });

  let attente;
  champ.addEventListener("input", () => {
    limite = PAS;
    clearTimeout(attente);
    attente = setTimeout(afficher, 100);
  });
})();
