# Marées noires

Jeu de stratégie au tour par tour dans le navigateur, inspiré de *The Battle of Polytopia*.
Quatre cultes rivaux se disputent un archipel noyé dans la brume, qui s'enfonce dans la mer au fil des marées.
Seules leurs lanternes percent encore la nuit.

Direction artistique « Lanterne & Brume » : silhouettes noires, basalte et eaux sombres. La seule couleur chaude d'un culte est celle de sa lumière.
Tous les visuels sont dessinés en code (Canvas 2D isométrique) : aucune image ni dépendance au runtime.

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

- **Huile** : chaque cité en produit autant que son niveau, par tour (+1 pour la capitale).
- **Brume** : elle ne se lève qu'autour de tes fidèles et de tes cités.
- **Sanctuaires** : amène une unité sur un sanctuaire (ou une cité ennemie), attends le tour suivant sans bouger, puis allume-y le feu de ton culte.
- **Croissance** : récolte nacre, épaves et reliques dans ton territoire. Niveau 2 : +4 huile ; niveau 3 : territoire agrandi.
- **Combat** : la force dépend des PV restants. Mangroves, falaises et cités donnent un bonus de défense. Le défenseur riposte s'il survit et a la portée.
- **Mer** : avec *Navigation*, une unité embarque depuis une cité et devient une barque. *Abysses* ouvre les eaux profondes, *Navires noirs* permet d'améliorer les barques.
- **Marée** : à partir du tour 6, puis tous les 3 tours, des côtes commencent à sombrer. Après 3 stades elles deviennent des hauts-fonds, et les unités qui s'y trouvent sont recueillies en barque.
- **Victoire** : être le dernier culte encore allumé, ou avoir le meilleur score au tour 30.

| Unité          | PV | Att | Déf | Mvt | Portée | Coût | Savoir requis |
| -------------- | -- | --- | --- | --- | ------ | ---- | ------------- |
| Acolyte        | 10 | 2   | 2   | 1   | 1      | 2    | —             |
| Guetteur       | 10 | 1   | 1   | 2   | 1      | 3    | Guet          |
| Harponneur     | 10 | 2   | 1   | 1   | 2      | 3    | Harpons       |
| Gardien        | 15 | 3   | 3   | 1   | 1      | 5    | Rites des profondeurs |
| Mortier rituel | 10 | 4   | 0   | 1   | 3      | 8    | Mortiers rituels |
| Barque         | —  | 1   | 1   | 2   | 2      | —    | Navigation    |
| Navire noir    | —  | 4   | 3   | 3   | 2      | 8    | Navires noirs |

**Contrôles** : clic pour sélectionner, se déplacer ou attaquer · glisser pour déplacer la carte · molette ou pincement pour zoomer · `Entrée` fin du tour · `T` savoirs · `Tab` unité suivante · `Échap` désélectionner.

## Architecture

```
src/
├── core/            # logique pure, testable sous Node
│   ├── data.js      # cultes, unités, savoirs, équilibrage
│   ├── map.js       # génération procédurale de l'archipel
│   ├── game.js      # moteur de règles (déplacements, combat, économie, marée, tours)
│   ├── ai.js        # IA (générateur : une action par yield, pour l'animer)
│   └── rng.js       # aléatoire déterministe à graine
├── render/
│   ├── iso.js       # projection isométrique et caméra
│   ├── sprites.js   # tous les visuels, tracés repris de la planche de DA
│   └── renderer.js  # boucle de rendu, profondeur, lumières, animations
├── ui/
│   ├── hud.js       # sélection, panneaux, savoirs interdits, messages
│   └── sigil.js     # sceaux des cultes en SVG
├── main.js          # écran titre, entrées, enchaînement des tours
└── style.css        # thème nocturne
tests/game.test.js
```

Le moteur (`core/`) ne touche jamais au DOM : il émet des événements (`move`, `attack`, `capture`, `tide`…) que le rendu et l'interface écoutent. Ça permet de le tester seul et, plus tard, de le faire tourner côté serveur pour du multijoueur.

## Pistes pour la suite

- Kraken : créature neutre des abysses qui attaque les navires
- Multijoueur en ligne (serveur Node + WebSocket qui fait tourner `core/` et diffuse les actions)
- Sauvegarde de partie, sons d'ambiance (ressac, cloches), musique
- L'IA ne tient pas encore compte de la marée
