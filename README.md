# 🏴‍☠️ Archipel — La Guerre des Pavillons

Jeu de stratégie au tour par tour dans le navigateur, inspiré de *The Battle of Polytopia*, sur un archipel pirate généré procéduralement.
Explore les îles, capture les repaires, fais grandir tes ports, apprends à naviguer et coule les flottes rivales.

Tous les graphismes sont dessinés en code (Canvas 2D isométrique) : aucune image ni dépendance au runtime.

## Lancer le jeu

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script            | Rôle                                         |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | serveur de développement Vite                |
| `npm run build`   | build de production statique dans `dist/`    |
| `npm run preview` | sert le build de production                  |
| `npm test`        | tests des règles (`node:test`, sans DOM)     |

Le dossier `dist/` est un site statique : il se déploie tel quel sur GitHub Pages, Netlify, Vercel ou itch.io.

## Règles en bref

- **Doublons** : chaque port rapporte son niveau en doublons par tour (+1 pour la capitale).
- **Exploration** : la brume se dissipe autour de tes unités et de tes ports.
- **Capture** : amène une unité sur un repaire (ou un port ennemi), attends le tour suivant sans bouger, puis « Capturer ».
- **Croissance** : récolte poissons, cocotiers et filons d'or dans ton territoire. Niveau 2 : +4 doublons ; niveau 3 : territoire agrandi.
- **Combat** : la force dépend des PV restants ; forêts, montagnes et ports donnent un bonus de défense ; le défenseur riposte s'il survit et a la portée.
- **Mer** : avec *Navigation*, une unité embarque depuis un port et devient une chaloupe ; *Haute mer* ouvre les eaux profondes, *Galions* permet d'améliorer les navires.
- **Victoire** : être le dernier pavillon debout, ou avoir le meilleur score au tour 30.

| Unité     | PV | Att | Déf | Mvt | Portée | Coût | Technologie |
| --------- | -- | --- | --- | --- | ------ | ---- | ----------- |
| Matelot   | 10 | 2   | 2   | 1   | 1      | 2    | —           |
| Éclaireur | 10 | 1   | 1   | 2   | 1      | 3    | Cartographie |
| Boucanier | 10 | 2   | 1   | 1   | 2      | 3    | Mousquets   |
| Bretteur  | 15 | 3   | 3   | 1   | 1      | 5    | Escrime     |
| Canonnier | 10 | 4   | 0   | 1   | 3      | 8    | Artillerie  |
| Chaloupe  | —  | 1   | 1   | 2   | 2      | —    | Navigation  |
| Galion    | —  | 4   | 3   | 3   | 2      | 8    | Galions     |

**Contrôles** : clic pour sélectionner / se déplacer / attaquer · glisser pour déplacer la carte · molette ou pincement pour zoomer · `Entrée` fin du tour · `T` technologies · `Tab` unité suivante · `Échap` désélectionner.

## Architecture

```
src/
├── core/            # logique pure, testable sous Node
│   ├── data.js      # factions, unités, technologies, équilibrage
│   ├── map.js       # génération procédurale de l'archipel
│   ├── game.js      # moteur de règles (déplacements, combat, économie, tours)
│   ├── ai.js        # IA (générateur : une action par yield, pour l'animer)
│   └── rng.js       # aléatoire déterministe à graine
├── render/
│   ├── iso.js       # projection isométrique et caméra
│   ├── sprites.js   # tous les visuels dessinés au canvas
│   └── renderer.js  # boucle de rendu, profondeur, animations
├── ui/hud.js        # sélection, panneaux, arbre technologique, messages
├── main.js          # écran titre, entrées, enchaînement des tours
└── style.css        # thème parchemin & bois
tests/game.test.js
```

Le moteur (`core/`) ne touche jamais au DOM : il émet des événements (`move`, `attack`, `capture`…) que le rendu et l'interface écoutent. Ça permet de le tester seul et, plus tard, de le faire tourner côté serveur pour du multijoueur.

## Pistes pour la suite

- Multijoueur en ligne (serveur Node + WebSocket qui fait tourner `core/` et diffuse les actions)
- Sauvegarde de partie (localStorage), bâtiments (tavernes, chantiers navals), sons et musique
- Merveilles, monstres marins (kraken !), météo et tempêtes
