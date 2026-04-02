# Pipeline Module — Integration Guide

## File structure

```
src/features/pipeline/
├── index.js                          ← barrel export
├── pipelineStore.js                  ← column state, drag state, filters
├── pipelineService.js                ← quickMove, reVal, responderSol, notifications
└── components/
    ├── PipelineCard.js               ← compact kanban card (XSS-safe)
    ├── PipelineBoard.js              ← 5-column board + extras + drag-drop
    └── PipelineNav.js                ← nav badges with counters

src/core/
└── notifications.js                  ← noti(), toast(), confirm() (new shared service)
```

## State Flow Diagram

```
                    ┌──────────────────┐
                    │   DISPONIBLE     │ ← New properties land here
                    │   (Threshold: 15d)│   estado = null | 'Disponible' | 'Verificar Disponibilidad'
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌──────────────┐  ┌──────────┐
     │AÚN DISP.   │  │  ARRENDADO   │  │ VENDIDO  │
     │(Thresh: 10d)│  │  (Final)     │  │ (Final)  │
     └──────┬─────┘  │ 🔑 + alertas │  │💰+ alert │
            │        └──────────────┘  └──────────┘
            │                                │
            ▼                                ▼
     ┌──────────┐                    ┌──────────┐
     │ RETIRADO │ ←─── also from ───│any state │
     │ (Final)  │      any state     └──────────┘
     │ ⛔       │
     └──────────┘

  FINAL_STATES = ['Arrendado', 'Vendido', 'Retirado']
  → Require confirmation dialog before moving
  → Generate alerts to ALL users + admin-specific alert
```

## Freshness Timer Logic

```
For each property, _dias = daysSince(p.fecha_estado)

  Column         Threshold   Green (ok)      Yellow (warn)    Red (danger)
  ─────────────  ─────────   ─────────────   ──────────────   ────────────
  Disponible     15 days     0-7d            8-15d            >15d
  Aún Disponible 10 days     0-5d            6-10d            >10d
  Arrendado      30 days     0-15d           16-30d           >30d
  Vendido        30 days     0-15d           16-30d           >30d
  Retirado       999 days    always green    —                —

  Formula: green if d <= floor(threshold * 0.5)
           warn  if d <= threshold
           red   if d > threshold

  Timer reset: reVal(id) sets fecha_estado = now, ultima_confirmacion = now
```

## Notification Matrix

```
  Transition                          Recipients                 Level
  ──────────────────────────────────  ────────────────────────   ─────
  → Verificar Disponibilidad         captador email + admin     rojo
  → Aún Disponible                   all                        verde
  → Retirado (from Verificar)        all                        rojo
  → Arrendado/Vendido/Retirado       all + admin (2 alerts)     verde
  → Any other state                  all                        info

  Price change (via saveAll)          all + admin                rojo + amarillo
  New property (via form)             all + admin + gestor       info
```

## What was extracted

| Original (HTML) | New location | Window alias |
|---|---|---|
| `rPipe()` | `PipelineBoard.js` | `window.rPipe` |
| `quickMove()` | `pipelineService.js` | `window.quickMove` |
| `reVal()` | `pipelineService.js` | `window.reVal` |
| `dStart()` | `pipelineService.js` | `window.dStart` |
| `scrollToCol()` | `PipelineNav.js` | `window.scrollToCol` |
| `responderSol()` | `pipelineService.js` | `window.responderSol` |
| `noti()` | `notifications.js` | `window.noti` |
| Pipeline nav HTML | `PipelineNav.js` | `window.renderPipelineNav` |
| Pipeline card HTML | `PipelineCard.js` | `window.renderPipelineCard` |
| `PCOLS` | `inventoryStore.js` | `window.PCOLS` (from Step 5) |
| `UMBRAL` | `inventoryStore.js` | `window.UMBRAL` (from Step 5) |
| `FINAL_STATES` | `inventoryStore.js` | `window.FINAL_STATES` (from Step 5) |

## How to integrate

### In the existing rPipe() call chain:

```js
// BEFORE (in go() function):
if (s === 'mis') rPipe();

// AFTER (same call — rPipe is now from PipelineBoard.js):
// window.rPipe still works thanks to backward compat.
// It refreshes the pipeline store and re-renders the board.
```

### Load sequence:

```
load()
  → inventory.setItems(data)      // Step 5
  → SOL = sols                     // still global during migration
  → pipeline.refresh()             // NEW: recomputes columns
  → if on 'mis' tab: rPipe()      // renders the board
```

### For module mode (Vite):

```js
import { pipeline, rPipe, PipelineBoard, renderPipelineNav } from './features/pipeline';

// After data load:
pipeline.refresh();

// Mount board:
const board = new PipelineBoard(document.getElementById('pipeline'));
board.mount();

// Mount nav:
const navEl = document.getElementById('mis-nav');
pipeline.subscribe(state => renderPipelineNav(navEl, state));
```

## What was NOT changed

- `solicitarVerif()` — still in main HTML (solicitudes initiation)
- `oM()` — property detail modal (called on card click via globalIdx)
- `abrirAgendarEvt()` — agenda modal (called from arriendos column)
- `cfShow()` / `cfCancel()` — confirmation dialog (used by quickMove)
- `toast()` — toast notifications (called throughout)
- `load()` — data reload (called after every state change)

All still work via `window.*` references.
