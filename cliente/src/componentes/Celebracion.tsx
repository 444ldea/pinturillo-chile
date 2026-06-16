import { useEffect, useMemo, useRef, useState } from "react";
import { useJuego } from "../estado";

const COLORES = [
  "#e53935", "#fb8c00", "#fdd835", "#43a047",
  "#1e88e5", "#8e24aa", "#ff80ab", "#ffffff",
];

interface Pieza {
  left: number;
  delay: number;
  dur: number;
  color: string;
  rot: number;
  size: number;
}

export function Celebracion() {
  const { ultimoAcierto } = useJuego();
  const [activo, setActivo] = useState<{ ts: number; intenso: boolean } | null>(
    null
  );
  const ultimoTs = useRef(0);

  useEffect(() => {
    if (!ultimoAcierto) return;
    if (ultimoAcierto.ts === ultimoTs.current) return;
    ultimoTs.current = ultimoAcierto.ts;
    setActivo({ ts: ultimoAcierto.ts, intenso: ultimoAcierto.esYo });
    const t = setTimeout(() => setActivo(null), 1600);
    return () => clearTimeout(t);
  }, [ultimoAcierto]);

  const piezas = useMemo<Pieza[]>(() => {
    if (!activo) return [];
    const n = activo.intenso ? 60 : 28;
    return Array.from({ length: n }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1 + Math.random() * 0.8,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      rot: Math.random() * 360,
      size: 7 + Math.random() * 7,
    }));
  }, [activo]);

  if (!activo) return null;

  return (
    <div className={`celebracion ${activo.intenso ? "intenso" : ""}`} aria-hidden>
      {activo.intenso && <div className="flash-verde" />}
      {piezas.map((p, i) => (
        <span
          key={i}
          className="confeti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
