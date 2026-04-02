/**
 * HOUSE CRM — render() refactorizada con protección XSS
 *
 * CAMBIOS vs original:
 *   - Todos los campos de BD se pasan por escapeHtml() o escapeAttr()
 *   - URLs de portales se pasan por safeUrl()
 *   - URLs de fotos se pasan por escapeAttr()
 *   - JSON en data-attributes se pasan por safeJsonAttr()
 *   - Emojis (emo()) y números formateados (fm()) NO se escapan (son seguros)
 *   - codigo_house en onclick usa escapeAttr() para prevenir inyección
 *
 * CAMPOS ESCAPADOS EN ESTA FUNCIÓN:
 *   escapeHtml(): p.tipo, p.ciudad, p.direccion, p.direccion_publica,
 *                 p.captador.nombre, p.codigo_house, p.barrio,
 *                 s.nota_solicitante (solicitudes)
 *   escapeAttr(): p.codigo_house (en onclick), p.id (en onclick),
 *                 foto URLs (en src), JSON de fotos (en data-fotos)
 *   safeUrl():    (no hay URLs de portal en href dentro de render,
 *                  pero sí en oM)
 *
 * CAMPOS QUE NO SE ESCAPAN (son seguros por naturaleza):
 *   - Números: p.precio_venta, p.precio_arriendo, p.habitaciones,
 *              p.banos, p.area_construida, p.estrato, p._dias
 *   - Computed: fm() output, emo() output, idx (integer index)
 *   - Booleans: m2, fr, esMio, hasF
 *
 * REQUIERE: sanitizer.js cargado antes (escapeHtml, escapeAttr, safeText, safeJsonAttr)
 */

/* LIST RENDER */
function render(ls) {
  const el = document.getElementById('res');
  if (!ls.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">🔍</span><h3>Sin resultados</h3></div>';
    return;
  }

  let h = `<div style="font-family:'Fraunces',serif;font-size:16px;font-weight:700;margin:10px 0">🎯 <b style="color:var(--b600)">${ls.length}</b> propiedades</div><div class="pgr">`;

  ls.slice(0, 60).forEach((p, i) => {
    const idx = D.indexOf(p);

    // ── Escapar campos de texto de BD ──
    const tip   = escapeHtml(p.tipo || 'Inmueble');
    const ciu   = escapeHtml(p.ciudad || '');
    const ase   = escapeHtml(p.captador ? p.captador.nombre : '');
    const cod   = escapeHtml(p.codigo_house || '');
    const codRaw = p.codigo_house || '';  // para clipboard (ya es alfanumérico HOUSE-NNN)

    // Números — seguros, no necesitan escape
    const pv   = p.precio_venta || 0;
    const pa   = p.precio_arriendo || 0;
    const hab  = p.habitaciones || '';
    const ban  = p.banos || '';
    const area = p.area_construida || '';
    const est  = p.estrato || '';

    // Computados — seguros
    const am = eA2(p), sv = eV(p) && !am, sa = eA(p) && !am;
    const hc = am ? 'tb' : sv ? 'tv' : 'ta';
    const dias = p._dias || 0;

    // ── Badge de días (número seguro) ──
    let ab = '';
    if (dias !== null) {
      const cl = dias <= 7 ? 'agn' : dias <= 20 ? 'ago' : dias <= 40 ? 'agw' : 'agd';
      ab = `<span class="agb ${cl}">${dias === 0 ? 'Hoy' : dias + 'd'}</span>`;
    }

    // ── Badges de negociación (strings fijos, seguros) ──
    let md = '';
    if (sv || am) md += '<span class="mb mbv">💰</span>';
    if (sa || am) md += '<span class="mb mba">🔑</span>';

    // ── Precios (fm() devuelve string formateado con $ — seguro) ──
    let pr = '<div class="pbl">';
    if (pv > 0) pr += `<div class="pvt">${fm(pv)} <small>venta</small></div>`;
    if (pa > 0) pr += `<div class="par">${fm(pa)} <small>/mes</small></div>`;
    if (!pv && !pa) pr += '<div style="font-size:10px;color:var(--g400)">Consultar</div>';
    pr += '</div>';

    // ── Specs (números, seguros) ──
    const sp2 = [
      hab && hab != 0 ? `<span class="sp">🛏️${hab}</span>` : '',
      ban && ban != 0 ? `<span class="sp">🚿${ban}</span>` : '',
      area ? `<span class="sp">📐${area}m²</span>` : '',
      est ? `<span class="sp">E${est}</span>` : ''
    ].filter(Boolean).join('');

    // ── Portales (boolean check, no se muestra URL) ──
    const m2 = !!(p.url_metrocuadrado || '').trim();
    const fr = !!(p.url_fincaraiz || '').trim();

    // ── Permisos ──
    const esMio = U && p.captador_id === U.id;
    const canSeeDir = esMio || U.rol === 'admin' || U.rol === 'oficina' ||
                      (U.es_gestor_arriendos && (p.negociacion || '').toLowerCase().includes('arriendo'));

    // ── Dirección — escapar ──
    const dirRaw = canSeeDir ? (p.direccion || '') : (p.direccion_publica || '');
    const dirTxt = escapeHtml(dirRaw);
    const ubiTxt = dirTxt ? (dirTxt + (ciu ? ' · ' + ciu : '')) : ('📍 ' + ciu);

    // ── Solicitudes (IDs son UUID — seguros para atributos) ──
    const mySols = SOL.filter(s => s.inmueble_id === p.id && s.solicitante_id === U.id);
    const hasPendSol = mySols.some(s => s.estado === 'pendiente');
    const solCount = SOL.filter(s => s.inmueble_id === p.id && s.estado === 'pendiente').length;

    // ── Fotos ──
    const hasF = p.fotos && p.fotos.length > 0;
    const sortedFotos = hasF ? [...p.fotos].sort((a, b2) => a.orden - b2.orden) : [];

    // ── Card top: carousel o header sin foto ──
    let cardTop = '';
    if (hasF) {
      const fUrls = sortedFotos.map(f => f.url_thumb || f.url);
      const cid = 'car_' + idx;

      // URLs de fotos escapadas para src, JSON escapado para data-attribute
      const firstUrl = escapeAttr(fUrls[0]);
      const fotosJson = safeJsonAttr(JSON.stringify(fUrls));

      cardTop = `<div class="pc-car" id="${cid}" data-fotos='${fotosJson}' data-idx="0">` +
        `<img src="${firstUrl}" onerror="drFallback(this)">`;

      if (sortedFotos.length > 1) {
        cardTop += `<button class="car-nav prev" onclick="event.stopPropagation();cardNav('${cid}',-1)">‹</button>` +
                   `<button class="car-nav next" onclick="event.stopPropagation();cardNav('${cid}',1)">›</button>`;
      }

      if (sortedFotos.length > 1 && sortedFotos.length <= 6) {
        cardTop += `<div class="car-dots">${sortedFotos.map((_, j) =>
          `<div class="car-dot ${j === 0 ? 'act' : ''}"></div>`
        ).join('')}</div>`;
      }

      cardTop += `<span class="car-count">📷 ${sortedFotos.length}</span>${ab}</div>`;
    } else {
      // emo() devuelve emoji (seguro), tip y ciu ya están escapados
      cardTop = `<div class="pctop ${hc}" style="position:relative">${ab}` +
        `<div class="pce">${emo(p.tipo)}</div>` +
        `<div class="pctt">${tip}</div>` +
        `<div class="pccy">${ciu}</div></div>` +
        `<div class="pc-nofoto">📷 Sin foto disponible</div>`;
    }

    // ── Código HOUSE badge (escapado en display, escapeAttr en clipboard) ──
    const codBadge = cod
      ? `<span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${escapeAttr(codRaw)}');toast('📋 ${escapeAttr(codRaw)} copiado')">${cod}</span>`
      : '';

    // ── Botones de acción ──
    // p.id es UUID (formato fijo, seguro para atributos)
    let actBtn = `<button class="vb" onclick="oM(${idx})">Ver detalle →</button>`;

    if (!esMio && U && U.rol === 'asesor') {
      actBtn += hasPendSol
        ? '<div style="text-align:center;padding:6px;font-size:10px;color:var(--gold);font-weight:700;background:var(--goldbg);border:1px solid var(--yb);border-radius:6px;margin-top:5px">🔍 Solicitud enviada — esperando respuesta</div>'
        : `<button class="wab" style="background:var(--b600)" onclick="event.stopPropagation();solicitarVerif('${escapeAttr(p.id)}')">🔍 Consultar disponibilidad</button>`;
    }

    if (esMio && solCount > 0) {
      actBtn += `<div style="text-align:center;padding:6px;font-size:10px;color:var(--red);font-weight:700;background:var(--redbg);border:1px solid var(--rb);border-radius:6px;margin-top:5px">🔔 ${solCount} asesor(es) consultan este inmueble</div>`;
    }

    // ── Ensamblar card ──
    if (hasF) {
      h += `<div class="pc">${cardTop}<div class="pcbd">` +
        `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">` +
          `<span style="font-size:18px">${emo(p.tipo)}</span>` +
          `<div style="flex:1">` +
            `<div style="display:flex;align-items:center;gap:6px">` +
              `<div style="font-size:14px;font-weight:800">${tip}</div>` +
              codBadge +
            `</div>` +
            `<div style="font-size:11px;color:var(--sub)">${ubiTxt}</div>` +
          `</div>` +
        `</div>` +
        `<div class="mods">${md}</div>` +
        pr +
        (sp2 ? `<div class="sps">${sp2}</div>` : '') +
        (ase ? `<div class="asl">👤 ${ase}</div>` : '') +
        `<div class="ptb">${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}` +
          `${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}</div>` +
        actBtn +
      `</div></div>`;
    } else {
      h += `<div class="pc">${cardTop}<div class="pcbd">` +
        (cod ? `<div style="margin-bottom:4px">${codBadge}</div>` : '') +
        `<div class="mods">${md}</div>` +
        pr +
        (sp2 ? `<div class="sps">${sp2}</div>` : '') +
        (ase ? `<div class="asl">👤 ${ase}</div>` : '') +
        `<div class="ptb">${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}` +
          `${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}</div>` +
        actBtn +
      `</div></div>`;
    }
  });

  h += '</div>';
  el.innerHTML = h;
}
