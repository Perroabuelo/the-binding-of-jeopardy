import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './ui/theme/tokens.css';
import './ui/theme/base.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Deja la app disponible sin conexión. Las versiones nuevas esperan a que se cierren todas las
// pestañas: no se fuerza la actualización para no interrumpir un juego.
registerSW({ immediate: true });
