/**
 * Módulo: ui/icons
 *
 * Iconos SVG inline del sistema de diseño v2 (stroke-based, estilo Lucide).
 * Reemplazan los emojis del diseño actual en contextos donde el emoji
 * se ve inconsistente entre plataformas (specs, filtros, nav).
 *
 * USO:
 *   icon('bed', 14)                    → SVG de 14px
 *   icon('heart', 17, { fill: 'currentColor' })
 *   icon('pin', 12, { color: 'var(--v2-ink-4)' })
 *
 * Todos heredan currentColor por defecto y usan stroke-width 1.6-1.8
 * según el tamaño, siguiendo el mockup.
 */

const PATHS = {
  // Casa / logo
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',

  // Búsqueda
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',

  // Ubicación
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',

  // Favorito
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',

  // Cámara (contador de fotos)
  camera: '<path d="M3 8.5A2 2 0 0 1 5 6.5h1.6l1-1.6h4.8l1 1.6H15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="10" cy="12" r="2.6"/>',

  // Specs del inmueble
  bed:  '<path d="M2 17v-5h20v5"/><path d="M2 17v3"/><path d="M22 17v3"/><path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M7 12V9.5h4V12"/><path d="M13 12V9.5h4V12"/>',
  bath: '<path d="M3 13h18"/><path d="M5 13v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3"/><path d="M7 13V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2"/><path d="M10.5 6h1"/>',
  area: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4"/><path d="M3 15h4"/><path d="M9 3v4"/><path d="M15 3v4"/>',

  // Etiqueta / negocio
  tag:  '<path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  car:  '<path d="M5 17h14"/><path d="M6 17v2"/><path d="M18 17v2"/><path d="M4 13l1.5-4.5A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.5L20 13v4H4z"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>',

  // Navegación
  chevronDown:  '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  chevronLeft:  '<path d="M15 18l-6-6 6-6"/>',
  close:        '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',

  // Acciones
  share: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  chat:  '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/>',
  money: '<path d="M12 3v18"/><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2a3 3 0 0 0 0 6h2.5a3 3 0 0 1 0 6H10a3.5 3.5 0 0 1-3-1.5"/>',

  // Nav móvil
  grid:  '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  user:  '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  bell:  '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  plus:  '<path d="M12 5v14"/><path d="M5 12h14"/>',

  // Estados
  check: '<path d="M20 6L9 17l-5-5"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
};

/**
 * Devuelve el markup SVG de un icono.
 * @param {string} name  clave de PATHS
 * @param {number} size  px (default 16)
 * @param {object} opts  { fill, color, strokeWidth, style }
 */
export function icon(name, size = 16, opts = {}) {
  const d = PATHS[name];
  if (!d) { console.warn('[icons] no existe:', name); return ''; }

  const fill = opts.fill || 'none';
  const sw = opts.strokeWidth || (size <= 13 ? 1.6 : size <= 18 ? 1.7 : 1.8);
  const style = [
    opts.color ? `color:${opts.color}` : '',
    'flex-shrink:0',
    opts.style || '',
  ].filter(Boolean).join(';');

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="${style}" aria-hidden="true">${d}</svg>`;
}

/** Lista de iconos disponibles (útil para debug) */
export function iconNames() {
  return Object.keys(PATHS);
}

if (typeof window !== 'undefined') {
  window.__icon = icon;
}
