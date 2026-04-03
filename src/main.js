/**
 * House CRM v2.0 - Entry Point
 * Modular Architecture
 */

import './styles/global.css';
import './load.js';
import './sections.js';
import './functions.js';
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

  // Check for public view mode
  // Supports: ?ver=UUID, ?ver=HOUSE-141, or /ver/HOUSE-141
  const params = new URLSearchParams(window.location.search);
  let verId = params.get('ver');

  // Also check path-based URL: /ver/HOUSE-141 or /ver/UUID
  if (!verId) {
    const pathMatch = window.location.pathname.match(/^\/ver\/(.+)$/);
    if (pathMatch) verId = decodeURIComponent(pathMatch[1]);
  }

  if (verId) {
    // If it's a HOUSE code (not UUID), resolve it to UUID first
    if (verId.startsWith('HOUSE-')) {
      try {
        const { data } = await import('./config/supabase.js').then(m => m.getSupabaseClient().from('inmuebles').select('id').eq('codigo_house', verId).eq('eliminado', false).single());
        if (data?.id) verId = data.id;
      } catch(e) { console.error('[main] Could not resolve HOUSE code:', e); }
    }

    // Render public view
    const tryShow = () => {
      if (typeof window.showPublicView === 'function') {
        window.showPublicView(verId);
      } else {
        setTimeout(tryShow, 200);
      }
    };
    tryShow();
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
