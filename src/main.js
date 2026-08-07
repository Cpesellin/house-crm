/**
 * House CRM v2.0 - Entry Point
 * Modular Architecture
 */

import './styles/global.css';
import './config/cloudinary.js';
import './utils/sanitizer.js';
import './core/notifications.js';
import './core/sugerencias.js';
import './core/interesados.js';
import './load.js';
import './sections.js';
import './functions.js';
import './interesados-ui.js';
import './pages/property-detail-v2.js';
import './pages/portfolio-list-v2.js';
import './pages/portfolio-app-v2.js';
// NUEVA ESTRUCTURA — módulos por dominio (scaffolding multi-tenant)
import './tenant/current.js';
import './domains/sharing/index.js';
import { initApp } from './App.js';
import { init as initRouter, navigateTo } from './router.js';
import { getSupabaseClient } from './config/supabase.js';

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
    // RESTAURADO: showPublicView (modal viejo del CRM, probado y funcional).
    // El v2 (#/p/:codigo) sigue disponible como ruta opt-in, pero los
    // links compartidos por WhatsApp /ver/HOUSE-X vuelven a usar el modal
    // clásico que era estable. WhatsApp seguirá viendo los OG tags vía
    // /api/ver para los bots.
    console.log('[main] Public view mode for:', verId);
    const app = document.getElementById('app');
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)"><div style="text-align:center"><div style="font-size:32px;margin-bottom:12px">🏠</div><div style="font-size:14px;color:var(--sub);font-weight:600">Cargando inmueble...</div></div></div>';
    await new Promise(resolve => {
      const check = () => (typeof window.supabase !== 'undefined') ? resolve() : setTimeout(check, 100);
      check();
    });
    const SB = getSupabaseClient();
    if (verId.startsWith('HOUSE-')) {
      try {
        const { data } = await SB.from('inmuebles').select('id').eq('codigo_house', verId).eq('eliminado', false).single();
        if (data?.id) { verId = data.id; }
        else {
          app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">🏠</div><h3 style="font-family:Fraunces,serif;font-size:18px;margin-bottom:8px">Inmueble no encontrado</h3><p style="color:var(--sub);font-size:13px">Este enlace puede haber expirado.</p></div></div>';
          return;
        }
      } catch(e) {
        console.error('[main] Resolve error:', e);
        app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">❌</div><h3>Error de conexión</h3></div></div>';
        return;
      }
    }
    await new Promise(resolve => {
      const check = () => (typeof window.showPublicView === 'function') ? resolve() : setTimeout(check, 100);
      check();
    });
    window.showPublicView(verId);
    return;
  }

  // ── Legacy: bloque viejo de showPublicView eliminado.
  // Si en algún momento querés volver al modal antiguo, revertí el commit
  // donde se agregó la redirección a #/p/. ──
  if (false && verId) {
    const app = document.getElementById('app');

    // Show loading while we resolve
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)"><div style="text-align:center"><div style="font-size:32px;margin-bottom:12px">🏠</div><div style="font-size:14px;color:var(--sub);font-weight:600">Cargando inmueble...</div></div></div>';

    // Wait for Supabase SDK to be available
    await new Promise(resolve => {
      const check = () => (typeof window.supabase !== 'undefined') ? resolve() : setTimeout(check, 100);
      check();
    });

    const SB = getSupabaseClient();

    // If it's a HOUSE code, resolve to UUID
    if (verId.startsWith('HOUSE-')) {
      try {
        const { data } = await SB.from('inmuebles').select('id').eq('codigo_house', verId).eq('eliminado', false).single();
        if (data?.id) { verId = data.id; }
        else { app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">🏠</div><h3 style="font-family:Fraunces,serif;font-size:18px;margin-bottom:8px">Inmueble no encontrado</h3><p style="color:var(--sub);font-size:13px">Este enlace puede haber expirado.</p></div></div>'; return; }
      } catch(e) {
        console.error('[main] Resolve error:', e);
        app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">❌</div><h3>Error de conexión</h3></div></div>';
        return;
      }
    }

    // Wait for showPublicView to be available (from functions.js)
    await new Promise(resolve => {
      const check = () => (typeof window.showPublicView === 'function') ? resolve() : setTimeout(check, 100);
      check();
    });

    window.showPublicView(verId);
    return;
  }

  // Check for /arriendos direct URL → pre-filter to arriendo
  const arrPath = window.location.pathname.match(/^\/arriendos\/?$/i);
  if (arrPath) {
    window._preFilterArriendo = true;
    // Set hash to portafolio so the router shows inventory
    if (!location.hash || location.hash === '#/') location.hash = '#/portafolio';
  }

  // Normal app flow
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[main] #app container not found');
    return;
  }

  await initApp(appContainer);
  initRouter();

  // Apply pre-filter if /arriendos URL
  if (window._preFilterArriendo) {
    window._preFilterArriendo = false;
    // Wait for data + filters to be available, then apply arriendo filter
    const waitF = () => {
      const D = window.D || [];
      if (D.length > 0 && window.F && window.doSearch) {
        window.F.neg.clear();
        window.F.neg.add('arriendo');
        if (typeof window.updatePills === 'function') window.updatePills();
        if (typeof window.renderSel === 'function') window.renderSel();
        window.doSearch();
      } else {
        setTimeout(waitF, 300);
      }
    };
    setTimeout(waitF, 800);
  }
});
