import { registration, CARACTERISTICAS } from '../../registrationStore.js';

export function renderStep3(container) {
  const f = registration.getFormData();

  container.innerHTML = `
    <div class="ffg">
      <div class="ff">
        <label class="ffl">Área construida (m²)</label>
        <input class="ffi" type="number" min="0" placeholder="0" value="${f.area || ''}"
          onchange="window._reg.updateField('area', +this.value)">
      </div>
      <div class="ff">
        <label class="ffl">Área total (m²)</label>
        <input class="ffi" type="number" min="0" placeholder="0" value="${f.areaTotal || ''}"
          onchange="window._reg.updateField('areaTotal', +this.value)">
      </div>
    </div>

    <div class="ff" style="margin-top:12px">
      <label class="ffl">Estrato</label>
      <div style="display:flex;gap:6px;margin-top:4px">
        ${[1,2,3,4,5,6].map(n => `
          <button style="width:40px;height:40px;border-radius:8px;border:2px solid ${f.estrato === n ? 'var(--b500)' : '#ddd'};background:${f.estrato === n ? 'var(--b50)' : '#fff'};font-weight:600;cursor:pointer"
            onclick="window._reg.updateField('estrato',${n});window.rF3(this.closest('[data-step-container]') || this.parentElement.parentElement.parentElement.parentElement)">${n}</button>
        `).join('')}
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-top:16px;flex-wrap:wrap">
      ${renderCounter('🛏️ Habitaciones', 'habitaciones', f.habitaciones || 0)}
      ${renderCounter('🚿 Baños', 'banos', f.banos || 0)}
      ${renderCounter('🚗 Parqueos', 'parqueos', f.parqueos || 0)}
    </div>

    <div class="ff" style="margin-top:16px">
      <label class="ffl">Características</label>
      <div class="cps" style="margin-top:6px">
        ${CARACTERISTICAS.map(c => `
          <div class="ch${(f.caracteristicas || []).includes(c.id) ? ' on' : ''}"
            onclick="window._reg.toggleCaracteristica('${c.id}');window.rF3(this.closest('[data-step-container]') || this.parentElement.parentElement)">${c.emoji || ''} ${c.label}</div>
        `).join('')}
      </div>
    </div>
  `;

  container.setAttribute('data-step-container', '3');
  window._reg = registration;
}

function renderCounter(label, field, value) {
  return `
    <div class="ctr">
      <div class="ctrl">${label}</div>
      <div class="ctrc">
        <button class="cb" onclick="window._reg.decrementField('${field}');window.rF3(this.closest('[data-step-container]') || this.parentElement.parentElement.parentElement.parentElement)">−</button>
        <span class="cv">${value}</span>
        <button class="cb" onclick="window._reg.incrementField('${field}');window.rF3(this.closest('[data-step-container]') || this.parentElement.parentElement.parentElement.parentElement)">+</button>
      </div>
    </div>
  `;
}

window.rF3 = renderStep3;
