// ============================================================================
// Sonidos del juego generados con Web Audio API (sin archivos de audio).
// Beeps/arpegios cortos para acierto, tic del reloj, inicio de ronda, etc.
// Mute persistente en localStorage. El AudioContext se desbloquea con el primer
// gesto del usuario (requisito de los navegadores).
// ============================================================================

const K_MUTE = "pinturillo_mute";

let ctx: AudioContext | null = null;
let silenciado = localStorage.getItem(K_MUTE) === "1";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Desbloqueo en el primer gesto.
if (typeof window !== "undefined") {
  const desbloquear = () => getCtx();
  window.addEventListener("pointerdown", desbloquear, { once: true });
  window.addEventListener("keydown", desbloquear, { once: true });
}

export function estaSilenciado(): boolean {
  return silenciado;
}

export function alternarMute(): boolean {
  silenciado = !silenciado;
  localStorage.setItem(K_MUTE, silenciado ? "1" : "0");
  return silenciado;
}

/** Toca una secuencia de notas (frecuencia Hz, inicio s, duracion s). */
function tocar(
  notas: { f: number; t: number; d: number; tipo?: OscillatorType; vol?: number }[]
) {
  if (silenciado) return;
  const ac = getCtx();
  if (!ac) return;
  const ahora = ac.currentTime;
  for (const n of notas) {
    const osc = ac.createOscillator();
    const gan = ac.createGain();
    osc.type = n.tipo ?? "sine";
    osc.frequency.value = n.f;
    const vol = n.vol ?? 0.18;
    const t0 = ahora + n.t;
    gan.gain.setValueAtTime(0, t0);
    gan.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
    osc.connect(gan).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + n.d + 0.02);
  }
}

export const sonidos = {
  // Arpegio alegre ascendente
  acierto: () =>
    tocar([
      { f: 523, t: 0, d: 0.12, tipo: "triangle" },
      { f: 659, t: 0.09, d: 0.12, tipo: "triangle" },
      { f: 784, t: 0.18, d: 0.18, tipo: "triangle" },
    ]),
  // Yo adiviné: más festivo
  acertasteTu: () =>
    tocar([
      { f: 523, t: 0, d: 0.12, tipo: "triangle" },
      { f: 659, t: 0.08, d: 0.12, tipo: "triangle" },
      { f: 784, t: 0.16, d: 0.12, tipo: "triangle" },
      { f: 1047, t: 0.24, d: 0.22, tipo: "triangle" },
    ]),
  tic: () => tocar([{ f: 880, t: 0, d: 0.06, tipo: "square", vol: 0.07 }]),
  inicioRonda: () =>
    tocar([
      { f: 392, t: 0, d: 0.1 },
      { f: 587, t: 0.1, d: 0.16 },
    ]),
  cerca: () => tocar([{ f: 330, t: 0, d: 0.12, tipo: "sine", vol: 0.12 }]),
  finPartida: () =>
    tocar([
      { f: 523, t: 0, d: 0.15, tipo: "triangle" },
      { f: 659, t: 0.13, d: 0.15, tipo: "triangle" },
      { f: 784, t: 0.26, d: 0.15, tipo: "triangle" },
      { f: 1047, t: 0.39, d: 0.3, tipo: "triangle" },
    ]),
  jugadorEntra: () =>
    tocar([
      { f: 587, t: 0, d: 0.08, vol: 0.1 },
      { f: 784, t: 0.07, d: 0.1, vol: 0.1 },
    ]),
};
