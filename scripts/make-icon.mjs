// Genera build/icon.ico a partir de public/icon.svg (el ícono del instalador y de la app).
// Dibuja el SVG con el Chromium de Playwright en cada tamaño y arma un .ico con PNG embebidos.
// Uso: node scripts/make-icon.mjs (requiere `npx playwright install chromium`).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const svg = readFileSync('public/icon.svg', 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
const pngs = [];
for (const size of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  pngs.push(await page.screenshot({ omitBackground: true }));
}
await browser.close();

// Formato ICO: cabecera de 6 bytes, una entrada de 16 bytes por imagen y luego los PNG.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(SIZES.length, 4);
const entries = [];
let offset = 6 + 16 * SIZES.length;
SIZES.forEach((size, index) => {
  const png = pngs[index];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  entries.push(entry);
});

mkdirSync('build', { recursive: true });
writeFileSync('build/icon.ico', Buffer.concat([header, ...entries, ...pngs]));
console.log(`build/icon.ico: ${SIZES.join(', ')} px`);
