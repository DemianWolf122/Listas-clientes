/**
 * Temas de apariencia del HQ. Cada tema es una clase CSS (globals.css) que
 * redefine los tokens de diseño (--canvas, --accent, etc.), así que toda la
 * app cambia de piel sin tocar componentes.
 */
export type ThemeDef = {
  /** id que guarda next-themes; la clase CSS es `theme-${id}` */
  id: string;
  label: string;
  emoji: string;
  /** true → el editor de docs y demás detalles se renderizan en modo oscuro */
  dark: boolean;
};

export const CUSTOM_THEMES: ThemeDef[] = [
  { id: "rosa", label: "Rosa", emoji: "🌸", dark: false },
  { id: "amarillo", label: "Amarillo", emoji: "🌻", dark: false },
  { id: "lavanda", label: "Lavanda", emoji: "💜", dark: false },
  { id: "menta", label: "Menta", emoji: "🍃", dark: false },
  { id: "oceano", label: "Océano", emoji: "🌊", dark: false },
  { id: "atardecer", label: "Atardecer", emoji: "🌅", dark: false },
  { id: "cibernetico", label: "Cibernético", emoji: "🤖", dark: true },
  { id: "superheroes", label: "Superhéroes", emoji: "🦸", dark: true },
  { id: "ben10", label: "Ben 10", emoji: "👽", dark: true },
  { id: "hextech", label: "League of Legends", emoji: "⚔️", dark: true },
  { id: "valorant", label: "Valorant", emoji: "🎯", dark: true },
  { id: "elfhame", label: "El Príncipe Cruel", emoji: "👑", dark: true },
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
