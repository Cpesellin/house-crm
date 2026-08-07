/**
 * Módulo: ui/toast
 *
 * Notificación efímera (~3s) en la esquina inferior derecha.
 * Usa el contenedor #toasts que está en el HTML del shell.
 *
 * Uso:
 *   toast('Guardado')                  // tipo default 'tok'
 *   toast('Error', 'terr')             // error rojo
 *   toast('Aviso', 'twarn')            // warning ámbar
 *
 * Expuesto en window.toast para compat con el resto del código.
 */

const TOAST_DURATION_MS = 3200;

export function toast(msg, type = 'tok') {
  const container = document.getElementById('toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);

  setTimeout(() => el.remove(), TOAST_DURATION_MS);
}

// Compat: expuesto en window para código legacy y onclick inline
if (typeof window !== 'undefined') {
  window.toast = toast;
}
