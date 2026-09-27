// El repositorio es "type": "module", pero el proceso principal y el preload (con sandbox)
// de Electron se compilan a CommonJS: este package.json lo declara para dist-electron/.
import { writeFileSync } from 'node:fs';

writeFileSync('dist-electron/package.json', `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
