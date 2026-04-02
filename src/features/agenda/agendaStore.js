// agendaStore.js - Reactive store for agenda state
// Replaces legacy _agDate, _agView, _agEvts globals

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b'];

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const EVENT_TYPES = {
  visita: '\uD83D\uDD11 Visita',
  entrega: '\uD83D\uDD11 Entrega llaves',
  firma: '\uD83D\uDCDD Firma',
  personal: '\uD83D\uDD12 Personal',
  otro: '\uD83D\uDCCC Otro'
};

// ---------------------------------------------------------------------------
// Internal reactive state
// ---------------------------------------------------------------------------
let _state = {
  currentDate: new Date(),
  viewMode: 'day',   // 'day' | 'week'
  events: [],
  loading: false
};

const _listeners = new Set();

function _notify() {
  const snapshot = agenda.getState();
  _listeners.forEach(fn => {
    try { fn(snapshot); } catch (e) { console.error('[agendaStore] listener error', e); }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _cloneDate(d) {
  return new Date(d.getTime());
}

function _toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const agenda = {
  // --- Setters -----------------------------------------------------------

  setDate(date) {
    _state.currentDate = date instanceof Date ? _cloneDate(date) : new Date(date);
    _notify();
  },

  nextDay() {
    const d = _cloneDate(_state.currentDate);
    const offset = _state.viewMode === 'week' ? 7 : 1;
    d.setDate(d.getDate() + offset);
    _state.currentDate = d;
    _notify();
  },

  prevDay() {
    const d = _cloneDate(_state.currentDate);
    const offset = _state.viewMode === 'week' ? 7 : 1;
    d.setDate(d.getDate() - offset);
    _state.currentDate = d;
    _notify();
  },

  setView(mode) {
    if (mode === 'day' || mode === 'week') {
      _state.viewMode = mode;
      _notify();
    }
  },

  setEvents(data) {
    _state.events = Array.isArray(data) ? data : [];
    _notify();
  },

  setLoading(bool) {
    _state.loading = !!bool;
    _notify();
  },

  // --- Getters -----------------------------------------------------------

  getState() {
    return {
      currentDate: _cloneDate(_state.currentDate),
      viewMode: _state.viewMode,
      events: [..._state.events],
      loading: _state.loading
    };
  },

  getSelectedDateISO() {
    return _toISO(_state.currentDate);
  },

  getWeekStart() {
    const d = _cloneDate(_state.currentDate);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  getWeekEnd() {
    const d = agenda.getWeekStart();
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  },

  eventsForDate(dateStr) {
    return _state.events.filter(ev => ev.fecha === dateStr);
  },

  eventsByHour(dateStr) {
    const matched = agenda.eventsForDate(dateStr);
    const slots = {};
    for (let h = 7; h <= 20; h++) {
      const hourStr = String(h).padStart(2, '0');
      const inSlot = matched.filter(ev => {
        if (!ev.hora_inicio) return false;
        return ev.hora_inicio.startsWith(hourStr + ':');
      });
      slots[h] = inSlot.length > 0 ? inSlot : null;
    }
    return slots;
  },

  formatDateHeader() {
    const d = _state.currentDate;
    const dayName = DAYS_SHORT[d.getDay()];
    const dayNum = d.getDate();
    const monthName = MONTHS_ES[d.getMonth()];
    return `${dayName} ${dayNum} de ${monthName}`;
  },

  // --- Subscription ------------------------------------------------------

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }
};

// ---------------------------------------------------------------------------
// Backward compatibility - global getters/setters
// ---------------------------------------------------------------------------
Object.defineProperty(window, '_agDate', {
  get() { return _cloneDate(_state.currentDate); },
  set(v) { agenda.setDate(v); },
  configurable: true
});

Object.defineProperty(window, '_agView', {
  get() { return _state.viewMode; },
  set(v) { agenda.setView(v); },
  configurable: true
});

Object.defineProperty(window, '_agEvts', {
  get() { return [..._state.events]; },
  configurable: true
});

window.agNavDay = (off) => {
  const d = _cloneDate(_state.currentDate);
  const multiplier = _state.viewMode === 'week' ? 7 : 1;
  d.setDate(d.getDate() + off * multiplier);
  _state.currentDate = d;
  _notify();
};

window.agSetView = (v) => agenda.setView(v);

window.agenda = agenda;

export { agenda, DAYS_SHORT, MONTHS_ES, EVENT_TYPES };
