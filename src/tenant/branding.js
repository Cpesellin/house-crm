/**
 * Módulo: tenant/branding
 *
 * Aplica el branding del tenant activo al DOM:
 *   - <title> con nombre del tenant
 *   - CSS var --color-primario en :root
 *   - <link rel="icon"> con logo del tenant (fallback a /favicon.ico)
 *   - Reemplaza src de <img data-brand="logo"> en el shell del CRM
 *
 * Se llama DESPUÉS de initTenant() en main.js.
 * Idempotente — se puede llamar múltiples veces (util si se cambia de
 * tenant en dev con ?tenant=xxx).
 */

import { getCurrentTenant } from './current.js';

export function applyBranding() {
  const t = getCurrentTenant();
  if (!t) return;

  // 1) <title>
  if (t.nombre) {
    document.title = t.nombre + ' — CRM inmobiliario';
  }

  // 2) CSS var color primario (usada por --b600 en el diseño)
  if (t.color_primario) {
    document.documentElement.style.setProperty('--color-primario', t.color_primario);
    // Alias legacy que ya usa la app:
    document.documentElement.style.setProperty('--b600', t.color_primario);
  }

  // 3) Favicon
  if (t.logo_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = t.logo_url;
  }

  // 4) <img data-brand="logo"> en el shell (header, login, etc.)
  document.querySelectorAll('img[data-brand="logo"]').forEach((img) => {
    if (t.logo_url) img.src = t.logo_url;
    if (t.nombre) img.alt = t.nombre;
  });

  // 5) <span data-brand="nombre"> — para el header
  document.querySelectorAll('[data-brand="nombre"]').forEach((el) => {
    if (t.nombre) el.textContent = t.nombre;
  });

  // 6) <a data-brand="whatsapp"> — botón de contacto
  if (t.telefono) {
    document.querySelectorAll('a[data-brand="whatsapp"]').forEach((a) => {
      const clean = t.telefono.replace(/\D/g, '');
      a.href = `https://wa.me/${clean}`;
    });
  }
}

/**
 * Aplica un banner arriba si el tenant está en grace period o suspendido.
 * Útil para alertar al admin de que la suscripción está por vencer.
 */
export function applyAccessBanner() {
  const t = getCurrentTenant();
  if (!t?.acceso) return;

  const existing = document.getElementById('tenant-access-banner');
  if (existing) existing.remove();

  const { estado, grace_hasta, permitido } = t.acceso;

  // Solo mostrar banner si NO está en estado normal 'activa'
  if (estado === 'activa' || estado === 'trial') return;

  const banner = document.createElement('div');
  banner.id = 'tenant-access-banner';

  if (!permitido) {
    // Cortado
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px 16px;background:#dc2626;color:#fff;text-align:center;font-size:13px;font-weight:700';
    banner.innerHTML = '⛔ Tu suscripción está suspendida. Contactá soporte para reactivar.';
  } else if (estado === 'grace') {
    // Grace period
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 16px;background:#f59e0b;color:#fff;text-align:center;font-size:13px;font-weight:600';
    banner.innerHTML = `⚠️ Tu pago está pendiente. Regularizá antes del ${grace_hasta || 'próximo cobro'} para no perder el acceso.`;
  }

  if (banner.innerHTML) document.body.prepend(banner);
}

// Expose para debug
if (typeof window !== 'undefined') {
  window.__branding = { apply: applyBranding, accessBanner: applyAccessBanner };
}
