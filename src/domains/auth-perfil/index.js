/**
 * Módulo: domains/auth-perfil
 *
 * Gestión de usuarios, perfil propio, roles + upgrade/downgrade, y
 * activación de perfiles públicos.
 *
 * Consolidadas 3 secciones de functions.js:
 *   Sec 12  — USERS + PROFILE + PORTALES
 *   Sec 31c — PERFILES PÚBLICOS DINÁMICOS
 *   Sec 32  — GESTIÓN DE ROLES (upgrade/downgrade/crear)
 *
 * Superficie:
 *   Users basic: newUsr, tUsr (toggle activo)
 *   Perfil propio: savePerfil
 *   Portales: sPrt (metrocuadrado/fincaraíz por prompt)
 *   Perfiles públicos: activarPerfilPublico
 *   Roles: abrirCambiarRol, cambiarRolUsuario, _renderConfirmCambioRol
 *   Crear con wizard: abrirCrearUsuario + _renderCrearUsuarioModal + _crearUsuarioFinal
 *   Compartir arriendos: compartirArriendos
 *
 * Deps window.*: hashPwd, toast, rUsers, rPerfil, rPort, userStore,
 *                logout, load, noti, USERS
 */

import { getSupabaseClient } from '../../config/supabase.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const D = () => window.D || [];
const findInm = (id) => D().find((p) => p.id === id);
const descInm = (p) => window.descInm ? window.descInm(p) : (p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble');

// ══════════════════════════════════════════════════════════════════════
// 12. USERS + PROFILE + PORTALES
// ══════════════════════════════════════════════════════════════════════

window.newUsr = function () {
  const n = prompt('Nombre:'); if (!n) return;
  const usr = prompt('Usuario:'); if (!usr) return;
  const pwd = prompt('Contraseña:'); if (!pwd) return;
  const em = prompt('Email (opcional):', '');
  const rl = prompt('Rol (asesor/oficina):', 'asesor'); if (!rl) return;
  window.hashPwd(pwd).then((h2) => {
    SB().from('usuarios').insert({
      nombre: n, usuario: usr.toLowerCase(), password_hash: h2,
      email: em || null, rol: rl.toLowerCase(), activo: true,
    }).then(({ error }) => {
      if (!error) { window.toast('✅ Creado'); window.rUsers(); }
      else window.toast(error.message, 'terr');
    });
  });
};

window.tUsr = async function (id, cur) {
  try {
    const { error } = await SB().from('usuarios').update({ activo: !cur }).eq('id', id);
    if (error) { console.error('[tUsr]', error); window.toast('Error: ' + error.message, 'terr'); return; }
    window.toast(!cur ? '✅ Activado' : '🔒 Bloqueado');
    window.rUsers();
  } catch (e) { console.error('[tUsr]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.savePerfil = async function () {
  const u = U();
  const upd = {};
  const nm = document.getElementById('pf_nombre')?.value.trim();
  if (nm && nm !== u.nombre) upd.nombre = nm;
  const em = document.getElementById('pf_email')?.value.trim();
  if (em !== (u.email || '')) upd.email = em || null;
  const usr = document.getElementById('pf_usuario')?.value.trim().toLowerCase();
  if (usr && usr !== (u.usuario || '')) upd.usuario = usr;
  const pwd = document.getElementById('pf_pwd')?.value;
  if (pwd) upd.password_hash = await window.hashPwd(pwd);
  const tel = document.getElementById('pf_tel')?.value.trim();
  if (tel !== (u.telefono_contacto || '')) upd.telefono_contacto = tel || null;
  if (!Object.keys(upd).length) { window.toast('Sin cambios', 'twarn'); return; }
  const { error } = await SB().from('usuarios').update(upd).eq('id', u.id);
  if (!error) {
    window.toast('✅ Perfil actualizado');
    if (upd.nombre) u.nombre = upd.nombre;
    if (upd.email !== undefined) u.email = upd.email;
    if (upd.telefono_contacto !== undefined) u.telefono_contacto = upd.telefono_contacto;
    window.userStore?.set(u);
    if (upd.password_hash || upd.usuario) {
      window.toast('🔄 Vuelve a ingresar', 'tinfo');
      setTimeout(() => window.logout(), 2000);
    } else window.rPerfil();
  } else window.toast(error.message, 'terr');
};

window.sPrt = async function (id, field) {
  const url = prompt('Pega el enlace del portal:');
  if (!url) return;
  await SB().from('inmuebles').update({ [field]: url, updated_at: new Date().toISOString() }).eq('id', id);
  const p = findInm(id);
  const desc = descInm(p);
  const portal = field === 'url_metrocuadrado' ? 'Metrocuadrado' : 'Fincaraíz';
  await window.noti('portal_listo', 'verde', '🌐 ' + desc + ' en ' + portal, U().nombre + ' subió ' + desc + ' a ' + portal, null, 'admin', id);
  window.toast('✅ Portal actualizado');
  window.load();
  if (window.rPort) window.rPort();
};

// ══════════════════════════════════════════════════════════════════════
// 31c. PERFILES PÚBLICOS DINÁMICOS
// ══════════════════════════════════════════════════════════════════════

window.activarPerfilPublico = async function (perfil) {
  const u = U();
  if (!u || u.tipo_usuario !== 'publico') return;
  const perfiles = u.perfiles_publicos || [];
  if (perfiles.includes(perfil)) return;
  perfiles.push(perfil);
  await SB().from('usuarios').update({ perfiles_publicos: perfiles }).eq('id', u.id);
  window.userStore.update({ perfiles_publicos: perfiles });
};

// ══════════════════════════════════════════════════════════════════════
// 32. GESTIÓN DE ROLES — Upgrade/Downgrade/Crear
// ══════════════════════════════════════════════════════════════════════

const _RM = {
  admin: { badge: '🔴 Admin', color: '#DC2626', nivel: 1, permisos: ['Acceso total', 'Crear cualquier usuario', 'Moderación', 'Calificación', 'Usuarios', 'Papelera'] },
  oficina: { badge: '🟠 Oficina', color: '#EA580C', nivel: 2, permisos: ['Inventario completo', 'Moderación', 'Calificación', 'Dashboard', 'Crear asesores'] },
  gestor: { badge: '🟢 Gestor', color: '#059669', nivel: 3, permisos: ['Inventario completo', 'Su embudo', 'Ver datos propietarios arriendos'] },
  asesor: { badge: '🔵 Asesor', color: '#2563EB', nivel: 3, permisos: ['Inventario completo', 'Su embudo personal', 'Dashboard propio'] },
  publico: { badge: '⚫ Público', color: '#6B7280', nivel: 4, permisos: ['Explorar inmuebles', 'Publicar (pendiente revisión)', 'Favoritos', 'Mis negocios'] },
};

window.abrirCambiarRol = async function (userId, direccion) {
  const { data: usr } = await SB().from('usuarios').select('*').eq('id', userId).single();
  if (!usr) { window.toast('Usuario no encontrado', 'terr'); return; }
  const curRol = usr.es_gestor_arriendos ? 'gestor' : (usr.tipo_usuario === 'publico' ? 'publico' : usr.rol);
  const curMeta = _RM[curRol] || _RM.publico;

  const upgrades = curRol === 'publico' ? ['asesor', 'gestor', 'oficina'] : curRol === 'asesor' ? ['gestor', 'oficina'] : curRol === 'gestor' ? ['oficina'] : curRol === 'oficina' ? ['admin'] : [];
  const downgrades = curRol === 'admin' ? ['oficina'] : curRol === 'oficina' ? ['gestor', 'asesor', 'publico'] : curRol === 'gestor' ? ['asesor', 'publico'] : curRol === 'asesor' ? ['publico'] : [];
  const options = direccion === 'upgrade' ? upgrades : downgrades;
  const isUp = direccion === 'upgrade';
  const color = isUp ? '#10b981' : '#ef4444';

  let h = '<div style="padding:24px 20px;max-width:480px">';
  h += '<div style="text-align:center;margin-bottom:16px"><div style="font-size:36px;margin-bottom:4px">' + (isUp ? '⬆️' : '⬇️') + '</div>';
  h += '<div style="font-size:20px;font-weight:800;color:' + color + '">' + (isUp ? 'Upgrade' : 'Downgrade') + ' de ' + usr.nombre + '</div>';
  h += '<div style="font-size:14px;color:var(--sub);margin-top:4px">Rol actual: <strong style="color:' + curMeta.color + '">' + curMeta.badge + '</strong></div></div>';

  if (!options.length) {
    h += '<div style="text-align:center;padding:30px;color:var(--sub)">Este usuario ya tiene el rol ' + (isUp ? 'más alto' : 'más bajo') + ' disponible</div>';
  } else {
    h += '<div style="font-size:14px;font-weight:800;color:' + color + ';margin-bottom:12px">¿A qué rol quieres ' + (isUp ? 'subirlo' : 'bajarlo') + '?</div>';
    options.forEach((rk) => {
      const r = _RM[rk];
      h += '<div onclick="window._selNewRol=\'' + rk + '\';window._cambioUserId=\'' + userId + '\';window._cambioDir=\'' + direccion + '\';_renderConfirmCambioRol()" style="background:var(--cd);border-radius:16px;padding:16px;margin-bottom:10px;border:2px solid ' + r.color + '20;cursor:pointer">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:16px;font-weight:800;color:' + r.color + '">' + r.badge + '</div><div style="font-size:12px;color:' + color + ';font-weight:700">Nivel ' + r.nivel + '</div></div>';
      h += '<div style="font-size:13px;font-weight:700;color:' + (isUp ? '#065f46' : '#991b1b') + ';margin-bottom:6px">' + (isUp ? 'Permisos que GANA:' : 'Permisos que PIERDE:') + '</div>';
      const perms = isUp ? r.permisos : curMeta.permisos.filter((p) => !r.permisos.includes(p));
      perms.forEach((p) => { h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:3px"><span style="color:' + (isUp ? '#10b981' : '#ef4444') + ';font-size:12px">' + (isUp ? '✅' : '❌') + '</span><span style="font-size:12px;color:var(--tx)">' + p + '</span></div>'; });
      h += '</div>';
    });
  }
  h += '<button onclick="document.getElementById(\'rolDlg\')?.remove()" style="width:100%;padding:12px;border:1.5px solid var(--brd);border-radius:12px;background:var(--cd);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;color:var(--sub);margin-top:8px">Cancelar</button>';
  h += '</div>';

  const modal = '<div id="rolDlg" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()"><div style="background:var(--cd);border-radius:20px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">' + h + '</div></div>';
  document.body.insertAdjacentHTML('beforeend', modal);
};

// Expuesto en window para reusarse desde onclick inline generado
window._renderConfirmCambioRol = function () {
  const dlg = document.getElementById('rolDlg'); if (!dlg) return;
  const rk = window._selNewRol;
  const userId = window._cambioUserId;
  const dir = window._cambioDir;
  const r = _RM[rk];
  const isUp = dir === 'upgrade';
  const color = isUp ? '#10b981' : '#ef4444';

  let h = '<div style="padding:24px 20px">';
  h += '<div style="font-size:14px;font-weight:800;color:' + color + ';margin-bottom:16px">Confirmar ' + dir + '</div>';
  h += '<div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:16px">';
  h += '<div style="text-align:center;padding:12px;border-radius:14px;background:var(--cd2);min-width:80px"><div style="font-size:11px;font-weight:700;color:var(--sub)">Actual</div></div>';
  h += '<div style="font-size:24px;color:' + color + '">→</div>';
  h += '<div style="text-align:center;padding:12px;border-radius:14px;background:' + r.color + '10;border:2px solid ' + r.color + '30;min-width:80px"><div style="font-size:11px;font-weight:700;color:' + r.color + '">' + r.badge + '</div></div>';
  h += '</div>';

  h += '<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Motivo del cambio *</div><textarea id="rolMotivo" rows="3" placeholder="Mínimo 20 caracteres. Ej: Promoción por buen desempeño..." style="width:100%;padding:12px;border-radius:12px;border:2px solid var(--brd);font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;background:var(--cd);color:var(--tx)"></textarea></div>';

  h += '<div style="display:flex;gap:8px">';
  h += '<button onclick="window._selNewRol=null;abrirCambiarRol(\'' + userId + '\',\'' + dir + '\')" style="flex:1;padding:14px;border-radius:14px;border:2px solid var(--brd);background:var(--cd);color:var(--sub);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">← Cambiar</button>';
  h += '<button onclick="cambiarRolUsuario(\'' + userId + '\',\'' + rk + '\')" style="flex:2;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,' + color + ',' + color + 'cc);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">' + (isUp ? '✅ Confirmar upgrade' : '⚠️ Confirmar downgrade') + '</button>';
  h += '</div></div>';

  dlg.querySelector('div > div').innerHTML = h;
};

window.cambiarRolUsuario = async function (userId, nuevoRolKey) {
  const motivo = (document.getElementById('rolMotivo')?.value || '').trim();
  if (!motivo || motivo.length < 20) { window.toast('El motivo debe tener al menos 20 caracteres', 'twarn'); return; }

  const { data: usr } = await SB().from('usuarios').select('rol,tipo_usuario,es_gestor_arriendos,nombre,perfiles_publicos').eq('id', userId).single();
  if (!usr) { window.toast('Usuario no encontrado', 'terr'); return; }

  const curRolKey = usr.es_gestor_arriendos ? 'gestor' : (usr.tipo_usuario === 'publico' ? 'publico' : usr.rol);
  const niveles = { admin: 1, oficina: 2, gestor: 3, asesor: 3, publico: 4 };
  const dir = (niveles[nuevoRolKey] || 4) < (niveles[curRolKey] || 4) ? 'upgrade' : (niveles[nuevoRolKey] || 4) > (niveles[curRolKey] || 4) ? 'downgrade' : 'lateral';

  const upd = {};
  if (nuevoRolKey === 'publico') { upd.tipo_usuario = 'publico'; upd.rol = 'asesor'; upd.es_gestor_arriendos = false; upd.perfiles_publicos = ['comprador']; }
  else if (nuevoRolKey === 'gestor') { upd.tipo_usuario = 'interno'; upd.rol = 'asesor'; upd.es_gestor_arriendos = true; upd.perfiles_publicos = []; }
  else { upd.tipo_usuario = 'interno'; upd.rol = nuevoRolKey; upd.es_gestor_arriendos = false; upd.perfiles_publicos = []; }

  await SB().from('usuarios').update(upd).eq('id', userId);

  try {
    await SB().from('historial_roles_usuario').insert({
      usuario_id: userId, rol_anterior: curRolKey, rol_nuevo: nuevoRolKey,
      tipo_anterior: usr.tipo_usuario, tipo_nuevo: upd.tipo_usuario,
      direccion: dir, cambiado_por: U().id, motivo,
    });
  } catch (e) { console.warn('[cambiarRol] historial:', e.message); }

  await window.noti('registro_aprobado', 'verde', '🔄 Tu perfil fue actualizado', 'Tu rol cambió a ' + (_RM[nuevoRolKey]?.badge || nuevoRolKey) + '. Motivo: ' + motivo, null, null, null);

  document.getElementById('rolDlg')?.remove();
  window.toast('✅ Rol actualizado: ' + usr.nombre + ' → ' + (_RM[nuevoRolKey]?.badge || nuevoRolKey));
  if (typeof window.rUsers === 'function') window.rUsers();
};

window.abrirCrearUsuario = function () {
  window._crearStep = 1;
  window._crearRol = null;
  window._renderCrearUsuarioModal();
};

window._renderCrearUsuarioModal = function () {
  document.getElementById('crearUsrDlg')?.remove();
  const step = window._crearStep || 1;
  const rolKey = window._crearRol;

  let h = '<div style="padding:24px 20px;max-width:480px">';

  if (step === 1) {
    h += '<div style="text-align:center;margin-bottom:16px"><div style="font-size:36px;margin-bottom:4px">➕</div><div style="font-size:20px;font-weight:800;color:#122d4f">Crear usuario nuevo</div><div style="font-size:14px;color:var(--sub);margin-top:4px">Paso 1 de 2: Elige el rol</div></div>';
    ['asesor', 'gestor', 'oficina', 'admin'].forEach((rk) => {
      const r = _RM[rk];
      const sel = rolKey === rk;
      h += '<div onclick="window._crearRol=\'' + rk + '\';_renderCrearUsuarioModal()" style="background:' + (sel ? r.color + '08' : 'var(--cd)') + ';border-radius:16px;padding:16px;margin-bottom:10px;border:2px solid ' + (sel ? r.color : 'var(--brd)') + ';cursor:pointer">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:16px;font-weight:800;color:' + r.color + '">' + r.badge + '</div>' + (sel ? '<span style="font-size:14px;color:' + r.color + '">✓</span>' : '') + '</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      r.permisos.forEach((p) => { h += '<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:' + r.color + '10;color:' + r.color + ';font-weight:600">' + p + '</span>'; });
      h += '</div></div>';
    });
    h += '<button onclick="if(!window._crearRol){toast(\'Selecciona un rol\',\'twarn\');return;}window._crearStep=2;_renderCrearUsuarioModal()" style="width:100%;padding:16px;border-radius:14px;border:none;background:' + (rolKey ? 'linear-gradient(135deg,#122d4f,#1a4f8b)' : 'var(--brd)') + ';color:' + (rolKey ? '#fff' : 'var(--sub)') + ';font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:8px">Siguiente → Datos del usuario</button>';
  } else if (step === 2 && rolKey) {
    const r = _RM[rolKey];
    h += '<div style="text-align:center;margin-bottom:16px"><div style="font-size:36px;margin-bottom:4px">' + r.badge.split(' ')[0] + '</div><div style="font-size:20px;font-weight:800;color:' + r.color + '">Nuevo ' + r.badge + '</div><div style="font-size:14px;color:var(--sub);margin-top:4px">Paso 2 de 2: Datos personales</div></div>';
    h += '<div style="display:flex;flex-direction:column;gap:10px">';
    [
      { l: 'Nombre completo *', id: 'cu_nombre', ph: 'Ej: Carlos Mejía' },
      { l: 'Correo electrónico *', id: 'cu_email', ph: 'Ej: carlos@house.com', t: 'email' },
      { l: 'Teléfono (WhatsApp) *', id: 'cu_tel', ph: 'Ej: 310 555 1234', t: 'tel' },
    ].forEach((f) => {
      h += '<div><div style="font-size:13px;font-weight:700;margin-bottom:4px">' + f.l + '</div><input id="' + f.id + '" type="' + (f.t || 'text') + '" placeholder="' + f.ph + '" style="width:100%;padding:12px;border-radius:12px;border:2px solid var(--brd);font-size:14px;box-sizing:border-box;font-family:inherit;background:var(--cd);color:var(--tx)"></div>';
    });
    h += '</div>';
    h += '<div style="display:flex;gap:8px;margin-top:14px">';
    h += '<button onclick="window._crearStep=1;_renderCrearUsuarioModal()" style="flex:1;padding:14px;border-radius:14px;border:2px solid var(--brd);background:var(--cd);color:var(--sub);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">← Cambiar rol</button>';
    h += '<button onclick="_crearUsuarioFinal(\'' + rolKey + '\')" style="flex:2;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,' + r.color + ',' + r.color + 'cc);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">✅ Crear usuario</button>';
    h += '</div>';
  }

  h += '<button onclick="document.getElementById(\'crearUsrDlg\')?.remove()" style="width:100%;padding:10px;border:none;background:transparent;color:var(--sub);font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px">Cancelar</button>';
  h += '</div>';

  const existing = document.getElementById('crearUsrDlg');
  if (existing) { existing.querySelector('div > div').innerHTML = h; }
  else { document.body.insertAdjacentHTML('beforeend', '<div id="crearUsrDlg" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()"><div style="background:var(--cd);border-radius:20px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">' + h + '</div></div>'); }
};

window._crearUsuarioFinal = async function (rolKey) {
  const nombre = (document.getElementById('cu_nombre')?.value || '').trim();
  const email = (document.getElementById('cu_email')?.value || '').trim();
  const tel = (document.getElementById('cu_tel')?.value || '').trim();
  if (!nombre || !email) { window.toast('Nombre y email son obligatorios', 'twarn'); return; }

  const u = U();
  const upd = { nombre, email, telefono_contacto: tel || null, activo: true, creado_por: u.id };
  if (rolKey === 'gestor') { upd.rol = 'asesor'; upd.tipo_usuario = 'interno'; upd.es_gestor_arriendos = true; }
  else { upd.rol = rolKey; upd.tipo_usuario = 'interno'; upd.es_gestor_arriendos = false; }
  upd.perfiles_publicos = [];

  try {
    const { error } = await SB().from('usuarios').insert(upd);
    if (error) {
      if (/creado_por|estado_usuario|notas_admin/i.test(error.message)) {
        delete upd.creado_por;
        await SB().from('usuarios').insert(upd);
      } else throw error;
    }
    document.getElementById('crearUsrDlg')?.remove();
    window.toast('✅ Usuario creado: ' + nombre + ' como ' + (_RM[rolKey]?.badge || rolKey));
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch (e) { console.error('[crearUsuario]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// Share link para categoría arriendos (utilidad menor)
window.compartirArriendos = function () {
  const url = 'https://inmobiliariahouse.com.co/arriendos';
  const texto = '🔑 Inmuebles en arriendo en Pereira y el Eje Cafetero\n\n🏠 Apartamentos, casas y locales verificados por Inmobiliaria House.\n✅ Sin intermediarios — te acompañamos hasta el cierre.\n\n👉 ' + url;
  if (navigator.share) {
    navigator.share({ title: '🔑 Arriendos · Inmobiliaria House', text: texto, url }).catch(() => { /* noop */ });
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  }
};
