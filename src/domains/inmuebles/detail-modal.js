/**
 * Módulo: domains/inmuebles/detail-modal
 *
 * Incluye TODO lo relacionado al modal de detalle de inmueble (oM) + la
 * galería de fotos que lo alimenta (los tres estados de state — cards,
 * modal gallery, drag-fallback — comparten estas closure vars).
 *
 * Secciones consolidadas:
 *   3. GALLERY & CAROUSEL
 *      - drFallback, galNav/galGo (modal), cardNav (tarjetas)
 *      - Card + modal swipe handlers touch
 *   4. MODAL DETALLE (oM) — "THE BIG ONE"
 *      - oM(idx): renderiza el modal según permisos (editable/read-only)
 *      - cm/cmForce: cerrar con confirm de cambios sin guardar
 *      - _modalDirty tracker + swipe/Escape to close
 *
 * Dependencies clave (viven en window.*):
 *   D, userStore (via U()), fm, escapeHtml, trackEvent, initFotoUpload,
 *   USERS, TIPIFICACIONES, PCOLS, listarInteresados
 *   chgE, confD, shareInm, addA, saveAll, delFoto, reasignarCap,
 *   eliminarInm, ldAn, closeModal, go,
 *   abrirCrearInteresado, abrirDetalleInteresado
 */

// ─── Shortcuts locales ───────────────────────────────────────────────
const U = () => window.userStore?.get();
const D = () => window.D || [];
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));

// ══════════════════════════════════════════════════════════════════════
// GALLERY & CAROUSEL (state compartido entre oM y navegación)
// ══════════════════════════════════════════════════════════════════════

let _galFotos = [];
let _galIdx = 0;

// Expuestos para que oM pueda mutarlos al abrir el modal
// (mantiene el patrón original: mismo scope compartido)
function setGalFotos(fotos) { _galFotos = fotos; _galIdx = 0; }

window.drFallback = function (img) {
  if (img._tried) return;
  img._tried = true;
  if (img.src.includes('lh3.google')) {
    img.src = img.src.replace('lh3.googleusercontent.com/d/', 'drive.google.com/thumbnail?id=').split('=s')[0] + '&sz=w800';
  } else {
    img.style.opacity = '.3';
  }
};

window.galNav = function (dir) {
  if (!_galFotos.length) return;
  _galIdx = (_galIdx + dir + _galFotos.length) % _galFotos.length;
  window.galGo(_galIdx);
};

window.galGo = function (i) {
  if (!_galFotos.length) return;
  _galIdx = i;
  const img = document.getElementById('gal-img');
  if (img) {
    img._tried = false;
    img.onerror = function () { window.drFallback(this); };
    img.src = _galFotos[i];
  }
  const ct = document.getElementById('gal-ct');
  if (ct) ct.textContent = (i + 1) + '/' + _galFotos.length;
  const th = document.getElementById('gal-th');
  if (th) {
    th.querySelectorAll('img').forEach((t, j) => { t.className = j === i ? 'act' : ''; });
    th.children[i] && th.children[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

window.cardNav = function (cid, dir) {
  const car = document.getElementById(cid);
  if (!car) return;
  const fts = JSON.parse(car.dataset.fotos || '[]');
  if (fts.length < 2) return;
  let idx = parseInt(car.dataset.idx || '0');
  idx = (idx + dir + fts.length) % fts.length;
  car.dataset.idx = idx;
  const img = car.querySelector('img');
  if (img) {
    img._tried = false;
    img.onerror = function () { window.drFallback(this); };
    img.src = fts[idx];
  }
  const dots = car.querySelectorAll('.car-dot');
  dots.forEach((d, j) => { d.className = 'car-dot' + (j === idx ? ' act' : ''); });
};

// Card swipe (touch en las tarjetas del inventario)
(function () {
  let sx = 0, sy = 0, cid = '', swiping = false;
  document.addEventListener('touchstart', (e) => {
    const car = e.target.closest('.pc-car');
    if (!car) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    cid = car.id;
    swiping = true;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    if (!swiping || !cid) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) window.cardNav(cid, dx < 0 ? 1 : -1);
    cid = '';
  }, { passive: true });
})();

// Modal gallery swipe (touch dentro del modal .gal)
(function () {
  let sx2 = 0, swiping2 = false;
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.gal')) return;
    sx2 = e.touches[0].clientX;
    swiping2 = true;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!swiping2) return;
    swiping2 = false;
    const dx = e.changedTouches[0].clientX - sx2;
    if (Math.abs(dx) > 40) window.galNav(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

// ══════════════════════════════════════════════════════════════════════
// MODAL DETALLE (oM) — THE BIG ONE
// ══════════════════════════════════════════════════════════════════════

let _modalDirty = false;
// Compartida con saveAll() (functions.js) a través de window: si cada lado
// tiene su copia, las fotos se acumulan aquí y al guardar se lee un array
// vacío. Ver la nota extendida en functions.js.
window._pendingFotos = window._pendingFotos || [];
let _cmBusy = false;
Object.defineProperty(window, '_cmBusy', { get() { return _cmBusy; }, set(v) { _cmBusy = v; } });
window._modalDirtyReset = function () { _modalDirty = false; _cmBusy = false; };

/**
 * Abre la ficha del inmueble.
 *
 * @param {string|number} ref  id del inmueble (preferido) o índice en D.
 *
 * Acepta índice sólo por compatibilidad con las llamadas antiguas, y es
 * justo lo que provocó el fallo del 2026-09-04: window.D se recarga cada
 * vez que se registra un inmueble o cambia un estado, y un inmueble nuevo
 * entra POR DELANTE, corriendo todas las posiciones. El asesor abría
 * HOUSE-257, y para cuando tocaba, D[idx] ya era HOUSE-258: nueve fotos
 * acabaron en el inmueble equivocado.
 *
 * Con el id no hay ventana de desincronización posible.
 */
window.oM = function (ref) {
  const lista = D();
  const p = typeof ref === 'string'
    ? lista.find((x) => x.id === ref)
    : lista[ref];
  if (!p) {
    if (window.toast) window.toast('No se encontró el inmueble; recargá la lista', 'terr');
    return;
  }
  const u = U();
  const esMio = u && p.captador_id === u.id;
  const esP = u && (u.rol === 'admin' || u.rol === 'oficina');
  const esGestor = u && u.es_gestor_arriendos;
  const canEdit = esMio || esP || esGestor;
  _modalDirty = false;

  // TRACK view_card (solo públicos alimentan sugerencias)
  if (window.trackEvent && u && u.tipo_usuario === 'publico') {
    window.trackEvent('view_card', {
      inmueble_id: p.id, ciudad: p.ciudad, barrio: p.barrio,
      tipo_inmueble: p.tipo, negociacion: p.negociacion,
      precio: p.precio_venta || p.precio_arriendo, habitaciones: p.habitaciones,
    });
    // dwell_card: si el modal sigue abierto después de 5s
    window._dwellStart = Date.now();
    window._dwellInm = p.id;
    clearTimeout(window._dwellTimer);
    window._dwellTimer = setTimeout(() => {
      if (window._dwellInm === p.id && document.getElementById('moda')?.classList.contains('show')) {
        window.trackEvent('dwell_card', {
          inmueble_id: p.id, ciudad: p.ciudad, barrio: p.barrio,
          tipo_inmueble: p.tipo, negociacion: p.negociacion,
          precio: p.precio_venta || p.precio_arriendo, habitaciones: p.habitaciones,
          dwell_ms: 5000,
        });
      }
    }, 5000);
  }

  const canSeeRealDir = esMio || esP || esGestor;

  document.getElementById('mtt').textContent = (p.codigo_house ? p.codigo_house + ' · ' : '') + (p.tipo || 'Inmueble');
  document.getElementById('msb3').textContent = (p.ciudad ? '📍 ' + p.ciudad : '') + (canSeeRealDir && p.direccion ? ' · ' + p.direccion : p.direccion_publica ? ' · ' + p.direccion_publica : '');

  const inp = (id, val, ph, type) => `<input id="${id}" type="${type || 'text'}" autocomplete="off" value="${(val || '').toString().replace(/"/g, '&quot;')}" placeholder="${ph || ''}" style="width:100%;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:11px;font-family:inherit;color:var(--tx);background:var(--cd)">`;
  const sel = (id, opts, cur) => `<select id="${id}" class="esel" style="width:100%;font-size:11px">${opts.map((o) => `<option ${o === (cur || '') ? 'selected' : ''}>${o}</option>`).join('')}</select>`;

  let b = '';

  // GALLERY
  const fotos = p.fotos ? p.fotos.sort((a, b2) => a.orden - b2.orden) : [];
  if (fotos.length > 0) {
    b += `<div class="gal" id="gal"><img class="gal-main" id="gal-img" src="${fotos[0].url}" onclick="window.open(this.src,'_blank')" onerror="drFallback(this)">`;
    if (fotos.length > 1) b += `<button class="gal-nav prev" onclick="event.stopPropagation();galNav(-1)">‹</button><button class="gal-nav next" onclick="event.stopPropagation();galNav(1)">›</button>`;
    b += `<span class="gal-count" id="gal-ct">1/${fotos.length}</span></div>`;
    if (fotos.length > 1) {
      b += `<div class="gal-thumbs" id="gal-th">`;
      fotos.forEach((f, i) => { b += `<img src="${f.url_thumb || f.url}" class="${i === 0 ? 'act' : ''}" onclick="event.stopPropagation();galGo(${i})" onerror="drFallback(this)">`; });
      b += '</div>';
    }
  } else {
    b += `<div style="padding:20px;text-align:center;background:var(--cd2);border:1.5px dashed var(--brd);border-radius:10px;margin-bottom:12px"><span style="font-size:28px;display:block;margin-bottom:6px;opacity:.4">📷</span><span style="font-size:12px;color:var(--g400);font-weight:700">Sin fotos disponibles</span></div>`;
  }

  if (canEdit) {
    // EDITABLE MODE
    b += `<div class="msc"><div class="msct">🏠 Información <span style="font-size:12px;color:var(--gold)">(editable)</span></div><div class="mgr">`;
    b += `<div class="mf"><div class="mfl">Tipo</div>${sel('me_tipo', ['Casa', 'Apartamento', 'Apartaestudio', 'Finca', 'Local comercial', 'Oficina', 'Lote', 'Casa campestre', 'Bodega', 'Penthouse'], p.tipo)}</div>`;
    b += `<div class="mf"><div class="mfl">Negociación</div>${sel('me_neg', ['Venta', 'Arriendo', 'Venta y Arriendo'], p.negociacion)}</div>`;
    b += `<div class="mf ful"><div class="mfl">🔒 Dirección real</div>${inp('me_dir', p.direccion, 'Dirección completa')}<div style="font-size:10px;color:var(--gold);margin-top:3px">🔒 Solo tú y admin</div></div>`;
    b += `<div class="mf ful"><div class="mfl">📍 Ubicación pública</div>${inp('me_dir_pub', p.direccion_publica || '', 'Barrio, zona')}<div style="font-size:10px;color:var(--green);margin-top:3px">👁️ Visible para todos</div></div>`;
    b += `<div class="mf"><div class="mfl">Ciudad</div>${inp('me_ciu', p.ciudad, 'Pereira')}</div>`;
    b += `<div class="mf"><div class="mfl">Estrato</div>${sel('me_est', ['', '1', '2', '3', '4', '5', '6'], p.estrato)}</div>`;
    b += `</div></div>`;

    b += `<div class="msc"><div class="msct">💰 Precios</div><div class="mgr"><div class="mf hlb"><div class="mfl">Venta</div>${inp('me_pv', p.precio_venta || '', '450000000', 'number')}</div><div class="mf hlg"><div class="mfl">Arriendo/mes</div>${inp('me_pa', p.precio_arriendo || '', '2500000', 'number')}</div></div></div>`;

    b += `<div class="msc"><div class="msct">📐 Características</div><div class="mgr">`;
    b += `<div class="mf"><div class="mfl">Habitaciones</div>${inp('me_hab', p.habitaciones || '', '3', 'number')}</div>`;
    b += `<div class="mf"><div class="mfl">Baños</div>${inp('me_ban', p.banos || '', '2', 'number')}</div>`;
    b += `<div class="mf"><div class="mfl">Área construida m²</div>${inp('me_area', p.area_construida || '', '120', 'number')}</div>`;
    b += `<div class="mf"><div class="mfl">Área total m²</div>${inp('me_areatot', p.area_total || '', '500', 'number')}</div>`;
    b += `<div class="mf"><div class="mfl">Parqueos</div>${inp('me_parq', p.parqueaderos || '', '1', 'number')}</div>`;
    b += `<div class="mf ful"><div class="mfl">Características</div>${inp('me_carac', p.caracteristicas || '', 'piscina, gimnasio...')}</div>`;
    b += `</div></div>`;

    // Propietario
    b += `<div class="msc"><div class="msct">👤 Propietario</div><div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#065f46;font-weight:700">🔒 Solo tú y admin</div><div class="mgr">`;
    b += `<div class="mf ful"><div class="mfl">Nombre</div>${inp('me_prop', p.propietario_nombre, 'Nombre')}</div>`;
    b += `<div class="mf"><div class="mfl">Teléfono</div>${inp('me_tel', p.propietario_telefono, '3001234567', 'tel')}</div>`;
    b += `<div class="mf"><div class="mfl">Email</div>${inp('me_email', p.propietario_email, 'correo@mail.com', 'email')}</div>`;
    b += `</div></div>`;

    // Reasignar (admin)
    if (esP) {
      b += `<div class="msc"><div class="msct">🔄 Reasignar Captador</div><div style="background:var(--b50);border:1.5px solid var(--b200);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--b700)">👤 Actual: <b>${p.captador ? p.captador.nombre : 'Sin asignar'}</b></div><select id="me_captador" class="esel" style="width:100%;font-size:12px;padding:8px"><option value="">— Seleccionar —</option>${(window.USERS || []).filter((u2) => u2.id !== p.captador_id).map((u2) => `<option value="${u2.id}">👤 ${u2.nombre} (${u2.rol})</option>`).join('')}</select><button class="bt bp" style="width:100%;margin-top:8px" onclick="reasignarCap('${p.id}')">🔄 Reasignar</button></div>`;
    }

    // Descripciones
    b += `<div class="msc"><div class="msct">📝 Descripciones</div>`;
    const _ehDesc = window.escapeHtml || ((s) => String(s || ''));
    b += `<div class="desc-box"><div class="desc-hdr priv">🔒 Privada — Solo tú y admin</div><textarea id="me_desc_priv" placeholder="Notas internas...">${_ehDesc(p.descripcion_privada || '')}</textarea></div>`;
    b += `<div class="desc-box"><div class="desc-hdr pub">👁️ Para cliente — Visible en enlace</div><textarea id="me_desc_cli" placeholder="Texto comercial...">${_ehDesc(p.descripcion_cliente || '')}</textarea></div>`;
    b += `<div class="desc-box"><div class="desc-hdr team">👥 Para equipo — Todos los asesores</div><textarea id="me_obs" placeholder="Info general...">${_ehDesc(p.observaciones || '')}</textarea></div></div>`;

    // Fotos: preview + drag reorder + upload
    b += `<div class="msc"><div class="msct">📷 Fotos (${fotos.length}) <span style="font-size:10px;color:var(--sub);font-weight:500">— mantén presionado para reordenar</span></div>`;
    if (fotos.length > 0) {
      b += `<div id="fotoSortWrap" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">`;
      fotos.forEach((f, i) => { b += `<div class="foto-prev-item foto-sortable" draggable="true" data-foto-id="${f.id}" data-foto-idx="${i}" data-inm-id="${p.id}" style="cursor:grab;position:relative;touch-action:none"><img src="${f.url_thumb || f.url}" onerror="this.src='${f.url}'" style="pointer-events:none"><button class="foto-del" onclick="event.stopPropagation();delFoto('${f.id}','${p.id}')" type="button">✕</button><span style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.6);color:#fff;font-size:8px;font-weight:800;padding:1px 5px;border-radius:3px">${i + 1}</span></div>`; });
      b += '</div>';
    }
    b += `<div id="fotoUpModal"></div></div>`;
  } else {
    // READ-ONLY MODE
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    if (pv > 0 || pa > 0) {
      b += '<div class="msc"><div class="msct">💰 Precios</div><div class="mgr">';
      if (pv > 0) b += `<div class="mf hlb"><div class="mfl">Venta</div><div class="mfv">${fm(pv)}</div></div>`;
      if (pa > 0) b += `<div class="mf hlg"><div class="mfl">Arriendo</div><div class="mfv">${fm(pa)}/mes</div></div>`;
      b += '</div></div>';
    }

    const canSeeDir2 = esMio || esP || esGestor;
    const isArriendo = (p.negociacion || '').toLowerCase().includes('arriendo');
    const flds = [['tipo', 'Tipo'], ['ciudad', 'Ciudad']];
    if (canSeeDir2) flds.push(['direccion', 'Dirección']);
    else if (p.direccion_publica) flds.push(['direccion_publica', 'Ubicación']);
    flds.push(['habitaciones', 'Hab.'], ['banos', 'Baños'], ['area_construida', 'Área construida'], ['area_total', 'Área total'], ['estrato', 'Estrato']);
    let fH = '';
    flds.forEach(([k, l]) => {
      const v = p[k];
      if (v) fH += `<div class="mf"><div class="mfl">${l}</div><div class="mfv">${v}${k.startsWith('area') ? 'm²' : ''}</div></div>`;
    });
    if (fH) b += `<div class="msc"><div class="msct">🏠 Características</div><div class="mgr">${fH}</div></div>`;

    // Propietario para gestor de arriendos
    if (esGestor && isArriendo && !canEdit) {
      b += `<div class="msc"><div class="msct">👤 Propietario</div><div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:#065f46;font-weight:700">🔑 Visible para gestor</div><div class="mgr">`;
      const _ehProp = window.escapeHtml || ((s) => String(s || ''));
      if (p.propietario_nombre) b += `<div class="mf ful"><div class="mfl">Nombre</div><div class="mfv">${_ehProp(p.propietario_nombre)}</div></div>`;
      if (p.propietario_telefono) b += `<div class="mf"><div class="mfl">Teléfono</div><div class="mfv">${_ehProp(p.propietario_telefono)}</div></div>`;
      if (p.propietario_email) b += `<div class="mf"><div class="mfl">Email</div><div class="mfv">${_ehProp(p.propietario_email)}</div></div>`;
      b += `</div></div>`;
    }

    if (p.observaciones) b += `<div class="msc"><div class="msct">👥 Descripción equipo</div><div style="font-size:12px;line-height:1.5;padding:8px;background:var(--cd2);border-radius:6px">${(window.escapeHtml || String)(p.observaciones)}</div></div>`;
    if (p.captador) b += `<div class="msc"><div class="msct">👤 Asesor</div><div class="mgr"><div class="mf ful"><div class="mfl">Captador</div><div class="mfv">👤 ${p.captador.nombre}</div></div></div></div>`;
  }

  // PORTALES
  const m2 = (p.url_metrocuadrado || '').trim();
  const fr2 = (p.url_fincaraiz || '').trim();
  if (canEdit) {
    b += `<div class="msc"><div class="msct">🌐 Portales</div><div class="mgr"><div class="mf ful"><div class="mfl">Metrocuadrado</div><div style="display:flex;gap:4px"><input id="me_m2" type="url" value="${m2}" placeholder="https://metrocuadrado.com/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">${m2 ? `<a href="${m2}" target="_blank" style="font-size:10px;color:var(--b600);font-weight:700">Abrir↗</a>` : ''}</div></div><div class="mf ful"><div class="mfl">Fincaraíz</div><div style="display:flex;gap:4px"><input id="me_fr" type="url" value="${fr2}" placeholder="https://fincaraiz.com.co/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">${fr2 ? `<a href="${fr2}" target="_blank" style="font-size:10px;color:var(--b600);font-weight:700">Abrir↗</a>` : ''}</div></div></div></div>`;
  }

  // ESTADO
  if (canEdit) {
    const PCOLS = window.PCOLS || [];
    b += `<div class="msc"><div class="msct">⚙️ Estado</div><div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><select class="esel" onchange="chgE('${p.id}',this.value)">${PCOLS.map((e) => `<option ${e.id === p.estado ? 'selected' : ''}>${e.id}</option>`).join('')}</select><button class="bt bsm bgr" onclick="confD('${p.id}')">✓ Confirmar</button></div></div>`;
  }

  // SHARE
  b += `<div style="margin-top:10px;padding:10px;background:var(--b50);border:1.5px solid var(--b200);border-radius:8px"><button style="width:100%;padding:10px;background:var(--b600);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer" onclick="event.stopPropagation();shareInm('${p.id}')">📤 Compartir con cliente</button></div>`;

  // ANOTACIONES
  b += `<div class="abx"><div style="font-size:9px;font-weight:800;color:var(--sub);margin-bottom:4px">📝 ANOTACIONES</div><div id="anl"><span style="font-size:10px;color:var(--g400)">Cargando...</span></div>`;
  if (canEdit) b += `<div class="ainp" style="flex-direction:column;gap:6px"><textarea id="ant" placeholder="Agregar anotación..."></textarea><div style="display:flex;gap:6px;align-items:center"><select id="ant_vis" class="esel" style="font-size:10px;padding:5px 8px"><option value="privada">🔒 Solo admin y yo</option><option value="equipo">👥 Equipo</option></select><button class="bt bsm bp" onclick="addA('${p.id}')">Agregar</button></div></div>`;
  b += `</div>`;

  // DELETE (admin)
  if (u && u.rol === 'admin') b += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--g100)"><button class="bt bd" style="width:100%" onclick="eliminarInm('${p.id}')">🗑️ Eliminar</button></div>`;

  // INTERESADOS / LEADS (solo internos)
  const _esIntUser = u && (!u.tipo_usuario || u.tipo_usuario === 'interno');
  if (_esIntUser) {
    b += `<div style="margin-top:14px;padding:12px;background:var(--b50);border:1.5px solid var(--b200);border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:800;color:var(--b700)">👤 Interesados en este inmueble</div>
        <button onclick="abrirCrearInteresado('${p.id}')" style="padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">+ Nuevo</button>
      </div>
      <div id="oMInt-${p.id}" style="font-size:11px;color:var(--sub)">Cargando…</div>
    </div>`;
    setTimeout(async () => {
      try {
        if (!window.listarInteresados) return;
        const leads = await window.listarInteresados({ inmueble_id: p.id });
        const el = document.getElementById('oMInt-' + p.id);
        if (!el) return;
        if (!leads.length) { el.innerHTML = '<div style="padding:6px 0">Sin interesados aún. Crea el primero.</div>'; return; }
        const TIPC = window.TIPIFICACIONES || {};
        el.innerHTML = leads.slice(0, 8).map((l) => {
          const t = TIPC[l.tipificacion] || {};
          return `<div onclick="abrirDetalleInteresado('${l.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--cd);border:1px solid var(--brd);border-radius:6px;margin-bottom:4px;cursor:pointer">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--tx)">${(l.nombre_completo || 'Sin nombre').slice(0, 40)}</div>
              <div style="font-size:10px;color:var(--sub)">${l.telefono || '—'}${l.asignado?.nombre ? ' · ' + l.asignado.nombre : ''}</div>
            </div>
            <span style="font-size:9px;font-weight:800;background:${t.color}22;color:${t.color};padding:2px 8px;border-radius:8px;white-space:nowrap">${t.emoji || ''} ${t.label || l.tipificacion}</span>
          </div>`;
        }).join('') + (leads.length > 8 ? `<div style="font-size:10px;color:var(--sub);margin-top:4px">+ ${leads.length - 8} más en <a onclick="closeModal&&closeModal();go(\`interesados\`)" style="color:var(--b600);cursor:pointer;font-weight:700">Interesados</a></div>` : '');
      } catch (e) { console.warn('[oM interesados]', e); }
    }, 100);
  }

  // SAVE
  if (canEdit) b += `<div id="saveAnchor" style="margin-top:14px"><button class="bt bp" style="width:100%;padding:14px;font-size:14px" onclick="saveAll('${p.id}')">💾 Guardar cambios</button></div>`;
  if (canEdit) b += `<div class="fab-save"><button onclick="document.getElementById('saveAnchor').scrollIntoView({behavior:'smooth'})" title="Guardar">💾</button></div>`;

  document.getElementById('mbd').innerHTML = b;
  document.getElementById('mdl').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setGalFotos(fotos.map((f) => f.url));

  window.ldAn(p.id);

  if (canEdit) {
    window._pendingFotos = [];
    setTimeout(() => {
      if (typeof window.initFotoUpload === 'function') {
        window.initFotoUpload('fotoUpModal', (r) => { window._pendingFotos.push(r); _modalDirty = true; }, fotos.length);
      }
      const mbd = document.getElementById('mbd');
      if (mbd) {
        mbd.querySelectorAll('input,textarea,select').forEach((el) => {
          el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { _modalDirty = true; });
        });
      }
    }, 100);
  }
};

// Cierre con confirm si hay cambios sin guardar
window.cm = function () {
  if (_cmBusy) return;
  if (_modalDirty) {
    _cmBusy = true;
    const ov = document.createElement('div');
    ov.id = 'confirmOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fi .15s';
    ov.innerHTML = `<div style="background:var(--cd);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:su2 .2s;text-align:center"><div style="width:52px;height:52px;border-radius:50%;background:var(--goldbg);border:2px solid var(--yb);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px">⚠️</div><div style="font-family:'Fraunces',serif;font-size:17px;font-weight:700;margin-bottom:6px;color:var(--tx)">Cambios sin guardar</div><div style="font-size:13px;color:var(--sub);margin-bottom:20px;line-height:1.5">Tienes cambios que no has guardado.<br>¿Qué deseas hacer?</div><div style="display:flex;gap:8px"><button onclick="document.getElementById('confirmOverlay').remove();window._cmBusy=false;window._modalDirtyReset();window.cmForce()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid var(--brd);background:var(--cd2);font-size:13px;font-weight:700;color:var(--tx);font-family:inherit;cursor:pointer">Descartar</button><button onclick="document.getElementById('confirmOverlay').remove();window._cmBusy=false;var sb=document.querySelector('#saveAnchor button');if(sb)sb.click();" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--b600);font-size:13px;font-weight:700;color:#fff;font-family:inherit;cursor:pointer">💾 Guardar</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) { ov.remove(); _cmBusy = false; } });
    return;
  }
  window.cmForce();
};

window.cmForce = function () {
  _modalDirty = false;
  document.getElementById('mdl').style.display = 'none';
  document.body.style.overflow = '';
};

// Escape para cerrar
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.cm(); });

// Swipe down para cerrar (touch en .m-handle o .mhd2)
(function () {
  let sy = 0, moving = false;
  document.addEventListener('touchstart', (e) => {
    const h = e.target.closest('.m-handle') || e.target.closest('.mhd2');
    if (h) { sy = e.touches[0].clientY; moving = true; }
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!moving) return;
    if (e.touches[0].clientY - sy > 60) { window.cm(); moving = false; }
  }, { passive: true });
  document.addEventListener('touchend', () => { moving = false; }, { passive: true });
})();
