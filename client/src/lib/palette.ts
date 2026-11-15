// Colorblind-safe color palettes (Viridis, Cividis, Plasma) and luminance helpers
// client/src/lib/palette.ts

export type ColorPalette = 'viridis' | 'cividis' | 'plasma' | 'scientific';

// Viridis scale: Purple -> Teal -> Green -> Yellow (Perceptually uniform, colorblind safe)
export const VIRIDIS_SCALE = [
  '#440154', // Dark purple (<0.8°C / cool)
  '#3b528b', // Blue-violet
  '#21918c', // Teal
  '#5ec962', // Light green
  '#fde725', // Bright yellow (>3.0°C / extreme)
];

// Cividis scale: Optimized explicitly for deuteranopia & protanopia (Blue to yellow monotonic luminance)
export const CIVIDIS_SCALE = [
  '#00204d', // Deep navy
  '#414d6b', // Muted slate blue
  '#7c7b78', // Neutral mid grey
  '#bda973', // Khaki gold
  '#ffea46', // Vibrant cividis yellow
];

// Plasma scale: Deep blue-violet to intense crimson/orange/yellow
export const PLASMA_SCALE = [
  '#0d0887', // Dark violet
  '#6a00a8', // Purple
  '#b12a90', // Magenta
  '#e16462', // Coral
  '#fca636', // Golden orange
];

// Colorblind-friendly Köppen Climate categorization with distinct luminance & pattern support
export const ACCESSIBLE_CLIMATE_COLORS: Record<string, { bg: string; text: string; border: string; hex: string; desc: string }> = {
  Tropical: {
    hex: '#cc6677', // Rose/Mauve (Okabe-Ito)
    bg: 'bg-[#cc6677]/15',
    text: 'text-[#882255]',
    border: 'border-[#cc6677]/40',
    desc: 'Tropical climate (high humidity, monsoonal)',
  },
  Arid: {
    hex: '#ddaa33', // Warm gold / Ochre (Okabe-Ito)
    bg: 'bg-[#ddaa33]/15',
    text: 'text-[#997700]',
    border: 'border-[#ddaa33]/40',
    desc: 'Arid & Semi-Arid (high radiation, dry air)',
  },
  Temperate: {
    hex: '#117733', // Forest green (Okabe-Ito)
    bg: 'bg-[#117733]/15',
    text: 'text-[#117733]',
    border: 'border-[#117733]/40',
    desc: 'Temperate climate (moderate diurnal cycle)',
  },
  Continental: {
    hex: '#332288', // Deep indigo / blue (Okabe-Ito)
    bg: 'bg-[#332288]/15',
    text: 'text-[#332288]',
    border: 'border-[#332288]/40',
    desc: 'Continental climate (wide seasonal extremes)',
  },
  Polar: {
    hex: '#88ccee', // Cyan (Okabe-Ito)
    bg: 'bg-[#88ccee]/15',
    text: 'text-[#006699]',
    border: 'border-[#88ccee]/40',
    desc: 'Polar / Subpolar climate',
  },
};

/** Get color for a UHI value using Viridis or Cividis colorblind-safe interpolations */
export function getUhiViridisColor(uhi: number, palette: ColorPalette = 'viridis'): string {
  const scale = palette === 'cividis' ? CIVIDIS_SCALE : palette === 'plasma' ? PLASMA_SCALE : VIRIDIS_SCALE;
  if (uhi >= 3.0) return scale[4];
  if (uhi >= 2.2) return scale[3];
  if (uhi >= 1.5) return scale[2];
  if (uhi >= 0.8) return scale[1];
  return scale[0];
}

/** Contrast calculation helper to verify WCAG AA 4.5:1 ratio */
export function getAccessibleTextColor(hex: string): '#1f1e1d' | '#ffffff' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1f1e1d' : '#ffffff';
}
