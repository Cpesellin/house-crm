/**
 * PipelineView – composes PipelineNav and PipelineBoard
 * into #pipeline and #mis-nav containers.
 */
import { rPipe } from '../features/pipeline/index.js';

export function mountPipelineView() {
  // PipelineBoard already handles refreshing the pipeline store
  // and rendering both #pipeline and #mis-nav, so we just delegate.
  rPipe();
}

window.mountPipelineView = mountPipelineView;
