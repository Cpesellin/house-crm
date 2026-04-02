/**
 * HOUSE CRM — Inventory Module (barrel export)
 *
 * Usage:
 *   import { inventory, fetchInventory, PropertyGrid, SearchFilters, HeroStats } from './features/inventory';
 */

// Store
export { inventory, ARRIENDO_STEPS, VENTA_STEPS, PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES } from './inventoryStore.js';
export { diasDesde, isVenta, isArriendo, isAmbas, formatMoney, propertyEmoji, timerBadge } from './inventoryStore.js';

// Service (API)
export { fetchInventory, deleteProperty, restoreProperty, updateProperty, changePropertyState, fetchTrashed, savePhotos, deletePhoto } from './inventoryService.js';

// Components
export { createPropertyCard } from './components/PropertyCard.js';
export { PropertyGrid, render } from './components/PropertyGrid.js';
export { SearchFilters } from './components/SearchFilters.js';
export { HeroStats, uSt } from './components/HeroStats.js';
