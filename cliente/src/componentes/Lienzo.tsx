import { useEffect, useRef } from "react";
import type { Punto, Trazo } from "../tipos";
import { dibujarUnTrazo, renderLienzo } from "../dibujo";

const ANCHO = 900;
const ALTO = 600;

interface Props {
  trazos: Trazo[];
  esDibujante: boolean;
  color: string;
  grosor: number;
  onTrazo: (trazo: Trazo) => void;
}

export function Lienzo({ trazos, esDibujante, color, grosor, onTrazo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const trazoActual = useRef<Punto[]>([]);

  function redibujar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderLienzo(ctx, trazos, ANCHO, ALTO);
    if (trazoActual.current.length > 0) {
      dibujarUnTrazo(ctx, { puntos: trazoActual.current, color, grosor }, ANCHO, ALTO);
    }
  }

  useEffect(() => {
    redibujar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trazos]);

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
    canvasRef.current?.setPointerCapture(e.pointerId);
    redibujar();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esDibujante || !dibujando.current) return;
    e.preventDefault();
    trazoActual.current.push(puntoDesdeEvento(e));
    redibujar();
  }

  function terminarTrazo() {
    if (!esDibujante || !dibujando.current) return;
    dibujando.current = false;
    const puntos = trazoActual.current;
    trazoActual.current = [];
    if (puntos.length > 0) {
      onTrazo({ puntos, color, grosor });
    }
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
