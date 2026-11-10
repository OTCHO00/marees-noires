// Sceaux des cultes en SVG inline, pour l'interface HTML.
const MARKS = {
  lantern: (c) => `<rect x="-6" y="-9" width="12" height="16" rx="2" fill="${c}"/><path d="M-4 -9 L0 -15 L4 -9" fill="none" stroke="${c}" stroke-width="2"/>`,
  trident: (c) => `<path d="M0 12 L0 -12 M-8 -10 L-8 -2 Q-8 4 0 4 Q8 4 8 -2 L8 -10" fill="none" stroke="${c}" stroke-width="2.2"/>`,
  drop: (c) => `<path d="M0 -12 Q9 0 9 5 A9 9 0 0 1 -9 5 Q-9 0 0 -12Z" fill="${c}"/>`,
  eye: (c) => `<path d="M-12 0 Q0 -10 12 0 Q0 10 -12 0Z" fill="none" stroke="${c}" stroke-width="2"/><circle r="3.5" fill="${c}"/>`,
};

export function sigil(faction, size = 32) {
  return `<svg class="sigil" viewBox="-30 -30 60 60" width="${size}" height="${size}" aria-hidden="true">
    <circle r="27" fill="${faction.color}" opacity="0.12"/>
    <circle r="20" fill="none" stroke="${faction.color}" stroke-width="2"/>
    ${MARKS[faction.sigil](faction.color)}
  </svg>`;
}

export const oil = '<span class="oil" aria-hidden="true"></span>';
