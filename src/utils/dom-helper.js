/**
 * HOUSE CRM — DOM Helpers seguros
 *
 * Funciones para crear elementos DOM sin innerHTML cuando sea práctico,
 * y un tagged template literal que auto-escapa valores dinámicos.
 *
 * Uso:
 *   import { createEl, setText, safeHtml } from './dom-helper.js';
 */

// Depende de sanitizer.js (debe cargarse primero o importarse)
// Si se usa como módulo: import { escapeHtml, safeText, safeUrl, escapeAttr } from './sanitizer.js';


// ─── createElement seguro ────────────────────────────────────────

/**
 * Crea un elemento DOM con clases y texto seguro.
 * Usa textContent internamente, nunca innerHTML.
 *
 * @param {string} tag - Tag HTML ('div', 'span', etc.)
 * @param {string|string[]} classes - Clase(s) CSS
 * @param {string} [textContent] - Texto (se asigna como textContent, no HTML)
 * @returns {HTMLElement}
 *
 * @example
 *   const title = createEl('div', 'pktp', p.tipo);
 *   const card = createEl('div', ['pc', 'hover-effect']);
 */
function createEl(tag, classes, textContent) {
  const el = document.createElement(tag);

  if (classes) {
    if (Array.isArray(classes)) {
      classes.forEach(c => { if (c) el.classList.add(c); });
    } else if (typeof classes === 'string') {
      classes.split(/\s+/).forEach(c => { if (c) el.classList.add(c); });
    }
  }

  if (textContent !== undefined && textContent !== null) {
    el.textContent = String(textContent);
  }

  return el;
}


// ─── setText seguro ──────────────────────────────────────────────

/**
 * Asigna texto seguro a un elemento existente.
 * Siempre usa textContent, nunca innerHTML.
 *
 * @param {HTMLElement|string} el - Elemento o ID del elemento
 * @param {string} text - Texto a asignar
 *
 * @example
 *   setText('mtt', p.tipo);
 *   setText(titleEl, p.ciudad);
 */
function setText(el, text) {
  const element = typeof el === 'string' ? document.getElementById(el) : el;
  if (!element) return;
  element.textContent = (text === null || text === undefined) ? '' : String(text);
}


// ─── setAttr seguro ──────────────────────────────────────────────

/**
 * Asigna un atributo escapado a un elemento.
 *
 * @param {HTMLElement} el - Elemento
 * @param {string} attr - Nombre del atributo
 * @param {string} val - Valor (se escapa automáticamente para URLs en href/src)
 */
function setAttr(el, attr, val) {
  if (!el) return;
  const strVal = (val === null || val === undefined) ? '' : String(val);

  // Para href y src, validar el protocolo
  if ((attr === 'href' || attr === 'src') && typeof safeUrl === 'function') {
    el.setAttribute(attr, safeUrl(strVal));
  } else {
    el.setAttribute(attr, strVal);
  }
}


// ─── Tagged template literal con auto-escape ─────────────────────

/**
 * Tagged template literal que auto-escapa todos los valores interpolados.
 * Los strings estáticos del template NO se escapan (son código del dev).
 * Los valores dinámicos SÍ se escapan (vienen de BD/usuario).
 *
 * Para insertar HTML deliberado (ya sanitizado), usar safeHtml.raw().
 *
 * @example
 *   // Auto-escapa p.tipo y p.ciudad:
 *   el.innerHTML = safeHtml`
 *     <div class="pktp">${p.tipo}</div>
 *     <div class="pkci">📍 ${p.ciudad}</div>
 *   `;
 *
 *   // Para insertar HTML ya sanitizado (ej: resultado de allowBasicHtml):
 *   el.innerHTML = safeHtml`
 *     <div>${safeHtml.raw(allowBasicHtml(p.observaciones))}</div>
 *   `;
 */
function safeHtml(strings, ...values) {
  let result = '';
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      const val = values[i];
      if (val && val.__rawHtml) {
        // Marcado como raw — ya fue sanitizado por el desarrollador
        result += val.__rawHtml;
      } else if (val === null || val === undefined) {
        result += '';
      } else {
        result += escapeHtml(String(val));
      }
    }
  });
  return result;
}

/**
 * Marca un string como HTML ya sanitizado para que safeHtml no lo escape.
 * SOLO usar con output de allowBasicHtml() u otro sanitizador.
 *
 * @param {string} html - HTML ya sanitizado
 * @returns {{ __rawHtml: string }}
 *
 * @example
 *   safeHtml`<div>${safeHtml.raw(allowBasicHtml(p.observaciones))}</div>`
 */
safeHtml.raw = function(html) {
  return { __rawHtml: html || '' };
};


// ─── buildCards helper ───────────────────────────────────────────

/**
 * Construye un fragmento de HTML para una lista de items,
 * aplicando escapeHtml a cada campo configurado.
 *
 * @param {Object[]} items - Array de objetos
 * @param {Function} templateFn - Función (item, escapedFields) => htmlString
 * @param {string[]} fieldsToEscape - Lista de campos a escapar
 * @returns {string} HTML concatenado
 *
 * @example
 *   const html = buildCards(properties, (p, e) => `
 *     <div class="card">
 *       <h3>${e.tipo}</h3>
 *       <p>${e.ciudad}</p>
 *     </div>
 *   `, ['tipo', 'ciudad', 'direccion']);
 */
function buildCards(items, templateFn, fieldsToEscape) {
  return items.map(item => {
    const escaped = {};
    fieldsToEscape.forEach(field => {
      const val = field.includes('.')
        ? field.split('.').reduce((o, k) => o && o[k], item)
        : item[field];
      const key = field.replace(/\./g, '_');
      escaped[key] = safeText(val);
    });
    return templateFn(item, escaped);
  }).join('');
}


// ─── Export ──────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.createEl = createEl;
  window.setText = setText;
  window.setAttr = setAttr;
  window.safeHtml = safeHtml;
  window.buildCards = buildCards;
}
