/**
 * Config del conector MCP de Atrio (para claude.ai → Ajustes → Conectores).
 *
 * El secreto va en el path de la URL porque los conectores custom de claude.ai
 * sin OAuth no mandan headers de auth. Alcanza para una app interna de 2
 * personas (mismo modelo de seguridad que el resto: la puerta es no conocer la
 * URL; los datos ya están detrás del anon key + RLS). Se puede sobreescribir
 * con la env var MCP_SECRET en Vercel sin tocar código.
 */
export const MCP_SECRET_FALLBACK = "b3d3a628f304e056ce184cd52c7c19d52db3b9b3";

export function mcpSecret() {
  return process.env.MCP_SECRET || MCP_SECRET_FALLBACK;
}
