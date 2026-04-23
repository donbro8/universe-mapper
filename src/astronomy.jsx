// Simple astronomy helpers — accurate enough for visual storytelling, not navigation.

// Julian date from a JS Date (UTC)
function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Days since J2000.0 epoch (2000-01-01 12:00 UTC)
function daysSinceJ2000(date) {
  return julianDate(date) - 2451545.0;
}

// Earth's heliocentric ecliptic longitude in radians.
// Mean longitude approximation — good to a fraction of a degree for visual purposes.
function earthHeliocentricLongitude(date) {
  const d = daysSinceJ2000(date);
  // Mean longitude of Sun (geocentric) in degrees
  const L = 280.460 + 0.9856474 * d;
  // Mean anomaly
  const g = (357.528 + 0.9856003 * d) * Math.PI / 180;
  // Ecliptic longitude of Sun (geocentric)
  const lambdaSun = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  // Earth's heliocentric longitude is Sun's geocentric longitude + 180°
  const lambdaEarth = (lambdaSun + 180) % 360;
  return (lambdaEarth * Math.PI) / 180;
}

// Mean obliquity of the ecliptic in radians (Laskar 1986, accurate over ±10,000 years)
function meanObliquity(date) {
  const T = daysSinceJ2000(date) / 36525; // Julian centuries
  const epsDeg = 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  return epsDeg * Math.PI / 180;
}

// Principal nutation terms (18.6-year lunar node cycle, IAU 1980 leading term)
// Returns { deltaPsi, deltaEps } in radians
function nutationCorrections(date) {
  const T = daysSinceJ2000(date) / 36525;
  // Longitude of Moon's ascending node (degrees)
  const omega = (125.04452 - 1934.136261 * T) * Math.PI / 180;
  // Nutation in longitude (arcseconds → radians)
  const deltaPsi = (-17.20 * Math.sin(omega) - 1.32 * Math.sin(2 * omega * 1.0)) / 3600 * Math.PI / 180;
  // Nutation in obliquity (arcseconds → radians)
  const deltaEps = (9.20 * Math.cos(omega) + 0.57 * Math.cos(2 * omega * 1.0)) / 3600 * Math.PI / 180;
  return { deltaPsi, deltaEps };
}

// True obliquity (mean + nutation correction) in radians
function trueObliquity(date) {
  return meanObliquity(date) + nutationCorrections(date).deltaEps;
}

// Equation of time in minutes. Positive means sundial ahead of clock.
// Uses corrected obliquity with nutation.
function equationOfTimeMinutes(date) {
  const d = daysSinceJ2000(date);
  // Mean longitude of Sun (degrees)
  const L = (280.460 + 0.9856474 * d) % 360;
  // Mean anomaly (radians)
  const g = (357.528 + 0.9856003 * d) * Math.PI / 180;
  // Ecliptic longitude of Sun (radians)
  const lambdaSun = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  // True obliquity with nutation correction
  const epsilon = trueObliquity(date);
  // Right ascension of Sun (radians)
  const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambdaSun), Math.cos(lambdaSun));
  // Equation of time = mean solar time - apparent solar time (in degrees, then minutes)
  const Lrad = L * Math.PI / 180;
  let eot = Lrad - alpha;
  // Normalize to [-π, π]
  while (eot > Math.PI) eot -= 2 * Math.PI;
  while (eot < -Math.PI) eot += 2 * Math.PI;
  return eot * (180 / Math.PI) * 4; // 4 minutes per degree
}

// Sub-solar longitude in degrees: where the Sun is directly overhead.
function subSolarLongitude(date) {
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const eotMin = equationOfTimeMinutes(date);
  // Apparent solar time at Greenwich = UTC + EoT
  // Sub-solar longitude: Sun is overhead where apparent solar time = 12:00
  let lon = -(utcHours * 15 - 180) - (eotMin / 4);
  lon = ((lon + 540) % 360) - 180;
  return lon;
}

// Greenwich Mean Sidereal Time in hours (0-24) for a given Date (UTC)
// Includes precession terms (T² and T³) per Meeus Ch. 12
function gmstHours(date) {
  const d = daysSinceJ2000(date);
  const T = d / 36525; // Julian centuries
  // GMST in degrees with precession correction
  let gmstDeg = 280.46061837 + 360.98564736629 * d
    + 0.000387933 * T * T - T * T * T / 38710000;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  return gmstDeg / 15;
}

// Local sidereal time in hours for a given longitude (degrees, east positive)
function lstHours(date, longitudeDeg) {
  let lst = gmstHours(date) + longitudeDeg / 15;
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

// Earth rotation angle in radians — how much Earth has rotated.
// At GMST=0, the prime meridian faces the vernal equinox.
function earthRotationAngle(date) {
  // For visual purposes we just use GMST as rotation angle
  return (gmstHours(date) / 24) * 2 * Math.PI;
}

// Season string from heliocentric longitude, hemisphere-aware
function seasonFromDate(date, lat) {
  const lam = (earthHeliocentricLongitude(date) * 180) / Math.PI;
  const deg = ((lam % 360) + 360) % 360;
  // Northern hemisphere seasons based on Earth's heliocentric longitude:
  //   Spring: Earth at 180-270° (Sun at 0-90°)
  //   Summer: Earth at 270-360° (Sun at 90-180°)
  //   Autumn: Earth at 0-90°   (Sun at 180-270°)
  //   Winter: Earth at 90-180° (Sun at 270-360°)
  let nh;
  if (deg >= 180 && deg < 270) nh = 'SPRING';
  else if (deg >= 270)         nh = 'SUMMER';
  else if (deg < 90)           nh = 'AUTUMN';
  else                         nh = 'WINTER';
  // Southern hemisphere: invert
  if (lat != null && lat < 0) {
    const flip = { SPRING: 'AUTUMN', SUMMER: 'WINTER', AUTUMN: 'SPRING', WINTER: 'SUMMER' };
    return flip[nh];
  }
  return nh;
}

// Zodiac sign based on Sun's ecliptic longitude
function zodiacFromDate(date) {
  // Sun geocentric longitude = Earth heliocentric longitude - 180
  const lam = (earthHeliocentricLongitude(date) * 180) / Math.PI;
  const sunLon = ((lam - 180) % 360 + 360) % 360;
  const signs = [
    'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
    'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
  ];
  const idx = Math.floor(sunLon / 30) % 12;
  return signs[idx];
}

// Format coordinates like "40.71° N  74.01° W"
function formatCoords(lat, lon) {
  const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}  ${lonStr}`;
}

// Moon's geocentric ecliptic position and phase info.
// ~1° accuracy using principal perturbation terms (Meeus Ch. 47 simplified).
function moonGeocentricPosition(date) {
  const d = daysSinceJ2000(date);
  const toRad = Math.PI / 180;
  // Five fundamental arguments (degrees)
  const L0 = (218.3165 + 13.176396 * d) % 360;        // mean longitude
  const M  = (134.963  + 13.064993 * d) % 360;         // mean anomaly
  const D  = (297.8502 + 12.190749 * d) % 360;         // mean elongation
  const Ms = (357.528  + 0.985600  * d) % 360;         // Sun's mean anomaly
  const F  = (93.272   + 13.229350 * d) % 360;         // argument of latitude

  // Principal longitude perturbations (degrees)
  const dL = 6.289 * Math.sin(M * toRad)
           + 1.274 * Math.sin((2 * D - M) * toRad)
           - 0.658 * Math.sin(2 * D * toRad)
           + 0.214 * Math.sin(2 * M * toRad)
           - 0.186 * Math.sin(Ms * toRad)
           - 0.114 * Math.sin(2 * F * toRad);

  const lonDeg = ((L0 + dL) % 360 + 360) % 360;
  const latDeg = 5.128 * Math.sin(F * toRad);

  // Sun's geocentric longitude (same as used in NodeEarth)
  const L_earth = earthHeliocentricLongitude(date) * 180 / Math.PI;
  const sunLonDeg = ((L_earth + 180) % 360 + 360) % 360;

  // Elongation: angular distance Moon is east of Sun
  let elong = ((lonDeg - sunLonDeg) % 360 + 360) % 360;
  const illumination = (1 - Math.cos(elong * toRad)) / 2;
  const waxing = elong > 0 && elong < 180;

  return { lonDeg, latDeg, illumination, waxing, elongDeg: elong };
}

// Moon's equatorial coordinates (RA, Dec) from ecliptic position.
function moonEquatorialPosition(date) {
  const { lonDeg, latDeg, illumination, waxing, elongDeg } = moonGeocentricPosition(date);
  const toRad = Math.PI / 180;
  const eps = trueObliquity(date); // radians
  const lam = lonDeg * toRad;
  const bet = latDeg * toRad;

  const ra = Math.atan2(
    Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps),
    Math.cos(lam)
  );
  const dec = Math.asin(
    Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam)
  );

  return {
    raDeg: ((ra / toRad) % 360 + 360) % 360,
    decDeg: dec / toRad,
    illumination, waxing, elongDeg,
  };
}

// Moon's altitude and azimuth for an observer at (latDeg, lonDeg).
function moonAltAz(date, latDeg, lonDeg) {
  const { raDeg, decDeg } = moonEquatorialPosition(date);
  const toRad = Math.PI / 180;

  // Hour angle in degrees
  const lst = lstHours(date, lonDeg) * 15; // degrees
  let ha = lst - raDeg;
  ha = ((ha + 540) % 360) - 180; // normalise to [-180,180]

  const haRad = ha * toRad;
  const latRad = latDeg * toRad;
  const decRad = decDeg * toRad;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
               + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad))
              / (Math.cos(altRad) * Math.cos(latRad) + 1e-12);
  let azDeg = Math.acos(Math.max(-1, Math.min(1, cosAz))) / toRad;
  if (Math.sin(haRad) > 0) azDeg = 360 - azDeg; // west of south

  return { altDeg: altRad / toRad, azDeg };
}

Object.assign(window, {
  julianDate,
  daysSinceJ2000,
  earthHeliocentricLongitude,
  meanObliquity,
  nutationCorrections,
  trueObliquity,
  equationOfTimeMinutes,
  subSolarLongitude,
  gmstHours,
  lstHours,
  earthRotationAngle,
  seasonFromDate,
  zodiacFromDate,
  formatCoords,
  moonGeocentricPosition,
  moonEquatorialPosition,
  moonAltAz,
});

export {
  julianDate,
  daysSinceJ2000,
  earthHeliocentricLongitude,
  meanObliquity,
  nutationCorrections,
  trueObliquity,
  equationOfTimeMinutes,
  subSolarLongitude,
  gmstHours,
  lstHours,
  earthRotationAngle,
  seasonFromDate,
  zodiacFromDate,
  formatCoords,
  moonGeocentricPosition,
  moonEquatorialPosition,
  moonAltAz,
};
