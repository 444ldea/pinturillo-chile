import { useRef, useState } from "react";
import { useJuego } from "../estado";
import type { Punto, Trazo } from "../tipos";
import { dibujarUnTrazo, renderLienzo } from "../dibujo";

const LADO = 200; // resolucion interna de dibujo
const EXPORT = 100; // resolucion del PNG exportado (chico para compartir)

const PALETA = [
  "#000000", "#e53935", "#fb8c00", "#fdd835",
  "#43a047", "#1e88e5", "#8e24aa", "#6d4c41",
];
const GROSORES = [6, 14];

export function EditorAvatar({ onCerrar }: { onCerrar: () => void }) {
  const { guardarAvatar } = useJuego();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trazos = useRef<Trazo[]>([]);
  const actual = useRef<Punto[]>([]);
  const dibujando = useRef(false);
  const [color, setColor] = useState("#000000");
  const [grosor, setGrosor] = useState(GROSORES[0]);

  function redibujar() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    renderLienzo(ctx, trazos.current, LADO, LADO);
    if (actual.current.length > 0) {
      dibujarUnTrazo(ctx, { puntos: actual.current, color, grosor }, LADO, LADO);
    }
  }

  function punto(e: React.PointerEvent<HTMLCanvasElement>): Punto {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    dibujando.current = true;
    actual.current = [punto(e)];
    canvasRef.current?.setPointerCapture(e.pointerId);
    redibujar();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    actual.current.push(punto(e));
    redibujar();
  }
  function up() {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (actual.current.length > 0) {
      trazos.current.push({ puntos: actual.current, color, grosor });
    }
    actual.current = [];
    redibujar();
  }

  function limpiar() {
    trazos.current = [];
    actual.current = [];
    redibujar();
  }
  function deshacer() {
    trazos.current.pop();
    redibujar();
  }

  function guardar() {
    const off = document.createElement("canvas");
    off.width = EXPORT;
    off.height = EXPORT;
    const c = off.getContext("2d");
    if (!c) return;
    renderLienzo(c, trazos.current, EXPORT, EXPORT);
    guardarAvatar(off.toDataURL("image/png"));
    onCerrar();
  }

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="tarjeta editor-avatar" onClick={(e) => e.stopPropagation()}>
        <h2>Dibuja tu avatar ✏️</h2>
        <canvas
          ref={canvasRef}
          width={LADO}
          height={LADO}
          className="canvas-avatar"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          onPointerCancel={up}
        />
        <div className="ea-herramientas">
          <div className="paleta">
            {PALETA.map((c) => (
              <button
                key={c}
                className={`color ${color === c ? "sel" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`color ${c}`}
              />
            ))}
            <button
              className="grosor goma"
              onClick={() => setColor("#ffffff")}
              title="Goma"
            >
              🧽
            </button>
          </div>
          <div className="grosores">
            {GROSORES.map((g) => (
              <button
                key={g}
                className={`grosor ${grosor === g ? "sel" : ""}`}
                onClick={() => setGrosor(g)}
              >
                <span style={{ width: g, height: g }} />
              </button>
            ))}
            <button className="btn fantasma chico" onClick={deshacer}>
              ↶
            </button>
            <button className="btn fantasma chico" onClick={limpiar}>
              Limpiar
            </button>
          </div>
        </div>
        <div className="fila centro">
          <button className="btn primario" onClick={guardar}>
            Guardar avatar
          </button>
          <button className="btn fantasma" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
