import { useState } from "react";
import { useJuego } from "../estado";

interface Props {
  compacto?: boolean;
}

export function BotonInvitar({ compacto = false }: Props) {
  const { enlaceSala, codigo } = useJuego();
  const [copiado, setCopiado] = useState(false);
  if (!enlaceSala) return null;

  const texto = `¡Vente a dibujar! 🎨 Sala de Pinturillo Chile: ${enlaceSala}`;
  const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  async function invitar() {
    // Movil: menu de compartir nativo (WhatsApp, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pinturillo Chile",
          text: "¡Vente a dibujar conmigo! 🎨",
          url: enlaceSala!,
        });
        return;
      } catch {
        // el usuario cancelo: caemos a copiar
      }
    }
    // Desktop o sin share: copiar al portapapeles
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
    </div>
  );
}
