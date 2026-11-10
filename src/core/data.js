// Données de jeu : cultes, unités, navires, ressources et savoirs.
// Tout l'équilibrage se règle ici.

// Chaque culte se reconnaît à la couleur de sa lumière.
export const FACTIONS = [
  { id: 0, name: 'Ordre de la Lanterne', short: 'Lanterne', color: '#E8A33D', light: '#F5C26B', sigil: 'lantern' },
  { id: 1, name: 'Enfants du Récif', short: 'Récif', color: '#7FD1B9', light: '#B8EADB', sigil: 'trident' },
  { id: 2, name: 'Cercle de Sang', short: 'Sang', color: '#D9604F', light: '#F08A7C', sigil: 'drop' },
  { id: 3, name: 'Veilleurs Pâles', short: 'Veilleurs', color: '#A99BEF', light: '#CEC6F7', sigil: 'eye' },
];

export const UNITS = {
  acolyte: {
    name: 'Acolyte', hp: 10, atk: 2, def: 2, move: 1, range: 1, cost: 2, tech: null,
    desc: "Il porte la flamme de son culte là où la brume a tout pris.",
  },
  guetteur: {
    name: 'Guetteur', hp: 10, atk: 1, def: 1, move: 2, range: 1, cost: 3, tech: 'guet',
    desc: 'Rapide, longue-vue et lanterne au bout d’une perche. Idéal pour percer la brume.',
  },
  harponneur: {
    name: 'Harponneur', hp: 10, atk: 2, def: 1, move: 1, range: 2, cost: 3, tech: 'harpons',
    desc: 'Lance son harpon à deux cases.',
  },
  gardien: {
    name: 'Gardien', hp: 15, atk: 3, def: 3, move: 1, range: 1, cost: 5, tech: 'rites',
    desc: 'Une chose venue des profondeurs, liée au culte par un pacte.',
  },
  mortier: {
    name: 'Mortier rituel', hp: 10, atk: 4, def: 0, move: 1, range: 3, cost: 8, tech: 'mortiers',
    desc: 'Un mortier de fer gravé de runes. Dévastateur mais fragile.',
  },
};

// Une unité terrestre qui embarque devient un navire : elle garde ses PV
// mais prend les caractéristiques du bateau.
export const VESSELS = {
  barque: { name: 'Barque', atk: 1, def: 1, move: 2, range: 2, deep: false },
  navire: { name: 'Navire noir', atk: 4, def: 3, move: 3, range: 2, deep: true, cost: 8, tech: 'navires' },
};

export const RESOURCES = {
  nacre: { name: 'Lit de nacre', tech: 'plongee', cost: 2, pop: 1 },
  epave: { name: 'Épave échouée', tech: 'pillage', cost: 2, pop: 1 },
  relique: { name: 'Relique', tech: 'archeologie', cost: 5, pop: 2 },
};

// L'arbre compte 5 branches de 4 rangs ; chaque savoir exige le précédent
// de sa branche. `branch` sert à l'affichage en constellations.
export const BRANCHES = [
  { name: 'La Mer', color: '#7FD1B9' },
  { name: 'Les Récoltes', color: '#c9b98a' },
  { name: 'La Guerre', color: '#D9604F' },
  { name: 'La Lumière', color: '#F5C26B' },
  { name: 'La Foi', color: '#A99BEF' },
];

export const TECHS = {
  navigation: { name: 'Navigation', tier: 1, req: null, branch: 0, desc: 'Prendre la mer en barque depuis une cité.' },
  abysses: { name: 'Abysses', tier: 2, req: 'navigation', branch: 0, desc: 'Naviguer au-dessus des eaux profondes.', lore: 'Là où la sonde ne touche plus le fond, quelque chose nous écoute.' },
  navires: { name: 'Navires noirs', tier: 3, req: 'abysses', branch: 0, desc: 'Changer ses barques en vaisseaux-squelettes.' },
  leviathan: { name: 'Léviathan', tier: 4, req: 'navires', branch: 0, desc: 'Un navire noir surgit des abysses près de ta capitale, offert par ce qui dort en dessous.' },
  plongee: { name: 'Plongée', tier: 1, req: null, branch: 1, desc: 'Récolter les lits de nacre.' },
  pillage: { name: 'Pillage', tier: 2, req: 'plongee', branch: 1, desc: 'Fouiller les épaves échouées.' },
  archeologie: { name: 'Archéologie interdite', tier: 3, req: 'pillage', branch: 1, desc: 'Exhumer les reliques des falaises.', lore: 'Certaines pierres n’ont pas été taillées par des mains humaines.' },
  digues: { name: 'Digues', tier: 4, req: 'archeologie', branch: 1, desc: 'La marée ne fait plus sombrer les terres de ton territoire.' },
  harpons: { name: 'Harpons', tier: 1, req: null, branch: 2, desc: 'Débloque le Harponneur.' },
  rites: { name: 'Rites des profondeurs', tier: 2, req: 'harpons', branch: 2, desc: 'Débloque le Gardien, la masse aux mille yeux.', lore: 'Nous l’avons nourri, il nous protège. Pour l’instant.' },
  mortiers: { name: 'Gueules des abysses', tier: 3, req: 'rites', branch: 2, desc: 'Débloque la Gueule-canon.' },
  chant: { name: 'Chant de la Masse', tier: 4, req: 'mortiers', branch: 2, desc: '+1 attaque aux unités qui combattent à côté d’un Gardien.' },
  guet: { name: 'Guet', tier: 1, req: null, branch: 3, desc: 'Débloque le Guetteur sur échasses.', lore: 'Plus haut que la brume, plus loin que la peur.' },
  phares: { name: 'Phares', tier: 2, req: 'guet', branch: 3, desc: 'Tes cités percent la brume jusqu’à 3 cases.' },
  sourdes: { name: 'Lanternes sourdes', tier: 3, req: 'phares', branch: 3, desc: 'Tes unités sont invisibles à l’ennemi, sauf au contact.' },
  oeil: { name: 'Œil de la marée', tier: 4, req: 'sourdes', branch: 3, desc: 'Révèle toute la carte.' },
  liturgie: { name: 'Liturgie', tier: 1, req: null, branch: 4, desc: '+1 huile par tour pour chaque capitale.' },
  processions: { name: 'Processions', tier: 2, req: 'liturgie', branch: 4, desc: 'Veiller soigne 2 PV de plus.', lore: 'Ils marchent en chantant vers la mer, et la mer les guérit.' },
  sacrifice: { name: 'Sacrifice', tier: 3, req: 'processions', branch: 4, desc: 'Sacrifier un fidèle qui n’a pas agi rapporte 5 huile.' },
  eveil: { name: 'Éveil du Dormeur', tier: 4, req: 'sacrifice', branch: 4, cost: 20, desc: 'Victoire immédiate : réveiller ce qui dort sous l’archipel.' },
};

export const CITY_NAMES = [
  'Saint-Ys', 'Phare-Noir', 'Morne-Écume', 'Kerdhu', 'Anse-aux-Noyés', 'Port-Brume',
  'Ys-la-Basse', 'Roc-Hurlant', 'Cloche-Morte', 'Val-Sombre', 'Grève-des-Cierges', 'Lanternoire',
  'Récif-aux-Veilles', 'Pointe-Silence', 'Havre-Sans-Lune', 'Cap-des-Murmures', 'Écueil-Saint-Ombre',
  'Baie-des-Absents', 'Fosse-Marie', 'Port-Livide', 'Îlot-des-Cendres', 'Calvaire-sur-Mer',
  'Goémon-le-Vieux', 'Sainte-Marée', 'Brisant-Noir', 'Fanal-Perdu', 'Les Ossuaires', 'Ker-Abîme',
];

export const RULES = {
  startStars: 5,
  maxTurns: 30,
  combatScale: 4.5,
  defenseBonus: 1.5, // mangrove, falaise
  cityDefenseBonus: 1.5,
  healOwn: 4,
  healAway: 2,
  levelTwoBonus: 4, // huile offerte quand une cité passe niveau 2
  firstTide: 6, // tour de la première marée
  tideEvery: 3, // tours entre deux marées
  sinkStages: 3, // stades avant qu'une île soit engloutie
};
