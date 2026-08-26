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
let _hueco = null;
let _fijada = false;

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
 * Fija la barra con `position: fixed` en cuanto el scroll la alcanza.
 *
 * Se descarta `position: sticky` a propósito. Es frágil de formas que no
 * se ven al inspeccionar: basta un ancestro con `overflow` distinto de
 * visible, un `transform`, un `contain`, o que el contenedor padre termine
 * antes que la lista, para que la barra se vaya con el scroll — y cada
 * perfil (visitante, asesor, gerente) monta un DOM ligeramente distinto,
 * así que puede funcionar para uno y fallar para otro. Eso es justo lo
 * que estaba pasando.
 *
 * `fixed` se ancla al viewport y no depende de nada de lo anterior. El
 * coste es tener que reservar el hueco que la barra deja en el flujo, o la
 * página daría un salto al fijarse; de eso se encarga el espaciador.
 */
function vigilarPegado() {
  _sf = document.getElementById('stickyFilters');
  if (!_sf || _hueco) return;

  // Espaciador: ocupa el sitio de la barra cuando ésta pasa a fixed, para
  // que la página no dé un salto al fijarse.
  _hueco = document.createElement('div');
  _hueco.id = 'filtrosHueco';
  _hueco.setAttribute('aria-hidden', 'true');
  _hueco.style.cssText = 'display:none;padding:0;margin:0';
  _sf.parentNode.insertBefore(_hueco, _sf);

  // Se comprueba en el scroll en vez de con IntersectionObserver: el
  // espaciador desplaza al propio centinela que el observer vigila, así que
  // al volver arriba no re-disparaba y la barra se quedaba fijada tapando
  // la cabecera. Comparar posiciones no tiene ese problema.
  let pendiente = false;
  const alScroll = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; evaluar(); });
  };
  window.addEventListener('scroll', alScroll, { passive: true });
  evaluar();
}

/** Punto del documento donde empieza la barra, sin contar si está fijada. */
function anclaDocumento() {
  if (_fijada) {
    // Fijada, la referencia es el hueco que ocupa su sitio.
    return _hueco.getBoundingClientRect().top + window.scrollY;
  }
  return _sf.getBoundingClientRect().top + window.scrollY;
}

function evaluar() {
  if (!_sf || !_hueco) return;
  const tope = altoTopbar();
  const debeFijarse = window.scrollY >= anclaDocumento() - tope;
  if (debeFijarse === _fijada) {
    if (_fijada) { _sf.style.top = tope + 'px'; }  // por si cambió la topbar
    return;
  }
  _fijada = debeFijarse;

  if (debeFijarse) {
    // Medir ANTES de sacarla del flujo, o el ancho sale mal.
    const r = _sf.getBoundingClientRect();
    _hueco.style.height = Math.round(r.height) + 'px';
    _hueco.style.display = 'block';
    _sf.style.position = 'fixed';
    _sf.style.top = tope + 'px';
    _sf.style.left = Math.round(r.left) + 'px';
    _sf.style.width = Math.round(r.width) + 'px';
    _sf.classList.add('pegado');
  } else {
    _hueco.style.display = 'none';
    _sf.style.position = '';
    _sf.style.top = '';
    _sf.style.left = '';
    _sf.style.width = '';
    _sf.classList.remove('pegado');
  }
}

export function iniciarFiltrosFijos() {
  if (typeof document === 'undefined') return;
  ajustar();
  vigilarPegado();

  // La barra superior cambia de alto al rotar o al cambiar de vista.
  // Al rotar o redimensionar cambia el ancho: se suelta y se vuelve a
  // evaluar con la geometría nueva.
  window.addEventListener('resize', () => {
    ajustar();
    if (_fijada) { _fijada = false; _hueco.style.display = 'none';
      _sf.style.position = ''; _sf.style.top = ''; _sf.style.left = ''; _sf.style.width = ''; }
    evaluar();
  }, { passive: true });
  window.addEventListener('hashchange', () => setTimeout(ajustar, 60));
}

if (typeof window !== 'undefined') {
  window.ajustarFiltrosFijos = ajustar;
  window.evaluarFiltrosFijos = evaluar;
}

export default { iniciarFiltrosFijos };
