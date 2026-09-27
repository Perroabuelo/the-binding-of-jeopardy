import QRCode from 'qrcode';

export interface QrPath {
  /** Lado en módulos, sin margen. */
  size: number;
  /** Trazado SVG de los módulos oscuros, un cuadrado de 1x1 por módulo. */
  d: string;
}

/** Arma el código QR de un texto como un trazado SVG, sin red ni HTML generado. */
export function qrPath(text: string): QrPath {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const parts: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) parts.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { size: modules.size, d: parts.join('') };
}
