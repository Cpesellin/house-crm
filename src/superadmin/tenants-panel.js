/**
 * Módulo: superadmin/tenants-panel
 *
 * Panel central de la plataforma: todas las inmobiliarias en una
 * pantalla, con lo que hace falta para operarlas.
 *
 *   - Resumen arriba: cuántas hay y cuántas necesitan atención HOY
 *   - Lista con búsqueda, filtros y orden
 *   - Ficha de cada una: identidad, suscripción, consumo, acciones
 *   - Crear · Pausar · Reactivar
 *
 * Ruta: #/superadmin-tenants
 *
 * CRITERIO DE DISEÑO
 *   Es una consola de operación, no un tablero de presentación. Lo que
 *   se responde en el primer segundo es "¿hay algo que atender?", y por
 *   eso las que vencen o están pausadas se ordenan primero y se marcan
 *   en color. Nada de gráficas decorativas.
 *
 * DE DÓNDE SALEN LOS DATOS
 *   Un único RPC (`superadmin_list_tenants`, sql/51) que ya devuelve el
 *   plan, el estado de la suscripción, el próximo cobro y los conteos de
 *   usuarios e inmuebles por inquilino. Se pide UNA vez y todo el
 *   filtrado ocurre en memoria: con cientos de inquilinos sigue siendo
 *   instantáneo y no se castiga la base en cada tecla.
 *
 * ⚠️ LÍMITE CONOCIDO DE SEGURIDAD
 *   `is_superadmin()` hoy significa "admin de Inmobiliaria House". Es
 *   decir, el administrador de una inmobiliaria cliente es también
 *   administrador de la plataforma. Está en la auditoría
 *   (docs/AUDITORIA-SAAS-MULTITENANT.md) como riesgo R5 y hay que
 *   separarlo antes de vender el primer acceso. Este panel no lo
 *   empeora, pero tampoco lo arregla.
 *
 * Backend: RPCs superadmin_* en Supabase (sql/51).
 */

import { getSupabaseClient } from '../config/supabase.js';
import { esSuperadmin as _esSuperadminRPC } from '../core/superadmin-check.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/**
 * ¿Puede ver el panel de la plataforma?
 *
 * La autoridad es el RPC `is_superadmin()`, que desde la migración 69
 * lee la lista `plataforma_admin`. Aquí sólo se descarta lo que no hace
 * falta preguntar.
 *
 * ANTES se exigía `u.rol === 'admin'`, porque superadmin significaba
 * "admin de House". Con la lista explícita eso deja de ser cierto: un
 * administrador de la plataforma puede no administrar ninguna
 * inmobiliaria, y con el filtro viejo se le habría negado el panel
 * aunque la base dijera que sí.
 *
 * Se conserva el descarte de los clientes del público: nunca van a
 * estar en la lista, y así no se consulta de más.
 */
export async function esSuperadmin() {
  const u = U();
  if (!u) return false;
  if ((u.tipo_usuario || 'interno') === 'publico') return false;
  return _esSuperadminRPC();
}

/**
 * Dónde se pinta el panel.
 *
 * Tiene su propia sección (`sec-superadmin`, registrada en el router),
 * y no se cuela en `#res`, que es el contenedor de resultados del
 * inventario. Antes lo hacía, y eso ataba el panel a que la sección del
 * inventario estuviera visible: según lo que el router tuviera en
 * pantalla, el botón 🛠️ podía no mostrar nada.
 *
 * El respaldo a #res/#app se conserva para no romper nada si alguien
 * llama a la función antes de que el shell exista.
 */
function contenedor() {
  return document.getElementById('saPanel')
      || document.getElementById('res')
      || document.getElementById('app');
}

// ══════════════════════════════════════════════════════════════════
// Cálculos
// ══════════════════════════════════════════════════════════════════

/** Días hasta el próximo cobro. Negativo = ya venció. null = sin fecha. */
function diasRestantes(t) {
  if (!t.proximo_cobro) return null;
  const f = new Date(t.proximo_cobro + 'T00:00:00');
  if (isNaN(f)) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f - hoy) / 86400000);
}

/**
 * En qué situación está cada inmobiliaria.
 *
 * El orden de las comprobaciones importa: una pausada puede tener
 * además la fecha vencida, y lo que hay que ver primero es que está
 * pausada — es lo que explica que sus usuarios no entren.
 */
function situacion(t) {
  const estado = t.suscripcion_estado || 'sin_suscripcion';
  const d = diasRestantes(t);
  if (!t.acceso_permitido) return 'pausada';
  if (estado === 'grace') return 'gracia';
  if (estado === 'trial') return 'prueba';
  if (d !== null && d < 0) return 'vencida';
  if (d !== null && d <= 7) return 'porvencer';
  return 'activa';
}

const SITUACIONES = {
  activa:    { etiqueta: 'Al día',     color: '#10b981', atencion: false },
  prueba:    { etiqueta: 'En prueba',  color: '#3b82f6', atencion: false },
  porvencer: { etiqueta: 'Por vencer', color: '#f59e0b', atencion: true  },
  gracia:    { etiqueta: 'En gracia',  color: '#f97316', atencion: true  },
  vencida:   { etiqueta: 'Vencida',    color: '#ef4444', atencion: true  },
  pausada:   { etiqueta: 'Pausada',    color: '#64748b', atencion: true  },
};

/** "faltan 12 días", "vence hoy", "venció hace 3 días". */
function textoVencimiento(t) {
  const d = diasRestantes(t);
  if (d === null) return 'sin fecha de cobro';
  if (d === 0) return 'vence hoy';
  if (d === 1) return 'vence mañana';
  if (d > 1) return 'faltan ' + d + ' días';
  if (d === -1) return 'venció ayer';
  return 'venció hace ' + Math.abs(d) + ' días';
}

function fechaCorta(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return String(s); }
}

// ══════════════════════════════════════════════════════════════════
// Estado de la vista (en memoria, no se persiste)
// ══════════════════════════════════════════════════════════════════

let _tenants = [];
let _filtro = 'todas';
let _busca = '';
let _orden = 'atencion';

const ORDENES = {
  atencion: 'Primero lo urgente',
  nombre:   'Nombre',
  vence:    'Próximo a vencer',
  usuarios: 'Más usuarios',
  inmuebles:'Más inmuebles',
  nuevas:   'Más recientes',
};

/**
 * ¿Hay que hacer algo con esta inmobiliaria hoy?
 *
 * No basta con la situación: una PRUEBA a punto de vencer no está en
 * problemas, pero es el momento comercial que no se puede dejar pasar —
 * si nadie llama, el cliente se va solo. Contarla como "al día" era
 * esconderla justo cuando más importa.
 */
function requiereAtencion(t) {
  const s = situacion(t);
  if (SITUACIONES[s].atencion) return true;
  if (s === 'prueba') {
    const d = diasRestantes(t);
    return d !== null && d <= 7;
  }
  return false;
}

function aplicarFiltros() {
  const q = _busca.trim().toLowerCase();
  let lista = _tenants.filter((t) => {
    if (_filtro === 'atencion' && !requiereAtencion(t)) return false;
    if (_filtro !== 'todas' && _filtro !== 'atencion' && situacion(t) !== _filtro) return false;
    if (!q) return true;
    return [t.nombre, t.slug, t.email_admin, t.ciudad, t.dominio_custom]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  const pesoAtencion = (t) => (requiereAtencion(t) ? 0 : 1);
  const dias = (t) => { const d = diasRestantes(t); return d === null ? 99999 : d; };

  lista.sort((a, b) => {
    if (_orden === 'atencion') {
      if (pesoAtencion(a) !== pesoAtencion(b)) return pesoAtencion(a) - pesoAtencion(b);
      return dias(a) - dias(b);
    }
    if (_orden === 'vence') return dias(a) - dias(b);
    if (_orden === 'usuarios') return (b.n_usuarios || 0) - (a.n_usuarios || 0);
    if (_orden === 'inmuebles') return (b.n_inmuebles || 0) - (a.n_inmuebles || 0);
    if (_orden === 'nuevas') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });
  return lista;
}

// ══════════════════════════════════════════════════════════════════
// Render
// ══════════════════════════════════════════════════════════════════

export async function renderTenantsPanel() {
  const el = contenedor();
  if (!el) return;

  if (!(await esSuperadmin())) {
    el.innerHTML = `<div style="padding:40px;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700">Acceso restringido</div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px">Solo superadmins de House pueden ver este panel.</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--sub);font-size:13px">Cargando inmobiliarias…</div>`;

  const { data, error } = await SB().rpc('superadmin_list_tenants');
  if (error) {
    el.innerHTML = `<div style="padding:24px;max-width:640px;margin:0 auto;text-align:center">
      <div style="font-size:34px;margin-bottom:10px">⚠️</div>
      <div style="font-size:16px;font-weight:800">No se pudo cargar la lista</div>
      <div style="font-size:13px;color:var(--sub);margin-top:8px;line-height:1.5">${esc(error.message)}</div>
      <button onclick="window.rSuperadminTenants&&window.rSuperadminTenants()" style="margin-top:16px;padding:9px 18px;border:1.5px solid var(--brd);background:var(--cd);border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Reintentar</button>
    </div>`;
    return;
  }

  _tenants = Array.isArray(data) ? data : [];
  pintar();
}

/** Repinta sólo con lo que ya está en memoria (filtros, búsqueda, orden). */
function pintar() {
  const el = contenedor();
  if (!el) return;

  const lista = aplicarFiltros();
  const cuenta = (fn) => _tenants.filter(fn).length;
  const kpis = [
    { id: 'todas',     n: _tenants.length,                                         l: 'Inmobiliarias', c: 'var(--tx)' },
    { id: 'atencion',  n: cuenta(requiereAtencion),                                l: 'Requieren atención', c: '#ef4444' },
    { id: 'activa',    n: cuenta((t) => situacion(t) === 'activa'),                l: 'Al día',        c: '#10b981' },
    { id: 'prueba',    n: cuenta((t) => situacion(t) === 'prueba'),                l: 'En prueba',     c: '#3b82f6' },
    { id: 'porvencer', n: cuenta((t) => situacion(t) === 'porvencer'),             l: 'Por vencer',    c: '#f59e0b' },
    { id: 'pausada',   n: cuenta((t) => situacion(t) === 'pausada'),               l: 'Pausadas',      c: '#64748b' },
  ];

  // Los números son botones: el resumen y el filtro son lo mismo. Ver
  // "3 por vencer" y tener que buscarlas a mano sería trabajo de más.
  const kpisHtml = kpis.map((k) => {
    const on = _filtro === k.id;
    return `<button onclick="window._saFiltrar('${k.id}')"
      style="flex:1;min-width:104px;text-align:left;padding:12px 14px;border-radius:10px;cursor:pointer;font:inherit;
             border:1.5px solid ${on ? k.c : 'var(--brd)'};background:${on ? k.c + '14' : 'var(--cd)'}">
      <div style="font-size:24px;font-weight:800;letter-spacing:-.02em;color:${k.c};line-height:1.1">${k.n}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:3px;font-weight:600">${k.l}</div>
    </button>`;
  }).join('');

  const filas = lista.map((t) => {
    const s = situacion(t);
    const cfg = SITUACIONES[s];
    const esCasa = t.slug === 'house';
    return `<tr style="border-bottom:1px solid var(--brd);cursor:pointer" onclick="window._saDetalle('${esc(t.slug)}')">
      <td style="padding:11px 10px">
        <div style="font-weight:700;font-size:13.5px">${esc(t.nombre || t.slug)}${esCasa ? ' <span style="font-size:10px;font-weight:700;color:var(--sub)">· la casa</span>' : ''}</div>
        <div style="font-size:11px;color:var(--sub);font-family:monospace">${esc(t.slug)}${t.ciudad ? ' · ' + esc(t.ciudad) : ''}</div>
      </td>
      <td style="padding:11px 10px;white-space:nowrap">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${cfg.color}1f;color:${cfg.color};font-size:11px;font-weight:800">${cfg.etiqueta}</span>
      </td>
      <td style="padding:11px 10px;font-size:12px;white-space:nowrap">
        <div style="font-weight:600">${esc(t.plan_id || '—')}</div>
        <div style="font-size:11px;color:${requiereAtencion(t) ? cfg.color : 'var(--sub)'}">${esc(textoVencimiento(t))}</div>
      </td>
      <td style="padding:11px 10px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums">${t.n_usuarios || 0}</td>
      <td style="padding:11px 10px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums">${t.n_inmuebles || 0}</td>
      <td style="padding:11px 10px;text-align:right;white-space:nowrap">
        <span style="font-size:11px;color:var(--sub)">Ver ficha →</span>
      </td>
    </tr>`;
  }).join('');

  const vacio = !lista.length;
  const th = (txt, al = 'left') => `<th style="padding:9px 10px;text-align:${al};font-size:10.5px;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;font-weight:700">${txt}</th>`;

  el.innerHTML = `
    <div style="padding:18px;max-width:1200px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div>
          <h1 style="font-size:21px;font-weight:800;margin:0;letter-spacing:-.02em">Plataforma · Inmobiliarias</h1>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">Panel central de la plataforma, distinto del panel de cada inmobiliaria.</div>
        </div>
        <button onclick="window._superadminCreate()" style="padding:10px 16px;background:#10b981;color:#fff;border:none;border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">+ Nueva inmobiliaria</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${kpisHtml}</div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <input id="saBuscar" value="${esc(_busca)}" placeholder="Buscar por nombre, slug, ciudad o correo…"
               oninput="window._saBuscar(this.value)"
               style="flex:1;min-width:220px;height:38px;padding:0 12px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx);font:inherit;font-size:13px">
        <select onchange="window._saOrdenar(this.value)" style="height:38px;padding:0 10px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx);font:inherit;font-size:12.5px">
          ${Object.entries(ORDENES).map(([k, v]) => `<option value="${k}"${_orden === k ? ' selected' : ''}>${v}</option>`).join('')}
        </select>
        ${(_filtro !== 'todas' || _busca) ? `<button onclick="window._saLimpiar()" style="height:38px;padding:0 12px;border:1.5px solid var(--brd);background:var(--cd);color:var(--sub);border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Quitar filtros</button>` : ''}
      </div>

      ${vacio ? `
        <div style="padding:40px 20px;text-align:center;background:var(--cd);border:1px solid var(--brd);border-radius:10px">
          <div style="font-size:30px;margin-bottom:8px">${_tenants.length ? '🔍' : '🏢'}</div>
          <div style="font-size:15px;font-weight:700">${_tenants.length ? 'Ninguna coincide con la búsqueda' : 'Todavía no hay inmobiliarias'}</div>
          <div style="font-size:12.5px;color:var(--sub);margin-top:5px">${_tenants.length ? 'Prueba con otro texto o quita los filtros.' : 'Crea la primera con el botón de arriba.'}</div>
        </div>`
      : `
        <div style="background:var(--cd);border:1px solid var(--brd);border-radius:10px;overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;min-width:680px">
            <thead style="background:var(--cd2)"><tr>
              ${th('Inmobiliaria')}${th('Situación')}${th('Plan y cobro')}${th('Usuarios','center')}${th('Inmuebles','center')}${th('','right')}
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
        <div style="font-size:11.5px;color:var(--sub);margin-top:8px">${lista.length} de ${_tenants.length} · toca una fila para ver su ficha</div>`}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// Ficha de una inmobiliaria
// ══════════════════════════════════════════════════════════════════

window._saDetalle = function (slug) {
  const t = _tenants.find((x) => x.slug === slug);
  if (!t) return;
  const s = situacion(t);
  const cfg = SITUACIONES[s];
  const esCasa = t.slug === 'house';

  const dato = (l, v) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--brd)">
    <span style="font-size:12px;color:var(--sub)">${l}</span>
    <span style="font-size:12.5px;font-weight:600;text-align:right;word-break:break-word">${v}</span></div>`;

  const d = document.createElement('div');
  d.id = 'saDetalleDlg';
  d.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  d.onclick = (ev) => { if (ev.target === d) d.remove(); };
  d.innerHTML = `<div onclick="event.stopPropagation()" style="background:var(--cd);border-radius:16px;max-width:520px;width:100%;max-height:88vh;overflow:auto;padding:22px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div>
        <div style="font-size:19px;font-weight:800;letter-spacing:-.02em">${esc(t.nombre || t.slug)}</div>
        <div style="font-size:12px;color:var(--sub);font-family:monospace;margin-top:2px">${esc(t.slug)}</div>
      </div>
      <span style="flex-shrink:0;padding:4px 11px;border-radius:12px;background:${cfg.color}1f;color:${cfg.color};font-size:11px;font-weight:800">${cfg.etiqueta}</span>
    </div>

    <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:${cfg.color}0f;border:1px solid ${cfg.color}33">
      <div style="font-size:13px;font-weight:700;color:${cfg.color}">${esc(textoVencimiento(t))}</div>
      <div style="font-size:11.5px;color:var(--sub);margin-top:3px">
        ${t.acceso_permitido ? 'Sus usuarios pueden entrar con normalidad.' : 'Sus usuarios NO pueden entrar: ven la pantalla de suspensión.'}
      </div>
    </div>

    <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px">Suscripción</div>
    ${dato('Plan', esc(t.plan_id || '—'))}
    ${dato('Estado', esc(t.suscripcion_estado || 'sin suscripción'))}
    ${dato('Próximo cobro', fechaCorta(t.proximo_cobro))}
    ${t.grace_hasta ? dato('Gracia hasta', fechaCorta(t.grace_hasta)) : ''}

    <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px">Uso</div>
    ${dato('Usuarios', (t.n_usuarios || 0) + '')}
    ${dato('Inmuebles publicados', (t.n_inmuebles || 0) + '')}

    <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px">Contacto y acceso</div>
    ${dato('Correo del admin', esc(t.email_admin || '—'))}
    ${dato('Teléfono', esc(t.telefono || '—'))}
    ${dato('Ciudad', esc(t.ciudad || '—'))}
    ${dato('Dominio propio', t.dominio_custom ? esc(t.dominio_custom) : 'sin dominio propio')}
    ${dato('Alta', fechaCorta(t.created_at))}

    <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">
      <button onclick="document.getElementById('saDetalleDlg').remove()" style="flex:1;min-width:110px;padding:11px;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Cerrar</button>
      ${esCasa
        ? `<div style="flex:2;min-width:150px;display:grid;place-items:center;font-size:11.5px;color:var(--sub);text-align:center;line-height:1.4">La inmobiliaria de la casa<br>no se pausa desde aquí</div>`
        : (t.acceso_permitido
          ? `<button onclick="document.getElementById('saDetalleDlg').remove();window._superadminPause('${esc(t.slug)}')" style="flex:2;min-width:150px;padding:11px;border:none;background:#ef4444;color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Pausar el acceso</button>`
          : `<button onclick="document.getElementById('saDetalleDlg').remove();window._superadminReactivate('${esc(t.slug)}')" style="flex:2;min-width:150px;padding:11px;border:none;background:#10b981;color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Reactivar</button>`)}
    </div>
  </div>`;
  document.body.appendChild(d);
};

// ── Controles de la vista ─────────────────────────────────────────
window._saFiltrar = function (id) { _filtro = (_filtro === id ? 'todas' : id); pintar(); };
window._saOrdenar = function (v) { _orden = v; pintar(); };
window._saLimpiar = function () { _filtro = 'todas'; _busca = ''; pintar(); };
window._saBuscar = function (v) {
  _busca = v || '';
  // Se repinta solo la tabla al escribir para no perder el foco del
  // campo: repintar todo haría que el cursor saltara en cada letra.
  clearTimeout(window._saBuscaT);
  window._saBuscaT = setTimeout(() => {
    const foco = document.activeElement === document.getElementById('saBuscar');
    const pos = document.getElementById('saBuscar')?.selectionStart;
    pintar();
    if (foco) {
      const nuevo = document.getElementById('saBuscar');
      if (nuevo) { nuevo.focus(); try { nuevo.setSelectionRange(pos, pos); } catch (e) { /* noop */ } }
    }
  }, 120);
};

// ─── Handlers window (onclick inline) ─────────────────────────────────

window._superadminCreate = function () {
  const html = `
    <div id="admCreateDlg" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
      <div style="background:var(--cd);border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:24px" onclick="event.stopPropagation()">
        <h2 style="font-size:18px;font-weight:800;margin:0 0 16px">Crear tenant nuevo</h2>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="font-size:12px;font-weight:700">Nombre comercial<input id="adm_nombre" placeholder="Inmobiliaria Ejemplo" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          <label style="font-size:12px;font-weight:700">Slug (subdominio) <span style="color:var(--sub);font-weight:400">— lowercase, sin espacios</span><input id="adm_slug" placeholder="ejemplo" pattern="[a-z0-9-]+" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px;font-family:monospace"></label>
          <label style="font-size:12px;font-weight:700">Email admin<input id="adm_email" type="email" placeholder="admin@ejemplo.com" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          <div style="display:flex;gap:8px">
            <label style="font-size:12px;font-weight:700;flex:1">Teléfono (opc)<input id="adm_tel" placeholder="+57 300 000 0000" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
            <label style="font-size:12px;font-weight:700;flex:1">Ciudad (opc)<input id="adm_ciudad" placeholder="Pereira" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          </div>
          <div style="display:flex;gap:8px">
            <label style="font-size:12px;font-weight:700;flex:1">Plan<select id="adm_plan" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"><option value="basic">Basic ($89K)</option><option value="pro">Pro ($189K)</option><option value="business">Business ($349K)</option></select></label>
            <label style="font-size:12px;font-weight:700;flex:1">Días de trial<input id="adm_trial" type="number" value="15" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px">
          <button onclick="document.getElementById('admCreateDlg').remove()" style="flex:1;padding:10px;border:1.5px solid var(--brd);background:transparent;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Cancelar</button>
          <button onclick="window._superadminSubmitCreate()" style="flex:2;padding:10px;border:none;background:#10b981;color:#fff;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">✅ Crear tenant</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window._superadminSubmitCreate = async function () {
  const slug = document.getElementById('adm_slug')?.value?.trim().toLowerCase();
  const nombre = document.getElementById('adm_nombre')?.value?.trim();
  const email = document.getElementById('adm_email')?.value?.trim();
  const tel = document.getElementById('adm_tel')?.value?.trim() || null;
  const ciudad = document.getElementById('adm_ciudad')?.value?.trim() || null;
  const plan = document.getElementById('adm_plan')?.value || 'basic';
  const trialDays = parseInt(document.getElementById('adm_trial')?.value) || 15;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { window.toast?.('Slug inválido (solo lowercase, números, guiones)', 'twarn'); return; }
  if (!nombre || !email) { window.toast?.('Nombre y email obligatorios', 'twarn'); return; }

  try {
    const { data, error } = await SB().rpc('superadmin_create_tenant', {
      p_slug: slug, p_nombre: nombre, p_email_admin: email,
      p_telefono: tel, p_ciudad: ciudad,
      p_plan_id: plan, p_dias_trial: trialDays,
    });
    if (error) throw error;
    document.getElementById('admCreateDlg')?.remove();
    window.toast?.(`✅ Tenant "${slug}" creado en trial ${trialDays} días`);
    renderTenantsPanel(); // refresh
  } catch (e) {
    window.toast?.('Error: ' + e.message, 'terr');
  }
};

window._superadminPause = async function (slug) {
  const ok = await (window.cfShow?.('⚠️', `¿Pausar tenant "${slug}"?`, 'Sus usuarios perderán acceso hasta reactivar.'));
  if (!ok) return;
  const motivo = prompt('Motivo del pausado (opcional):') || null;
  try {
    const { error } = await SB().rpc('superadmin_pause_tenant', { p_slug: slug, p_motivo: motivo });
    if (error) throw error;
    window.toast?.(`⚠️ ${slug} pausado`);
    renderTenantsPanel();
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

window._superadminReactivate = async function (slug) {
  const dias = prompt('Días de extensión de la suscripción:', '30');
  if (!dias) return;
  try {
    const { error } = await SB().rpc('superadmin_reactivate_tenant', {
      p_slug: slug, p_plan_id: 'basic', p_dias_extension: parseInt(dias) || 30,
    });
    if (error) throw error;
    window.toast?.(`✅ ${slug} reactivado por ${dias} días`);
    renderTenantsPanel();
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

// Inyecta un botón en el header (junto a la campana) para superadmins.
// Idempotente + espera a que el shell exista.
async function injectSuperadminNavIfNeeded() {
  if (document.getElementById('superadminNavBtn')) return;
  const bellWrap = document.querySelector('.bell-wrap');
  if (!bellWrap) return; // shell aún no renderizado
  const isSuper = await esSuperadmin();
  if (!isSuper) return;

  const btn = document.createElement('button');
  btn.id = 'superadminNavBtn';
  btn.title = 'Panel de tenants (superadmin)';
  btn.style.cssText = 'background:none;border:none;padding:6px 10px;cursor:pointer;font-size:18px;position:relative;margin-right:4px';
  btn.innerHTML = '🛠️';
  btn.onclick = () => { location.hash = '#/superadmin-tenants'; };
  bellWrap.parentNode?.insertBefore(btn, bellWrap);
}

// Correr después de que la app + auth boot terminen. El listener escucha
// cambios de usuario (login/logout) porque el shell puede repintarse.
function scheduleInjection() {
  // Múltiples intentos progresivos hasta que el shell exista
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    injectSuperadminNavIfNeeded();
    if (attempts > 20 || document.getElementById('superadminNavBtn')) clearInterval(timer);
  }, 500);
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInjection);
  } else {
    scheduleInjection();
  }
}

// Expuesto en window para invocación programática
window.rSuperadminTenants = renderTenantsPanel;
window.goSuperadminTenants = () => { location.hash = '#/superadmin-tenants'; };

// Seam de verificación: permite pintar el panel con datos de prueba sin
// crear inmobiliarias reales ni tener sesión de superadmin. No lo usa el
// arranque normal — existe porque la alternativa para comprobar la
// pantalla era ensuciar la plataforma con inquilinos inventados.
window.__saPintarCon = function (lista) {
  _tenants = Array.isArray(lista) ? lista : [];
  _filtro = 'todas'; _busca = ''; _orden = 'atencion';
  pintar();
  return _tenants.length;
};

// Ya NO hay listener propio de la ruta.
//
// La ruta está registrada en el router (`superadmin-tenants` →
// `sec-superadmin` → `rSuperadminTenants`), que es quien muestra la
// sección y llama al render. Mantener además un listener de hashchange
// aquí provocaba dos renders y, con ellos, dos consultas al RPC por
// cada entrada al panel.
