import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initInstallCapture } from './pwa/install';
import './styles/index.css';

initInstallCapture();

async function boot() {
  if (import.meta.env.DEV) {
    const seed = new URLSearchParams(location.search).get('seed');
    if (seed) await (await import('./dev/seed')).seedDemo(Number(seed === 'demo' ? 0 : seed));
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void boot();
