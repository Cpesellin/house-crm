/**
 * Módulo: domains/public/view-v2
 *
 * Ficha pública del inmueble con el diseño v2 (editorial cálido).
 * Es la Pantalla 2 del brief — la de mayor impacto en conversión
 * después de la landing.
 *
 * PRESERVA toda la lógica de view.js:
 *   - Fetch del inmueble con captador y fotos
 *   - history.pushState + popstate para que el back vuelva al portafolio
 *   - Galería con pubNav/pubGo y swipe táctil
 *   - CTAs según perfil (visitante / cliente / interno)
 *   - Tracking de compartir_wa y llamar
 *
 * CAMBIA la presentación al sistema v2: tokens, iconos SVG, layout
 * editorial con jerarquía tipográfica.
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { tenantPhone, tenantShortName, tenantBaseUrl } from '../../tenant/config.js';
import { icon } from '../../ui/icons.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Card de spec individual */
function specCard(iconName, valor, label) {
  return `<div style="padding:14px 10px;background:var(--v2-paper);border:1px solid var(--v2-line);border-radius:var(--v2-r-md);text-align:center">
    <div style="display:grid;place-items:center;color:var(--v2-ink-4);margin-bottom:6px">${icon(iconName, 20)}</div>
    <div style="font-size:17px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums">${esc(valor)}</div>
    <div style="font-size:9.5px;color:var(--v2-ink-3);text-transform:uppercase;letter-spacing:.06em;margin-top:3px;font-weight:600">${esc(label)}</div>
  </div>`;
}

export async function showPublicViewV2(id) {
  const lov = document.getElementById('lov');
  if (lov) lov.style.display = 'none';
  const app = document.getElementById('app');
  if (!app) return;

  // Loading
  app.innerHTML = `<div style="min-height:100vh;background:var(--v2-cream);display:grid;place-items:center">
    <div style="text-align:center;color:var(--v2-ink-3)">
      <div style="width:52px;height:52px;border-radius:var(--v2-r-lg);background:var(--v2-cream-3);display:grid;place-items:center;margin:0 auto 14px" class="v2-skeleton"></div>
      <div style="font-size:14px;font-weight:600">Cargando inmueble…</div>
    </div>
  </div>`;

  try {
    const { data: p } = await SB().from('inmuebles')
      .select('*,captador:usuarios!captador_id(nombre,telefono_contacto),fotos(id,url,url_thumb,origen,orden)')
      .eq('id', id).eq('eliminado', false).single();

    if (!p) {
      app.innerHTML = `<div style="min-height:100vh;background:var(--v2-cream);display:grid;place-items:center;padding:24px">
        <div style="text-align:center;max-width:380px">
          <div style="width:64px;height:64px;border-radius:var(--v2-r-xl);background:var(--v2-cream-3);display:grid;place-items:center;margin:0 auto 20px;color:var(--v2-ink-4)">${icon('home', 28)}</div>
          <h1 style="margin:0;font-size:21px;font-weight:800;letter-spacing:-.02em">Inmueble no encontrado</h1>
          <p style="margin:8px 0 20px;font-size:14px;color:var(--v2-ink-3);line-height:1.55">Este enlace puede haber expirado o el inmueble ya no está publicado.</p>
          <a class="v2-btn v2-btn-solid" style="padding:0 22px;text-decoration:none" href="/#/portafolio">Ver inmuebles disponibles</a>
        </div>
      </div>`;
      return;
    }

    const fotos = p.fotos ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];
    const capTel = tenantPhone();
    const _u = U();
    const esInterno = _u && (_u.tipo_usuario === 'interno' || !_u.tipo_usuario);
    const capNom = esInterno ? (p.captador?.nombre || tenantShortName()) : tenantShortName();
    const cod = p.codigo_house || '';
    const pv = p.precio_venta || 0;
    const pa = p.precio_arriendo || 0;
    const neg = pv > 0 && pa > 0 ? 'Venta y arriendo' : pa > 0 ? 'Arriendo' : 'Venta';
    const negColor = pv > 0 && pa > 0
      ? { bg: 'var(--v2-amber-soft)', fg: 'var(--v2-amber)' }
      : pa > 0
        ? { bg: 'var(--v2-green-soft)', fg: '#059669' }
        : { bg: 'var(--v2-primary-soft)', fg: 'var(--v2-primary)' };

    const base = tenantBaseUrl();
    const shareUrl = base + '/ver/' + (cod || id);
    const waUrl = 'https://wa.me/' + capTel + '?text=' + encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: ' + shareUrl);
    const telUrl = 'tel:+' + capTel;

    // El bottom-nav móvil se oculta mientras la ficha está abierta:
    // los CTAs del inmueble tienen prioridad sobre la navegación.
    document.body.classList.add('v2-ficha-abierta');

    // Back button → vuelve al portafolio
    const prevHash = location.hash || '#/portafolio';
    try { history.pushState({ pubViewId: id }, '', location.href); } catch (e) { /* noop */ }
    const restore = () => {
      window.removeEventListener('popstate', onPop);
      document.body.classList.remove('v2-ficha-abierta');
      const target = prevHash.startsWith('#') ? prevHash : '#/portafolio';
      if (location.hash === target) location.reload();
      else { location.hash = target; location.reload(); }
    };
    const onPop = () => restore();
    window.addEventListener('popstate', onPop);
    window._closePubView = () => { try { history.back(); } catch (e) { restore(); } };

    // ── Galería ──────────────────────────────────────────────────
    const galeria = fotos.length ? `
      <div style="position:relative;background:var(--v2-ink)" id="pub-gal">
        <img id="pub-img" src="${esc(fotos[0].url)}" alt="${esc(p.tipo || 'Inmueble')}" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block" onerror="window.drFallback&&window.drFallback(this)">
        ${fotos.length > 1 ? `
          <button onclick="pubNav(-1)" aria-label="Foto anterior" style="position:absolute;top:50%;left:12px;transform:translateY(-50%);width:40px;height:40px;border-radius:var(--v2-r-full);background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:none;color:var(--v2-ink);cursor:pointer;display:grid;place-items:center">${icon('chevronLeft', 18)}</button>
          <button onclick="pubNav(1)" aria-label="Foto siguiente" style="position:absolute;top:50%;right:12px;transform:translateY(-50%);width:40px;height:40px;border-radius:var(--v2-r-full);background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:none;color:var(--v2-ink);cursor:pointer;display:grid;place-items:center">${icon('chevronRight', 18)}</button>` : ''}
        <div id="pub-ct" class="v2-photo-count" style="bottom:14px;right:14px;font-size:12px;padding:5px 10px">${icon('camera', 12)}1 / ${fotos.length}</div>
      </div>
      ${fotos.length > 1 ? `
        <div style="display:flex;gap:6px;overflow-x:auto;padding:10px 16px;background:var(--v2-paper);border-bottom:1px solid var(--v2-line);scrollbar-width:none">
          ${fotos.map((f, i) => `<img src="${esc(f.url_thumb || f.url)}" onclick="pubGo(${i})" data-pub-thumb="${i}" alt="Foto ${i + 1}" style="width:64px;height:64px;object-fit:cover;border-radius:var(--v2-r-sm);cursor:pointer;border:2px solid ${i === 0 ? 'var(--v2-primary)' : 'transparent'};opacity:${i === 0 ? '1' : '.55'};flex-shrink:0;transition:opacity .15s,border-color .15s" onerror="window.drFallback&&window.drFallback(this)">`).join('')}
        </div>` : ''}`
      : `<div style="aspect-ratio:16/10;background:var(--v2-cream-3);display:grid;place-items:center;color:var(--v2-ink-4);gap:10px">
          ${icon('camera', 34)}<span style="font-size:13px;font-weight:600">Sin fotos disponibles</span>
        </div>`;

    // ── Specs ────────────────────────────────────────────────────
    const specs = [];
    if (p.habitaciones) specs.push(specCard('bed', p.habitaciones, 'Habitaciones'));
    if (p.banos) specs.push(specCard('bath', p.banos, 'Baños'));
    if (p.area_construida) specs.push(specCard('area', p.area_construida + 'm²', 'Construida'));
    if (p.area_total) specs.push(specCard('area', p.area_total + 'm²', 'Área total'));
    if (p.parqueaderos) specs.push(specCard('car', p.parqueaderos, 'Parqueaderos'));
    if (p.estrato) specs.push(specCard('home', p.estrato, 'Estrato'));

    // ── Amenidades ───────────────────────────────────────────────
    const ams = (p.caracteristicas || '').split(',').map((s) => s.trim()).filter(Boolean);

    // ── Precio ───────────────────────────────────────────────────
    let precioHtml = '';
    if (pv > 0) {
      precioHtml += `<div${pa > 0 ? ' style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--v2-line-2)"' : ''}>
        <div style="font-size:11px;color:var(--v2-ink-3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Precio de venta</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums">${fm(pv)}</div>
      </div>`;
    }
    if (pa > 0) {
      precioHtml += `<div>
        <div style="font-size:11px;color:var(--v2-ink-3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Canon de arriendo</div>
        <div style="font-size:${pv > 0 ? '24' : '30'}px;font-weight:800;letter-spacing:-.03em;color:#059669;font-variant-numeric:tabular-nums">${fm(pa)}<span style="font-size:14px;font-weight:500;color:var(--v2-ink-3)"> /mes</span></div>
      </div>`;
    }
    if (!pv && !pa) precioHtml = `<div style="font-size:17px;font-weight:600;color:var(--v2-ink-3)">Precio a consultar</div>`;

    if (p.valor_administracion > 0) {
      precioHtml += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--v2-line-2);font-size:13px;color:var(--v2-ink-3)">Administración: <b style="color:var(--v2-ink);font-weight:600">${fm(p.valor_administracion)}</b>/mes</div>`;
    }

    // ── Track params (para los CTAs) ─────────────────────────────
    const trk = `{inmueble_id:'${id}',ciudad:'${esc((p.ciudad || '').replace(/'/g, ''))}',barrio:'${esc((p.barrio || '').replace(/'/g, ''))}',tipo_inmueble:'${esc((p.tipo || '').replace(/'/g, ''))}',negociacion:'${neg}',precio:${pv || pa || 0},habitaciones:${p.habitaciones || 0}}`;

    // ── Render ───────────────────────────────────────────────────
    app.innerHTML = `
      <div style="min-height:100vh;background:var(--v2-cream);padding-bottom:96px">

        <div style="position:sticky;top:0;z-index:50;background:rgba(250,246,241,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--v2-line);height:60px;display:flex;align-items:center;gap:12px;padding:0 16px">
          <button onclick="window._closePubView&&window._closePubView()" aria-label="Volver" style="width:36px;height:36px;border-radius:var(--v2-r-full);background:var(--v2-cream-2);border:1px solid var(--v2-line);color:var(--v2-ink);cursor:pointer;display:grid;place-items:center;flex-shrink:0">${icon('chevronLeft', 18)}</button>
          <span style="width:30px;height:30px;border-radius:9px;background:var(--v2-primary);color:#fff;display:grid;place-items:center;flex-shrink:0">${icon('home', 17)}</span>
          <span style="font-size:15.5px;font-weight:800;letter-spacing:-.02em">${esc(tenantShortName())}</span>
          <div style="flex:1"></div>
          <button onclick="window.shareInmueble&&window.shareInmueble('${esc(cod || id)}','${esc((p.tipo || 'Inmueble') + ' en ' + (p.barrio || p.ciudad || ''))}')" aria-label="Compartir" style="width:36px;height:36px;border-radius:var(--v2-r-full);background:var(--v2-cream-2);border:1px solid var(--v2-line);color:var(--v2-ink-2);cursor:pointer;display:grid;place-items:center">${icon('share', 16)}</button>
        </div>

        ${galeria}

        <div style="max-width:760px;margin:0 auto;padding:24px 16px 0">

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <span class="v2-badge" style="background:${negColor.bg};color:${negColor.fg};font-size:12px;padding:5px 11px">${esc(p.tipo || 'Inmueble')} en ${esc(neg.toLowerCase())}</span>
            ${cod ? `<span class="v2-badge" style="background:var(--v2-cream-2);border:1px solid var(--v2-line-3);color:var(--v2-ink-3);font-family:var(--v2-font-mono);font-size:11px;letter-spacing:.06em">${esc(cod)}</span>` : ''}
          </div>

          <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:-.035em;line-height:1.1">${esc(p.direccion_publica || p.barrio || p.tipo || 'Inmueble')}</h1>
          ${p.ciudad ? `<div style="display:flex;align-items:center;gap:5px;font-size:14.5px;color:var(--v2-ink-3);margin-top:8px">${icon('pin', 15, { color: 'var(--v2-ink-4)' })}${esc([p.barrio, p.ciudad].filter(Boolean).join(' · '))}</div>` : ''}

          <div style="margin-top:22px;padding:22px;background:var(--v2-paper);border:1px solid var(--v2-line);border-radius:var(--v2-r-lg);box-shadow:var(--v2-sh-sm)">
            ${precioHtml}
          </div>

          ${specs.length ? `
            <div style="margin-top:28px">
              <h2 style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--v2-ink-3)">Detalles de la propiedad</h2>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px">${specs.join('')}</div>
            </div>` : ''}

          ${ams.length ? `
            <div style="margin-top:28px;padding-top:24px;border-top:1px solid var(--v2-line)">
              <h2 style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--v2-ink-3)">Amenidades</h2>
              <div style="display:flex;flex-wrap:wrap;gap:7px">
                ${ams.map((a) => `<span style="padding:7px 14px;border-radius:var(--v2-r-full);font-size:13px;font-weight:500;background:var(--v2-paper);border:1px solid var(--v2-line);color:var(--v2-ink-2)">${esc(a)}</span>`).join('')}
              </div>
            </div>` : ''}

          ${p.descripcion_cliente ? `
            <div style="margin-top:28px;padding-top:24px;border-top:1px solid var(--v2-line)">
              <h2 style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--v2-ink-3)">Descripción</h2>
              <div style="font-size:15px;line-height:1.72;color:var(--v2-ink-2);white-space:pre-line">${esc(p.descripcion_cliente)}</div>
            </div>` : ''}

          <div style="margin-top:28px;padding:18px;background:var(--v2-paper);border:1px solid var(--v2-line);border-radius:var(--v2-r-lg);display:flex;align-items:center;gap:14px">
            <div style="width:46px;height:46px;border-radius:var(--v2-r-full);background:var(--v2-primary);display:grid;place-items:center;font-size:18px;color:#fff;font-weight:800;flex-shrink:0">${esc((capNom || 'H')[0].toUpperCase())}</div>
            <div style="flex:1">
              <div style="font-size:15px;font-weight:700">${esc(capNom)}</div>
              <div style="font-size:12.5px;color:var(--v2-ink-3);margin-top:2px">Asesor inmobiliario · ${esc(tenantShortName())}</div>
            </div>
            <a href="${waUrl}" target="_blank" rel="noopener" class="v2-btn" style="background:#25d366;color:#fff;border:none;padding:0 16px;text-decoration:none;flex-shrink:0">${icon('chat', 15)}Escribir</a>
          </div>

          <div style="margin-top:28px;padding:24px;border-radius:var(--v2-r-xl);background:linear-gradient(100deg,var(--v2-primary-tint) 0%,var(--v2-paper) 70%);border:1px solid var(--v2-line);text-align:center">
            <div style="font-size:19px;font-weight:800;letter-spacing:-.02em;margin-bottom:5px">¿Buscás algo parecido?</div>
            <div style="font-size:14px;color:var(--v2-ink-3);margin-bottom:16px">Tenemos más inmuebles verificados en ${esc(p.ciudad || 'la zona')}.</div>
            <a href="/#/portafolio" class="v2-btn v2-btn-solid" style="padding:0 22px;text-decoration:none">Ver todo el portafolio${icon('chevronRight', 15)}</a>
          </div>

          <div style="height:32px"></div>
        </div>

        <div style="position:fixed;bottom:0;left:0;right:0;z-index:60;background:rgba(250,246,241,.96);backdrop-filter:blur(12px);border-top:1px solid var(--v2-line);padding:12px 16px max(12px,env(safe-area-inset-bottom))">
          <div style="max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:8px">
            <button class="v2-btn v2-btn-solid" style="width:100%;height:48px;font-size:15px" onclick="window.abrirInteres&&window.abrirInteres('${id}')">${icon('heart', 17)}Me interesa este inmueble</button>
            <div style="display:flex;gap:8px">
              <a href="${waUrl}" target="_blank" rel="noopener" class="v2-btn" style="flex:1;height:44px;background:#25d366;color:#fff;border:none;text-decoration:none" onclick="window.trackEvent&&window.trackEvent('compartir_wa',${trk})">${icon('chat', 16)}WhatsApp</a>
              <a href="${telUrl}" class="v2-btn v2-btn-outline" style="flex:1;height:44px;text-decoration:none" onclick="window.trackEvent&&window.trackEvent('llamar',${trk})">${icon('phone', 16)}Llamar</a>
            </div>
          </div>
        </div>
      </div>`;

    // Estado de la galería
    window._pubFotos = fotos.map((f) => f.url);
    window._pubIdx = 0;

    // Swipe táctil
    const gal = document.getElementById('pub-gal');
    if (gal) {
      let sx = 0;
      gal.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) window.pubNav(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
  } catch (e) {
    console.error('[view-v2]', e);
    app.innerHTML = `<div style="min-height:100vh;background:var(--v2-cream);display:grid;place-items:center;padding:24px">
      <div style="text-align:center;max-width:360px">
        <div style="width:64px;height:64px;border-radius:var(--v2-r-xl);background:var(--v2-red-soft);display:grid;place-items:center;margin:0 auto 20px;color:var(--v2-red)">${icon('alert', 28)}</div>
        <h1 style="margin:0;font-size:20px;font-weight:800">Error de conexión</h1>
        <p style="margin:8px 0 0;font-size:14px;color:var(--v2-ink-3)">${esc(e.message)}</p>
      </div>
    </div>`;
  }
}

/**
 * pubGo v2: además de cambiar la foto, actualiza el borde del thumbnail
 * activo y el contador con formato "n / total".
 */
export function pubGoV2(i) {
  const f = window._pubFotos;
  if (!f || !f.length) return;
  window._pubIdx = i;

  const img = document.getElementById('pub-img');
  if (img) {
    img._tried = false;
    img.onerror = function () { window.drFallback && window.drFallback(this); };
    img.src = f[i];
  }

  const ct = document.getElementById('pub-ct');
  if (ct) ct.innerHTML = `${icon('camera', 12)}${i + 1} / ${f.length}`;

  document.querySelectorAll('[data-pub-thumb]').forEach((t, j) => {
    t.style.border = '2px solid ' + (j === i ? 'var(--v2-primary)' : 'transparent');
    t.style.opacity = j === i ? '1' : '.55';
  });
}

if (typeof window !== 'undefined') {
  window.showPublicViewV2 = showPublicViewV2;
  window.pubGoV2 = pubGoV2;
}
