import { useMemo } from 'react';
import { qrPath } from './qr';
import styles from './QrCode.module.css';

/** Código QR de una dirección como SVG. El tamaño lo pone `className`. */
export function QrCode({ url, className }: { url: string; className?: string }) {
  const { size, d } = useMemo(() => qrPath(url), [url]);
  // Margen de 4 módulos, como pide el estándar para que los lectores lo reconozcan.
  const margin = 4;
  const side = size + margin * 2;
  return (
    <svg
      role="img"
      aria-label={`Código QR de ${url}`}
      className={className ? `${styles.qr} ${className}` : styles.qr}
      viewBox={`${-margin} ${-margin} ${side} ${side}`}
      shapeRendering="crispEdges"
    >
      <rect x={-margin} y={-margin} width={side} height={side} className={styles.light} />
      <path d={d} className={styles.dark} data-testid="qr-modules" />
    </svg>
  );
}
