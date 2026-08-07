/**
 * Módulo: domains/inmuebles/search
 *
 * Índice de búsqueda de inmuebles (usado por doSearch en filters.js y por
 * las páginas v2 del portafolio). Se computa UNA vez tras el load y se
 * reusa en cada keystroke — evita el Object.values(p).join(' ') que corría
 * 142 veces por tecla y matcheaba UUIDs, timestamps y URLs de fotos.
 *
 * API:
 *   searchNorm(s)          → lowercase + sin acentos ("Montería" → "monteria")
 *   buildSearchIndex(p)    → índice string para un inmueble
 *   ensureSearchIndex(arr) → aplica índice a colección (idempotente)
 *
 * Compat: expuesto en window.* (nombres _searchNorm / _buildSearchIndex /
 * _ensureSearchIndex, con guión bajo por legado).
 */

// Normaliza texto para búsqueda: lowercase + remueve acentos.
// NFD descompone "á" en "a" + combining acute → quitamos los combining
// marks (U+0300..U+036F).
export function searchNorm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Pre-computa un índice de búsqueda por inmueble. Solo campos relevantes.
export function buildSearchIndex(p) {
  if (!p) return '';
  const parts = [
    p.tipo, p.negociacion, p.ciudad, p.barrio,
    p.direccion, p.direccion_publica,
    p.codigo_house, p.estado, p.estrato,
    p.habitaciones, p.banos, p.area_construida,
    p.descripcion_cliente,
    p.captador?.nombre, p.captador?.usuario,
    // Precios sin formato (los inputs de búsqueda escriben sin puntos)
    p.precio_venta, p.precio_arriendo,
  ];
  return searchNorm(parts.filter(Boolean).join(' '));
}

// Aplica el índice a una colección. Idempotente: si ya tiene, no recomputa.
export function ensureSearchIndex(arr) {
  if (!Array.isArray(arr)) return;
  for (const p of arr) {
    if (p && !p._searchIndex) p._searchIndex = buildSearchIndex(p);
  }
}

// ─── Compat: expuestos en window con los nombres legacy ──────────────
if (typeof window !== 'undefined') {
  window._searchNorm = searchNorm;
  window._buildSearchIndex = buildSearchIndex;
  window._ensureSearchIndex = ensureSearchIndex;
}
