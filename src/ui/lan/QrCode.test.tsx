import { render, screen, within } from '@testing-library/react';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { qrPath } from './qr';
import { QrCode } from './QrCode';

describe('QrCode', () => {
  it('dibuja un QR que codifica la dirección', () => {
    render(<QrCode url="http://192.168.1.20:47470/" />);
    const qr = screen.getByRole('img', { name: 'Código QR de http://192.168.1.20:47470/' });
    const modules = within(qr as unknown as HTMLElement).getByTestId('qr-modules');
    expect(modules.getAttribute('d')).toBe(qrPath('http://192.168.1.20:47470/').d);
    // El trazado corresponde a esa dirección y no a otra.
    expect(modules.getAttribute('d')).not.toBe(qrPath('http://172.25.0.1:47470/').d);
    const dark = QRCode.create('http://192.168.1.20:47470/', {
      errorCorrectionLevel: 'M',
    }).modules.data.filter(Boolean).length;
    expect(modules.getAttribute('d')!.match(/M/g)).toHaveLength(dark);
  });
});
