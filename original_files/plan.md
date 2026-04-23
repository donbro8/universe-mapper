# Accuracy Roadmap

A phased plan to make "A Situation of a Person" scientifically accurate at every scale.

---

## Phase 1: Fix Critical Errors

### 1.1 — Correct Jupiter and Saturn orbital radii

**Problem:** Jupiter is listed at 2.4 AU (actual: 5.203 AU) and Saturn at 3.0 AU (actual: 9.537 AU) — errors of 58% and 69%. The outer solar system is drastically compressed.

**Work:**
- Update semi-major axis values in `nodes.jsx` planet data
- Adjust the visual scaling so all 6 planets remain legible within the SVG viewport (likely logarithmic or split-scale radii)
- Add Uranus (19.19 AU) and Neptune (30.07 AU) while we're fixing this

**Acceptance criteria:**
- [ ] Planet distance ratios match NASA fact sheet values to within 1%
- [ ] All 8 planets are visible and labeled in the solar system node
- [ ] Earth's interactive drag behavior still works after rescaling

### 1.2 — Compute actual planetary phases (not arbitrary constants)

**Problem:** Other planets use hardcoded phase offsets. Their positions are wrong for any given date.

**Work:**
- Add mean longitude at J2000 epoch for each planet (from USNO/JPL data)
- Compute each planet's heliocentric longitude using `L0 + (360/period) * daysSinceJ2000`
- Apply first-order eccentricity correction (equation of center) for each planet

**Acceptance criteria:**
- [ ] On 2025-01-01, all planet longitudes match JPL Horizons output to within 3 degrees
- [ ] Changing the date moves all planets, not just Earth
- [ ] Mercury and Mars show visible eccentricity effects (non-uniform speed)

---

## Phase 2: Improve Earth Accuracy

### 2.1 — Improve continent outlines

**Problem:** Current hand-digitized continents use 3-5 degree resolution. Major islands (Japan, New Zealand, UK, Indonesia) are missing entirely.

**Work:**
- Replace continent polygon data with higher-resolution outlines (~1 degree segments)
- Add major islands: British Isles, Japan, New Zealand, Philippines, Indonesia, Madagascar, Sri Lanka, Caribbean islands
- Keep data inline (no external GeoJSON dependency) but improve fidelity

**Acceptance criteria:**
- [ ] All landmasses visible at 1:1 map scale are present
- [ ] Coastlines recognizable without labels (side-by-side comparison with a real globe)
- [ ] SVG polygon count stays under 2000 points total (performance)

### 2.2 — Fix day/night terminator precision

**Problem:** Sub-solar longitude uses a simplified `lon = -15 * (UTC_hours - 12)` formula that ignores the equation of time, causing up to ~16 minutes of error in shadow placement.

**Work:**
- Implement equation of time correction in `astronomy.jsx`
- Apply correction to sub-solar longitude calculation in `NodeEarth`
- Verify against USNO sunrise/sunset tables for known dates

**Acceptance criteria:**
- [ ] On the equinoxes, the terminator passes through the poles at the correct UTC hour
- [ ] Sub-solar point matches USNO data to within 0.5 degrees longitude for any date in 2024-2026
- [ ] Shadow visually shifts when stepping through hours near sunrise/sunset

---

## Phase 3: Enhance Solar System Realism

### 3.1 — Add orbital eccentricity to visual paths

**Problem:** All orbits are drawn as perfect circles. Mercury's orbit (e=0.206) is visibly elliptical in reality.

**Work:**
- Draw orbital paths as SVG ellipses with correct eccentricity and orientation
- Position the Sun at the correct focus (not the geometric center)
- Add perihelion/aphelion markers for Mercury and Mars (most eccentric inner planets)

**Acceptance criteria:**
- [ ] Mercury's orbit is visibly non-circular (semi-minor axis ~98% of semi-major)
- [ ] Sun is offset from orbit centers toward perihelion
- [ ] Planet speed visually varies along orbit (faster at perihelion per Kepler's 2nd law)

### 3.2 — Add orbital inclination indicators

**Problem:** All orbits are coplanar in the visualization. Mercury is inclined 7 degrees to the ecliptic.

**Work:**
- Add subtle visual indicator of inclination (slight vertical offset or tilt line)
- Not full 3D — just enough to communicate that orbits aren't perfectly flat
- Label the ecliptic plane

**Acceptance criteria:**
- [ ] Mercury shows the most pronounced inclination effect
- [ ] Earth's orbit defines the reference plane (0 degree inclination)
- [ ] A caption or label identifies the ecliptic

### 3.3 — Add asteroid belt and dwarf planets

**Work:**
- Add a scatter of dots between Mars and Jupiter for the asteroid belt
- Add Pluto's orbit (inclined, eccentric) as a dashed line
- Add Ceres marker in the belt

**Acceptance criteria:**
- [ ] Asteroid belt visually fills the gap between Mars and Jupiter
- [ ] Pluto's orbit crosses Neptune's and is visibly tilted
- [ ] Ceres is marked at its correct position for the current date

---

## Phase 4: Improve Galaxy Accuracy

### 4.1 — Switch to 4-arm barred spiral structure

**Problem:** The Milky Way is a barred spiral galaxy with 4 major arms. Current visualization shows only 2 arms and no bar.

**Work:**
- Redraw spiral using 4 arms: Perseus, Sagittarius-Carina, Scutum-Centaurus, Norma/Outer
- Add a central bar structure (~27,000 ly long, oriented ~45 degrees to Sun-center line)
- Place the Sun in the Orion Spur (minor arm between Perseus and Sagittarius)

**Acceptance criteria:**
- [ ] 4 distinct spiral arms are visible and labeled
- [ ] Central bar is rendered as an elongated ellipse
- [ ] Sun is in the Orion Spur, clearly between two major arms
- [ ] Overall diameter represents ~100,000 ly

### 4.2 — Add galactic structure layers

**Work:**
- Distinguish the disk (thin, contains arms), bulge (central bright region), and halo (faint outer sphere)
- Add globular cluster markers in the halo
- Show the galactic plane edge-on in a secondary small diagram

**Acceptance criteria:**
- [ ] Bulge, disk, and halo are visually distinct
- [ ] At least 5 globular cluster dots in the halo
- [ ] Sun's position above/below the galactic plane is noted (~56 ly above)

---

## Phase 5: Improve Supercluster Accuracy

### 5.1 — Use real cluster positions from observational data

**Problem:** The 18 galaxy cluster positions are hand-placed, not based on real data.

**Work:**
- Source positions for the major clusters in Laniakea from published survey data (e.g., Tully et al. 2014)
- Map real supergalactic coordinates to the SVG viewport
- Scale node sizes by cluster mass or galaxy count

**Acceptance criteria:**
- [ ] Virgo, Fornax, Centaurus, Hydra, Perseus-Pisces clusters placed at correct relative positions
- [ ] Milky Way (Local Group) distance from Virgo center is proportionally correct (~54 Mly / ~110 Mly total)
- [ ] Node sizes reflect relative mass (Virgo >> Local Group)

### 5.2 — Add cosmic voids

**Problem:** Voids are the dominant large-scale structure by volume. They're completely absent.

**Work:**
- Add labeled void regions (Local Void, Sculptor Void, etc.) as empty areas between filaments
- Style as subtle labeled regions with low opacity

**Acceptance criteria:**
- [ ] At least 3 named voids are labeled
- [ ] Voids visually dominate the space between filaments (as they do in reality)
- [ ] The Local Void is positioned correctly relative to the Local Group

---

## Phase 6: Improve Universe Accuracy

### 6.1 — Add redshift-based structure to concentric rings

**Problem:** The 11 rings are evenly spaced and carry no physical meaning.

**Work:**
- Map rings to meaningful redshift/distance milestones:
  - z=0: Observer (here)
  - z~0.01: Local large-scale structure (~140 Mly)
  - z~0.1: CfA Great Wall (~1 Gly)
  - z~0.5: Peak of galaxy formation lookback
  - z~1: ~8 Gly lookback
  - z~6: Epoch of reionization
  - z~1090: CMB last scattering surface (46.5 Gly comoving)
- Label at least the CMB, reionization, and local structure rings

**Acceptance criteria:**
- [ ] Rings are spaced logarithmically (not linearly) to reflect the distance scale
- [ ] CMB ring is the outermost, labeled "Last Scattering Surface, z~1090"
- [ ] At least 4 rings have distance/era labels
- [ ] Total diameter labeled as ~93 Gly (comoving)

### 6.2 — Add cosmic web slice

**Work:**
- Overlay a faint texture suggesting the filamentary large-scale structure inside the rings
- Can be procedural (seeded noise) or hand-drawn — not data-driven, but evocative

**Acceptance criteria:**
- [ ] A visible web-like texture fills the interior of the universe node
- [ ] Density of texture decreases toward the outer rings (fewer galaxies at high redshift)
- [ ] The texture is subtle enough not to compete with the rings and labels

---

## Phase 7: Astronomy Engine Hardening

### 7.1 — Add precession and nutation corrections

**Problem:** The astronomy functions ignore Earth's axial precession (~50 arcsec/year) and nutation. Over decades, positions drift.

**Work:**
- Add precession correction to GMST calculation
- Add principal nutation term (18.6-year lunar cycle)
- Apply obliquity correction to solar declination

**Acceptance criteria:**
- [ ] GMST matches USNO values to within 1 second of time for dates 2000-2050
- [ ] Solar declination matches USNO values to within 0.1 degree
- [ ] Season boundaries shift correctly for dates far from J2000

### 7.2 — Add Southern Hemisphere season awareness

**Problem:** Season labels are hardcoded for Northern Hemisphere.

**Work:**
- When latitude is negative, invert season labels (NH Spring = SH Autumn, etc.)
- Update any season-dependent visuals or text

**Acceptance criteria:**
- [ ] Setting latitude to -33.87 (Sydney) shows "Autumn" in March and "Spring" in September
- [ ] Season glyph or label updates reactively when crossing the equator
- [ ] No change to the underlying orbital mechanics — only the label mapping

---

## Phase 8: Polish & Presentation

### 8.1 — Update title and subtitle

**Problem:** Title reads "A Situation of a Person" — should be "The Situation of a Human". Subtitle should read "your when and where in the universe, recorded".

**Work:**
- Update title in `app.jsx` header: `"THE SITUATION OF A HUMAN"`
- Update subtitle: `"· your when and where in the universe, recorded ·"`

**Acceptance criteria:**
- [ ] Title reads "THE SITUATION OF A HUMAN"
- [ ] Subtitle reads "· your when and where in the universe, recorded ·"

### 8.2 — Align node headings and sub-headings

**Problem:** Node captions (HUMAN, EARTH, SOLAR SYSTEM, etc.) are not vertically aligned with each other — they shift based on node size and vertical position.

**Work:**
- Ensure all node labels and sub-labels share a consistent baseline or alignment strategy
- All headings and sub-headings should line up horizontally across the axis

**Acceptance criteria:**
- [ ] All 6 node headings (HUMAN, EARTH, SOLAR SYSTEM, MILKY WAY, VIRGO SUPERCLUSTER, OBSERVABLE UNIVERSE) are vertically aligned
- [ ] Sub-headings are aligned with each other below the main headings
- [ ] Alignment is preserved across different viewport sizes

### 8.3 — Improve background constellations

**Problem:** Background constellations are not astronomically accurate depictions and their styling could be more subtle.

**Work:**
- Redraw constellation patterns in `constellations.jsx` to match real star positions and traditional stick-figure connections
- Restyle to a lighter, more silver/pale colour — still visible but more obscure
- Make them larger to fill the background better

**Acceptance criteria:**
- [ ] Constellation star patterns match real IAU stick-figure diagrams
- [ ] Colour is lighter/silver rather than the current ink tone
- [ ] Constellations are scaled larger than current size
- [ ] Still visible against the parchment background without competing with the nodes

### 8.4 — Add SVG export feature

**Problem:** No way to save the visualization as an image.

**Work:**
- Add an "Export SVG" button (in controls or tweaks panel)
- When clicked, serialize the scene (all 6 nodes + axis + constellations) into a standalone SVG document
- Exclude controls, tweaks panel, and any interactive UI elements
- Trigger a file download of the resulting `.svg`

**Acceptance criteria:**
- [ ] An "Export" button is visible in the UI
- [ ] Clicking it downloads an SVG file containing the full visualization
- [ ] The exported SVG renders correctly when opened in a browser or vector editor
- [ ] Controls, sliders, buttons, and tweaks panel are excluded from the export
- [ ] Current date, location, and all computed positions are baked into the export

---

## Phase Ordering Rationale

| Phase | Impact | Effort | Why this order |
|-------|--------|--------|----------------|
| 1 | **Critical** | Low | Fixes factual errors visible to anyone who knows basic astronomy |
| 2 | High | Medium | Earth is the most interactive and scrutinized node |
| 3 | High | Medium | Solar System is the second interactive node, and eccentricity matters |
| 4 | Medium | Medium | Galaxy structure is well-known; current 2-arm version looks wrong |
| 5 | Medium | High | Requires sourcing real data; current version is passable |
| 6 | Medium | Medium | Universe node is the least interactive; improvements are labeling |
| 7 | Low | Low | Precision improvements; current accuracy is fine for most users |
| 8 | Medium | Medium | Presentation polish — title, alignment, constellation accuracy, and export |
