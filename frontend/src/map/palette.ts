/**
 * Colour ramps for the chart layers.
 *
 * The bridge runs at night, so the ramps stay inside a cold, low-luminance envelope, and
 * hazard hues (amber, red) are reserved so that anything warm on the display means
 * something. Every ramp is defined once here and used by both the canvas and the panels,
 * so a legend can never drift from what is painted.
 */

export const MAP_COLORS = {
  ocean: '#050A12',
  oceanDeep: '#04070D',
  land: '#1A2231',
  landEdge: '#3B4A63',
  graticule: 'rgba(80, 120, 160, 0.16)',
  graticuleMajor: 'rgba(90, 140, 180, 0.28)',
  graticuleLabel: 'rgba(120, 165, 205, 0.72)',
  iceEdge: '#7DD3FC',
  drift: 'rgba(125, 211, 252, 0.55)',
  routeOptimised: '#22D3EE',
  routeBaseline: 'rgba(148, 163, 184, 0.72)',
  track: '#34D399',
  vessel: '#F8FAFC',
  iceberg: '#C4B5FD',
  icebergCore: '#EDE9FE',
  station: '#5EEAD4',
  port: '#FBBF24',
  radar: 'rgba(52, 211, 153, 0.5)',
  compression: '#FB923C',
} as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function rampLookup(stops: { at: number; rgb: [number, number, number] }[], v: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, v));
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x >= a.at && x <= b.at) {
      const t = b.at === a.at ? 0 : (x - a.at) / (b.at - a.at);
      return mix(a.rgb, b.rgb, t);
    }
  }
  return stops[stops.length - 1].rgb;
}

/**
 * Sea-ice concentration, 0 to 1.
 * Open water reads as the ocean ground so the eye is not drawn to it; pack ice brightens
 * through a cold blue-white, which is how ice charts have been drawn since the 1970s.
 */
const CONC_STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0.0, rgb: [7, 16, 30] },
  { at: 0.15, rgb: [12, 42, 74] },
  { at: 0.35, rgb: [20, 78, 122] },
  { at: 0.55, rgb: [46, 124, 166] },
  { at: 0.75, rgb: [110, 174, 205] },
  { at: 0.9, rgb: [180, 216, 234] },
  { at: 1.0, rgb: [232, 244, 251] },
];

export function concentrationRgb(v: number): [number, number, number] {
  return rampLookup(CONC_STOPS, v);
}

export function concentrationCss(v: number, alpha = 1): string {
  const [r, g, b] = concentrationRgb(v);
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

/** Ice thickness in metres, 0 to about 3. Used for the alternate raster. */
const THICK_STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0.0, rgb: [7, 16, 30] },
  { at: 0.1, rgb: [21, 62, 84] },
  { at: 0.3, rgb: [26, 110, 116] },
  { at: 0.55, rgb: [88, 176, 150] },
  { at: 0.8, rgb: [200, 214, 150] },
  { at: 1.0, rgb: [246, 232, 210] },
];

export function thicknessCss(metres: number, alpha = 1): string {
  const [r, g, b] = rampLookup(THICK_STOPS, metres / 3);
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

/**
 * RIO to colour, following the POLARIS decision boundaries rather than a smooth ramp:
 * at or above 0 is normal operation, 0 to -10 is elevated risk, below -10 is prohibited.
 */
export function rioColor(rio: number): string {
  if (rio >= 10) return '#34D399';
  if (rio >= 0) return '#A3E635';
  if (rio >= -5) return '#FBBF24';
  if (rio > -10) return '#FB923C';
  return '#F43F5E';
}

export function rioStatusLabel(rio: number): string {
  if (rio >= 0) return 'NORMAL OPERATION';
  if (rio > -10) return 'ELEVATED RISK';
  return 'OPERATION PROHIBITED';
}

/** Compression / besetting shading: transparent below 0.35, hot above it. */
export function compressionCss(index: number): string | null {
  if (index < 0.35) return null;
  const t = Math.min(1, (index - 0.35) / 0.65);
  const r = lerp(180, 244, t);
  const g = lerp(110, 63, t);
  const b = lerp(40, 94, t);
  return `rgba(${r | 0},${g | 0},${b | 0},${(0.1 + 0.4 * t).toFixed(3)})`;
}

export function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return '#F43F5E';
    case 'WARNING':
      return '#FB923C';
    case 'CAUTION':
      return '#FBBF24';
    default:
      return '#38BDF8';
  }
}

export function threatColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return '#F43F5E';
    case 'HIGH':
      return '#FB923C';
    case 'MODERATE':
      return '#FBBF24';
    case 'LOW':
      return '#34D399';
    default:
      return '#7DD3FC';
  }
}

export function besettingColor(risk: string): string {
  switch (risk.toUpperCase()) {
    case 'SEVERE':
    case 'HIGH':
      return '#F43F5E';
    case 'MODERATE':
      return '#FBBF24';
    default:
      return '#34D399';
  }
}
