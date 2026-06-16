import { useEffect, useRef, useState } from "react";
import { useJuego } from "../estado";

/** Overlay "¡SALUD!" del modo carrete (cada 3 dibujos). */
export function Salud() {
  const { saludTs } = useJuego();
  const [visible, setVisible] = useState(false);
  const ultimo = useRef(0);

  useEffect(() => {
    if (!saludTs || saludTs === ultimo.current) return;
    ultimo.current = saludTs;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3800);
    return () => clearTimeout(t);
  }, [saludTs]);

  if (!visible) return null;

  return (
    <div className="salud-overlay" aria-hidden>
      <div className="salud-caja">
        <div className="salud-emoji">🍻</div>
        <div className="salud-texto">¡SALUD!</div>
        <div className="salud-sub">Van 3 dibujos… ¡a tomar!</div>
      </div>
    </div>
  );
}
