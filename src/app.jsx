// Main app — composes the 6 nodes along a logarithmic axis,
// wires date/location controls, and renders the constellation background.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConstellationDeco, StarGlyph } from './constellations.jsx';
import { NodeHumans, NodeEarth, NodeSolarSystem, NodeGalaxy, NodeSupercluster, NodeUniverse } from './nodes.jsx';
import {
  earthHeliocentricLongitude, trueObliquity, subSolarLongitude,
  seasonFromDate, zodiacFromDate, formatCoords,
  moonEquatorialPosition, moonAltAz, daysSinceJ2000,
} from './astronomy.jsx';

// Editable number field — displays formatted value, lets user type freely, commits on blur/Enter
function EditableCoord({ value, min, max, onChange }) {
  const [text, setText] = useState(value.toFixed(2));
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  // Sync display when value changes externally (slider, drag) and user isn't editing
  useEffect(() => {
    if (!focused) setText(value.toFixed(2));
  }, [value, focused]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className="ctrl-val ctrl-val-input"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const v = parseFloat(text);
        if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        else setText(value.toFixed(2));
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') ref.current.blur(); }}
    />
  );
}

// ─── Tweakable defaults ───
const TWEAKS = /*EDITMODE-BEGIN*/{
  "showConstellations": true,
  "showCaptions": true,
  "showAxisTicks": true,
  "paperTone": "warm"
}/*EDITMODE-END*/;

// Preset cities
const CITIES = [
  { name: 'New York',      lat:  40.7128, lon:  -74.0060 },
  { name: 'London',        lat:  51.5074, lon:   -0.1278 },
  { name: 'Tokyo',         lat:  35.6762, lon:  139.6503 },
  { name: 'Sydney',        lat: -33.8688, lon:  151.2093 },
  { name: 'Cape Town',     lat: -33.9249, lon:   18.4241 },
  { name: 'Rio',           lat: -22.9068, lon:  -43.1729 },
  { name: 'Reykjavík',     lat:  64.1466, lon:  -21.9426 },
  { name: 'Mumbai',        lat:  19.0760, lon:   72.8777 },
];

function pad(n, w = 2) {
  return String(n).padStart(w, '0');
}

function Controls({ state, setState, tweaks, setTweak, onExport }) {
  const { date, lat, lon } = state;
  const d = new Date(date);
  const [showMessageInput, setShowMessageInput] = useState(!!state.message);

  const setDatePart = (part, val) => {
    const nd = new Date(date);
    if (part === 'year') nd.setUTCFullYear(val);
    if (part === 'month') nd.setUTCMonth(val);
    if (part === 'day') nd.setUTCDate(val);
    if (part === 'hour') nd.setUTCHours(val);
    if (part === 'minute') nd.setUTCMinutes(val);
    setState({ ...state, date: nd.toISOString() });
  };

  return (
    <div className="controls">
      {/* ── MESSAGE ── */}
      <div className="ctrl-group">
        <div className="ctrl-group-label">MESSAGE</div>
        <div className="ctrl-row">
          {!showMessageInput ? (
            <button className="chip" onClick={() => setShowMessageInput(true)}>
              + add message
            </button>
          ) : (
            <div className="ctrl-inline">
              <input
                type="text"
                className="ctrl-val-input"
                style={{
                  width: '160px',
                  fontFamily: '"EB Garamond", serif',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: 'var(--ink)'
                }}
                maxLength={80}
                placeholder="Optional message..."
                value={state.message || ''}
                onChange={(e) => setState({ ...state, message: e.target.value })}
              />
              <button
                className="chip"
                style={{ padding: '0 4px', fontSize: '14px', border: 'none', background: 'transparent' }}
                onClick={() => {
                  setShowMessageInput(false);
                  setState({ ...state, message: '' });
                }}
                title="Remove message"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── WHEN ── */}
      <div className="ctrl-group">
        <div className="ctrl-group-label">WHEN</div>
        <div className="ctrl-row">
          <label className="ctrl-label">DATE</label>
          <div className="ctrl-inline">
            <input type="number" className="ctrl-num"
              value={d.getUTCFullYear()}
              onChange={(e) => setDatePart('year', parseInt(e.target.value) || 0)}
              style={{ width: '4.5ch' }} />
            <span className="sep">/</span>
            <select className="ctrl-num" value={d.getUTCMonth()}
              onChange={(e) => setDatePart('month', parseInt(e.target.value))}>
              {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <span className="sep">/</span>
            <input type="number" className="ctrl-num" min="1" max="31"
              value={d.getUTCDate()}
              onChange={(e) => setDatePart('day', parseInt(e.target.value) || 1)}
              style={{ width: '3ch' }} />
          </div>
        </div>
        <div className="ctrl-row">
          <label className="ctrl-label">TIME</label>
          <div className="ctrl-inline">
            <input type="number" className="ctrl-num" min="0" max="23"
              value={d.getUTCHours()}
              onChange={(e) => setDatePart('hour', parseInt(e.target.value) || 0)}
              style={{ width: '3ch' }} />
            <span className="sep">:</span>
            <input type="number" className="ctrl-num" min="0" max="59"
              value={d.getUTCMinutes()}
              onChange={(e) => setDatePart('minute', parseInt(e.target.value) || 0)}
              style={{ width: '3ch' }} />
            <span className="sep sep-utc">UTC</span>
          </div>
          <button className="chip chip-now"
            onClick={() => setState({ ...state, date: new Date().toISOString() })}>
            now
          </button>
        </div>
      </div>

      {/* ── WHERE ── */}
      <div className="ctrl-group">
        <div className="ctrl-group-label">WHERE</div>
        <div className="ctrl-row">
          <label className="ctrl-label">LAT</label>
          <input type="range" min="-90" max="90" step="0.1" value={lat}
            onChange={(e) => setState({ ...state, lat: parseFloat(e.target.value) })} />
          <EditableCoord value={lat} min={-90} max={90}
            onChange={(v) => setState({ ...state, lat: v })} />
          <span className="ctrl-val" style={{ width: '1ch' }}>°</span>
        </div>
        <div className="ctrl-row">
          <label className="ctrl-label">LON</label>
          <input type="range" min="-180" max="180" step="0.1" value={lon}
            onChange={(e) => setState({ ...state, lon: parseFloat(e.target.value) })} />
          <EditableCoord value={lon} min={-180} max={180}
            onChange={(v) => setState({ ...state, lon: v })} />
          <span className="ctrl-val" style={{ width: '1ch' }}>°</span>
        </div>
        <div className="ctrl-row">
          <div className="ctrl-chips">
            {CITIES.map((c) => (
              <button key={c.name} className="chip"
                onClick={() => setState({ ...state, lat: c.lat, lon: c.lon })}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DISPLAY ── */}
      {tweaks && setTweak && (
        <div className="ctrl-group">
          <div className="ctrl-group-label">DISPLAY</div>
          <div className="ctrl-row">
            <div className="ctrl-chips">
              <label className="chip-toggle">
                <input type="checkbox" checked={tweaks.showConstellations}
                  onChange={(e) => setTweak('showConstellations', e.target.checked)} />
                <span>constellations</span>
              </label>
              <label className="chip-toggle">
                <input type="checkbox" checked={tweaks.showCaptions}
                  onChange={(e) => setTweak('showCaptions', e.target.checked)} />
                <span>captions</span>
              </label>
              <label className="chip-toggle">
                <input type="checkbox" checked={tweaks.showAxisTicks}
                  onChange={(e) => setTweak('showAxisTicks', e.target.checked)} />
                <span>scale</span>
              </label>
            </div>
          </div>
          <div className="ctrl-row">
            <label className="ctrl-label">PAPER</label>
            <div className="ctrl-chips">
              {['warm', 'cool', 'pale'].map((t) => (
                <button key={t}
                  className={'chip' + (tweaks.paperTone === t ? ' chip-active' : '')}
                  onClick={() => setTweak('paperTone', t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {onExport && (
            <div className="ctrl-row">
              <button className="chip export-btn" onClick={onExport} title="Export as PNG">
                Export ↗
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// One node on the axis: circle with SVG inside + caption
// captionTop: absolute Y within the stage where the caption should appear
function AxisNode({ x, y, width, children, label, sub, caption, showCaption, captionTop }) {
  return (
    <div
      className="node"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
      }}
    >
      <div className="node-svg">{children}</div>
      {showCaption && (
        <div className="node-caption" style={captionTop != null ? { top: `${captionTop - y}px` } : undefined}>
          <div className="node-label">{label}</div>
          {sub && <div className="node-sub">{sub}</div>}
          {caption && <div className="node-mono">{caption}</div>}
        </div>
      )}
    </div>
  );
}

function Scene({ state, setState, tweaks }) {
  const d = new Date(state.date);

  // Layout: axis positions for each node (0..1 along the scene)
  // Visual spacing is logarithmic in nature — but we hand-place for composition.
  const NODES = [
    { t: 0.03, size: 170 },  // humans
    { t: 0.18, size: 200 },  // Earth
    { t: 0.34, size: 240 },  // Solar System
    { t: 0.51, size: 250 },  // Galaxy
    { t: 0.68, size: 250 },  // Supercluster
    { t: 0.85, size: 260 },  // Universe
  ];

  // Logarithmic scale labels (meters)
  const SCALES = [
    { m: 1.7,        label: '10⁰ m',  name: 'Human' },
    { m: 1.27e7,     label: '10⁷ m',  name: 'Earth' },
    { m: 1.4e13,     label: '10¹³ m', name: 'Solar System' },
    { m: 1e21,       label: '10²¹ m', name: 'Milky Way' },
    { m: 3e24,       label: '10²⁴ m', name: 'Virgo Supercluster' },
    { m: 8.8e26,     label: '10²⁶ m', name: 'Observable Universe' },
  ];

  // Stage size. Banner-shaped like the references.
  const W = 1920;
  const H = 720;
  const axisY = H * 0.5;

  // Positions
  const positions = NODES.map((n) => ({
    ...n,
    x: W * n.t + W * 0.03,
    y: axisY,
  }));

  return (
    <div className="stage">
      <div
        className="stage-inner"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '1920px',
          height: '720px',
          marginLeft: '-960px',
          marginTop: '-360px',
          transformOrigin: 'center center',
        }}
      >
        {/* BACKGROUND CONSTELLATIONS */}
        {tweaks.showConstellations && (
          <svg className="bg-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <ConstellationDeco name="Orion"      x={W*0.04}  y={H*-0.02} w={300} h={300} rotation={-8}  opacity={0.35} />
            <ConstellationDeco name="Ursa Major" x={W*0.25}  y={H*-0.04} w={440} h={200} rotation={6}   opacity={0.32} />
            <ConstellationDeco name="Cassiopeia" x={W*0.52}  y={H*-0.02} w={360} h={160} rotation={-4}  opacity={0.35} />
            <ConstellationDeco name="Lyra"       x={W*0.78}  y={H*-0.02} w={280} h={280} rotation={12}  opacity={0.33} />

            <ConstellationDeco name="Scorpius"   x={W*0.02}  y={H*0.58}  w={360} h={300} rotation={10}  opacity={0.32} />
            <ConstellationDeco name="Cygnus"     x={W*0.28}  y={H*0.60}  w={320} h={320} rotation={-8}  opacity={0.35} />
            <ConstellationDeco name="Cassiopeia" x={W*0.55}  y={H*0.64}  w={360} h={160} rotation={14}  opacity={0.32} />
            <ConstellationDeco name="Orion"      x={W*0.78}  y={H*0.56}  w={300} h={340} rotation={-12} opacity={0.35} />

            <StarGlyph x={W*0.03} y={H*0.5}  size={6}  opacity={0.30} />
            <StarGlyph x={W*0.97} y={H*0.5}  size={8}  opacity={0.35} />
            <StarGlyph x={W*0.5}  y={H*0.94} size={7}  opacity={0.28} />
          </svg>
        )}

        {/* AXIS LINE */}
        <svg className="axis-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <line
            x1={W * 0.03}
            y1={axisY}
            x2={W * 0.97}
            y2={axisY}
            stroke="var(--ink)"
            strokeWidth="0.9"
            opacity="0.9"
          />
          {/* Tick marks at each node */}
          {tweaks.showAxisTicks && positions.map((p, i) => (
            <g key={`tick-${i}`} transform={`translate(${p.x}, ${axisY})`}>
              <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink)" strokeWidth="0.8" opacity="0.7" />
            </g>
          ))}
          {/* Scale labels below captions */}
          {tweaks.showAxisTicks && positions.map((p, i) => (
            <text
              key={`sl-${i}`}
              x={p.x}
              y={axisY + 250}
              textAnchor="middle"
              className="axis-scale-label"
            >
              {SCALES[i].label}
            </text>
          ))}
        </svg>

        {/* NODES — positioned absolutely */}
        {/* All captions aligned to a consistent Y baseline */}
        <div className="nodes-layer" style={{ width: `${W}px`, height: `${H}px` }}>
          <AxisNode
            x={positions[0].x - positions[0].size / 2}
            y={positions[0].y - positions[0].size * 0.6}
            width={positions[0].size}
            captionTop={axisY + 150}
            label="HUMAN"
            sub="Homo sapiens"
            caption="≈ 1.7 m"
            showCaption={tweaks.showCaptions}
          >
            <NodeHumans size={positions[0].size} />
          </AxisNode>

          <AxisNode
            x={positions[1].x - positions[1].size / 2}
            y={positions[1].y - positions[1].size / 2}
            width={positions[1].size}
            captionTop={axisY + 150}
            label="EARTH"
            sub={`${seasonFromDate(d, state.lat).toLowerCase()} · ${zodiacFromDate(d).toLowerCase()}`}
            caption={formatCoords(state.lat, state.lon)}
            showCaption={tweaks.showCaptions}
          >
            <NodeEarth
              size={positions[1].size}
              lat={state.lat}
              lon={state.lon}
              date={d}
              onDrag={({lat, lon}) => setState({ ...state, lat, lon })}
            />
          </AxisNode>

          <AxisNode
            x={positions[2].x - positions[2].size / 2}
            y={positions[2].y - positions[2].size / 2}
            width={positions[2].size}
            captionTop={axisY + 150}
            label="SOLAR SYSTEM"
            sub="Sol · 8 planets"
            caption={`Sun in ${zodiacFromDate(d)}`}
            showCaption={tweaks.showCaptions}
          >
            <NodeSolarSystem
              size={positions[2].size}
              date={d}
              lat={state.lat}
              onDragDate={(nd) => setState({ ...state, date: nd.toISOString() })}
            />
          </AxisNode>

          <AxisNode
            x={positions[3].x - positions[3].size / 2}
            y={positions[3].y - positions[3].size / 2}
            width={positions[3].size}
            captionTop={axisY + 150}
            label="MILKY WAY"
            sub="barred spiral"
            caption="~ 26,000 ly from core"
            showCaption={tweaks.showCaptions}
          >
            <NodeGalaxy size={positions[3].size} />
          </AxisNode>

          <AxisNode
            x={positions[4].x - positions[4].size / 2}
            y={positions[4].y - positions[4].size / 2}
            width={positions[4].size}
            captionTop={axisY + 150}
            label="VIRGO SUPERCLUSTER"
            sub="Laniakea, outskirts"
            caption="~ 110 Mly across"
            showCaption={tweaks.showCaptions}
          >
            <NodeSupercluster size={positions[4].size} />
          </AxisNode>

          <AxisNode
            x={positions[5].x - positions[5].size / 2}
            y={positions[5].y - positions[5].size / 2}
            width={positions[5].size}
            captionTop={axisY + 150}
            label="OBSERVABLE UNIVERSE"
            sub="all that is visible"
            caption="~ 93 Gly diameter"
            showCaption={tweaks.showCaptions}
          >
            <NodeUniverse size={positions[5].size} />
          </AxisNode>
        </div>

        {/* CUSTOM MESSAGE */}
        {state.message && (
          <div
            className="custom-message"
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              width: '100%',
              zIndex: 10,
            }}
          >
            {state.message}
          </div>
        )}
      </div>

    </div>
  );
}

function App() {
  // Location/date state — persisted across reload
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem('universe-location:state');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          date: parsed.date || new Date().toISOString(),
          lat: parsed.lat || 40.7128,
          lon: parsed.lon || -74.006,
          message: parsed.message || '',
        };
      } catch (e) {}
    }
    return {
      date: new Date().toISOString(),
      lat: 40.7128,
      lon: -74.006,
      message: '',
    };
  });
  useEffect(() => {
    localStorage.setItem('universe-location:state', JSON.stringify(state));
  }, [state]);

  // Tweaks
  const [tweaks, setTweaks] = useState(TWEAKS);

  useEffect(() => {
    // Apply paper tone via data attribute
    document.documentElement.setAttribute('data-paper', tweaks.paperTone);
  }, [tweaks.paperTone]);

  // Fit stage to viewport — scales the 1920×720 virtual canvas
  useEffect(() => {
    function fitStage() {
      const stage = document.querySelector('.stage-inner');
      if (!stage) return;
      const parent = stage.parentElement;
      const availW = parent.clientWidth - 20;
      const availH = parent.clientHeight - 20;
      const scale = Math.min(availW / 1920, availH / 720);
      stage.style.transform = `scale(${scale})`;
    }
    // Initial fits (delayed to wait for render)
    const t1 = setTimeout(fitStage, 50);
    const t2 = setTimeout(fitStage, 300);
    const t3 = setTimeout(fitStage, 800);
    window.addEventListener('resize', fitStage);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', fitStage);
    };
  }, []);

  // Edit-mode protocol
  useEffect(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === '__activate_edit_mode' || t === '__deactivate_edit_mode') {
        // Edit mode handled inline in controls now
      }
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (key, val) => {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  };

  // Export as PNG — renders SVGs to canvas, draws text, composes final image
  const exportPNG = () => {
    const stageInner = document.querySelector('.stage-inner');
    const header = document.querySelector('.app-header');
    if (!stageInner) return;

    // Resolve CSS var() and oklch/color-mix to browser-native rgb
    const rootCs = getComputedStyle(document.documentElement);
    const resolveColor = (str) => {
      if (!str) return str;
      let resolved = str.replace(/var\(--([^,)]+)(?:,[^)]+)?\)/g, (_, name) => {
        return rootCs.getPropertyValue('--' + name).trim() || '';
      });
      if (resolved.includes('oklch') || resolved.includes('color-mix')) {
        const tmp = document.createElement('div');
        tmp.style.color = resolved;
        document.body.appendChild(tmp);
        resolved = getComputedStyle(tmp).color;
        document.body.removeChild(tmp);
      }
      return resolved;
    };

    // Clone an SVG and inline all computed styles so it renders standalone
    const cleanSvg = (svg) => {
      const clone = svg.cloneNode(true);
      const origEls = svg.querySelectorAll('*');
      const cloneEls = clone.querySelectorAll('*');

      const inlineStyles = (origEl, cloneEl) => {
        const cs = getComputedStyle(origEl);
        // Inline fill/stroke/opacity from computed style (captures CSS class rules)
        ['fill', 'stroke', 'opacity'].forEach((prop) => {
          const val = cs.getPropertyValue(prop);
          if (val && val !== 'none' && val !== '') {
            cloneEl.setAttribute(prop, val);
          }
        });
        // Font properties for text elements
        if (origEl instanceof SVGTextElement || origEl.tagName === 'text' || origEl.tagName === 'tspan') {
          ['font-family', 'font-size', 'font-style', 'font-weight', 'letter-spacing', 'text-anchor'].forEach((prop) => {
            const val = cs.getPropertyValue(prop);
            if (val) cloneEl.setAttribute(prop, val);
          });
        }
        // stop-color for gradient stops
        if (origEl.tagName === 'stop') {
          const sc = cs.getPropertyValue('stop-color');
          const so = cs.getPropertyValue('stop-opacity');
          if (sc) cloneEl.setAttribute('stop-color', sc);
          if (so) cloneEl.setAttribute('stop-opacity', so);
        }
      };

      // Inline on all child elements
      for (let i = 0; i < origEls.length; i++) {
        inlineStyles(origEls[i], cloneEls[i]);
      }
      return clone;
    };

    // Render an SVG element to an Image (returns a promise)
    const svgToImg = (svg, w, h) => {
      return new Promise((resolve) => {
        const clone = cleanSvg(svg);
        // Ensure xmlns
        if (!clone.getAttribute('xmlns')) {
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        const data = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    };

    const stageRect = stageInner.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();

    // Work in virtual coords: stage is always 1920×720.
    // cssScale converts virtual px → screen px (the CSS transform applied by fitStage).
    // We use its inverse to convert screen measurements back to virtual space.
    const cssScale = stageRect.width / 1920;   // screen px per virtual px
    const toVirt = (screenPx) => screenPx / cssScale;

    const dpr = 3;   // 3× → 5760 px wide output

    // Fixed layout in virtual px
    const STAGE_W = 1920;
    const STAGE_H = 720;
    const HEADER_H = 90;   // title + subtitle block
    const FOOTER_H = 48;   // room for datestamp
    const W = STAGE_W;
    const H = HEADER_H + STAGE_H + FOOTER_H;

    const canvas = document.createElement('canvas');
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = resolveColor('var(--paper)');
    ctx.fillRect(0, 0, W, H);

    // Header text — fixed positions within HEADER_H block
    const inkColor     = resolveColor('var(--ink)');
    const inkSoftColor = resolveColor('var(--ink-soft)');
    ctx.textAlign  = 'center';
    ctx.fillStyle  = inkColor;
    ctx.font       = '500 22px "EB Garamond", serif';
    ctx.letterSpacing = '7px';
    ctx.fillText('THE SITUATION OF A HUMAN', W / 2, 38);
    ctx.fillStyle  = inkSoftColor;
    ctx.font       = 'italic 14px "EB Garamond", serif';
    ctx.letterSpacing = '1.4px';
    ctx.fillText('\u00b7  your when and where in the universe, recorded  \u00b7', W / 2, 60);
    ctx.letterSpacing = '0px';

    // Map SVGs from screen → virtual coords, offset by HEADER_H
    const svgs = Array.from(stageInner.querySelectorAll('svg'));
    const svgJobs = svgs.map((svg) => {
      const rect = svg.getBoundingClientRect();
      // position relative to stageInner origin, converted to virtual px
      const x = toVirt(rect.left - stageRect.left);
      const y = toVirt(rect.top  - stageRect.top) + HEADER_H;
      const w = toVirt(rect.width);
      const h = toVirt(rect.height);
      return svgToImg(svg, w, h).then((img) => {
        if (img) ctx.drawImage(img, x, y, w, h);
      });
    });

    Promise.all(svgJobs).then(() => {
      // Draw HTML text elements (captions) — convert screen positions to virtual coords
      // Note: getComputedStyle returns CSS px (virtual coords, unaffected by CSS transforms),
      // while getBoundingClientRect returns screen px (scaled by CSS transform).
      // So positions need toVirt(), but font-size and letter-spacing do NOT.
      stageInner.querySelectorAll('.node-label, .node-sub, .node-mono').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCs = getComputedStyle(el);
        const x = toVirt(rect.left - stageRect.left + rect.width / 2);
        const fontSize = parseFloat(elCs.fontSize);
        const y = toVirt(rect.top - stageRect.top) + HEADER_H + fontSize * 0.85;
        const italic = elCs.fontStyle === 'italic' ? 'italic ' : '';
        const weight = elCs.fontWeight !== '400' && elCs.fontWeight !== 'normal' ? elCs.fontWeight + ' ' : '';
        ctx.font = `${italic}${weight}${fontSize}px ${elCs.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = resolveColor(elCs.color);
        ctx.globalAlpha = parseFloat(elCs.opacity) || 1;
        const spacing = parseFloat(elCs.letterSpacing) || 0;
        ctx.letterSpacing = spacing + 'px';
        ctx.fillText(el.textContent, x, y);
      });
      ctx.globalAlpha = 1;
      ctx.letterSpacing = '0px';

      // Draw datestamp — export only, centred in the footer band
      const exportD = new Date(state.date);
      const datestamp = `${exportD.getUTCFullYear()}-${pad(exportD.getUTCMonth()+1)}-${pad(exportD.getUTCDate())} · ${pad(exportD.getUTCHours())}:${pad(exportD.getUTCMinutes())} UTC`;
      
      // Draw custom message right above datestamp
      if (state.message) {
        ctx.textAlign = 'center';
        ctx.fillStyle = inkColor;
        ctx.font = 'italic 22px "EB Garamond", serif';
        ctx.letterSpacing = '1.76px'; // 0.08em of 22px
        ctx.fillText(state.message, W / 2, HEADER_H + STAGE_H + FOOTER_H / 2 - 15);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = inkSoftColor;
      ctx.font = 'italic 14px "EB Garamond", serif';
      ctx.letterSpacing = '1.4px';
      ctx.fillText(datestamp, W / 2, HEADER_H + STAGE_H + FOOTER_H / 2 + 10);
      ctx.letterSpacing = '0px';

      // Download
      canvas.toBlob((blob) => {
        if (!blob) { alert('Export failed.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date(state.date);
        a.download = `situation-${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    }).catch((err) => {
      alert('Export failed: ' + err.message);
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <div className="title-main">THE SITUATION OF A HUMAN</div>
          <div className="title-sub">·  your when and where in the universe, recorded  ·</div>
        </div>
        <div className="title-glyph">
          <svg viewBox="-14 -14 28 28" width="28" height="28">
            <g stroke="var(--ink)" strokeWidth="0.8" fill="none">
              <circle cx="0" cy="0" r="2" />
              <circle cx="0" cy="0" r="6" opacity="0.6" />
              <circle cx="0" cy="0" r="11" opacity="0.4" />
              <line x1="-12" y1="0" x2="12" y2="0" opacity="0.5" />
              <line x1="0" y1="-12" x2="0" y2="12" opacity="0.5" />
            </g>
          </svg>
        </div>
      </header>

      <Scene state={state} setState={setState} tweaks={tweaks} />

      <div className="bottom-bar">
        <Controls state={state} setState={setState} tweaks={tweaks} setTweak={setTweak} onExport={exportPNG} />
      </div>
    </div>
  );
}

Object.assign(window, { App });

export default App;
