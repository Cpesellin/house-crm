/**
 * Módulo: design-v2/shell
 *
 * Inyecta los elementos del shell que el diseño v2 agrega y no existen
 * en el HTML actual:
 *   - Footer editorial (desktop y móvil)
 *   - Bottom nav bar (sólo móvil, reemplaza al hamburger para lo frecuente)
 *   - Badge "Actualizado hoy" en el hero
 *
 * NO reemplaza HTML existente — el header, hero y filtros se reestilizan
 * con CSS en tokens-v2.css. Acá sólo agregamos lo que falta.
 *
 * Todo se remueve si el flag se apaga.
 */

import { isV2 } from './flag.js';
import { icon } from '../ui/icons.js';
import { getCurrentTenant } from '../tenant/current.js';
import { tenantWaUrl } from '../tenant/config.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ══════════════════════════════════════════════════════════════════════
// Footer
// ══════════════════════════════════════════════════════════════════════
function buildFooter() {
  const t = getCurrentTenant();
  const nombre = t?.nombre || 'Inmobiliaria House';
  const ciudad = t?.ciudad || 'Pereira';
  const wa = tenantWaUrl('Hola, quiero más información');

  return `<footer class="v2-footer">
    <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:40px">
      <div>
        <div style="display:flex;align-items:center;gap:9px">
          <span style="width:30px;height:30px;border-radius:9px;background:var(--v2-primary);color:#fff;display:grid;place-items:center">${icon('home', 17)}</span>
          <span style="font-size:15.5px;font-weight:800;letter-spacing:-.02em">${esc(nombre)}</span>
        </div>
        <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:rgba(250,246,241,.6);max-width:300px">
          Inmuebles verificados en ${esc(ciudad)} y el Eje Cafetero. Acompañamos la compra, la venta y el arriendo sin costo para el cliente.
        </p>
      </div>
      <div>
        <div class="v2-footer-col-title">Explorar</div>
        <a href="#/portafolio">Todos los inmuebles</a>
        <a href="#/portafolio">Casas</a>
        <a href="#/portafolio">Apartamentos</a>
        <a href="#/portafolio">Arriendos</a>
      </div>
      <div>
        <div class="v2-footer-col-title">Servicios</div>
        <a href="#/publicar">Publicá tu inmueble</a>
        <a href="#/referidos-landing">Programa de referidos</a>
        <a href="#/signup">Soy inmobiliaria</a>
      </div>
      <div>
        <div class="v2-footer-col-title">Contacto</div>
        <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
        ${t?.telefono ? `<a href="tel:${esc(t.telefono)}">${esc(t.telefono)}</a>` : ''}
        <a href="#/cuenta">Mi cuenta</a>
      </div>
    </div>
    <div style="max-width:1200px;margin:32px auto 0;padding-top:20px;border-top:1px solid rgba(250,246,241,.12);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:12px;color:rgba(250,246,241,.45)">
      <span>© ${new Date().getFullYear()} ${esc(nombre)}. Todos los derechos reservados.</span>
      <span>Hecho en Colombia</span>
    </div>
  </footer>`;
}

// ══════════════════════════════════════════════════════════════════════
// Bottom nav (móvil)
// ══════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { id: 'portafolio', icon: 'search', label: 'Explorar',  go: 'portafolio' },
  { id: 'favoritos',  icon: 'heart',  label: 'Favoritos', go: 'favoritos', badge: () => (window.FAVS || []).length },
  { id: 'publicar',   icon: 'plus',   label: 'Publicar',  go: 'publicar' },
  { id: 'cuenta',     icon: 'user',   label: 'Cuenta',    go: 'cuenta' },
];

function buildBottomNav() {
  const ruta = (location.hash || '').replace('#/', '');
  const items = NAV_ITEMS.map((it) => {
    const activo = ruta === it.go || (it.go === 'portafolio' && (ruta === '' || ruta === 'inv'));
    const n = it.badge ? it.badge() : 0;
    const badge = n > 0 ? `<span class="v2-nav-badge">${n > 99 ? '99+' : n}</span>` : '';
    return `<button class="${activo ? 'on' : ''}" data-nav="${it.id}" onclick="window.go&&window.go('${it.go}')" aria-label="${esc(it.label)}"${activo ? ' aria-current="page"' : ''}>
      ${icon(it.icon, 21, { fill: it.id === 'favoritos' && activo ? 'currentColor' : 'none' })}
      <span>${esc(it.label)}</span>
      ${badge}
    </button>`;
  }).join('');

  return `<nav class="v2-bottomnav" aria-label="Navegación principal">${items}</nav>`;
}

// ══════════════════════════════════════════════════════════════════════
// Badge "Actualizado hoy" en el hero
// ══════════════════════════════════════════════════════════════════════
function injectHeroBadge() {
  const hero = document.getElementById('invHeader');
  if (!hero || document.getElementById('v2HeroBadge')) return;
  const inner = hero.querySelector('div[style*="position:relative"]') || hero;
  const badge = document.createElement('div');
  badge.id = 'v2HeroBadge';
  badge.style.cssText = 'display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:var(--v2-r-full);background:var(--v2-paper);border:1px solid var(--v2-line);font-size:12px;font-weight:600;color:var(--v2-ink-2);margin-bottom:14px';
  const ciudad = getCurrentTenant()?.ciudad || 'Pereira';
  badge.innerHTML = `<span style="width:6px;height:6px;border-radius:999px;background:var(--v2-green)"></span>Actualizado hoy · ${esc(ciudad)} y Eje Cafetero`;
  inner.insertBefore(badge, inner.firstChild);
}

// ══════════════════════════════════════════════════════════════════════
// Instalación / limpieza
// ══════════════════════════════════════════════════════════════════════
function mount() {
  const app = document.getElementById('app');
  if (!app) return;

  // Footer: al final del contenedor de la sección visible
  if (!document.querySelector('.v2-footer')) {
    const host = document.getElementById('sec-inv') || document.getElementById('sec-portafolio') || app;
    host.insertAdjacentHTML('beforeend', buildFooter());
  }

  // Bottom nav: al final del body
  if (!document.querySelector('.v2-bottomnav')) {
    document.body.insertAdjacentHTML('beforeend', buildBottomNav());
  }

  injectHeroBadge();
}

function unmount() {
  document.querySelectorAll('.v2-footer, .v2-bottomnav, #v2HeroBadge').forEach((el) => el.remove());
}

/** Refresca el estado activo del bottom nav al cambiar de ruta */
function syncNav() {
  const nav = document.querySelector('.v2-bottomnav');
  if (!nav) return;
  nav.outerHTML = buildBottomNav();
}

export function installShellV2() {
  if (!isV2()) { unmount(); return; }

  // Esperar a que el shell del CRM exista
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (document.getElementById('invHeader') || document.getElementById('res')) {
      mount();
      clearInterval(t);
    }
    if (tries > 30) clearInterval(t);
  }, 300);

  window.addEventListener('hashchange', () => {
    if (!isV2()) return;
    syncNav();
    setTimeout(injectHeroBadge, 100);
  });
}

if (typeof window !== 'undefined') {
  window.__v2shell = { install: installShellV2, mount, unmount, syncNav };
}
