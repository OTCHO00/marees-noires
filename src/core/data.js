// Données de jeu : factions, unités, navires, ressources et technologies.
// Tout l'équilibrage se règle ici.

export const FACTIONS = [
  { id: 0, name: 'Corsaires Écarlates', short: 'Écarlates', color: '#d2412f', dark: '#7d1d12', light: '#f39a8a' },
  { id: 1, name: "Flibustiers d'Azur", short: 'Azur', color: '#2f7fd2', dark: '#173f6b', light: '#9cc8f3' },
  { id: 2, name: "Boucaniers d'Émeraude", short: 'Émeraude', color: '#2fa865', dark: '#145232', light: '#97e0b5' },
  { id: 3, name: "Confrérie de l'Or", short: 'Or', color: '#e0a21f', dark: '#7a5308', light: '#f5d68b' },
];

export const UNITS = {
  matelot: {
    name: 'Matelot', hp: 10, atk: 2, def: 2, move: 1, range: 1, cost: 2, tech: null,
    desc: 'Le loup de mer de base, sabre au clair.',
  },
  eclaireur: {
    name: 'Éclaireur', hp: 10, atk: 1, def: 1, move: 2, range: 1, cost: 3, tech: 'cartographie',
    desc: 'Rapide, longue-vue en main. Idéal pour explorer.',
  },
  boucanier: {
    name: 'Boucanier', hp: 10, atk: 2, def: 1, move: 1, range: 2, cost: 3, tech: 'mousquets',
    desc: 'Tire au mousquet à 2 cases.',
  },
  bretteur: {
    name: 'Bretteur', hp: 15, atk: 3, def: 3, move: 1, range: 1, cost: 5, tech: 'escrime',
    desc: 'Duelliste robuste, redoutable au corps à corps.',
  },
  canonnier: {
    name: 'Canonnier', hp: 10, atk: 4, def: 0, move: 1, range: 3, cost: 8, tech: 'artillerie',
    desc: 'Un canon sur roues. Dévastateur mais fragile.',
  },
};

// Une unité terrestre qui embarque devient un navire : elle garde ses PV
// mais prend les caractéristiques du bateau.
export const VESSELS = {
  chaloupe: { name: 'Chaloupe', atk: 1, def: 1, move: 2, range: 2, deep: false },
  galion: { name: 'Galion', atk: 4, def: 3, move: 3, range: 2, deep: true, cost: 8, tech: 'galions' },
};

export const RESOURCES = {
  fish: { name: 'Banc de poissons', tech: 'peche', cost: 2, pop: 1 },
  fruit: { name: 'Cocotiers', tech: 'cueillette', cost: 2, pop: 1 },
  gold: { name: "Filon d'or", tech: 'prospection', cost: 5, pop: 2 },
};

// L'arbre est organisé en 4 branches (colonnes de l'interface).
export const TECHS = {
  peche: { name: 'Pêche', tier: 1, req: null, branch: 0, desc: 'Récolter les bancs de poissons.' },
  cartographie: { name: 'Cartographie', tier: 2, req: 'peche', branch: 0, desc: "Débloque l'Éclaireur." },
  cueillette: { name: 'Cueillette', tier: 1, req: null, branch: 1, desc: 'Récolter les cocotiers.' },
  prospection: { name: 'Prospection', tier: 2, req: 'cueillette', branch: 1, desc: "Exploiter les filons d'or des montagnes." },
  navigation: { name: 'Navigation', tier: 1, req: null, branch: 2, desc: 'Embarquer depuis un port vers les eaux peu profondes.' },
  hautemer: { name: 'Haute mer', tier: 2, req: 'navigation', branch: 2, desc: 'Naviguer en eaux profondes.' },
  galions: { name: 'Galions', tier: 3, req: 'hautemer', branch: 2, desc: 'Transformer ses chaloupes en puissants galions.' },
  mousquets: { name: 'Mousquets', tier: 1, req: null, branch: 3, desc: 'Débloque le Boucanier.' },
  escrime: { name: 'Escrime', tier: 2, req: 'mousquets', branch: 3, desc: 'Débloque le Bretteur.' },
  artillerie: { name: 'Artillerie', tier: 3, req: 'escrime', branch: 3, desc: 'Débloque le Canonnier.' },
};

export const CITY_NAMES = [
  'Port-Royal', 'Tortuga', 'Nassau', 'Baie des Brumes', 'Crique-aux-Os', 'Havre-Sanglant',
  'Île-Rhum', 'Récif du Kraken', 'Anse Dorée', 'Fort-Corail', 'Port-Sabre', 'Lagune Noire',
  'Roc-Perdu', 'Baie-Tempête', 'Cap Sirène', 'Morne-Écume', 'Pointe-Squelette', 'Havre-Perle',
  'Récif-Maudit', 'Port-Lanterne', 'Île-aux-Mouettes', 'Anse-du-Pendu', 'Fort-Boucan', 'Baie-Saphir',
  'Crique-Fantôme', 'Port-Corsaire', 'Îlot-Tonnerre', 'Anse-aux-Requins',
];

export const RULES = {
  startStars: 5,
  maxTurns: 30,
  combatScale: 4.5,
  defenseBonus: 1.5, // forêt, montagne
  cityDefenseBonus: 1.5,
  healOwn: 4,
  healAway: 2,
  levelTwoBonus: 4, // doublons offerts quand une ville passe niveau 2
};
