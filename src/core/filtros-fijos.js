/**
 * BARRA DE FILTROS FIJA — ajuste del punto de anclaje
 * ══════════════════════════════════════════════════════════════════════
 *
 * `.sticky-filters` se pegaba a 54px del borde, un valor fijo heredado de
 * cuando la barra superior siempre medía eso. Hoy no siempre está: en el
 * portafolio móvil mide 0, así que los filtros se quedaban flotando 54px
 * más abajo de lo necesario, comiéndose una franja de pantalla en la vista
 * donde menos sobra.
 *
 * Aquí se mide la barra superior real y se publica su altura como
 * --sticky-top. Si no hay barra fija, los filtros se pegan al borde.
 *
 * También marca `.pegado` cuando la barra toca su tope, para que la sombra
 * aparezca sólo entonces: en reposo ensucia, y al hacer scroll es lo que
 * separa los filtros del contenido que pasa por debajo.
 */

const SELECTOR_TOPBAR = 'header, .v2-topbar';

let _sf = null;
let _obs = null;

/** Altura de la barra superior, si es que está fijada. */
function altoTopbar() {
  const t = document.querySelector(SELECTOR_TOPBAR);
  if (!t) return 0;
  const cs = getComputedStyle(t);
  // Sólo cuenta si permanece en pantalla; si hace scroll con el contenido,
  // no hay nada que esquivar.
  if (cs.position !== 'fixed' && cs.position !== 'sticky') return 0;
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  return Math.round(t.getBoundingClientRect().height);
}

function ajustar() {
  const alto = altoTopbar();
  document.documentElement.style.setProperty('--sticky-top', alto + 'px');
}

/**
 * Marca `.pegado` cuando la barra alcanza su tope. Se usa un centinela de
 * 1px justo encima: cuando deja de verse, la barra está pegada. Es más
 * barato y preciso que escuchar el scroll.
 */
function vigilarPegado() {
  _sf = document.getElementById('stickyFilters');
  if (!_sf || _obs) return;

  const centinela = document.createElement('div');
  centinela.setAttribute('aria-hidden', 'true');
  centinela.style.cssText = 'height:1px;margin:0;padding:0;pointer-events:none';
  _sf.parentNode.insertBefore(centinela, _sf);

  _obs = new IntersectionObserver(
    ([e]) => _sf.classList.toggle('pegado', !e.isIntersecting),
    { threshold: [0], rootMargin: `-${altoTopbar()}px 0px 0px 0px` }
  );
  _obs.observe(centinela);
}

export function iniciarFiltrosFijos() {
  if (typeof document === 'undefined') return;
  ajustar();
  vigilarPegado();

  // La barra superior cambia de alto al rotar o al cambiar de vista.
  window.addEventListener('resize', ajustar, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(ajustar, 60));
}

if (typeof window !== 'undefined') {
  window.ajustarFiltrosFijos = ajustar;
}

export default { iniciarFiltrosFijos };
