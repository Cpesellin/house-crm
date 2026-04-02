import { escapeHtml } from '../../../utils/sanitizer.js';
import { DAYS_SHORT } from '../agendaStore.js';

export function renderWeekView(container, weekStartDate, events, isAdmin) {
  const hoy = new Date().toISOString().split('T')[0];

  let html = '<div class="ag-week">';

  for (let d = 0; d < 7; d++) {
    const dt = new Date(weekStartDate);
    dt.setDate(dt.getDate() + d);
    const ds = dt.toISOString().split('T')[0];
    const isToday = ds === hoy;
    const dayEvts = events.filter(e => e.fecha === ds);

    const todayClass = isToday ? ' today' : '';
    html += `<div class="ag-week-day${todayClass}" onclick="window._agDate='${ds}';window._agView='day';rAgenda()">`;

    html += `<div class="ag-wd-name">${DAYS_SHORT[d]}</div>`;
    html += `<div class="ag-wd-num">${dt.getDate()}</div>`;

    if (dayEvts.length > 0) {
      const show = dayEvts.slice(0, 3);
      show.forEach(e => {
        const isPers = e.es_personal;
        if (isPers && isAdmin) {
          html += '<div class="ag-wd-evt pers">🔒 Ocupado</div>';
        } else {
          const inm = e.inmueble;
          const timeStr = e.hora_inicio ? e.hora_inicio.slice(0, 5) : '';
          let label;
          if (isPers) {
            label = timeStr + ' 🔒';
          } else if (inm && inm.tipo) {
            label = timeStr + ' ' + escapeHtml(inm.tipo);
          } else {
            label = timeStr + ' 📌';
          }
          html += `<div class="ag-wd-evt inm">${label}</div>`;
        }
      });

      if (dayEvts.length > 3) {
        html += `<div class="ag-wd-evt more">+${dayEvts.length - 3} más</div>`;
      }
    } else {
      html += '<div style="font-size:0.75rem;color:#999">Sin eventos</div>';
    }

    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// Backward compatibility
window.renderAgWeek = function (weekStartDate, events, isAdmin) {
  const hoy = new Date().toISOString().split('T')[0];

  let html = '<div class="ag-week">';

  for (let d = 0; d < 7; d++) {
    const dt = new Date(weekStartDate);
    dt.setDate(dt.getDate() + d);
    const ds = dt.toISOString().split('T')[0];
    const isToday = ds === hoy;
    const dayEvts = (events || []).filter(e => e.fecha === ds);

    const todayClass = isToday ? ' today' : '';
    html += `<div class="ag-week-day${todayClass}" onclick="window._agDate='${ds}';window._agView='day';rAgenda()">`;

    html += `<div class="ag-wd-name">${DAYS_SHORT[d]}</div>`;
    html += `<div class="ag-wd-num">${dt.getDate()}</div>`;

    if (dayEvts.length > 0) {
      const show = dayEvts.slice(0, 3);
      show.forEach(e => {
        const isPers = e.es_personal;
        if (isPers && isAdmin) {
          html += '<div class="ag-wd-evt pers">🔒 Ocupado</div>';
        } else {
          const inm = e.inmueble;
          const timeStr = e.hora_inicio ? e.hora_inicio.slice(0, 5) : '';
          let label;
          if (isPers) {
            label = timeStr + ' 🔒';
          } else if (inm && inm.tipo) {
            label = timeStr + ' ' + escapeHtml(inm.tipo);
          } else {
            label = timeStr + ' 📌';
          }
          html += `<div class="ag-wd-evt inm">${label}</div>`;
        }
      });

      if (dayEvts.length > 3) {
        html += `<div class="ag-wd-evt more">+${dayEvts.length - 3} más</div>`;
      }
    } else {
      html += '<div style="font-size:0.75rem;color:#999">Sin eventos</div>';
    }

    html += '</div>';
  }

  html += '</div>';
  return html;
};
