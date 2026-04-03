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
    console.log('[main] Public view mode for:', verId);

    // Wait for Supabase SDK and functions.js to load
    const waitReady = () => new Promise(resolve => {
      const check = () => {
        if (typeof window.supabase !== 'undefined' && typeof window.showPublicView === 'function') resolve();
        else setTimeout(check, 100);
      };
      check();
    });

    await waitReady();

    // If it's a HOUSE code, resolve to UUID
    if (verId.startsWith('HOUSE-')) {
      try {
        const { getSupabaseClient } = await import('./config/supabase.js');
        const { data } = await getSupabaseClient().from('inmuebles').select('id').eq('codigo_house', verId).eq('eliminado', false).single();
        if (data?.id) verId = data.id;
        else { document.getElementById('app').innerHTML = '<div class="emp" style="margin-top:40px"><span class="emp-i">🏠</span><h3>Inmueble no encontrado</h3><p>El código ' + verId + ' no existe o fue retirado.</p></div>'; return; }
      } catch(e) { console.error('[main] Resolve error:', e); }
    }

    window.showPublicView(verId);
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
