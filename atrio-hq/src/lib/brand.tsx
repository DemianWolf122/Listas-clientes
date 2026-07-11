/**
 * Marca de Atrio para los iconos generados con next/og (Satori).
 *
 * El símbolo es una "A" monograma de trazo redondeado (por Atrio): pico con
 * ápice redondeado + travesaño. Se usa el mismo trazo para el icono de la app,
 * el de Apple y el badge monocromo de las notificaciones, para que la identidad
 * sea consistente en todos lados. Trazo blanco sólido (el gradiente del tile ya
 * aporta profundidad; un gradiente sobre el trazo del travesaño horizontal se
 * rompe por el bounding-box de altura cero).
 */

export const BRAND = {
  // gradiente índigo → azul, sobrio y premium (no atado a ningún tema)
  from: "#6366F1",
  via: "#4F46E5",
  to: "#2563EB",
  ink: "#FFFFFF",
};

/** "A" monograma como dos trazos: pico (con ápice redondeado) y travesaño. */
function AtrioA({ px, stroke }: { px: number; stroke: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 240 240" style={{ position: "relative" }}>
      <g
        fill="none"
        stroke={stroke}
        strokeWidth={30}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50 196 L120 58 L190 196" />
        <path d="M77 150 L163 150" />
      </g>
    </svg>
  );
}

/**
 * Tile del icono a color: gradiente + brillo radial + "A" blanca centrada.
 * `size` en px. La marca ocupa ~62% (zona segura para iconos maskable).
 */
export function AtrioTile(size: number) {
  const mark = Math.round(size * 0.62);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        // a sangre completa: el SO redondea (maskable/Apple). Sin border-radius
        // para que no queden esquinas transparentes al aplicar la máscara.
        background: `linear-gradient(135deg, ${BRAND.from} 0%, ${BRAND.via} 52%, ${BRAND.to} 100%)`,
      }}
    >
      {/* brillo superior para dar profundidad */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 55%)`,
        }}
      />
      <AtrioA px={mark} stroke={BRAND.ink} />
    </div>
  );
}

/** "A" blanca sobre transparente para el badge monocromo de Android. */
export function AtrioBadge(size: number) {
  const mark = Math.round(size * 0.84);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <AtrioA px={mark} stroke="#FFFFFF" />
    </div>
  );
}
