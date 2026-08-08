/**
 * Módulo: domains/notifications
 *
 * Sistema completo de la campana de notificaciones (bell) del CRM:
 *   - Toggle abrir/cerrar dropdown + auto-cierre al click fuera
 *   - Render agrupado por contexto_id/broadcast_id, sección "Nuevas" (24h) vs "Anteriores"
 *   - Helpers de UI: avatar por nombre (color hasheado), tiempo relativo
 *   - Handlers: click → marcar leída + navegar según accion_tipo
 *   - Marcar todas como leídas
 *   - Descartar una notificación individual
 *
 * NO define window.noti (eso vive en core/notifications.js — es el bridge
 * al sistema nuevo que emite notificaciones). Este módulo sólo consume el
 * feed persistente window.NOTIFS / window.ALU y lo pinta.
 *
 * Superficie expuesta en window.* (para HTML shell + onclick inline):
 *   toggleBell, closeBell, renderBell,
 *   _timeAgo, _avatarHtml (helpers),
 *   handleNotifClick, marcarTodasLeidas, descartarNotificacion,
 *   openAlertInm.
 */

import { getSupabaseClient } from '../../config/supabase.js';

// ─── Shortcuts locales ───────────────────────────────────────────────
const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const D = () => window.D || [];

// ─── Handler chico de sec.1: abrir modal desde alerta de inmueble ────
window.openAlertInm = function (id) {
  const idx = D().findIndex((p) => p.id === id);
  if (idx > -1 && window.oM) window.oM(idx);
};

// ─── Toggle del dropdown ─────────────────────────────────────────────
window.toggleBell = function () {
  const dd = document.getElementById('belldd');
  if (!dd) return;
  dd.classList.toggle('show');
  if (dd.classList.contains('show')) window.renderBell();
};

window.closeBell = function () {
  document.getElementById('belldd')?.classList.remove('show');
};

// Auto-cierre al click fuera de .bell-wrap
document.addEventListener('click', (e) => {
  if (!e.target.closest('.bell-wrap')) window.closeBell();
});

// ─── Helpers de UI ───────────────────────────────────────────────────

// Tiempo relativo (ahora, 5m, 2h, 3d, o fecha corta)
window._timeAgo = function (iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

// Avatar circular (foto real o inicial con color hasheado del nombre)
window._avatarHtml = function (emisorNombre, emisorFoto, size = 40) {
  const nombre = emisorNombre || 'House';
  const inicial = (nombre.trim()[0] || 'H').toUpperCase();
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const bg = `hsl(${hue},55%,52%)`;
  if (emisorFoto) {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${emisorFoto}');background-size:cover;background-position:center;flex-shrink:0"></div>`;
  }
  const fs = Math.round(size * 0.42);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${fs}px;flex-shrink:0">${inicial}</div>`;
};

// ─── Render del panel de la campana ──────────────────────────────────
window.renderBell = function () {
  const el = document.getElementById('belldd');
  if (!el) return;
  const list = document.getElementById('belllist');
  if (!list) return;

  // NO tocar el.style.display — el toggle show/hide lo maneja la clase CSS .show
  el.style.width = '360px';
  el.style.maxHeight = '560px';
  el.style.overflow = 'hidden';

  const notifs = (window.NOTIFS || window.ALU || []).filter((n) => !n.descartada);
  const noLeidas = notifs.filter((n) => !n.leida).length;

  // Header con "Marcar todas"
  const hd = el.querySelector('.bell-hd');
  if (hd) {
    hd.innerHTML = `<span style="display:flex;align-items:center;gap:8px;font-weight:800">🔔 Notificaciones${noLeidas ? `<span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:800">${noLeidas}</span>` : ''}</span>
      ${noLeidas ? `<button onclick="marcarTodasLeidas()" style="background:none;border:none;color:var(--b600);font-size:11px;font-weight:700;cursor:pointer">✓ Todas</button>` : ''}`;
    hd.style.display = 'flex';
    hd.style.justifyContent = 'space-between';
    hd.style.alignItems = 'center';
    hd.style.padding = '12px 14px';
    hd.style.borderBottom = '1px solid var(--brd)';
  }

  if (!notifs.length) {
    list.innerHTML = '<div class="bell-empty" style="padding:40px 20px;text-align:center;color:var(--sub)">🎉 Sin notificaciones</div>';
    list.style.overflowY = 'auto';
    list.style.flex = '1';
    return;
  }

  // Agrupar por contexto_id (broadcast_id también agrupa)
  const grupos = {};
  const sueltas = [];
  notifs.forEach((n) => {
    const key = n.broadcast_id || n.contexto_id;
    if (key) {
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(n);
    } else {
      sueltas.push(n);
    }
  });

  const items = [];
  Object.values(grupos).forEach((g) => {
    g.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    items.push({ kind: 'group', items: g, latest: g[0] });
  });
  sueltas.forEach((n) => items.push({ kind: 'single', latest: n }));
  items.sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));

  // Separar en Nuevas (24h o no leídas) / Anteriores
  const ahora = Date.now();
  const nuevas = [];
  const anteriores = [];
  items.slice(0, 20).forEach((it) => {
    const n = it.latest;
    const hrs = (ahora - new Date(n.created_at).getTime()) / 3600000;
    if (!n.leida || hrs < 24) nuevas.push(it);
    else anteriores.push(it);
  });

  const renderItem = (it) => {
    const n = it.latest;
    const count = it.kind === 'group' ? it.items.length : 1;
    const sinLeer = it.kind === 'group' ? it.items.filter((x) => !x.leida).length > 0 : !n.leida;
    const ico = n.icono || '📌';
    const color = n.color || '#3b82f6';
    const mensaje = (n.mensaje || '').replace(/</g, '&lt;').slice(0, 80);
    const tiempo = window._timeAgo(n.created_at);
    const emisorNom = n.emisor_nombre || n.emisor?.nombre || '';
    const avatar = window._avatarHtml(emisorNom || 'House', n.emisor_foto, 40);
    const bg = sinLeer ? 'var(--b50)' : 'transparent';
    const leftBar = sinLeer ? `border-left:3px solid ${color}` : 'border-left:3px solid transparent';

    let actions = '';
    if (n.tipo === 'verificar' && n.accion_destino) {
      const idI = n.accion_destino;
      actions = `<div style="display:flex;gap:4px;margin-top:6px"><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:9px;font-weight:700;background:#10b981;color:#fff;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Aún Disponible')">✅ Disponible</button><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:9px;font-weight:700;background:#ef4444;color:#fff;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Retirado')">❌ No</button></div>`;
    }

    return `<div class="bell-item" style="display:flex;gap:10px;padding:11px 14px;background:${bg};${leftBar};border-bottom:1px solid var(--brd);cursor:pointer;position:relative" onclick="handleNotifClick('${n.id}','${n.accion_tipo || ''}','${n.accion_destino || ''}','${n.accion_seccion || ''}')">
      <div style="position:relative;flex-shrink:0">
        ${avatar}
        <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;border:2px solid var(--cd)">${ico}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:${sinLeer ? '700' : '500'};color:var(--tx);line-height:1.35">${(window.escapeHtml || String)(n.titulo || '')}${count > 1 ? `<span style="margin-left:6px;font-size:10px;background:${color}22;color:${color};padding:1px 6px;border-radius:8px;font-weight:700">+${count - 1}</span>` : ''}</div>
        ${mensaje ? `<div style="font-size:11.5px;color:var(--sub);margin-top:2px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${mensaje}</div>` : ''}
        <div style="font-size:10.5px;color:var(--sub);margin-top:4px;opacity:.75">${tiempo}${emisorNom ? ' · ' + emisorNom : ''}</div>
        ${actions}
      </div>
      ${sinLeer ? `<div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;align-self:center"></div>` : ''}
    </div>`;
  };

  let html = '';
  if (nuevas.length) {
    html += `<div style="padding:8px 14px 4px;font-size:10px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:0.8px;background:var(--cd)">Nuevas</div>`;
    html += nuevas.map(renderItem).join('');
  }
  if (anteriores.length) {
    html += `<div style="padding:10px 14px 4px;font-size:10px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:0.8px;background:var(--cd)">Anteriores</div>`;
    html += anteriores.map(renderItem).join('');
  }

  list.innerHTML = html;
  list.style.overflowY = 'auto';
  list.style.flex = '1';
};

// ─── Click en notificación: marcar leída + navegar contextual ────────
window.handleNotifClick = async function (notifId, accionTipo, accionDestino, accionSeccion) {
  const SBc = SB();
  const u = U();
  if (!u) return;

  // 1. Marcar leída + actuada
  try {
    await SBc.from('notificaciones').update({
      leida: true, leida_at: new Date().toISOString(),
      actuada: true, actuada_at: new Date().toISOString(),
    }).eq('id', notifId);

    // 2. Si tiene contexto, marca todas las del mismo contexto como leídas
    const n = (window.NOTIFS || []).find((x) => x.id === notifId);
    if (n?.contexto_id) {
      await SBc.from('notificaciones').update({
        leida: true, leida_at: new Date().toISOString(),
      })
        .eq('destinatario_id', u.id)
        .eq('contexto_id', n.contexto_id)
        .eq('leida', false);
    }

    // 3. Si era sugerencia, marca abierta_at en sugerencias_enviadas (best-effort)
    if (n && (n.tipo === 'sugerencia' || (accionTipo === 'abrir_inmueble_nuevo' && accionDestino))) {
      SBc.from('sugerencias_enviadas').update({
        resultado: 'abierta', abierta_at: new Date().toISOString(),
      })
        .eq('usuario_id', u.id)
        .eq('inmueble_id', accionDestino)
        .in('resultado', ['enviada'])
        .then(() => { /* noop */ }, (e) => console.warn('[sug abierta]', e));
    }
  } catch (e) { console.error('[notif click]', e); }

  // 4. Cerrar dropdown
  if (window.closeBell) window.closeBell();

  // 5. Navegar según accion_tipo
  switch (accionTipo) {
    case 'abrir_inmueble':
      if (accionDestino) {
        const idx = (window.D || []).findIndex((p) => p.id === accionDestino);
        if (idx > -1) {
          if (window.go) window.go('inv');
          setTimeout(() => window.oM && window.oM(idx), 200);
        } else if (window.go) {
          window.go('inv');
        }
      } else if (window.go) window.go('inv');
      break;
    case 'abrir_referido':
      if (window.go) window.go('mis-referidos');
      if (accionDestino) {
        setTimeout(() => {
          const card = document.querySelector('[data-referido-id="' + accionDestino + '"]');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 3px #3b82f6';
            setTimeout(() => { card.style.boxShadow = ''; }, 3000);
          }
        }, 500);
      }
      break;
    case 'abrir_solicitud':
      if (window.go) window.go('mis');
      break;
    case 'abrir_pago':
      if (u.rol === 'admin' || u.rol === 'oficina') {
        if (window.go) window.go('admin-pagos');
      } else {
        if (window.go) window.go('metodo-pago');
      }
      break;
    case 'abrir_agenda':
      if (window.go) window.go('agenda');
      break;
    case 'abrir_mensaje':
      if (window.go) window.go('mensajes');
      break;
    case 'abrir_usuario':
      if (window.go) window.go('users');
      break;
    case 'abrir_comunicado':
    case 'abrir_favorito':
    case 'abrir_inmueble_nuevo':
    case 'abrir_perfil_nuevo':
      if (accionTipo === 'abrir_inmueble_nuevo' && accionDestino) {
        const idx2 = (window.D || []).findIndex((p) => p.id === accionDestino);
        if (idx2 > -1) {
          if (window.go) window.go('inv');
          setTimeout(() => window.oM && window.oM(idx2), 200);
          break;
        }
      }
      if (accionTipo === 'abrir_perfil_nuevo') {
        if (window.go) window.go('users');
        break;
      }
      if (window.go) window.go('alertas');
      break;
    case 'abrir_seccion':
      if (accionSeccion && window.go) window.go(accionSeccion);
      break;
    default:
      console.warn('[notif] acción no reconocida:', accionTipo);
  }

  // 6. Recargar conteos
  if (window.load) window.load();
};

// ─── Marcar todas como leídas ────────────────────────────────────────
window.marcarTodasLeidas = async function () {
  const u = U();
  if (!u) return;
  await SB().from('notificaciones').update({
    leida: true, leida_at: new Date().toISOString(),
  }).eq('destinatario_id', u.id).eq('leida', false);
  if (window.load) window.load();
  if (window.toast) window.toast('✅ Todas marcadas como leídas');
};

// ─── Descartar una notificación individual ───────────────────────────
window.descartarNotificacion = async function (notifId) {
  await SB().from('notificaciones').update({
    descartada: true, leida: true, leida_at: new Date().toISOString(),
  }).eq('id', notifId);
  if (window.load) window.load();
};
