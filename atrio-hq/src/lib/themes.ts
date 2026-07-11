/**
 * Temas de apariencia del HQ. Cada tema es una clase CSS (globals.css) que
 * redefine los tokens de diseño (--canvas, --accent, etc.), así que toda la
 * app cambia de piel sin tocar componentes.
 */
export type ThemeDef = {
  /** id que guarda next-themes */
  id: string;
  label: string;
  emoji: string;
  /** true → el editor de docs y demás detalles se renderizan en modo oscuro */
  dark: boolean;
  /** [fondo, acento, superficie] para la mini-preview en Configuración */
  swatch: [string, string, string];
};

export const CUSTOM_THEMES: ThemeDef[] = [
  { id: "rosa", label: "Rosa", emoji: "🌸", dark: false, swatch: ["#FFF7FA", "#D6336C", "#F5DDE7"] },
  { id: "amarillo", label: "Amarillo", emoji: "🌻", dark: false, swatch: ["#FFFDF3", "#D97706", "#F3E9C7"] },
  { id: "lavanda", label: "Lavanda", emoji: "💜", dark: false, swatch: ["#FBF9FF", "#7C3AED", "#E7DFF6"] },
  { id: "menta", label: "Menta", emoji: "🍃", dark: false, swatch: ["#F6FDF9", "#0D9464", "#D6EFE3"] },
  { id: "oceano", label: "Océano", emoji: "🌊", dark: false, swatch: ["#F6FBFF", "#0277BD", "#D5E9F7"] },
  { id: "atardecer", label: "Atardecer", emoji: "🌅", dark: false, swatch: ["#FFFAF5", "#EA580C", "#F7E2CF"] },
  { id: "cibernetico", label: "Cibernético", emoji: "🤖", dark: true, swatch: ["#080C18", "#00E5FF", "#1D2844"] },
  { id: "superheroes", label: "Superhéroes", emoji: "🦸", dark: true, swatch: ["#0D1123", "#E23636", "#252F52"] },
  { id: "ben10", label: "Ben 10", emoji: "👽", dark: true, swatch: ["#080A08", "#39D23D", "#202A20"] },
  { id: "hextech", label: "League of Legends", emoji: "⚔️", dark: true, swatch: ["#010A13", "#C89B3C", "#15293E"] },
  { id: "valorant", label: "Valorant", emoji: "🎯", dark: true, swatch: ["#0F1923", "#FF4655", "#273848"] },
  { id: "elfhame", label: "El Príncipe Cruel", emoji: "👑", dark: true, swatch: ["#0A0F0C", "#C9A227", "#212D25"] },
];

/** Lista completa para next-themes. */
export const THEME_IDS = ["light", "dark", "system", ...CUSTOM_THEMES.map((t) => t.id)];

/** id de tema → clase CSS que aplica next-themes en <html>. */
export const THEME_CLASS_MAP: Record<string, string> = {
  light: "light",
  dark: "dark",
  ...Object.fromEntries(CUSTOM_THEMES.map((t) => [t.id, `theme-${t.id}`])),
};

/** ¿El tema activo es oscuro? (para BlockNote y detalles que no usan tokens). */
export function isDarkTheme(theme?: string | null, resolvedTheme?: string | null): boolean {
  const custom = CUSTOM_THEMES.find((t) => t.id === theme);
  if (custom) return custom.dark;
  return resolvedTheme === "dark";
}
