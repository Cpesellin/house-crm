/**
 * MI DÍA — vista por defecto del módulo Interesados (diseño v3)
 * ══════════════════════════════════════════════════════════════════════
 *
 * El tablero kanban responde "¿cómo va el embudo?". Mi Día responde la
 * pregunta que el asesor realmente se hace al abrir el CRM: "¿a quién
 * llamo ahora?". Por eso es la vista que abre.
 *
 * Agrupa los leads del asesor en bloques accionables, en orden de
 * urgencia real:
 *
 *   1. Visitas de hoy        — compromiso ya adquirido, no se puede fallar
 *   2. Contactar urgentemente — score alto: se enfrían si no se llaman hoy
 *   3. Sin actividad          — llevan días en silencio
 *   4. Nuevos sin contactar   — entraron y nadie los ha tocado
 *
 * Un lead aparece en UN solo grupo (el primero que lo reclama), para que
 * la lista sea una cola de trabajo y no un inventario repetido.
 *
 * SCORE
 *   0-100, compuesto por urgencia declarada + etapa del embudo + silencio
 *   acumulado. No es el `calcScoreInteres` de domains/leads: aquel califica
 *   la *calidad* de un interés sobre un inmueble (crédito, presupuesto);
 *   este prioriza la *atención* que un lead necesita hoy.
 */

import { TIPIFICACIONES, tipTono } from '../../core/interesados.js';

const DIA = 86400000;

// ─── Score de priorización ───────────────────────────────────────────

const PESO_URGENCIA   = { inmediata: 40, '1-3_meses': 20, '6+_meses': 5 };
const PESO_ETAPA      = {
  negociacion: 30, visita_realizada: 25, visita_agendada: 20,
  contactado: 12, nuevo: 15, en_seguimiento: 8,
  cierre_ganado: 0, cierre_perdido: 0,
};

/** Días transcurridos desde la última actividad registrada. */
export function diasEnSilencio(lead) {
  const ref = lead.fecha_ultima_actividad || lead.created_at;
  if (!ref) return 0;
  const t = new Date(ref).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / DIA));
}

/**
 * Prioridad de atención del lead hoy, 0-100.
 * Los cierres quedan en 0: ya no piden acción.
 */
export function scoreLead(lead) {
  if (lead.tipificacion === 'cierre_ganado' || lead.tipificacion === 'cierre_perdido') return 0;

  let s = 10; // piso: todo lead vivo merece algo de atención
  s += PESO_URGENCIA[lead.urgencia] || 0;
  s += PESO_ETAPA[lead.tipificacion] ?? 10;

  // El silencio pesa, pero satura: a los 10 días ya no distingue.
  s += Math.min(20, diasEnSilencio(lead) * 2);

  return Math.max(0, Math.min(100, Math.round(s)));
}

/** Franja del score, para el color del badge. */
export function bandaScore(score) {
  if (score >= 70) return { id:'alta',  fg:'#a51c1c', bg:'#fef0f0', bd:'#f8cfcf' };
  if (score >= 45) return { id:'media', fg:'#8a5a00', bg:'#fbf3e3', bd:'#eeddb9' };
  return              { id:'baja',  fg:'#6b6760', bg:'#f7f2e9', bd:'#e8e0d2' };
}

// ─── Agrupación ──────────────────────────────────────────────────────

/**
 * Reparte los leads en los bloques de Mi Día.
 * `visitasHoy` son filas de visitas_agendadas ya filtradas al día de hoy.
 */
export function agruparMiDia(leads, visitasHoy = []) {
  const conVisitaHoy = new Set(
    visitasHoy.filter(v => v.estado !== 'cancelada').map(v => v.interesado_id)
  );

  const grupos = {
    visitas_hoy: { id:'visitas_hoy', label:'Visitas de hoy',        icono:'📍', leads:[] },
    urgentes:    { id:'urgentes',    label:'Contactar urgentemente', icono:'🔥', leads:[] },
    silencio:    { id:'silencio',    label:'Sin actividad',          icono:'💤', leads:[] },
    nuevos:      { id:'nuevos',      label:'Nuevos sin contactar',   icono:'✨', leads:[] },
  };

  for (const l of leads) {
    if (l.tipificacion === 'cierre_ganado' || l.tipificacion === 'cierre_perdido') continue;

    const score = scoreLead(l);
    const dias  = diasEnSilencio(l);
    const item  = { ...l, _score: score, _dias: dias };

    // Orden de reclamo: el primero que aplica se queda con el lead.
    if (conVisitaHoy.has(l.id)) {
      const v = visitasHoy.find(x => x.interesado_id === l.id);
      item._hint = v?.hora_visita ? `Visita a las ${v.hora_visita}` : 'Visita hoy';
      grupos.visitas_hoy.leads.push(item);
    } else if (l.tipificacion === 'nuevo' && dias < 2) {
      item._hint = dias === 0 ? 'Entró hoy' : 'Entró ayer';
      grupos.nuevos.leads.push(item);
    } else if (score >= 70) {
      item._hint = 'Contactar urgentemente';
      grupos.urgentes.leads.push(item);
    } else if (dias >= 3) {
      item._hint = `Sin actividad hace ${dias} día${dias === 1 ? '' : 's'}`;
      grupos.silencio.leads.push(item);
    }
  }

  // Dentro de cada bloque, primero lo más urgente.
  for (const g of Object.values(grupos)) g.leads.sort((a, b) => b._score - a._score);

  // Las visitas del día van por hora, no por score.
  grupos.visitas_hoy.leads.sort((a, b) =>
    String(a._hint).localeCompare(String(b._hint)));

  return Object.values(grupos).filter(g => g.leads.length);
}

// ─── Carga de datos ──────────────────────────────────────────────────

/** Visitas agendadas para hoy del asesor (tolerante a fallos de la consulta). */
export async function visitasDeHoy(asesorId) {
  if (typeof window.obtenerVisitas !== 'function') return [];
  try {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    const f = { fecha_desde: iso, fecha_hasta: iso };
    if (asesorId) f.asesor_id = asesorId;
    return await window.obtenerVisitas(f) || [];
  } catch (e) {
    console.warn('[mi-dia] no se pudieron cargar las visitas de hoy:', e?.message || e);
    return [];
  }
}

// ─── Render ──────────────────────────────────────────────────────────

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const iniciales = (nombre) => String(nombre || '?')
  .trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';

function _tarjeta(l) {
  const tip  = tipTono(l.tipificacion);
  const tipL = (TIPIFICACIONES[l.tipificacion] || {}).label || l.tipificacion || '—';
  const band = bandaScore(l._score);
  const inm  = l.inmueble || {};
  const tel  = (l.telefono || '').replace(/\D/g, '');

  return `<div class="md-lead" onclick="abrirDetalleInteresado('${l.id}')">
    <div class="md-ini" style="background:${tip.bg};border:1px solid ${tip.bd};color:${tip.fg}">${esc(iniciales(l.nombre_completo))}</div>
    <div class="md-body">
      <div class="md-nombre">${esc(l.nombre_completo || 'Sin nombre')}</div>
      <div class="md-hint">${esc(l._hint || '')}</div>
      <div class="md-meta">
        <span class="md-chip" style="background:${tip.bg};border:1px solid ${tip.bd};color:${tip.fg}">${esc(tipL)}</span>
        ${inm.codigo_house ? `<span class="md-cod">${esc(inm.codigo_house)}</span>` : ''}
        ${l.privado ? '<span class="md-cod" title="Sólo tú y los administradores ven este lead">🔒 Privado</span>' : ''}
      </div>
    </div>
    <div class="md-right">
      <div class="md-score" style="background:${band.bg};border:1px solid ${band.bd};color:${band.fg}">
        <span class="md-score-n">${l._score}</span><span class="md-score-l">score</span>
      </div>
      ${tel ? `<a class="md-cta" href="https://wa.me/57${esc(tel)}" target="_blank" rel="noopener"
        onclick="event.stopPropagation()">Contactar</a>` : ''}
    </div>
  </div>`;
}

/** HTML completo de la vista. `leads` ya viene filtrado por la barra de filtros. */
export function renderMiDia(leads, visitasHoy) {
  const grupos = agruparMiDia(leads, visitasHoy);
  const total  = grupos.reduce((n, g) => n + g.leads.length, 0);

  if (!total) {
    return `<div class="md-vacio">
      <div class="md-vacio-ic">☕</div>
      <h3>Nada pendiente por hoy</h3>
      <p>No hay visitas agendadas ni leads que requieran contacto inmediato.
         Los cierres y el seguimiento a largo plazo están en el Pipeline.</p>
      <button onclick="setIntView('pipeline')" class="md-vacio-btn">Ver el Pipeline</button>
    </div>`;
  }

  const hoy = new Date().toLocaleDateString('es-CO',
    { weekday:'long', day:'numeric', month:'long' });

  return `<div class="md-wrap">
    <div class="md-head">
      <div>
        <div class="md-head-fecha">${esc(hoy)}</div>
        <div class="md-head-t">Mi Día</div>
      </div>
      <div class="md-head-n">${total} <span>por atender</span></div>
    </div>
    ${grupos.map(g => `<section class="md-grupo">
      <header class="md-grupo-h">
        <span class="md-grupo-l">${g.icono} ${esc(g.label)}</span>
        <span class="md-grupo-n">${g.leads.length}</span>
      </header>
      <div class="md-grupo-b">${g.leads.map(_tarjeta).join('')}</div>
    </section>`).join('')}
  </div>`;
}

if (typeof window !== 'undefined') {
  window.renderMiDia   = renderMiDia;
  window.agruparMiDia  = agruparMiDia;
  window.visitasDeHoy  = visitasDeHoy;
  window.scoreLead     = scoreLead;
}

export default { renderMiDia, agruparMiDia, visitasDeHoy, scoreLead, bandaScore, diasEnSilencio };
