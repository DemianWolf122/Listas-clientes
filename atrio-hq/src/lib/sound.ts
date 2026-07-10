"use client";

/**
 * Sonidos sutiles sintetizados con WebAudio (sin assets). Respetan el toggle de
 * prefs y prefers-reduced-motion se maneja en el caller.
 */
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.05) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durationMs / 1000);
}

/** pop suave al llegar/enviar un mensaje */
export function playPop() {
  tone(520, 90, "sine", 0.04);
}

/** chime alegre al completar una tarea */
export function playChime() {
  tone(660, 120, "sine", 0.05);
  setTimeout(() => tone(880, 160, "sine", 0.05), 90);
}
