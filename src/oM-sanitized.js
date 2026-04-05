/**
 * HOUSE CRM — oM() (modal de detalle) refactorizada con protección XSS
 *
 * CAMPOS ESCAPADOS:
 *   escapeHtml():  p.tipo, p.ciudad, p.direccion, p.direccion_publica,
 *                  p.captador.nombre, p.codigo_house, p.caracteristicas,
 *                  p.propietario_nombre, p.propietario_telefono, p.propietario_email,
 *                  u.nombre (en selector de captador), u.rol (en selector)
 *   escapeAttr():  p.codigo_house (clipboard onclick), p.id (en onclick handlers),
 *                  p.direccion (input value), p.direccion_publica (input value),
 *                  p.ciudad (input value), p.estrato (select), p.precio_* (input value),
 *                  p.habitaciones/banos/area/parqueaderos (input value),
 *                  p.caracteristicas (input value), p.propietario_* (input value),
 *                  p.url_metrocuadrado (input value + href), p.url_fincaraiz (input value + href),
 *                  foto URLs (img src)
 *   safeUrl():     p.url_metrocuadrado (href), p.url_fincaraiz (href), foto URLs (img src open)
 *   allowBasicHtml(): p.observaciones (display mode), p.descripcion_cliente (display mode)
 *   textarea content: p.descripcion_privada, p.descripcion_cliente, p.observaciones
 *                     → escapeHtml() (HTML no se renderiza dentro de textarea)
 *
 * REQUIERE: sanitizer.js cargado (escapeHtml, escapeAttr, safeText, safeUrl, allowBasicHtml, safeJsonAttr)
 */

/* MODAL */
function oM(idx) {
  const p = D[idx];
  if (!p) return;

  const esMio = U && p.captador_id === U.id;
  const esP = U && (U.rol === 'admin' || U.rol === 'oficina');
  const esGestor = U && U.es_gestor_arriendos;
  const canEdit = esMio || esP || esGestor;

  _modalDirty = false;

  const canSeeRealDir = esMio || esP || esGestor;

  // ── Header del modal (textContent, no innerHTML → seguro) ──
  setText('mtt', (p.codigo_house ? p.codigo_house + ' · ' : '') + (p.tipo || 'Inmueble'));
  setText('msb3', (p.ciudad ? '📍 ' + p.ciudad : '') +
    (canSeeRealDir && p.direccion ? ' · ' + p.direccion :
      p.direccion_publica ? ' · ' + p.direccion_publica : ''));

  // ── Helper para inputs editables (CORREGIDO: usa escapeAttr) ──
  const inp = (id, val, ph, type) =>
    `<input id="${id}" type="${type || 'text'}" autocomplete="off" ` +
    `value="${escapeAttr(val)}" ` +
    `placeholder="${escapeAttr(ph)}" ` +
    `style="width:100%;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:11px;font-family:inherit;color:var(--tx);background:var(--cd)">`;

  // ── Helper para selects ──
  const sel = (id, opts, cur) =>
    `<select id="${id}" class="esel" style="width:100%;font-size:11px">` +
    opts.map(o =>
      `<option ${o === (cur || '') ? 'selected' : ''}>${escapeHtml(o)}</option>`
    ).join('') +
    `</select>`;

  let b = '';

  // ══════════════════════════════════════════════════════════════
  //  GALLERY
  // ══════════════════════════════════════════════════════════════
  const fotos = p.fotos ? p.fotos.sort((a, b2) => a.orden - b2.orden) : [];

  if (fotos.length > 0) {
    const firstUrl = escapeAttr(fotos[0].url);
    b += `<div class="gal" id="gal">` +
      `<img class="gal-main" id="gal-img" src="${firstUrl}" onclick="window.open(this.src,'_blank')" onerror="drFallback(this)">`;

    if (fotos.length > 1) {
      b += `<button class="gal-nav prev" onclick="event.stopPropagation();galNav(-1)">‹</button>` +
           `<button class="gal-nav next" onclick="event.stopPropagation();galNav(1)">›</button>`;
    }

    b += `<span class="gal-count" id="gal-ct">1/${fotos.length}</span></div>`;

    if (fotos.length > 1) {
      b += `<div class="gal-thumbs" id="gal-th">`;
      fotos.forEach((f, i) => {
        b += `<img src="${escapeAttr(f.url_thumb || f.url)}" class="${i === 0 ? 'act' : ''}" onclick="event.stopPropagation();galGo(${i})" onerror="drFallback(this)">`;
      });
      b += '</div>';
    }
  } else {
    b += `<div style="padding:20px;text-align:center;background:var(--cd2);border:1.5px dashed var(--brd);border-radius:10px;margin-bottom:12px">` +
      `<span style="font-size:28px;display:block;margin-bottom:6px;opacity:.4">📷</span>` +
      `<span style="font-size:12px;color:var(--g400);font-weight:700">Sin fotos disponibles</span></div>`;
  }

  // ══════════════════════════════════════════════════════════════
  //  MODO EDICIÓN (owner o admin/oficina)
  // ══════════════════════════════════════════════════════════════
  if (canEdit) {

    // ── Información básica ──
    b += `<div class="msc"><div class="msct">🏠 Información <span style="font-size:12px;color:var(--gold)">(editable)</span></div><div class="mgr">`;

    b += `<div class="mf"><div class="mfl">Tipo</div>${sel('me_tipo', ['Casa', 'Apartamento', 'Finca', 'Local comercial', 'Oficina', 'Lote', 'Casa campestre', 'Bodega', 'Penthouse'], p.tipo)}</div>`;

    b += `<div class="mf"><div class="mfl">Negociación</div>${sel('me_neg', ['Venta', 'Arriendo', 'Venta y Arriendo'], p.negociacion)}</div>`;

    b += `<div class="mf ful"><div class="mfl">🔒 Dirección real (solo tú y admin)</div>` +
      inp('me_dir', p.direccion || '', 'Calle 50 #32-15, Unidad Res. Los Pinos') +
      `<div style="font-size:11px;color:var(--gold);margin-top:4px;font-weight:600">🔒 Esta dirección NO la ven otros asesores ni clientes</div></div>`;

    b += `<div class="mf ful"><div class="mfl">📍 Ubicación pública (equipo y clientes)</div>` +
      inp('me_dir_pub', p.direccion_publica || '', 'Barrio Los Alpes, cerca al centro comercial') +
      `<div style="font-size:11px;color:var(--green);margin-top:4px;font-weight:600">👁️ Esta ubicación la ven asesores y clientes en el enlace compartido</div></div>`;

    b += `<div class="mf"><div class="mfl">Ciudad</div>${inp('me_ciu', p.ciudad || '', 'Pereira')}</div>`;

    b += `<div class="mf"><div class="mfl">Estrato</div>${sel('me_est', ['', '1', '2', '3', '4', '5', '6'], p.estrato)}</div>`;

    b += `</div></div>`; // close .mgr, .msc

    // ── Precios ──
    b += `<div class="msc"><div class="msct">💰 Precios</div><div class="mgr">` +
      `<div class="mf hlb"><div class="mfl">Venta</div>${inp('me_pv', p.precio_venta || '', '450000000', 'number')}</div>` +
      `<div class="mf hlg"><div class="mfl">Arriendo/mes</div>${inp('me_pa', p.precio_arriendo || '', '2500000', 'number')}</div>` +
      `</div></div>`;

    // ── Características ──
    b += `<div class="msc"><div class="msct">📐 Características</div><div class="mgr">` +
      `<div class="mf"><div class="mfl">Habitaciones</div>${inp('me_hab', p.habitaciones || '', '3', 'number')}</div>` +
      `<div class="mf"><div class="mfl">Baños</div>${inp('me_ban', p.banos || '', '2', 'number')}</div>` +
      `<div class="mf"><div class="mfl">Área construida m²</div>${inp('me_area', p.area_construida || '', '120', 'number')}</div>` +
      `<div class="mf"><div class="mfl">Área total m²</div>${inp('me_areatot', p.area_total || '', '500', 'number')}</div>` +
      `<div class="mf"><div class="mfl">Parqueos</div>${inp('me_parq', p.parqueaderos || '', '1', 'number')}</div>` +
      `<div class="mf ful"><div class="mfl">Características adicionales</div>${inp('me_carac', p.caracteristicas || '', 'piscina, gimnasio...')}</div>` +
      `</div></div>`;

    // ── Propietario ──
    b += `<div class="msc"><div class="msct">👤 Propietario</div>` +
      `<div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#065f46;font-weight:700">🔒 Solo tú y admin ven estos datos</div>` +
      `<div class="mgr">` +
      `<div class="mf ful"><div class="mfl">Nombre</div>${inp('me_prop', p.propietario_nombre || '', 'Nombre')}</div>` +
      `<div class="mf"><div class="mfl">Teléfono</div>${inp('me_tel', p.propietario_telefono || '', '3001234567', 'tel')}</div>` +
      `<div class="mf"><div class="mfl">Email</div>${inp('me_email', p.propietario_email || '', 'correo@mail.com', 'email')}</div>` +
      `</div></div>`;

    // ── Reasignar Captador (solo admin/oficina) ──
    if (esP) {
      const capNomEsc = escapeHtml(p.captador ? p.captador.nombre : 'Sin asignar');
      const userOpts = USERS.filter(u => u.id !== p.captador_id)
        .map(u => `<option value="${escapeAttr(u.id)}">👤 ${escapeHtml(u.nombre)} (${escapeHtml(u.rol)})</option>`)
        .join('');

      b += `<div class="msc"><div class="msct">🔄 Reasignar Captador</div>` +
        `<div style="background:var(--b50);border:1.5px solid var(--b200);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--b700);font-weight:600">` +
        `👤 Captador actual: <b>${capNomEsc}</b></div>` +
        `<select id="me_captador" class="esel" style="width:100%;font-size:12px;padding:8px">` +
        `<option value="">— Seleccionar nuevo captador —</option>${userOpts}</select>` +
        `<button class="bt bp" style="width:100%;margin-top:8px" onclick="reasignarCap('${escapeAttr(p.id)}')">🔄 Reasignar</button></div>`;
    }

    // ── 3 Descripciones (textarea: contenido se escapa para prevenir HTML injection) ──
    b += `<div class="msc"><div class="msct">📝 Descripciones</div>`;

    b += `<div class="desc-box"><div class="desc-hdr priv">🔒 Descripción privada — Solo tú y admin</div>` +
      `<textarea id="me_desc_priv" placeholder="Notas sensibles de negociación...">${escapeHtml(p.descripcion_privada || '')}</textarea></div>`;

    b += `<div class="desc-box"><div class="desc-hdr pub">👁️ Descripción para cliente — Visible en enlace compartido</div>` +
      `<textarea id="me_desc_cli" placeholder="Texto comercial para el cliente...">${escapeHtml(p.descripcion_cliente || '')}</textarea></div>`;

    b += `<div class="desc-box"><div class="desc-hdr team">👥 Descripción para el equipo — Todos los asesores</div>` +
      `<textarea id="me_obs" placeholder="Información general del inmueble...">${escapeHtml(p.observaciones || '')}</textarea></div></div>`;

    // ── Gestionar Fotos ──
    b += `<div class="msc"><div class="msct">📷 Gestionar Fotos (${fotos.length})</div>`;
    if (fotos.length > 0) {
      b += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">`;
      fotos.forEach(f => {
        const thumbUrl = escapeAttr(f.url_thumb || f.url);
        const fallbackUrl = escapeAttr(f.url);
        b += `<div class="foto-prev-item">` +
          `<img src="${thumbUrl}" onerror="this.src='${fallbackUrl}'">` +
          `<button class="foto-del" onclick="event.stopPropagation();delFoto('${escapeAttr(f.id)}','${escapeAttr(p.id)}')" type="button">✕</button></div>`;
      });
      b += '</div>';
    }
    b += `<div id="fotoUpModal"></div></div>`;

  } else {
    // ══════════════════════════════════════════════════════════════
    //  MODO LECTURA (otro asesor o gestor)
    // ══════════════════════════════════════════════════════════════
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;

    if (pv > 0 || pa > 0) {
      b += '<div class="msc"><div class="msct">💰 Precios</div><div class="mgr">';
      if (pv > 0) b += `<div class="mf hlb"><div class="mfl">Venta</div><div class="mfv">${fm(pv)}</div></div>`;
      if (pa > 0) b += `<div class="mf hlg"><div class="mfl">Arriendo</div><div class="mfv">${fm(pa)}/mes</div></div>`;
      b += '</div></div>';
    }

    const canSeeDir2 = esMio || esP || esGestor;
    const isArriendo = (p.negociacion || '').toLowerCase().includes('arriendo');

    // ── Características (lectura, escapadas) ──
    const flds = [['tipo', 'Tipo'], ['ciudad', 'Ciudad']];
    if (canSeeDir2) flds.push(['direccion', 'Dirección']);
    else if (p.direccion_publica) flds.push(['direccion_publica', 'Ubicación']);
    flds.push(['habitaciones', 'Hab.'], ['banos', 'Baños'],
              ['area_construida', 'Área construida'], ['area_total', 'Área total'],
              ['estrato', 'Estrato']);

    let fH = '';
    flds.forEach(([k, l]) => {
      const v = p[k];
      if (v) fH += `<div class="mf"><div class="mfl">${escapeHtml(l)}</div>` +
        `<div class="mfv">${escapeHtml(String(v))}${k.startsWith('area') ? 'm²' : ''}</div></div>`;
    });
    if (fH) b += `<div class="msc"><div class="msct">🏠 Características</div><div class="mgr">${fH}</div></div>`;

    // ── Propietario visible para gestor de arriendos ──
    if (esGestor && isArriendo && !canEdit) {
      b += `<div class="msc"><div class="msct">👤 Propietario</div>` +
        `<div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:#065f46;font-weight:700">🔑 Visible para gestor de arriendos</div>` +
        `<div class="mgr">`;
      if (p.propietario_nombre)
        b += `<div class="mf ful"><div class="mfl">Nombre</div><div class="mfv">${escapeHtml(p.propietario_nombre)}</div></div>`;
      if (p.propietario_telefono)
        b += `<div class="mf"><div class="mfl">Teléfono</div><div class="mfv">${escapeHtml(p.propietario_telefono)}</div></div>`;
      if (p.propietario_email)
        b += `<div class="mf"><div class="mfl">Email</div><div class="mfv">${escapeHtml(p.propietario_email)}</div></div>`;
      b += `</div></div>`;
    }

    // ── Observaciones (lectura — permitir HTML básico) ──
    if (p.observaciones) {
      b += `<div class="msc"><div class="msct">👥 Descripción del equipo</div>` +
        `<div style="font-size:12px;color:var(--tx);line-height:1.5;padding:8px;background:var(--cd2);border-radius:6px">` +
        `${allowBasicHtml(p.observaciones)}</div></div>`;
    }

    // ── Asesor ──
    if (p.captador) {
      b += `<div class="msc"><div class="msct">👤 Asesor</div><div class="mgr">` +
        `<div class="mf ful"><div class="mfl">Captador</div>` +
        `<div class="mfv">👤 ${escapeHtml(p.captador.nombre)}</div></div></div></div>`;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  SECCIONES COMUNES (edit y lectura)
  // ══════════════════════════════════════════════════════════════

  // ── Portales ──
  const m2 = (p.url_metrocuadrado || '').trim();
  const fr2 = (p.url_fincaraiz || '').trim();

  if (canEdit) {
    const m2Safe = safeUrl(m2);
    const fr2Safe = safeUrl(fr2);
    b += `<div class="msc"><div class="msct">🌐 Portales</div><div class="mgr">` +
      `<div class="mf ful"><div class="mfl">Metrocuadrado</div>` +
      `<div style="display:flex;gap:4px;align-items:center">` +
      `<input id="me_m2" type="url" value="${escapeAttr(m2)}" placeholder="https://www.metrocuadrado.com/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">` +
      (m2Safe ? `<a href="${m2Safe}" target="_blank" rel="noopener noreferrer" style="font-size:10px;color:var(--b600);font-weight:700;white-space:nowrap">Abrir ↗</a>` : '') +
      `</div></div>` +
      `<div class="mf ful"><div class="mfl">Fincaraíz</div>` +
      `<div style="display:flex;gap:4px;align-items:center">` +
      `<input id="me_fr" type="url" value="${escapeAttr(fr2)}" placeholder="https://www.fincaraiz.com.co/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">` +
      (fr2Safe ? `<a href="${fr2Safe}" target="_blank" rel="noopener noreferrer" style="font-size:10px;color:var(--b600);font-weight:700;white-space:nowrap">Abrir ↗</a>` : '') +
      `</div></div></div></div>`;
  } else if (m2 || fr2) {
    b += '<div class="msc"><div class="msct">🌐 Portales</div><div class="mgr">';
    if (m2) b += `<div class="mf"><div class="mfl">M²</div><div class="mfv"><a href="${safeUrl(m2)}" target="_blank" rel="noopener noreferrer" style="color:var(--b600);font-size:10px">Abrir →</a></div></div>`;
    if (fr2) b += `<div class="mf"><div class="mfl">FR</div><div class="mfv"><a href="${safeUrl(fr2)}" target="_blank" rel="noopener noreferrer" style="color:var(--b600);font-size:10px">Abrir →</a></div></div>`;
    b += '</div></div>';
  }

  // ── Estado (solo editores) ──
  if (canEdit) {
    b += `<div class="msc"><div class="msct">⚙️ Estado</div>` +
      `<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">` +
      `<select class="esel" onchange="chgE('${escapeAttr(p.id)}',this.value)">` +
      PCOLS.map(e => `<option ${e.id === p.estado ? 'selected' : ''}>${escapeHtml(e.id)}</option>`).join('') +
      `</select><button class="bt bsm bgr" onclick="confD('${escapeAttr(p.id)}')">✓ Confirmar</button></div></div>`;
  }

  // ── Solicitud de verificación (asesores sin permiso de edición) ──
  if (!canEdit && U && U.rol === 'asesor') {
    const mySolsP = SOL.filter(s => s.inmueble_id === p.id && s.solicitante_id === U.id && s.estado === 'pendiente');
    b += mySolsP.length
      ? `<div style="margin-top:8px;padding:10px;background:var(--goldbg);border:1.5px solid var(--yb);border-radius:8px;font-size:11px;text-align:center;color:#92400e;font-weight:700">🔍 Tu solicitud está pendiente — esperando respuesta del captador</div>`
      : `<div style="margin-top:8px"><button class="bt bp" style="width:100%" onclick="solicitarVerif('${escapeAttr(p.id)}');cm()">🔍 Consultar disponibilidad</button></div>`;
  }

  // ── Compartir ──
  b += `<div style="margin-top:10px;padding:10px;background:var(--b50);border:1.5px solid var(--b200);border-radius:8px">` +
    `<button style="width:100%;padding:10px;background:var(--b600);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px" onclick="event.stopPropagation();shareInm('${escapeAttr(p.id)}')">📤 Compartir con cliente</button>` +
    `<div style="font-size:9px;color:var(--sub);text-align:center;margin-top:4px">Envía por WhatsApp con foto, datos y tu contacto</div></div>`;

  // ── Anotaciones ──
  b += `<div class="abx"><div style="font-size:9px;font-weight:800;color:var(--sub);margin-bottom:4px">📝 ANOTACIONES</div>` +
    `<div id="anl"><span style="font-size:10px;color:var(--g400)">Cargando...</span></div>`;

  if (canEdit) {
    b += `<div class="ainp" style="flex-direction:column;gap:6px">` +
      `<textarea id="ant" placeholder="Agregar anotación..."></textarea>` +
      `<div style="display:flex;gap:6px;align-items:center">` +
      `<select id="ant_vis" class="esel" style="font-size:10px;padding:5px 8px;flex-shrink:0">` +
      `<option value="privada">🔒 Solo admin y yo</option>` +
      `<option value="equipo">👥 Visible para el equipo</option></select>` +
      `<button class="bt bsm bp" onclick="addA('${escapeAttr(p.id)}')">Agregar</button></div></div>`;
  }

  b += `</div>`;

  // ── Eliminar (solo admin) ──
  if (U && U.rol === 'admin') {
    b += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--g100)">` +
      `<button class="bt bd" style="width:100%" onclick="eliminarInm('${escapeAttr(p.id)}')">🗑️ Eliminar inmueble</button></div>`;
  }

  // ── Botón guardar ──
  if (canEdit) {
    b += `<div id="saveAnchor" style="margin-top:14px">` +
      `<button class="bt bp" style="width:100%;padding:14px;font-size:14px" onclick="saveAll('${escapeAttr(p.id)}')">💾 Guardar todos los cambios</button></div>`;
  }

  // ── FAB flotante ──
  if (canEdit) {
    b += `<div class="fab-save"><button onclick="document.getElementById('saveAnchor').scrollIntoView({behavior:'smooth'})" title="Ir a Guardar">💾</button></div>`;
  }

  // ── Render ──
  document.getElementById('mbd').innerHTML = b;
  document.getElementById('mdl').style.display = 'flex';
  document.body.style.overflow = 'hidden';

  _galFotos = fotos.map(f => f.url);
  _galIdx = 0;

  ldAn(p.id);

  if (canEdit) {
    _pendingFotos = [];
    setTimeout(() => {
      initFotoUpload('fotoUpModal', r => {
        _pendingFotos.push(r);
        _modalDirty = true;
      }, fotos.length);
      // Dirty tracking
      const mbd = document.getElementById('mbd');
      if (mbd) {
        mbd.querySelectorAll('input,textarea,select').forEach(el => {
          const ev = el.tagName === 'SELECT' ? 'change' : 'input';
          el.addEventListener(ev, () => { _modalDirty = true; });
        });
      }
    }, 100);
  }
}


// ══════════════════════════════════════════════════════════════════
//  ldAn() — Anotaciones (TAMBIÉN SANITIZADA)
// ══════════════════════════════════════════════════════════════════

async function ldAn(id) {
  const { data } = await SB.from('anotaciones')
    .select('*,autor:usuarios!usuario_id(nombre)')
    .eq('inmueble_id', id)
    .order('created_at', { ascending: false });

  const el = document.getElementById('anl');
  if (!data || !data.length) {
    el.innerHTML = '<span style="font-size:10px;color:var(--g400)">Sin anotaciones</span>';
    return;
  }

  const p = findInm(id);
  const esMio2 = p && U && p.captador_id === U.id;
  const esP2 = U && (U.rol === 'admin' || U.rol === 'oficina');

  const filtered = data.filter(a => {
    if (esMio2 || esP2 || a.usuario_id === U.id) return true;
    return (a.visibilidad || 'privada') === 'equipo';
  });

  el.innerHTML = filtered.map(a => {
    const f = a.created_at
      ? new Date(a.created_at).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '';

    const autorNom = escapeHtml(a.autor ? a.autor.nombre : '?');
    const textoSafe = escapeHtml(a.texto || '');

    const visBadge = (a.visibilidad || 'privada') === 'privada'
      ? '<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--goldbg);color:#92400e;border:1px solid var(--yb);font-weight:700">🔒 Privada</span>'
      : '<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--b50);color:var(--b700);border:1px solid var(--b200);font-weight:700">👥 Equipo</span>';

    return `<div class="ait" style="${(a.visibilidad || 'privada') === 'privada' ? 'background:rgba(245,158,11,.03)' : ''}">` +
      `<div class="aim"><b>👤 ${autorNom}</b> · ${f} ${visBadge}</div>` +
      `${textoSafe}</div>`;
  }).join('');
}
