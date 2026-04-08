/**
 * HOUSE CRM — Notifications Service
 *
 * Extracted from the global noti() function.
 * Inserts alerts into the 'alertas' table.
 */

import { getSupabaseClient } from '../config/supabase.js';

/**
 * Create a notification/alert in the database.
 * Identical logic to the original noti() function.
 *
 * @param {string} tipo - Alert type: verificar, cambio_estado, cambio_precio, inmueble_nuevo, portal_listo, actualizar_portal
 * @param {string} nivel - Severity: rojo, amarillo, verde, info
 * @param {string} titulo - Short title
 * @param {string} mensaje - Detailed message
 * @param {string|null} paraEmail - Target user email/username (null = no specific user)
 * @param {string|null} paraRol - Target role: 'admin', 'all', or null
 * @param {string|null} inmId - Related property UUID
 * @param {string} fromUserId - Who is sending (current user ID)
 */
export async function noti(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId, fromUserId) {
  const SB = getSupabaseClient();
  try {
    await SB.from('alertas').insert({
      tipo,
      nivel,
      titulo,
      mensaje,
      para_email: paraEmail || null,
      para_rol: paraRol || null,
      inmueble_id: inmId || null,
      de_usuario: fromUserId,
    });
  } catch (e) {
    console.error('[notifications] Error inserting alert:', e);
  }
}

/**
 * Convenience: create notification using current user from userStore.
 * This is the most common usage — avoids passing fromUserId every time.
 */
export async function notify(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId) {
  const userId = typeof window !== 'undefined' && window.userStore
    ? window.userStore.get()?.id
    : null;
  if (!userId) {
    console.warn('[notifications] No current user, skipping notification');
    return;
  }
  return noti(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId, userId);
}

/**
 * Toast helper (UI feedback). Uses the existing toast() on window.
 */
export function toast(msg, type = 'tok') {
  if (typeof window !== 'undefined' && window.toast) {
    window.toast(msg, type);
  }
}

/**
 * Confirm dialog helper. Uses the existing cfShow() on window.
 */
export function confirm(icon, title, msg) {
  if (typeof window !== 'undefined' && window.cfShow) {
    return window.cfShow(icon, title, msg);
  }
  return Promise.resolve(window.confirm(title + '\n' + msg));
}

// ============================================================
// MAPA: tipo legacy → config notificar()
// Usado por el bridge window.noti para convertir llamadas viejas
// al nuevo sistema sin tocar cada call site.
// ============================================================

const TIPO_CONFIG = {
  // ── INMUEBLES ──
  cambio_precio: {
    categoria: 'inmueble', icono: '💲', color: '#f59e0b',
    accion_tipo: 'abrir_inmueble', prioridad: 'normal',
  },
  cambio_estado: {
    categoria: 'inmueble', icono: '🔄', color: '#3b82f6',
    accion_tipo: 'abrir_inmueble', prioridad: 'normal',
  },
  inmueble_nuevo: {
    categoria: 'inmueble', icono: '🆕', color: '#10b981',
    accion_tipo: 'abrir_inmueble', prioridad: 'baja',
  },
  inmueble_externo: {
    categoria: 'inmueble', icono: '🏠', color: '#f59e0b',
    accion_tipo: 'abrir_inmueble', prioridad: 'alta',
  },
  inmueble_aprobado: {
    categoria: 'inmueble', icono: '✅', color: '#10b981',
    accion_tipo: 'abrir_inmueble', prioridad: 'alta',
  },
  inmueble_rechazado: {
    categoria: 'inmueble', icono: '❌', color: '#ef4444',
    accion_tipo: 'abrir_inmueble', prioridad: 'alta',
  },
  eliminar_inmueble: {
    categoria: 'inmueble', icono: '🗑️', color: '#ef4444',
    accion_tipo: 'abrir_inmueble', prioridad: 'normal',
  },
  portal_listo: {
    categoria: 'inmueble', icono: '🌐', color: '#10b981',
    accion_tipo: 'abrir_inmueble', prioridad: 'normal',
  },
  actualizar_portal: {
    categoria: 'inmueble', icono: '🔄', color: '#f59e0b',
    accion_tipo: 'abrir_inmueble', prioridad: 'normal',
  },

  // ── SOLICITUDES / VERIFICACIÓN ──
  verificar: {
    categoria: 'solicitud', icono: '🔍', color: '#f59e0b',
    accion_tipo: 'abrir_inmueble', prioridad: 'alta',
    escalable: true, horas_para_escalar: 24,
  },

  // ── REFERIDOS ──
  referido_nuevo: {
    categoria: 'referido', icono: '🤝', color: '#f59e0b',
    accion_tipo: 'abrir_referido', prioridad: 'alta',
  },
  referido_verificando: {
    categoria: 'referido', icono: '🔍', color: '#3b82f6',
    accion_tipo: 'abrir_referido', prioridad: 'normal',
  },
  referido_aprobado: {
    categoria: 'referido', icono: '🎉', color: '#10b981',
    accion_tipo: 'abrir_referido', prioridad: 'alta',
  },
  referido_rechazado: {
    categoria: 'referido', icono: '❌', color: '#ef4444',
    accion_tipo: 'abrir_referido', prioridad: 'normal',
  },
  referido_publicado: {
    categoria: 'referido', icono: '📢', color: '#3b82f6',
    accion_tipo: 'abrir_referido', prioridad: 'normal',
  },
  configurar_pago: {
    categoria: 'pago', icono: '💳', color: '#f59e0b',
    accion_tipo: 'abrir_pago', prioridad: 'alta',
    escalable: true, horas_para_escalar: 48,
  },

  // ── PAGOS / COMISIONES ──
  comision_lista: {
    categoria: 'pago', icono: '💰', color: '#10b981',
    accion_tipo: 'abrir_referido', prioridad: 'alta',
  },
  comision_pendiente: {
    categoria: 'pago', icono: '💰', color: '#f59e0b',
    accion_tipo: 'abrir_pago', prioridad: 'alta',
  },
  comision_pagada: {
    categoria: 'pago', icono: '✅', color: '#10b981',
    accion_tipo: 'abrir_pago', prioridad: 'alta',
  },
  pago_realizado: {
    categoria: 'pago', icono: '💰', color: '#10b981',
    accion_tipo: 'abrir_pago', prioridad: 'critica',
  },

  // ── AGENDA ──
  agenda_gestor: {
    categoria: 'agenda', icono: '📅', color: '#f59e0b',
    accion_tipo: 'abrir_agenda', prioridad: 'alta',
  },

  // ── MENSAJES ──
  mensaje: {
    categoria: 'mensaje', icono: '💬', color: '#3b82f6',
    accion_tipo: 'abrir_mensaje', prioridad: 'alta',
    escalable: true, horas_para_escalar: 12,
  },

  // ── INTERESES (FASE 3 + 4) ──
  interes_nuevo: {
    categoria: 'solicitud', icono: '💙', color: '#3b82f6',
    accion_tipo: 'abrir_seccion', accion_seccion: 'users',
    prioridad: 'alta',
    escalable: true, horas_para_escalar: 4,
  },
  interes_calificado: {
    // Verde: notifica al captador del inmueble que tiene un interés calificado
    categoria: 'solicitud', icono: '🟢', color: '#10b981',
    accion_tipo: 'abrir_inmueble', prioridad: 'alta',
  },
  interes_pedir_info: {
    // Amarillo: notifica al cliente para que complete o ajuste su interés
    categoria: 'solicitud', icono: '🟡', color: '#f59e0b',
    accion_tipo: 'abrir_seccion', accion_seccion: 'mis-intereses',
    prioridad: 'normal',
  },
  interes_descartado: {
    // Rojo: notifica al cliente que el interés no procede
    categoria: 'solicitud', icono: '🔴', color: '#ef4444',
    accion_tipo: 'abrir_seccion', accion_seccion: 'mis-intereses',
    prioridad: 'normal',
  },

  // ── CITAS BILATERALES (FASE 5a) ──
  cita_propuesta: {
    // Captador propuso fecha/hora → cliente debe confirmar
    categoria: 'agenda', icono: '📅', color: '#3b82f6',
    accion_tipo: 'abrir_seccion', accion_seccion: 'mis-citas',
    prioridad: 'alta',
    escalable: true, horas_para_escalar: 24,
  },
  cita_confirmada: {
    // Cliente confirmó → captador recibe la confirmación
    categoria: 'agenda', icono: '✅', color: '#10b981',
    accion_tipo: 'abrir_seccion', accion_seccion: 'citas',
    prioridad: 'alta',
  },
  cita_cancelada: {
    // Cualquier parte canceló → la otra recibe el motivo
    categoria: 'agenda', icono: '❌', color: '#ef4444',
    accion_tipo: 'abrir_seccion', accion_seccion: 'citas',
    prioridad: 'alta',
  },

  // ── REGISTROS / SISTEMA ──
  registro_externo: {
    categoria: 'sistema', icono: '👤', color: '#3b82f6',
    accion_tipo: 'abrir_usuario', prioridad: 'normal',
  },
  registro_aprobado: {
    categoria: 'sistema', icono: '✅', color: '#10b981',
    accion_tipo: 'abrir_seccion', prioridad: 'alta',
  },
  registro_rechazado: {
    categoria: 'sistema', icono: '❌', color: '#ef4444',
    accion_tipo: 'abrir_seccion', prioridad: 'normal',
  },
};

// Mapa nivel legacy → prioridad nueva (fallback)
const NIVEL_PRIORIDAD = {
  rojo: 'alta',
  amarillo: 'normal',
  verde: 'normal',
  info: 'baja',
};

/**
 * Resuelve para_rol/para_email del API legacy a una lista de UUIDs.
 * - 'all'   → todos los usuarios internos activos
 * - 'admin' → admins
 * - 'oficina' → oficina
 * - email/usuario string → buscar por usuario o email
 */
async function resolverDestinatarios(paraRol, paraEmail) {
  const SB = getSupabaseClient();
  const out = [];

  if (paraRol === 'all') {
    const { data } = await SB.from('usuarios')
      .select('id')
      .eq('activo', true)
      .or('tipo_usuario.is.null,tipo_usuario.eq.interno');
    out.push(...(data || []).map(u => u.id));
  } else if (paraRol === 'admin') {
    const { data } = await SB.from('usuarios')
      .select('id').eq('rol', 'admin').eq('activo', true);
    out.push(...(data || []).map(u => u.id));
  } else if (paraRol === 'oficina') {
    const { data } = await SB.from('usuarios')
      .select('id').eq('rol', 'oficina').eq('activo', true);
    out.push(...(data || []).map(u => u.id));
  } else if (paraRol === 'gestor') {
    const { data } = await SB.from('usuarios')
      .select('id').eq('es_gestor_arriendos', true).eq('activo', true);
    out.push(...(data || []).map(u => u.id));
  }

  if (paraEmail) {
    const { data } = await SB.from('usuarios')
      .select('id')
      .or(`email.eq.${paraEmail},usuario.eq.${paraEmail}`)
      .eq('activo', true)
      .limit(1);
    if (data && data[0]) out.push(data[0].id);
  }

  return out;
}

// Backward compat: window.noti ahora escribe en notificaciones via bridge
if (typeof window !== 'undefined') {
  window.noti = async function(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId) {
    try {
      const cfg = TIPO_CONFIG[tipo] || {
        categoria: 'sistema',
        icono: '🔔',
        color: '#3b82f6',
        accion_tipo: 'abrir_seccion',
        prioridad: NIVEL_PRIORIDAD[nivel] || 'normal',
      };
      const destinatarios = await resolverDestinatarios(paraRol, paraEmail);
      if (!destinatarios.length) {
        // Fallback: si no hay destinatario, no se crea nada (antes era "broadcast a nadie")
        console.warn('[noti bridge] Sin destinatarios para tipo:', tipo);
        return;
      }
      // Determinar accion_destino y contexto_id según tipo
      let accion_destino = null;
      let contexto_tipo = null;
      let contexto_id = null;
      if (cfg.categoria === 'inmueble' || cfg.categoria === 'solicitud' || cfg.categoria === 'agenda') {
        accion_destino = inmId || null;
        contexto_tipo = inmId ? 'inmueble' : null;
        contexto_id = inmId || null;
      } else if (cfg.categoria === 'referido' || cfg.categoria === 'pago') {
        // En estas categorías el inmId puede ser referido_id o inmueble_id
        accion_destino = inmId || null;
        contexto_tipo = inmId ? 'referido' : null;
        contexto_id = inmId || null;
      } else if (cfg.categoria === 'mensaje') {
        accion_destino = inmId || null;
        contexto_tipo = 'inmueble';
        contexto_id = inmId || null;
      }
      await notificar({
        tipo,
        categoria: cfg.categoria,
        titulo,
        mensaje,
        icono: cfg.icono,
        color: cfg.color,
        destinatarios,
        accion_tipo: cfg.accion_tipo,
        accion_destino,
        contexto_tipo,
        contexto_id,
        prioridad: cfg.prioridad || NIVEL_PRIORIDAD[nivel] || 'normal',
        escalable: !!cfg.escalable,
        horas_para_escalar: cfg.horas_para_escalar || 24,
      });
    } catch (e) {
      console.error('[noti bridge] Error:', e);
    }
  };
}

// ============================================================
// NUEVO SISTEMA: notificar() — Notificaciones dirigidas
// ============================================================

/**
 * Crea notificaciones DIRIGIDAS. Nunca grupales.
 * Cada destinatario recibe su propio registro independiente.
 */
export async function notificar(opts) {
  const SB = getSupabaseClient();
  const {
    tipo, categoria, titulo, mensaje,
    icono = '🔔', color = '#3b82f6',
    destinatarios = [],
    accion_tipo, accion_destino, accion_seccion,
    contexto_tipo, contexto_id,
    prioridad = 'normal',
    escalable = false,
    horas_para_escalar = 24
  } = opts;

  if (!destinatarios.length) {
    console.warn('[notificar] Sin destinatarios para:', tipo);
    return;
  }
  if (!accion_tipo) {
    console.warn('[notificar] Falta accion_tipo para:', tipo);
    return;
  }

  const userId = window.userStore?.get()?.id || null;

  // Filtrar duplicados y al emisor (no se notifica a sí mismo)
  const seen = new Set();
  const destFiltrados = destinatarios
    .filter(d => d && d !== userId && !seen.has(d) && seen.add(d));

  if (!destFiltrados.length) return;

  const registros = destFiltrados.map(destId => ({
    destinatario_id: destId,
    emisor_id: userId,
    tipo,
    categoria,
    prioridad,
    titulo,
    mensaje: mensaje || null,
    icono,
    color,
    accion_tipo,
    accion_destino: accion_destino || null,
    accion_seccion: accion_seccion || null,
    contexto_tipo: contexto_tipo || null,
    contexto_id: contexto_id || null,
    escalable,
    horas_para_escalar,
  }));

  try {
    const { error } = await SB.from('notificaciones').insert(registros);
    if (error) {
      // Si la tabla no existe (migración pendiente), fallback a alertas legacy
      console.warn('[notificar] notificaciones falló, fallback a alertas:', error.message);
      const legacyRows = registros.map(r => ({
        tipo: r.tipo,
        nivel: r.prioridad === 'critica' ? 'rojo' : r.prioridad === 'alta' ? 'amarillo' : 'info',
        titulo: r.titulo,
        mensaje: r.mensaje,
        para_email: null,
        para_rol: null,
        inmueble_id: r.contexto_id || r.accion_destino || null,
        de_usuario: r.emisor_id,
      }));
      await SB.from('alertas').insert(legacyRows);
    }
  } catch (e) {
    console.error('[notificar] Exception:', e);
  }
}

// ── Helpers para obtener destinatarios ──

export async function getAdminIds() {
  const SB = getSupabaseClient();
  const { data } = await SB.from('usuarios')
    .select('id').eq('rol', 'admin').eq('activo', true);
  return (data || []).map(u => u.id);
}

export async function getOficinaIds() {
  const SB = getSupabaseClient();
  const { data } = await SB.from('usuarios')
    .select('id').eq('rol', 'oficina').eq('activo', true);
  return (data || []).map(u => u.id);
}

export async function getGestorArriendosIds() {
  const SB = getSupabaseClient();
  const { data } = await SB.from('usuarios')
    .select('id').eq('es_gestor_arriendos', true).eq('activo', true);
  return (data || []).map(u => u.id);
}

export async function getCaptadorId(inmuebleId) {
  if (!inmuebleId) return null;
  const SB = getSupabaseClient();
  const { data } = await SB.from('inmuebles')
    .select('captador_id').eq('id', inmuebleId).single();
  return data?.captador_id || null;
}

export async function getReferidorId(referidoId) {
  if (!referidoId) return null;
  const SB = getSupabaseClient();
  const { data } = await SB.from('referidos')
    .select('referidor_id').eq('id', referidoId).single();
  return data?.referidor_id || null;
}

export async function getUserIdByEmail(email) {
  if (!email) return null;
  const SB = getSupabaseClient();
  const { data } = await SB.from('usuarios')
    .select('id').or(`email.eq.${email},usuario.eq.${email}`).limit(1).maybeSingle();
  return data?.id || null;
}

// ============================================================
// ESCALAMIENTO INTELIGENTE
// Notificaciones escalables no leídas → notificar al admin
// Solo el admin ejecuta esto periódicamente.
// ============================================================
export async function procesarEscalamientos() {
  const SB = getSupabaseClient();
  const u = window.userStore?.get();
  if (!u || u.rol !== 'admin') return;

  try {
    // Buffer de 1h: solo procesar las que llevan al menos 1h sin leer
    const horaAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: pendientes } = await SB.from('notificaciones')
      .select('*, destinatario:usuarios!destinatario_id(nombre)')
      .eq('escalable', true)
      .eq('escalada', false)
      .eq('leida', false)
      .lt('created_at', horaAtras)
      .limit(50);

    if (!pendientes || !pendientes.length) return;

    const admins = await getAdminIds();
    if (!admins.length) return;

    for (const n of pendientes) {
      const horasTranscurridas = (Date.now() - new Date(n.created_at).getTime()) / 3600000;
      if (horasTranscurridas < (n.horas_para_escalar || 24)) continue;

      // Marcar como escalada
      await SB.from('notificaciones').update({
        escalada: true,
        escalada_at: new Date().toISOString()
      }).eq('id', n.id);

      // Crear notificación al admin
      await notificar({
        tipo: 'sistema_escalamiento',
        categoria: 'sistema',
        titulo: '⚠️ Sin respuesta: ' + n.titulo,
        mensaje: (n.destinatario?.nombre || 'Usuario') + ' no leyó esta notificación en ' +
          Math.round(horasTranscurridas) + 'h: ' + (n.mensaje || n.titulo),
        icono: '⚠️',
        color: '#ef4444',
        destinatarios: admins,
        accion_tipo: n.accion_tipo,
        accion_destino: n.accion_destino,
        accion_seccion: n.accion_seccion,
        contexto_tipo: n.contexto_tipo,
        contexto_id: n.contexto_id,
        prioridad: 'critica'
      });
    }
  } catch (e) {
    console.error('[procesarEscalamientos] Error:', e);
  }
}

// Expose to window for compatibility with non-module code
if (typeof window !== 'undefined') {
  window.notificar = notificar;
  window.getAdminIds = getAdminIds;
  window.getOficinaIds = getOficinaIds;
  window.getGestorArriendosIds = getGestorArriendosIds;
  window.getCaptadorId = getCaptadorId;
  window.getReferidorId = getReferidorId;
  window.getUserIdByEmail = getUserIdByEmail;
  window.procesarEscalamientos = procesarEscalamientos;
}

export default { noti, notify, toast, confirm, notificar };
