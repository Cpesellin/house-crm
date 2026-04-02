import { escapeHtml, escapeAttr } from '../../../utils/sanitizer.js';
import { EVENT_TYPES } from '../agendaStore.js';

function formatHour(h) {
  if (h === 0 || h === 12) {
    return (h === 0 ? '12' : '12') + (h < 12 ? ' AM' : ' PM');
  }
  return (h > 12 ? h - 12 : h) + (h >= 12 ? ' PM' : ' AM');
}

export function renderDayView(container, dateStr, events, isAdmin) {
  const dayEvents = events.filter(e => e.fecha === dateStr);

  const slots = {};
  for (let h = 7; h <= 20; h++) {
    slots[h] = [];
  }

  dayEvents.forEach(e => {
    const hr = parseInt(e.hora_inicio.split(':')[0], 10);
    if (slots[hr] !== undefined) {
      slots[hr].push(e);
    }
  });

  let html = '';

  for (let h = 7; h <= 20; h++) {
    const label = formatHour(h);
    const paddedHour = String(h).padStart(2, '0');
    const evts = slots[h];

    html += '<div class="ag-slot">';
    html += `<div class="ag-hora">${label}</div>`;

    if (evts && evts.length > 0) {
      evts.forEach(e => {
        const isPers = e.es_personal;

        if (isPers && isAdmin) {
          html += '<div class="ag-evt personal">🔒 OCUPADO</div>';
        } else {
          const cls = isPers ? 'personal' : 'inmueble';
          html += `<div class="ag-evt ${cls}">`;

          const tipoLabel = EVENT_TYPES[e.tipo_evento] || e.tipo_evento || 'Evento';
          html += `<div class="ag-evt-tipo">${escapeHtml(tipoLabel)}</div>`;

          let tituloText = e.hora_inicio + ' - ' + e.hora_fin;
          if (!isPers && e.inmueble) {
            tituloText += ' · ' + (e.inmueble.tipo || '') + ' en ' + (e.inmueble.ciudad || '');
          } else if (e.titulo) {
            tituloText += ' · ' + e.titulo;
          }
          html += `<div class="ag-evt-titulo">${escapeHtml(tituloText)}</div>`;

          if (!isPers && e.cliente_nombre) {
            let subText = '👤 ' + escapeHtml(e.cliente_nombre);
            if (e.telefono) {
              subText += ' · ' + escapeHtml(e.telefono);
            }
            html += `<div class="ag-evt-sub">${subText}</div>`;
          }

          if (e.nota) {
            html += `<div class="ag-evt-sub" style="font-style:italic">${escapeHtml(e.nota)}</div>`;
          }

          if (!isPers && e.inmueble && e.inmueble.captador) {
            html += `<div class="ag-evt-sub">Captador: ${escapeHtml(e.inmueble.captador.nombre)}</div>`;
          }

          html += `<span class="ag-evt-del" onclick="cancelarEvt('${escapeAttr(e.id)}')">✕</span>`;
          html += '</div>';
        }
      });
    } else {
      html += `<div class="ag-evt libre" onclick="abrirAgendarEvt(null,'${dateStr}','${paddedHour}:00')">+ Agendar aquí</div>`;
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

// Backward compatibility
window.renderAgDay = function (selDay, isAdmin) {
  const events = window._agEvents || [];
  const dateStr = selDay;

  const dayEvents = events.filter(e => e.fecha === dateStr);

  const slots = {};
  for (let h = 7; h <= 20; h++) {
    slots[h] = [];
  }

  dayEvents.forEach(e => {
    const hr = parseInt(e.hora_inicio.split(':')[0], 10);
    if (slots[hr] !== undefined) {
      slots[hr].push(e);
    }
  });

  let html = '';

  for (let h = 7; h <= 20; h++) {
    const label = formatHour(h);
    const paddedHour = String(h).padStart(2, '0');
    const evts = slots[h];

    html += '<div class="ag-slot">';
    html += `<div class="ag-hora">${label}</div>`;

    if (evts && evts.length > 0) {
      evts.forEach(e => {
        const isPers = e.es_personal;

        if (isPers && isAdmin) {
          html += '<div class="ag-evt personal">🔒 OCUPADO</div>';
        } else {
          const cls = isPers ? 'personal' : 'inmueble';
          html += `<div class="ag-evt ${cls}">`;

          const tipoLabel = EVENT_TYPES[e.tipo_evento] || e.tipo_evento || 'Evento';
          html += `<div class="ag-evt-tipo">${escapeHtml(tipoLabel)}</div>`;

          let tituloText = e.hora_inicio + ' - ' + e.hora_fin;
          if (!isPers && e.inmueble) {
            tituloText += ' · ' + (e.inmueble.tipo || '') + ' en ' + (e.inmueble.ciudad || '');
          } else if (e.titulo) {
            tituloText += ' · ' + e.titulo;
          }
          html += `<div class="ag-evt-titulo">${escapeHtml(tituloText)}</div>`;

          if (!isPers && e.cliente_nombre) {
            let subText = '👤 ' + escapeHtml(e.cliente_nombre);
            if (e.telefono) {
              subText += ' · ' + escapeHtml(e.telefono);
            }
            html += `<div class="ag-evt-sub">${subText}</div>`;
          }

          if (e.nota) {
            html += `<div class="ag-evt-sub" style="font-style:italic">${escapeHtml(e.nota)}</div>`;
          }

          if (!isPers && e.inmueble && e.inmueble.captador) {
            html += `<div class="ag-evt-sub">Captador: ${escapeHtml(e.inmueble.captador.nombre)}</div>`;
          }

          html += `<span class="ag-evt-del" onclick="cancelarEvt('${escapeAttr(e.id)}')">✕</span>`;
          html += '</div>';
        }
      });
    } else {
      html += `<div class="ag-evt libre" onclick="abrirAgendarEvt(null,'${dateStr}','${paddedHour}:00')">+ Agendar aquí</div>`;
    }

    html += '</div>';
  }

  return html;
};
