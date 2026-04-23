// Decorative constellation silhouettes for the background.
// Star positions derived from IAU stick-figure diagrams. Subtle silver/pale styling.

const CONST_STROKE = 'var(--ink-soft)';

// Star positions in 0-1 local space mapped from real IAU stick-figure patterns.
// Relative RA/Dec positions normalized to fit a unit square.
const CONSTELLATIONS = [
  {
    // Ursa Major — the Big Dipper (Plough) bowl + handle
    name: 'Ursa Major',
    stars: [
      [0.10, 0.42], // Dubhe (α)
      [0.20, 0.38], // Merak (β)
      [0.28, 0.50], // Phecda (γ)
      [0.38, 0.44], // Megrez (δ)
      [0.52, 0.48], // Alioth (ε)
      [0.65, 0.40], // Mizar (ζ)
      [0.80, 0.35], // Alkaid (η)
    ],
    edges: [[0, 1], [1, 2], [2, 3], [0, 3], [3, 4], [4, 5], [5, 6]],
    mags: [1.8, 2.4, 2.4, 3.3, 1.8, 2.1, 1.9],
  },
  {
    // Orion — shoulders, belt, knees, sword region
    name: 'Orion',
    stars: [
      [0.35, 0.08], // Betelgeuse (α) — left shoulder
      [0.68, 0.12], // Bellatrix (γ) — right shoulder
      [0.42, 0.40], // Alnitak (ζ) — belt left
      [0.50, 0.42], // Alnilam (ε) — belt center
      [0.58, 0.44], // Mintaka (δ) — belt right
      [0.30, 0.82], // Saiph (κ) — left foot
      [0.72, 0.78], // Rigel (β) — right foot
    ],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 5], [1, 6]],
    mags: [0.5, 1.6, 1.7, 1.7, 2.2, 2.1, 0.1],
  },
  {
    // Cassiopeia — the W shape
    name: 'Cassiopeia',
    stars: [
      [0.08, 0.35], // Caph (β)
      [0.28, 0.60], // Schedar (α)
      [0.50, 0.28], // Navi (γ)
      [0.72, 0.62], // Ruchbah (δ)
      [0.92, 0.30], // Segin (ε)
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    mags: [2.3, 2.2, 2.5, 2.7, 3.4],
  },
  {
    // Lyra — Vega + parallelogram
    name: 'Lyra',
    stars: [
      [0.50, 0.08], // Vega (α) — brightest
      [0.38, 0.40], // Sulafat (γ)
      [0.62, 0.38], // Sheliak (β)
      [0.35, 0.72], // δ Lyr
      [0.65, 0.70], // ζ Lyr
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2]],
    mags: [0.0, 3.2, 3.5, 4.2, 4.3],
  },
  {
    // Cygnus — Northern Cross
    name: 'Cygnus',
    stars: [
      [0.50, 0.05], // Deneb (α) — tail
      [0.50, 0.35], // Sadr (γ) — center
      [0.50, 0.65], // η Cyg
      [0.50, 0.92], // Albireo (β) — head
      [0.18, 0.48], // δ Cyg — left wing
      [0.82, 0.48], // ε Cyg — right wing
    ],
    edges: [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]],
    mags: [1.3, 2.2, 3.9, 3.1, 2.9, 2.5],
  },
  {
    // Scorpius — head, claws, body, tail, stinger
    name: 'Scorpius',
    stars: [
      [0.15, 0.10], // Dschubba (δ) — upper claw
      [0.22, 0.18], // Acrab (β) — lower claw
      [0.30, 0.25], // π Sco
      [0.38, 0.32], // Antares (α) — heart
      [0.48, 0.44], // τ Sco
      [0.56, 0.56], // ε Sco
      [0.65, 0.65], // μ Sco
      [0.75, 0.72], // ζ Sco
      [0.82, 0.80], // η Sco
      [0.88, 0.72], // θ Sco — stinger tip
      [0.78, 0.62], // ι Sco
    ],
    edges: [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [7, 10]],
    mags: [2.3, 2.6, 2.9, 1.0, 2.8, 2.3, 3.0, 3.6, 3.3, 1.9, 3.0],
  },
];

function ConstellationDeco({ name, x, y, w, h, rotation = 0, opacity = 0.30 }) {
  const c = CONSTELLATIONS.find((c) => c.name === name) || CONSTELLATIONS[0];
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Silver/pale colour for subtlety
  const silver = 'var(--constellation, var(--ink-soft))';
  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`} opacity={opacity}>
      <g transform={`translate(${-w / 2}, ${-h / 2})`}>
        {c.edges.map(([i, j], k) => {
          const a = c.stars[i];
          const b = c.stars[j];
          return (
            <line
              key={`e-${k}`}
              x1={a[0] * w}
              y1={a[1] * h}
              x2={b[0] * w}
              y2={b[1] * h}
              stroke={silver}
              strokeWidth="0.6"
              opacity="0.6"
            />
          );
        })}
        {c.stars.map(([sx, sy], i) => {
          // Star radius from magnitude: brighter = larger (mag 0 → r=3.2, mag 4 → r=1.2)
          const mag = c.mags ? c.mags[i] : 2.5;
          const r = Math.max(1.2, 3.2 - mag * 0.5);
          return (
            <circle
              key={`s-${i}`}
              cx={sx * w}
              cy={sy * h}
              r={r}
              fill={silver}
              opacity={Math.max(0.4, 0.9 - mag * 0.12)}
            />
          );
        })}
      </g>
    </g>
  );
}

// A decorative little star/compass rose marker
function StarGlyph({ x, y, size = 8, opacity = 0.35 }) {
  const silver = 'var(--constellation, var(--ink-soft))';
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      <line x1={-size} y1="0" x2={size} y2="0" stroke={silver} strokeWidth="0.5" />
      <line x1="0" y1={-size} x2="0" y2={size} stroke={silver} strokeWidth="0.5" />
      <line x1={-size * 0.6} y1={-size * 0.6} x2={size * 0.6} y2={size * 0.6} stroke={silver} strokeWidth="0.35" />
      <line x1={-size * 0.6} y1={size * 0.6} x2={size * 0.6} y2={-size * 0.6} stroke={silver} strokeWidth="0.35" />
      <circle cx="0" cy="0" r="1.2" fill={silver} />
    </g>
  );
}

Object.assign(window, { ConstellationDeco, StarGlyph });

export { ConstellationDeco, StarGlyph };
