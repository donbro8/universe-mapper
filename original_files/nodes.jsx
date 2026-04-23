// The six nodes of the logarithmic scale.
// Each is a pure SVG component. All drawn with primitives only: circles, lines, dots, spiral curves.
// A small gold marker ("youAreHere") is placed to reflect the position at that scale.

const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const GOLD = 'var(--gold)';
const PAPER = 'var(--paper)';

// ───────── 1. HUMANS ─────────
// Two stylized figures like on the Pioneer plaque / Voyager record — but original, geometric.
function NodeHumans({ size = 140 }) {
  const w = size;
  const h = size * 1.2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ overflow: 'visible' }}>
      <g stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Man — left */}
        <g transform={`translate(${w * 0.32}, ${h * 0.15})`}>
          {/* head */}
          <circle cx="0" cy="6" r="6" />
          {/* torso */}
          <path d="M -7 14 L -8 38 L -6 60 L 6 60 L 8 38 L 7 14 Z" fill={PAPER} />
          {/* left arm — along baseline, reaching toward the woman */}
          <path d="M 7 18 L 16 26 L 22 30" />
          {/* right arm — down */}
          <path d="M -7 18 L -11 36 L -12 52" />
          {/* legs */}
          <path d="M -4 60 L -5 90" />
          <path d="M 4 60 L 5 90" />
        </g>
        {/* Woman — right */}
        <g transform={`translate(${w * 0.62}, ${h * 0.15})`}>
          {/* head */}
          <circle cx="0" cy="6" r="5.5" />
          {/* hair line */}
          {/* <path d="M -5 6 Q -7 16 -5 22" /> */}
          {/* torso — slightly narrower */}
          <path d="M -6 14 L -7 34 L -5 56 L 5 56 L 7 34 L 6 14 Z" fill={PAPER} />
          {/* left arm (her left — reaches toward man) */}
          <path d="M -6 18 L -14 24 L -20 28" />
          {/* right arm — down at side */}
          <path d="M 6 18 L 10 36 L 11 54" />
          {/* legs */}
          <path d="M -3 56 L -4 90" />
          <path d="M 3 56 L 4 90" />
        </g>
      </g>
    </svg>
  );
}

// ───────── 2. EARTH ─────────
// Globe centered on (lat, lon) — gold pin always at center. Drag to rotate.
// Day/night shadow derived from Sun's sub-solar point at `date`.
function NodeEarth({ size = 200, lat = 40.7, lon = -74.0, date = new Date(), onDrag }) {
  const r = size * 0.40;
  const cx = size / 2;
  const cy = size / 2;

  const svgRef = React.useRef(null);
  const dragRef = React.useRef(null);

  // Sub-solar point: where is the Sun directly overhead?
  // Solar declination (approx): δ = 23.44° · sin(earth_helio - π/2) ... use ecliptic approx
  // Actually simpler: δ = 23.44° · sin(2π·(d-80)/365.25) where d = day-of-year
  // Use a cleaner formula from earth's heliocentric longitude L_earth:
  //   sun's ecliptic longitude (geocentric) λ_sun = L_earth + 180
  //   δ = arcsin(sin(23.44°) · sin(λ_sun))
  const L_earth = window.earthHeliocentricLongitude(date); // radians
  const lam_sun = L_earth + Math.PI; // geocentric sun longitude, radians
  const obliq = window.trueObliquity(date); // corrected for precession + nutation
  const sub_lat_rad = Math.asin(Math.sin(obliq) * Math.sin(lam_sun));

  // Sub-solar longitude from equation of time corrected calculation
  const sub_lon_deg = window.subSolarLongitude(date);
  const sub_lon_rad = (sub_lon_deg * Math.PI) / 180;

  // Orthographic projection centered on (lat, lon)
  const lat_c = (lat * Math.PI) / 180;
  const lon_c = (lon * Math.PI) / 180;
  const project = (phiDeg, lamDeg) => {
    const phi = (phiDeg * Math.PI) / 180;
    const lam = (lamDeg * Math.PI) / 180;
    const cosC =
      Math.sin(lat_c) * Math.sin(phi) +
      Math.cos(lat_c) * Math.cos(phi) * Math.cos(lam - lon_c);
    const x = Math.cos(phi) * Math.sin(lam - lon_c);
    const y = -(Math.cos(lat_c) * Math.sin(phi) - Math.sin(lat_c) * Math.cos(phi) * Math.cos(lam - lon_c));
    return { x: r * x, y: r * y, vis: cosC > 0 };
  };

  // Sub-solar projected point (used for day/night gradient center)
  const subProj = (() => {
    const phi = sub_lat_rad;
    const lam = sub_lon_rad;
    const cosC =
      Math.sin(lat_c) * Math.sin(phi) +
      Math.cos(lat_c) * Math.cos(phi) * Math.cos(lam - lon_c);
    const x = r * Math.cos(phi) * Math.sin(lam - lon_c);
    const y = -r * (Math.cos(lat_c) * Math.sin(phi) - Math.sin(lat_c) * Math.cos(phi) * Math.cos(lam - lon_c));
    // When the sub-solar point is on the far hemisphere (cosC <= 0), we still want
    // to place a "virtual" gradient center off-globe so the visible disk is all night.
    // The angular distance from center to sub-solar on the sphere is:
    //   angDist = arccos(cosC)
    // In an orthographic projection the 2D distance from center for a far-side point
    // is clamped to r (the rim). We extrapolate by placing the gradient center at
    // distance r + (angDist - π/2) * r on the line from center to the projected pos.
    const mag = Math.sqrt(x * x + y * y) || 1e-6;
    if (cosC >= 0) {
      return { x, y, far: false };
    }
    // On far side — extrapolate along same direction beyond rim.
    // Use the great-circle angular distance from center:
    const ang = Math.acos(Math.max(-1, Math.min(1, cosC))); // > π/2
    // Extra distance proportional to how far past the horizon it is.
    const extra = ((ang - Math.PI / 2) / (Math.PI / 2)) * r * 1.2;
    return {
      x: (x / mag) * (r + extra),
      y: (y / mag) * (r + extra),
      far: true,
    };
  })();

  // Continent and island outlines at ~2-5° resolution.
  // [lat, lon] pairs, clockwise, closed polygons.
  const continents = [
    // ── North America ──
    [
      [71,-156],[70,-146],[70,-130],[72,-118],[75,-94],[73,-82],
      [68,-64],[63,-58],[60,-64],[56,-59],[53,-56],[47,-53],
      [47,-60],[45,-66],[43,-70],[41,-72],[39,-75],[37,-76],
      [35,-76],[33,-79],[30,-81],[27,-80],[25,-80],[25,-82],
      [28,-83],[30,-85],[30,-88],[29,-90],[29,-95],[26,-97],
      [22,-97],[19,-96],[18,-93],[21,-87],[18,-88],[15,-84],
      [12,-84],[10,-83],[8,-77],[8,-80],[10,-84],[16,-96],
      [20,-105],[23,-110],[28,-113],[32,-117],[34,-120],[37,-122],
      [42,-124],[46,-124],[49,-126],[52,-128],[55,-133],[58,-137],
      [60,-141],[60,-147],[57,-155],[60,-163],[64,-166],[66,-164],
      [71,-156],
    ],
    // ── South America ──
    [
      [12,-72],[10,-67],[8,-60],[6,-55],[4,-51],[2,-50],
      [0,-49],[-2,-44],[-5,-35],[-8,-35],[-13,-39],[-15,-39],
      [-18,-40],[-23,-42],[-25,-48],[-30,-50],[-33,-52],[-36,-57],
      [-40,-62],[-44,-65],[-48,-66],[-51,-69],[-53,-71],[-56,-68],
      [-54,-65],[-52,-72],[-48,-76],[-44,-73],[-38,-73],[-33,-72],
      [-28,-71],[-22,-70],[-18,-71],[-15,-76],[-10,-78],[-5,-81],
      [-2,-80],[0,-79],[3,-78],[6,-76],[8,-73],[10,-72],[12,-72],
    ],
    // ── Greenland ──
    [
      [84,-30],[82,-16],[79,-18],[76,-20],[73,-22],[70,-24],
      [68,-32],[65,-40],[62,-43],[60,-46],[60,-49],[63,-52],
      [67,-55],[70,-55],[74,-58],[78,-68],[80,-66],[82,-52],
      [84,-40],[84,-30],
    ],
    // ── Europe (W coast through Scandinavia; eastern edge overlaps Asia for seamless coverage) ──
    [
      [37,-9],[40,-9],[42,-9],[43,-8],[43,-3],[44,-2],[46,-2],
      [48,-5],[49,-2],[51,2],[53,5],[55,9],[56,8],[58,6],[60,5],
      [63,8],[66,14],[68,15],[70,20],[71,28],
      // Eastern edge: extend well into Central Asia so there's no gap with Asia polygon
      [72,40],[72,52],[70,60],[66,62],[60,58],[55,55],
      [50,50],[46,45],[42,40],[42,36],[42,32],
      // South: Turkey/Greece
      [41,29],[40,24],[38,22],[36,22],[36,15],
      [38,16],[37,15],[37,10],[38,0],[36,-5],[37,-9],
    ],
    // ── Italy ──
    [
      [44,8],[44,11],[43,12],[42,12],[41,14],[40,16],
      [39,17],[38,16],[37,15],[38,13],[39,16],[40,18],
      [42,14],[43,14],[45,13],[46,14],[44,8],
    ],
    // ── Africa ──
    [
      [35,-6],[36,0],[37,10],[35,12],[33,10],[32,23],[32,32],
      [28,33],[22,37],[18,38],[15,42],[12,44],[10,45],
      [5,42],[2,42],[0,42],[-2,41],[-5,40],[-10,40],
      [-15,41],[-20,35],[-25,35],[-28,32],[-33,28],[-35,20],
      [-34,18],[-30,17],[-22,14],[-15,12],[-10,14],[-6,12],
      [-5,9],[0,6],[5,2],[5,-2],[5,-5],[4,-8],
      [5,-10],[6,-11],[5,-16],[10,-16],[15,-17],
      [20,-17],[25,-15],[28,-13],[32,-8],[35,-6],
    ],
    // ── Asia (one exterior outline: Turkey → Russia → Kamchatka → China → SE Asia → India → Arabia → back) ──
    [
      // Turkey / Caucasus
      [42,32],[42,36],[40,40],[42,44],[44,50],
      // Central Asia → Russia
      [46,52],[50,53],[52,55],[55,58],[58,60],[60,65],
      // Siberia
      [62,70],[65,78],[68,76],[70,72],[72,80],
      [73,86],[75,90],[76,105],[75,112],
      // NE Siberia → Bering
      [73,120],[72,130],[70,140],[68,150],[66,170],
      // Kamchatka
      [62,167],[60,163],[56,162],[52,158],
      // Sea of Okhotsk coast
      [50,155],[48,145],[46,143],
      // Korea / China coast
      [44,132],[42,130],[40,124],[38,122],[36,120],
      [34,118],[32,122],[30,122],
      // South China
      [28,120],[25,120],[22,114],[22,108],
      // Vietnam coast
      [18,107],[16,108],[12,109],[10,106],
      // Malay Peninsula (east side, going south)
      [8,104],[6,102],[4,103],[2,104],[1,104],
      // Malay Peninsula (west side, going north)
      [2,102],[4,100],[6,100],[8,98],
      // Myanmar / Bangladesh
      [10,98],[14,99],[18,100],[20,96],[20,93],
      // India east coast
      [22,89],[20,87],[16,82],[13,80],[10,80],[8,80],
      // India south tip
      [7,79],[8,77],
      // India west coast
      [10,76],[12,75],[15,74],[18,73],[20,73],[22,69],[24,68],
      // Pakistan → Iran → Persian Gulf
      [25,62],[25,57],[27,55],[26,56],[24,54],
      // Arabia (Gulf coast → south → Red Sea)
      [22,55],[20,55],[18,52],[16,52],[14,48],
      [12,45],[13,44],[15,42],
      // Yemen → Red Sea → Sinai → Levant
      [18,38],[22,37],[25,37],[28,34],[30,35],
      [32,35],[35,36],[37,36],[40,33],[42,32],
    ],
    // ── Australia ──
    [
      [-11,131],[-12,136],[-14,136],[-14,141],[-17,146],
      [-20,149],[-24,152],[-28,153],[-30,153],[-33,152],
      [-35,151],[-37,150],[-38,147],[-39,144],[-37,140],
      [-36,137],[-35,135],[-34,130],[-33,127],[-32,125],
      [-30,115],[-26,113],[-22,114],[-20,119],[-18,122],
      [-16,123],[-14,126],[-13,130],[-12,131],[-11,131],
    ],
    // ── Tasmania ──
    [
      [-41,144],[-42,145],[-43,147],[-44,147],[-44,146],
      [-43,145],[-42,144],[-41,144],
    ],
    // ── Antarctica ──
    [
      [-65,-180],[-67,-150],[-68,-120],[-70,-100],[-72,-80],
      [-72,-60],[-70,-40],[-68,-20],[-70,0],[-70,20],
      [-70,40],[-70,60],[-68,80],[-68,100],[-66,110],
      [-68,120],[-70,140],[-72,160],[-70,170],[-65,180],
    ],
    // ── Iceland ──
    [
      [66,-23],[66,-18],[65,-14],[64,-14],[64,-18],
      [64,-22],[65,-24],[66,-23],
    ],
    // ── Great Britain ──
    [
      [50,-5],[51,-1],[52,0],[53,0],[53,-1],[54,-1],
      [55,-2],[55,-3],[56,-3],[57,-2],[57,-5],[58,-5],
      [58,-3],[57,-2],[58,-3],[59,-3],[58,-5],[57,-6],
      [56,-5],[55,-5],[54,-3],[53,-3],[52,-4],[51,-3],
      [51,-5],[50,-5],
    ],
    // ── Ireland ──
    [
      [52,-6],[52,-7],[53,-10],[54,-10],[55,-8],[55,-7],
      [54,-6],[53,-6],[52,-6],
    ],
    // ── Japan (Honshu + Hokkaido + Kyushu) ──
    [
      [31,131],[33,130],[33,132],[34,133],[34,135],
      [35,135],[35,137],[36,137],[36,140],[37,140],
      [38,140],[39,140],[40,140],[41,140],[42,143],
      [43,145],[44,145],[45,142],[44,144],[43,141],
      [42,140],[40,140],[38,139],[36,138],[35,137],
      [34,134],[33,131],[31,131],
    ],
    // ── Taiwan ──
    [[25,121],[25,122],[24,122],[23,121],[22,121],[23,120],[25,121]],
    // ── Philippines (Luzon + Mindanao) ──
    [
      [18,121],[17,122],[14,122],[13,124],[12,124],
      [10,126],[8,126],[7,126],[6,126],[7,124],
      [8,124],[10,124],[12,122],[14,121],[16,120],[18,121],
    ],
    // ── Borneo ──
    [
      [7,117],[6,118],[4,118],[2,117],[1,110],
      [0,109],[-1,110],[-2,111],[-3,116],[-1,117],
      [1,118],[3,118],[5,119],[7,117],
    ],
    // ── Sumatra ──
    [
      [5,95],[4,98],[2,99],[0,100],[-1,102],
      [-3,104],[-5,105],[-6,104],[-5,102],[-3,100],
      [-1,99],[1,98],[3,97],[5,95],
    ],
    // ── Java ──
    [
      [-6,106],[-7,107],[-7,110],[-8,112],[-8,114],
      [-7,114],[-7,111],[-6,108],[-6,106],
    ],
    // ── Sulawesi ──
    [
      [1,121],[0,121],[-1,121],[-2,121],[-3,121],
      [-4,122],[-5,122],[-4,121],[-2,120],[-1,120],
      [0,120],[1,121],
    ],
    // ── New Guinea ──
    [
      [-1,131],[-2,137],[-4,138],[-5,141],[-6,145],
      [-7,147],[-8,147],[-9,147],[-9,143],[-8,140],
      [-6,139],[-5,138],[-4,136],[-3,134],[-2,133],
      [-1,131],
    ],
    // ── New Zealand — North Island ──
    [
      [-35,174],[-36,175],[-37,176],[-38,177],[-39,177],
      [-40,176],[-41,175],[-41,174],[-39,174],[-38,175],
      [-37,175],[-36,174],[-35,174],
    ],
    // ── New Zealand — South Island ──
    [
      [-41,173],[-42,172],[-43,171],[-44,169],[-45,167],
      [-46,166],[-47,168],[-46,170],[-45,171],[-44,172],
      [-43,173],[-42,174],[-41,173],
    ],
    // ── Madagascar ──
    [
      [-12,49],[-14,48],[-16,45],[-18,44],[-20,44],
      [-22,44],[-24,45],[-26,47],[-24,48],[-21,49],
      [-18,50],[-15,50],[-12,49],
    ],
    // ── Sri Lanka ──
    [[10,80],[9,80],[8,80],[7,80],[6,81],[7,82],[8,82],[9,81],[10,80]],
    // ── Cuba ──
    [[23,-84],[22,-84],[22,-81],[21,-80],[20,-78],[20,-75],[21,-75],[22,-78],[23,-82],[23,-84]],
    // ── Hispaniola ──
    [[20,-74],[19,-72],[19,-70],[18,-69],[18,-72],[19,-73],[20,-74]],
    // ── Caribbean — Puerto Rico ──
    [[18,-67],[18,-66],[18,-65],[18,-67]],
  ];

  const buildPath = (poly) => {
    // Sample segments between projected points, skipping invisible crossings.
    let d = '';
    let lastVis = false;
    for (let i = 0; i < poly.length; i++) {
      const p = project(poly[i][0], poly[i][1]);
      if (p.vis) {
        d += (lastVis ? ' L ' : ' M ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        lastVis = true;
      } else {
        lastVis = false;
      }
    }
    return d;
  };

  // ── drag handling ──
  const onPointerDown = (e) => {
    if (!onDrag) return;
    e.preventDefault();
    const svg = svgRef.current;
    svg.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLat: lat,
      startLon: lon,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    // degrees per pixel — scale from the display scale
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    // pixels per radian on the visible disk radius
    const pxPerRad = (rect.width / size) * r;
    const dLon = -(dx / pxPerRad) * (180 / Math.PI);
    const dLat = (dy / pxPerRad) * (180 / Math.PI);
    let newLon = d.startLon + dLon;
    newLon = ((newLon + 540) % 360) - 180;
    const newLat = Math.max(-85, Math.min(85, d.startLat + dLat));
    onDrag({ lat: newLat, lon: newLon });
  };
  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    const svg = svgRef.current;
    try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    dragRef.current = null;
  };

  const gradientId = React.useMemo(
    () => 'daynight-' + Math.random().toString(36).slice(2, 8),
    []
  );
  const clipId = React.useMemo(
    () => 'globeclip-' + Math.random().toString(36).slice(2, 8),
    []
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: 'visible', cursor: onDrag ? 'grab' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r={r} />
        </clipPath>
        {/* Day/night gradient — bright at sub-solar, dark on opposite side */}
        <radialGradient
          id={gradientId}
          cx={subProj.x}
          cy={subProj.y}
          r={r * 1.6}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="var(--paper)" stopOpacity="0" />
          <stop offset="55%"  stopColor="var(--ink)"   stopOpacity="0" />
          <stop offset="68%"  stopColor="var(--ink)"   stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--ink)"   stopOpacity="0.48" />
        </radialGradient>
      </defs>

      <g transform={`translate(${cx}, ${cy})`}>
        {/* Globe background */}
        <circle cx="0" cy="0" r={r} fill={PAPER} stroke={INK} strokeWidth="1.1" />

        <g clipPath={`url(#${clipId})`}>
          {/* Parallels */}
          {[-60, -30, 0, 30, 60].map((latLine) => {
            // A parallel is a circle on the sphere. In orthographic from center (lat_c, lon_c):
            // it becomes an ellipse — sample it directly.
            const pts = [];
            for (let k = 0; k <= 64; k++) {
              const lo = -180 + (360 * k) / 64;
              const p = project(latLine, lo);
              if (p.vis) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
              else pts.push('');
            }
            // Build polyline breaking on invisible pts
            const segments = [];
            let cur = [];
            for (const pt of pts) {
              if (pt) cur.push(pt);
              else if (cur.length) { segments.push(cur.join(' ')); cur = []; }
            }
            if (cur.length) segments.push(cur.join(' '));
            return segments.map((s, si) => (
              <polyline
                key={`par-${latLine}-${si}`}
                points={s}
                fill="none"
                stroke={INK_SOFT}
                strokeWidth="0.5"
                opacity="0.5"
              />
            ));
          })}
          {/* Meridians */}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((lonLine) => {
            const pts = [];
            for (let k = 0; k <= 40; k++) {
              const la = -90 + (180 * k) / 40;
              const p = project(la, lonLine);
              if (p.vis) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
              else pts.push('');
            }
            const segments = [];
            let cur = [];
            for (const pt of pts) {
              if (pt) cur.push(pt);
              else if (cur.length) { segments.push(cur.join(' ')); cur = []; }
            }
            if (cur.length) segments.push(cur.join(' '));
            return segments.map((s, si) => (
              <polyline
                key={`mer-${lonLine}-${si}`}
                points={s}
                fill="none"
                stroke={INK_SOFT}
                strokeWidth="0.5"
                opacity="0.45"
              />
            ));
          })}

          {/* Continents */}
          {continents.map((poly, i) => (
            <path
              key={`cont-${i}`}
              d={buildPath(poly)}
              fill={INK}
              opacity="0.25"
              stroke={INK}
              strokeWidth="0.4"
              strokeOpacity="0.55"
            />
          ))}

          {/* Day/night shadow overlay */}
          <circle cx="0" cy="0" r={r} fill={`url(#${gradientId})`} />
        </g>

        {/* Globe outline on top */}
        <circle cx="0" cy="0" r={r} fill="none" stroke={INK} strokeWidth="1.1" />

        {/* Moon — positioned by azimuth, phase-accurate */}
        {(() => {
          const moonEq = window.moonEquatorialPosition(date);
          const moonSky = window.moonAltAz(date, lat, lon);
          const moonOrbitR = r * 1.35;
          const moonR = 6;

          // Screen position from azimuth (0=N, clockwise)
          const azRad = (moonSky.azDeg * Math.PI) / 180;
          const mx = moonOrbitR * Math.sin(azRad);
          const my = -moonOrbitR * Math.cos(azRad);

          // Fade near/below horizon
          const opacity = Math.max(0.15, Math.min(1.0, (moonSky.altDeg + 10) / 20));

          // Phase terminator path
          const elongRad = (moonEq.elongDeg * Math.PI) / 180;
          const kx = Math.cos(elongRad);
          const sweep = moonEq.waxing ? 1 : 0;
          // Two-arc path: semicircle edge + elliptical terminator
          const absKx = Math.max(0.001, Math.abs(kx));
          const flipSweep = kx > 0 ? sweep : 1 - sweep;
          const phasePath =
            `M 0 ${-moonR} A ${moonR} ${moonR} 0 0 ${sweep} 0 ${moonR}` +
            ` A ${absKx * moonR} ${moonR} 0 0 ${flipSweep} 0 ${-moonR} Z`;

          // Rotate so bright limb faces the Sun (subProj direction from moon pos)
          const dx = subProj.x - mx;
          const dy = subProj.y - my;
          const brightAngle = Math.atan2(dx, -dy) * (180 / Math.PI);

          return (
            <g transform={`translate(${mx.toFixed(1)}, ${my.toFixed(1)})`} opacity={opacity}>
              <g transform={`rotate(${brightAngle.toFixed(1)})`}>
                <circle cx="0" cy="0" r={moonR} fill={PAPER} stroke={INK} strokeWidth="0.6" />
                <path d={phasePath} fill={INK} opacity="0.35" />
              </g>
            </g>
          );
        })()}

        {/* Gold pin at center */}
        <circle cx="0" cy="0" r="8" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.7" />
        <circle cx="0" cy="0" r="3" fill={GOLD} />
        <line x1="0" y1={-r - 8} x2="0" y2={-r - 2} stroke={GOLD} strokeWidth="0.8" opacity="0.6" />
      </g>
    </svg>
  );
}

// ───────── 3. SOLAR SYSTEM ─────────
// Concentric orbits, sun at center, Earth at current heliocentric longitude.
// Earth is draggable — dragging rotates it around its orbit which updates the date.
// Seasonal quadrants shown as subtle spokes with glyphs at their midpoints.
function NodeSolarSystem({ size = 240, date = new Date(), lat = 0, onDragDate }) {
  const cx = size / 2;
  const cy = size / 2;
  // J2000 Keplerian elements from JPL "Approximate Positions of the Planets" (Standish)
  // + inclination (i°) and longitude of ascending node (node°) for orbital plane indicators
  const planets = [
    { name: 'Mer', a: 0.387, L0: 252.25084,  nCy: 149472.67411, lonPeri: 77.45780,  lonPeriRate: 0.15940, e: 0.20563, i: 7.005, node: 48.331 },
    { name: 'Ven', a: 0.723, L0: 181.97973,  nCy: 58517.81539,  lonPeri: 131.56371, lonPeriRate: 0.00268, e: 0.00677, i: 3.395, node: 76.680 },
    { name: 'Ear', a: 1.000, L0: 100.46457,  nCy: 35999.37245,  lonPeri: 102.93768, lonPeriRate: 0.32327, e: 0.01671, i: 0.000, node: 0 },
    { name: 'Mar', a: 1.524, L0: 355.44657,  nCy: 19140.30268,  lonPeri: 336.06023, lonPeriRate: 0.32327, e: 0.09340, i: 1.850, node: 49.558 },
    { name: 'Jup', a: 5.203, L0: 34.39644,   nCy: 3034.74613,   lonPeri: 14.33131,  lonPeriRate: 0.21253, e: 0.04839, i: 1.303, node: 100.464 },
    { name: 'Sat', a: 9.537, L0: 49.95424,   nCy: 1222.49362,   lonPeri: 93.05679,  lonPeriRate: 0.28756, e: 0.05415, i: 2.489, node: 113.665 },
    { name: 'Ura', a: 19.191, L0: 313.23810, nCy: 428.48203,    lonPeri: 173.00529, lonPeriRate: 0.01373, e: 0.04717, i: 0.773, node: 74.006 },
    { name: 'Nep', a: 30.069, L0: 304.87997, nCy: 218.45946,    lonPeri: 48.12028,  lonPeriRate: 0.01009, e: 0.00859, i: 1.770, node: 131.784 },
  ];
  const rMax = size * 0.44;
  // Logarithmic scaling so all 8 planets are visible (Mercury to Neptune)
  const rMin = rMax * 0.15;
  const logMin = Math.log10(planets[0].a);
  const logMax = Math.log10(planets[planets.length - 1].a);
  const orbitRadius = (a) => rMin + (Math.log10(a) - logMin) / (logMax - logMin) * (rMax - rMin);

  const earthLon = window.earthHeliocentricLongitude(date);
  const d = window.daysSinceJ2000(date);

  const T = d / 36525; // Julian centuries since J2000

  const planetPos = (p) => {
    let angle;
    if (p.name === 'Ear') {
      angle = earthLon;
    } else {
      // Mean longitude from century rate (more accurate than period-based for fast planets)
      const L = ((p.L0 + p.nCy * T) % 360 + 360) % 360;
      // Longitude of perihelion with secular drift
      const wBar = p.lonPeri + p.lonPeriRate * T;
      // Mean anomaly (degrees)
      const M = ((L - wBar) % 360 + 360) % 360;
      const Mrad = M * Math.PI / 180;
      // Equation of center — first-order eccentricity correction
      const C = (2 * p.e * Math.sin(Mrad) + 1.25 * p.e * p.e * Math.sin(2 * Mrad)) * (180 / Math.PI);
      // True heliocentric longitude (degrees → radians)
      angle = (((L + C) % 360 + 360) % 360) * Math.PI / 180;
    }
    // Place planet on the visual ellipse: radial distance varies with true anomaly
    const a_vis = orbitRadius(p.a);
    const wRad = ((p.lonPeri + p.lonPeriRate * T) * Math.PI) / 180;
    const nu = angle - wRad; // true anomaly
    const r = a_vis * (1 - p.e * p.e) / (1 + p.e * Math.cos(nu));
    return {
      angle,
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    };
  };

  // Seasonal markers:
  // Northern hemisphere seasons in terms of Earth heliocentric longitude (L_earth):
  //   L=0°   autumn equinox (Sun at 180° = Aries)           → Earth at 0° → Sun in Libra
  //   Actually: when Earth is at heliocentric longitude L, Sun's geocentric longitude is L+180.
  //   Vernal equinox: Sun at geocentric λ=0 → Earth at L=180°  (MARCH)
  //   Summer solstice: Sun at λ=90° → Earth at L=270°          (JUNE)
  //   Autumn equinox: Sun at λ=180° → Earth at L=0°            (SEPTEMBER)
  //   Winter solstice: Sun at λ=270° → Earth at L=90°          (DECEMBER)
  const south = lat < 0;
  const seasonMarkers = [
    { L: 180, glyph: '♈', label: south ? 'AUTUMN' : 'SPRING' },
    { L: 270, glyph: '☀', label: south ? 'WINTER' : 'SUMMER' },
    { L:   0, glyph: '♎', label: south ? 'SPRING' : 'AUTUMN' },
    { L:  90, glyph: '❄', label: south ? 'SUMMER' : 'WINTER' },
  ];

  const earthPos = planetPos({ name: 'Ear', a: 1.0 });

  // ── drag handling ──
  const svgRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const onPointerDown = (e) => {
    if (!onDragDate) return;
    e.preventDefault();
    const svg = svgRef.current;
    svg.setPointerCapture(e.pointerId);
    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const initAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    dragRef.current = {
      centerX, centerY,
      initAngle,
      startDate: date.getTime(),
      startLon: earthLon,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const curAngle = Math.atan2(e.clientY - d.centerY, e.clientX - d.centerX);
    let delta = curAngle - d.initAngle;
    // normalize to [-π, π]
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    // Earth orbital period in ms
    const periodMs = 365.25 * 86400 * 1000;
    const dtMs = (delta / (2 * Math.PI)) * periodMs;
    const newDate = new Date(d.startDate + dtMs);
    onDragDate(newDate);
  };
  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    const svg = svgRef.current;
    try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    dragRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: 'visible', cursor: onDragDate ? 'grab' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Seasonal spokes (very subtle) */}
        {seasonMarkers.map((s) => {
          const a = (s.L * Math.PI) / 180;
          const x2 = rMax * 1.02 * Math.cos(a);
          const y2 = rMax * 1.02 * Math.sin(a);
          return (
            <line
              key={`spoke-${s.L}`}
              x1="0" y1="0"
              x2={x2} y2={y2}
              stroke={INK_SOFT}
              strokeWidth="0.4"
              strokeDasharray="1.5 3"
              opacity="0.45"
            />
          );
        })}

        {/* Orbits — ellipses with Sun at focus */}
        {planets.map((p, i) => {
          const a_vis = orbitRadius(p.a);
          const b_vis = a_vis * Math.sqrt(1 - p.e * p.e);
          const c_vis = a_vis * p.e;
          const wDeg = p.lonPeri + p.lonPeriRate * T;
          return (
            <ellipse
              key={p.name}
              cx={-c_vis} cy={0}
              rx={a_vis} ry={b_vis}
              transform={`rotate(${wDeg})`}
              fill="none"
              stroke={INK}
              strokeWidth="0.8"
              opacity={i === 2 ? 1 : 0.5}
            />
          );
        })}

        {/* Perihelion/aphelion markers for Mercury and Mars */}
        {planets.filter(p => p.name === 'Mer' || p.name === 'Mar').map(p => {
          const a_vis = orbitRadius(p.a);
          const wRad = ((p.lonPeri + p.lonPeriRate * T) * Math.PI) / 180;
          const periR = a_vis * (1 - p.e);
          const aphR = a_vis * (1 + p.e);
          return (
            <g key={`periap-${p.name}`}>
              <circle cx={periR * Math.cos(wRad)} cy={periR * Math.sin(wRad)}
                r="1.5" fill="none" stroke={INK_SOFT} strokeWidth="0.6" opacity="0.6" />
              <circle cx={aphR * Math.cos(wRad + Math.PI)} cy={aphR * Math.sin(wRad + Math.PI)}
                r="1.5" fill="none" stroke={INK_SOFT} strokeWidth="0.6" opacity="0.6" />
            </g>
          );
        })}

        {/* Sun — 8-pointed star */}
        <g>
          <circle cx="0" cy="0" r="5" fill={PAPER} stroke={INK} strokeWidth="1" />
          {[0, 45, 90, 135].map((a) => (
            <line
              key={a}
              x1={-11 * Math.cos((a * Math.PI) / 180)}
              y1={-11 * Math.sin((a * Math.PI) / 180)}
              x2={11 * Math.cos((a * Math.PI) / 180)}
              y2={11 * Math.sin((a * Math.PI) / 180)}
              stroke={INK}
              strokeWidth="0.8"
            />
          ))}
          {[22.5, 67.5, 112.5, 157.5].map((a) => (
            <line
              key={a}
              x1={-7.5 * Math.cos((a * Math.PI) / 180)}
              y1={-7.5 * Math.sin((a * Math.PI) / 180)}
              x2={7.5 * Math.cos((a * Math.PI) / 180)}
              y2={7.5 * Math.sin((a * Math.PI) / 180)}
              stroke={INK}
              strokeWidth="0.55"
            />
          ))}
        </g>

        {/* Seasonal glyphs — placed halfway between successive markers,
            at the mid-angle, slightly outside the outer orbit */}
        {seasonMarkers.map((s, i) => {
          const next = seasonMarkers[(i + 1) % seasonMarkers.length];
          const a1 = (s.L * Math.PI) / 180;
          let a2 = (next.L * Math.PI) / 180;
          if (a2 < a1) a2 += 2 * Math.PI;
          const am = (a1 + a2) / 2;
          const gx = (rMax + 14) * Math.cos(am);
          const gy = (rMax + 14) * Math.sin(am);
          return (
            <g key={`glyph-${i}`}>
              <text
                x={gx} y={gy + 3}
                textAnchor="middle"
                fontSize="11"
                fontFamily="EB Garamond, serif"
                fontStyle="italic"
                fill="var(--ink-soft)"
                opacity="0.7"
              >
                {s.label.toLowerCase()}
              </text>
            </g>
          );
        })}

        {/* Planet dots + labels */}
        {planets.map((p) => {
          const pos = planetPos(p);
          const isEarth = p.name === 'Ear';
          return (
            <g key={`pl-${p.name}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isEarth ? 3.3 : 2}
                fill={isEarth ? GOLD : INK}
                stroke={isEarth ? GOLD : 'none'}
                strokeWidth={isEarth ? '0.8' : '0'}
              />
              {isEarth && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="8"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="0.6"
                  opacity="0.65"
                />
              )}
              {!isEarth && (
                <text
                  x={pos.x}
                  y={pos.y - 5}
                  textAnchor="middle"
                  fontSize="6"
                  fontFamily="JetBrains Mono, monospace"
                  fill={INK}
                  opacity="0.7"
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Asteroid belt — scattered dots between Mars and Jupiter (~2.1–3.3 AU) */}
        {Array.from({ length: 80 }, (_, i) => {
          const angle = (i * 137.508 * Math.PI) / 180; // golden angle for even distribution
          const au = 2.1 + (((i * 7 + 3) % 12) / 12) * 1.2;
          const r = orbitRadius(au) + ((i * 17 + 5) % 7 - 3) * 0.5; // slight radial jitter
          return (
            <circle
              key={`ast-${i}`}
              cx={r * Math.cos(angle)}
              cy={r * Math.sin(angle)}
              r={0.4 + (i % 3) * 0.15}
              fill={INK}
              opacity={0.2 + (i % 5) * 0.03}
            />
          );
        })}

        {/* Pluto's orbit — dashed, highly eccentric (e=0.249), crosses Neptune's orbit at perihelion */}
        {(() => {
          const plutoA = 39.482, plutoE = 0.2488, plutoLonPeri = 224.067;
          const a_vis = orbitRadius(plutoA);
          const b_vis = a_vis * Math.sqrt(1 - plutoE * plutoE);
          const c_vis = a_vis * plutoE;
          return (
            <ellipse
              cx={-c_vis} cy={0}
              rx={a_vis} ry={b_vis}
              transform={`rotate(${plutoLonPeri})`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth="0.5"
              strokeDasharray="2 3"
              opacity="0.45"
            />
          );
        })()}

        {/* Ceres — largest asteroid belt object, computed position */}
        {(() => {
          const ceresA = 2.7675, ceresE = 0.0758, ceresL0 = 153.3, ceresNCy = 7826.1, ceresLonPeri = 73.6;
          const L = ((ceresL0 + ceresNCy * T) % 360 + 360) % 360;
          const M = ((L - ceresLonPeri) % 360 + 360) % 360;
          const Mrad = M * Math.PI / 180;
          const C = (2 * ceresE * Math.sin(Mrad)) * (180 / Math.PI);
          const angle = (((L + C) % 360 + 360) % 360) * Math.PI / 180;
          const a_vis = orbitRadius(ceresA);
          const wRad = (ceresLonPeri * Math.PI) / 180;
          const nu = angle - wRad;
          const r_vis = a_vis * (1 - ceresE * ceresE) / (1 + ceresE * Math.cos(nu));
          const x = r_vis * Math.cos(angle);
          const y = r_vis * Math.sin(angle);
          return (
            <g>
              <circle cx={x} cy={y} r="1.3" fill={INK} opacity="0.7" />
              <text x={x} y={y - 4} textAnchor="middle" fontSize="5"
                fontFamily="JetBrains Mono, monospace" fill={INK} opacity="0.55">
                Ceres
              </text>
            </g>
          );
        })()}

        {/* Pluto label near its orbit at a readable position */}
        {(() => {
          const plutoLonPeri = 224.067, plutoE = 0.2488;
          const labelAngle = (plutoLonPeri + 90) * Math.PI / 180; // 90° past perihelion
          const plutoAVis = orbitRadius(39.482);
          const nu = labelAngle - (plutoLonPeri * Math.PI / 180);
          const rLabel = plutoAVis * (1 - plutoE * plutoE) / (1 + plutoE * Math.cos(nu));
          return (
            <text x={rLabel * Math.cos(labelAngle)} y={rLabel * Math.sin(labelAngle) - 4}
              textAnchor="middle" fontSize="5"
              fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.5"
              style={{ fontStyle: 'italic' }}>
              Pluto
            </text>
          );
        })()}

        {/* Orbital inclination indicators — tick marks at ascending/descending nodes */}
        {planets.filter(p => p.i >= 1.5).map(p => {
          const a_vis = orbitRadius(p.a);
          const nodeRad = (p.node * Math.PI) / 180;
          const wRad = ((p.lonPeri + p.lonPeriRate * T) * Math.PI) / 180;
          // Ascending node on the orbit ellipse
          const nuAsc = nodeRad - wRad;
          const rAsc = a_vis * (1 - p.e * p.e) / (1 + p.e * Math.cos(nuAsc));
          const ascX = rAsc * Math.cos(nodeRad);
          const ascY = rAsc * Math.sin(nodeRad);
          // Descending node (opposite side)
          const descRad = nodeRad + Math.PI;
          const nuDesc = descRad - wRad;
          const rDesc = a_vis * (1 - p.e * p.e) / (1 + p.e * Math.cos(nuDesc));
          const descX = rDesc * Math.cos(descRad);
          const descY = rDesc * Math.sin(descRad);
          // Tick length proportional to inclination (Mercury 7° gets the largest)
          const tickLen = Math.min(p.i * 0.7, 5.5);
          return (
            <g key={`incl-${p.name}`}>
              <line x1={ascX} y1={ascY} x2={ascX} y2={ascY - tickLen}
                stroke={INK_SOFT} strokeWidth="0.7" opacity="0.55" />
              <line x1={descX} y1={descY} x2={descX} y2={descY + tickLen}
                stroke={INK_SOFT} strokeWidth="0.7" opacity="0.55" />
            </g>
          );
        })}

        {/* Ecliptic plane label along Earth's orbit */}
        <text
          x={orbitRadius(1.0) + 8} y={-2}
          fontSize="5" fontFamily="JetBrains Mono, monospace"
          fill={INK_SOFT} opacity="0.5"
          style={{ fontStyle: 'italic' }}
        >
          ecliptic
        </text>

        {/* Invisible larger hit-zone over Earth for easier grabbing */}
        {onDragDate && (
          <circle
            cx={earthPos.x}
            cy={earthPos.y}
            r="16"
            fill="transparent"
            style={{ cursor: 'grab' }}
          />
        )}
      </g>
    </svg>
  );
}

// ───────── 4. MILKY WAY GALAXY ─────────
// Four-arm barred spiral (SBbc). Sun in the Orion Spur between Perseus and Sagittarius arms.
// Galaxy diameter ~100,000 ly; Sun at ~26,000 ly from center.
function NodeGalaxy({ size = 180 }) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.44; // represents 50,000 ly radius

  // Log spiral: r = a·exp(b·θ), pitch angle ~12° → b ≈ 0.19
  const a = 0.10;
  const b = 0.19;

  // Sun at 52% of rMax (26,000 / 50,000 ly), along +x for reference
  const sunFrac = 0.52;
  const sunAngle = 0;
  const tSun = Math.log(sunFrac / a) / b; // theta where spiral hits Sun's radius
  // Offset so nearest arm passes ~29° from Sun at its radius
  const baseOffset = -tSun + sunAngle + 0.5;

  // Four major arms — labeling based on which arm is inside/outside the Sun at angle 0°
  const arms = [
    { name: 'Sagittarius',      offset: baseOffset },
    { name: 'Scutum-Cen.',      offset: baseOffset + Math.PI / 2 },
    { name: 'Norma',            offset: baseOffset + Math.PI },
    { name: 'Perseus',          offset: baseOffset + 3 * Math.PI / 2 },
  ];

  const makeArm = (offset) => {
    const pts = [];
    for (let t = 0; t <= 20; t += 0.05) {
      const r = a * Math.exp(b * t);
      if (r > 1.02) break;
      const x = r * rMax * Math.cos(t + offset);
      const y = r * rMax * Math.sin(t + offset);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ');
  };

  // Orion Spur — short minor arm passing through the Sun
  const orionOffset = -tSun + sunAngle;
  const orionSpur = (() => {
    const pts = [];
    for (let t = tSun - 3; t <= tSun + 3; t += 0.05) {
      const r = a * Math.exp(b * t);
      if (r < 0.05 || r > 1) continue;
      pts.push(`${(r * rMax * Math.cos(t + orionOffset)).toFixed(2)},${(r * rMax * Math.sin(t + orionOffset)).toFixed(2)}`);
    }
    return pts.join(' ');
  })();

  const sunX = sunFrac * rMax * Math.cos(sunAngle);
  const sunY = sunFrac * rMax * Math.sin(sunAngle);

  // Central bar: ~27,000 ly long → half-length = 13,500/50,000 = 0.27 of rMax
  const barAngleDeg = 25;
  const barHalfLen = rMax * 0.27;
  const barHalfWidth = rMax * 0.08;

  // Arm label positions at ~92% radius
  const armLabelPos = (offset) => {
    const rFrac = 0.92;
    const tLabel = Math.log(rFrac / a) / b;
    const angle = tLabel + offset;
    return { x: rFrac * rMax * Math.cos(angle), y: rFrac * rMax * Math.sin(angle) };
  };

  // Scatter dots along all 4 arms
  const scatter = [];
  for (let armIdx = 0; armIdx < 4; armIdx++) {
    const off = arms[armIdx].offset;
    for (let t = 1; t <= 20; t += 0.4) {
      const r = a * Math.exp(b * t);
      if (r > 1.02) break;
      const jitter = (Math.sin(t * 31 + armIdx * 7) * 0.5 + 0.5) * 0.05;
      const rj = Math.min(r + jitter, 1.02);
      const aj = t + off + (Math.cos(t * 17 + armIdx * 3) * 0.08);
      scatter.push({
        x: rj * rMax * Math.cos(aj),
        y: rj * rMax * Math.sin(aj),
        s: 0.35 + ((armIdx * 13 + Math.floor(t * 10)) % 3) * 0.18,
      });
    }
  }
  // Orion Spur scatter
  for (let t = tSun - 2; t <= tSun + 2; t += 0.6) {
    const r = a * Math.exp(b * t);
    if (r < 0.05 || r > 1) continue;
    scatter.push({
      x: r * rMax * Math.cos(t + orionOffset) + Math.sin(t * 13) * 1.5,
      y: r * rMax * Math.sin(t + orionOffset) + Math.cos(t * 17) * 1.5,
      s: 0.3,
    });
  }

  // Globular clusters in the halo
  const globulars = [
    { angle: 0.4, r: 0.88 }, { angle: 1.9, r: 0.93 },
    { angle: 3.0, r: 0.86 }, { angle: 4.2, r: 0.96 },
    { angle: 5.3, r: 0.83 }, { angle: 0.9, r: 0.98 },
    { angle: 2.6, r: 0.91 },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Galactic halo — faint outer circle */}
        <circle cx="0" cy="0" r={rMax * 1.05} fill="none" stroke={INK_SOFT} strokeWidth="0.4" opacity="0.3" />
        <text x={rMax * 0.72} y={-rMax * 0.80} fontSize="4"
          fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.35"
          style={{ fontStyle: 'italic' }}>halo</text>

        {/* Disk edge */}
        <circle cx="0" cy="0" r={rMax * 0.98} fill="none" stroke={INK_SOFT} strokeWidth="0.5" opacity="0.45" />

        {/* Globular clusters */}
        {globulars.map((gc, i) => {
          const gx = gc.r * rMax * Math.cos(gc.angle);
          const gy = gc.r * rMax * Math.sin(gc.angle);
          return (
            <g key={`gc-${i}`}>
              <circle cx={gx} cy={gy} r="1.8" fill="none" stroke={INK_SOFT} strokeWidth="0.5" opacity="0.45" />
              <circle cx={gx} cy={gy} r="0.7" fill={INK} opacity="0.45" />
            </g>
          );
        })}

        {/* Scatter stars */}
        {scatter.map((p, i) => (
          <circle key={`sc-${i}`} cx={p.x} cy={p.y} r={p.s} fill={INK} opacity="0.45" />
        ))}

        {/* Four spiral arms */}
        {arms.map((arm) => (
          <polyline key={arm.name} points={makeArm(arm.offset)}
            fill="none" stroke={INK} strokeWidth="1.0" opacity="0.65" />
        ))}

        {/* Orion Spur — minor arm through Sun's position */}
        <polyline points={orionSpur} fill="none" stroke={INK}
          strokeWidth="0.7" opacity="0.4" strokeDasharray="2 1.5" />

        {/* Central bar — elongated ellipse oriented ~25° from Sun-center line */}
        <ellipse cx="0" cy="0" rx={barHalfLen} ry={barHalfWidth}
          transform={`rotate(${barAngleDeg})`}
          fill={INK} opacity="0.12" stroke={INK} strokeWidth="0.6" />

        {/* Galactic bulge — central bright region */}
        <circle cx="0" cy="0" r={rMax * 0.10} fill={INK} opacity="0.10" />
        <circle cx="0" cy="0" r={rMax * 0.10} fill="none" stroke={INK} strokeWidth="0.5" opacity="0.55" />
        <text x={0} y={rMax * 0.10 + 7} textAnchor="middle" fontSize="4"
          fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.4"
          style={{ fontStyle: 'italic' }}>bulge</text>

        {/* Galactic center dot */}
        <circle cx="0" cy="0" r="2.5" fill={INK} />

        {/* Arm labels — placed near outer end of each arm */}
        {arms.map((arm) => {
          const pos = armLabelPos(arm.offset);
          return (
            <text key={`lbl-${arm.name}`} x={pos.x} y={pos.y - 4}
              textAnchor="middle" fontSize="4.5"
              fontFamily="JetBrains Mono, monospace" fill={INK} opacity="0.5">
              {arm.name}
            </text>
          );
        })}

        {/* Orion Spur label */}
        <text x={sunX + 4} y={sunY - 10} textAnchor="start" fontSize="3.8"
          fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.45"
          style={{ fontStyle: 'italic' }}>Orion Spur</text>

        {/* Sun position — gold marker */}
        <circle cx={sunX} cy={sunY} r="7" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.7" />
        <circle cx={sunX} cy={sunY} r="2.4" fill={GOLD} />

        {/* ── Edge-on mini diagram ── */}
        <g transform={`translate(0, ${rMax + 18})`}>
          {/* Disk edge-on — thin ellipse */}
          <ellipse cx="0" cy="0" rx={rMax * 0.50} ry={rMax * 0.02}
            fill={INK} opacity="0.08" stroke={INK} strokeWidth="0.4" />
          {/* Bulge — rounder central region */}
          <ellipse cx="0" cy="0" rx={rMax * 0.06} ry={rMax * 0.045}
            fill={INK} opacity="0.12" stroke={INK} strokeWidth="0.4" />
          {/* Sun marker — slightly above the galactic plane */}
          <circle cx={rMax * 0.26} cy={-1.8} r="1.3" fill={GOLD} />
          <line x1={rMax * 0.26} y1={0} x2={rMax * 0.26} y2={-1.8}
            stroke={GOLD} strokeWidth="0.4" opacity="0.5" />
          <text x={rMax * 0.26 + 4} y={-2.5} fontSize="3.3"
            fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.45">
            ~56 ly above plane
          </text>
          <text x={-rMax * 0.50 - 3} y={1.5} textAnchor="end" fontSize="3.3"
            fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.35"
            style={{ fontStyle: 'italic' }}>edge-on</text>
        </g>
      </g>
    </svg>
  );
}

// ───────── 5. VIRGO SUPERCLUSTER / LANIAKEA ─────────
// Galaxy clusters placed at approximate real positions from Tully et al. 2014 survey data.
// Positions in supergalactic projection, normalized so ±1 = ±110 Mly from Virgo.
// Node sizes proportional to cluster mass. Milky Way (Local Group) on the outskirts.
function NodeSupercluster({ size = 180 }) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.44; // ±110 Mly

  // Clusters: (x,y) in normalized supergalactic coords centered on Virgo, r proportional to mass
  // MW/Local Group at ~54 Mly from Virgo → 54/110 ≈ 0.49 of rMax
  const clusters = [
    { x:  0.00, y:  0.00, r: 4.0, name: 'Virgo' },
    { x: -0.49, y:  0.05, r: 1.2, name: 'Local Grp', milkyWay: true },
    { x: -0.53, y: -0.30, r: 2.0, name: 'Fornax' },
    { x:  0.48, y: -0.22, r: 3.0, name: 'Centaurus' },
    { x:  0.68, y: -0.45, r: 2.5, name: 'Hydra' },
    { x:  0.82, y: -0.35, r: 2.5, name: 'Norma' },
    { x: -0.80, y: -0.48, r: 2.8, name: 'Perseus-Pisces' },
    { x:  0.55, y:  0.42, r: 2.0, name: 'Pavo-Indus' },
    { x: -0.20, y: -0.18, r: 1.5, name: 'Leo' },
    { x:  0.30, y:  0.60, r: 3.2, name: 'Coma' },
    { x: -0.12, y:  0.48, r: 1.5, name: 'Ursa Major' },
    { x:  0.22, y: -0.30, r: 1.5, name: 'Antlia' },
    { x: -0.66, y: -0.10, r: 1.5, name: 'Eridanus' },
  ];

  // Filaments follow the cosmic web: backbone runs Perseus-Pisces → Virgo → Centaurus → Norma
  const edges = [
    // Main backbone
    [6, 2], [2, 0], [0, 3], [3, 4], [4, 5],
    // Virgo hub connections
    [0, 8], [0, 10], [0, 11], [0, 9], [0, 1],
    // Local Group neighborhood
    [1, 2], [1, 12], [1, 10],
    // Cross-connections
    [6, 12], [7, 3], [7, 9],
    [8, 2], [8, 11],
    [9, 10], [3, 11],
  ];

  // Cosmic voids — large empty regions between filaments
  const voids = [
    { x: -0.55, y:  0.40, r: 0.22, name: 'Local Void' },
    { x: -0.28, y: -0.55, r: 0.18, name: 'Sculptor Void' },
    { x:  0.42, y:  0.55, r: 0.16, name: 'Microscopium Void' },
    { x:  0.75, y:  0.10, r: 0.15, name: 'Ophiuchus Void' },
  ];

  const proj = (p) => ({ x: p.x * rMax, y: p.y * rMax });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Bounding circle — Laniakea extent */}
        <circle cx="0" cy="0" r={rMax * 1.02} fill="none" stroke={INK_SOFT} strokeWidth="0.4" opacity="0.35" />

        {/* Cosmic voids — subtle labeled empty regions */}
        {voids.map((v, i) => {
          const vp = proj(v);
          return (
            <g key={`void-${i}`}>
              <circle cx={vp.x} cy={vp.y} r={v.r * rMax}
                fill="none" stroke={INK_SOFT} strokeWidth="0.4"
                strokeDasharray="2 2.5" opacity="0.3" />
              <text x={vp.x} y={vp.y + 2} textAnchor="middle" fontSize="3.8"
                fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.30"
                style={{ fontStyle: 'italic' }}>
                {v.name}
              </text>
            </g>
          );
        })}

        {/* Filaments */}
        {edges.map(([i, j], k) => {
          const a = proj(clusters[i]);
          const b = proj(clusters[j]);
          return (
            <line key={`e-${k}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={INK} strokeWidth="0.6" opacity="0.45" />
          );
        })}

        {/* Cluster nodes — sized by mass */}
        {clusters.map((c, i) => {
          const p = proj(c);
          if (c.milkyWay) {
            return (
              <g key={`n-${i}`}>
                <circle cx={p.x} cy={p.y} r={c.r} fill={INK} />
                <circle cx={p.x} cy={p.y} r="7" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.7" />
                <circle cx={p.x} cy={p.y} r="2.4" fill={GOLD} />
              </g>
            );
          }
          return <circle key={`n-${i}`} cx={p.x} cy={p.y} r={c.r} fill={INK} />;
        })}

        {/* Cluster labels */}
        {clusters.map((c, i) => {
          const p = proj(c);
          // Offset label direction away from center to reduce overlap
          const dist = Math.sqrt(c.x * c.x + c.y * c.y) || 1;
          const offy = c.y >= 0 ? c.r + 6 : -(c.r + 3);
          return (
            <text key={`lbl-${i}`}
              x={p.x} y={p.y + offy}
              textAnchor="middle" fontSize={c.name === 'Virgo' ? '5.5' : '4'}
              fontFamily="JetBrains Mono, monospace"
              fill={c.milkyWay ? GOLD : INK}
              opacity={c.milkyWay ? 0.8 : 0.55}>
              {c.name}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

// ───────── 6. OBSERVABLE UNIVERSE ─────────
// Concentric rings at meaningful redshift/distance milestones, logarithmically spaced.
// Cosmic web texture fills the interior. Observer at center. Diameter ~93 Gly comoving.
function NodeUniverse({ size = 180 }) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.46;

  // Redshift milestones with comoving distance in Gly
  const milestones = [
    { d: 0.14,  label: 'Local structure',  labelAngle: 25 },
    { d: 1.3,   label: 'CfA Great Wall',   labelAngle: 165 },
    { d: 5.8 },
    { d: 10.8,  label: 'z≈1',              labelAngle: -55 },
    { d: 17.2 },
    { d: 27.6,  label: 'Reionization, z≈6', labelAngle: -145 },
    { d: 46.5,  label: 'Last Scattering Surface, z≈1090', labelAngle: -90 },
  ];

  // Logarithmic mapping: comoving distance → visual radius
  const logMin = Math.log10(milestones[0].d);
  const logMax = Math.log10(milestones[milestones.length - 1].d);
  const rMin = rMax * 0.08;
  const ringR = (d) => rMin + (Math.log10(d) - logMin) / (logMax - logMin) * (rMax - rMin);

  // ── Cosmic web texture ──
  // Scattered dots with density decreasing outward (fewer galaxies at high z)
  const webDots = [];
  for (let i = 0; i < 130; i++) {
    const angle = i * 137.508 * Math.PI / 180; // golden angle
    const rFrac = Math.pow((i + 0.5) / 130, 0.55); // bias toward center
    const r = rFrac * rMax * 0.92;
    const jr = ((i * 17 + 5) % 9 - 4) * 0.7;
    webDots.push({
      x: (r + jr) * Math.cos(angle),
      y: (r + jr) * Math.sin(angle),
      s: 0.4 + (i % 3) * 0.12,
      op: 0.12 * (1 - rFrac * 0.7),
    });
  }
  // Short filament segments suggesting large-scale structure
  const webSegs = [];
  for (let i = 0; i < 40; i++) {
    const angle = i * 97.3 * Math.PI / 180;
    const rFrac = Math.pow((i + 0.5) / 40, 0.5);
    const r = rFrac * rMax * 0.85;
    const len = (2 + (i % 3) * 1.5) * (1 - rFrac * 0.5);
    const la = angle + (i % 5 - 2) * 0.35;
    webSegs.push({
      x1: r * Math.cos(angle) - len * Math.cos(la),
      y1: r * Math.sin(angle) - len * Math.sin(la),
      x2: r * Math.cos(angle) + len * Math.cos(la),
      y2: r * Math.sin(angle) + len * Math.sin(la),
      op: 0.07 * (1 - rFrac * 0.5),
    });
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Cosmic web — dots */}
        {webDots.map((d, i) => (
          <circle key={`wd-${i}`} cx={d.x} cy={d.y} r={d.s} fill={INK} opacity={d.op} />
        ))}
        {/* Cosmic web — filament segments */}
        {webSegs.map((s, i) => (
          <line key={`ws-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={INK} strokeWidth="0.4" opacity={s.op} />
        ))}

        {/* Redshift rings — logarithmically spaced */}
        {milestones.map((m, i) => {
          const r = ringR(m.d);
          const isOuter = i === milestones.length - 1;
          return (
            <circle key={`ring-${i}`} cx="0" cy="0" r={r}
              fill="none" stroke={INK}
              strokeWidth={isOuter ? '1.0' : '0.7'}
              opacity={isOuter ? 0.65 : 0.2 + (1 - i / milestones.length) * 0.35} />
          );
        })}

        {/* Ring labels */}
        {milestones.map((m, i) => {
          if (!m.label) return null;
          const r = ringR(m.d);
          const a = (m.labelAngle * Math.PI) / 180;
          const isOuter = i === milestones.length - 1;
          const isInner = i === 0;
          // Inner ring is tiny — place label with a leader line
          if (isInner) {
            const lx = 18 * Math.cos(a);
            const ly = 18 * Math.sin(a);
            return (
              <g key={`rl-${i}`}>
                <line x1={r * Math.cos(a)} y1={r * Math.sin(a)}
                  x2={lx} y2={ly}
                  stroke={INK_SOFT} strokeWidth="0.4" opacity="0.4" />
                <text x={lx + 3} y={ly + 1.5} fontSize="3.5"
                  fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.45"
                  style={{ fontStyle: 'italic' }}>
                  {m.label}
                </text>
              </g>
            );
          }
          const lx = r * Math.cos(a);
          const ly = r * Math.sin(a);
          return (
            <text key={`rl-${i}`}
              x={lx} y={isOuter ? ly - 4 : ly - 3}
              textAnchor="middle" fontSize={isOuter ? '4.2' : '3.5'}
              fontFamily="JetBrains Mono, monospace"
              fill={INK} opacity={isOuter ? 0.55 : 0.4}
              style={{ fontStyle: 'italic' }}>
              {m.label}
            </text>
          );
        })}

        {/* Total diameter label */}
        <text x={0} y={rMax + 12} textAnchor="middle" fontSize="4"
          fontFamily="JetBrains Mono, monospace" fill={INK_SOFT} opacity="0.4">
          ~93 Gly comoving diameter
        </text>

        {/* Center — observer */}
        <circle cx="0" cy="0" r="7" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.6" />
        <circle cx="0" cy="0" r="2.6" fill={GOLD} />
      </g>
    </svg>
  );
}

Object.assign(window, {
  NodeHumans,
  NodeEarth,
  NodeSolarSystem,
  NodeGalaxy,
  NodeSupercluster,
  NodeUniverse,
});
