/**
 * DETECTOR DE VERSIÓN NUEVA
 * ══════════════════════════════════════════════════════════════════════
 *
 * El navegador conserva el index.html cacheado, y ese HTML apunta al
 * bundle antiguo por su nombre con hash. Resultado: se despliega un
 * arreglo, el servidor ya lo sirve, y el asesor sigue ejecutando la
 * versión de ayer sin saberlo — depurando un error que ya no existe.
 *
 * Pasó el 2026-08-26: producción servía index-B4D5jWda.js y el navegador
 * seguía cargando index-BX2wnJVc.js, reportando un ReferenceError ya
 * corregido.
 *
 * Cómo lo detecta: pide el index.html sin caché y compara el nombre del
 * bundle con el que está corriendo. Si cambió, hay versión nueva.
 * No hace falta un número de versión ni tocar el build: el hash del
 * nombre ya cambia con cada despliegue.
 *
 * Nunca recarga solo. Un asesor puede estar a medio registrar un
 * inmueble, y recargarle la página le borraría el formulario: avisa y
 * deja que decida.
 */

const CADA = 5 * 60 * 1000; // cada 5 minutos
const RX_BUNDLE = /assets\/index-[A-Za-z0-9_-]+\.js/;

let _actual = null;
let _timer = null;
let _avisado = false;

/** Nombre del bundle que está corriendo ahora mismo. */
function bundleActual() {
  const s = [...document.querySelectorAll('script[src]')]
    .map((x) => x.getAttribute('src') || '')
    .find((x) => RX_BUNDLE.test(x));
  return s ? (s.match(RX_BUNDLE) || [])[0] : null;
}

/** Nombre del bundle que el servidor sirve en este momento. */
async function bundleServidor() {
  const r = await fetch('/?_v=' + Date.now(), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!r.ok) return null;
  const html = await r.text();
  return (html.match(RX_BUNDLE) || [])[0] || null;
}

function mostrarAviso() {
  if (_avisado || document.getElementById('vcAviso')) return;
  _avisado = true;

  const el = document.createElement('div');
  el.id = 'vcAviso';
  el.setAttribute('role', 'status');
  el.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));' +
    'z-index:99999;display:flex;align-items:center;gap:12px;padding:11px 14px;' +
    'background:#2c2520;color:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.28);' +
    'font-family:inherit;font-size:13px;max-width:min(92vw,420px)';
  el.innerHTML =
    '<span style="flex:1;line-height:1.35">Hay una versión nueva de la app.</span>' +
    '<button id="vcRecargar" style="flex:0 0 auto;padding:7px 13px;border:none;border-radius:8px;' +
    'background:#fff;color:#2c2520;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Actualizar</button>' +
    '<button id="vcCerrar" aria-label="Ignorar" style="flex:0 0 auto;padding:7px 9px;border:none;border-radius:8px;' +
    'background:transparent;color:#b9b0a6;font-family:inherit;font-size:14px;cursor:pointer">✕</button>';

  document.body.appendChild(el);

  el.querySelector('#vcRecargar').addEventListener('click', () => {
    // El reload normal puede devolver la copia cacheada: forzamos una URL
    // distinta para que el navegador vuelva a pedir el HTML.
    location.replace(location.pathname + '?_v=' + Date.now() + location.hash);
  });
  el.querySelector('#vcCerrar').addEventListener('click', () => {
    el.remove();
    // Que se pueda volver a avisar si sigue desactualizado más tarde.
    _avisado = false;
  });
}

async function comprobar() {
  try {
    if (!_actual) _actual = bundleActual();
    if (!_actual) return; // en desarrollo el bundle no tiene hash

    const servidor = await bundleServidor();
    if (servidor && servidor !== _actual) mostrarAviso();
  } catch (e) {
    // Sin conexión o respuesta rara: se reintenta en el siguiente ciclo.
    console.debug('[version] no se pudo comprobar:', e?.message || e);
  }
}

export function iniciarDetectorDeVersion() {
  if (typeof document === 'undefined' || _timer) return;
  _actual = bundleActual();
  if (!_actual) return;

  _timer = setInterval(comprobar, CADA);

  // Volver a la pestaña es el momento natural para enterarse.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) comprobar();
  });
}

if (typeof window !== 'undefined') {
  window.comprobarVersion = comprobar;
}

export default { iniciarDetectorDeVersion };
