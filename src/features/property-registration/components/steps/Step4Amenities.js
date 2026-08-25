import { registration, AMENITIES_PRIMARY, AMENITIES_EXTRA } from '../../registrationStore.js';
import { initFotoUpload } from '../../../../config/cloudinary.js';

export function renderStep4(container) {
  const f = registration.getFormData();
  const amenidades = f.amenidades || [];

  container.innerHTML = `
    <div class="ff">
      <label class="ffl">Amenidades principales</label>
      <div class="amg" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px">
        ${AMENITIES_PRIMARY.map(a => `
          <button class="amb${amenidades.includes(a.id) ? ' on' : ''}"
            onclick="window._reg.toggleAmenidad('${a.id}');window.rF4(this.closest('[data-step-container]') || this.parentElement.parentElement.parentElement)">
            <div class="ami">${a.emoji || ''}</div>
            <span>${a.label}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="ff" style="margin-top:16px">
      <label class="ffl">Amenidades extra</label>
      <div class="cps" style="margin-top:6px">
        ${AMENITIES_EXTRA.map(a => `
          <div class="ch${amenidades.includes(a.id) ? ' on' : ''}"
            onclick="window._reg.toggleAmenidad('${a.id}');window.rF4(this.closest('[data-step-container]') || this.parentElement.parentElement.parentElement)">${a.emoji || ''} ${a.label}</div>
        `).join('')}
      </div>
    </div>

    <div class="ff" style="margin-top:16px">
      <label class="ffl">📷 Fotos y Videos</label>
      <div id="fotoUpReg" style="margin-top:6px"></div>
    </div>

    <div class="ff" style="margin-top:16px">
      <label class="ffl">Descripción del inmueble <span style="font-size:10px;font-weight:600;color:var(--b600);background:var(--b50);padding:2px 8px;border-radius:10px;margin-left:6px">👁️ Visible para clientes</span></label>
      <textarea class="ffi" style="min-height:80px;resize:vertical"
        placeholder="Describe lo más atractivo del inmueble: ubicación, vista, acabados, cercanía a servicios..."
        onchange="window._reg.updateField('observaciones', this.value)">${f.observaciones || ''}</textarea>
      <div style="font-size:10px;color:var(--sub);margin-top:4px">Este texto se mostrará en la página pública del inmueble.</div>
    </div>
  `;

  container.setAttribute('data-step-container', '4');
  window._reg = registration;

  setTimeout(() => {
    // Este paso se re-renderiza al tocar cualquier amenidad, y cada render
    // rehace el innerHTML — con lo que el preview de fotos desaparecía y el
    // usuario creía que no se habían subido. Las fotos nunca se perdían (viven
    // en el store), pero sin verlas nadie confía en el formulario.
    //
    // La línea `registration._pendingFotos = []` que había aquí escribía sobre
    // el objeto público, no sobre el estado, así que además de engañosa no
    // hacía nada. Se elimina.
    const yaSubidas = registration.getPendingFotos();
    initFotoUpload('fotoUpReg', r => registration.addPendingFoto(r), yaSubidas.length);

    // Repintar las miniaturas de lo ya subido.
    const prev = document.getElementById('fotoUpReg_prev');
    if (prev && yaSubidas.length) {
      // removePendingFoto filtra por url, no por índice.
      prev.innerHTML = yaSubidas.map(f =>
        `<div class="foto-prev-item"><img src="${f.thumb || f.url}">` +
        `<button class="foto-del" type="button" data-url="${String(f.url).replace(/"/g, '&quot;')}">✕</button></div>`
      ).join('');
      prev.querySelectorAll('.foto-del').forEach(b => {
        b.addEventListener('click', () => {
          registration.removePendingFoto(b.dataset.url);
          renderStep4(container);
        });
      });
    }
  }, 0);
}

window.rF4 = renderStep4;
