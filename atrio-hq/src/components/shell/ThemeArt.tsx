"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Escenas decorativas por tema: ilustraciones SVG inline (grillas synthwave,
 * Omnitrix, cristales hextech, bosque de Elfhame, sakura, invaders…) que se
 * dibujan detrás del contenido. Solo se monta la escena del tema activo;
 * en Configuración cada preview monta la suya en miniatura.
 */
export function ThemeArt({ themeId, className }: { themeId?: string; className?: string }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const id = themeId ?? (mounted ? theme : undefined);
  const Scene = id ? SCENES[id] : undefined;
  if (!Scene) return null;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Scene />
    </div>
  );
}

/* =============================== escenas =============================== */

/* --- Cibernético: grilla en perspectiva + sol synthwave + skyline --- */
function Cibernetico() {
  return (
    <>
      <svg className="absolute bottom-0 left-0 w-full" style={{ height: "42%" }} viewBox="0 0 1000 300" preserveAspectRatio="none">
        {[2, 10, 22, 40, 66, 102, 150, 212, 288].map((y) => (
          <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#00E5FF" strokeOpacity={0.04 + (y / 300) * 0.16} />
        ))}
        {Array.from({ length: 21 }, (_, i) => i * 50).map((x) => (
          <line key={x} x1={x} y1="300" x2={500 + (x - 500) * 0.08} y2="0" stroke="#00E5FF" strokeOpacity="0.09" />
        ))}
      </svg>
      <svg className="absolute" style={{ right: "8%", top: "10%", width: 220, height: 220 }} viewBox="0 0 200 200">
        <defs>
          <linearGradient id="cyb-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00E5FF" />
            <stop offset="1" stopColor="#C724FF" />
          </linearGradient>
          <clipPath id="cyb-slats">
            <rect x="0" y="0" width="200" height="98" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x="0" y={102 + i * 15} width="200" height={11 - i * 1.5} />
            ))}
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="82" fill="url(#cyb-sun)" clipPath="url(#cyb-slats)" opacity="0.30" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-full" style={{ height: 120 }} viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          d="M0 120 V70 h60 V40 h30 V70 h50 V55 h40 V20 h25 V55 h45 V80 h70 V35 h30 V80 h55 V60 h45 V90 h80 V50 h28 V25 h26 V90 h60 V65 h50 V40 h30 V65 h60 V85 h90 V55 h40 V85 h55 V30 h24 V85 h50 V60 h40 V120 Z"
          fill="#0A1430"
          opacity="0.6"
        />
        {[[70, 52], [152, 62], [242, 38], [332, 62], [432, 58], [522, 72], [612, 48], [702, 76], [802, 62], [892, 72], [982, 48], [1082, 66]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="5" height="7" fill="#00E5FF" opacity="0.35" />
        ))}
      </svg>
    </>
  );
}

/* --- Superhéroes: ráfaga de cómic + starburst + héroe volando + ciudad --- */
function Superheroes() {
  return (
    <>
      <svg className="absolute right-0 top-0" style={{ width: 420, height: 420 }} viewBox="0 0 400 400">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = ((i * 15 + 95) * Math.PI) / 180;
          return (
            <line key={i} x1="400" y1="0" x2={400 + Math.cos(a) * 540} y2={-Math.sin(a) * 540} stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth={i % 2 ? 10 : 4} />
          );
        })}
      </svg>
      <svg className="absolute" style={{ left: "6%", bottom: "20%", width: 170, height: 170 }} viewBox="0 0 100 100">
        <polygon
          points="50,2 58,30 86,12 68,38 98,42 70,54 90,78 60,64 56,96 44,66 20,88 34,58 2,54 32,44 14,16 44,32"
          fill="#E23636"
          opacity="0.14"
          stroke="#E23636"
          strokeOpacity="0.3"
        />
      </svg>
      <svg className="absolute" style={{ right: "24%", top: "18%", width: 130, height: 66 }} viewBox="0 0 120 60" opacity="0.20">
        <path d="M10 40 Q30 20 60 26 L92 20 q6 -2 10 4 l-8 6 q-30 14 -60 8 Q28 52 10 40Z" fill="#9FB6FF" />
        <circle cx="97" cy="22" r="6" fill="#9FB6FF" />
        <path d="M10 40 L-14 58 L18 48Z" fill="#E23636" />
      </svg>
      <svg className="absolute bottom-0 w-full" style={{ height: 110 }} viewBox="0 0 1200 110" preserveAspectRatio="none">
        <path
          d="M0 110 V60 h55 V30 h30 V60 h60 V45 h35 V15 h28 V45 h50 V75 h75 V38 h32 V75 h58 V55 h48 V85 h85 V45 h30 V20 h25 V85 h65 V60 h55 V35 h32 V60 h65 V80 h95 V50 h42 V80 h60 V25 h26 V80 h55 V110Z"
          fill="#0B0F24"
          opacity="0.75"
        />
        {[[80, 45], [172, 55], [262, 32], [362, 62], [472, 58], [562, 72], [662, 62], [762, 38], [862, 72], [962, 52], [1062, 66], [1152, 46]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="5" height="6" fill="#FFD34D" opacity="0.4" />
        ))}
      </svg>
    </>
  );
}

/* --- Ben 10: Omnitrix fiel + circuitos + ADN --- */
function Ben10() {
  return (
    <>
      <svg className="absolute" style={{ right: -40, bottom: -40, width: 360, height: 360 }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#39D23D" strokeOpacity="0.12" strokeWidth="10" />
        <circle cx="100" cy="100" r="70" fill="#39D23D" fillOpacity="0.05" stroke="#39D23D" strokeOpacity="0.22" strokeWidth="3" />
        {[45, 135, 225, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return <circle key={a} cx={100 + Math.cos(r) * 84} cy={100 + Math.sin(r) * 84} r="7" fill="#39D23D" fillOpacity="0.16" />;
        })}
        <path d="M45 55 H155 L112 100 L155 145 H45 L88 100Z" fill="#39D23D" fillOpacity="0.17" stroke="#39D23D" strokeOpacity="0.32" strokeWidth="2" />
      </svg>
      <svg className="absolute left-0 top-0" style={{ width: 300, height: 240 }} viewBox="0 0 300 240">
        {[
          { d: "M10 20 h70 v40 h60", ex: 140, ey: 60 },
          { d: "M10 90 h40 v50 h80 v-30 h50", ex: 180, ey: 110 },
          { d: "M10 170 h90 v30 h70", ex: 170, ey: 200 },
        ].map((c, i) => (
          <g key={i}>
            <path d={c.d} stroke="#39D23D" strokeOpacity="0.14" fill="none" strokeWidth="2" />
            <circle cx={c.ex} cy={c.ey} r="4" fill="#39D23D" fillOpacity="0.22" />
          </g>
        ))}
      </svg>
      <svg className="absolute" style={{ left: "8%", bottom: "5%", width: 70, height: 220 }} viewBox="0 0 60 200" opacity="0.15">
        <path d="M15 0 C45 25 45 45 15 70 C-15 95 -15 115 15 140 C45 165 45 185 15 200" fill="none" stroke="#39D23D" strokeWidth="3" />
        <path d="M45 0 C15 25 15 45 45 70 C75 95 75 115 45 140 C15 165 15 185 45 200" fill="none" stroke="#39D23D" strokeWidth="3" />
        {[12, 36, 58, 82, 106, 130, 152, 176].map((y) => (
          <line key={y} x1="18" x2="42" y1={y} y2={y} stroke="#39D23D" strokeWidth="2.5" />
        ))}
      </svg>
    </>
  );
}

/* --- Hextech: cristal facetado + círculo rúnico + filigrana --- */
function Hextech() {
  return (
    <>
      <svg className="absolute" style={{ left: -30, bottom: -20, width: 300, height: 340 }} viewBox="0 0 200 220">
        <defs>
          <linearGradient id="hx-gem" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0AC8B9" />
            <stop offset="1" stopColor="#C89B3C" />
          </linearGradient>
        </defs>
        <path d="M100 8 L168 60 L150 170 L100 212 L50 170 L32 60Z" fill="url(#hx-gem)" opacity="0.10" stroke="#C89B3C" strokeOpacity="0.30" strokeWidth="2" />
        <path d="M100 8 L100 212 M32 60 L100 90 L168 60 M50 170 L100 90 L150 170" stroke="#C89B3C" strokeOpacity="0.20" fill="none" />
      </svg>
      <svg className="absolute" style={{ right: "6%", top: "9%", width: 260, height: 260 }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="88" fill="none" stroke="#C89B3C" strokeOpacity="0.15" strokeDasharray="4 10" strokeWidth="2" />
        <circle cx="100" cy="100" r="64" fill="none" stroke="#C89B3C" strokeOpacity="0.10" strokeWidth="1.5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x = 100 + Math.cos(a) * 76;
          const y = 100 + Math.sin(a) * 76;
          return <path key={i} d={`M${x - 4} ${y} l4 -7 l4 7 l-4 7Z`} fill="none" stroke="#C89B3C" strokeOpacity="0.22" />;
        })}
        <path d="M100 40 L152 70 v60 L100 160 L48 130 v-60Z" fill="none" stroke="#0AC8B9" strokeOpacity="0.16" strokeWidth="2" />
      </svg>
      <svg className="absolute left-2 top-2" style={{ width: 150, height: 150 }} viewBox="0 0 100 100" opacity="0.22">
        <path d="M4 40 Q4 4 40 4 M10 60 Q10 10 60 10 M4 40 q14 -2 18 10 q-12 4 -18 -10 M40 4 q-2 14 10 18 q4 -12 -10 -18" fill="none" stroke="#C89B3C" strokeWidth="2" />
      </svg>
    </>
  );
}

/* --- Valorant: chevrón V + retícula + contornos de mapa + glitch --- */
function Valorant() {
  return (
    <>
      <svg className="absolute" style={{ right: -60, top: -40, width: 380, height: 380 }} viewBox="0 0 300 300">
        <path d="M40 0 L150 190 L260 0 h-44 L150 116 L84 0Z" fill="#FF4655" opacity="0.10" />
        <path d="M40 0 L150 190 L260 0" fill="none" stroke="#FF4655" strokeOpacity="0.22" strokeWidth="3" />
      </svg>
      <svg className="absolute" style={{ left: "9%", top: "24%", width: 200, height: 200 }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#ECF2F6" strokeOpacity="0.10" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="#FF4655" strokeOpacity="0.18" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="4" fill="#FF4655" opacity="0.32" />
        {[[100, 4, 100, 34], [100, 166, 100, 196], [4, 100, 34, 100], [166, 100, 196, 100]].map((l, i) => (
          <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#FF4655" strokeOpacity="0.26" strokeWidth="2" />
        ))}
      </svg>
      <svg className="absolute bottom-0 left-0" style={{ width: "55%", height: 220 }} viewBox="0 0 500 200" preserveAspectRatio="none" opacity="0.10">
        {[0, 18, 36, 54].map((off) => (
          <path key={off} d={`M0 ${180 - off} q80 ${-30 - off / 2} 150 -8 q90 26 170 -22 q90 -40 180 -6`} fill="none" stroke="#ECF2F6" strokeWidth="1.5" />
        ))}
      </svg>
      <svg className="absolute" style={{ right: "14%", bottom: "20%", width: 150, height: 60 }} viewBox="0 0 150 60" opacity="0.30">
        <rect x="0" y="8" width="90" height="5" fill="#FF4655" />
        <rect x="24" y="24" width="110" height="4" fill="#ECF2F6" opacity="0.5" />
        <rect x="10" y="40" width="70" height="5" fill="#FF4655" opacity="0.7" />
      </svg>
    </>
  );
}

/* --- El Príncipe Cruel: bosque, corona, luna, enredadera, serpiente --- */
function Elfhame() {
  return (
    <>
      <svg className="absolute" style={{ left: "7%", top: "7%", width: 150, height: 150 }} viewBox="0 0 100 100">
        <path d="M62 10 a34 34 0 1 0 24 58 a28 28 0 1 1 -24 -58Z" fill="#C9A227" opacity="0.17" />
        {[[20, 30, 1.6], [34, 14, 1], [10, 52, 1.2], [28, 64, 0.8]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#EAD27C" opacity="0.4" />
        ))}
      </svg>
      <svg className="absolute" style={{ right: "7%", top: "8%", width: 150, height: 100 }} viewBox="0 0 120 80">
        <path d="M12 62 L18 26 L38 44 L60 14 L82 44 L102 26 L108 62 Z" fill="#C9A227" fillOpacity="0.10" stroke="#C9A227" strokeOpacity="0.36" strokeWidth="2.5" />
        <rect x="12" y="62" width="96" height="8" rx="2" fill="#C9A227" fillOpacity="0.18" />
        {[[18, 26], [60, 14], [102, 26]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#7FB069" fillOpacity="0.5" />
        ))}
        <circle cx="60" cy="66" r="3" fill="#B33951" fillOpacity="0.5" />
      </svg>
      <svg className="absolute bottom-0 w-full" style={{ height: 150 }} viewBox="0 0 1200 150" preserveAspectRatio="none">
        <path
          d="M0 150 V90 L40 55 L80 95 L120 45 L160 92 L200 60 L240 100 L300 40 L350 95 L400 65 L450 105 L520 50 L580 100 L640 62 L700 105 L760 55 L820 100 L880 70 L940 108 L1000 52 L1060 98 L1120 68 L1200 100 V150Z"
          fill="#0E1A12"
          opacity="0.8"
        />
        <path
          d="M0 150 V115 L60 85 L120 118 L180 80 L240 120 L320 78 L400 122 L480 88 L560 124 L640 90 L720 125 L800 92 L880 126 L960 95 L1040 128 L1120 98 L1200 125 V150Z"
          fill="#132417"
          opacity="0.9"
        />
      </svg>
      <svg className="absolute left-0 top-0 h-full" style={{ width: 90 }} viewBox="0 0 90 600" preserveAspectRatio="none">
        <path d="M55 0 C25 80 75 150 40 230 C10 310 70 380 40 460 C20 520 55 560 45 600" fill="none" stroke="#C9A227" strokeOpacity="0.18" strokeWidth="2.5" />
        {[[46, 60, -30], [58, 140, 25], [34, 210, -25], [52, 300, 30], [32, 390, -28], [52, 480, 26]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="13" ry="5" fill="#4E7A54" fillOpacity="0.35" transform={`rotate(${r} ${x} ${y})`} />
        ))}
        {[[50, 105], [38, 260], [50, 430]].map(([x, y], i) => (
          <g key={i} opacity="0.35">
            <circle cx={x} cy={y} r="7" fill="#B33951" />
            <circle cx={x} cy={y} r="3.5" fill="#7A2338" />
          </g>
        ))}
      </svg>
      <svg className="absolute" style={{ right: "4%", bottom: 120, width: 170, height: 60 }} viewBox="0 0 170 60" opacity="0.22">
        <line x1="0" y1="34" x2="170" y2="26" stroke="#3E5A44" strokeWidth="5" />
        <path d="M30 32 q18 -18 36 -2 q18 16 36 0 q16 -14 30 -2" fill="none" stroke="#C9A227" strokeWidth="4" strokeLinecap="round" />
        <circle cx="134" cy="27" r="3" fill="#C9A227" />
      </svg>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <filter id="ef-glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {[[220, 210, 3], [680, 130, 2.5], [840, 420, 2], [380, 520, 2.6], [120, 400, 2], [560, 300, 1.8], [930, 220, 2.2]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#F0C85A" opacity="0.5" filter="url(#ef-glow)" />
        ))}
      </svg>
    </>
  );
}

/* --- Rosa: rama de sakura + pétalos cayendo --- */
function Rosa() {
  return (
    <>
      <svg className="absolute right-0 top-0" style={{ width: 340, height: 220 }} viewBox="0 0 340 220">
        <path
          d="M340 10 q-70 6 -120 46 q-40 32 -96 38 M250 40 q-8 34 -46 50 M300 22 q-6 26 -30 36"
          fill="none"
          stroke="#B0766E"
          strokeOpacity="0.30"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {[[218, 96, 1], [196, 120, 0.8], [262, 78, 0.9], [286, 52, 0.75], [172, 128, 0.7], [240, 58, 0.65]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity="0.5">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-8" rx="5" ry="8" fill="#E8879C" transform={`rotate(${a})`} />
            ))}
            <circle r="3" fill="#C4526B" />
          </g>
        ))}
      </svg>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {[[150, 180, 30], [420, 120, -20], [640, 260, 45], [820, 150, 10], [260, 420, -35], [540, 500, 20], [760, 560, -15], [90, 560, 25]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="7" ry="4" fill="#E8879C" opacity="0.28" transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </svg>
    </>
  );
}

/* --- Amarillo: sol con rayos + girasoles + abeja --- */
function Amarillo() {
  return (
    <>
      <svg className="absolute" style={{ right: "6%", top: "6%", width: 230, height: 230 }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="44" fill="#F59E0B" opacity="0.18" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const len = i % 2 ? 26 : 38;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * 56}
              y1={100 + Math.sin(a) * 56}
              x2={100 + Math.cos(a) * (56 + len)}
              y2={100 + Math.sin(a) * (56 + len)}
              stroke="#F59E0B"
              strokeOpacity="0.25"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <svg className="absolute" style={{ left: "4%", bottom: 0, width: 260, height: 180 }} viewBox="0 0 260 180" opacity="0.30">
        {[[60, 110, 1], [140, 130, 0.8], [210, 115, 0.65]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <line x1="0" y1="20" x2="0" y2="70" stroke="#7A8B3A" strokeWidth="5" />
            <path d="M0 45 q-18 -4 -22 -20 q16 2 22 20" fill="#7A8B3A" />
            {Array.from({ length: 10 }).map((_, j) => (
              <ellipse key={j} cx="0" cy="-26" rx="7" ry="15" fill="#F2B705" transform={`rotate(${j * 36})`} />
            ))}
            <circle r="12" fill="#8B5A2B" />
          </g>
        ))}
      </svg>
      <svg className="absolute" style={{ left: "30%", top: "20%", width: 220, height: 110 }} viewBox="0 0 220 110" opacity="0.35">
        <path d="M0 90 q40 -40 80 -20 q40 20 80 -30 q20 -22 50 -24" fill="none" stroke="#B98A2E" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
        <g transform="translate(196 12)">
          <ellipse rx="11" ry="7" fill="#F2B705" />
          <path d="M-6 -6 v12 M0 -7 v14 M6 -6 v12" stroke="#3F2E10" strokeWidth="2.5" />
          <ellipse cx="-2" cy="-9" rx="6" ry="4" fill="#FFFFFF" opacity="0.7" />
        </g>
      </svg>
    </>
  );
}

/* --- Lavanda: espigas + mariposas + destellos --- */
function Lavanda() {
  return (
    <>
      <svg className="absolute" style={{ left: "3%", bottom: 0, width: 220, height: 230 }} viewBox="0 0 220 230" opacity="0.35">
        {[[50, 1, -6], [95, 0.85, 4], [140, 0.7, -3], [180, 0.9, 7]].map(([x, s, rot], i) => (
          <g key={i} transform={`translate(${x} 230) scale(${s}) rotate(${rot})`}>
            <line x1="0" y1="0" x2="0" y2="-110" stroke="#7A9455" strokeWidth="3" />
            {Array.from({ length: 7 }).map((_, j) => (
              <g key={j}>
                <ellipse cx="-6" cy={-118 - j * 11} rx="6" ry="5" fill="#8B5CF6" />
                <ellipse cx="6" cy={-122 - j * 11} rx="6" ry="5" fill="#7C3AED" />
              </g>
            ))}
            <ellipse cx="0" cy="-196" rx="5" ry="7" fill="#8B5CF6" />
          </g>
        ))}
      </svg>
      {[
        { l: "62%", t: "16%", r: -12, s: 1 },
        { l: "78%", t: "38%", r: 14, s: 0.7 },
      ].map((b, i) => (
        <svg key={i} className="absolute" style={{ left: b.l, top: b.t, width: 64 * b.s, height: 48 * b.s, transform: `rotate(${b.r}deg)` }} viewBox="0 0 64 48" opacity="0.35">
          <path d="M32 24 C18 2 2 8 6 22 C9 33 22 32 32 24 C42 32 55 33 58 22 C62 8 46 2 32 24Z" fill="#A78BFA" />
          <path d="M32 24 C24 38 12 42 12 34 C12 28 22 26 32 24 C42 26 52 28 52 34 C52 42 40 38 32 24Z" fill="#8B5CF6" />
          <line x1="32" y1="16" x2="32" y2="34" stroke="#4C1D95" strokeWidth="2.5" />
        </svg>
      ))}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {[[220, 160], [520, 90], [760, 240], [420, 360], [880, 480]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 8} l2.5 5.5 L${x + 8} ${y} l-5.5 2.5 L${x} ${y + 8} l-2.5 -5.5 L${x - 8} ${y} l5.5 -2.5Z`} fill="#8B5CF6" opacity="0.22" />
        ))}
      </svg>
    </>
  );
}

/* --- Menta: hojas grandes + brotes + gotas --- */
function Menta() {
  return (
    <>
      <svg className="absolute" style={{ right: -30, bottom: -30, width: 320, height: 320 }} viewBox="0 0 200 200" opacity="0.20">
        {[[-15, 0.95], [20, 0.75], [55, 0.6]].map(([rot, s], i) => (
          <g key={i} transform={`translate(170 190) rotate(${rot}) scale(${s})`}>
            <path d="M0 0 C-60 -20 -80 -90 -30 -140 C10 -100 20 -40 0 0Z" fill="#0D9464" />
            <path d="M-8 -12 C-30 -50 -35 -95 -28 -128" stroke="#F6FDF9" strokeWidth="3" fill="none" opacity="0.5" />
          </g>
        ))}
      </svg>
      <svg className="absolute" style={{ left: "6%", bottom: "4%", width: 180, height: 110 }} viewBox="0 0 180 110" opacity="0.30">
        {[[30, 1], [90, 0.75], [145, 0.9]].map(([x, s], i) => (
          <g key={i} transform={`translate(${x} 110) scale(${s})`}>
            <path d="M0 0 C0 -20 0 -35 0 -48" stroke="#0D9464" strokeWidth="3" fill="none" />
            <path d="M0 -30 C-16 -34 -22 -50 -18 -62 C-4 -56 2 -44 0 -30Z" fill="#31B57F" />
            <path d="M0 -40 C16 -46 20 -62 15 -72 C3 -66 -2 -54 0 -40Z" fill="#0D9464" />
          </g>
        ))}
      </svg>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {[[240, 140], [640, 90], [820, 300], [380, 260]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q6 10 0 16 q-6 -6 0 -16Z`} fill="#31B57F" opacity="0.25" />
        ))}
      </svg>
    </>
  );
}

/* --- Océano: olas + velero + burbujas + gaviotas --- */
function Oceano() {
  return (
    <>
      <svg className="absolute bottom-0 w-full" style={{ height: 150 }} viewBox="0 0 1200 150" preserveAspectRatio="none">
        <path d="M0 60 q75 -26 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V150 H0Z" fill="#0277BD" opacity="0.10" />
        <path d="M0 92 q75 -22 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V150 H0Z" fill="#0277BD" opacity="0.14" />
        <path d="M0 122 q75 -18 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V150 H0Z" fill="#02557F" opacity="0.20" />
      </svg>
      <svg className="absolute" style={{ right: "16%", bottom: 118, width: 110, height: 100 }} viewBox="0 0 110 100" opacity="0.35">
        <path d="M14 78 h74 l-12 16 h-50Z" fill="#8B5E3C" />
        <line x1="52" y1="10" x2="52" y2="78" stroke="#6B4226" strokeWidth="3" />
        <path d="M52 12 L20 70 h32Z" fill="#E8F4FC" />
        <path d="M56 18 L86 70 h-30Z" fill="#BBDEF5" />
      </svg>
      <svg className="absolute left-0 top-0 h-full" style={{ width: 140 }} viewBox="0 0 140 700" preserveAspectRatio="none">
        {[[60, 560, 10], [40, 480, 6], [80, 420, 8], [52, 340, 5], [70, 260, 7], [45, 180, 4]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#0277BD" strokeOpacity="0.20" strokeWidth="2" />
        ))}
      </svg>
      <svg className="absolute" style={{ left: "30%", top: "14%", width: 200, height: 80 }} viewBox="0 0 200 80" opacity="0.30">
        {[[30, 30, 1], [90, 16, 0.8], [150, 40, 0.65]].map(([x, y, s], i) => (
          <path key={i} d={`M${x - 14 * s} ${y} q${7 * s} ${-10 * s} ${14 * s} 0 q${7 * s} ${-10 * s} ${14 * s} 0`} fill="none" stroke="#02557F" strokeWidth={2.5 * s} />
        ))}
      </svg>
    </>
  );
}

/* --- Atardecer: sol poniéndose + nubes + pájaros --- */
function Atardecer() {
  return (
    <>
      <svg className="absolute" style={{ left: "50%", bottom: 50, width: 340, height: 190, transform: "translateX(-50%)" }} viewBox="0 0 340 190">
        <defs>
          <linearGradient id="at-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FDBA74" />
            <stop offset="1" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        <circle cx="170" cy="150" r="86" fill="url(#at-sun)" opacity="0.25" />
        {[0, 14, 28, 42].map((off, i) => (
          <rect key={i} x={60 + i * 12} y={148 - off} width={220 - i * 24} height="5" rx="2.5" fill="#FFF7ED" opacity="0.12" />
        ))}
      </svg>
      <div className="absolute bottom-0 h-16 w-full" style={{ background: "linear-gradient(transparent, rgba(234,88,12,0.12))" }} />
      <svg className="absolute" style={{ left: "8%", top: "14%", width: 240, height: 80 }} viewBox="0 0 240 80" opacity="0.30">
        <g fill="#F8B57C">
          <ellipse cx="60" cy="46" rx="42" ry="15" />
          <ellipse cx="92" cy="36" rx="26" ry="12" />
          <ellipse cx="30" cy="38" rx="20" ry="10" />
        </g>
        <g fill="#F49E5C" transform="translate(140 8)">
          <ellipse cx="50" cy="40" rx="34" ry="12" />
          <ellipse cx="76" cy="32" rx="18" ry="9" />
        </g>
      </svg>
      <svg className="absolute" style={{ right: "14%", top: "20%", width: 180, height: 70 }} viewBox="0 0 180 70" opacity="0.4">
        {[[30, 28, 1], [75, 14, 0.8], [120, 34, 0.9], [155, 20, 0.6]].map(([x, y, s], i) => (
          <path key={i} d={`M${x - 12 * s} ${y} q${6 * s} ${-9 * s} ${12 * s} 0 q${6 * s} ${-9 * s} ${12 * s} 0`} fill="none" stroke="#7C3618" strokeWidth={2.2 * s} />
        ))}
      </svg>
    </>
  );
}

/* --- Café: taza humeante + granos --- */
function Cafe() {
  return (
    <>
      <svg className="absolute" style={{ right: "7%", bottom: "6%", width: 220, height: 220 }} viewBox="0 0 200 200" opacity="0.30">
        <ellipse cx="88" cy="170" rx="62" ry="7" fill="#8B5A2B" opacity="0.4" />
        <path d="M40 92 h96 v34 a48 30 0 0 1 -96 0Z" fill="#8B5A2B" />
        <path d="M136 98 h16 a16 16 0 0 1 0 32 h-18" fill="none" stroke="#8B5A2B" strokeWidth="7" />
        <ellipse cx="88" cy="92" rx="48" ry="9" fill="#5C3A1E" />
        <path d="M66 70 q-8 -12 0 -24 q8 -10 0 -22 M92 72 q-9 -13 0 -26 q9 -11 0 -22" fill="none" stroke="#A87C4F" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      </svg>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {[[160, 140, -20], [300, 90, 30], [120, 320, 10], [260, 480, -35], [420, 200, 15], [80, 540, 25]].map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`} opacity="0.16">
            <ellipse cx={x} cy={y} rx="14" ry="10" fill="#8B5A2B" />
            <path d={`M${x - 10} ${y} q10 6 20 0`} stroke="#FBF7F1" strokeWidth="2.5" fill="none" />
          </g>
        ))}
      </svg>
    </>
  );
}

/* --- Galaxia: estrellas, planeta anillado, cometa, espiral --- */
const STARS: Array<[number, number, number, number]> = [
  [40, 60, 1.4, 0.5], [120, 200, 1, 0.35], [220, 90, 1.8, 0.55], [300, 300, 1, 0.3], [360, 150, 1.3, 0.4],
  [450, 60, 1, 0.5], [520, 240, 1.6, 0.45], [600, 120, 1, 0.3], [660, 380, 1.2, 0.4], [720, 80, 1.8, 0.5],
  [800, 260, 1, 0.35], [860, 160, 1.4, 0.5], [930, 340, 1, 0.3], [80, 420, 1.3, 0.4], [180, 540, 1, 0.35],
  [320, 470, 1.6, 0.5], [460, 560, 1, 0.3], [560, 460, 1.2, 0.4], [700, 540, 1.5, 0.45], [840, 480, 1, 0.35],
  [940, 600, 1.4, 0.5], [60, 640, 1, 0.3], [260, 640, 1.3, 0.4], [640, 660, 1, 0.35], [900, 60, 1.2, 0.45],
];
function Galaxia() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {STARS.map(([x, y, r, o], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#E8E6F8" opacity={o} />
        ))}
      </svg>
      <svg className="absolute" style={{ right: "8%", top: "12%", width: 210, height: 150 }} viewBox="0 0 210 150" opacity="0.35">
        <circle cx="105" cy="75" r="44" fill="#7C6CF0" />
        <circle cx="88" cy="60" r="10" fill="#9F92F5" opacity="0.8" />
        <ellipse cx="105" cy="80" rx="86" ry="22" fill="none" stroke="#C4B5FD" strokeWidth="6" opacity="0.7" transform="rotate(-14 105 80)" />
      </svg>
      <svg className="absolute" style={{ left: "12%", top: "16%", width: 260, height: 120 }} viewBox="0 0 260 120" opacity="0.45">
        <defs>
          <linearGradient id="gx-tail" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#A78BFA" stopOpacity="0" />
            <stop offset="1" stopColor="#E8E6F8" />
          </linearGradient>
        </defs>
        <line x1="10" y1="110" x2="210" y2="24" stroke="url(#gx-tail)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="212" cy="23" r="7" fill="#E8E6F8" />
      </svg>
      <svg className="absolute" style={{ left: "4%", bottom: "6%", width: 190, height: 190 }} viewBox="0 0 100 100" opacity="0.22">
        <path d="M50 50 m0 -2 a4 4 0 0 1 6 5 a10 10 0 0 1 -14 8 a16 16 0 0 1 4 -26 a24 24 0 0 1 22 34 a32 32 0 0 1 -44 8" fill="none" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" fill="#E8E6F8" />
      </svg>
    </>
  );
}

/* --- Arcade: invaders pixelados + nave + corazón + disparos --- */
const INV = ["..X.....X..", "...X...X...", "..XXXXXXX..", ".XX.XXX.XX.", "XXXXXXXXXXX", "X.XXXXXXX.X", "X.X.....X.X", "...XX.XX..."];
const SHIP = [".....X.....", "....XXX....", ".XXXXXXXXX.", "XXXXXXXXXXX"];
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
function Pixel({ rows, x, y, s, color, o }: { rows: string[]; x: number; y: number; s: number; color: string; o: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      {rows.flatMap((row, r) =>
        row.split("").map((c, cc) => (c === "X" ? <rect key={`${r}-${cc}`} x={cc} y={r} width="1" height="1" fill={color} /> : null))
      )}
    </g>
  );
}
function Arcade() {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none" shapeRendering="crispEdges">
        <Pixel rows={INV} x={120} y={70} s={7} color="#FF2E88" o={0.20} />
        <Pixel rows={INV} x={420} y={100} s={6} color="#2DE2E6" o={0.16} />
        <Pixel rows={INV} x={700} y={60} s={8} color="#FF2E88" o={0.14} />
        <Pixel rows={INV} x={260} y={220} s={5} color="#2DE2E6" o={0.13} />
        <Pixel rows={INV} x={620} y={250} s={6} color="#FF2E88" o={0.12} />
        <Pixel rows={HEART} x={860} y={180} s={6} color="#FF2E88" o={0.22} />
        <Pixel rows={SHIP} x={440} y={600} s={8} color="#2DE2E6" o={0.25} />
        {/* disparos */}
        <rect x="478" y="540" width="6" height="22" fill="#FF2E88" opacity="0.35" />
        <rect x="170" y="150" width="5" height="18" fill="#2DE2E6" opacity="0.25" />
      </svg>
    </>
  );
}

/* ============================ registro ============================ */
const SCENES: Record<string, () => JSX.Element> = {
  cibernetico: Cibernetico,
  superheroes: Superheroes,
  ben10: Ben10,
  hextech: Hextech,
  valorant: Valorant,
  elfhame: Elfhame,
  rosa: Rosa,
  amarillo: Amarillo,
  lavanda: Lavanda,
  menta: Menta,
  oceano: Oceano,
  atardecer: Atardecer,
  cafe: Cafe,
  galaxia: Galaxia,
  arcade: Arcade,
};
