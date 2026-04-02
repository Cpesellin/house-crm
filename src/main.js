/**
 * House CRM v2.0 - Entry Point
 * Modular Architecture
 */

import './styles/global.css';
import './load.js';
import './sections.js';
import { initApp } from './App.js';
import { init as initRouter, navigateTo } from './router.js';

// ---------------------------------------------------------------------------
// Store router reference for App.js backward compat bridge
// ---------------------------------------------------------------------------
window.__router = { navigateTo };

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[House CRM] Uncaught error:', { message, source, lineno, colno, error });

  // Show a toast if the function is available
  if (typeof window.toast === 'function') {
    window.toast(`Error inesperado: ${message}`, 'error', 5000);
  }

  // Don't suppress the error from the console
  return false;
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('[House CRM] Unhandled promise rejection:', event.reason);
  if (typeof window.toast === 'function') {
    const msg = event.reason?.message || 'Error inesperado';
    window.toast(msg, 'error', 5000);
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  console.log('House CRM v2.0 \u2014 Modular Architecture');

  // Check for public view mode  (?ver=<id>)
  const params = new URLSearchParams(window.location.search);
  const verId = params.get('ver');

  if (verId) {
    // Public property view - load only what is needed
    try {
      const { showPublicView } = await import('./features/public-view.js');
      showPublicView(verId);
    } catch (err) {
      console.error('[main] Failed to load public view module:', err);
      document.getElementById('app').innerHTML =
        '<div style="padding:2rem;text-align:center;">' +
        '<h2>Error al cargar vista p\u00FAblica</h2>' +
        '<p>No se pudo cargar la propiedad solicitada.</p></div>';
    }
    return;
  }

  // Normal app flow
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[main] #app container not found');
    return;
  }

  await initApp(appContainer);
  initRouter();
});
