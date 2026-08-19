/**
 * Módulo: domains/public/view
 *
 * Vista pública de un inmueble — el que ve el visitante al abrir un link
 * compartido (/ver/HOUSE-XXX). Reemplaza el shell del CRM con una página
 * dedicada (header + galería + info + CTAs), con back-button que restaura
 * el portafolio original.
 *
 * Superficie expuesta:
 *   showPublicView(id) → renderiza la vista completa
 *   pubNav(dir) / pubGo(i) → navegación de galería
 *   _pubFotos / _pubIdx → state global de la galería
 *   _closePubView → helper para cerrar (push history back)
 *
 * Deps window.*: escapeHtml, trackEvent, abrirInteres, drFallback
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { HOUSE_PHONE } from '../../core/constants.js';
import { tenantPhone, tenantShortName, tenantBaseUrl } from '../../tenant/config.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));

window.showPublicView = async function (id) {
  const lov = document.getElementById('lov');
  if (lov) lov.style.display = 'none';
  const app = document.getElementById('app');

  try {
    const { data: p } = await SB().from('inmuebles')
      .select('*,captador:usuarios!captador_id(nombre,telefono_contacto),fotos(id,url,url_thumb,origen,orden)')
      .eq('id', id).eq('eliminado', false).single();
    if (!p) {
      app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">🏠</div><h3 style="font-size:18px;font-weight:800;color:#1e293b">Inmueble no encontrado</h3><p style="color:#94a3b8;font-size:13px;margin-top:6px">Este enlace puede haber expirado o el inmueble fue retirado.</p></div></div>';
      return;
    }

    const fotos = p.fotos ? p.fotos.sort((a, b) => a.orden - b.orden) : [];
    const capTel = tenantPhone();
    const _u = U();
    const _isInternal = _u && (_u.tipo_usuario === 'interno' || !_u.tipo_usuario);
    const capNom = _isInternal ? (p.captador?.nombre || tenantShortName()) : tenantShortName();
    const cod = p.codigo_house || '';
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    const neg = pv > 0 && pa > 0 ? 'Venta y Arriendo' : pa > 0 ? 'Arriendo' : 'Venta';

    // Contacto abierto (visitantes incluidos)
    const _waUrl = 'https://wa.me/' + capTel + '?text=' + encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: ' + tenantBaseUrl() + '/ver/' + (cod || id));
    const _telUrl = 'tel:+' + capTel;

    // Push history state: back button vuelve al portafolio en vez de salir del sitio
    const _prevHash = location.hash || '#/portafolio';
    try { history.pushState({ pubViewId: id }, '', location.href); } catch (e) { /* noop */ }
    const _restorePubView = () => {
      window.removeEventListener('popstate', _onPubPop);
      const target = _prevHash.startsWith('#') ? _prevHash : '#/portafolio';
      if (location.hash === target) { location.reload(); }
      else { location.hash = target; location.reload(); }
    };
    const _onPubPop = () => { _restorePubView(); };
    window.addEventListener('popstate', _onPubPop);
    window._closePubView = () => { try { history.back(); } catch (e) { _restorePubView(); } };

    let h = '';

    // Header fijo
    h += `<div style="position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <button onclick="window._closePubView&&window._closePubView()" aria-label="Cerrar" style="width:32px;height:32px;border-radius:50%;background:#f1f5f9;border:none;color:#1e293b;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
      <img src="/img/logo.png" style="height:30px">
      <span style="font-family:'Fraunces',serif;font-size:16px;font-weight:800;color:#1e293b;letter-spacing:-.3px">House</span>
      <div style="flex:1"></div>
      <a href="${_waUrl}" target="_blank" style="padding:6px 14px;background:#25d366;color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">Contactar</a>
    </div>`;

    h += '<div style="max-width:560px;margin:0 auto;padding:0 0 80px;background:#fff;min-height:100vh">';

    // Galería
    if (fotos.length > 0) {
      h += `<div style="position:relative;background:#000" id="pub-gal">
        <img id="pub-img" src="${fotos[0].url}" style="width:100%;height:320px;object-fit:contain;display:block" onerror="drFallback&&drFallback(this)">`;
      if (fotos.length > 1) {
        h += `<button onclick="pubNav(-1)" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)">‹</button>`;
        h += `<button onclick="pubNav(1)" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)">›</button>`;
      }
      h += `<span id="pub-ct" style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px">1/${fotos.length}</span>`;
      h += `</div>`;

      if (fotos.length > 1) {
        h += `<div style="display:flex;gap:3px;overflow-x:auto;padding:8px 12px;background:#f8fafc">`;
        fotos.forEach((f, i) => {
          h += `<img src="${f.url_thumb || f.url}" onclick="pubGo(${i})" style="width:52px;height:52px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i === 0 ? '#3b82f6' : 'transparent'};opacity:${i === 0 ? '1' : '.6'};flex-shrink:0" onerror="drFallback&&drFallback(this)" data-pub-thumb="${i}">`;
        });
        h += `</div>`;
      }
    }

    // Info principal
    h += `<div style="padding:20px 16px">`;
    h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#3b82f6">${p.tipo || 'Inmueble'} en ${neg}</span>
      ${cod ? `<span style="font-size:9px;font-weight:800;padding:2px 8px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:4px;font-family:monospace;letter-spacing:1px">${cod}</span>` : ''}
    </div>`;

    const _ehPub = window.escapeHtml || ((s) => String(s || ''));
    h += `<h1 style="font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:#1e293b;line-height:1.2;margin:0">${_ehPub(p.direccion_publica || p.barrio || '')}</h1>`;
    h += `<p style="font-size:13px;color:#64748b;margin-top:4px">${_ehPub(p.ciudad || '')}</p>`;

    // Precios
    h += `<div style="margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">`;
    if (pv > 0) h += `<div style="margin-bottom:${pa > 0 ? '10px' : '0'}"><div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:2px">Precio de Venta</div><div style="font-family:'Fraunces',serif;font-size:26px;font-weight:800;color:#1e293b">${fm(pv)}</div></div>`;
    if (pa > 0) h += `<div><div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:2px">Canon de Arriendo</div><div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#065f46">${fm(pa)}<span style="font-size:13px;font-weight:500;color:#64748b"> /mes</span></div></div>`;
    h += `</div>`;

    // Specs grid
    const specs = [];
    if (p.habitaciones) specs.push({ v: p.habitaciones, l: 'Habitaciones', i: '🛏️' });
    if (p.banos) specs.push({ v: p.banos, l: 'Baños', i: '🚿' });
    if (p.area_construida) specs.push({ v: p.area_construida + 'm²', l: 'Área Construida', i: '📐' });
    if (p.area_total) specs.push({ v: p.area_total + 'm²', l: 'Área Total', i: '📏' });
    if (p.estrato) specs.push({ v: p.estrato, l: 'Estrato', i: '⭐' });
    if (p.parqueaderos) specs.push({ v: p.parqueaderos, l: 'Parqueaderos', i: '🚗' });

    if (specs.length) {
      h += `<div style="margin-top:20px"><div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Detalles de la Propiedad</div>`;
      h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`;
      specs.forEach((s) => {
        h += `<div style="padding:12px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center">
          <div style="font-size:18px;margin-bottom:4px">${s.i}</div>
          <div style="font-size:16px;font-weight:800;color:#1e293b">${s.v}</div>
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">${s.l}</div>
        </div>`;
      });
      h += `</div></div>`;
    }

    // Amenidades
    const ams = (p.caracteristicas || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ams.length) {
      h += `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Amenidades</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${ams.map((a) => `<span style="padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569">${a}</span>`).join('')}</div>
      </div>`;
    }

    // Descripción
    if (p.descripcion_cliente) {
      h += `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Descripción</div>
        <div style="font-size:14px;line-height:1.7;color:#475569">${(window.escapeHtml || String)(p.descripcion_cliente)}</div>
      </div>`;
    }

    // Asesor
    h += `<div style="margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:800">${(capNom || 'H')[0].toUpperCase()}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:700;color:#1e293b">${capNom}</div><div style="font-size:11px;color:#94a3b8">Asesor inmobiliario · House</div></div>
    </div>`;

    h += `</div>`; // close padding

    // Footer sticky CTAs
    h += `<div style="position:fixed;bottom:0;left:0;right:0;z-index:50;background:#fff;border-top:1px solid #e2e8f0;padding:10px 16px;box-shadow:0 -2px 10px rgba(0,0,0,.06)">
      <div style="max-width:720px;margin:0 auto">
        <button onclick="window.abrirInteres('${id}')" style="width:100%;padding:14px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px;font-family:inherit">💙 Me interesa este inmueble</button>
        <div style="display:flex;gap:8px">
          <a href="${_waUrl}" target="_blank" onclick="window.trackEvent && window.trackEvent('compartir_wa',{inmueble_id:'${id}',ciudad:'${(p.ciudad || '').replace(/'/g, '')}',barrio:'${(p.barrio || '').replace(/'/g, '')}',tipo_inmueble:'${(p.tipo || '').replace(/'/g, '')}',negociacion:'${neg}',precio:${pv || pa || 0},habitaciones:${p.habitaciones || 0}})" style="flex:1;padding:12px;background:#25d366;color:#fff;border-radius:10px;text-align:center;font-size:13px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">💬 WhatsApp</a>
          <a href="${_telUrl}" onclick="window.trackEvent && window.trackEvent('llamar',{inmueble_id:'${id}',ciudad:'${(p.ciudad || '').replace(/'/g, '')}',barrio:'${(p.barrio || '').replace(/'/g, '')}',tipo_inmueble:'${(p.tipo || '').replace(/'/g, '')}',negociacion:'${neg}',precio:${pv || pa || 0},habitaciones:${p.habitaciones || 0}})" style="flex:1;padding:12px;background:#2563eb;color:#fff;border-radius:10px;text-align:center;font-size:13px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">📞 Llamar</a>
        </div>
      </div>
    </div>`;

    // Banners CTA
    const baseUrl = window.location.origin;
    h += `<div style="padding:0 16px 20px">`;
    h += `<div style="margin-top:20px;padding:24px 20px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#f0f1ff);border:1.5px solid #bfdbfe;text-align:center">
      <div style="font-size:32px;margin-bottom:6px">🏠</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">Encuentra tu inmueble ideal</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:14px">Explora propiedades en Pereira y el Eje Cafetero</div>
      <a href="${baseUrl}/#/portafolio" style="display:inline-block;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;background:#2563eb;color:#fff;text-decoration:none;margin-bottom:6px">🔍 Explorar inmuebles</a>
      <div style="font-size:10px;color:#94a3b8;margin-top:8px">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>`;
    h += `<div style="margin-top:12px;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#f0fdf4,#f0fdf8);border:1.5px solid #bbf7d0;text-align:center">
      <div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:6px">¿También tienes un inmueble?</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Llega a miles de clientes en Pereira</div>
      <a href="${baseUrl}/?reg=1" style="display:inline-block;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;background:#065f46;color:#fff;text-decoration:none">🏠 Publicar mi inmueble gratis</a>
    </div>`;
    h += `</div>`;

    h += `</div>`; // close max-width

    app.innerHTML = h;
    window._pubFotos = fotos.map((f) => f.url);
    window._pubIdx = 0;

    // Swipe gallery
    const gal = document.getElementById('pub-gal');
    if (gal) {
      let sx = 0;
      gal.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) window.pubNav(dx < 0 ? 1 : -1); }, { passive: true });
    }
  } catch (e) {
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">❌</div><h3 style="font-size:18px;color:#1e293b">Error de conexión</h3><p style="color:#94a3b8;font-size:13px;margin-top:6px">' + e.message + '</p></div></div>';
  }
};

window.pubNav = function (dir) {
  const f = window._pubFotos;
  if (!f || !f.length) return;
  window._pubIdx = (window._pubIdx + dir + f.length) % f.length;
  window.pubGo(window._pubIdx);
};

window.pubGo = function (i) {
  const f = window._pubFotos;
  if (!f) return;
  window._pubIdx = i;
  const img = document.getElementById('pub-img');
  if (img) {
    img._tried = false;
    img.onerror = function () { window.drFallback && window.drFallback(this); };
    img.src = f[i];
  }
  const ct = document.getElementById('pub-ct');
  if (ct) ct.textContent = (i + 1) + '/' + f.length;
  document.querySelectorAll('[data-pub-thumb]').forEach((t, j) => {
    t.style.border = '2px solid ' + (j === i ? '#3b82f6' : 'transparent');
    t.style.opacity = j === i ? '1' : '.6';
  });
};
