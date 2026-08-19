/**
 * Módulo: design-v2/bridge
 *
 * Conecta el diseño v2 con los módulos existentes SIN reescribirlos.
 *
 * ESTRATEGIA:
 *   Guarda las funciones originales (v1) y reemplaza window.render /
 *   window.renderSel / updatePills por dispatchers que eligen la
 *   implementación según el flag. Si el flag está OFF, se llama a la
 *   original tal cual — cero cambio de comportamiento.
 *
 * ORDEN DE CARGA (importante):
 *   main.js debe importar este módulo DESPUÉS de cards.js, filters.js
 *   y cards-v2.js, para que las originales ya estén en window.
 */

import { isV2 } from './flag.js';
import { renderV2 } from '../domains/inmuebles/cards-v2.js';
import { showPublicViewV2, pubGoV2 } from '../domains/public/view-v2.js';
import { icon } from '../ui/icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Guardamos las originales una sola vez
let _renderV1 = null;
let _renderSelV1 = null;
let _showPublicViewV1 = null;
let _pubGoV1 = null;

// ══════════════════════════════════════════════════════════════════════
// Dispatcher de render (grid de tarjetas)
// ══════════════════════════════════════════════════════════════════════
function installRenderDispatcher() {
  if (_renderV1) return; // ya instalado
  _renderV1 = window.render;
  if (typeof _renderV1 !== 'function') {
    console.warn('[design-v2] window.render no existe todavía');
    return;
  }

  window.render = function (ls) {
    if (isV2()) return renderV2(ls);
    return _renderV1(ls);
  };
}

// ══════════════════════════════════════════════════════════════════════
// Dispatcher de la ficha pública (/ver/HOUSE-XXX)
// ══════════════════════════════════════════════════════════════════════
function installFichaDispatcher() {
  if (_showPublicViewV1) return;
  _showPublicViewV1 = window.showPublicView;
  _pubGoV1 = window.pubGo;

  if (typeof _showPublicViewV1 !== 'function') {
    console.warn('[design-v2] window.showPublicView no existe todavía');
    return;
  }

  window.showPublicView = function (id) {
    if (isV2()) return showPublicViewV2(id);
    return _showPublicViewV1(id);
  };

  // pubNav delega en pubGo, así que basta con enrutar pubGo
  window.pubGo = function (i) {
    if (isV2()) return pubGoV2(i);
    return _pubGoV1 ? _pubGoV1(i) : undefined;
  };
}

// ══════════════════════════════════════════════════════════════════════
// Pills de filtro con estilo v2
// ══════════════════════════════════════════════════════════════════════

/** Mapea cada pill del shell a su icono SVG y el emoji que reemplaza */
const PILL_META = {
  pillNeg:    { icon: 'tag',   emoji: '🏷️' },
  pillCiu:    { icon: 'pin',   emoji: '📍' },
  pillTipo:   { icon: 'grid',  emoji: '🏢' },
  pillPrecio: { icon: 'money', emoji: '💰' },
  pillAsesor: { icon: 'user',  emoji: '👤' },
};

/** Emojis que el shell v1 mete en las pills — se limpian en v2 */
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️♥♡✓✔✗]/gu;

/**
 * Sustituye el emoji de una pill por su icono SVG y agrega chevron.
 * Idempotente: marca la pill con data-v2-iconed para no repetir.
 */
function swapPillIcon(el, iconName) {
  if (el.dataset.v2Iconed === '1') return;

  // Limpiamos emojis de los nodos de texto directos
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) n.textContent = n.textContent.replace(EMOJI_RE, '').trim();
  });
  // También del span de label (pillNegTxt, etc)
  el.querySelectorAll('span').forEach((s) => {
    if (!s.querySelector('svg')) s.textContent = s.textContent.replace(EMOJI_RE, '').trim();
  });

  // Icono al principio
  if (iconName && !el.querySelector('[data-v2-icon]')) {
    const wrap = document.createElement('span');
    wrap.dataset.v2Icon = '1';
    wrap.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0';
    wrap.innerHTML = icon(iconName, 13, { color: 'currentColor' });
    el.insertBefore(wrap, el.firstChild);
  }

  // El shell v1 ya trae su propio chevron (.pill-chev). Lo reemplazamos
  // por el SVG del sistema v2 en vez de agregar un segundo.
  const chevV1 = el.querySelector('.pill-chev');
  if (chevV1) {
    chevV1.outerHTML = `<span data-v2-chev="1" style="display:inline-flex;align-items:center;flex-shrink:0;margin-left:auto">${icon('chevronDown', 12, { color: 'currentColor', strokeWidth: 2.2 })}</span>`;
  } else if (!el.querySelector('[data-v2-chev]')) {
    const chev = document.createElement('span');
    chev.dataset.v2Chev = '1';
    chev.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0;margin-left:auto';
    chev.innerHTML = icon('chevronDown', 12, { color: 'currentColor', strokeWidth: 2.2 });
    el.appendChild(chev);
  }

  el.dataset.v2Iconed = '1';
}

/**
 * Repinta las pills existentes con las clases v2. No cambia los IDs
 * ni los handlers — sólo el look. Se llama después de updatePills().
 */
function restylePillsV2() {
  const F = window.F || {};
  const openPanel = window._openPanel;

  Object.entries(PILL_META).forEach(([id, meta]) => {
    const el = document.getElementById(id);
    if (!el) return;

    let activa = false;
    if (id === 'pillNeg')    activa = (F.neg?.size || 0) > 0;
    if (id === 'pillCiu')    activa = (F.ciu?.size || 0) > 0;
    if (id === 'pillTipo')   activa = (F.tipo?.size || 0) > 0;
    if (id === 'pillPrecio') activa = String(el.textContent || '').includes('✓');
    if (id === 'pillAsesor') activa = !!window._asesorFilter;

    const abierta = openPanel && id.toLowerCase().includes(String(openPanel).toLowerCase().slice(0, 4));
    el.className = 'v2-pill' + (activa || abierta ? ' v2-pill-on' : '');
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';

    swapPillIcon(el, meta.icon);
  });

  // Toggles secundarios: "Míos" y "Favoritos"
  const toggles = { myToggle: 'check', favToggle: 'heart' };
  Object.entries(toggles).forEach(([id, iconName]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const activo = id === 'myToggle' ? window._myFilter : window._favFilterActive;
    btn.className = 'v2-pill' + (activo ? ' v2-pill-on' : '');
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';

    // El shell repinta estos botones (toggleMis/toggleFavFilter reescriben
    // innerHTML), así que detectamos por la presencia del SVG en vez de
    // confiar en un flag: si desapareció, lo volvemos a poner.
    const yaTieneIcono = !!btn.querySelector('svg');
    if (!yaTieneIcono) {
      const label = btn.textContent
        .replace(EMOJI_RE, '')
        .replace(/[✓✕♥♡🔒]/gu, '')
        .trim() || (id === 'myToggle' ? 'Míos' : 'Favoritos');
      btn.innerHTML = (iconName ? icon(iconName, 13, { color: 'currentColor', fill: activo ? 'currentColor' : 'none' }) : '')
        + `<span>${esc(label)}</span>`;
    } else if (iconName) {
      // Sólo actualizar el fill del corazón según estado
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', activo ? 'currentColor' : 'none');
    }
  });
}

// ══════════════════════════════════════════════════════════════════════
// Selection bar (chips de filtros activos) con estilo v2
// ══════════════════════════════════════════════════════════════════════
function installRenderSelDispatcher() {
  if (_renderSelV1) return;
  _renderSelV1 = window.renderSel;
  if (typeof _renderSelV1 !== 'function') {
    console.warn('[design-v2] window.renderSel no existe todavía');
    return;
  }

  window.renderSel = function () {
    // Siempre corremos la original: mantiene la lógica de qué chips van
    const out = _renderSelV1.apply(this, arguments);
    if (!isV2()) return out;

    // Repintamos con clases v2
    const chipsEl = document.getElementById('selChips');
    if (chipsEl) {
      chipsEl.querySelectorAll('.sel-chip').forEach((chip) => {
        const onclick = chip.getAttribute('onclick') || '';
        const xSpan = chip.querySelector('.sel-x');
        const label = xSpan
          ? chip.textContent.replace(xSpan.textContent, '').trim()
          : chip.textContent.trim();
        chip.className = 'v2-chip';
        chip.removeAttribute('style');
        chip.innerHTML = `${esc(label)}<button type="button" class="v2-chip-x" aria-label="Quitar filtro" onclick="event.stopPropagation();${onclick}">✕</button>`;
      });
    }

    const bar = document.getElementById('selBar');
    if (bar && bar.style.display !== 'none') {
      bar.style.borderTop = '1px solid var(--v2-line-2)';
      bar.style.paddingTop = '14px';
      bar.style.background = 'transparent';
    }

    restylePillsV2();
    return out;
  };
}

// ══════════════════════════════════════════════════════════════════════
// Skeleton mientras carga
// ══════════════════════════════════════════════════════════════════════
export function showSkeletons(n = 6) {
  if (!isV2()) return;
  const el = document.getElementById('res');
  if (!el) return;
  el.innerHTML = window.renderV2Skeletons ? window.renderV2Skeletons(n) : '';
}

// ══════════════════════════════════════════════════════════════════════
// Instalación
// ══════════════════════════════════════════════════════════════════════
export function installBridge() {
  installRenderDispatcher();
  installRenderSelDispatcher();
  installFichaDispatcher();

  // Repintar pills en cada cambio de filtro (updatePills es interna
  // de filters.js, así que enganchamos por evento de click en la barra)
  document.addEventListener('click', (e) => {
    if (!isV2()) return;
    if (e.target.closest('.pill, .v2-pill, .fpanel, #selChips')) {
      setTimeout(restylePillsV2, 0);
    }
  });

  // Primer repintado cuando el shell ya existe
  if (isV2()) {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (document.getElementById('pillNeg')) {
        restylePillsV2();
        observeToggles();
        clearInterval(t);
      }
      if (tries > 20) clearInterval(t);
    }, 300);
  }
}

/**
 * myToggle y favToggle los repinta otro módulo (load.js / filters.js)
 * después de nuestro restyle, borrando el SVG. Un observer acotado a
 * esos dos nodos los vuelve a estilar sin pelear con el otro código.
 * El guard `_reentry` evita el bucle observer → cambio → observer.
 */
let _reentry = false;
function observeToggles() {
  const nodes = ['myToggle', 'favToggle']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!nodes.length || !window.MutationObserver) return;

  const obs = new MutationObserver(() => {
    if (_reentry || !isV2()) return;
    _reentry = true;
    try { restylePillsV2(); } finally {
      // Liberamos en el siguiente tick, ya aplicados nuestros cambios
      setTimeout(() => { _reentry = false; }, 0);
    }
  });

  nodes.forEach((n) => obs.observe(n, { childList: true, characterData: true, subtree: true }));
}

if (typeof window !== 'undefined') {
  window.__v2bridge = { install: installBridge, restylePills: restylePillsV2, skeletons: showSkeletons };
}
