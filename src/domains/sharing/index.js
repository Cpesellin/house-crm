/**
 * Módulo: sharing
 *
 * Compartir inmuebles vía Web Share API (mobile) o clipboard (desktop).
 * Disponible para TODOS los perfiles (visitante, publico, interno).
 *
 * URL compartida: {origin}/ver/{codigo}?v={timestamp}
 * El ?v= fuerza a WhatsApp a re-scrapear el preview (evita cache de 30 días).
 *
 * Expuesto en window para compatibilidad con onclick inline en cards del
 * inventario que se generan como strings (load.js, sections.js).
 */

import { getCurrentTenant } from '../../tenant/current.js';

/**
 * Genera la URL compartible del inmueble con cache-buster.
 * Pura (sin side effects) — testeable en aislamiento.
 */
export function buildShareUrl(codeOrId, origin) {
  if (!codeOrId) return null;
  const base = origin || location.origin;
  const cacheBuster = String(Date.now()).slice(-6);
  return base + '/ver/' + encodeURIComponent(codeOrId) + '?v=' + cacheBuster;
}

/**
 * Construye el texto que acompaña al share (título + branding del tenant).
 */
export function buildShareText(title, tenantName) {
  const brand = tenantName || (getCurrentTenant().nombre) || 'Inmobiliaria';
  return (title || 'Inmueble') + ' - ' + brand;
}

/**
 * Comparte el inmueble. Estrategia en 3 pasos:
 *   1. navigator.share() nativo (mobile)
 *   2. clipboard.writeText() (desktop)
 *   3. prompt() (último recurso)
 */
export async function shareInmueble(codeOrId, title) {
  if (!codeOrId) return;

  const url = buildShareUrl(codeOrId);
  const text = buildShareText(title);

  // 1) Web Share API nativa
  if (navigator.share) {
    try {
      await navigator.share({ title: text, text, url });
      trackShare(codeOrId, 'native');
      return;
    } catch (e) {
      // Usuario canceló — no es error real
      if (e && e.name === 'AbortError') return;
    }
  }

  // 2) Clipboard fallback (desktop)
  try {
    await navigator.clipboard.writeText(url);
    if (window.toast) window.toast('🔗 Link copiado al portapapeles');
    else alert('Link copiado: ' + url);
    trackShare(codeOrId, 'clipboard');
  } catch {
    // 3) Prompt como último recurso
    prompt('Copia el link:', url);
  }
}

function trackShare(code, channel) {
  if (window.trackEvent) {
    window.trackEvent('share', { code, channel });
  }
}

// Compat: exponer en window para onclick inline
if (typeof window !== 'undefined') {
  window.shareInmueble = shareInmueble;
}
