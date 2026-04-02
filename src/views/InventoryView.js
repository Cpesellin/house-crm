/**
 * InventoryView – composes HeroStats, SearchFilters, and PropertyGrid
 * into the existing #sec-inv section containers.
 */
import {
  mountHeroStats,
  mountSearchFilters,
  mountPropertyGrid,
} from '../features/inventory/index.js';

export function mountInventoryView() {
  const section = document.getElementById('sec-inv');
  if (!section) return;

  // Mount feature components onto existing DOM containers
  const heroEl = section.querySelector('.hero');
  if (heroEl) mountHeroStats(heroEl);

  const filtersEl = section.querySelector('.filters') || section.querySelector('[data-filters]');
  if (filtersEl) mountSearchFilters(filtersEl);

  const resultsEl = document.getElementById('res');
  if (resultsEl) mountPropertyGrid(resultsEl);

  // Backward-compat: call legacy window globals if available
  if (typeof window.fetchInventory === 'function') window.fetchInventory();
  if (typeof window.populateAsesorFilter === 'function') window.populateAsesorFilter();
  if (typeof window.renderRecent === 'function') window.renderRecent();
  if (typeof window.renderWelcome === 'function') window.renderWelcome();
}

window.mountInventoryView = mountInventoryView;
