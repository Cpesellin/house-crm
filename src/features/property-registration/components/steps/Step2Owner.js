import { registration } from '../../registrationStore.js';
import { escapeHtml, escapeAttr } from '../../../../utils/sanitizer.js';

export function renderStep2(container) {
  const fd = registration.getFormData();

  container.innerHTML = `
    <div class="ff">
      <label class="ffl">Propietario nombre <span class="ffr">*</span></label>
      <input class="ffi" type="text" value="${escapeAttr(fd.propietarioNombre || '')}" onchange="registration.updateField('propietarioNombre', this.value)" required />
    </div>

    <div class="ff">
      <label class="ffl">Teléfono <span class="ffr">*</span></label>
      <input class="ffi" type="tel" value="${escapeAttr(fd.propietarioTelefono || '')}" onchange="registration.updateField('propietarioTelefono', this.value)" required />
    </div>

    <div class="ff">
      <label class="ffl">Email</label>
      <input class="ffi" type="email" value="${escapeAttr(fd.propietarioEmail || '')}" onchange="registration.updateField('propietarioEmail', this.value)" />
    </div>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-top:16px;text-align:center;font-size:14px;color:#92400e;">
      &#x1F512; Solo visible para ti y admin
    </div>
  `;
}

window.rF2 = renderStep2;
