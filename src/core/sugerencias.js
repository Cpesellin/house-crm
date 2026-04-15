/**
 * HOUSE CRM — Sistema de Sugerencias Inteligentes
 *
 * Filosofía: "Le sugerimos inmuebles según lo que busca, no lo que dice que busca"
 *
 * Pipeline:
 *   1. trackEvent(...)            → INSERT en eventos_usuario
 *   2. recalcularPreferencias(id) → actualiza preferencias_calculadas (90d window)
 *   3. calcularMatchScore(pref,inm) → 0-100 (precio 35, zona 30, tipo 15, hab 10, engagement 10)
 *   4. sugerirInmuebleNuevo(inm)  → dispara al aprobar un inmueble
 *
 * Anti-spam:
 *   - Max 3 sugerencias / día / usuario
 *   - Score mínimo 60 para notificar
 *   - Mínimo 3 eventos usados para calcular preferencias
 *   - Mínimo engagement_score 10 para ser elegible
 *   - No repetir: UNIQUE(usuario_id, inmueble_id)
 */

import { getSupabaseClient } from '../config/supabase.js';

const PESO_EVENTO = {
  view_card:        1,
  dwell_card:       2,  // >5s
  filter:           1,
  search:           1,
  favorito_add:     3,
  favorito_remove: -2,
  interes:          5,
  compartir_wa:     3,
  llamar:           4,
  cita_solicitada:  5,
};

const MIN_SCORE_SUGERENCIA = 60;
const MAX_SUGERENCIAS_DIA = 3;
const MIN_EVENTOS_MUESTRA = 3;
const MIN_ENGAGEMENT = 10;
const VENTANA_DIAS = 90;

// ============================================================
// 1. TRACK EVENT
// ============================================================
export async function trackEvent(tipo, ctx = {}) {
  const SBc = getSupabaseClient();
  const u = window.userStore?.get();
  if (!u || !u.id) return;
  if (u.tipo_usuario !== 'publico') return; // solo compradores/vendedores públicos

  const peso = PESO_EVENTO[tipo] ?? 1;
  const row = {
    usuario_id: u.id,
    tipo,
    inmueble_id: ctx.inmueble_id || null,
    ciudad: ctx.ciudad || null,
    barrio: ctx.barrio || null,
    tipo_inmueble: ctx.tipo_inmueble || null,
    negociacion: ctx.negociacion || null,
    precio: ctx.precio || null,
    habitaciones: ctx.habitaciones || null,
    filtro_payload: ctx.filtro_payload || null,
    search_text: ctx.search_text || null,
    dwell_ms: ctx.dwell_ms || null,
    peso,
  };

  try {
    await SBc.from('eventos_usuario').insert(row);
  } catch (e) {
    console.warn('[trackEvent]', e?.message);
  }
}

// ============================================================
// 2. RECALCULAR PREFERENCIAS
// ============================================================
export async function recalcularPreferencias(usuarioId) {
  const SBc = getSupabaseClient();
  const desde = new Date(Date.now() - VENTANA_DIAS * 864e5).toISOString();

  const { data: eventos } = await SBc.from('eventos_usuario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .gte('created_at', desde)
    .limit(1000);

  if (!eventos || eventos.length < MIN_EVENTOS_MUESTRA) {
    // Borra preferencias viejas (muestra insuficiente)
    await SBc.from('preferencias_calculadas')
      .upsert({
        usuario_id: usuarioId,
        muestra_eventos: eventos?.length || 0,
        engagement_score: 0,
        eventos_totales: eventos?.length || 0,
        calculado_at: new Date().toISOString(),
      });
    return null;
  }

  // Scoring por zona, tipo, negociación
  const ciudades = {};
  const barrios = {};
  const tipos = {};
  const negocs = {};
  const habs = [];
  const precios = [];
  let engagement = 0;
  let ultEvt = null;

  for (const e of eventos) {
    const p = e.peso || 1;
    engagement += p;
    if (!ultEvt || new Date(e.created_at) > new Date(ultEvt)) ultEvt = e.created_at;
    if (e.ciudad)        ciudades[e.ciudad]        = (ciudades[e.ciudad] || 0) + p;
    if (e.barrio)        barrios[e.barrio]         = (barrios[e.barrio] || 0) + p;
    if (e.tipo_inmueble) tipos[e.tipo_inmueble]    = (tipos[e.tipo_inmueble] || 0) + p;
    if (e.negociacion)   negocs[e.negociacion]     = (negocs[e.negociacion] || 0) + p;
    if (e.habitaciones && e.habitaciones > 0) habs.push(e.habitaciones);
    if (e.precio && e.precio > 0 && p > 0)    precios.push(e.precio);
    // también extraer del filtro_payload
    if (e.filtro_payload) {
      const f = e.filtro_payload;
      if (f.ciudad) ciudades[f.ciudad] = (ciudades[f.ciudad] || 0) + 1;
      if (f.tipo)   tipos[f.tipo]      = (tipos[f.tipo] || 0) + 1;
      if (f.precio_min) precios.push(f.precio_min);
      if (f.precio_max) precios.push(f.precio_max);
    }
  }

  const topN = (obj, n) => Object.entries(obj)
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  const ciudadesTop = topN(ciudades, 3);
  const barriosTop = topN(barrios, 5);
  const tiposTop = topN(tipos, 3);
  const negocTop = topN(negocs, 1);

  // Rango de precio: percentil 15–85 para evitar outliers
  let pmin = null, pmax = null;
  if (precios.length >= 2) {
    precios.sort((a, b) => a - b);
    const i15 = Math.max(0, Math.floor(precios.length * 0.15));
    const i85 = Math.min(precios.length - 1, Math.floor(precios.length * 0.85));
    pmin = Math.round(precios[i15] * 0.85); // 15% bajo el p15
    pmax = Math.round(precios[i85] * 1.15); // 15% sobre el p85
  } else if (precios.length === 1) {
    pmin = Math.round(precios[0] * 0.7);
    pmax = Math.round(precios[0] * 1.3);
  }

  let hmin = null, hmax = null;
  if (habs.length) {
    hmin = Math.max(1, Math.min(...habs) - 1);
    hmax = Math.max(...habs) + 1;
  }

  const row = {
    usuario_id: usuarioId,
    negociacion: negocTop[0] || null,
    tipos_preferidos: tiposTop,
    ciudades: ciudadesTop,
    barrios: barriosTop,
    precio_min: pmin,
    precio_max: pmax,
    habitaciones_min: hmin,
    habitaciones_max: hmax,
    engagement_score: engagement,
    eventos_totales: eventos.length,
    ultimo_evento_at: ultEvt,
    muestra_eventos: eventos.length,
    calculado_at: new Date().toISOString(),
  };

  await SBc.from('preferencias_calculadas').upsert(row, { onConflict: 'usuario_id' });
  return row;
}

// ============================================================
// 3. SCORE 0-100
// ============================================================
export function calcularMatchScore(prefs, inm) {
  if (!prefs || !inm) return { score: 0, razones: [] };
  let score = 0;
  const razones = [];

  // --- Precio (35 pts)
  const precioInm = (inm.negociacion || '').toLowerCase().includes('arriendo')
    ? inm.precio_arriendo : inm.precio_venta;
  if (prefs.precio_min && prefs.precio_max && precioInm) {
    if (precioInm >= prefs.precio_min && precioInm <= prefs.precio_max) {
      score += 35;
      razones.push('precio en rango');
    } else {
      const centro = (prefs.precio_min + prefs.precio_max) / 2;
      const dif = Math.abs(precioInm - centro) / centro;
      if (dif <= 0.25) { score += 22; razones.push('precio cercano'); }
      else if (dif <= 0.5) { score += 10; }
    }
  } else if (precioInm) {
    score += 8; // sin rango claro, crédito parcial
  }

  // --- Zona (30 pts)
  const ciudades = prefs.ciudades || [];
  const barrios = prefs.barrios || [];
  if (inm.barrio && barrios.includes(inm.barrio)) {
    score += 30; razones.push(`barrio favorito (${inm.barrio})`);
  } else if (inm.ciudad && ciudades.includes(inm.ciudad)) {
    score += 22; razones.push(`ciudad favorita (${inm.ciudad})`);
  } else if (ciudades.length && inm.ciudad) {
    score += 5;
  }

  // --- Tipo (15 pts)
  const tipos = prefs.tipos_preferidos || [];
  if (inm.tipo && tipos.includes(inm.tipo)) {
    score += 15; razones.push(`tipo favorito (${inm.tipo})`);
  } else if (tipos.length) {
    score += 4;
  }

  // --- Habitaciones (10 pts)
  if (prefs.habitaciones_min && prefs.habitaciones_max && inm.habitaciones) {
    if (inm.habitaciones >= prefs.habitaciones_min && inm.habitaciones <= prefs.habitaciones_max) {
      score += 10; razones.push(`${inm.habitaciones} habs`);
    } else if (Math.abs(inm.habitaciones - ((prefs.habitaciones_min + prefs.habitaciones_max) / 2)) <= 1) {
      score += 5;
    }
  } else if (inm.habitaciones) {
    score += 3;
  }

  // --- Engagement (10 pts) — cuánto busca el usuario en general
  const eng = prefs.engagement_score || 0;
  if (eng >= 50) { score += 10; razones.push('alto interés'); }
  else if (eng >= 25) score += 6;
  else if (eng >= 10) score += 3;

  // Match de negociación (filtro duro si hay preferencia clara)
  if (prefs.negociacion && inm.negociacion) {
    const nInm = (inm.negociacion || '').toLowerCase();
    const nPref = (prefs.negociacion || '').toLowerCase();
    if (nPref.includes('arriendo') && !nInm.includes('arriendo')) score = Math.max(0, score - 20);
    if (nPref.includes('venta') && !nInm.includes('venta')) score = Math.max(0, score - 20);
  }

  return { score: Math.min(100, Math.round(score)), razones };
}

// ============================================================
// 4. SUGERIR INMUEBLE NUEVO (hook al aprobar)
// ============================================================
export async function sugerirInmuebleNuevo(inmuebleId) {
  const SBc = getSupabaseClient();
  if (!inmuebleId) return { sugeridos: 0 };

  // Traer el inmueble completo
  const { data: inm } = await SBc.from('inmuebles')
    .select('id, tipo, ciudad, barrio, negociacion, precio_venta, precio_arriendo, habitaciones, captador_id')
    .eq('id', inmuebleId).maybeSingle();
  if (!inm) return { sugeridos: 0 };

  // Traer usuarios candidatos (público con perfil comprador, engagement suficiente)
  const { data: prefs } = await SBc.from('preferencias_calculadas')
    .select('*, usuario:usuarios!usuario_id(id,nombre,activo,tipo_usuario,perfiles_publicos)')
    .gte('engagement_score', MIN_ENGAGEMENT)
    .gte('muestra_eventos', MIN_EVENTOS_MUESTRA)
    .limit(500);

  if (!prefs || !prefs.length) return { sugeridos: 0 };

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyISO = hoy.toISOString();
  let sugeridos = 0;

  for (const p of prefs) {
    const usr = p.usuario;
    if (!usr || !usr.activo) continue;
    if (usr.tipo_usuario !== 'publico') continue;
    if (!(usr.perfiles_publicos || []).includes('comprador')) continue;
    if (usr.id === inm.captador_id) continue; // no al captador mismo

    // Anti-spam: max 3 por día
    const { count } = await SBc.from('sugerencias_enviadas')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usr.id)
      .gte('created_at', hoyISO);
    if ((count || 0) >= MAX_SUGERENCIAS_DIA) continue;

    // Anti-spam: no repetir (UNIQUE lo bloquea, pero evitamos round trip)
    const { data: prev } = await SBc.from('sugerencias_enviadas')
      .select('id').eq('usuario_id', usr.id).eq('inmueble_id', inmuebleId).maybeSingle();
    if (prev) continue;

    const { score, razones } = calcularMatchScore(p, inm);
    if (score < MIN_SCORE_SUGERENCIA) continue;

    // Insert sugerencia (lock anti-duplicado)
    const { data: sugRow, error: sugErr } = await SBc.from('sugerencias_enviadas')
      .insert({ usuario_id: usr.id, inmueble_id: inmuebleId, score, razones })
      .select('id').single();
    if (sugErr) continue;

    // Crear la notificación
    const precioInm = (inm.negociacion || '').toLowerCase().includes('arriendo')
      ? inm.precio_arriendo : inm.precio_venta;
    const desc = `${inm.tipo || 'Inmueble'}${inm.barrio ? ' en ' + inm.barrio : inm.ciudad ? ' en ' + inm.ciudad : ''}`;
    const mensajeRazones = razones.length ? razones.slice(0, 3).join(' · ') : 'match con tus búsquedas';
    const precioTxt = precioInm ? ' · $' + Math.round(precioInm).toLocaleString('es-CO') : '';

    if (typeof window.notificar === 'function') {
      await window.notificar({
        tipo: 'sugerencia',
        categoria: 'inmueble_nuevo',
        titulo: `🎯 Para ti: ${desc} (${score}%)`,
        mensaje: mensajeRazones + precioTxt,
        icono: '🎯',
        color: '#10b981',
        prioridad: score >= 80 ? 'alta' : 'normal',
        accion_tipo: 'abrir_inmueble_nuevo',
        accion_destino: inmuebleId,
        contexto_tipo: 'inmueble',
        contexto_id: inmuebleId,
        destinatariosConPerfil: [{ id: usr.id, perfil: 'comprador' }],
      });
    }

    sugeridos++;
  }

  return { sugeridos };
}

// ============================================================
// 5. RECALCULAR TODAS (periódico)
// ============================================================
export async function recalcularTodasLasPreferencias() {
  const SBc = getSupabaseClient();
  const desde = new Date(Date.now() - VENTANA_DIAS * 864e5).toISOString();

  // Traer ids únicos de usuarios con actividad reciente
  const { data } = await SBc.from('eventos_usuario')
    .select('usuario_id')
    .gte('created_at', desde)
    .limit(2000);
  if (!data) return { recalculados: 0 };

  const ids = [...new Set(data.map(r => r.usuario_id))];
  let n = 0;
  for (const id of ids) {
    try { await recalcularPreferencias(id); n++; }
    catch (e) { console.warn('[recalc]', id, e?.message); }
  }
  return { recalculados: n };
}

// ============================================================
// EXPORTAR A window
// ============================================================
if (typeof window !== 'undefined') {
  window.trackEvent = trackEvent;
  window.recalcularPreferencias = recalcularPreferencias;
  window.calcularMatchScore = calcularMatchScore;
  window.sugerirInmuebleNuevo = sugerirInmuebleNuevo;
  window.recalcularTodasLasPreferencias = recalcularTodasLasPreferencias;
}

export default {
  trackEvent, recalcularPreferencias, calcularMatchScore,
  sugerirInmuebleNuevo, recalcularTodasLasPreferencias,
};
