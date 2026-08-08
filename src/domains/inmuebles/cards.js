/**
 * Módulo: domains/inmuebles/cards
 *
 * Renderer principal del inventario: dibuja las tarjetas de inmuebles en
 * #res (grilla .pgr) con foto/carousel, precio, specs, favorito, share,
 * y un action button que varía por perfil (visitante/cliente/vendedor/
 * interno). Solo muestra los primeros 60 items para no bloquear la UI.
 *
 * También filtra estados finales (Arrendado/Vendido/Retirado) y precarga
 * los counts de "interesados" en batch para evitar N+1 en el badge.
 *
 * Dependencias externas (window.*):
 *   fm, emo, diasDesde, eV, eA, eA2 (helpers de load.js)
 *   D, userStore, SOL, FAVS, FINAL_STATES
 *   cldOpt, drFallback, cardNav, oM
 *   precargarCountsInteresados, badgeInteresadosInmueble, getCachedIntCount
 *   escapeHtml, renderReferralBanner
 *   abrirInteres, abrirChat, showPublicView, trackPropertyView, go
 *   toast, toggleFavorito, shareInmueble
 */

import { HOUSE_PHONE } from '../../core/constants.js';

// ─── Shortcuts locales con fallback (igual patrón que functions.js) ──
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
const emo = window.emo || ((t) => { t = (t || '').toLowerCase(); if (t.includes('penthouse')) return '👑'; if (t.includes('finca')) return '🌾'; if (t.includes('apto') || t.includes('apartamento')) return '🏢'; if (t.includes('casa')) return '🏡'; return '🏠'; });
const eV = window.eV || ((p) => (p.negociacion || '').toLowerCase().includes('venta'));
const eA = window.eA || ((p) => { const n = (p.negociacion || '').toLowerCase(); return n.includes('arriendo') || n.includes('renta'); });
const eA2 = window.eA2 || ((p) => eV(p) && eA(p));

// ─── Renderer principal ───────────────────────────────────────────────
export function render(ls) {
  const el = document.getElementById('res');
  if (!el) return;
  const D = window.D || [];
  const U = window.userStore?.get();
  const _tipoU = U?.tipo_usuario || (U ? 'interno' : 'visitante');
  // Visitantes (sin login) → externos: sin dirección real, sin asesor, sin portales.
  const _isExt = !U || _tipoU === 'publico';

  const FINAL = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
  const filtered = (ls || []).filter((p) => !FINAL.includes(p.estado));

  if (!filtered.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">🔍</span><h3>Sin resultados</h3></div>';
    return;
  }

  ls = filtered;
  const rcEl = document.getElementById('resCount');
  if (rcEl) rcEl.textContent = ls.length;
  let h = '<div class="pgr">';

  // ⚡ Batch precarga de counts de interesados (evita N+1).
  if (!_isExt && typeof window.precargarCountsInteresados === 'function') {
    const ids = ls.slice(0, 60).map((p) => p.id).filter(Boolean);
    window.precargarCountsInteresados(ids).then((map) => {
      ids.forEach((id) => {
        const bEl = document.getElementById('badgeInt-' + id);
        if (!bEl) return;
        const n = map.get(id) || 0;
        const span = bEl.querySelector('.int-count');
        if (span) span.textContent = n;
        if (n > 0) {
          bEl.style.background = '#3b82f6';
          bEl.style.color = '#fff';
          bEl.style.borderColor = '#3b82f6';
        }
      });
    }).catch(() => { /* noop */ });
  }

  ls.slice(0, 60).forEach((p) => {
    const idx = D.indexOf(p);
    const tip = p.tipo || 'Inmueble';
    const ciu = p.ciudad || '';
    const ase = _isExt ? '' : (p.captador ? p.captador.nombre : '');
    const pv = p.precio_venta || 0;
    const pa = p.precio_arriendo || 0;
    const hab = p.habitaciones || '';
    const ban = p.banos || '';
    const area = p.area_construida || '';
    const est = p.estrato || '';
    const dias = p._dias || 0;
    const am = eA2(p), sv = eV(p) && !am, sa = eA(p) && !am;
    const hc = am ? 'tb' : sv ? 'tv' : 'ta';
    const m2 = _isExt ? false : !!(p.url_metrocuadrado || '').trim();
    const fr = _isExt ? false : !!(p.url_fincaraiz || '').trim();
    const cod = _isExt ? '' : (p.codigo_house || '');
    const esMio = U && p.captador_id === U.id;

    const canSeeDir = _isExt ? false : (esMio || U?.rol === 'admin' || U?.rol === 'oficina'
      || (U?.es_gestor_arriendos && (p.negociacion || '').toLowerCase().includes('arriendo')));
    const dirTxt = canSeeDir ? (p.direccion || '') : (p.direccion_publica || p.barrio || '');
    const ubiTxt = dirTxt ? (dirTxt + (ciu ? ' · ' + ciu : '')) : ('📍 ' + ciu);

    let ab = '';
    if (dias !== null && !_isExt) {
      const cl = dias <= 7 ? 'agn' : dias <= 20 ? 'ago' : dias <= 40 ? 'agw' : 'agd';
      ab = `<span class="agb ${cl}">${dias === 0 ? 'Hoy' : dias + 'd'}</span>`;
    }

    let md = '';
    if (sv || am) md += '<span class="mb mbv">💰</span>';
    if (sa || am) md += '<span class="mb mba">🔑</span>';

    let pr = '<div class="pbl">';
    if (pv > 0) pr += `<div class="pvt">${fm(pv)} <small>venta</small></div>`;
    if (pa > 0) pr += `<div class="par">${fm(pa)} <small>/mes</small></div>`;
    if (!pv && !pa) pr += '<div style="font-size:10px;color:var(--g400)">Consultar</div>';
    pr += '</div>';

    const sp2 = [
      hab && hab != 0 ? `<span class="sp">🛏️${hab}</span>` : '',
      ban && ban != 0 ? `<span class="sp">🚿${ban}</span>` : '',
      area ? `<span class="sp">📐${area}m²</span>` : '',
      est ? `<span class="sp">E${est}</span>` : '',
    ].filter(Boolean).join('');

    const hasF = p.fotos && p.fotos.length > 0;
    const sortedFotos = hasF ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];

    let cardTop = '';
    if (hasF) {
      const _cld = window.cldOpt || ((u) => u);
      const fUrls = sortedFotos.map((f) => _cld(f.url_thumb || f.url, 600));
      const cid = 'car_' + idx;
      cardTop = `<div class="pc-car" id="${cid}" data-fotos='${JSON.stringify(fUrls)}' data-idx="0"><img src="${fUrls[0]}" onerror="drFallback&&drFallback(this)">`;
      if (sortedFotos.length > 1) cardTop += `<button class="car-nav prev" onclick="event.stopPropagation();cardNav&&cardNav('${cid}',-1)">‹</button><button class="car-nav next" onclick="event.stopPropagation();cardNav&&cardNav('${cid}',1)">›</button>`;
      if (sortedFotos.length > 1 && sortedFotos.length <= 6) cardTop += `<div class="car-dots">${sortedFotos.map((_, j) => `<div class="car-dot ${j === 0 ? 'act' : ''}"></div>`).join('')}</div>`;
      cardTop += `<span class="car-count">📷 ${sortedFotos.length}</span>${ab}</div>`;
    } else {
      cardTop = `<div class="pctop ${hc}" style="position:relative">${ab}<div class="pce">${emo(tip)}</div><div class="pctt">${tip}</div><div class="pccy">${ciu}</div></div><div class="pc-nofoto">📷 Sin foto disponible</div>`;
    }

    // Action button — varía por perfil
    const capTel2 = HOUSE_PHONE;
    const capNom2 = 'House';
    const prevUrl2 = (p.codigo_house || '')
      ? 'https://inmobiliariahouse.com.co/ver/' + encodeURIComponent(p.codigo_house)
      : 'https://inmobiliariahouse.com.co/ver/' + p.id;
    const esInmExterno = p.origen === 'externo';
    let actBtn;
    if (_isExt) {
      const _isVisitor = !U;
      const _isCli = _tipoU === 'publico';
      if (_isVisitor) {
        actBtn = `<div style="display:flex;gap:4px"><button class="vb" style="flex:1" onclick="event.stopPropagation();window.trackPropertyView&&window.trackPropertyView('${p.id}');showPublicView('${p.id}')">Ver detalle →</button><button class="vb" style="flex:1;background:var(--b50);color:var(--b700);border:1.5px solid var(--b200)" onclick="event.stopPropagation();abrirInteres('${p.id}')">💙 Me interesa</button></div>`;
      } else if (esInmExterno) {
        actBtn = `<div style="display:flex;gap:4px"><button class="vb" style="flex:1;background:var(--b600);color:#fff;border:none" onclick="event.stopPropagation();abrirChat('${p.captador_id || p.captador?.id || ''}','${p.id}')">💬 Contactar</button><a class="vb" style="flex:1;text-align:center;text-decoration:none" href="${prevUrl2}" target="_blank" onclick="event.stopPropagation()">Ver detalle →</a></div>`;
      } else if (_isCli) {
        actBtn = `<div style="display:flex;gap:4px"><a class="vb" style="flex:1;text-align:center;text-decoration:none" href="${prevUrl2}" target="_blank" onclick="event.stopPropagation()">Ver detalle →</a><button class="vb" style="flex:1;background:var(--b50);color:var(--b700);border:1.5px solid var(--b200)" onclick="event.stopPropagation();abrirInteres('${p.id}')">💙 Me interesa</button></div>`;
      } else {
        actBtn = `<div style="display:flex;gap:4px"><a class="vb" style="flex:1;text-align:center;background:#25d366;color:#fff;text-decoration:none;border:none" href="https://wa.me/${capTel2}?text=${encodeURIComponent('Hola ' + capNom2 + ', estoy interesado en este inmueble: ' + prevUrl2)}" target="_blank" onclick="event.stopPropagation()">💬 WhatsApp</a><button class="vb" style="flex:1;background:var(--b50);color:var(--b700);border:1.5px solid var(--b200)" onclick="event.stopPropagation();abrirChat('${p.captador_id || p.captador?.id || ''}','${p.id}')">🏠 Me interesa</button></div>`;
      }
    } else {
      const _badgeI = typeof window.badgeInteresadosInmueble === 'function'
        ? window.badgeInteresadosInmueble(p.id) : '';
      actBtn = `<div style="display:flex;gap:6px;align-items:center"><button class="vb" style="flex:1" onclick="oM&&oM(${idx})">Ver detalle →</button>${_badgeI}</div>`;
    }

    const ptbHtml = _isExt ? '' : `<div class="ptb">${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}</div>`;

    // Fav button — visitantes ven un corazón gateado (dispara auth prompt)
    let favBtn;
    const _isFavP = (window.FAVS || []).includes(p.id);
    if (U) {
      favBtn = `<button aria-label="Favorito" style="position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;min-width:32px;border-radius:50%;background:${_isFavP ? '#e11d73' : 'rgba(0,0,0,.45)'};border:none;color:#fff;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:'Segoe UI Symbol','Apple Color Emoji','Noto Color Emoji',sans-serif" onclick="event.stopPropagation();toggleFavorito('${p.id}')">${_isFavP ? '♥' : '♡'}</button>`;
    } else {
      favBtn = `<button aria-label="Favorito" style="position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;min-width:32px;border-radius:50%;background:rgba(0,0,0,.45);border:none;color:#fff;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:'Segoe UI Symbol','Apple Color Emoji','Noto Color Emoji',sans-serif" onclick="event.stopPropagation();toggleFavorito('${p.id}')">♡</button>`;
    }

    // Share button — DISPONIBLE PARA TODOS los perfiles.
    const _shareCode = (p.codigo_house || p.id || '').replace(/'/g, '');
    const _shareTitle = ((p.tipo || 'Inmueble') + ' en ' + (p.barrio || p.ciudad || '')).replace(/'/g, '');
    const shareBtn = `<button aria-label="Compartir inmueble" title="Compartir inmueble" style="position:absolute;top:8px;right:48px;z-index:3;width:36px;height:36px;min-width:36px;border-radius:50%;background:rgba(29,78,216,.92);border:2px solid #fff;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);box-shadow:0 2px 6px rgba(0,0,0,.25)" onclick="event.stopPropagation();window.shareInmueble&&window.shareInmueble('${_shareCode}','${_shareTitle}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/></svg></button>`;

    if (hasF) {
      h += `<div class="pc" style="position:relative">${favBtn}${shareBtn}${cardTop}<div class="pcbd"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:18px">${emo(tip)}</span><div style="flex:1"><div style="display:flex;align-items:center;gap:6px"><div style="font-size:14px;font-weight:800">${tip}</div>${cod ? `<span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${cod}');toast('📋 ${cod} copiado')">${cod}</span>` : ''}</div><div style="font-size:11px;color:var(--sub)">${ubiTxt}</div></div></div><div class="mods">${md}</div>${pr}${sp2 ? `<div class="sps">${sp2}</div>` : ''}${ase ? `<div class="asl">👤 ${ase}</div>` : ''}${ptbHtml}${actBtn}</div></div>`;
    } else {
      h += `<div class="pc" style="position:relative">${favBtn}${shareBtn}${cardTop}<div class="pcbd">${cod ? `<div style="margin-bottom:4px"><span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${cod}');toast('📋 ${cod} copiado')">${cod}</span></div>` : ''}<div class="mods">${md}</div>${pr}${sp2 ? `<div class="sps">${sp2}</div>` : ''}${ase ? `<div class="asl">👤 ${ase}</div>` : ''}${ptbHtml}${actBtn}</div></div>`;
    }
  });

  h += '</div>';

  if (_isExt && typeof window.renderReferralBanner === 'function') {
    h += window.renderReferralBanner();
  }
  if (_isExt) {
    h += '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-radius:16px;padding:20px;margin:20px 0;text-align:center;border:1.5px solid #bbf7d0"><div style="font-size:28px;margin-bottom:8px">🏠</div><div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;color:#065f46;margin-bottom:6px">¿Tienes un inmueble?</div><div style="font-size:13px;color:#064e3b;margin-bottom:12px">Publica hasta 3 inmuebles gratis y llega a cientos de clientes</div><button onclick="go(\'publicar\')" style="padding:12px 24px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:#065f46;color:#fff;cursor:pointer;font-family:inherit">Publicar inmueble gratis →</button></div>';
  }

  el.innerHTML = h;
}

// Compat: expuesto en window (filters.doSearch llama window.render(list))
if (typeof window !== 'undefined') {
  window.render = render;
}
