import { escapeHtml, escapeAttr } from '../../../utils/sanitizer.js';
import { propertyEmoji } from '../../inventory/inventoryStore.js';
import { createEvent } from '../agendaService.js';

export class EventModal {
  static open(opts = {}) {
    const { inmuebleId, fecha, hora } = opts;
    const user = window.userStore;
    const inventory = window.D || [];

    const p = inmuebleId ? inventory.find(x => x.id === inmuebleId) : null;

    const defaultFecha = fecha || new Date().toISOString().split('T')[0];
    const defaultHora = hora || '09:00';

    // Build inmueble preview card
    let previewHtml = '';
    if (p) {
      const emoji = propertyEmoji(p);
      previewHtml = `
        <div style="background:#f0f4ff;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.5rem;">${escapeHtml(emoji)}</span>
          <div>
            <strong>${escapeHtml(p.tipo || '')}</strong> — ${escapeHtml(p.ciudad || '')}
            <div style="font-size:0.85rem;color:#666;">${escapeHtml(p.direccion || '')}</div>
          </div>
        </div>`;
    }

    // Build inmueble select options from arriendo properties that are available
    const availableProps = inventory.filter(x =>
      x.negocio === 'arriendo' &&
      (x.estado === 'Disponible' || x.estado === 'Aún Disponible')
    );
    const inmOptions = availableProps.map(x => {
      const emoji = propertyEmoji(x);
      const selected = inmuebleId && x.id === inmuebleId ? ' selected' : '';
      return `<option value="${escapeAttr(x.id)}"${selected}>${escapeHtml(emoji)} ${escapeHtml(x.tipo || '')} - ${escapeHtml(x.ciudad || '')} - ${escapeHtml(x.direccion || '')}</option>`;
    }).join('');

    const modalHtml = `
      <div id="agModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.remove()">
        <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:480px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.18);" onclick="event.stopPropagation()">
          <h3 style="margin:0 0 16px;font-size:1.25rem;">📅 Nuevo Evento</h3>

          ${previewHtml}

          <div style="margin-bottom:12px;">
            <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Tipo de evento</label>
            <select id="agTipo" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;" onchange="
              var v=this.value;
              var iw=document.getElementById('agInmWrap');
              var cw=document.getElementById('agCliWrap');
              if(v==='personal'){if(iw)iw.style.display='none';if(cw)cw.style.display='none';}
              else{if(iw)iw.style.display='';if(cw)cw.style.display='';}
            ">
              <option value="visita">Visita</option>
              <option value="entrega">Entrega</option>
              <option value="firma">Firma</option>
              <option value="otro">Otro</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div id="agInmWrap" style="margin-bottom:12px;">
            <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Inmueble</label>
            <select id="agInm" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;">
              <option value="">— Seleccionar inmueble —</option>
              ${inmOptions}
            </select>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:12px;">
            <div style="flex:1;">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Fecha</label>
              <input id="agFecha" type="date" value="${escapeAttr(defaultFecha)}" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Hora inicio</label>
              <input id="agHora" type="time" value="${escapeAttr(defaultHora)}" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Hora fin</label>
              <input id="agHoraFin" type="time" value="" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>

          <div id="agCliWrap" style="margin-bottom:12px;">
            <div style="display:flex;gap:10px;">
              <div style="flex:1;">
                <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Cliente</label>
                <input id="agCliente" type="text" placeholder="Nombre del cliente" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
              </div>
              <div style="flex:1;">
                <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Teléfono</label>
                <input id="agCliTel" type="tel" placeholder="Teléfono" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
              </div>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px;">Título / Nota</label>
            <input id="agTitulo" type="text" placeholder="Descripción breve" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button onclick="document.getElementById('agModal')?.remove()" style="padding:8px 20px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;">Cancelar</button>
            <button onclick="EventModal.save()" style="padding:8px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:600;">Guardar</button>
          </div>
        </div>
      </div>`;

    // Remove existing modal if present
    const existing = document.getElementById('agModal');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper.firstElementChild);
  }

  static async save() {
    const tipo = document.getElementById('agTipo')?.value || '';
    const inmuebleId = document.getElementById('agInm')?.value || '';
    const fecha = document.getElementById('agFecha')?.value || '';
    const hora = document.getElementById('agHora')?.value || '';
    const horaFin = document.getElementById('agHoraFin')?.value || '';
    const cliente = document.getElementById('agCliente')?.value || '';
    const clienteTel = document.getElementById('agCliTel')?.value || '';
    const titulo = document.getElementById('agTitulo')?.value || '';

    // Validate required fields
    if (!fecha) {
      alert('La fecha es obligatoria');
      return;
    }
    if (!hora) {
      alert('La hora de inicio es obligatoria');
      return;
    }

    const eventData = {
      tipo_evento: tipo,
      inmueble_id: inmuebleId || null,
      fecha,
      hora,
      hora_fin: horaFin || null,
      cliente: cliente || null,
      cliente_tel: clienteTel || null,
      titulo: titulo || null,
    };

    try {
      await createEvent(eventData);
      const modal = document.getElementById('agModal');
      if (modal) modal.remove();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Error al crear el evento');
    }
  }
}

// Backward compatibility
window.EventModal = EventModal;
window.abrirAgendarEvt = (inmId, f, h) => EventModal.open({ inmuebleId: inmId, fecha: f, hora: h });
