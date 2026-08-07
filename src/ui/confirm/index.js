/**
 * Módulo: ui/confirm
 *
 * Modal de confirmación bloqueante estilo confirm() pero con estilo del CRM.
 * Usa los IDs #cfdlg #cfi #cft #cfm #cfok que viven en el HTML del shell.
 *
 * Uso:
 *   const ok = await cfShow('🗑️', '¿Eliminar?', 'Esta acción no se puede deshacer.');
 *   if (ok) { ... }
 *
 * Expuesto en window para compat con onclick inline (cancel button en el HTML).
 */

let currentResolver = null;

export function cfShow(icon, title, msg) {
  return new Promise((resolve) => {
    const iconEl = document.getElementById('cfi');
    const titleEl = document.getElementById('cft');
    const msgEl = document.getElementById('cfm');
    const dlgEl = document.getElementById('cfdlg');
    const okEl = document.getElementById('cfok');

    if (!dlgEl || !okEl) {
      console.warn('[cfShow] Missing dialog elements in DOM');
      return resolve(false);
    }

    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    dlgEl.style.display = 'flex';

    currentResolver = resolve;

    okEl.onclick = () => {
      dlgEl.style.display = 'none';
      resolve(true);
      currentResolver = null;
    };
  });
}

export function cfCancel() {
  const dlgEl = document.getElementById('cfdlg');
  if (dlgEl) dlgEl.style.display = 'none';
  if (currentResolver) {
    currentResolver(false);
    currentResolver = null;
  }
}

// Compat: expuestos en window (cfCancel se llama desde onclick inline
// del botón cancelar del HTML del shell)
if (typeof window !== 'undefined') {
  window.cfShow = cfShow;
  window.cfCancel = cfCancel;
}
