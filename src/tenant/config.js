/**
 * Módulo: tenant/config
 *
 * Helpers para acceder a la config del tenant activo desde CUALQUIER
 * parte del código, sin necesidad de importar getCurrentTenant() ni
 * conocer la estructura interna.
 *
 * Fallback a House si no hay tenant cargado (defensivo — no debería
 * pasar si initTenant() se ejecutó, pero soporta llamadas tempranas).
 */

import { getCurrentTenant } from './current.js';
import { HOUSE_PHONE, HOUSE_PHONE_TEL, HOUSE_PHONE_DISPLAY } from '../core/constants.js';

/**
 * Teléfono sin caracteres especiales (formato wa.me/{numero})
 * Ej: '573105922763'
 */
export function tenantPhone() {
  const t = getCurrentTenant();
  if (t?.telefono) return t.telefono.replace(/\D/g, '');
  return HOUSE_PHONE;
}

/** Teléfono con prefijo + (formato tel:) */
export function tenantPhoneTel() {
  const t = getCurrentTenant();
  if (t?.telefono) return t.telefono.startsWith('+') ? t.telefono : '+' + t.telefono.replace(/\D/g, '');
  return HOUSE_PHONE_TEL;
}

/** Teléfono formateado para mostrar (ej: '310 592 2763') */
export function tenantPhoneDisplay() {
  const t = getCurrentTenant();
  if (t?.telefono) {
    const clean = t.telefono.replace(/\D/g, '').replace(/^57/, '');
    if (clean.length === 10) return clean.slice(0,3) + ' ' + clean.slice(3,6) + ' ' + clean.slice(6);
    return t.telefono;
  }
  return HOUSE_PHONE_DISPLAY;
}

/** Nombre comercial ("Inmobiliaria House", "Inmobiliaria XYZ") */
export function tenantName() {
  return getCurrentTenant()?.nombre || 'Inmobiliaria House';
}

/** Nombre corto (primera palabra útil — para saludos y CTAs) */
export function tenantShortName() {
  const n = tenantName();
  // "Inmobiliaria House" → "House"
  const withoutPrefix = n.replace(/^Inmobiliaria\s+/i, '').trim();
  return withoutPrefix || n;
}

/** URL a wa.me con mensaje opcional */
export function tenantWaUrl(mensaje) {
  const phone = tenantPhone();
  const text = mensaje ? '?text=' + encodeURIComponent(mensaje) : '';
  return `https://wa.me/${phone}${text}`;
}

/** Dominio custom del tenant (para construir URLs de share) */
export function tenantDomain() {
  const t = getCurrentTenant();
  return t?.dominio_custom || 'inmobiliariahouse.com.co';
}

/** URL base https del dominio del tenant */
export function tenantBaseUrl() {
  return 'https://' + tenantDomain();
}

/** Color primario (útil para inline styles cuando CSS var no alcanza) */
export function tenantColor() {
  return getCurrentTenant()?.color_primario || '#1d4ed8';
}

/** Logo URL */
export function tenantLogo() {
  return getCurrentTenant()?.logo_url || '/img/logo.png';
}

// Exposición para código legacy (functions.js, sections.js, etc.)
if (typeof window !== 'undefined') {
  window.__tenantCfg = {
    phone: tenantPhone,
    phoneTel: tenantPhoneTel,
    phoneDisplay: tenantPhoneDisplay,
    name: tenantName,
    shortName: tenantShortName,
    waUrl: tenantWaUrl,
    domain: tenantDomain,
    baseUrl: tenantBaseUrl,
    color: tenantColor,
    logo: tenantLogo,
  };
}
