/**
 * PASO 5 — FOTOS Y VIDEOS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Antes el subidor vivía al final del paso de Amenidades, debajo de dos
 * rejillas de botones: estaba, pero nadie lo encontraba. El resultado
 * medible es que los inmuebles se registraban sin una sola foto.
 *
 * Aquí es un paso propio, con el subidor arriba del todo. Un inmueble sin
 * fotos no se puede mostrar ni compartir, así que merece su pantalla.
 *
 * No es obligatorio: se puede continuar sin fotos —a veces se registra
 * primero y se fotografía después— pero el paso avisa de lo que implica en
 * lugar de dejar que pase inadvertido.
 */

import { registration } from '../../registrationStore.js';
import { initFotoUpload } from '../../../../config/cloudinary.js';

export function renderStep5Fotos(container) {
  const fotos = registration.getPendingFotos();

  container.innerHTML = `
    <div class="ff">
      <label class="ffl">📷 Fotos y videos del inmueble</label>
      <div style="font-size:11.5px;color:var(--sub);margin:4px 0 10px;line-height:1.45">
        Las fotos son lo primero que ve un cliente y lo que se muestra al
        compartir el inmueble por WhatsApp. La primera será la portada.
      </div>
      <div id="fotoUpReg"></div>
    </div>

    <div id="fotoAviso" style="margin-top:14px"></div>
  `;

  container.setAttribute('data-step-container', '5');
  window._reg = registration;

  // El DOM tiene que existir antes de montar el subidor.
  setTimeout(() => {
    const yaSubidas = registration.getPendingFotos();
    initFotoUpload('fotoUpReg', (r) => {
      registration.addPendingFoto(r);
      _pintarAviso(container);
    }, yaSubidas.length);

    _repintarPreview(container);
    _pintarAviso(container);
  }, 0);
}

/**
 * Repinta las miniaturas de lo ya subido. Hace falta porque el paso se
 * re-renderiza con cada cambio del store y el innerHTML se rehace: sin
 * esto las fotos desaparecían de la vista aunque siguieran guardadas.
 */
function _repintarPreview(container) {
  const prev = document.getElementById('fotoUpReg_prev');
  const fotos = registration.getPendingFotos();
  if (!prev || !fotos.length) return;

  prev.innerHTML = fotos.map((f, i) =>
    `<div class="foto-prev-item">
       <img src="${f.thumb || f.url}" alt="Foto ${i + 1}">
       ${i === 0 ? '<span class="foto-portada">Portada</span>' : ''}
       <button class="foto-del" type="button" data-url="${String(f.url).replace(/"/g, '&quot;')}">✕</button>
     </div>`
  ).join('');

  // removePendingFoto filtra por url, no por índice.
  prev.querySelectorAll('.foto-del').forEach((b) => {
    b.addEventListener('click', () => {
      registration.removePendingFoto(b.dataset.url);
      renderStep5Fotos(container);
    });
  });
}

function _pintarAviso(container) {
  const el = document.getElementById('fotoAviso');
  if (!el) return;
  const n = registration.getPendingFotos().length;

  el.innerHTML = n
    ? `<div style="padding:10px 12px;border-radius:10px;background:#e6f7ef;border:1px solid #bfe8d5;color:#047857;font-size:12.5px;font-weight:600">
         ✓ ${n} ${n === 1 ? 'archivo listo' : 'archivos listos'} para publicar
       </div>`
    : `<div style="padding:10px 12px;border-radius:10px;background:#fbf3e3;border:1px solid #eeddb9;color:#8a5a00;font-size:12.5px;line-height:1.45">
         Puedes continuar sin fotos, pero el inmueble no se podrá mostrar en
         el portafolio hasta que las agregues desde su ficha.
       </div>`;
}

window.rF5Fotos = renderStep5Fotos;

export default renderStep5Fotos;
