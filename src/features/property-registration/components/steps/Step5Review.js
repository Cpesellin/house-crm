import { registration } from '../../registrationStore.js';
import { propertyEmoji, formatMoney } from '../../../inventory/inventoryStore.js';
import { escapeHtml } from '../../../../utils/sanitizer.js';

export function renderStep5(container) {
  const f = registration.getFormData();
  const emoji = propertyEmoji(f.tipoInmueble);
  const negLabel = f.tipoNegocio === 'venta' ? 'Venta' : f.tipoNegocio === 'arriendo' ? 'Arriendo' : f.tipoNegocio || '';

  let priceHtml = '';
  if (f.precio) priceHtml += `<div style="font-size:16px;font-weight:700;color:var(--b700)">${formatMoney(f.precio)}</div>`;
  if (f.precioArriendo) priceHtml += `<div style="font-size:14px;color:var(--g600)">${formatMoney(f.precioArriendo)} /mes</div>`;

  container.innerHTML = `
    <div style="background:var(--b50);border:1px solid var(--b200);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:28px">${emoji}</span>
        <span style="background:var(--b100);color:var(--b700);padding:2px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer"
          onclick="navigator.clipboard.writeText('${escapeHtml(f.codigo || '')}')">${escapeHtml(f.codigo || 'HOUSE-???')}</span>
      </div>
      <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:700;margin-bottom:4px">${escapeHtml(f.tipoInmuebleNombre || f.tipoInmueble || '')}</div>
      <div style="font-size:13px;color:var(--g600);margin-bottom:8px">📍 ${escapeHtml(f.direccion || '')}, ${escapeHtml(f.ciudad || '')}</div>
      ${priceHtml ? `<div style="margin-bottom:10px">${priceHtml}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${negLabel ? `<span class="sp">${escapeHtml(negLabel)}</span>` : ''}
        ${f.habitaciones ? `<span class="sp">🛏️ ${f.habitaciones}</span>` : ''}
        ${f.banos ? `<span class="sp">🚿 ${f.banos}</span>` : ''}
        ${f.area ? `<span class="sp">📐 ${f.area} m²</span>` : ''}
        ${f.areaTotal ? `<span class="sp">📏 ${f.areaTotal} m² tot</span>` : ''}
        ${f.estrato ? `<span class="sp">E${f.estrato}</span>` : ''}
      </div>
    </div>
    <div style="font-size:10px;color:var(--g400);padding:0 4px">👤 ${escapeHtml(f.nombre || '')} · ${escapeHtml(f.telefono || '')}</div>
  `;

  container.setAttribute('data-step-container', '5');
}

window.rF5 = renderStep5;
