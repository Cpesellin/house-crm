# Agenda Module — Integration Guide

## File structure

```
src/features/agenda/
├── index.js                    ← barrel export
├── agendaStore.js              ← state: currentDate, viewMode, events
├── agendaService.js            ← CRUD: fetchAgenda, createEvent, deleteEvent
└── components/
    ├── AgendaView.js           ← main container (rAgenda replacement)
    ├── DayView.js              ← hourly timeline 7am-8pm
    ├── WeekView.js             ← 7-day grid with event previews
    └── EventModal.js           ← create event form modal
```

## What was extracted

| Original | New | Window compat |
|---|---|---|
| `_agDate` | `agenda.getState().currentDate` | `window._agDate` getter/setter |
| `_agView` | `agenda.getState().viewMode` | `window._agView` getter/setter |
| `_agEvts` | `agenda.getState().events` | `window._agEvts` getter |
| `rAgenda()` | `AgendaView.rAgenda()` | `window.rAgenda` |
| `agNavDay(off)` | `agenda.nextDay/prevDay` | `window.agNavDay` |
| `agSetView(v)` | `agenda.setView(v)` | `window.agSetView` |
| `renderAgDay()` | `DayView.renderDayView()` | `window.renderAgDay` |
| `renderAgWeek()` | `WeekView.renderWeekView()` | `window.renderAgWeek` |
| `abrirAgendarEvt()` | `EventModal.open()` | `window.abrirAgendarEvt` |
| `guardarEvt()` | `agendaService.createEvent()` | `window.guardarEvt` |
| `cancelarEvt()` | `agendaService.deleteEvent()` | `window.cancelarEvt` |

## Permission model

| Role | What they see |
|---|---|
| Admin / Oficina | All events from all users. Personal events show as "🔒 OCUPADO" (details hidden) |
| Gestor arriendos | Own events + events on arriendo properties they manage |
| Asesor | Only their own events |

## Event types

| Type | Emoji | Shows inmueble? | Shows client? |
|---|---|---|---|
| `visita` | 🔑 Visita | Yes | Yes |
| `entrega` | 🔑 Entrega llaves | Yes | Yes |
| `firma` | 📝 Firma | Yes | Yes |
| `otro` | 📌 Otro | Yes | Optional |
| `personal` | 🔒 Personal | No | No |

## Day view slots

```
7 AM  [ event card ] or [ + Agendar aquí ]
8 AM  [ event card ]
9 AM  [ + Agendar aquí ]  ← clicking opens EventModal with date + hour pre-filled
...
8 PM  [ event card ]
```

## Week view

```
Dom | Lun | Mar | Mié | Jue | Vie | Sáb
 5  |  6  |  7  |  8  |  9  | 10  | 11
    | 🔑  | 📝  |     | 🔑  |     |
    |      |     |     | 🔑  |     |
    |      |     |     |+1más|     |

Today column has thicker blue border.
Click any day → switches to day view for that date.
Max 3 events shown per day, "+N más" if overflow.
```

## XSS sanitization

All dynamic text escaped:
- `e.titulo`, `e.nota`, `e.cliente_nombre`, `e.cliente_telefono` → `escapeHtml()`
- `inmueble.tipo`, `inmueble.ciudad`, `inmueble.direccion` → `escapeHtml()`
- `captador.nombre` → `escapeHtml()`
- `e.id` in onclick handlers → `escapeAttr()`
