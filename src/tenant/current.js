/**
 * Módulo: tenant/current
 *
 * SCAFFOLDING MULTI-TENANT (no activo aún).
 *
 * Detecta y expone el tenant actual. Por ahora devuelve un tenant default
 * (Inmobiliaria House) mientras no haya subdominios configurados. Cuando
 * se active el multi-tenant, este módulo será el único punto de entrada
 * — el resto de la app llama getCurrentTenant() sin saber cómo se detectó.
 *
 * ESTRATEGIA DE DETECCIÓN (cuando se active):
 *   1. Subdominio: `<slug>.plataforma.com` → lookup en API billing
 *   2. Header X-Tenant (para SSR/API)
 *   3. Fallback default (útil en dev local)
 *
 * FEATURE FLAG: window.__MULTITENANT__ = true activa la detección real.
 * Por defecto está en false → todo el código llama a esto pero recibe
 * el tenant default sin cambios de comportamiento.
 */

// Tenant default (Inmobiliaria House). Se mantiene hasta que se active
// multi-tenant. Estructura preparada para lo que va a venir.
const DEFAULT_TENANT = Object.freeze({
  id: 'house',                                  // slug/id interno
  nombre: 'Inmobiliaria House',
  color_primario: '#1d4ed8',
  logo_url: '/img/logo.png',
  dominio: 'inmobiliariahouse.com.co',
  telefono: '+573105922763',
  email: 'info@inmobiliariahouse.com.co',
  // Config plan (se pobla desde billing cuando esté activo)
  plan: {
    id: 'enterprise',
    incluye_crm: true,
    incluye_admin: true,
  },
});

let _currentTenant = DEFAULT_TENANT;

/**
 * Devuelve el tenant actual. Puro (no async) para llamadas frecuentes
 * desde renderers. La detección real de subdominio corre una vez en
 * initTenant() y cachea el resultado.
 */
export function getCurrentTenant() {
  return _currentTenant;
}

/**
 * Detección de tenant. Se llama una vez desde main.js al arrancar.
 * Actualmente NO hace nada real (feature flag OFF) — devuelve el default.
 *
 * Cuando se active multi-tenant:
 *   1. Extrae subdominio de location.hostname
 *   2. Consulta billing.plataforma.com/api/tenant/{slug}
 *   3. Cachea el resultado en _currentTenant
 *   4. Aplica branding (logo, colores) al document
 */
export async function initTenant() {
  if (!window.__MULTITENANT__) {
    // Feature flag OFF — todo funciona como antes con Inmobiliaria House
    return _currentTenant;
  }

  // Placeholder: cuando se active se implementa acá
  const subdominio = extractSubdomain(location.hostname);
  if (!subdominio || subdominio === 'www') {
    return _currentTenant;
  }

  // TODO cuando se active: consultar billing y hidratar _currentTenant
  console.warn('[tenant] Multi-tenant activo pero fetch aún no implementado');
  return _currentTenant;
}

function extractSubdomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  return parts[0];
}

// Expuesto en window para debugging
if (typeof window !== 'undefined') {
  window.__tenant = { get: getCurrentTenant, init: initTenant };
}
