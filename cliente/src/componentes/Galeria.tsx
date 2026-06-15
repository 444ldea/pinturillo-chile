import { useEffect, useRef } from "react";
import { useJuego } from "../estado";
import type { DibujoGaleria } from "../tipos";
import { renderLienzo } from "../dibujo";

const MW = 360;
const MH = 240;

async function exportarBlob(
  canvas: HTMLCanvasElement,
  nombreArchivo: string,
  textoShare: string
) {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const archivo = new File([blob], nombreArchivo, { type: "image/png" });
    // Movil: compartir la imagen directo si se puede
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (nav.canShare && nav.canShare({ files: [archivo] }) && navigator.share) {
      try {
        await navigator.share({ files: [archivo], text: textoShare });
        return;
      } catch {
        /* cancelado: descargar */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function MiniDibujo({ dibujo }: { dibujo: DibujoGaleria }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) renderLienzo(ctx, dibujo.trazos, MW, MH);
  }, [dibujo]);

  function guardar() {
    if (!ref.current) return;
    exportarBlob(
      ref.current,
      `pinturillo-${dibujo.palabra}.png`,
      `${dibujo.palabra} — dibujado en Pinturillo Chile 🎨`
    );
  }

  return (
    <div className="mini-dibujo">
      <canvas ref={ref} width={MW} height={MH} className="mini-canvas" />
      <div className="mini-info">
        <strong>{dibujo.palabra}</strong>
        <span className="mini-autor">por {dibujo.nombreDibujante}</span>
      </div>
      <button className="btn fantasma chico" onClick={guardar}>
        ⬇️ Guardar dibujo
      </button>
    </div>
  );
}

export function Galeria() {
  const { galeria, enlaceSala } = useJuego();
  if (!galeria || galeria.length === 0) return null;

  function compartirGaleria() {
    const dibujos = galeria.slice(0, 6);
    const cols = dibujos.length <= 1 ? 1 : 2;
    const rows = Math.ceil(dibujos.length / cols);
    const cw = 400;
    const ch = 267;
    const pad = 24;
    const labelH = 40;
    const headerH = 90;
    const footerH = 56;
    const W = cols * cw + (cols + 1) * pad;
    const H = headerH + rows * (ch + labelH + pad) + footerH;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // fondo
    ctx.fillStyle = "#0a2342";
    ctx.fillRect(0, 0, W, H);
    // titulo
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 40px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Pinturillo Chile — La galería 🎨", W / 2, 56);

    dibujos.forEach((d, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = pad + c * (cw + pad);
      const y = headerH + r * (ch + labelH + pad);
      ctx.save();
      ctx.translate(x, y);
      renderLienzo(ctx, d.trazos, cw, ch); // fondo blanco + trazos
      ctx.restore();
      // etiqueta
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${d.palabra} — ${d.nombreDibujante}`,
        x + cw / 2,
        y + ch + 28
      );
    });

    // pie con link
    ctx.fillStyle = "#9fb3cc";
    ctx.font = "22px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      enlaceSala ? `Juega en ${enlaceSala}` : "Juega Pinturillo Chile",
      W / 2,
      H - 20
    );

    exportarBlob(
      canvas,
      "pinturillo-galeria.png",
      "¡Mira los dibujos de nuestra partida en Pinturillo Chile! 🎨"
    );
  }

  return (
    <section className="tarjeta galeria">
      <div className="galeria-cabecera">
        <h3>La galería</h3>
        <button className="btn secundario chico" onClick={compartirGaleria}>
          📤 Compartir la galería
        </button>
      </div>
      <div className="galeria-grid">
        {galeria.map((d, i) => (
          <MiniDibujo key={i} dibujo={d} />
        ))}
      </div>
    </section>
  );
}
