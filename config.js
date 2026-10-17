// Réglages du site.
window.CONFIG = {
  // identifiant du tableau Google Sheets des publications : la partie entre /d/ et /edit de son adresse
  // (vide : le site lit donnees/publications.csv)
  tableau: "17bUrP_chpuZXRbxyL96DIlUFHj47GjZQdmftGOaZ0JU",
  // périodes affichées au-dessus du graphique (« a » vide : jusqu'à aujourd'hui)
  periodes: [
    { de: 1985, a: 1995, nom: "Transplantation hépatique" },
    { de: 1996, a: 2010, nom: "Analgésie, anesthésie locorégionale" },
    { de: 2011, a: 2021, nom: "Études européennes" },
    { de: 2022, a: null, nom: "Recommandations" },
  ],
};
