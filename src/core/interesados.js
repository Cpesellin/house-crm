/**
 * HOUSE CRM — Módulo Interesados/Leads
 *
 * CRM interno: asesor captura leads externos (WhatsApp, llamadas, referidos)
 * con pipeline de 8 tipificaciones, timeline y visitas agendadas.
 *
 * Convive con intereses_compradores (usuarios públicos auto-registrados)
 * vía VIEW de compatibilidad. La tabla real en DB es `interesados`.
 */

import { getSupabaseClient } from '../config/supabase.js';

// ============================================================
// CONSTANTES
// ============================================================

export const TIPIFICACIONES = {
  nuevo:            { id:'nuevo',            label:'Nuevo',               color:'#3B82F6', emoji:'🔵', orden:1 },
  contactado:       { id:'contactado',       label:'Contactado',          color:'#EAB308', emoji:'🟡', orden:2 },
  visita_agendada:  { id:'visita_agendada',  label:'Visita Agendada',     color:'#F97316', emoji:'🟠', orden:3 },
  visita_realizada: { id:'visita_realizada', label:'Visita Realizada',    color:'#8B5CF6', emoji:'🟣', orden:4 },
  negociacion:      { id:'negociacion',      label:'En Negociación',      color:'#EF4444', emoji:'🔴', orden:5 },
  cierre_ganado:    { id:'cierre_ganado',    label:'Cierre Ganado',       color:'#22C55E', emoji:'🟢', orden:6 },
  cierre_perdido:   { id:'cierre_perdido',   label:'Cierre Perdido',      color:'#6B7280', emoji:'⚫', orden:7 },
  en_seguimiento:   { id:'en_seguimiento',   label:'En Seguimiento',      color:'#9CA3AF', emoji:'⚪', orden:8 },
};

export const CANAL_ORIGEN = {
  whatsapp:  { label:'WhatsApp',  emoji:'💬' },
  web:       { label:'Web',       emoji:'🌐' },
  referido:  { label:'Referido',  emoji:'🤝' },
  llameya:   { label:'LlameYa',   emoji:'📞' },
  publico:   { label:'Público',   emoji:'👤' },
  otro:      { label:'Otro',      emoji:'❓' },
};

const URGENCIA = ['inmediata','1-3_meses','6+_meses'];
const MOTIVO = ['inversion','vivienda','arriendo','otro'];

// ============================================================
// HELPERS
// ============================================================

const SB = () => getSupabaseClient();
const U  = () => window.userStore?.get();

function esInterno(usuario) {
  if (!usuario) return false;
  return !usuario.tipo_usuario || usuario.tipo_usuario === 'interno';
}

function esAdminONivelSuperior(usuario) {
  if (!usuario) return false;
  return ['admin','oficina','gestor'].includes(usuario.rol);
}

function puedeVerLead(lead, usuario) {
  if (!usuario) return false;
  // Admin ve TODO siempre (supervisor total)
  if (usuario.rol === 'admin') return true;
  // Lead privado: solo el creador lo ve (proteger contacto)
  if (lead.privado && lead.asesor_creador_id !== usuario.id) return false;
  // Oficina y gestor ven todo lo NO privado
  if (esAdminONivelSuperior(usuario)) return true;
  // Asesor: solo sus propios leads (creador, asignado) o si él es el usuario_id del lead
  return lead.asesor_creador_id === usuario.id
      || lead.asesor_asignado_id === usuario.id
      || lead.usuario_id === usuario.id;
}

function puedeEditarLead(lead, usuario) {
  if (!usuario) return false;
  if (usuario.rol === 'admin' || usuario.rol === 'oficina') return true;
  return lead.asesor_asignado_id === usuario.id || lead.asesor_creador_id === usuario.id;
}

// Cualquier interno (admin, oficina, gestor, asesor) puede dejar nota.
// Solo se bloquea a usuarios públicos.
function puedeAgregarNota(usuario) {
  return esInterno(usuario);
}

// ============================================================
// CREAR INTERESADO
// ============================================================

/**
 * Crea un nuevo interesado/lead.
 * @param {Object} data - { inmueble_id, nombre_completo, telefono, email, nota_inicial,
 *                          canal_origen, presupuesto_min, presupuesto_max,
 *                          urgencia, motivo_busqueda, modalidad }
 */
export async function crearInteresado(data) {
  const u = U();
  if (!u) throw new Error('no_auth');
  if (!data.inmueble_id) throw new Error('inmueble_requerido');
  if (!data.nombre_completo || data.nombre_completo.trim().length < 3) throw new Error('nombre_invalido');
  if (!data.telefono || data.telefono.trim().length < 7) throw new Error('telefono_invalido');

  // Privado por defecto cuando el creador es admin (proteger contacto)
  const esPrivado = (data.privado !== undefined) ? !!data.privado : (u.rol === 'admin');

  // Cargar info del inmueble ANTES del insert para decidir asignación
  const { data: inmPre } = await SB().from('inmuebles')
    .select('id, negociacion, captador_id, tipo, ciudad, barrio, codigo_house')
    .eq('id', data.inmueble_id).maybeSingle();
  const esArriendo = ((inmPre?.negociacion) || '').toLowerCase().includes('arriendo');

  // Auto-asignación: si es arriendo → gestor (johan.m o cualquier gestor activo)
  let asignadoId = data.asesor_asignado_id || null;
  if (!asignadoId && esArriendo) {
    try {
      // Prioridad 1: usuario con username 'johan.m'
      const { data: jm } = await SB().from('usuarios')
        .select('id').eq('usuario', 'johan.m').eq('activo', true).maybeSingle();
      if (jm?.id) asignadoId = jm.id;
      else {
        // Prioridad 2: cualquier gestor activo
        const { data: gestor } = await SB().from('usuarios')
          .select('id').eq('es_gestor_arriendos', true).eq('activo', true)
          .order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (gestor?.id) asignadoId = gestor.id;
      }
    } catch (e) { console.warn('[crearInteresado auto-asignar]', e); }
  }
  // Fallback final: el creador
  if (!asignadoId) asignadoId = u.id;

  const row = {
    inmueble_id: data.inmueble_id,
    asesor_creador_id: u.id,
    asesor_asignado_id: asignadoId,
    nombre_completo: data.nombre_completo.trim(),
    telefono: data.telefono.trim(),
    email: data.email?.trim() || null,
    canal_origen: data.canal_origen || 'whatsapp',
    presupuesto_min: data.presupuesto_min || null,
    presupuesto_max: data.presupuesto_max || null,
    urgencia: URGENCIA.includes(data.urgencia) ? data.urgencia : null,
    motivo_busqueda: MOTIVO.includes(data.motivo_busqueda) ? data.motivo_busqueda : null,
    modalidad: data.modalidad || esArriendo ? 'arriendo' : (data.modalidad || null),
    nota_inicial: data.nota_inicial?.trim() || null,
    tipificacion: 'nuevo',
    estado: 'activo',
    privado: esPrivado,
    fecha_ultima_actividad: new Date().toISOString(),
  };

  let r = await SB().from('interesados').insert(row).select('*').single();
  if (r.error && /privado/i.test(r.error.message || '')) {
    // Migración #37 aún no aplicada: reintentar sin el campo privado
    const { privado, ...rowSinPriv } = row;
    r = await SB().from('interesados').insert(rowSinPriv).select('*').single();
  }
  if (r.error) throw r.error;
  const created = r.data;

  // Historial: creación (+ auto-asignación si aplica)
  const asignadoAutoTxt = (esArriendo && asignadoId !== u.id)
    ? ` · Auto-asignado al gestor de arriendos`
    : '';
  await SB().from('interesados_historial').insert({
    interesado_id: created.id,
    asesor_id: u.id,
    tipo_actividad: 'creacion',
    descripcion: `Lead creado${data.canal_origen ? ' (canal: ' + data.canal_origen + ')' : ''}${asignadoAutoTxt}` + (data.nota_inicial ? '. Nota: ' + data.nota_inicial : ''),
  });

  // Notificar al captador + gestor/es si es arriendo + admins si es privado
  try {
    const inm = inmPre; // ya cargado arriba
    if (inm && typeof window.notificar === 'function') {
      const destinatarios = new Set();
      // Captador del inmueble (si no es el mismo creador)
      if (inm.captador_id && inm.captador_id !== u.id) destinatarios.add(inm.captador_id);
      // Si es arriendo → notificar al gestor asignado (prioridad)
      if (esArriendo) {
        if (asignadoId && asignadoId !== u.id) destinatarios.add(asignadoId);
        // Además notificar a otros gestores activos (por si Johan no responde)
        if (typeof window.getGestorArriendosIds === 'function') {
          const gestores = await window.getGestorArriendosIds();
          gestores.forEach(gid => { if (gid !== u.id) destinatarios.add(gid); });
        }
      }
      // Si el lead es privado (admin creándolo), solo los admins se enteran
      if (esPrivado && typeof window.getAdminIds === 'function') {
        const admins = await window.getAdminIds();
        destinatarios.clear();
        admins.forEach(aid => { if (aid !== u.id) destinatarios.add(aid); });
      }

      if (destinatarios.size) {
        await window.notificar({
          tipo: 'lead_nuevo',
          categoria: 'solicitud',
          titulo: `👤 Nuevo interesado en ${inm.tipo || 'inmueble'}${esArriendo ? ' (arriendo)' : ''}`,
          mensaje: `${u.nombre || 'Un asesor'} registró a ${data.nombre_completo} interesado en ${inm.codigo_house || inm.tipo} (${inm.barrio || inm.ciudad || ''}).`,
          icono: esArriendo ? '🔑' : '👤',
          color: esArriendo ? '#F97316' : '#3B82F6',
          prioridad: 'alta',
          accion_tipo: 'abrir_seccion', accion_seccion: 'interesados',
          accion_destino: created.id,
          contexto_tipo: 'interesado', contexto_id: created.id,
          destinatarios: [...destinatarios],
        });
      }
    }
  } catch (e) { console.warn('[crearInteresado notif]', e); }

  return created;
}

// ============================================================
// EDITAR INTERESADO
// ============================================================

export async function editarInteresado(id, cambios) {
  const u = U(); if (!u) throw new Error('no_auth');
  const { data: lead } = await SB().from('interesados').select('*').eq('id', id).maybeSingle();
  if (!lead) throw new Error('no_existe');
  if (!puedeEditarLead(lead, u)) throw new Error('sin_permiso');

  const permitidos = [
    'nombre_completo','telefono','email','canal_origen','presupuesto_min','presupuesto_max',
    'urgencia','motivo_busqueda','modalidad','fecha_cierre_estimada','asesor_asignado_id',
    'nota_inicial','score_calificacion',
  ];
  const upd = { updated_at: new Date().toISOString(), fecha_ultima_actividad: new Date().toISOString() };
  for (const k of permitidos) if (cambios[k] !== undefined) upd[k] = cambios[k];

  const { error } = await SB().from('interesados').update(upd).eq('id', id);
  if (error) throw error;

  // Log del cambio
  await agregarNotaHistorial(id, 'nota', `Datos actualizados por ${u.nombre || 'asesor'}`);

  return true;
}

// ============================================================
// CAMBIAR TIPIFICACIÓN (pipeline)
// ============================================================

export async function cambiarTipificacion(id, nuevaTipificacion, motivo = null) {
  const u = U(); if (!u) throw new Error('no_auth');
  if (!TIPIFICACIONES[nuevaTipificacion]) throw new Error('tipificacion_invalida');

  const { data: lead } = await SB().from('interesados').select('*').eq('id', id).maybeSingle();
  if (!lead) throw new Error('no_existe');
  if (!puedeEditarLead(lead, u)) throw new Error('sin_permiso');

  const anterior = lead.tipificacion;
  if (anterior === nuevaTipificacion) return false;

  // Validación: cierre_ganado requiere visita realizada previa
  if (nuevaTipificacion === 'cierre_ganado') {
    const { count } = await SB().from('visitas_agendadas')
      .select('id', { count: 'exact', head: true })
      .eq('interesado_id', id).eq('estado', 'realizada');
    if ((count || 0) === 0) {
      throw new Error('requiere_visita_realizada');
    }
  }

  const upd = {
    tipificacion: nuevaTipificacion,
    updated_at: new Date().toISOString(),
    fecha_ultima_actividad: new Date().toISOString(),
  };
  if (nuevaTipificacion === 'cierre_ganado') upd.estado = 'convertido';
  if (nuevaTipificacion === 'cierre_perdido') upd.estado = 'perdido';

  const { error } = await SB().from('interesados').update(upd).eq('id', id);
  if (error) throw error;

  // Historial
  await SB().from('interesados_historial').insert({
    interesado_id: id,
    asesor_id: u.id,
    tipo_actividad: 'cambio_tipificacion',
    descripcion: `Cambió de "${TIPIFICACIONES[anterior]?.label || anterior}" a "${TIPIFICACIONES[nuevaTipificacion].label}"` + (motivo ? ` — ${motivo}` : ''),
    tipificacion_anterior: anterior,
    tipificacion_nueva: nuevaTipificacion,
  });

  return true;
}

// ============================================================
// ELIMINAR (soft delete — solo admin)
// ============================================================

export async function eliminarInteresado(id, motivo = null) {
  const u = U(); if (!u) throw new Error('no_auth');
  if (u.rol !== 'admin') throw new Error('solo_admin_elimina');
  if (!id) throw new Error('id_requerido');

  // Soft delete: estado='descartado' (sigue en DB para auditoría)
  const { error } = await SB().from('interesados').update({
    estado: 'descartado',
    updated_at: new Date().toISOString(),
    fecha_ultima_actividad: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;

  // Registrar en historial
  await SB().from('interesados_historial').insert({
    interesado_id: id,
    asesor_id: u.id,
    tipo_actividad: 'nota',
    descripcion: `🗑️ Lead eliminado por ${u.nombre || 'admin'}` + (motivo ? ` — Motivo: ${motivo}` : ''),
  });

  return true;
}

// ============================================================
// HISTORIAL / NOTAS
// ============================================================

/**
 * Agrega una nota o actividad al historial.
 * Detecta menciones @usuario y @HOUSE-XXX automáticamente.
 */
export async function agregarNotaHistorial(interesadoId, tipo, descripcion) {
  const u = U(); if (!u) throw new Error('no_auth');
  if (!puedeAgregarNota(u)) throw new Error('solo_internos_pueden_notar');
  if (!descripcion || !descripcion.trim()) throw new Error('descripcion_requerida');

  // Parsear menciones
  const menciones = await parsearMenciones(descripcion);

  const row = {
    interesado_id: interesadoId,
    asesor_id: u.id,
    tipo_actividad: tipo || 'nota',
    descripcion: descripcion.trim(),
    menciones_usuarios: menciones.usuarios,
    menciones_inmuebles: menciones.inmuebles,
  };

  const { error } = await SB().from('interesados_historial').insert(row);
  if (error) throw error;

  // Actualizar fecha_ultima_actividad
  await SB().from('interesados').update({
    fecha_ultima_actividad: new Date().toISOString(),
  }).eq('id', interesadoId);

  // Notificar a usuarios mencionados
  if (menciones.usuarios.length && typeof window.notificar === 'function') {
    const { data: lead } = await SB().from('interesados')
      .select('nombre_completo, inmueble:inmuebles!interesados_inmueble_id_fkey(codigo_house,tipo,ciudad)')
      .eq('id', interesadoId).maybeSingle();
    const desc = lead?.inmueble ? `${lead.inmueble.codigo_house || lead.inmueble.tipo} — ${lead.nombre_completo}` : (lead?.nombre_completo || 'lead');
    await window.notificar({
      tipo: 'mencion',
      categoria: 'mensaje',
      titulo: `💬 ${u.nombre || 'Alguien'} te mencionó`,
      mensaje: `En ${desc}: ${descripcion.slice(0, 100)}`,
      icono: '💬', color: '#3B82F6', prioridad: 'alta',
      accion_tipo: 'abrir_seccion', accion_seccion: 'interesados',
      accion_destino: interesadoId,
      contexto_tipo: 'interesado', contexto_id: interesadoId,
      destinatarios: menciones.usuarios,
    });
  }

  // Si mencionó inmuebles, crear relaciones en inmuebles_interesados
  if (menciones.inmuebles.length) {
    const rows = menciones.inmuebles.map(inmId => ({
      interesado_id: interesadoId,
      inmueble_id: inmId,
      asesor_id: u.id,
      nota: 'Vinculado por mención en historial',
    }));
    await SB().from('inmuebles_interesados').upsert(rows, { onConflict: 'interesado_id,inmueble_id' });
  }

  return true;
}

async function parsearMenciones(texto) {
  const out = { usuarios: [], inmuebles: [], equipo: false };
  if (!texto) return out;

  // @todos o @equipo
  if (/@(todos|equipo)\b/i.test(texto)) {
    out.equipo = true;
    const u = U();
    if (u && (u.rol === 'admin' || u.rol === 'oficina' || u.rol === 'gestor')) {
      // Solo roles altos pueden mencionar a equipo completo
      const { data: team } = await SB().from('usuarios')
        .select('id').eq('activo', true).neq('tipo_usuario', 'publico');
      out.usuarios.push(...(team || []).map(x => x.id));
    }
  }

  // @código inmueble (HOUSE-XXX, CASA-XXX, APTO-XXX, LOCAL-XXX, LOTE-XXX, BODEGA-XXX)
  const reInm = /@([A-Z]+-\d+)/g;
  const codigos = [...texto.matchAll(reInm)].map(m => m[1]);
  if (codigos.length) {
    const { data: inms } = await SB().from('inmuebles')
      .select('id, codigo_house').in('codigo_house', codigos);
    out.inmuebles.push(...(inms || []).map(x => x.id));
  }

  // @nombreusuario (sin código de inmueble)
  // Primero extraer todos los @palabra excluyendo los que son códigos de inmueble o equipo
  const reUsr = /@([a-zA-Z0-9_.]+)/g;
  const matches = [...texto.matchAll(reUsr)].map(m => m[1]);
  const nombres = matches.filter(m => {
    if (/^(todos|equipo)$/i.test(m)) return false;
    if (/^[A-Z]+-\d+$/.test(m)) return false;  // código inmueble ya procesado
    return true;
  });
  if (nombres.length) {
    // Buscar por usuario o por primer nombre (matching parcial)
    const { data: us } = await SB().from('usuarios')
      .select('id, usuario, nombre').eq('activo', true).neq('tipo_usuario', 'publico');
    for (const n of nombres) {
      const match = (us || []).find(x =>
        x.usuario?.toLowerCase() === n.toLowerCase() ||
        x.nombre?.toLowerCase().startsWith(n.toLowerCase())
      );
      if (match && !out.usuarios.includes(match.id)) out.usuarios.push(match.id);
    }
  }

  return out;
}

// ============================================================
// VISITAS AGENDADAS
// ============================================================

export async function agendarVisita({ interesado_id, inmueble_id, fecha_visita, hora_visita, tipo_visita='presencial', notas_visita=null }) {
  const u = U(); if (!u) throw new Error('no_auth');
  if (!interesado_id || !inmueble_id) throw new Error('ids_requeridos');
  if (!fecha_visita || !hora_visita) throw new Error('fecha_hora_requeridas');

  // Validar que no haya conflicto (mismo asesor, misma fecha, ±30min)
  const { data: confl } = await SB().from('visitas_agendadas')
    .select('id, hora_visita, fecha_visita')
    .eq('asesor_id', u.id).eq('fecha_visita', fecha_visita)
    .in('estado', ['pendiente','reprogramada']);
  if (confl && confl.length) {
    // simple check: misma fecha/hora
    const conflExacto = confl.find(c => c.hora_visita === hora_visita);
    if (conflExacto) throw new Error('conflicto_horario');
  }

  const row = {
    interesado_id, inmueble_id, asesor_id: u.id,
    fecha_visita, hora_visita, tipo_visita,
    notas_visita: notas_visita || null,
    estado: 'pendiente',
  };
  const { data: created, error } = await SB().from('visitas_agendadas').insert(row).select('*').single();
  if (error) throw error;

  // Historial
  await SB().from('interesados_historial').insert({
    interesado_id,
    asesor_id: u.id,
    tipo_actividad: 'visita_agendada',
    descripcion: `Visita agendada para ${fecha_visita} a las ${hora_visita} (${tipo_visita})` + (notas_visita ? '. ' + notas_visita : ''),
  });

  // Auto-cambio de tipificación si estaba en nuevo/contactado
  const { data: lead } = await SB().from('interesados').select('tipificacion').eq('id', interesado_id).maybeSingle();
  if (lead && ['nuevo','contactado'].includes(lead.tipificacion)) {
    await cambiarTipificacion(interesado_id, 'visita_agendada', 'auto por agendar visita').catch(()=>{});
  }

  return created;
}

export async function cambiarEstadoVisita(visitaId, nuevoEstado, notas=null) {
  const u = U(); if (!u) throw new Error('no_auth');
  if (!['pendiente','realizada','cancelada','reprogramada','no_asistio'].includes(nuevoEstado)) {
    throw new Error('estado_invalido');
  }
  const upd = { estado: nuevoEstado, updated_at: new Date().toISOString() };
  if (notas) upd.notas_visita = notas;

  const { error } = await SB().from('visitas_agendadas').update(upd).eq('id', visitaId);
  if (error) throw error;

  // Si realizada → cambiar tipificacion del lead
  if (nuevoEstado === 'realizada' || nuevoEstado === 'no_asistio') {
    const { data: v } = await SB().from('visitas_agendadas').select('interesado_id').eq('id', visitaId).maybeSingle();
    if (v?.interesado_id) {
      await SB().from('interesados_historial').insert({
        interesado_id: v.interesado_id,
        asesor_id: u.id,
        tipo_actividad: nuevoEstado === 'realizada' ? 'visita_realizada' : 'nota',
        descripcion: nuevoEstado === 'realizada'
          ? `Visita marcada como realizada` + (notas ? '. ' + notas : '')
          : `Cliente no asistió a la visita`,
      });
      if (nuevoEstado === 'realizada') {
        await cambiarTipificacion(v.interesado_id, 'visita_realizada', 'auto al marcar visita realizada').catch(()=>{});
      } else if (nuevoEstado === 'no_asistio') {
        await cambiarTipificacion(v.interesado_id, 'contactado', 'cliente no asistió').catch(()=>{});
      }
    }
  }
  return true;
}

// ============================================================
// QUERIES
// ============================================================

export async function listarInteresados(filtros = {}) {
  const u = U();
  let q = SB().from('interesados')
    .select('*, inmueble:inmuebles!interesados_inmueble_id_fkey(id,codigo_house,tipo,ciudad,barrio,captador_id), creador:usuarios!asesor_creador_id(id,nombre), asignado:usuarios!asesor_asignado_id(id,nombre)')
    .order('fecha_ultima_actividad', { ascending: false });

  if (filtros.asesor_id)    q = q.or(`asesor_asignado_id.eq.${filtros.asesor_id},asesor_creador_id.eq.${filtros.asesor_id}`);
  if (filtros.inmueble_id)  q = q.eq('inmueble_id', filtros.inmueble_id);
  if (filtros.tipificacion) q = q.eq('tipificacion', filtros.tipificacion);
  if (filtros.estado)       q = q.eq('estado', filtros.estado);
  else                      q = q.neq('estado', 'descartado');

  // Privacidad: admin ve todo, otros solo ven los NO privados o los creados por ellos
  if (u && u.rol !== 'admin') {
    q = q.or(`privado.eq.false,privado.is.null,asesor_creador_id.eq.${u.id}`);
  }

  let { data, error } = await q.limit(filtros.limit || 500);
  if (error && /privado/i.test(error.message || '')) {
    // Fallback si columna privado no existe aún
    let q2 = SB().from('interesados')
      .select('*, inmueble:inmuebles!interesados_inmueble_id_fkey(id,codigo_house,tipo,ciudad,barrio,captador_id), creador:usuarios!asesor_creador_id(id,nombre), asignado:usuarios!asesor_asignado_id(id,nombre)')
      .order('fecha_ultima_actividad', { ascending: false });
    if (filtros.asesor_id)    q2 = q2.or(`asesor_asignado_id.eq.${filtros.asesor_id},asesor_creador_id.eq.${filtros.asesor_id}`);
    if (filtros.inmueble_id)  q2 = q2.eq('inmueble_id', filtros.inmueble_id);
    if (filtros.tipificacion) q2 = q2.eq('tipificacion', filtros.tipificacion);
    if (filtros.estado)       q2 = q2.eq('estado', filtros.estado);
    else                      q2 = q2.neq('estado', 'descartado');
    const r2 = await q2.limit(filtros.limit || 500);
    if (r2.error) throw r2.error;
    data = r2.data;
  } else if (error) {
    throw error;
  }
  return data || [];
}

export async function obtenerInteresado(id) {
  const u = U(); if (!u) throw new Error('no_auth');
  const { data, error } = await SB().from('interesados')
    .select('*, inmueble:inmuebles!interesados_inmueble_id_fkey(id,codigo_house,tipo,ciudad,barrio,direccion,captador_id,negociacion), creador:usuarios!asesor_creador_id(id,nombre,foto,telefono_contacto), asignado:usuarios!asesor_asignado_id(id,nombre,foto,telefono_contacto,usuario,es_gestor_arriendos)')
    .eq('id', id).maybeSingle();
  if (error || !data) return null;
  if (!puedeVerLead(data, u)) throw new Error('sin_permiso');
  return data;
}

export async function obtenerHistorial(interesadoId) {
  const { data } = await SB().from('interesados_historial')
    .select('*, asesor:usuarios!asesor_id(id,nombre,foto)')
    .eq('interesado_id', interesadoId)
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export async function obtenerInmueblesAdicionales(interesadoId) {
  const { data } = await SB().from('inmuebles_interesados')
    .select('*, inmueble:inmuebles(id,codigo_house,tipo,ciudad,barrio,precio_venta,precio_arriendo)')
    .eq('interesado_id', interesadoId)
    .order('fecha_agregado', { ascending: false });
  return data || [];
}

export async function obtenerVisitas(filtros = {}) {
  let q = SB().from('visitas_agendadas')
    .select('*, interesado:interesados(id,nombre_completo,telefono,tipificacion), inmueble:inmuebles(id,codigo_house,tipo,ciudad,barrio,direccion)')
    .order('fecha_visita', { ascending: true }).order('hora_visita', { ascending: true });

  if (filtros.interesado_id) q = q.eq('interesado_id', filtros.interesado_id);
  if (filtros.asesor_id)     q = q.eq('asesor_id', filtros.asesor_id);
  if (filtros.estado)        q = q.eq('estado', filtros.estado);
  if (filtros.fecha_desde)   q = q.gte('fecha_visita', filtros.fecha_desde);
  if (filtros.fecha_hasta)   q = q.lte('fecha_visita', filtros.fecha_hasta);

  const { data } = await q.limit(filtros.limit || 200);
  return data || [];
}

// Count por inmueble (para badge en tarjeta)
// Cuenta leads "abiertos": estado != descartado Y tipificación no sea cierre_*
// Respeta privacidad: usuarios no-admin solo cuentan los que pueden ver.
export async function contarInteresadosPorInmueble(inmuebleId) {
  const u = U();
  let q = SB().from('interesados')
    .select('id', { count: 'exact', head: true })
    .eq('inmueble_id', inmuebleId)
    .neq('estado', 'descartado')
    .not('tipificacion', 'in', '(cierre_ganado,cierre_perdido)');

  if (u && u.rol !== 'admin') {
    q = q.or(`privado.eq.false,privado.is.null,asesor_creador_id.eq.${u.id}`);
  }

  let { count, error } = await q;
  if (error && /privado/i.test(error.message || '')) {
    const r = await SB().from('interesados')
      .select('id', { count: 'exact', head: true })
      .eq('inmueble_id', inmuebleId)
      .neq('estado', 'descartado')
      .not('tipificacion', 'in', '(cierre_ganado,cierre_perdido)');
    count = r.count;
  }
  return count || 0;
}

// Alertas: leads sin actividad > N horas
export async function leadsSinActividad(horas = 72, asesorId = null) {
  const limite = new Date(Date.now() - horas * 3600000).toISOString();
  let q = SB().from('interesados')
    .select('id, nombre_completo, tipificacion, fecha_ultima_actividad, asesor_asignado_id')
    .lte('fecha_ultima_actividad', limite)
    .eq('estado', 'activo')
    .not('tipificacion', 'in', '(cierre_ganado,cierre_perdido)');
  if (asesorId) q = q.eq('asesor_asignado_id', asesorId);
  const { data } = await q.limit(100);
  return data || [];
}

// ============================================================
// EXPORTAR A window
// ============================================================

if (typeof window !== 'undefined') {
  window.TIPIFICACIONES = TIPIFICACIONES;
  window.CANAL_ORIGEN_LEAD = CANAL_ORIGEN;
  window.crearInteresado = crearInteresado;
  window.editarInteresado = editarInteresado;
  window.cambiarTipificacion = cambiarTipificacion;
  window.eliminarInteresado = eliminarInteresado;
  window.agregarNotaHistorial = agregarNotaHistorial;
  window.agendarVisita = agendarVisita;
  window.cambiarEstadoVisita = cambiarEstadoVisita;
  window.listarInteresados = listarInteresados;
  window.obtenerInteresado = obtenerInteresado;
  window.obtenerHistorial = obtenerHistorial;
  window.obtenerInmueblesAdicionales = obtenerInmueblesAdicionales;
  window.obtenerVisitas = obtenerVisitas;
  window.contarInteresadosPorInmueble = contarInteresadosPorInmueble;
  window.leadsSinActividad = leadsSinActividad;
  window.parsearMencionesLead = parsearMenciones;
}

export default {
  TIPIFICACIONES, CANAL_ORIGEN,
  crearInteresado, editarInteresado, cambiarTipificacion,
  agregarNotaHistorial, agendarVisita, cambiarEstadoVisita,
  listarInteresados, obtenerInteresado, obtenerHistorial,
  obtenerInmueblesAdicionales, obtenerVisitas,
  contarInteresadosPorInmueble, leadsSinActividad,
};
