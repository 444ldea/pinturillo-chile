import { useEffect, useRef } from "react";
import type { Punto, Trazo } from "../tipos";
import { dibujarUnTrazo, renderLienzo } from "../dibujo";

const ANCHO = 900;
const ALTO = 600;
const MS_EMIT = 55; // ~18 emisiones/s del trazo en vivo

interface Props {
  trazos: Trazo[];
  esDibujante: boolean;
  color: string;
  grosor: number;
  trazoVivoRemoto: Trazo | null; // preview en vivo del dibujante (para los demas)
  onTrazo: (trazo: Trazo) => void;
  onTrazoVivo: (puntos: Punto[]) => void;
  onTrazoVivoFin: () => void;
}

export function Lienzo({
  trazos,
  esDibujante,
  color,
  grosor,
  trazoVivoRemoto,
  onTrazo,
  onTrazoVivo,
  onTrazoVivoFin,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const trazoActual = useRef<Punto[]>([]);
  const ultimoEmit = useRef(0);

  function redibujar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderLienzo(ctx, trazos, ANCHO, ALTO);
    if (esDibujante && trazoActual.current.length > 0) {
      dibujarUnTrazo(ctx, { puntos: trazoActual.current, color, grosor }, ANCHO, ALTO);
    }
    if (!esDibujante && trazoVivoRemoto) {
      dibujarUnTrazo(ctx, trazoVivoRemoto, ANCHO, ALTO);
    }
  }

  useEffect(() => {
    redibujar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trazos, trazoVivoRemoto, esDibujante]);

  function puntoDesdeEvento(e: React.PointerEvent<HTMLCanvasElement>): Punto {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esDibujante) return;
    e.preventDefault();
    dibujando.current = true;
    trazoActual.current = [puntoDesdeEvento(e)];
    ultimoEmit.current = 0;
    canvasRef.current?.setPointerCapture(e.pointerId);
    redibujar();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esDibujante || !dibujando.current) return;
    e.preventDefault();
    trazoActual.current.push(puntoDesdeEvento(e));
    redibujar();
    // Emite el trazo en vivo (throttle) para que los demas lo vean en tiempo real.
    const ahora = performance.now();
    if (ahora - ultimoEmit.current >= MS_EMIT) {
      ultimoEmit.current = ahora;
      onTrazoVivo(trazoActual.current.slice());
    }
  }

  function terminarTrazo() {
    if (!esDibujante || !dibujando.current) return;
    dibujando.current = false;
    const puntos = trazoActual.current;
    trazoActual.current = [];
    if (puntos.length > 0) {
      onTrazoVivo(puntos.slice()); // flush ultimo
      onTrazo({ puntos, color, grosor }); // commit
    }
    onTrazoVivoFin();
  }

  return (
    <div className="lienzo-contenedor">
      <canvas
        ref={canvasRef}
        width={ANCHO}
        height={ALTO}
        className={esDibujante ? "lienzo activo" : "lienzo"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={terminarTrazo}
        onPointerLeave={terminarTrazo}
        onPointerCancel={terminarTrazo}
      />
    </div>
  );
}
