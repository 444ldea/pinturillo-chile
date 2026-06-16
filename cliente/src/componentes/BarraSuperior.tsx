import { useState } from "react";
import { useJuego } from "../estado";
import { Guiones } from "./Guiones";
import { alternarMute, estaSilenciado } from "../sonido";

const R = 26;
const CIRC = 2 * Math.PI * R;

function colorTiempo(frac: number): string {
  if (frac > 0.5) return "var(--verde)";
  if (frac > 0.25) return "var(--amarillo)";
  return "var(--rojo)";
}

function RelojCircular({ restante, total }: { restante: number; total: number }) {
  const frac = total > 0 ? Math.max(0, Math.min(1, restante / total)) : 0;
  const color = colorTiempo(frac);
  return (
    <div className={`reloj-circular ${frac <= 0.15 ? "urgente" : ""}`}>
      <svg viewBox="0 0 64 64" width="58" height="58">
        <circle cx="32" cy="32" r={R} className="reloj-fondo" />
        <circle
          cx="32"
          cy="32"
          r={R}
          className="reloj-progreso"
          style={{
            stroke: color,
            strokeDasharray: CIRC,
            strokeDashoffset: CIRC * (1 - frac),
          }}
        />
      </svg>
      <span className="reloj-num" style={{ color }}>
        {restante}
      </span>
    </div>
  );
}

export function BarraSuperior() {
  const { sala, soyDibujante, miPalabra, mascara, tiempoRestante } = useJuego();
  const [mute, setMute] = useState(estaSilenciado());
  if (!sala) return null;

  const dibujando = sala.estado === "dibujando";

  return (
    <header className="barra-superior">
      <div className="bs-bloque ronda">
        <span className="bs-etiqueta">Vuelta</span>
        <span className="bs-valor">
          {Math.max(1, sala.vueltaActual)}/{sala.totalVueltas}
        </span>
      </div>

      <div className="bs-bloque centro">
        {sala.categoriaActual && (
          <div className="bs-categoria">{sala.categoriaActual}</div>
        )}
        {dibujando && soyDibujante && miPalabra ? (
          <div className="bs-palabra-dibujante">
            Dibuja: <strong>{miPalabra}</strong>
          </div>
        ) : (
          <Guiones mascara={mascara} />
        )}
      </div>

      <div className="bs-bloque derecha">
        <button
          className="btn-mute"
          onClick={() => setMute(alternarMute())}
          title={mute ? "Activar sonido" : "Silenciar"}
          aria-label="Sonido"
        >
          {mute ? "🔇" : "🔊"}
        </button>
        {dibujando ? (
          <RelojCircular
            restante={tiempoRestante}
            total={sala.config.segundosPorRonda}
          />
        ) : (
          <div className="reloj-circular vacio">
            <span className="reloj-num">—</span>
          </div>
        )}
      </div>
    </header>
  );
}
