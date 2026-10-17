// Page Maladies rares : explorateur rapide, index A–Z et fiches-repères des syndromes emblématiques.
(function () {
  "use strict";

  const { $, sansAccents, echapper, surligner } = FV;
  const { t, en } = I18N;

  const BASE_FR = "https://sites.uclouvain.be/anesthweekly/MRP/?";
  const BASE_EN = "https://sites.uclouvain.be/anesthweekly/MRP_ENG/?";

  // Fiches-repères emblématiques avec leurs identifiants exacts dans FHTocTab.js (UCLouvain)
  const SYNDROMES = [
    {
      lettre: "A",
      nom: "Achondroplasie",
      nom_en: "Achondroplasia",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "Achondroplasie",
      q: "achondroplas",
      points: [
        "Sténose du trou occipital : éviter toute hyperextension cervicale",
        "Dysplasie faciale et macroglossie : vidéolaryngoscopie recommandée",
        "Anesthésie périmédullaire techniquement délicate (canal lombaire étroit)",
      ],
      points_en: [
        "Foramen magnum stenosis: avoid cervical hyperextension",
        "Midface hypoplasia and macroglossia: videolaryngoscopy recommended",
        "Neuraxial anaesthesia technically challenging (narrow spinal canal)",
      ],
    },
    {
      lettre: "A",
      nom: "Syndrome d'Apert",
      nom_en: "Apert syndrome",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "ApertSyndromeD",
      q: "apert",
      points: [
        "Craniosténose syndromique avec hypoplasie médio-faciale et sténose choanale",
        "Apnées obstructives du sommeil fréquentes : prudence avec les morphiniques",
        "Accès veineux périphérique difficile en cas de syndactylie sévère",
      ],
      points_en: [
        "Syndromic craniosynostosis with midface hypoplasia and choanal stenosis",
        "Frequent obstructive sleep apnoea: titrate opioids carefully",
        "Difficult peripheral venous access due to severe syndactyly",
      ],
    },
    {
      lettre: "B",
      nom: "Syndrome de Beckwith-Wiedemann",
      nom_en: "Beckwith-Wiedemann syndrome",
      domaine: "Métabolique & voies aériennes",
      famille: "lettre",
      slug: "Beckwith-WiedemannSyndromeDe",
      q: "beckwith",
      points: [
        "Macroglossie majeure : préparer le matériel d'intubation difficile",
        "Risque d'hypoglycémie néonatale par hyperinsulinisme : contrôle glycémique horaire",
        "Surveillance des tumeurs embryonnaires (néphroblastome, hépatoblastome)",
      ],
      points_en: [
        "Severe macroglossia: prepare difficult airway equipment",
        "Neonatal hypoglycaemia risk (hyperinsulinism): hourly glucose monitoring",
        "Associated embryonal tumours (Wilms tumour, hepatoblastoma)",
      ],
    },
    {
      lettre: "B",
      nom: "Syndrome de Brugada",
      nom_en: "Brugada syndrome",
      domaine: "Cardiopathie & tissus conjonctifs",
      famille: "cas",
      slug: "BrugadaSyndromeDe",
      q: "brugada",
      points: [
        "Canalopathie sodique à haut risque de fibrillation ventriculaire périopératoire",
        "Éviter les perfusions prolongées de propofol et les anesthésiques locaux à fortes doses",
        "Corriger agressivement la fièvre et les troubles électrolytiques ; défibrillateur en salle",
      ],
      points_en: [
        "Sodium channelopathy with high risk of perioperative ventricular fibrillation",
        "Avoid prolonged propofol infusions and high-dose local anaesthetics",
        "Treat fever and electrolyte disturbances promptly; keep defibrillator ready",
      ],
    },
    {
      lettre: "C",
      nom: "Syndrome CHARGE",
      nom_en: "CHARGE syndrome",
      domaine: "Syndromes malformatifs",
      famille: "revue",
      slug: "CHARGESyndromeOuAssociation",
      q: "charge",
      points: [
        "Atrésie des choanes, micrognathie et laryngomalacie : intubation souvent complexe",
        "Cardiopathie congénitale associée (tétralogie de Fallot, arc aortique) à bilanter",
        "Troubles de la déglutition et reflux : risque élevé d'inhalation à l'extubation",
      ],
      points_en: [
        "Choanal atresia, micrognathia and laryngomalacia: challenging airway management",
        "Frequent congenital heart defects (Fallot, aortic arch anomalies)",
        "Swallowing dysfunction and reflux: high aspiration risk at extubation",
      ],
    },
    {
      lettre: "D",
      nom: "Dystrophie musculaire de Duchenne",
      nom_en: "Duchenne muscular dystrophy",
      domaine: "Neuromusculaire",
      famille: "cas",
      slug: "DuchenneDystrophieMusculaireDe",
      q: "duchenne",
      points: [
        "Succinylcholine formellement contre-indiquée (rhabdomyolyse, arrêt hyperkaliémique)",
        "Halogénés déconseillés (risque de rhabdomyolyse induite par l'anesthésie) : privilégier la TIVA",
        "Évaluation échocardiographique et respiratoire préopératoire indispensable",
      ],
      points_en: [
        "Succinylcholine strictly contraindicated (rhabdomyolysis, hyperkalaemic arrest)",
        "Avoid volatile agents (anaesthesia-induced rhabdomyolysis): prefer TIVA",
        "Mandatory preoperative echocardiographic and respiratory evaluation",
      ],
    },
    {
      lettre: "D",
      nom: "Syndrome de DiGeorge (22q11.2)",
      nom_en: "DiGeorge syndrome (22q11.2)",
      domaine: "Cardiopathie & tissus conjonctifs",
      famille: "revue",
      slug: "DiGeorgeSyndromeDe",
      q: "digeorge",
      points: [
        "Cardiopathies conotroncales fréquentes et hypocalcémie par hypoparathyroïdie",
        "Micrognathie, fente vélo-palatine et trachéomalacie : sonde de calibre adapté",
        "Déficit immunitaire T : produits sanguins irradiés en cas de transfusion",
      ],
      points_en: [
        "Conotruncal cardiac defects and hypocalcaemia from hypoparathyroidism",
        "Micrognathia, velopharyngeal insufficiency and tracheomalacia",
        "T-cell immunodeficiency: use irradiated blood products if transfusion needed",
      ],
    },
    {
      lettre: "E",
      nom: "Épidermolyses bulleuses",
      nom_en: "Epidermolysis bullosa",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "EpidermolyseBulleuseDermolytique",
      q: "epidermolys",
      points: [
        "Aucun adhésif sur la peau ou les muqueuses : pansements siliconés et lubrification",
        "Cisaillement minimal lors de la ventilation au masque et de la laryngoscopie",
        "Protection oculaire soigneuse et capitonnage complet des points d'appui",
      ],
      points_en: [
        "No adhesive tape on skin or mucosa: use silicone dressings and lubrication",
        "Avoid friction/shearing forces during mask ventilation and laryngoscopy",
        "Careful ocular lubrication and padding of all pressure points",
      ],
    },
    {
      lettre: "G",
      nom: "Syndrome de Goldenhar",
      nom_en: "Goldenhar syndrome",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "GoldenharSyndromeDe",
      q: "goldenhar",
      points: [
        "Microsomie hémifaciale asymétrique : ventilation au masque et exposition glottique difficiles",
        "Anomalies rachidiennes cervicales (hémivertèbres, fusions) : limiter la mobilisation",
        "Intubation fibroscopique ou par vidéolaryngoscope en ventilation spontanée",
      ],
      points_en: [
        "Asymmetric hemifacial microsomia: difficult mask seal and glottic exposure",
        "Cervical spine anomalies (hemivertebrae, fusions): limit neck manipulation",
        "Fibreoptic or videolaryngoscopic intubation maintaining spontaneous ventilation",
      ],
    },
    {
      lettre: "H",
      nom: "Hyperthermie maligne",
      nom_en: "Malignant hyperthermia",
      domaine: "Urgence métabolique",
      famille: "cas",
      slug: "HyperthermieMaligne",
      q: "malignant hyperthermia",
      points: [
        "Proscrire tous les halogénés et la succinylcholine ; préparer le respirateur (filtres à charbon)",
        "Anesthésie intraveineuse totale (TIVA) et anesthésie locorégionale sûres",
        "Stock de dantrolène immédiatement disponible et monitorage continu de l'EtCO₂ / température",
      ],
      points_en: [
        "Strictly avoid all volatile anaesthetics and succinylcholine; prepare workstation (charcoal filters)",
        "Total intravenous anaesthesia (TIVA) and regional blocks are safe",
        "Immediate availability of dantrolene and continuous EtCO₂ / core temperature monitoring",
      ],
    },
    {
      lettre: "K",
      nom: "Syndrome de Klippel-Feil",
      nom_en: "Klippel-Feil syndrome",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "Klippel-FeilSyndromeDe",
      q: "klippel",
      points: [
        "Fusion congénitale des vertèbres cervicales : raideur majeure et risque d'instabilité",
        "Proscrire la laryngoscopie directe en hyperextension ; privilégier vidéo ou fibroscopie",
        "Rechercher les malformations cardiaques, rénales et auditives associées",
      ],
      points_en: [
        "Congenital cervical vertebral fusion: severe neck stiffness and instability risk",
        "Avoid neck extension during direct laryngoscopy; use videolaryngoscopy or fibreoptic",
        "Screen for associated cardiac, renal and auditory anomalies",
      ],
    },
    {
      lettre: "M",
      nom: "Mucopolysaccharidoses (Hurler, Hunter…)",
      nom_en: "Mucopolysaccharidoses (Hurler, Hunter…)",
      domaine: "Métabolique & voies aériennes",
      famille: "lettre",
      slug: "Mucopolysaccharidoses",
      q: "mucopolysacchar",
      points: [
        "Risque vital d'obstruction des voies aériennes : infiltration glottique et sous-glottique",
        "Instabilité atlanto-axiale fréquente (notamment Morquio) : maintien en position neutre",
        "Atteinte valvulaire et coronarienne possible : confier à une équipe expérimentée",
      ],
      points_en: [
        "High-risk airway: progressive supraglottic and tracheobronchial infiltration",
        "Atlantoaxial instability (especially Morquio): keep neck in neutral position",
        "Valvular and coronary involvement: manage in a specialized paediatric centre",
      ],
    },
    {
      lettre: "M",
      nom: "Syndrome de Marfan",
      nom_en: "Marfan syndrome",
      domaine: "Cardiopathie & tissus conjonctifs",
      famille: "revue",
      slug: "MarfanSyndromeOuMaladieDe",
      q: "marfan",
      points: [
        "Dilatation de la racine aortique et prolapsus mitral : éviter tout pic hypertensif",
        "Risque de pneumothorax spontané : limiter les pressions d'insufflation",
        "Hyperlaxité articulaire (temporo-mandibulaire et cervicale) : positionnement doux",
      ],
      points_en: [
        "Aortic root dilatation and mitral prolapse: prevent haemodynamic surges",
        "Risk of spontaneous pneumothorax: avoid high peak airway pressures",
        "Joint laxity (temporomandibular and cervical): gentle positioning",
      ],
    },
    {
      lettre: "M",
      nom: "Cytopathies mitochondriales",
      nom_en: "Mitochondrial cytopathies",
      domaine: "Urgence métabolique",
      famille: "lettre",
      slug: "CytopathiesMitochondriales",
      q: "mitochondri",
      points: [
        "Jeûne préopératoire court avec perfusion glucosée normotonique sans lactate",
        "Éviter les perfusions prolongées de propofol (inhibition de la chaîne respiratoire)",
        "Surveillance étroite de la lactatémie, de la glycémie et de la normothermie",
      ],
      points_en: [
        "Minimize fasting time; maintain normoglycaemia with lactate-free solutions",
        "Avoid prolonged propofol infusions (respiratory chain inhibition)",
        "Close monitoring of blood lactate, glucose and core temperature",
      ],
    },
    {
      lettre: "N",
      nom: "Syndrome de Noonan",
      nom_en: "Noonan syndrome",
      domaine: "Cardiopathie & tissus conjonctifs",
      famille: "revue",
      slug: "NoonanSyndromeDe",
      q: "noonan",
      points: [
        "Sténose pulmonaire ou cardiomyopathie hypertrophique : maintien de la précharge",
        "Anomalies fréquentes de l'hémostase (déficit en facteur XI, maladie de Willebrand)",
        "Cou court palmé et micrognathie pouvant compliquer l'exposition laryngée",
      ],
      points_en: [
        "Pulmonary stenosis or hypertrophic cardiomyopathy: maintain preload and afterload",
        "Frequent bleeding diathesis (factor XI deficiency, von Willebrand disease)",
        "Short webbed neck and micrognathia may complicate laryngoscopy",
      ],
    },
    {
      lettre: "P",
      nom: "Séquence de Pierre Robin",
      nom_en: "Pierre Robin sequence",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "Pierre-RobinSyndromeOuSequenceDe",
      q: "pierre robin",
      points: [
        "Triade rétrognathie, glossoptose et obstruction inspiratoire : décubitus latéral ou ventral",
        "Maintenir la ventilation spontanée à l'induction ; masque laryngé en relais ou guidage",
        "Surveillance postopératoire prolongée (apnées obstructives et hypersensibilité aux opioïdes)",
      ],
      points_en: [
        "Retrognathia, glossoptosis and airway obstruction: lateral or prone positioning helps",
        "Preserve spontaneous ventilation during induction; supraglottic airway as conduit",
        "Extended postoperative monitoring (obstructive apnoea and opioid sensitivity)",
      ],
    },
    {
      lettre: "P",
      nom: "Syndrome de Prader-Willi",
      nom_en: "Prader-Willi syndrome",
      domaine: "Métabolique & voies aériennes",
      famille: "lettre",
      slug: "Prader-WilliSyndromeDe",
      q: "prader",
      points: [
        "Hypotonie néonatale sévère évoluant vers une obésité morbide et un SAOS dans l'enfance",
        "Hyperphagie et retard de vidange gastrique : considérer l'estomac plein",
        "Troubles de la thermorégulation et réponse ventilatoire émoussée à l'hypercapnie",
      ],
      points_en: [
        "Severe neonatal hypotonia progressing to childhood obesity and OSA",
        "Hyperphagia and delayed gastric emptying: consider full-stomach precautions",
        "Thermoregulatory disturbances and blunted ventilatory response to hypercapnia",
      ],
    },
    {
      lettre: "S",
      nom: "Myotonie de Steinert (DM1)",
      nom_en: "Steinert myotonic dystrophy (DM1)",
      domaine: "Neuromusculaire",
      famille: "cas",
      slug: "MyotonieDeSteinert",
      q: "myotoni",
      points: [
        "Succinylcholine contre-indiquée (contracture myotonique généralisée empêchant la ventilation)",
        "Prévenir les facteurs déclenchants de crise myotonique : hypothermie, frissons, bistouri électrique",
        "Grande sensibilité aux hypnotiques et morphiniques ; risque de troubles de conduction cardiaque",
      ],
      points_en: [
        "Succinylcholine contraindicated (generalized myotonic spasm preventing ventilation)",
        "Prevent triggers of myotonic crisis: hypothermia, shivering, electrocautery",
        "Extreme sensitivity to sedatives and opioids; risk of cardiac conduction block",
      ],
    },
    {
      lettre: "T",
      nom: "Syndrome de Treacher-Collins",
      nom_en: "Treacher-Collins syndrome",
      domaine: "Voies aériennes",
      famille: "article",
      slug: "Treacher-CollinsSyndromeDe",
      q: "treacher",
      points: [
        "Dysostose mandibulo-faciale sévère : l'intubation tend à devenir plus difficile avec l'âge",
        "Prévoir un masque laryngé d'intubation, un vidéolaryngoscope ou un fibroscope souple",
        "Extubation sur enfant parfaitement réveillé avec matériel de réintubation prêt",
      ],
      points_en: [
        "Severe mandibulofacial dysostosis: airway difficulty often worsens with age",
        "Prepare intubating supraglottic airway, videolaryngoscope or flexible bronchoscope",
        "Extubate fully awake with difficult airway cart immediately available",
      ],
    },
    {
      lettre: "W",
      nom: "Syndrome de Williams-Beuren",
      nom_en: "Williams-Beuren syndrome",
      domaine: "Cardiopathie & tissus conjonctifs",
      famille: "cas",
      slug: "Williams-BeurensSyndromeDe",
      q: "williams",
      points: [
        "Sténose aortique supravalvulaire et sténoses coronariennes : risque élevé d'ischémie et d'arrêt",
        "Maintenir impérativement la pression de perfusion coronarienne (éviter hypotension et tachycardie)",
        "Préparation psychologique et prémédication titrée chez ces enfants souvent anxieux",
      ],
      points_en: [
        "Supravalvular aortic stenosis and coronary ostial stenosis: high risk of myocardial ischaemia",
        "Strictly maintain coronary perfusion pressure (avoid hypotension and tachycardia)",
        "Careful anxiolysis and titrated induction in specialized paediatric environment",
      ],
    },
  ];

  const champ = $("#mr-recherche");
  const zoneLettres = $("#mr-lettres");
  const grille = $("#mr-fiches");
  const lienRecherche = $("#mr-lien-recherche");
  let lettreChoisie = "";

  const lettresDispo = [...new Set(SYNDROMES.map((s) => s.lettre))].sort();

  function dessinerLettres() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    zoneLettres.innerHTML = `<button type="button" class="mr-lettre" data-lettre="" aria-pressed="${lettreChoisie === ""}">${echapper(t("Tous"))}</button>` +
      alphabet.map((l) => {
        const dispo = lettresDispo.includes(l);
        return `<button type="button" class="mr-lettre" data-lettre="${l}" aria-pressed="${lettreChoisie === l}" ${dispo ? "" : "disabled"}>${l}</button>`;
      }).join("");
  }

  function afficher() {
    const q = champ.value.trim();
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    const liste = SYNDROMES.filter((s) => {
      if (lettreChoisie && s.lettre !== lettreChoisie) return false;
      if (!mots.length) return true;
      const txt = sansAccents([s.nom, s.nom_en, s.domaine, t(s.domaine), s.q, ...s.points, ...s.points_en].join(" "));
      return mots.every((m) => txt.includes(m));
    });

    document.querySelectorAll("#mr-lettres .mr-lettre").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lettre === lettreChoisie)));

    const motsBruts = q.split(/\s+/).filter(Boolean);
    grille.innerHTML = liste.map((s) => {
      const titre = en ? s.nom_en : s.nom;
      const points = en ? s.points_en : s.points;
      const urlUCL = (en ? BASE_EN : BASE_FR) + s.slug;
      const labelUCL = en ? t("Fiche UCLouvain (EN) ↗") : t("Fiche UCLouvain (FR) ↗");
      return `<article class="mr-fiche cadre">
        <div class="mr-fiche-tete">
          <h3 class="mr-fiche-titre">${surligner(titre, motsBruts)}</h3>
          <span class="pastille ${s.famille}">${echapper(t(s.domaine))}</span>
        </div>
        <ul class="mr-points">
          ${points.map((pt) => `<li>${surligner(pt, motsBruts)}</li>`).join("")}
        </ul>
        <div class="mr-fiche-liens">
          <a class="mr-btn-ucl" href="${echapper(urlUCL)}" target="_blank" rel="noopener">${echapper(labelUCL)}</a>
          <a class="mr-btn-site" href="${I18N.lien("./?q=" + encodeURIComponent(s.q))}">${echapper(t("Publications & conférences sur ce syndrome →"))}</a>
        </div>
      </article>`;
    }).join("");

    if (q) {
      lienRecherche.hidden = false;
      lienRecherche.innerHTML = `
        <a href="${I18N.lien("./?q=" + encodeURIComponent(q))}">${echapper(t("Chercher « {q} » dans les publications →", { q }))}</a>
        <span>·</span>
        <a href="${en ? "https://sites.uclouvain.be/anesthweekly/MRP_ENG/" : "https://sites.uclouvain.be/anesthweekly/MRP/"}" target="_blank" rel="noopener">${echapper(t("Ouvrir l'index alphabétique complet sur UCLouvain ↗"))}</a>`;
    } else {
      lienRecherche.hidden = true;
    }
  }

  zoneLettres.addEventListener("click", (e) => {
    const b = e.target.closest(".mr-lettre");
    if (!b || b.disabled) return;
    lettreChoisie = lettreChoisie === b.dataset.lettre ? "" : b.dataset.lettre;
    afficher();
  });

  let attente;
  champ.addEventListener("input", () => {
    if (champ.value.trim()) lettreChoisie = "";
    clearTimeout(attente);
    attente = setTimeout(afficher, 100);
  });

  dessinerLettres();
  afficher();
})();
