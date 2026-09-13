/**
 * Módulo: domains/inmuebles/fotos-editor
 *
 * Reordenar y eliminar las fotos de un inmueble — desde el ordenador y
 * desde el teléfono.
 *
 * QUÉ ESTABA ROTO (y por qué este módulo existe)
 *
 *   1. En el teléfono no se podía reordenar. El arrastre pedía mantener
 *      pulsado 400 ms, pero cancelaba la espera ante CUALQUIER movimiento
 *      del dedo — y un dedo nunca está quieto. Casi nunca llegaba a
 *      activarse. Cuando lo hacía, la foto no seguía al dedo.
 *
 *   2. "Orden actualizado" aparecía siempre. Se intentaba una función que
 *      no existe en la base y, al fallar, se actualizaba foto por foto sin
 *      mirar el resultado.
 *
 *   3. La base rechazaba en silencio. Si la seguridad de filas bloqueaba
 *      el cambio, PostgREST respondía OK con cero filas: la foto
 *      desaparecía de la pantalla y volvía al recargar.
 *
 * CÓMO SE RESUELVE
 *
 *   · Escritura por funciones de la base (sql/75) que comprueban el
 *     permiso y devuelven cuántas fotos tocaron. Si no tocó nada, se dice.
 *   · Si esas funciones aún no están instaladas, se escribe directo, pero
 *     CONTANDO filas: nunca se vuelve a decir "listo" sin serlo.
 *   · Arrastre con Pointer Events: el mismo código para ratón y dedo.
 */

import { getSupabaseClient } from '../../config/supabase.js';

const SB = () => getSupabaseClient();

function rpcNoInstalada(error) {
  return /PGRST202|42883|does not exist|Could not find the function/i
    .test(`${error?.message || ''} ${error?.code || ''}`);
}

/** Traduce el motivo técnico a algo que la persona pueda entender. */
function motivo(codigo) {
  return ({
    sin_permiso: 'No tienes permiso para editar las fotos de este inmueble.',
    lista_desactualizada: 'Alguien cambió las fotos mientras editabas. Cierra y vuelve a abrir el inmueble.',
    sin_cambios: 'La base de datos no aplicó el cambio. Vuelve a intentarlo.',
  })[codigo] || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
}

// ══════════════════════════════════════════════════════════════════════
// Escritura
// ══════════════════════════════════════════════════════════════════════

/**
 * Guarda el orden completo de las fotos.
 * @param {string} inmuebleId
 * @param {string[]} ids  todos los ids, en el orden deseado (0 = portada)
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function guardarOrdenFotos(inmuebleId, ids) {
  const { data, error } = await SB().rpc('fotos_reordenar', { p_inmueble: inmuebleId, p_ids: ids });

  if (!error) {
    if (data?.ok) return { ok: true };
    return { ok: false, error: motivo(data?.error) };
  }
  if (!rpcNoInstalada(error)) {
    console.warn('[fotos] fotos_reordenar:', error.message);
    return { ok: false, error: motivo() };
  }

  // Respaldo mientras sql/75 no esté aplicada: una escritura por foto,
  // pidiendo la fila de vuelta para saber si de verdad se escribió.
  let escritas = 0;
  for (let i = 0; i < ids.length; i++) {
    const { data: filas } = await SB()
      .from('fotos').update({ orden: i })
      .eq('id', ids[i]).eq('inmueble_id', inmuebleId)
      .select('id');
    if (filas && filas.length) escritas++;
  }
  if (escritas !== ids.length) return { ok: false, error: motivo(escritas === 0 ? 'sin_permiso' : 'sin_cambios') };
  return { ok: true };
}

/**
 * Elimina fotos del inmueble.
 * @returns {Promise<{ok:boolean, eliminadas?:number, error?:string}>}
 */
export async function eliminarFotos(inmuebleId, ids) {
  if (!ids || !ids.length) return { ok: true, eliminadas: 0 };

  const { data, error } = await SB().rpc('fotos_eliminar', { p_inmueble: inmuebleId, p_ids: ids });

  if (!error) {
    if (!data?.ok) return { ok: false, error: motivo(data?.error) };
    if (!data.eliminadas) return { ok: false, error: motivo('sin_cambios') };
    return { ok: true, eliminadas: data.eliminadas };
  }
  if (!rpcNoInstalada(error)) {
    console.warn('[fotos] fotos_eliminar:', error.message);
    return { ok: false, error: motivo() };
  }

  // Respaldo contando filas.
  const { data: filas, error: e2 } = await SB()
    .from('fotos').delete()
    .in('id', ids).eq('inmueble_id', inmuebleId)
    .select('id');
  if (e2) return { ok: false, error: motivo() };
  if (!filas || !filas.length) return { ok: false, error: motivo('sin_permiso') };
  return { ok: true, eliminadas: filas.length };
}

// ══════════════════════════════════════════════════════════════════════
// Arrastre (ratón y dedo)
// ══════════════════════════════════════════════════════════════════════

const ESPERA_TACTIL = 280;   // ms manteniendo pulsado para "levantar" la foto
const TOLERANCIA = 10;       // px de temblor que se aceptan antes de entender "scroll"
const UMBRAL_RATON = 4;      // px para distinguir un clic de un arrastre
const BORDE_SCROLL = 70;     // px desde el borde en los que se desplaza solo

/** El ancestro que hace scroll (el cuerpo del modal), para el autoscroll. */
function contenedorScroll(el) {
  let n = el?.parentElement;
  while (n && n !== document.body) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Hace reordenables los hijos `[data-foto-id]` de `wrap`.
 *
 * @param {HTMLElement} wrap
 * @param {{ onSoltar: (ids: string[]) => void }} opts
 *   onSoltar recibe el orden nuevo SÓLO si cambió.
 */
export function activarArrastre(wrap, { onSoltar }) {
  if (!wrap || wrap.__arrastreActivo) return;
  wrap.__arrastreActivo = true;

  let item = null;          // la tarjeta que se toca
  let activo = false;       // ya se está arrastrando
  let fantasma = null;      // copia que sigue al dedo
  let temporizador = null;
  let x0 = 0, y0 = 0;       // punto de inicio
  let dx = 0, dy = 0;       // desfase del puntero dentro de la tarjeta
  let ordenInicial = [];
  let scroller = null;
  let rafScroll = null;
  let ultimoY = 0;

  const ids = () => [...wrap.querySelectorAll('[data-foto-id]')].map((el) => el.dataset.fotoId);

  function limpiarTemporizador() {
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
  }

  function levantar(ev) {
    activo = true;
    ordenInicial = ids();
    scroller = contenedorScroll(wrap);

    const r = item.getBoundingClientRect();
    dx = x0 - r.left;
    dy = y0 - r.top;

    fantasma = item.cloneNode(true);
    fantasma.removeAttribute('data-foto-id');
    Object.assign(fantasma.style, {
      position: 'fixed', left: r.left + 'px', top: r.top + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '10050', pointerEvents: 'none',
      transform: 'scale(1.06)', boxShadow: '0 14px 34px rgba(0,0,0,.28)',
      transition: 'transform .12s ease', opacity: '.95',
    });
    document.body.appendChild(fantasma);

    // La original queda como hueco: se ve dónde va a caer.
    item.classList.add('fv2-hueco');
    wrap.classList.add('fv2-arrastrando');

    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* noop */ } }
    try { item.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
  }

  function mover(cx, cy) {
    if (!fantasma) return;
    fantasma.style.left = (cx - dx) + 'px';
    fantasma.style.top = (cy - dy) + 'px';
    ultimoY = cy;

    // ¿Sobre qué tarjeta está el dedo? El fantasma no intercepta
    // (pointer-events: none), así que elementFromPoint ve lo de debajo.
    const bajo = document.elementFromPoint(cx, cy)?.closest?.('[data-foto-id]');
    if (bajo && bajo !== item && wrap.contains(bajo)) {
      const lista = [...wrap.querySelectorAll('[data-foto-id]')];
      const iItem = lista.indexOf(item);
      const iBajo = lista.indexOf(bajo);
      wrap.insertBefore(item, iItem < iBajo ? bajo.nextSibling : bajo);
    }
    autoScroll();
  }

  // Cerca del borde de la ventana del modal, se desplaza solo: con 17
  // fotos la última queda fuera de la vista y sin esto no se podía
  // llevar una foto de abajo a la portada.
  function autoScroll() {
    if (rafScroll || !scroller) return;
    const paso = () => {
      rafScroll = null;
      if (!activo) return;
      const r = scroller === document.documentElement
        ? { top: 0, bottom: window.innerHeight }
        : scroller.getBoundingClientRect();
      let v = 0;
      if (ultimoY < r.top + BORDE_SCROLL) v = -Math.ceil((r.top + BORDE_SCROLL - ultimoY) / 6);
      else if (ultimoY > r.bottom - BORDE_SCROLL) v = Math.ceil((ultimoY - (r.bottom - BORDE_SCROLL)) / 6);
      if (v) {
        scroller.scrollTop += v;
        rafScroll = requestAnimationFrame(paso);
      }
    };
    rafScroll = requestAnimationFrame(paso);
  }

  function soltar(cancelado) {
    limpiarTemporizador();
    if (rafScroll) { cancelAnimationFrame(rafScroll); rafScroll = null; }

    if (activo) {
      fantasma?.remove();
      fantasma = null;
      item?.classList.remove('fv2-hueco');
      wrap.classList.remove('fv2-arrastrando');

      const nuevo = ids();
      if (cancelado) {
        // Se devuelve cada tarjeta a su sitio.
        ordenInicial.forEach((id) => {
          const el = wrap.querySelector(`[data-foto-id="${CSS.escape(id)}"]`);
          if (el) wrap.appendChild(el);
        });
      } else if (nuevo.join('|') !== ordenInicial.join('|')) {
        onSoltar?.(nuevo);
      }
    }
    item = null;
    activo = false;
  }

  wrap.addEventListener('pointerdown', (ev) => {
    // Los botones de la tarjeta (eliminar, mover) no inician arrastre.
    if (ev.target.closest('button, a, input')) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    const t = ev.target.closest('[data-foto-id]');
    if (!t || !wrap.contains(t)) return;

    item = t;
    activo = false;
    x0 = ev.clientX;
    y0 = ev.clientY;

    if (ev.pointerType !== 'mouse') {
      // Dedo o lápiz: hay que distinguir "quiero mover esta foto" de
      // "quiero desplazar la pantalla". Se decide manteniendo pulsado.
      limpiarTemporizador();
      temporizador = setTimeout(() => { temporizador = null; if (item) levantar(ev); }, ESPERA_TACTIL);
    }
  });

  wrap.addEventListener('pointermove', (ev) => {
    if (!item) return;
    const lejos = Math.hypot(ev.clientX - x0, ev.clientY - y0);

    if (!activo) {
      if (ev.pointerType === 'mouse') {
        if (lejos > UMBRAL_RATON) levantar(ev);
        else return;
      } else {
        // Antes de levantar: un poco de temblor se tolera; más que eso es
        // scroll, y se suelta la foto para que la pantalla se desplace.
        if (lejos > TOLERANCIA) { limpiarTemporizador(); item = null; }
        return;
      }
    }
    ev.preventDefault();
    mover(ev.clientX, ev.clientY);
  });

  wrap.addEventListener('pointerup', () => soltar(false));
  wrap.addEventListener('pointercancel', () => soltar(true));

  // Mientras se arrastra con el dedo, la pantalla no debe desplazarse.
  // Esto sólo puede cortarse desde touchmove NO pasivo: los Pointer
  // Events no permiten impedir un scroll ya empezado.
  wrap.addEventListener('touchmove', (ev) => {
    if (activo) ev.preventDefault();
  }, { passive: false });

  // Mantener pulsado en el móvil abre el menú de "guardar imagen" y
  // arruina el gesto. Dentro de la cuadrícula no hace falta.
  wrap.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('[data-foto-id]')) ev.preventDefault();
  });
}

export default { guardarOrdenFotos, eliminarFotos, activarArrastre };
