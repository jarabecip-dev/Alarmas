import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registrar el Service Worker para permitir la instalación inteligente PWA en el teléfono
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registrado satisfactoriamente:', reg.scope);
      })
      .catch((err) => {
        console.warn('Registro de Service Worker falló o requiere protocolo seguro (HTTPS):', err);
      });
  });
}
