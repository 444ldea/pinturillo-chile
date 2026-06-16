// Configuracion del cliente. La URL de donacion se inyecta con VITE_DONACION_URL
// (ej. tu Ko-fi / PayPal / "invitame un cafe"). Reemplaza el valor por defecto.
export const DONACION_URL: string =
  import.meta.env.VITE_DONACION_URL || "https://ko-fi.com/";

export const HAY_DONACION = /^https?:\/\//.test(DONACION_URL);
