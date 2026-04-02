/**
 * HOUSE CRM — Agenda Module (barrel export)
 */

export { agenda, DAYS_SHORT, MONTHS_ES, EVENT_TYPES } from './agendaStore.js';
export { fetchAgenda, createEvent, deleteEvent, openEventModal } from './agendaService.js';
export { renderDayView } from './components/DayView.js';
export { renderWeekView } from './components/WeekView.js';
export { AgendaView, rAgenda } from './components/AgendaView.js';
export { default as EventModal } from './components/EventModal.js';
