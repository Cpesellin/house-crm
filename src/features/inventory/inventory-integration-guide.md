# Inventory Module — Integration Guide

## File structure

```
src/features/inventory/
├── index.js                     ← barrel export
├── inventoryStore.js            ← state (replaces D[], MIS[], F{}, AS[], VS[], sliders)
├── inventoryService.js          ← Supabase API calls
└── components/
    ├── PropertyCard.js          ← single card (XSS-safe)
    ├── PropertyGrid.js          ← grid container (replaces render())
    ├── SearchFilters.js         ← chips + sliders + search (replaces doSearch/tc/etc.)
    └── HeroStats.js             ← stats bar (replaces uSt())
```

## What was extracted

### Global variables → inventoryStore.js

| Original | New | Access during migration |
|----------|-----|------------------------|
| `D[]` | `inventory.getAll()` | `window.D` (getter synced) |
| `MIS[]` | `inventory.getMyProperties(userId)` | `window.MIS` (getter synced) |
| `F{}` | `inventory.getState().filters` | `window.F` (same object ref) |
| `AS[]` | `ARRIENDO_STEPS` | `window.AS` |
| `VS[]` | `VENTA_STEPS` | `window.VS` |
| `aL/aH/vL/vH/aA/vA` | `inventory.getState().arriendo/venta` | `window.aL` etc. (getters) |
| `_myFilter` | `inventory.getState().myOnly` | via `inventory.toggleMyOnly()` |
| `PCOLS` | `PIPELINE_COLS` | `window.PCOLS` |
| `UMBRAL` | `FRESHNESS_THRESHOLDS` | `window.UMBRAL` |
| `FINAL_STATES` | `FINAL_STATES` | `window.FINAL_STATES` |

### Functions → distributed

| Original | New location | Window alias |
|----------|-------------|-------------|
| `render(ls)` | `PropertyGrid.js` | `window.render` |
| `doSearch()` | `SearchFilters + inventoryStore` | `window.doSearch` |
| `autoSearch()` | `inventory.autoSearch()` | `window.autoSearch` |
| `filtrar(p, q)` | `inventoryStore._matchesFilters()` | internal |
| `limpiar()` | `SearchFilters.clearAll()` | `window.limpiar` |
| `mostrarTodo()` | same as limpiar | `window.mostrarTodo` |
| `toggleMis()` | `inventory.toggleMyOnly()` | `window.toggleMis` |
| `tc(el)` | chip click handlers in SearchFilters | inline |
| `qf(g, v)` | `inventory.removeFilter()` | inline |
| `resetA()` | `inventory.resetArriendoRange()` | inline |
| `resetV2()` | `inventory.resetVentaRange()` | inline |
| `renderSel()` | `SearchFilters._updateSelectionBar()` | auto |
| `iSl() / iDR()` | `SearchFilters._buildSlider()` | auto |
| `populateAsesorFilter()` | `SearchFilters.populateAsesorFilter()` | inline |
| `renderRecent()` | `SearchFilters.renderRecentSearches()` | inline |
| `getRecent() / addRecent()` | `inventoryStore` internal | `window.getRecent/addRecent` |
| `uSt()` | `HeroStats._update()` | `window.uSt` |
| `fm()` | `formatMoney()` | `window.fm` |
| `emo()` | `propertyEmoji()` | `window.emo` |
| `eV()/eA()/eA2()` | `isVenta()/isArriendo()/isAmbas()` | `window.eV/eA/eA2` |
| `diasDesde()` | `diasDesde()` | `window.diasDesde` |
| `timerBadge()` | `timerBadge()` | `window.timerBadge` |
| `findInm(id)` | `inventory.getById(id)` | `window.findInm` |
| `descInm(p)` | inline lambda | `window.descInm` |

## How to integrate

### Option A: Module mode (Vite project)

```js
// main.js
import { inventory, fetchInventory, PropertyGrid, SearchFilters, HeroStats } from './features/inventory';
import { ProtectedRoute } from './components/ProtectedRoute.js';

ProtectedRoute.init({
  onAuthenticated: async (user) => {
    sApp(); // existing UI setup

    // Mount components
    const hero = new HeroStats(document.querySelector('.hero'));
    hero.mount();

    const filters = new SearchFilters({ container: document.getElementById('filters-root') });
    filters.mount();

    const grid = new PropertyGrid(document.getElementById('res'), {
      getUserId: () => user.id,
      getUserRole: () => user.rol,
      getSolicitudes: () => window.SOL || [],
    });
    grid.mount();

    // Fetch data (triggers auto-render via subscriptions)
    await fetchInventory();
    filters.populateAsesorFilter(inventory.getAll(), user);
    filters.renderRecentSearches();
  },
});
```

### Option B: Legacy HTML mode (gradual migration)

Add scripts before the main `<script>` block:

```html
<script src="src/utils/sanitizer.js"></script>
<script src="src/utils/dom-helper.js"></script>
<script type="module">
  import './src/features/inventory/index.js';
  // All window.* compat aliases are now active
  // Existing code using D[], render(), doSearch() etc. still works
</script>
```

Then in the main `<script>`, replace the load() data assignment:

```js
// BEFORE:
D = inv || [];
D.forEach(p => { p._dias = diasDesde(p.fecha_estado); });
MIS = D.filter(p => p.captador_id === U.id);

// AFTER (inventory store handles _dias and filtering):
inventory.setItems(inv || []);
// D, MIS still work via window getters
```

### Option C: Hybrid (recommended for now)

1. Load the modules for the backward compat aliases
2. Keep the existing HTML DOM structure unchanged
3. Replace load() data handling with `inventory.setItems()`
4. Replace render() calls — they now use PropertyCard with XSS protection
5. Everything else (oM, rPipe, dashboard, etc.) continues using window.D as before

## What NOT to change yet

These functions still reference inventory data but live outside this module:

- `oM()` — property detail modal (Step 3 sanitized, not yet extracted)
- `rPipe()` — pipeline view (future extraction)
- `rPort()` — portales view
- `rDash*()` — dashboard views
- `shareInm()` — WhatsApp sharing
- `quickMove()` — state transitions
- `solicitarVerif()` / `responderSol()` — solicitudes system

They all work fine because `window.D`, `window.MIS`, `window.findInm()` etc. are synced.
