/**
 * Módulo: domains/inmuebles/detail-modal-v2
 *
 * Ficha interna del inmueble (modal oM) rediseñada.
 * Fuente: mockup "House Ficha Interna" de Claude Design, agosto 2026.
 *
 * CAMBIO DE PARADIGMA vs v1:
 *   v1 → abre en edición, ~30 inputs sueltos en scroll infinito
 *   v2 → abre en LECTURA, 6 tabs, editar es una acción deliberada,
 *        guardado explícito con barra de cambios pendientes
 *
 * 6 TABS: Resumen · Fotos · Propietario · Notas · Interesados · Publicación
 *
 * 4 MODOS DE PERMISO:
 *   A · captador dueño     — edita todo, incl. dirección real y propietario
 *   B · admin u oficina    — todo lo de A + reasignar captador + papelera
 *   C · gestor arriendos   — edita, pero si el inmueble es de Venta el
 *                            bloque propietario queda bloqueado
 *   D · asesor sin permiso — pantalla propia de consulta (no una versión
 *                            recortada): sin inputs, sin dirección real,
 *                            sin propietario, sin portales
 *
 * CONTRATO CON saveAll():
 *   saveAll lee 21 inputs por ID (me_tipo, me_neg, me_dir, me_pv, …).
 *   Por eso TODOS los tabs se renderizan y los inactivos se ocultan con
 *   CSS — si desmontáramos el tab, saveAll no encontraría sus inputs.
 */

import { icon } from '../../ui/icons.js';

const U = () => window.userStore?.get();
const D = () => window.D || [];
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Estado del modal ─────────────────────────────────────────────────
const st = {
  p: null,
  idx: -1,
  tab: 'resumen',
  editando: false,
  cambios: new Set(),
  precioTocado: false,
  guardando: false,
  fotos: [],
  galIdx: 0,
};

// ══════════════════════════════════════════════════════════════════════
// Permisos
// ══════════════════════════════════════════════════════════════════════
function calcPermisos(p) {
  const u = U();
  const esMio = !!(u && p.captador_id === u.id);
  const esAdmin = !!(u && (u.rol === 'admin' || u.rol === 'oficina'));
  const esGestor = !!(u && u.es_gestor_arriendos);
  const esArriendo = (p.negociacion || '').toLowerCase().includes('arriendo');

  let modo = 'D';
  if (esAdmin) modo = 'B';
  else if (esMio) modo = 'A';
  else if (esGestor) modo = 'C';

  // El gestor de arriendos sólo ve al propietario si el inmueble se arrienda
  const verPropietario = modo === 'A' || modo === 'B' || (modo === 'C' && esArriendo);

  return {
    modo,
    puedeEditar: modo !== 'D',
    verDirReal: modo !== 'D',
    verPropietario,
    propietarioBloqueado: modo === 'C' && !esArriendo,
    puedeReasignar: modo === 'B',
    puedeEliminar: modo === 'B',
    verPublicacion: modo !== 'D',
  };
}

// ══════════════════════════════════════════════════════════════════════
// Helpers de UI
// ══════════════════════════════════════════════════════════════════════
const CARD = 'border:1px solid var(--v2-line);border-radius:12px;padding:14px;background:var(--v2-paper)';
const LABEL = 'font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--v2-ink-3)';
const INPUT = 'width:100%;box-sizing:border-box;height:40px;padding:0 11px;border:1.5px solid var(--v2-line-3);border-radius:9px;background:var(--v2-paper);font-family:inherit;font-size:13.5px;color:var(--v2-ink)';

/** Campo: lectura o input según el modo de edición */
function campo(label, id, valor, opts = {}) {
  const { tipo = 'text', ph = '', ancho = '', mono = false, lock = false } = opts;
  const v = valor ?? '';
  const cuerpo = st.editando && !lock
    ? `<input id="${id}" type="${tipo}" value="${esc(v)}" placeholder="${esc(ph)}" oninput="window._oM2Touch('${id}')" style="${INPUT};margin-top:5px">`
    : `<div style="font-size:14px;font-weight:600;margin-top:4px;color:${v ? 'var(--v2-ink)' : 'var(--v2-ink-4)'}${mono ? ';font-variant-numeric:tabular-nums' : ''}">${v ? esc(v) : '—'}</div>
       <input id="${id}" type="hidden" value="${esc(v)}">`;
  return `<div style="${ancho}"><div style="${LABEL}">${esc(label)}</div>${cuerpo}</div>`;
}

/** Textarea de descripción con su etiqueta de visibilidad */
function descripcion(label, id, valor, visibilidad, color) {
  const v = valor || '';
  return `<div style="${CARD}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
      <span style="${LABEL}">${esc(label)}</span>
      <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:${color}22;color:${color}">${esc(visibilidad)}</span>
    </div>
    ${st.editando
      ? `<textarea id="${id}" oninput="window._oM2Touch('${id}')" style="width:100%;box-sizing:border-box;min-height:72px;padding:10px;border:1.5px solid var(--v2-line-3);border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.6;resize:vertical;background:var(--v2-paper);color:var(--v2-ink)">${esc(v)}</textarea>`
      : `<div style="font-size:13.5px;line-height:1.65;color:${v ? 'var(--v2-ink-2)' : 'var(--v2-ink-4)'};white-space:pre-line">${v ? esc(v) : 'Sin contenido'}</div><textarea id="${id}" style="display:none">${esc(v)}</textarea>`}
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Tabs
// ══════════════════════════════════════════════════════════════════════
function tabsDef(perm) {
  const nFotos = st.fotos.length;
  return [
    { id: 'resumen', label: 'Resumen' },
    { id: 'fotos', label: 'Fotos', badge: nFotos ? String(nFotos) : '0' },
    { id: 'propietario', label: 'Propietario', oculto: !perm.verPropietario && perm.modo === 'D' },
    { id: 'notas', label: 'Notas', badgeId: 'oM2NotasBadge' },
    { id: 'interesados', label: 'Interesados', badgeId: 'oM2IntBadge' },
    { id: 'publicacion', label: 'Publicación', oculto: !perm.verPublicacion },
  ].filter((t) => !t.oculto);
}

function renderTabsBar(perm) {
  return tabsDef(perm).map((t) => {
    const on = st.tab === t.id;
    const badge = t.badge
      ? `<span style="min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:${on ? 'var(--v2-primary)' : 'var(--v2-line-3)'};color:${on ? '#fff' : 'var(--v2-ink-3)'};font-size:10.5px;font-weight:700;display:grid;place-items:center;font-variant-numeric:tabular-nums">${esc(t.badge)}</span>`
      : t.badgeId ? `<span id="${t.badgeId}"></span>` : '';
    return `<button type="button" onclick="window._oM2Tab('${t.id}')" style="height:44px;padding:0 14px;border:none;background:none;border-bottom:2px solid ${on ? 'var(--v2-primary)' : 'transparent'};color:${on ? 'var(--v2-ink)' : 'var(--v2-ink-3)'};font-family:inherit;font-size:13.5px;font-weight:${on ? 700 : 500};cursor:pointer;display:inline-flex;align-items:center;gap:7px">${esc(t.label)}${badge}</button>`;
  }).join('');
}

// ── Tab: Resumen ─────────────────────────────────────────────────────
function tabResumen(p, perm) {
  const f0 = st.fotos[0];
  const _cld = window.cldOpt || ((u) => u);
  const media = f0
    ? `<img src="${esc(_cld(f0.url_thumb || f0.url, 600))}" style="width:100%;height:100%;object-fit:cover" onerror="window.drFallback&&window.drFallback(this)">
       <span style="position:absolute;bottom:9px;right:9px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:3px 8px;border-radius:6px;font-variant-numeric:tabular-nums">1/${st.fotos.length}</span>`
    : `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:var(--v2-cream-2);border:1.5px dashed var(--v2-line-3);border-radius:12px">
        ${icon('camera', 30, { color: 'var(--v2-ink-4)' })}
        <span style="font-size:13px;font-weight:700;color:var(--v2-ink-3)">Sin fotos</span>
        ${perm.puedeEditar ? `<button onclick="window._oM2Tab('fotos')" style="height:34px;padding:0 14px;border-radius:9px;border:none;background:var(--v2-primary);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Subir fotos</button>` : ''}
      </div>`;

  const thumbs = st.fotos.slice(1, 4).map((f) => `<div style="width:56px;height:42px;border-radius:7px;overflow:hidden;background:var(--v2-cream-3)"><img src="${esc(_cld(f.url_thumb || f.url, 200))}" style="width:100%;height:100%;object-fit:cover"></div>`).join('');
  const resto = st.fotos.length > 4
    ? `<button onclick="window._oM2Tab('fotos')" style="width:56px;height:42px;border-radius:7px;background:var(--v2-cream-2);border:1px dashed var(--v2-line-3);color:var(--v2-ink-3);font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer">+${st.fotos.length - 4}</button>` : '';

  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div style="width:340px;flex-shrink:0">
        <div style="position:relative;aspect-ratio:16/10;border-radius:12px;overflow:hidden;background:var(--v2-cream-3);border:1px solid var(--v2-line)">${media}</div>
        ${st.fotos.length > 1 ? `<div style="display:flex;gap:6px;margin-top:6px">${thumbs}${resto}</div>` : ''}
      </div>
      <div style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:12px">
        <div style="${CARD}">
          <div style="${LABEL};margin-bottom:10px">Identificación</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${campo('Tipo', 'me_tipo', p.tipo)}
            ${campo('Negociación', 'me_neg', p.negociacion)}
            ${campo('Ciudad', 'me_ciu', p.ciudad)}
            ${campo('Estrato', 'me_est', p.estrato)}
          </div>
        </div>
        <div style="${CARD}">
          <div style="${LABEL};margin-bottom:10px">Ubicación</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${perm.verDirReal
              ? campo('Dirección real 🔒', 'me_dir', p.direccion, { ph: 'Calle 00 #00-00' })
              : `<div><div style="${LABEL}">Dirección real</div><div style="font-size:13px;color:var(--v2-ink-4);margin-top:4px;display:flex;align-items:center;gap:6px">${icon('alert', 14)}Solo el captador y admin</div></div>`}
            ${campo('Ubicación pública', 'me_dir_pub', p.direccion_publica, { ph: 'Barrio, zona' })}
          </div>
        </div>
      </div>
    </div>

    <div style="${CARD}">
      <div style="${LABEL};margin-bottom:10px">Características</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px">
        ${campo('Habitaciones', 'me_hab', p.habitaciones, { tipo: 'number', mono: true })}
        ${campo('Baños', 'me_ban', p.banos, { tipo: 'number', mono: true })}
        ${campo('Área construida', 'me_area', p.area_construida, { tipo: 'number', mono: true })}
        ${campo('Área total', 'me_areatot', p.area_total, { tipo: 'number', mono: true })}
        ${campo('Parqueaderos', 'me_parq', p.parqueaderos, { tipo: 'number', mono: true })}
      </div>
      <div style="margin-top:12px">${campo('Otras características', 'me_carac', p.caracteristicas, { ph: 'piscina, gimnasio, portería 24h…' })}</div>
    </div>

    ${descripcion('Descripción privada', 'me_desc_priv', p.descripcion_privada, '🔒 Solo vos y admin', '#d97706')}
    ${descripcion('Descripción para el cliente', 'me_desc_cli', p.descripcion_cliente, '👁️ Pública', '#059669')}
    ${descripcion('Notas para el equipo', 'me_obs', p.observaciones, '👥 Todos los asesores', '#1d4ed8')}
  </div>`;
}

// ── Tab: Fotos ───────────────────────────────────────────────────────
function tabFotos(p, perm) {
  const _cld = window.cldOpt || ((u) => u);
  if (!st.fotos.length) {
    return `<div style="text-align:center;padding:56px 20px;max-width:380px;margin:0 auto">
      <div style="width:64px;height:64px;border-radius:var(--v2-r-xl);background:var(--v2-cream-3);display:grid;place-items:center;margin:0 auto 18px;color:var(--v2-ink-4)">${icon('camera', 28)}</div>
      <h3 style="margin:0;font-size:17px;font-weight:700">Este inmueble no tiene fotos</h3>
      <p style="margin:8px 0 18px;font-size:13.5px;color:var(--v2-ink-3);line-height:1.55">Los inmuebles con fotos reciben 4 veces más consultas.</p>
      ${perm.puedeEditar ? `<div id="fotoUpModal"></div>` : ''}
    </div>`;
  }

  const grid = st.fotos.map((f, i) => `
    <div class="foto-prev-item foto-sortable" draggable="true" data-foto-id="${f.id}" data-foto-idx="${i}" data-inm-id="${p.id}" style="position:relative;aspect-ratio:4/3;border-radius:10px;overflow:hidden;border:1px solid var(--v2-line);background:var(--v2-cream-3);cursor:grab">
      <img src="${esc(_cld(f.url_thumb || f.url, 300))}" style="width:100%;height:100%;object-fit:cover;pointer-events:none">
      ${i === 0 ? `<span style="position:absolute;top:6px;left:6px;background:var(--v2-primary);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px">Portada</span>` : ''}
      <span style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">${i + 1}</span>
      ${perm.puedeEditar ? `<button onclick="event.stopPropagation();window.delFoto&&window.delFoto('${f.id}','${p.id}')" aria-label="Eliminar foto" style="position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:999px;background:rgba(255,255,255,.94);border:none;cursor:pointer;display:grid;place-items:center;color:var(--v2-red)">${icon('close', 14)}</button>` : ''}
    </div>`).join('');

  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
      <div>
        <div style="font-size:15px;font-weight:700">Fotos <span style="color:var(--v2-ink-3);font-weight:500">· ${st.fotos.length}</span></div>
        ${perm.puedeEditar ? `<div style="font-size:12px;color:var(--v2-ink-3);margin-top:2px">Arrastrá para reordenar. La primera es la portada.</div>` : ''}
      </div>
    </div>
    <div id="fotoSortWrap" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${grid}</div>
    ${perm.puedeEditar ? `<div style="margin-top:16px" id="fotoUpModal"></div>` : ''}
  </div>`;
}

// ── Tab: Propietario ─────────────────────────────────────────────────
function tabPropietario(p, perm) {
  if (perm.propietarioBloqueado) {
    return `<div style="max-width:440px;margin:40px auto;text-align:center">
      <div style="width:60px;height:60px;border-radius:var(--v2-r-xl);background:var(--v2-amber-soft);display:grid;place-items:center;margin:0 auto 18px;color:var(--v2-amber)">${icon('alert', 26)}</div>
      <h3 style="margin:0;font-size:17px;font-weight:700">Datos reservados</h3>
      <p style="margin:8px 0 18px;font-size:13.5px;color:var(--v2-ink-3);line-height:1.6">Este inmueble es de <b>venta</b>. Como gestor de arriendos no ves los datos del propietario. Escribile al captador si necesitás contactarlo.</p>
      <div style="${CARD};text-align:left">
        <div style="${LABEL}">Captador</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${esc(p.captador?.nombre || 'Sin asignar')}</div>
        ${p.captador?.telefono_contacto ? `<a href="https://wa.me/${esc(String(p.captador.telefono_contacto).replace(/\D/g, ''))}" target="_blank" rel="noopener" class="v2-btn" style="background:#25d366;color:#fff;border:none;margin-top:12px;width:100%;text-decoration:none">${icon('chat', 15)}Escribirle al captador</a>` : ''}
      </div>
    </div>`;
  }

  const tel = (p.propietario_telefono || '').replace(/\D/g, '');
  return `<div style="max-width:620px;display:flex;flex-direction:column;gap:14px">
    <div style="border:1px solid #c9ecdc;border-radius:12px;padding:14px;background:var(--v2-green-soft)">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#067a52;margin-bottom:10px">Datos del propietario 🔒</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${campo('Nombre', 'me_prop', p.propietario_nombre)}
        ${campo('Teléfono', 'me_tel', p.propietario_telefono, { tipo: 'tel', mono: true })}
      </div>
      <div style="margin-top:12px">${campo('Email', 'me_email', p.propietario_email, { tipo: 'email' })}</div>
      ${tel ? `<div style="display:flex;gap:7px;margin-top:14px">
        <a href="https://wa.me/57${esc(tel.replace(/^57/, ''))}" target="_blank" rel="noopener" class="v2-btn" style="flex:1;background:#25d366;color:#fff;border:none;text-decoration:none">${icon('chat', 15)}Chat</a>
        <a href="tel:+57${esc(tel.replace(/^57/, ''))}" class="v2-btn v2-btn-solid" style="flex:1;text-decoration:none">${icon('phone', 14)}Llamar</a>
        <button onclick="window._oM2Copiar('${esc(tel)}')" aria-label="Copiar teléfono" class="v2-btn v2-btn-ghost" style="width:42px;padding:0">${icon('check', 15)}</button>
      </div>` : ''}
    </div>

    ${perm.puedeReasignar ? `<div style="${CARD}">
      <div style="${LABEL};margin-bottom:8px">Reasignar captador</div>
      <div style="font-size:13px;color:var(--v2-ink-3);margin-bottom:10px">Actual: <b style="color:var(--v2-ink)">${esc(p.captador?.nombre || 'Sin asignar')}</b></div>
      <select id="me_captador" style="${INPUT}">
        <option value="">— Seleccionar asesor —</option>
        ${(window.USERS || []).filter((u) => u.id !== p.captador_id).map((u) => `<option value="${esc(u.id)}">${esc(u.nombre)} (${esc(u.rol)})</option>`).join('')}
      </select>
      <button onclick="window.reasignarCap&&window.reasignarCap('${p.id}')" class="v2-btn v2-btn-outline" style="width:100%;margin-top:10px">Reasignar</button>
    </div>` : ''}

    ${perm.puedeEliminar ? `<div style="border:1px solid #f7d4d4;border-radius:12px;padding:14px;background:var(--v2-red-soft)">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#991b1b;margin-bottom:6px">Zona de riesgo</div>
      <div style="font-size:13px;color:#a04a4a;line-height:1.5;margin-bottom:12px">El inmueble se mueve a la papelera. Se puede restaurar después.</div>
      <button onclick="window.eliminarInm&&window.eliminarInm('${p.id}')" class="v2-btn" style="width:100%;background:var(--v2-red);color:#fff;border:none">Enviar a papelera</button>
    </div>` : ''}
  </div>`;
}

// ── Tab: Notas ───────────────────────────────────────────────────────
function tabNotas(p, perm) {
  return `<div style="max-width:680px">
    ${perm.puedeEditar ? `<div style="${CARD};margin-bottom:16px">
      <div style="${LABEL};margin-bottom:9px">Agregar anotación</div>
      <textarea id="ant" placeholder="Qué pasó con este inmueble…" style="width:100%;box-sizing:border-box;min-height:70px;padding:10px;border:1.5px solid var(--v2-line-3);border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.6;resize:vertical;background:var(--v2-paper);color:var(--v2-ink)"></textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <select id="ant_vis" style="${INPUT};width:auto;flex:1">
          <option value="privada">🔒 Solo admin y yo</option>
          <option value="equipo">👥 Todo el equipo</option>
        </select>
        <button onclick="window.addA&&window.addA('${p.id}')" class="v2-btn v2-btn-solid" style="padding:0 20px">Agregar</button>
      </div>
    </div>` : ''}
    <div id="anl" style="display:flex;flex-direction:column;gap:10px"><div style="font-size:13px;color:var(--v2-ink-4)">Cargando anotaciones…</div></div>
  </div>`;
}

// ── Tab: Interesados ─────────────────────────────────────────────────
function tabInteresados(p, perm) {
  return `<div style="max-width:720px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
      <div style="font-size:15px;font-weight:700">Interesados en este inmueble</div>
      <button onclick="window.abrirCrearInteresado&&window.abrirCrearInteresado('${p.id}')" class="v2-btn v2-btn-solid" style="padding:0 16px">${icon('plus', 15)}Nuevo interesado</button>
    </div>
    <div id="oMInt-${p.id}" style="display:flex;flex-direction:column;gap:9px"><div style="font-size:13px;color:var(--v2-ink-4)">Cargando…</div></div>
  </div>`;
}

// ── Tab: Publicación ─────────────────────────────────────────────────
function tabPublicacion(p, perm) {
  const m2 = (p.url_metrocuadrado || '').trim();
  const fr = (p.url_fincaraiz || '').trim();
  const base = window.__tenantCfg?.baseUrl?.() || 'https://inmobiliariahouse.com.co';
  const link = base + '/ver/' + (p.codigo_house || p.id);

  const portal = (nombre, url, id) => `<div style="${CARD};display:flex;align-items:center;gap:12px">
    <span style="width:38px;height:38px;border-radius:9px;background:${url ? 'var(--v2-green-soft)' : 'var(--v2-cream-2)'};color:${url ? '#059669' : 'var(--v2-ink-4)'};display:grid;place-items:center;flex-shrink:0;font-size:12px;font-weight:800">${nombre === 'Metrocuadrado' ? 'M²' : 'FR'}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:700">${esc(nombre)}</div>
      <div style="font-size:12px;color:${url ? '#059669' : 'var(--v2-ink-4)'};margin-top:2px">${url ? 'Publicado' : 'Sin publicar'}</div>
    </div>
    ${st.editando
      ? `<input id="${id}" type="url" value="${esc(url)}" placeholder="https://…" oninput="window._oM2Touch('${id}')" style="${INPUT};flex:2;max-width:280px">`
      : `<input id="${id}" type="hidden" value="${esc(url)}">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="v2-btn v2-btn-ghost" style="padding:0 14px;text-decoration:none">Abrir${icon('chevronRight', 13)}</a>` : ''}`}
  </div>`;

  return `<div style="max-width:680px;display:flex;flex-direction:column;gap:14px">
    <div>
      <div style="${LABEL};margin-bottom:9px">Portales externos</div>
      <div style="display:flex;flex-direction:column;gap:9px">
        ${portal('Metrocuadrado', m2, 'me_m2')}
        ${portal('Fincaraíz', fr, 'me_fr')}
      </div>
    </div>
    <div style="${CARD}">
      <div style="${LABEL};margin-bottom:8px">Link público del inmueble</div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1;min-width:0;font-family:var(--v2-font-mono);font-size:12px;color:var(--v2-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--v2-cream-2);padding:10px;border-radius:8px">${esc(link)}</div>
        <button onclick="window._oM2Copiar('${esc(link)}')" class="v2-btn v2-btn-ghost" style="padding:0 14px;flex-shrink:0">Copiar</button>
      </div>
      <button onclick="window.shareInm&&window.shareInm('${p.id}')" class="v2-btn v2-btn-solid" style="width:100%;margin-top:10px">${icon('share', 15)}Compartir con cliente</button>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Rail crítico (columna derecha)
// ══════════════════════════════════════════════════════════════════════
function renderRail(p, perm) {
  const pv = p.precio_venta || 0;
  const pa = p.precio_arriendo || 0;
  const dias = p._dias ?? 0;
  const tocaVerificar = dias > 30;

  const precioLectura = `<div>
    ${pv > 0 ? `<div style="font-size:22px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums">${fm(pv)}</div>` : ''}
    ${pa > 0 ? `<div style="font-size:${pv > 0 ? '15' : '22'}px;font-weight:${pv > 0 ? 700 : 800};color:#059669;margin-top:${pv > 0 ? '4' : '0'}px;font-variant-numeric:tabular-nums">${fm(pa)}<span style="font-size:12px;color:var(--v2-ink-3);font-weight:500">/mes</span></div>` : ''}
    ${!pv && !pa ? `<div style="font-size:14px;color:var(--v2-ink-4)">Sin precio</div>` : ''}
    ${pv > 0 && p.area_construida ? `<div style="font-size:11.5px;color:var(--v2-ink-3);margin-top:4px">${fm(Math.round(pv / p.area_construida))} por m²</div>` : ''}
    <input id="me_pv" type="hidden" value="${pv || ''}">
    <input id="me_pa" type="hidden" value="${pa || ''}">
  </div>`;

  const precioEdicion = `<div>
    <input id="me_pv" type="number" value="${pv || ''}" placeholder="Sin venta" oninput="window._oM2Touch('me_pv',true)" style="width:100%;box-sizing:border-box;height:44px;padding:0 11px;margin-top:6px;border:1.5px solid var(--v2-primary);border-radius:10px;background:var(--v2-paper);font-family:inherit;font-size:18px;font-weight:800;color:var(--v2-primary);font-variant-numeric:tabular-nums">
    <div style="margin-top:9px;border-top:1px solid var(--v2-line-2);padding-top:9px">
      <div style="${LABEL}">Arriendo / mes</div>
      <input id="me_pa" type="number" value="${pa || ''}" placeholder="Sin arriendo" oninput="window._oM2Touch('me_pa',true)" style="width:100%;box-sizing:border-box;height:40px;padding:0 11px;margin-top:6px;border:1.5px solid #b6e3cf;border-radius:10px;background:var(--v2-paper);font-family:inherit;font-size:15px;font-weight:700;color:#04553a;font-variant-numeric:tabular-nums">
    </div>
    <div id="oM2PrecioAviso" style="display:${st.precioTocado ? 'flex' : 'none'};margin-top:11px;border:1px solid #f2e0bd;background:var(--v2-amber-soft);border-radius:10px;padding:10px;gap:9px">
      ${icon('alert', 16, { color: 'var(--v2-amber)' })}
      <div style="font-size:11.5px;line-height:1.5;color:#5c3505"><b>Al guardar se notifica.</b> Queda en el historial y se avisa al equipo y a los clientes que lo tienen en favoritos.</div>
    </div>
  </div>`;

  return `
    <div class="oM2-precio" style="${CARD}">
      <div style="${LABEL};margin-bottom:6px">Precio</div>
      ${st.editando ? precioEdicion : precioLectura}
    </div>

    <div style="${CARD}">
      <div style="${LABEL};margin-bottom:9px">Estado</div>
      ${perm.puedeEditar ? `
        <select onchange="window.chgE&&window.chgE('${p.id}',this.value)" style="${INPUT}">
          ${['Disponible', 'Aún Disponible', 'Verificar Disponibilidad', 'Arrendado', 'Vendido', 'Retirado'].map((e) => `<option ${e === p.estado ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
        <button onclick="window.confD&&window.confD('${p.id}')" class="v2-btn v2-btn-ghost" style="width:100%;margin-top:9px;height:38px">${icon('check', 14, { color: 'var(--v2-green)' })}Confirmar disponibilidad</button>
        <div style="font-size:11px;color:var(--v2-ink-3);margin-top:8px;line-height:1.5">Confirmado hace ${dias} días.${tocaVerificar ? ` <b style="color:var(--v2-amber)">Toca verificar.</b>` : ''}</div>
        <div style="margin-top:9px;border-top:1px solid var(--v2-line-2);padding-top:9px;font-size:11px;color:var(--v2-ink-3);line-height:1.5">Arrendado y Vendido abren el registro de cierre con reparto de comisiones.</div>
      ` : `
        <span style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 12px;border-radius:999px;background:var(--v2-green-soft);color:#067a52;font-size:13px;font-weight:700"><span style="width:7px;height:7px;border-radius:999px;background:var(--v2-green)"></span>${esc(p.estado || '—')}</span>
        <div style="font-size:11px;color:var(--v2-ink-3);margin-top:9px;line-height:1.5">Confirmado hace ${dias} días. Solo el captador y admin pueden cambiarlo.</div>
      `}
    </div>

    ${perm.verPropietario && p.propietario_telefono ? `<div style="border:1px solid #c9ecdc;border-radius:12px;padding:13px 14px;background:var(--v2-green-soft)">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#067a52">Propietario 🔒</div>
      <div style="font-size:14.5px;font-weight:700;margin-top:5px;color:#04553a">${esc(p.propietario_nombre || '—')}</div>
      <div style="font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;color:#04553a;margin-top:2px">${esc(p.propietario_telefono)}</div>
      <div style="display:flex;gap:7px;margin-top:10px">
        <a href="https://wa.me/57${esc(String(p.propietario_telefono).replace(/\D/g, '').replace(/^57/, ''))}" target="_blank" rel="noopener" class="v2-btn" style="flex:1;height:38px;background:#25d366;color:#fff;border:none;text-decoration:none;font-size:12.5px">${icon('chat', 14)}Chat</a>
        <a href="tel:+57${esc(String(p.propietario_telefono).replace(/\D/g, '').replace(/^57/, ''))}" class="v2-btn v2-btn-solid" style="flex:1;height:38px;text-decoration:none;font-size:12.5px">${icon('phone', 13)}Llamar</a>
      </div>
    </div>` : ''}

    <div style="${CARD}">
      <div style="${LABEL};margin-bottom:9px">Acciones</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        <button onclick="window.shareInm&&window.shareInm('${p.id}')" class="v2-btn v2-btn-ghost" style="width:100%;height:40px;justify-content:flex-start;padding:0 12px">${icon('share', 16, { color: 'var(--v2-ink-3)' })}Compartir con cliente</button>
        <button onclick="window._oM2Tab('notas')" class="v2-btn v2-btn-ghost" style="width:100%;height:40px;justify-content:flex-start;padding:0 12px">${icon('chat', 16, { color: 'var(--v2-ink-3)' })}Nota rápida</button>
        <button onclick="window._oM2Tab('interesados')" class="v2-btn v2-btn-ghost" style="width:100%;height:40px;justify-content:flex-start;padding:0 12px">${icon('user', 16, { color: 'var(--v2-ink-3)' })}Registrar interesado</button>
      </div>
    </div>

    <div style="margin-top:auto;font-size:11px;color:var(--v2-ink-4);line-height:1.55;padding-top:8px">
      <div>Captador · <b style="color:var(--v2-ink-3)">${esc(p.captador?.nombre || 'Sin asignar')}</b></div>
      ${p.codigo_house ? `<div style="margin-top:2px;font-family:var(--v2-font-mono)">${esc(p.codigo_house)}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Render principal
// ══════════════════════════════════════════════════════════════════════
export function oMv2(idx) {
  const p = D()[idx];
  if (!p) return;

  st.p = p;
  st.idx = idx;
  st.tab = 'resumen';
  st.editando = false;
  st.cambios = new Set();
  st.precioTocado = false;
  st.guardando = false;
  st.fotos = p.fotos ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];

  // El modal v1 deja este flag encendido entre aperturas; si no lo
  // limpiamos, la ficha abre creyendo que ya hay cambios pendientes.
  window._modalDirty = false;
  window._pendingFotos = [];

  const perm = calcPermisos(p);
  st.perm = perm;

  const mdl = document.getElementById('mdl');
  const mbd = document.getElementById('mbd');
  if (!mdl || !mbd) return;

  // El título del shell v1 no se usa en v2: el header propio lo reemplaza
  const mtt = document.getElementById('mtt');
  if (mtt) mtt.textContent = '';
  const msb3 = document.getElementById('msb3');
  if (msb3) msb3.textContent = '';

  pintar();

  mdl.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Cargas async (anotaciones e interesados)
  recargarAsync();

  // Upload de fotos (el contenedor existe según el tab activo)
  if (perm.puedeEditar) {
    window._pendingFotos = [];
    setTimeout(() => montarUpload(), 120);
  }
}

function pintar() {
  const p = st.p;
  const perm = st.perm;
  const mbd = document.getElementById('mbd');
  if (!mbd || !p) return;

  const estadoColor = ['Arrendado', 'Vendido', 'Retirado'].includes(p.estado)
    ? { bg: 'var(--v2-cream-2)', fg: 'var(--v2-ink-3)', dot: 'var(--v2-ink-4)' }
    : p.estado === 'Verificar Disponibilidad'
      ? { bg: 'var(--v2-amber-soft)', fg: '#8a5200', dot: 'var(--v2-amber)' }
      : { bg: 'var(--v2-green-soft)', fg: '#067a52', dot: 'var(--v2-green)' };

  const dirCabecera = perm.verDirReal
    ? (p.direccion || p.direccion_publica || p.barrio || '')
    : (p.direccion_publica || p.barrio || '');

  // Todos los tabs se renderizan; se oculta el inactivo (contrato saveAll)
  const panel = (id, html) => `<div data-panel="${id}" style="display:${st.tab === id ? 'block' : 'none'}">${html}</div>`;

  mbd.innerHTML = `<div class="oM2" style="display:flex;flex-direction:column;flex:1;min-height:0;background:var(--v2-cream);position:relative">

    <div class="oM2-head" style="flex-shrink:0;padding:14px 20px;border-bottom:1px solid var(--v2-line);background:var(--v2-paper);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div class="oM2-id" style="min-width:0;flex:1">
        <div class="oM2-id-top" style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
          ${p.codigo_house ? `<span style="font-family:var(--v2-font-mono);font-size:12px;font-weight:500;color:var(--v2-primary);background:var(--v2-primary-soft);padding:3px 8px;border-radius:6px">${esc(p.codigo_house)}</span>` : ''}
          <h2 style="margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em">${esc(p.tipo || 'Inmueble')}</h2>
          <span style="display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:${estadoColor.bg};color:${estadoColor.fg};font-size:12px;font-weight:700"><span style="width:6px;height:6px;border-radius:999px;background:${estadoColor.dot}"></span>${esc(p.estado || '—')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:13px;color:var(--v2-ink-3)">
          ${icon('pin', 13, { color: 'var(--v2-ink-4)' })}${esc([p.ciudad, dirCabecera].filter(Boolean).join(' · '))}
          ${perm.verDirReal && p.direccion ? `<span style="font-size:11px;font-weight:700;color:var(--v2-amber);background:var(--v2-amber-soft);padding:2px 7px;border-radius:5px">🔒 real</span>` : ''}
        </div>
      </div>
      <div class="oM2-head-acc" style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span id="oM2Estado" style="font-size:11.5px;color:var(--v2-ink-4)"></span>
        ${perm.puedeEditar ? `<button onclick="window._oM2Editar()" style="height:38px;padding:0 16px;border-radius:10px;border:1.5px solid ${st.editando ? 'var(--v2-primary)' : 'var(--v2-line-3)'};background:${st.editando ? 'var(--v2-primary-soft)' : 'var(--v2-paper)'};color:${st.editando ? 'var(--v2-primary)' : 'var(--v2-ink)'};font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px">${st.editando ? icon('check', 15) + 'Editando' : icon('area', 15) + 'Editar'}</button>` : ''}
        <button onclick="window.cm&&window.cm()" aria-label="Cerrar" style="width:38px;height:38px;border-radius:10px;border:1px solid var(--v2-line);background:var(--v2-paper);cursor:pointer;display:grid;place-items:center;color:var(--v2-ink-3)">${icon('close', 17)}</button>
      </div>
    </div>

    <div id="oM2Tabs" style="flex-shrink:0;padding:0 20px;border-bottom:1px solid var(--v2-line);background:var(--v2-paper);display:flex;gap:2px;overflow-x:auto">${renderTabsBar(perm)}</div>

    <div class="oM2-body" style="flex:1;display:flex;min-height:0;overflow:hidden">
      <div class="oM2-cont" style="flex:1;min-width:0;overflow-y:auto;padding:20px 20px 80px">
        ${panel('resumen', tabResumen(p, perm))}
        ${panel('fotos', tabFotos(p, perm))}
        ${perm.verPropietario || perm.propietarioBloqueado ? panel('propietario', tabPropietario(p, perm)) : ''}
        ${panel('notas', tabNotas(p, perm))}
        ${panel('interesados', tabInteresados(p, perm))}
        ${perm.verPublicacion ? panel('publicacion', tabPublicacion(p, perm)) : ''}
      </div>
      <div class="oM2-rail" style="width:290px;flex-shrink:0;border-left:1px solid var(--v2-line);background:var(--v2-cream-2);padding:18px 16px 80px;overflow-y:auto;display:flex;flex-direction:column;gap:12px">
        ${renderRail(p, perm)}
      </div>
    </div>

    <div id="oM2Barra" style="display:none;position:absolute;left:0;right:0;bottom:0;z-index:30;background:var(--v2-ink);color:var(--v2-cream);padding:12px 20px;align-items:center;gap:14px;box-shadow:0 -8px 24px rgba(44,37,32,.18)"></div>
  </div>`;

  actualizarBarra();
}

// ══════════════════════════════════════════════════════════════════════
// Interacción
// ══════════════════════════════════════════════════════════════════════
window._oM2Tab = function (id) {
  st.tab = id;
  document.querySelectorAll('.oM2 [data-panel]').forEach((el) => {
    el.style.display = el.getAttribute('data-panel') === id ? 'block' : 'none';
  });
  // Repintar sólo la barra de tabs (para el subrayado y pesos)
  const bar = document.getElementById('oM2Tabs');
  if (bar && st.perm) bar.innerHTML = renderTabsBar(st.perm);
  if (id === 'fotos') setTimeout(montarUpload, 60);
};

window._oM2Editar = function () {
  st.editando = !st.editando;
  pintar();
  // pintar() re-renderiza todos los tabs, así que los contenedores de
  // anotaciones e interesados quedan vacíos: hay que repoblarlos.
  recargarAsync();
  setTimeout(montarUpload, 80);
};

/** Repuebla lo que se carga por fetch y se pierde en cada pintar() */
function recargarAsync() {
  if (!st.p) return;
  if (window.ldAn) window.ldAn(st.p.id);
  cargarInteresados(st.p);
}

window._oM2Touch = function (id, esPrecio) {
  st.cambios.add(id);
  window._modalDirty = true;
  if (esPrecio && !st.precioTocado) {
    st.precioTocado = true;
    const aviso = document.getElementById('oM2PrecioAviso');
    if (aviso) aviso.style.display = 'flex';
  }
  actualizarBarra();
};

window._oM2Copiar = function (txt) {
  navigator.clipboard?.writeText(txt).then(
    () => window.toast?.('📋 Copiado'),
    () => window.toast?.('No se pudo copiar', 'twarn')
  );
};

window._oM2Descartar = function () {
  st.cambios.clear();
  st.precioTocado = false;
  window._modalDirty = false;
  window._pendingFotos = [];
  st.editando = false;
  pintar();
  recargarAsync();
};

window._oM2Guardar = async function () {
  if (st.guardando || !st.p) return;
  st.guardando = true;
  actualizarBarra();
  try {
    await window.saveAll(st.p.id);
    st.cambios.clear();
    st.precioTocado = false;
    window._modalDirty = false;
    mostrarResultado('ok');
  } catch (e) {
    console.error('[oM2 guardar]', e);
    mostrarResultado('error', e.message);
  } finally {
    st.guardando = false;
  }
};

function actualizarBarra() {
  const barra = document.getElementById('oM2Barra');
  if (!barra) return;
  const n = st.cambios.size;
  if (!n) { barra.style.display = 'none'; return; }

  barra.style.display = 'flex';
  barra.innerHTML = `
    <span style="width:9px;height:9px;border-radius:999px;background:var(--v2-amber);flex-shrink:0"></span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13.5px;font-weight:700">${n} ${n === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}</div>
      <div style="font-size:11.5px;color:rgba(250,246,241,.6);margin-top:2px">${st.precioTocado ? 'El cambio de precio se notifica al equipo' : 'Los cambios se aplican al guardar'}</div>
    </div>
    <button onclick="window._oM2Descartar()" style="height:38px;padding:0 15px;border-radius:10px;border:1px solid rgba(250,246,241,.22);background:transparent;color:rgba(250,246,241,.8);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0">Descartar</button>
    <button onclick="window._oM2Guardar()" ${st.guardando ? 'disabled' : ''} style="height:38px;padding:0 20px;border-radius:10px;border:none;background:${st.guardando ? 'var(--v2-ink-4)' : 'var(--v2-primary)'};color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:${st.guardando ? 'wait' : 'pointer'};flex-shrink:0">${st.guardando ? 'Guardando…' : 'Guardar cambios'}</button>`;
}

function mostrarResultado(tipo, msg) {
  const barra = document.getElementById('oM2Barra');
  if (!barra) return;
  barra.style.display = 'flex';

  if (tipo === 'ok') {
    barra.style.background = 'var(--v2-green-soft)';
    barra.style.color = '#04553a';
    barra.innerHTML = `<span style="width:24px;height:24px;border-radius:999px;background:var(--v2-green);display:grid;place-items:center;flex-shrink:0;color:#fff">${icon('check', 14, { strokeWidth: 3 })}</span>
      <div style="flex:1;font-size:13.5px;font-weight:700">Guardado${st.precioTocado ? '. Se notificó al equipo del cambio de precio.' : '.'}</div>`;
    setTimeout(() => {
      barra.style.display = 'none';
      barra.style.background = 'var(--v2-ink)';
      barra.style.color = 'var(--v2-cream)';
    }, 3200);
  } else {
    barra.style.background = 'var(--v2-red-soft)';
    barra.style.color = '#991b1b';
    barra.innerHTML = `<span style="width:24px;height:24px;border-radius:999px;background:var(--v2-red);display:grid;place-items:center;flex-shrink:0;color:#fff;font-weight:700">!</span>
      <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:700">No se pudo guardar</div><div style="font-size:11.5px;color:#a04a4a;margin-top:2px">${esc(msg || 'Revisá la conexión')}. Tus cambios siguen acá.</div></div>
      <button onclick="window._oM2Guardar()" style="height:36px;padding:0 15px;border-radius:9px;border:none;background:var(--v2-red);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">Reintentar</button>`;
  }
}

// ── Cargas async ─────────────────────────────────────────────────────
function montarUpload() {
  if (!st.perm?.puedeEditar) return;
  const cont = document.getElementById('fotoUpModal');
  if (!cont || cont.dataset.montado === '1') return;
  if (typeof window.initFotoUpload === 'function') {
    window.initFotoUpload('fotoUpModal', (r) => {
      window._pendingFotos = window._pendingFotos || [];
      window._pendingFotos.push(r);
      window._oM2Touch('fotos');
    }, st.fotos.length);
    cont.dataset.montado = '1';
  }
}

async function cargarInteresados(p) {
  const el = document.getElementById('oMInt-' + p.id);
  if (!el || !window.listarInteresados) return;
  try {
    const leads = await window.listarInteresados({ inmueble_id: p.id });
    const badge = document.getElementById('oM2IntBadge');
    if (badge && leads.length) {
      badge.outerHTML = `<span id="oM2IntBadge" style="min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--v2-line-3);color:var(--v2-ink-3);font-size:10.5px;font-weight:700;display:grid;place-items:center">${leads.length}</span>`;
    }
    if (!leads.length) {
      el.innerHTML = `<div style="text-align:center;padding:36px 20px;color:var(--v2-ink-3)">
        <div style="width:52px;height:52px;border-radius:var(--v2-r-lg);background:var(--v2-cream-3);display:grid;place-items:center;margin:0 auto 14px;color:var(--v2-ink-4)">${icon('user', 24)}</div>
        <div style="font-size:14px;font-weight:600">Sin interesados aún</div>
      </div>`;
      return;
    }
    const TIP = window.TIPIFICACIONES || {};
    el.innerHTML = leads.map((l) => {
      const t = TIP[l.tipificacion] || {};
      return `<div onclick="window.abrirDetalleInteresado&&window.abrirDetalleInteresado('${l.id}')" style="${CARD};display:flex;align-items:center;gap:12px;cursor:pointer">
        <span style="width:36px;height:36px;border-radius:999px;background:var(--v2-primary);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;flex-shrink:0">${esc((l.nombre_completo || '?').trim()[0].toUpperCase())}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700">${esc((l.nombre_completo || 'Sin nombre').slice(0, 44))}</div>
          <div style="font-size:12px;color:var(--v2-ink-3);margin-top:2px">${esc(l.telefono || '—')}${l.asignado?.nombre ? ' · ' + esc(l.asignado.nombre) : ''}</div>
        </div>
        <span style="font-size:10px;font-weight:700;background:${t.color || 'var(--v2-line-3)'}22;color:${t.color || 'var(--v2-ink-3)'};padding:4px 9px;border-radius:6px;white-space:nowrap;flex-shrink:0">${esc(t.label || l.tipificacion || '')}</span>
      </div>`;
    }).join('');
  } catch (e) { console.warn('[oM2 interesados]', e); }
}

if (typeof window !== 'undefined') {
  window.oMv2 = oMv2;
}
