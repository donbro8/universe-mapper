# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"A Situation of a Person" — an interactive web visualization showing a person's location in the universe across six logarithmic scales: Human (1.7m), Earth (10⁷m), Solar System (10¹³m), Milky Way (10²¹m), Virgo Supercluster (10²⁴m), Observable Universe (10²⁶m).

## Primary Goal: Astronomical Accuracy

This app aims to be a **realistic depiction of our place in the universe**. All positioning and timing must be scientifically accurate:

- **Geolocation**: Latitude/longitude controls must map correctly to the orthographic globe projection
- **Time & shadow**: Day/night terminator on the Earth node must reflect the actual solar position for the given UTC date/time (via solar declination from `earthHeliocentricLongitude`)
- **Season**: Derived from Earth's heliocentric ecliptic longitude using J2000 epoch calculations — not approximated from calendar month
- **Solar system**: Planet positions use heliocentric longitude calculations; Earth's orbital position drives the date
- **Milky Way**: Sun placed ~60% out from galactic center along the Orion Spur arm
- **Virgo Supercluster**: Milky Way positioned on the outskirts of the Laniakea/Virgo structure
- **Observable Universe**: Observer at center of concentric CMB-like shells (93 Gly diameter)

When modifying any positioning or calculation, verify against the astronomy functions in `astronomy.jsx` and ensure the visual output matches real-world data for known dates.

## Running the App

No build step. Open `index.html` in a browser. All dependencies load via CDN (React 18, ReactDOM, Babel standalone). Edit `.jsx` files and reload.

Cache-busting: script tags use `?v=7` query params — increment when making changes during development.

## Architecture

**Single-page vanilla app** — 4 JSX files loaded in order via Babel in-browser transpilation:

1. **`astronomy.jsx`** — Pure calculation functions (Julian date, heliocentric longitude, GMST, sidereal time, Earth rotation, season, zodiac). All exported to `window` for global access. No React, no state.

2. **`constellations.jsx`** — SVG decorative constellation backgrounds (Ursa Major, Orion, Cassiopeia, Lyra, Cygnus, Scorpius). Pure presentation.

3. **`nodes.jsx`** (~770 LOC, the core) — Six SVG visualization components:
   - `NodeHumans` — Pioneer plaque-style figures (static)
   - `NodeEarth` — **Interactive** orthographic globe with day/night shadow, draggable to change lat/lon
   - `NodeSolarSystem` — **Interactive** orbital diagram, draggable to change date via Earth's orbital position
   - `NodeGalaxy` — Logarithmic spiral arms with Sun marker (static)
   - `NodeSupercluster` — Network graph of 18 galaxy clusters with filaments (static)
   - `NodeUniverse` — Concentric rings representing observable universe boundary (static)

4. **`app.jsx`** — Root `App` component: state management (date, lat, lon, tweaks), controls UI, localStorage persistence (`universe-location:state` key), Scene layout.

**`index.html`** — Styles (CSS custom properties with oklch colors), CDN scripts, React mount, viewport scaling (`fitStage()` maps 1920×720 virtual canvas to screen).

## Key Data Flow

- `App` state: `{ date: ISO string, lat: number, lon: number }` + tweaks
- State flows down: `App` → `Scene` → `AxisNode` wrappers → individual node SVGs
- Two interactive callbacks flow up:
  - `NodeEarth.onDrag(lat, lon)` — globe drag updates location
  - `NodeSolarSystem.onDragDate(newDate)` — orbit drag updates date
- Astronomy functions are called directly from node render code (e.g., `earthHeliocentricLongitude(date)` to position Earth in its orbit)

## Visual Design Constraints

- **Parchment aesthetic**: oklch color palette with warm/cool/pale paper tones
- **All graphics are SVG** — no Canvas, no WebGL, no external graphics libraries
- **Typography**: EB Garamond (serif) for labels, JetBrains Mono for technical data
- **Gold accent** (`--gold`) marks "you are here" across all scales
- Continent outlines in `NodeEarth` are hand-simplified polygons — not GeoJSON

## Edit Mode Protocol

The app supports an external editor integration via `postMessage`:
- Listens for `__activate_edit_mode` / `__deactivate_edit_mode`
- Posts `__edit_mode_available` and `__edit_mode_set_keys`
- Tweakable defaults wrapped in `/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` comments
