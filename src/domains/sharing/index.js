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
 * Respaldo para cuando no tenemos los datos del inmueble a mano.
 */
export function buildShareText(title, tenantName) {
  const brand = tenantName || (getCurrentTenant().nombre) || 'Inmobiliaria';
  return (title || 'Inmueble') + ' - ' + brand;
}

// ─── Mensaje completo para WhatsApp ──────────────────────────────────
//
// En WhatsApp el enlace aporta la foto grande, pero lo que de verdad se
// lee es el TEXTO del mensaje. Mandábamos una sola línea ("Apartamento en
// Álamos - Inmobiliaria House"), así que el precio, el área y las alcobas
// sólo aparecían si el destinatario abría el enlace.
//
// Esto arma la ficha corta que se espera en el gremio: encabezado en
// negrita (*así* lo pone WhatsApp) y una línea por dato. Sólo se listan
// los datos que existen — nada de "0 baños" ni "Estrato null".
//
// La dirección exacta NO se incluye a propósito: el mensaje se reenvía sin
// control y la ubicación pública del inmueble es barrio y ciudad.

function fmtCOP(n) {
  const v = Number(n);
  if (!v || v <= 0) return '';
  try { return '$' + Math.round(v).toLocaleString('es-CO'); }
  catch (e) { return '$' + Math.round(v); }
}

/** Encabezado y precios según lo que el inmueble ofrezca. */
function negociacionDe(p) {
  const neg = String(p.negociacion || '').toLowerCase();
  const venta = fmtCOP(p.precio_venta);
  const arriendo = fmtCOP(p.precio_arriendo);

  const ofreceArriendo = neg.includes('arriendo') || (!neg && !!arriendo);
  const ofreceVenta = neg.includes('venta') || (!neg && !!venta);

  if (ofreceVenta && ofreceArriendo && venta && arriendo) {
    return { titulo: 'EN VENTA Y ARRIENDO', precios: ['Venta: ' + venta, 'Arriendo: ' + arriendo + '/mes'] };
  }
  if (ofreceArriendo && arriendo) return { titulo: 'EN ARRIENDO', precios: ['Precio: ' + arriendo + '/mes'] };
  if (ofreceVenta && venta) return { titulo: 'EN VENTA', precios: ['Precio: ' + venta] };
  return { titulo: ofreceArriendo ? 'EN ARRIENDO' : 'EN VENTA', precios: ['Precio: consúltanos'] };
}

/**
 * "ÁLAMOS, PEREIRA" — barrio y ciudad, nunca la dirección exacta.
 *
 * Se recorta cada parte porque en los datos hay ciudades guardadas con
 * espacios de sobra ('Pereira ') y salían en el mensaje como
 * "REBECA, PEREIRA ". Lo limpia aquí y no espera a normalizar la tabla.
 */
function ubicacionDe(p) {
  return [p.barrio, p.ciudad]
    .map((s) => String(s || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
    .toUpperCase();
}

function plural(n, singular, prural) {
  return n + ' ' + (Number(n) === 1 ? singular : prural);
}

/**
 * Mensaje listo para WhatsApp. Puro: mismos datos → mismo texto.
 *
 * @param {Object} p - Inmueble (window.D)
 * @param {string} [tenantName] - Nombre de la inmobiliaria
 * @returns {string} Texto SIN la URL — la añade quien comparte
 */
export function buildShareMessage(p, tenantName) {
  if (!p) return '';
  const neg = negociacionDe(p);
  const tipo = String(p.tipo || 'Inmueble').toUpperCase();
  const ubic = ubicacionDe(p);

  const encabezado = [tipo, neg.titulo, ubic ? '· ' + ubic : ''].filter(Boolean).join(' ');

  const datos = neg.precios.slice();
  if (p.area_construida) datos.push('Área: ' + p.area_construida + ' m²');
  if (p.habitaciones) datos.push(plural(p.habitaciones, 'habitación', 'habitaciones'));
  if (p.banos) datos.push(plural(p.banos, 'baño', 'baños'));
  if (p.parqueaderos) datos.push(plural(p.parqueaderos, 'garaje', 'garajes'));
  if (p.estrato) datos.push('Estrato ' + p.estrato);

  const brand = tenantName || (getCurrentTenant().nombre) || '';

  // La URL la añade quien comparte, así que "Más información y fotos:"
  // tiene que ser la ÚLTIMA línea: lo que sigue es el enlace.
  return '*' + encabezado + '*\n\n' +
    datos.map((d) => '• ' + d).join('\n') +
    (brand ? '\n\n' + brand : '') +
    '\nMás información y fotos:';
}

/** Busca el inmueble ya cargado en memoria por código o id. */
function buscarInmueble(codeOrId) {
  const ref = String(codeOrId || '');
  const lista = (typeof window !== 'undefined' && window.D) || [];
  return lista.find((x) => x && (x.id === ref || x.codigo_house === ref)) || null;
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

  // Con los datos del inmueble se manda la ficha completa; sin ellos
  // (una tarjeta de otra vista, la lista aún sin cargar) se cae al
  // título de siempre en vez de no compartir nada.
  const p = buscarInmueble(codeOrId);
  const text = p ? buildShareMessage(p) : buildShareText(title);

  // 1) Web Share API nativa. WhatsApp pega la URL al final del texto,
  //    por eso el mensaje termina en "Más información y fotos:".
  if (navigator.share) {
    try {
      await navigator.share({ title: buildShareText(title), text, url });
      trackShare(codeOrId, 'native');
      return;
    } catch (e) {
      // Usuario canceló — no es error real
      if (e && e.name === 'AbortError') return;
    }
  }

  // 2) Clipboard (escritorio): se copia el mensaje ENTERO, no sólo el
  //    enlace, para poder pegarlo tal cual en WhatsApp Web.
  const completo = text + '\n' + url;
  try {
    await navigator.clipboard.writeText(completo);
    if (window.toast) window.toast('🔗 Mensaje copiado — pégalo en WhatsApp');
    else alert('Mensaje copiado:\n\n' + completo);
    trackShare(codeOrId, 'clipboard');
  } catch {
    // 3) Prompt como último recurso
    prompt('Copia el mensaje:', completo);
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
