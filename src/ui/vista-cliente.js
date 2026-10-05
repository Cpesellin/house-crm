/**
 * Módulo: ui/vista-cliente
 *
 * "Ver como cliente" para administradores y asesores.
 *
 * EL PROBLEMA
 *   Un interno no podía ver nunca la marketplace como la ve un cliente: el
 *   router manda `portafolio` a `inv` en cuanto hay sesión interna
 *   (router.js). Así que quien decide qué se publica —el admin— no tenía
 *   forma de mirar el resultado, salvo cerrar sesión o abrir una ventana de
 *   incógnito a mano.
 *
 * POR QUÉ EN OTRA PESTAÑA Y NO CON UN INTERRUPTOR
 *   Un interruptor dentro de la misma pestaña sería un disfraz: la pantalla
 *   cambiaría, pero las consultas seguirían saliendo con la sesión del
 *   admin, que ve TODO. Un inmueble sin publicar, o un dato reservado,
 *   aparecería igual y la vista mentiría justo en lo que se quiere revisar.
 *
 *   Abriendo otra pestaña con `?cliente=1`:
 *     · `userStore` vive en sessionStorage, que es POR PESTAÑA → la pestaña
 *       nueva no hereda la sesión interna;
 *     · el cliente de Supabase se crea aislado y sin sesión (ver
 *       config/supabase.js) → las consultas van como visitante y la base
 *       responde lo que le responde a un visitante.
 *   Es la vista real, no una imitación. Y la sesión del CRM en la otra
 *   pestaña no se toca.
 */

const PARAM = 'cliente';

/** ¿Esta pestaña es la vista de cliente? */
export function esVistaCliente() {
  try {
    return new URLSearchParams(location.search).get(PARAM) === '1';
  } catch (e) {
    return false;
  }
}

/**
 * Abre la vista de cliente en otra pestaña.
 * @param {string} [destino] código del inmueble para ir directo a su ficha
 *   pública; sin él se abre el portafolio.
 */
export function abrirVistaCliente(destino) {
  const base = location.origin + (destino ? '/ver/' + encodeURIComponent(destino) : '/');
  const url = base + '?' + PARAM + '=1' + (destino ? '' : '#/portafolio');
  window.open(url, '_blank', 'noopener');
}

/**
 * Franja fija que recuerda dónde está parado quien mira.
 *
 * Sin ella es fácil creerse dentro del CRM, intentar editar algo y no
 * entender por qué no se puede — el mismo tipo de confusión que ya costó
 * una tarde con la sesión caducada.
 */
export function pintarFranjaVistaCliente() {
  if (!esVistaCliente()) return;
  const poner = () => {
    if (document.getElementById('franjaVistaCliente')) return;
    const el = document.createElement('div');
    el.id = 'franjaVistaCliente';
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:9995;' +
      'display:flex;align-items:center;gap:10px;padding:9px 10px 9px 15px;border-radius:999px;' +
      'background:#0f172a;color:#fff;font-family:inherit;font-size:13px;font-weight:600;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.35);max-width:calc(100vw - 24px)';
    el.innerHTML =
      '<span>Estás viendo como cliente</span>' +
      '<button type="button" id="salirVistaCliente" style="flex:0 0 auto;padding:7px 13px;border:none;border-radius:999px;' +
      'background:#fff;color:#0f172a;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Volver al CRM</button>';
    document.body.appendChild(el);
    el.querySelector('#salirVistaCliente').addEventListener('click', () => {
      // Se cierra la pestaña si la abrimos nosotros; si alguien llegó aquí
      // pegando la dirección, window.close() no hace nada y entonces se
      // navega al CRM.
      window.close();
      setTimeout(() => { location.replace(location.origin + '/'); }, 150);
    });
  };
  if (document.body) poner();
  else document.addEventListener('DOMContentLoaded', poner, { once: true });
}

if (typeof window !== 'undefined') {
  window.abrirVistaCliente = abrirVistaCliente;
  window.esVistaCliente = esVistaCliente;
}
