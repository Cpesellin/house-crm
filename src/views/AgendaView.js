/**
 * AgendaView – composes the Agenda feature
 * and renders into the #agc container.
 */
import { rAgenda } from '../features/agenda/index.js';

export function mountAgendaView() {
  // rAgenda() handles rendering the full agenda UI into #agc.
  rAgenda();
}

window.mountAgendaView = mountAgendaView;
