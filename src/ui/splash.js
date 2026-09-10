/**
 * Módulo: ui/splash
 *
 * La pantalla de los primeros segundos.
 *
 * POR QUÉ EXISTE
 *   Al abrir un enlace compartido, lo primero que aparecía era un cuadro
 *   beige vacío con "Cargando inmueble…" —y en otra ruta, un emoji de
 *   casita—. Dos pantallas distintas, ninguna de la marca. Ese momento
 *   es el primer contacto de alguien que llega desde WhatsApp sin haber
 *   visto nunca la inmobiliaria, y estaba desperdiciado: no dice de
 *   quién es, no se recuerda, y un cuadro gris parece que algo falló.
 *
 *   Ahora es la marca: el color de la inmobiliaria a pantalla completa,
 *   su monograma dibujándose, su nombre. Dura lo que dure la carga y se
 *   va con un fundido.
 *
 * MULTI-INQUILINO
 *   Ni el color ni el nombre están escritos aquí. Salen de la ficha del
 *   inquilino, igual que el home. Una inmobiliaria de Manizales ve su
 *   verde y su nombre, no el marino de House.
 *
 * SIN DEPENDENCIAS
 *   Se usa en el arranque, antes de que cargue nada. Es HTML y CSS
 *   inyectados a mano: ni módulos, ni fuentes externas, ni imágenes que
 *   puedan tardar más que aquello que anuncian.
 *
 * ACCESIBILIDAD
 *   Con "reducir movimiento" activado no se anima nada: se pinta el
 *   mismo cuadro, quieto. Y lleva role="status" para que un lector de
 *   pantalla anuncie que está cargando.
 */

const CSS_ID = 'sp-css';

/** CSS del splash. Se inyecta una sola vez. */
function inyectarCSS() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
  .sp-wrap{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;
    background:radial-gradient(120% 90% at 50% -10%,
      color-mix(in srgb, var(--sp-c) 76%, #fff) 0%,
      var(--sp-c) 48%,
      color-mix(in srgb, var(--sp-c) 72%, #000) 100%);
    animation:sp-in .45s ease both}
  .sp-wrap.sp-out{animation:sp-fade .42s ease forwards}
  .sp-box{text-align:center;padding:24px}
  /* Anillos que respiran detrás del monograma: dan la sensación de que
     algo está pasando sin recurrir a una ruedita de "cargando". */
  .sp-halo{position:relative;width:104px;height:104px;margin:0 auto 26px}
  .sp-halo::before,.sp-halo::after{content:"";position:absolute;inset:0;border-radius:28px;
    border:1.5px solid rgba(255,255,255,.34);animation:sp-pulse 2.6s cubic-bezier(.25,.6,.3,1) infinite}
  .sp-halo::after{animation-delay:1.3s}
  .sp-mono{position:absolute;inset:0;border-radius:26px;display:grid;place-items:center;
    background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);
    backdrop-filter:blur(2px);box-shadow:0 18px 44px rgba(0,0,0,.28)}
  /* El trazo se dibuja: la casa "se construye" en pantalla. */
  .sp-mono svg path{stroke:#fff;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round;
    stroke-dasharray:64;stroke-dashoffset:64;animation:sp-draw 1.15s cubic-bezier(.4,0,.2,1) forwards}
  .sp-mono svg path:nth-child(2){animation-delay:.42s}
  .sp-nom{color:#fff;font-size:15px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
    opacity:0;animation:sp-up .6s ease .5s forwards}
  .sp-sub{color:rgba(255,255,255,.66);font-size:12.5px;font-weight:600;margin-top:7px;
    opacity:0;animation:sp-up .6s ease .68s forwards}
  /* Barra de avance: un barrido, no un porcentaje inventado. */
  .sp-bar{width:132px;height:2px;border-radius:2px;margin:26px auto 0;overflow:hidden;
    background:rgba(255,255,255,.16)}
  .sp-bar i{display:block;width:40%;height:100%;border-radius:2px;background:rgba(255,255,255,.85);
    animation:sp-sweep 1.15s cubic-bezier(.55,.1,.35,.9) infinite}
  @keyframes sp-draw{to{stroke-dashoffset:0}}
  @keyframes sp-pulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.45);opacity:0}100%{opacity:0}}
  @keyframes sp-up{to{opacity:1;transform:translateY(0)}}
  @keyframes sp-in{from{opacity:0}to{opacity:1}}
  @keyframes sp-fade{to{opacity:0;visibility:hidden}}
  @keyframes sp-sweep{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}
  .sp-nom,.sp-sub{transform:translateY(7px)}
  @media (prefers-reduced-motion:reduce){
    .sp-wrap,.sp-wrap.sp-out{animation:none}
    .sp-halo::before,.sp-halo::after,.sp-bar i{animation:none}
    .sp-mono svg path{stroke-dashoffset:0;animation:none}
    .sp-nom,.sp-sub{opacity:1;transform:none;animation:none}
  }`;
  document.head.appendChild(s);
}

/**
 * HTML de la pantalla de carga.
 * @param {object} o
 * @param {string} o.nombre  Nombre de la inmobiliaria.
 * @param {string} o.color   Color primario del inquilino.
 * @param {string} o.sub     Línea de abajo ("Cargando inmueble…").
 */
export function splashHTML({ nombre, color, sub } = {}) {
  inyectarCSS();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // El respaldo es un gris neutro, nunca la marca de otra inmobiliaria.
  const c = color || '#334155';
  return `<div class="sp-wrap" style="--sp-c:${esc(c)}" role="status" aria-live="polite">
    <div class="sp-box">
      <div class="sp-halo">
        <div class="sp-mono">
          <svg width="46" height="46" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>
          </svg>
        </div>
      </div>
      <div class="sp-nom">${esc(nombre || 'Inmobiliaria')}</div>
      <div class="sp-sub">${esc(sub || 'Cargando…')}</div>
      <div class="sp-bar"><i></i></div>
    </div>
  </div>`;
}

/**
 * Quita el splash con un fundido, en vez de hacerlo desaparecer de golpe.
 * Se llama sola si el contenedor se reemplaza; esto es para cuando el
 * splash vive por encima del contenido ya pintado.
 */
export function cerrarSplash(el) {
  const w = el || document.querySelector('.sp-wrap');
  if (!w) return;
  w.classList.add('sp-out');
  setTimeout(() => w.remove(), 430);
}

export default { splashHTML, cerrarSplash };
