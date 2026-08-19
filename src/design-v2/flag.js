/**
 * Módulo: design-v2/flag
 *
 * Controla si el diseño v2 (editorial cálido) está activo.
 *
 * ACTIVACIÓN (cualquiera de estas):
 *   1. ?v2=1        en la URL           → activa y persiste
 *   2. ?v2=0        en la URL           → desactiva y persiste
 *   3. localStorage 'hcrm_design_v2'    → persistencia entre visitas
 *   4. window.__DESIGN_V2__ = true      → override programático
 *
 * EFECTO:
 *   Pone data-design="v2" en <html>. Todo el CSS de tokens-v2.css
 *   está namespaceado bajo ese atributo, así que sin el flag no
 *   afecta absolutamente nada.
 *
 * FUENTES:
 *   Plus Jakarta Sans y JetBrains Mono se cargan SOLO si el flag
 *   está activo, para no penalizar a quien usa el diseño actual.
 *   Fraunces ya viene del shell existente.
 */

const STORAGE_KEY = 'hcrm_design_v2';
const FONTS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Plus+Jakarta+Sans:wght@400;500;600;700;800' +
  '&family=JetBrains+Mono:wght@400;500' +
  '&display=swap';

let _active = false;

/** ¿Está activo el diseño v2? */
export function isV2() {
  return _active;
}

/** Carga las fuentes del sistema v2 (idempotente) */
function loadFonts() {
  if (document.getElementById('v2-fonts')) return;
  const link = document.createElement('link');
  link.id = 'v2-fonts';
  link.rel = 'stylesheet';
  link.href = FONTS_URL;
  document.head.appendChild(link);
}

/** Resuelve el estado del flag desde URL / storage / override */
function resolveFlag() {
  // 1) Override programático gana sobre todo
  if (window.__DESIGN_V2__ === true) return true;
  if (window.__DESIGN_V2__ === false) return false;

  // 2) Query param: activa/desactiva y persiste
  const params = new URLSearchParams(location.search);
  const q = params.get('v2');
  if (q === '1' || q === 'true') {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* noop */ }
    return true;
  }
  if (q === '0' || q === 'false') {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    return false;
  }

  // 3) Persistencia
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
}

/** Aplica (o quita) el diseño v2. Llamado 1 vez desde main.js. */
export function initDesignFlag() {
  _active = resolveFlag();
  const root = document.documentElement;

  if (_active) {
    root.setAttribute('data-design', 'v2');
    loadFonts();
    console.log('[design] v2 activo — ?v2=0 para volver al diseño actual');
  } else {
    root.removeAttribute('data-design');
  }
  return _active;
}

/** Toggle en runtime (útil para comparar sin recargar) */
export function toggleV2() {
  _active = !_active;
  if (_active) {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* noop */ }
    document.documentElement.setAttribute('data-design', 'v2');
    loadFonts();
  } else {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    document.documentElement.removeAttribute('data-design');
  }
  // Repintar el inventario para que tome el renderer correcto
  if (typeof window.doSearch === 'function') window.doSearch();
  return _active;
}

if (typeof window !== 'undefined') {
  window.__designV2 = { is: isV2, init: initDesignFlag, toggle: toggleV2 };
}
