import { registration, PROPERTY_TYPES } from '../../registrationStore.js';
import { escapeHtml, escapeAttr } from '../../../../utils/sanitizer.js';

export function renderStep1(container) {
  const fd = registration.getFormData();
  const houseCode = registration.nextHouseCode();
  const neg = fd.negociacion || '';

  const typeGrid = PROPERTY_TYPES.map(t => {
    const active = fd.tipo === t.id ? ' active' : '';
    return `<div class="ftc${active}" onclick="registration.updateField('tipo','${t.id}');renderStep1(document.getElementById('fc'))">
      <span class="fti">${t.emoji}</span>
      <span>${escapeHtml(t.name)}</span>
    </div>`;
  }).join('');

  const negButtons = ['VENTA', 'ARRIENDO', 'AMBAS'].map(n => {
    const active = neg === n ? ' active' : '';
    return `<button type="button" class="fsgb${active}" onclick="registration.updateField('negociacion','${n}');renderStep1(document.getElementById('fc'))">${n}</button>`;
  }).join('');

  const showVenta = neg !== 'ARRIENDO';
  const showArriendo = neg !== 'VENTA';

  const precioInputs = `
    ${showVenta ? `<div class="ff">
      <label class="ffl">Precio Venta</label>
      <div class="ffr">
        <input class="ffi" type="number" value="${escapeAttr(fd.precioVenta || '')}" onchange="registration.updateField('precioVenta', this.value)" placeholder="0" />
      </div>
    </div>` : ''}
    ${showArriendo ? `<div class="ff">
      <label class="ffl">Arriendo/mes</label>
      <div class="ffr">
        <input class="ffi" type="number" value="${escapeAttr(fd.arriendoMes || '')}" onchange="registration.updateField('arriendoMes', this.value)" placeholder="0" />
      </div>
    </div>` : ''}
  `;

  container.innerHTML = `
    <div class="cod-badge">
      <span>${escapeHtml(houseCode)}</span>
      <button type="button" onclick="navigator.clipboard.writeText('${escapeAttr(houseCode)}')">Copiar</button>
    </div>

    <div class="ff">
      <label class="ffl">Tipo de propiedad</label>
      <div class="ftg">${typeGrid}</div>
    </div>

    <div class="ff">
      <label class="ffl">Negociación</label>
      <div class="fsg">${negButtons}</div>
    </div>

    ${precioInputs}

    <div class="ffg">
      <div class="ff">
        <label class="ffl">Dirección <span class="ffr">*</span></label>
        <input class="ffi" type="text" value="${escapeAttr(fd.direccion || '')}" onchange="registration.updateField('direccion', this.value)" required />
      </div>

      <div class="ff">
        <label class="ffl">Ciudad <span class="ffr">*</span></label>
        <input class="ffi" type="text" value="${escapeAttr(fd.ciudad || '')}" onchange="registration.updateField('ciudad', this.value)" required />
      </div>
    </div>

    <div class="ffg">
      <div class="ff">
        <label class="ffl">Barrio</label>
        <input class="ffi" type="text" value="${escapeAttr(fd.barrio || '')}" onchange="registration.updateField('barrio', this.value)" />
      </div>

      <div class="ff">
        <label class="ffl">Fecha vencimiento autorización</label>
        <input class="ffi" type="date" value="${escapeAttr(fd.fechaVencimiento || '')}" onchange="registration.updateField('fechaVencimiento', this.value)" />
      </div>
    </div>
  `;
}

window.rF1 = renderStep1;
