/**
 * ORDEN DE LA LISTA DE INMUEBLES
 * ══════════════════════════════════════════════════════════════════════
 *
 * El buscador filtraba por rango de precio pero no ordenaba: para saber
 * cuál era el más caro o el más barato había que recorrer la lista a ojo.
 *
 * PRECIO EFECTIVO
 *   Un inmueble puede tener precio de venta, de arriendo o los dos, y no
 *   se pueden comparar entre sí ($400.000.000 de venta contra $2.000.000
 *   mensuales). Se ordena por el precio de la modalidad que el usuario
 *   está mirando: si filtró "Arrendar", manda el arriendo. Sin filtro, se
 *   usa el que el inmueble tenga (venta primero, que es el caso mayoritario).
 *
 * SIN PRECIO
 *   Los inmuebles sin precio van SIEMPRE al final, en los dos sentidos.
 *   Tratarlos como 0 los pondría de primeros al ordenar ascendente, que es
 *   justo donde estorban.
 */

export const ORDENES = {
  reciente:     { id: 'reciente',     label: 'Más recientes',      icono: '🕒' },
  precio_desc:  { id: 'precio_desc',  label: 'Mayor precio',       icono: '↓' },
  precio_asc:   { id: 'precio_asc',   label: 'Menor precio',       icono: '↑' },
  area_desc:    { id: 'area_desc',    label: 'Mayor área',         icono: '↓' },
  area_asc:     { id: 'area_asc',     label: 'Menor área',         icono: '↑' },
};

/** Precio con el que comparar, según la modalidad que se esté viendo. */
function precioEfectivo(p) {
  const neg = window.F?.neg;
  const pv = Number(p.precio_venta) || 0;
  const pa = Number(p.precio_arriendo) || 0;

  if (neg?.size === 1) {
    if (neg.has('arriendo')) return pa;
    if (neg.has('venta')) return pv;
  }
  return pv || pa;
}

const area = (p) => Number(p.area_construida) || Number(p.area_total) || 0;

/** Comparador que empuja los ceros al final en ambos sentidos. */
function porValor(get, desc) {
  return (a, b) => {
    const va = get(a), vb = get(b);
    if (!va && !vb) return 0;
    if (!va) return 1;   // sin dato → al final
    if (!vb) return -1;
    return desc ? vb - va : va - vb;
  };
}

const fecha = (p) => new Date(p.created_at || 0).getTime() || 0;

/**
 * Devuelve una copia ordenada. No muta la lista original: `window.D` es
 * compartida y reordenarla in situ afectaría a otras vistas.
 */
export function ordenarInmuebles(lista, orden) {
  const l = [...(lista || [])];
  switch (orden) {
    case 'precio_desc': return l.sort(porValor(precioEfectivo, true));
    case 'precio_asc':  return l.sort(porValor(precioEfectivo, false));
    case 'area_desc':   return l.sort(porValor(area, true));
    case 'area_asc':    return l.sort(porValor(area, false));
    case 'reciente':
    default:            return l.sort((a, b) => fecha(b) - fecha(a));
  }
}

/** Chip + menú de orden para la barra de filtros. */
export function renderSelectorOrden() {
  const actual = window._ordenActual || 'reciente';
  const o = ORDENES[actual] || ORDENES.reciente;
  const activo = actual !== 'reciente';

  return `<div class="orden-wrap">
    <button class="pill ${activo ? 'pill-on' : 'pill-off'}" id="pillOrden"
      onclick="event.stopPropagation();toggleMenuOrden()">
      <span>⇅ ${o.label}</span>
    </button>
    <div class="orden-menu" id="ordenMenu" hidden>
      ${Object.values(ORDENES).map(x => `
        <button class="orden-opt${x.id === actual ? ' is-sel' : ''}" onclick="setOrden('${x.id}')">
          <span class="orden-opt-ic">${x.icono}</span>
          <span>${x.label}</span>
          ${x.id === actual ? '<span class="orden-opt-check">✓</span>' : ''}
        </button>`).join('')}
    </div>
  </div>`;
}

if (typeof window !== 'undefined') {
  window._ordenActual = window._ordenActual || 'reciente';
  window.ORDENES = ORDENES;
  window.ordenarInmuebles = ordenarInmuebles;
  window.renderSelectorOrden = renderSelectorOrden;

  window.toggleMenuOrden = function () {
    const m = document.getElementById('ordenMenu');
    if (!m) return;
    m.hidden = !m.hidden;
    // Cerrar al tocar fuera; se registra una sola vez por apertura.
    if (!m.hidden) {
      const fuera = (e) => {
        if (!m.contains(e.target) && e.target.id !== 'pillOrden') {
          m.hidden = true;
          document.removeEventListener('click', fuera);
        }
      };
      setTimeout(() => document.addEventListener('click', fuera), 0);
    }
  };

  /** Pinta (o repinta) el chip dentro del ancla que deja App.js. */
  window.pintarSelectorOrden = function () {
    const w = document.getElementById('ordenWrap');
    if (!w) return;
    // renderSelectorOrden ya trae su propio .orden-wrap: usamos su interior
    // para no anidar dos envoltorios y romper el posicionamiento del menú.
    const tmp = document.createElement('div');
    tmp.innerHTML = renderSelectorOrden();
    w.innerHTML = tmp.firstElementChild.innerHTML;
  };

  window.setOrden = function (id) {
    window._ordenActual = id;
    const m = document.getElementById('ordenMenu');
    if (m) m.hidden = true;
    if (typeof window.doSearch === 'function') window.doSearch();
    window.pintarSelectorOrden();
  };

  // El ancla existe desde el arranque; si aún no, se reintenta al cargar.
  // Se comprueba `document` aparte: la lógica de orden es pura y debe poder
  // importarse sin DOM (tests, node) sin arrastrar el cableado de la UI.
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.pintarSelectorOrden());
    } else {
      setTimeout(() => window.pintarSelectorOrden(), 0);
    }
  }
}

export default { ORDENES, ordenarInmuebles, renderSelectorOrden };
