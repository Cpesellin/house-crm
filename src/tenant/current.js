/**
 * Módulo: tenant/current
 *
 * Detección y cache del tenant actual. Cuando el multi-tenant está
 * activo, resuelve por subdominio contra el RPC get_tenant_by_slug.
 *
 * DETECCIÓN (en orden):
 *   1. Query param ?tenant=xxx (útil para dev y previews)
 *   2. Subdomain: <slug>.plataforma.com → slug
 *   3. Custom domain: busca en inmobiliaria.metadata.dominio_custom
 *   4. Fallback: DEFAULT_TENANT (Inmobiliaria House)
 *
 * FEATURE FLAG:
 *   window.__MULTITENANT__ = true activa la detección real
 *   OFF (default) → siempre devuelve House sin llamar al RPC
 *
 * API:
 *   getCurrentTenant()      → tenant sincrónico (usa cache)
 *   initTenant()            → async, ejecutado 1 vez al arranque
 *   getCurrentTenantSlug()  → slug del tenant (útil para logs)
 */

import { getSupabaseClient } from '../config/supabase.js';

// Default tenant (Inmobiliaria House). Se usa como fallback si:
//   - Feature flag OFF
//   - Detección de subdominio falla
//   - RPC retorna NULL
// ⚠️ Con el multi-tenant APAGADO (que es el estado actual) la app nunca
// consulta la base: usa SIEMPRE este objeto. O sea que corregir la ficha
// en Supabase no cambia nada si no se corrige también aquí.
//
// Pasó exactamente eso: la ficha tenía color_primario '#1d4ed8', un azul
// que no es el de las piezas de la marca ('#0d2a52'). Se corrigió en la
// base y el home habría seguido saliendo del color equivocado, porque el
// valor real venía de esta constante.
//
// Regla: este objeto debe reflejar la ficha de House en la base. Si se
// cambia allá, se cambia aquí.
const DEFAULT_TENANT = Object.freeze({
  id: 'house',
  slug: 'house',
  nombre: 'Inmobiliaria House',
  color_primario: '#0d2a52',
  logo_url: '/img/logo.png',
  telefono: '+573105922763',
  ciudad: 'Pereira',
  direccion: 'Calle 14 #14-09, Pereira, Risaralda',
  email: 'info@inmobiliariahouse.com',
  lema: 'Más que inmuebles, creamos hogares',
  // Foto del hero: HOUSE-109, casa campestre en Pereira al atardecer.
  // Elegida a mano entre las candidatas del portafolio — el hero es la
  // única imagen que no puede fallar, y automatizar la elección habría
  // puesto un cuarto de lavado en la portada (pasó al revisar candidatas).
  // Recortada a 1600x900 con encuadre automático y formato negociado.
  hero_foto_url: 'https://res.cloudinary.com/dfelsbmbo/image/upload/w_1600,h_900,c_fill,g_auto,q_auto:good,f_auto/v1776981590/fichas_inmobiliarias/hxbvfxdvfjetdfigucgp.png',
  og_imagen_url: null,
  horario: null,
  redes: {},
  dominio_custom: 'inmobiliariahouse.com.co',
  acceso: { permitido: true, estado: 'activa', grace_hasta: null },
});

let _currentTenant = DEFAULT_TENANT;
let _initPromise = null;

export function getCurrentTenant() {
  return _currentTenant;
}

export function getCurrentTenantSlug() {
  return _currentTenant?.slug || 'house';
}

/**
 * Extrae el candidato de slug desde la URL:
 *   ?tenant=xxx → xxx (dev/preview)
 *   xxx.plataforma.com → xxx (subdominio)
 *   inmobiliariahouse.com.co → null (custom domain, se resuelve por metadata)
 *   localhost → null
 */
function detectSlugFromLocation() {
  const params = new URLSearchParams(location.search);
  const qParam = params.get('tenant');
  if (qParam) return qParam.toLowerCase().trim();

  const host = location.hostname;
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split('.');
  // Subdominio genuino: al menos 3 partes y la primera != www
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0].toLowerCase();

  return null;
}

/**
 * Detección por dominio custom (ej: inmobiliariahouse.com.co → house).
 * Busca en inmobiliaria.metadata->>'dominio_custom'.
 */
async function detectSlugByCustomDomain(hostname) {
  try {
    const SB = getSupabaseClient();
    const { data, error } = await SB
      .from('inmobiliaria')
      .select('slug')
      .eq('activo', true)
      .filter('metadata->>dominio_custom', 'eq', hostname)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.slug;
  } catch (e) {
    console.warn('[tenant] custom domain lookup failed:', e);
    return null;
  }
}

/**
 * Fetch de la config del tenant vía RPC. Retorna null si no existe.
 */
async function fetchTenantBySlug(slug) {
  try {
    const SB = getSupabaseClient();
    const { data, error } = await SB.rpc('get_tenant_by_slug', { p_slug: slug });
    if (error) { console.warn('[tenant] RPC error:', error.message); return null; }
    return data || null;
  } catch (e) {
    console.warn('[tenant] fetch failed:', e);
    return null;
  }
}

/**
 * Inicialización — se llama UNA vez desde main.js. Idempotente.
 * Con feature flag OFF: retorna default sin fetch.
 * Con feature flag ON: detecta slug + fetch + cachea.
 */
export function initTenant() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    if (!window.__MULTITENANT__) {
      // Feature flag OFF — House hardcoded (comportamiento actual)
      return _currentTenant;
    }

    // 1) Slug directo de la URL (subdomain o ?tenant=)
    let slug = detectSlugFromLocation();

    // 2) Fallback: buscar por dominio custom
    if (!slug) {
      slug = await detectSlugByCustomDomain(location.hostname);
    }

    // 3) Si no se pudo detectar, quedarse con House
    if (!slug) {
      console.warn('[tenant] no se pudo detectar slug, usando House');
      return _currentTenant;
    }

    // 4) Fetch config real
    const config = await fetchTenantBySlug(slug);
    if (!config) {
      console.warn('[tenant] slug "%s" no encontrado, usando House', slug);
      return _currentTenant;
    }

    _currentTenant = Object.freeze(config);
    return _currentTenant;
  })();

  return _initPromise;
}

// Exposición para debug + acceso desde otros módulos legacy
if (typeof window !== 'undefined') {
  // `set` existe para poder VERIFICAR el comportamiento multi-inquilino
  // sin crear inmobiliarias de prueba en la base de datos.
  //
  // Hace falta: el home es de marca blanca y hay que comprobar que
  // funciona con otro nombre, otro color, sin logo, sin foto de hero y
  // con inventarios de 3 o de 3.000 inmuebles. Sin esta entrada la única
  // forma sería ensuciar los datos reales del cliente.
  //
  // No cambia nada si nadie la llama, y el arranque normal nunca la usa.
  window.__tenant = {
    get: getCurrentTenant,
    init: initTenant,
    slug: getCurrentTenantSlug,
    set: (t) => { _currentTenant = t || DEFAULT_TENANT; return _currentTenant; },
  };
}
