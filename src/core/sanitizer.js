/**
 * HOUSE CRM — Sanitizer
 *
 * Utilidades para prevenir XSS al inyectar strings de BD en innerHTML.
 *
 * Uso:
 *   import { escapeHtml, escapeAttr, safeHtml } from './core/sanitizer.js';
 *
 *   el.innerHTML = `<div>${escapeHtml(user.nombre)}</div>`;
 *   el.innerHTML = `<input value="${escapeAttr(user.email)}">`;
 *   el.innerHTML = safeHtml`<div>${user.nombre} dijo: ${user.mensaje}</div>`;
 *
 * Regla de oro: si el string viene de la BD o del usuario, SIEMPRE pasa por
 * escapeHtml/escapeAttr antes de llegar a innerHTML. Las constantes del
 * código (tipos, emojis, keywords fijos) no necesitan escape.
 *
 * También expuesto como window.escapeHtml / window.escapeAttr / window.safeHtml
 * para compat con archivos que no son módulos ES.
 */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/**
 * Escapa caracteres HTML peligrosos para uso en contenido de texto de innerHTML.
 * Úsalo para cualquier string que venga de BD/usuario y vaya dentro de
 * un elemento (no dentro de atributos).
 */
export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"'`]/g, ch => HTML_ENTITIES[ch]);
}

/**
 * Escapa para uso dentro de un atributo HTML (value="...", src="...", etc.).
 * La diferencia con escapeHtml es que aquí SÍ escapamos las comillas simples
 * y dobles y backticks — vital para prevenir break-out de atributo.
 */
export function escapeAttr(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"'`]/g, ch => HTML_ENTITIES[ch]);
}

/**
 * Tagged template literal que escapa automáticamente las interpolaciones.
 *
 * Ejemplo:
 *   const html = safeHtml`<div class="nota">${nota.texto}</div>`;
 *   el.innerHTML = html;  // seguro aunque nota.texto tenga "<script>"
 *
 * Para evitar escape en una interpolación (ej. HTML ya construido y confiable),
 * usa new SafeHTML(str).
 */
export function safeHtml(strings, ...values) {
  let result = '';
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      const v = values[i];
      if (v instanceof SafeHTML) {
        result += v.value;
      } else if (v === null || v === undefined) {
        // silencio
      } else {
        result += escapeHtml(v);
      }
    }
  });
  return result;
}

/**
 * Marca un string como HTML seguro (no escapar en safeHtml).
 * Úsalo CON MUCHO CUIDADO — solo para HTML que TÚ generaste, nunca para
 * strings de BD.
 */
export class SafeHTML {
  constructor(value) { this.value = String(value ?? ''); }
}

export function rawHtml(s) { return new SafeHTML(s); }

/**
 * Para debugging / auditoría: cuenta cuántas interpolaciones tiene un template
 * literal y si alguna contiene caracteres sospechosos sin escape.
 */
export function auditTemplate(strings, ...values) {
  const issues = [];
  values.forEach((v, i) => {
    if (typeof v === 'string' && /[<>"']/.test(v)) {
      issues.push({ index: i, value: v, preview: v.slice(0, 50) });
    }
  });
  return { interpolations: values.length, issues };
}

// Expose to window for compat con archivos no-ES-module
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;
  window.safeHtml = safeHtml;
  window.rawHtml = rawHtml;
}

export default { escapeHtml, escapeAttr, safeHtml, rawHtml, SafeHTML };
