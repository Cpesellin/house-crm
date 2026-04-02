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
      <label class="ffl">Observaciones</label>
      <textarea class="ffi" style="min-height:60px;resize:vertical"
        placeholder="Notas adicionales sobre la propiedad..."
        onchange="window._reg.updateField('observaciones', this.value)">${f.observaciones || ''}</textarea>
    </div>
  `;

  container.setAttribute('data-step-container', '4');
  window._reg = registration;

  setTimeout(() => {
    registration._pendingFotos = [];
    initFotoUpload('fotoUpReg', r => registration.addPendingFoto(r), 0);
  }, 0);
}

window.rF4 = renderStep4;
