// Color estable por jugador (derivado de su id/nombre) para avatares y chat.
export function colorJugador(semilla: string): string {
  let h = 0;
  for (let i = 0; i < semilla.length; i++) {
    h = (h * 31 + semilla.charCodeAt(i)) % 360;
  }
  return `hsl(${h}, 65%, 58%)`;
}
