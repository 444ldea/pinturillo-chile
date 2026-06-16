// Declaracion minima para qrcode-generator (sin @types disponible).
declare module "qrcode-generator" {
  interface QRCode {
    addData(data: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
    createDataURL(cellSize?: number, margin?: number): string;
    createSvgTag(opts?: { cellSize?: number; margin?: number }): string;
  }
  function qrcode(
    typeNumber: number,
    errorCorrectionLevel: "L" | "M" | "Q" | "H"
  ): QRCode;
  export = qrcode;
}
