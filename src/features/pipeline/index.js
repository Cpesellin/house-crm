/**
 * HOUSE CRM — Pipeline Module (barrel export)
 */

// Store
export { pipeline, PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES } from './pipelineStore.js';

// Service
export { quickMove, reVal, responderSol, dStart } from './pipelineService.js';

// Components
export { renderPipelineCard } from './components/PipelineCard.js';
export { PipelineBoard, rPipe } from './components/PipelineBoard.js';
export { renderPipelineNav, scrollToCol } from './components/PipelineNav.js';
