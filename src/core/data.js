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

// L'arbre est organisé en 4 branches (colonnes de l'interface).
export const TECHS = {
  plongee: { name: 'Plongée', tier: 1, req: null, branch: 0, desc: 'Récolter les lits de nacre.' },
  guet: { name: 'Guet', tier: 2, req: 'plongee', branch: 0, desc: 'Débloque le Guetteur.' },
  pillage: { name: 'Pillage', tier: 1, req: null, branch: 1, desc: 'Fouiller les épaves échouées.' },
  archeologie: { name: 'Archéologie interdite', tier: 2, req: 'pillage', branch: 1, desc: 'Exhumer les reliques des falaises.' },
  navigation: { name: 'Navigation', tier: 1, req: null, branch: 2, desc: 'Embarquer depuis une cité vers les hauts-fonds.' },
  abysses: { name: 'Abysses', tier: 2, req: 'navigation', branch: 2, desc: 'Naviguer au-dessus des eaux profondes.' },
  navires: { name: 'Navires noirs', tier: 3, req: 'abysses', branch: 2, desc: 'Transformer ses barques en navires de guerre.' },
  harpons: { name: 'Harpons', tier: 1, req: null, branch: 3, desc: 'Débloque le Harponneur.' },
  rites: { name: 'Rites des profondeurs', tier: 2, req: 'harpons', branch: 3, desc: 'Débloque le Gardien.' },
  mortiers: { name: 'Mortiers rituels', tier: 3, req: 'rites', branch: 3, desc: 'Débloque le Mortier rituel.' },
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
