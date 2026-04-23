/**
 * HOUSE CRM — Sanitización XSS
 *
 * Todas las funciones de renderizado que usen innerHTML DEBEN pasar
 * los datos de BD por estas funciones antes de interpolarlos.
 *
 * Uso rápido:
 *   import { escapeHtml, safeText, escapeAttr, safeUrl, allowBasicHtml } from './sanitizer.js';
 *   h += `<div>${escapeHtml(p.tipo)}</div>`;
 *   h += `<input value="${escapeAttr(p.direccion)}">`;
 *   h += `<a href="${safeUrl(p.url_metrocuadrado)}">`;
 *   h += `<div>${allowBasicHtml(p.descripcion_cliente)}</div>`;
 */

// ─── Core: HTML text escaping ────────────────────────────────────

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
};

const HTML_ESCAPE_RE = /[&<>"'`]/g;

/**
 * Escapa caracteres peligrosos para inserción en HTML.
 * Convierte & < > " ' ` en entidades HTML.
 *
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado seguro para innerHTML
 *
 * @example
 *   escapeHtml('<script>alert(1)</script>')
 *   // '&lt;script&gt;alert(1)&lt;/script&gt;'
 *
 *   escapeHtml('Casa "Los Pinos"')
 *   // 'Casa &quot;Los Pinos&quot;'
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(HTML_ESCAPE_RE, ch => HTML_ESCAPE_MAP[ch]);
}

/**
 * Versión null-safe de escapeHtml.
 * Si el valor es null, undefined, o no-string, devuelve ''.
 *
 * @param {*} val - Cualquier valor
 * @returns {string} Texto escapado o ''
 *
 * @example
 *   safeText(null)        // ''
 *   safeText(undefined)   // ''
 *   safeText(123)         // '123'
 *   safeText('<b>hola')   // '&lt;b&gt;hola'
 */
function safeText(val) {
  if (val === null || val === undefined) return '';
  return escapeHtml(String(val));
}


// ─── Attribute escaping ──────────────────────────────────────────

/**
 * Escapa un valor para uso seguro dentro de atributos HTML.
 * Además de los caracteres HTML, escapa comillas simples y dobles.
 *
 * @param {*} val - Valor del atributo
 * @returns {string} Valor seguro para atributos
 *
 * @example
 *   `<input value="${escapeAttr(userInput)}">`
 *   `<div data-name="${escapeAttr(p.tipo)}">`
 */
function escapeAttr(val) {
  if (val === null || val === undefined) return '';
  return escapeHtml(String(val));
}


// ─── URL sanitization ────────────────────────────────────────────

/**
 * Valida y sanitiza una URL para uso seguro en href/src.
 * Solo permite protocolos http:, https:, mailto:, tel:
 * Bloquea javascript:, data:, vbscript:, etc.
 *
 * @param {string} url - URL a validar
 * @returns {string} URL segura o '' si es peligrosa
 *
 * @example
 *   safeUrl('https://metrocuadrado.com/inmueble/123')  // OK
 *   safeUrl('javascript:alert(1)')                      // ''
 *   safeUrl('data:text/html,<script>...')               // ''
 */
function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Permitir solo protocolos seguros
  const SAFE_PROTOCOLS = /^(https?:|mailto:|tel:|\/\/|\/|#)/i;
  // Bloquear protocolos peligrosos explícitamente
  const DANGEROUS = /^(javascript|data|vbscript|blob):/i;

  if (DANGEROUS.test(trimmed)) return '';
  if (trimmed.startsWith('//') || trimmed.startsWith('/') || trimmed.startsWith('#')) return escapeAttr(trimmed);
  if (!SAFE_PROTOCOLS.test(trimmed)) return '';

  return escapeAttr(trimmed);
}


// ─── Limited HTML (for descriptions) ─────────────────────────────

/**
 * Permite solo un subconjunto seguro de HTML para campos de descripción.
 * Tags permitidos: <b>, <i>, <br>, <p>, <strong>, <em>, <ul>, <li>
 * Todo lo demás se escapa.
 *
 * IMPORTANTE: Usar solo para campos de descripción que se muestran
 * en modo lectura (observaciones, descripcion_cliente, etc.)
 * NUNCA usar para valores que van dentro de atributos.
 *
 * @param {string} html - HTML potencialmente peligroso
 * @returns {string} HTML con solo tags seguros
 *
 * @example
 *   allowBasicHtml('<b>Piscina</b> y <script>alert(1)</script>')
 *   // '<b>Piscina</b> y &lt;script&gt;alert(1)&lt;/script&gt;'
 */
function allowBasicHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // Tags permitidos (sin atributos)
  const ALLOWED_TAGS = new Set(['b', 'i', 'br', 'p', 'strong', 'em', 'ul', 'li', 'ol']);

  // Primero escapamos todo
  let escaped = escapeHtml(html);

  // Luego restauramos solo los tags permitidos (sin atributos)
  // Patrón: &lt;TAG&gt; o &lt;/TAG&gt; o &lt;TAG/&gt; (self-closing)
  ALLOWED_TAGS.forEach(tag => {
    // Opening tag: &lt;b&gt; → <b>
    const openRe = new RegExp(`&lt;(${tag})&gt;`, 'gi');
    escaped = escaped.replace(openRe, '<$1>');

    // Closing tag: &lt;/b&gt; → </b>
    const closeRe = new RegExp(`&lt;/(${tag})&gt;`, 'gi');
    escaped = escaped.replace(closeRe, '</$1>');

    // Self-closing: &lt;br/&gt; → <br/>
    const selfRe = new RegExp(`&lt;(${tag})\\s*/&gt;`, 'gi');
    escaped = escaped.replace(selfRe, '<$1/>');
  });

  return escaped;
}


// ─── JSON-in-attribute helper ────────────────────────────────────

/**
 * Escapa un string JSON para uso seguro en atributos HTML data-*.
 * Útil para data-fotos='${safeJsonAttr(JSON.stringify(urls))}'
 *
 * @param {string} json - String JSON
 * @returns {string} JSON escapado para atributo HTML
 */
function safeJsonAttr(json) {
  if (!json || typeof json !== 'string') return '[]';
  return json
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// ─── Export ──────────────────────────────────────────────────────
// Para uso en módulos ES:
export { escapeHtml, safeText, escapeAttr, safeUrl, allowBasicHtml, safeJsonAttr };

// Para uso inline en código no-module (functions.js, sections.js, interesados-ui.js):
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.safeText = safeText;
  window.escapeAttr = escapeAttr;
  window.safeUrl = safeUrl;
  window.allowBasicHtml = allowBasicHtml;
  window.safeJsonAttr = safeJsonAttr;
}
