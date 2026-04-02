import { agenda, DAYS_SHORT, MONTHS_ES } from '../agendaStore.js';
import { fetchAgenda } from '../agendaService.js';
import { renderDayView } from './DayView.js';
import { renderWeekView } from './WeekView.js';
import { escapeHtml } from '../../../utils/sanitizer.js';

/**
 * Main agenda container renderer. Backward-compatible replacement for rAgenda().
 */
export async function rAgenda() {
  const container = document.getElementById('agc');
  if (!container) return;

  // Show loading spinner
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:48px;">
      <div style="border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;width:32px;height:32px;animation:spin 0.8s linear infinite;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  await fetchAgenda();

  const state = agenda.getState();
  const user = window.userStore;
  const isAdmin = user?.rol === 'admin' || user?.rol === 'oficina';

  const currentDate = state.currentDate ? new Date(state.currentDate) : new Date();
  const dayOfWeek = DAYS_SHORT[currentDate.getDay()] || '';
  const dayNum = currentDate.getDate();
  const monthName = MONTHS_ES[currentDate.getMonth()] || '';
  const year = currentDate.getFullYear();
  const dateLabel = `${dayOfWeek} ${dayNum} ${monthName} ${year}`;

  const viewMode = state.viewMode || 'day';
  const isDayActive = viewMode === 'day' ? ' act' : '';
  const isWeekActive = viewMode === 'week' ? ' act' : '';

  const adminSubtitle = isAdmin ? ' — Gestión de Arriendos' : '';

  // Render the active view into a temp container
  let viewHtml = '';
  const tempDiv = document.createElement('div');
  if (viewMode === 'day') {
    renderDayView(tempDiv);
    viewHtml = tempDiv.innerHTML;
  } else if (viewMode === 'week') {
    renderWeekView(tempDiv);
    viewHtml = tempDiv.innerHTML;
  }

  const html = `
    <style>
      .ag-nav{display:flex;align-items:center;justify-content:center;gap:12px;margin:12px 0;}
      .ag-date{font-family:'Fraunces',serif;font-size:1.25rem;font-weight:600;min-width:220px;text-align:center;}
      .ag-nav button{background:none;border:1px solid #ddd;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:1rem;transition:background 0.15s;}
      .ag-nav button:hover{background:#f3f4f6;}
      .card{background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;}
      .cdh{padding:20px 24px 0;}
      .chl{font-size:1.35rem;font-weight:700;margin:0;}
      .chi{font-size:0.85rem;color:#888;margin:2px 0 0;}
      .cht{display:flex;align-items:center;gap:8px;padding:8px 24px;flex-wrap:wrap;}
      .chsb{display:flex;gap:6px;flex:1;}
      .chsb button{padding:6px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:0.85rem;transition:all 0.15s;}
      .chsb button.act{background:#2563eb;color:#fff;border-color:#2563eb;}
      .chsb button:hover:not(.act){background:#f3f4f6;}
      .cdb{padding:0 24px 24px;}
    </style>
    <div class="card">
      <div class="cdh">
        <h2 class="chl">📅 Agenda${escapeHtml(adminSubtitle)}</h2>
        <p class="chi">Eventos y actividades programadas</p>
      </div>

      <div class="ag-nav">
        <button onclick="agNavDay(-1)">◀</button>
        <span class="ag-date">${escapeHtml(dateLabel)}</span>
        <button onclick="agNavDay(1)">▶</button>
      </div>

      <div class="cht">
        <div class="chsb">
          <button class="${isDayActive.trim()}" onclick="agSetView('day')">Día</button>
          <button class="${isWeekActive.trim()}" onclick="agSetView('week')">Semana</button>
        </div>
        <button onclick="abrirAgendarEvt()" style="padding:6px 16px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600;">+ Nuevo evento</button>
      </div>

      <div class="cdb">
        ${viewHtml}
      </div>
    </div>`;

  container.innerHTML = html;
}

/**
 * AgendaView class with mount/unmount lifecycle for store subscription.
 */
export class AgendaView {
  constructor() {
    this._unsubscribe = null;
  }

  mount(container) {
    // Initial render
    rAgenda();

    // Subscribe to agenda store changes
    this._unsubscribe = agenda.subscribe(() => {
      rAgenda();
    });
  }

  unmount() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
}

// Backward compatibility
window.rAgenda = rAgenda;
window.AgendaView = AgendaView;
