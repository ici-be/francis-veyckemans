// Réglages du site.
window.CONFIG = {
  // identifiant du tableau Google Sheets des publications : la partie entre /d/ et /edit de son adresse
  // (vide : le site lit donnees/publications.csv)
  tableau: "17bUrP_chpuZXRbxyL96DIlUFHj47GjZQdmftGOaZ0JU",
  // numéro (gid) de l'onglet « Conférences » du même tableau (vide : le site lit donnees/conferences.csv)
  conferences: "1224804362",
  // numéro (gid) de l'onglet « Médias » (vidéos et podcasts) ; vide : le site lit donnees/medias.csv
  medias: "1310307743",
  // numéro (gid) de l'onglet « Liens » ; vide : le site lit donnees/liens.csv
  liens: "1944676543",
  // types de l'onglet « Conférences » à ne pas afficher sur le site (ils restent dans le tableau)
  typesConferencesCaches: ["poster"],
  // périodes affichées au-dessus du graphique (« a » vide : jusqu'à aujourd'hui ; nom_en : nom sur le site en anglais)
  periodes: [
    { de: 1985, a: 1995, nom: "Transplantation hépatique", nom_en: "Liver transplantation" },
    { de: 1996, a: 2010, nom: "Analgésie, anesthésie locorégionale", nom_en: "Analgesia, regional anaesthesia" },
    { de: 2011, a: 2021, nom: "Études européennes", nom_en: "European studies" },
    { de: 2022, a: null, nom: "Recommandations", nom_en: "Guidelines" },
  ],
};
