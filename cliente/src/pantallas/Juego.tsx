import { useState } from "react";
import { useJuego } from "../estado";
import { BarraSuperior } from "../componentes/BarraSuperior";
import { Lienzo } from "../componentes/Lienzo";
import { ListaJugadores } from "../componentes/ListaJugadores";
import { Chat } from "../componentes/Chat";
import { SelectorPalabra } from "../componentes/SelectorPalabra";
import { BotonInvitar } from "../componentes/BotonInvitar";
import { ResultadosRonda } from "./ResultadosRonda";

const PALETA = [
  "#000000", "#7f8c8d", "#ffffff",
  "#c0392b", "#e74c3c", "#e67e22", "#f39c12", "#f1c40f",
  "#2ecc71", "#27ae60", "#16a085", "#1abc9c",
  "#3498db", "#2980b9", "#34495e", "#9b59b6", "#8e44ad",
  "#e84393", "#fd79a8", "#6d4c41", "#a0522d",
];

const GROSORES = [4, 10, 18, 30];

export function Juego() {
  const {
    sala,
    soyDibujante,
    trazos,
    dibujarTrazo,
    limpiarLienzo,
    opciones,
    resultadosRonda,
  } = useJuego();

  const [color, setColor] = useState("#000000");
  const [grosor, setGrosor] = useState(GROSORES[1]);

  if (!sala) return null;

  const dibujante = sala.jugadores.find((j) => j.id === sala.dibujanteId);
  const eligiendo = sala.estado === "eligiendo";
  const puedeDibujar = soyDibujante && sala.estado === "dibujando";

  return (
    <div className="pantalla juego">
      <BarraSuperior />

      <div className="juego-cuerpo">
        <main className="zona-lienzo">
          <Lienzo
            trazos={trazos}
            esDibujante={puedeDibujar}
            color={color}
            grosor={grosor}
            onTrazo={dibujarTrazo}
          />

          {puedeDibujar && (
            <div className="herramientas">
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
                <label className="color-custom" title="Color personalizado">
                  <input
                    type="color"
                    value={color.length === 7 ? color : "#000000"}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
              </div>
              <div className="grosores">
                {GROSORES.map((g) => (
                  <button
                    key={g}
                    className={`grosor ${grosor === g ? "sel" : ""}`}
                    onClick={() => setGrosor(g)}
                    aria-label={`grosor ${g}`}
                  >
                    <span style={{ width: g, height: g }} />
                  </button>
                ))}
                <button
                  className="grosor goma"
                  onClick={() => setColor("#ffffff")}
                  title="Goma"
                >
                  🧽
                </button>
                <button
                  className="btn fantasma chico"
                  onClick={limpiarLienzo}
                  title="Limpiar todo"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="panel-lateral">
          <div className="panel-invitar">
            <BotonInvitar compacto />
          </div>
          <ListaJugadores />
          <Chat />
        </aside>
      </div>

      {/* Overlays segun estado */}
      {eligiendo && soyDibujante && opciones && <SelectorPalabra />}
      {eligiendo && !soyDibujante && (
        <div className="overlay suave">
          <div className="tarjeta">
            <h2>Esperando…</h2>
            <p>
              <strong>{dibujante?.nombre ?? "Alguien"}</strong> está eligiendo
              palabra.
            </p>
            <div className="spinner" />
          </div>
        </div>
      )}
      {sala.estado === "fin_ronda" && resultadosRonda && <ResultadosRonda />}
    </div>
  );
}
