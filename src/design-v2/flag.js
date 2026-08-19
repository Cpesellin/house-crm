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

// Guardamos el OPT-OUT, no el opt-in: el default es v2, así que sólo
// necesitamos recordar a quién quiere volver al diseño anterior.
const OPTOUT_KEY = 'hcrm_design_v1';
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

/**
 * Carga las fuentes del sistema v2 sólo si el shell no las trajo ya.
 * index.html precarga Plus Jakarta Sans, Fraunces y JetBrains Mono, así
 * que en la app real esto no hace nada — queda como red de seguridad
 * para entornos donde el módulo se use fuera del shell.
 */
function loadFonts() {
  if (document.getElementById('v2-fonts')) return;
  const yaCargadas = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some((l) => (l.href || '').includes('Plus+Jakarta+Sans'));
  if (yaCargadas) return;

  const link = document.createElement('link');
  link.id = 'v2-fonts';
  link.rel = 'stylesheet';
  link.href = FONTS_URL;
  document.head.appendChild(link);
}

/**
 * Resuelve el estado del flag.
 *
 * DESDE AGOSTO 2026 EL DEFAULT ES v2: todos los usuarios y dispositivos
 * ven el diseño nuevo sin hacer nada. ?v2=0 queda como escape para
 * volver al anterior, y persiste en ese navegador hasta que se use ?v2=1.
 *
 * Prioridad: override programático > query param > opt-out guardado > v2.
 */
function resolveFlag() {
  // 1) Override programático gana sobre todo
  if (window.__DESIGN_V2__ === true) return true;
  if (window.__DESIGN_V2__ === false) return false;

  // 2) Query param: fuerza uno u otro y persiste la decisión
  const params = new URLSearchParams(location.search);
  const q = params.get('v2');
  if (q === '1' || q === 'true') {
    try { localStorage.removeItem(OPTOUT_KEY); } catch (e) { /* noop */ }
    return true;
  }
  if (q === '0' || q === 'false') {
    try { localStorage.setItem(OPTOUT_KEY, '1'); } catch (e) { /* noop */ }
    return false;
  }

  // 3) ¿Este navegador se salió explícitamente del diseño nuevo?
  try { if (localStorage.getItem(OPTOUT_KEY) === '1') return false; } catch (e) { /* noop */ }

  // 4) Default: diseño nuevo
  return true;
}

/** Aplica (o quita) el diseño v2. Llamado 1 vez desde main.js. */
export function initDesignFlag() {
  _active = resolveFlag();
  const root = document.documentElement;

  if (_active) {
    root.setAttribute('data-design', 'v2');
    loadFonts();
  } else {
    root.removeAttribute('data-design');
    console.log('[design] diseño anterior activo — ?v2=1 para volver al nuevo');
  }
  return _active;
}

/** Toggle en runtime (útil para comparar sin recargar) */
export function toggleV2() {
  _active = !_active;
  if (_active) {
    try { localStorage.removeItem(OPTOUT_KEY); } catch (e) { /* noop */ }
    document.documentElement.setAttribute('data-design', 'v2');
    loadFonts();
  } else {
    try { localStorage.setItem(OPTOUT_KEY, '1'); } catch (e) { /* noop */ }
    document.documentElement.removeAttribute('data-design');
  }
  // Repintar el inventario para que tome el renderer correcto
  if (typeof window.doSearch === 'function') window.doSearch();
  return _active;
}

if (typeof window !== 'undefined') {
  window.__designV2 = { is: isV2, init: initDesignFlag, toggle: toggleV2 };
}
