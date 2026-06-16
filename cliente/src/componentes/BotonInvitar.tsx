import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { useJuego } from "../estado";

interface Props {
  compacto?: boolean;
}

export function BotonInvitar({ compacto = false }: Props) {
  const { enlaceSala, codigo } = useJuego();
  const [copiado, setCopiado] = useState(false);
  const [mostrarQR, setMostrarQR] = useState(false);
  if (!enlaceSala) return null;

  const texto = `¡Vente a dibujar! 🎨 Sala de Pinturillo Chile: ${enlaceSala}`;
  const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  async function invitar() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pinturillo Chile",
          text: "¡Vente a dibujar conmigo! 🎨",
          url: enlaceSala!,
        });
        return;
      } catch {
        /* cancelado: copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(enlaceSala!);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className={`invitar ${compacto ? "compacto" : ""}`}>
      <button className="btn primario" onClick={invitar}>
        {copiado ? "¡Link copiado!" : "🔗 Invitar amigos"}
      </button>
      <button
        className="btn secundario"
        onClick={() => setMostrarQR(true)}
        title="Mostrar código QR"
      >
        📷 QR
      </button>
      {!compacto && (
        <a
          className="btn secundario whatsapp"
          href={urlWhatsapp}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      )}
      {!compacto && codigo && (
        <span className="invitar-codigo" title="Código de sala">
          {codigo}
        </span>
      )}

      {mostrarQR && (
        <ModalQR enlace={enlaceSala} onCerrar={() => setMostrarQR(false)} />
      )}
    </div>
  );
}

function ModalQR({ enlace, onCerrar }: { enlace: string; onCerrar: () => void }) {
  const dataUrl = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(enlace);
    qr.make();
    return qr.createDataURL(6, 4);
  }, [enlace]);

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="tarjeta qr-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Escanea para entrar</h2>
        <img className="qr-img" src={dataUrl} alt="Código QR de la sala" />
        <p className="ayuda qr-enlace">{enlace}</p>
        <button className="btn primario" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
