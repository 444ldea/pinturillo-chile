import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ProveedorJuego } from "./estado";
import "./estilos.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProveedorJuego>
      <App />
    </ProveedorJuego>
  </React.StrictMode>
);
