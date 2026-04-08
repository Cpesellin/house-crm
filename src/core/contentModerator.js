/**
 * HOUSE CRM — Content Moderator (PII detector)
 *
 * Analiza descripciones de inmuebles antes de publicar para detectar
 * datos personales que NO deben aparecer en el portal público:
 *   - Direcciones colombianas (Cra/Calle/Diagonal/Transversal/Av)
 *   - Teléfonos celulares y fijos (formato Colombia, +57)
 *   - Emails
 *   - URLs / dominios
 *
 * Devuelve un objeto serializable que se persiste en la columna
 * `inmuebles.alertas_moderacion` (JSONB) y se muestra en la cola
 * de moderación admin (Fase 2).
 *
 * Uso:
 *   import { analyzeContent } from './contentModerator.js';
 *   const result = analyzeContent(descripcion);
 *   // result.alertas, result.score, result.color
 */

// ─── Patrones ─────────────────────────────────────────────────

// Direcciones colombianas: Cra/Carrera/Calle/Cl/Diagonal/Dg/Transversal/Tv/Avenida/Av
// seguidas de número + opcional letra + (#|No|N°) + número + guion + número.
const RE_DIRECCION = /\b(Cra|Carrera|Calle|Cll?|Cl|Diagonal|Diag|Dg|Transversal|Trans|Tv|Avenida|Av)\.?\s*\d{1,3}[a-zA-Z]?\s*(?:#|No\.?|N[°ºo]\.?|nro\.?)?\s*\d{1,3}[a-zA-Z]?\s*[-–]\s*\d{1,3}/gi;

// Celulares Colombia: 10 dígitos empezando con 3, con o sin +57 / 57 y separadores.
const RE_CELULAR = /(?:\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// Fijos Colombia (Plan Nacional 10 dígitos: 60X seguido de 7 dígitos).
const RE_FIJO = /(?:\+?57[\s.-]?)?\(?60[1-8]\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// Emails — patrón simple pero robusto.
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// URLs explícitas (http/https/www) y dominios sueltos comunes.
const RE_URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-zA-Z0-9-]+\.(?:com|co|net|org|info|biz|me|app|io)(?:\.[a-z]{2})?(?:\/\S*)?\b/gi;

// ─── Configuración por tipo de alerta ─────────────────────────

const TIPO_CONFIG = {
  direccion: { severidad: 'alta',  peso: 25, label: 'Dirección exacta',  emoji: '📍' },
  celular:   { severidad: 'alta',  peso: 25, label: 'Teléfono celular',  emoji: '📱' },
  fijo:      { severidad: 'alta',  peso: 25, label: 'Teléfono fijo',     emoji: '☎️' },
  email:     { severidad: 'alta',  peso: 25, label: 'Email',             emoji: '✉️' },
  url:       { severidad: 'media', peso: 10, label: 'URL / dominio',     emoji: '🔗' },
};

// ─── Helpers internos ─────────────────────────────────────────

function _scan(text, regex, tipo) {
  const out = [];
  if (!text) return out;
  let m;
  // Reset el lastIndex por si la regex es /g (necesario en re-uso).
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    out.push({
      tipo,
      match: m[0].trim(),
      posicion: m.index,
      severidad: TIPO_CONFIG[tipo].severidad,
      label: TIPO_CONFIG[tipo].label,
      emoji: TIPO_CONFIG[tipo].emoji,
    });
    // Evita loop infinito en regex con grupos vacíos.
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
  return out;
}

function _colorFromScore(score) {
  if (score >= 80) return 'verde';
  if (score >= 50) return 'amarillo';
  return 'rojo';
}

// ─── API pública ──────────────────────────────────────────────

/**
 * Analiza un texto y devuelve un reporte de alertas PII.
 *
 * @param {string} texto
 * @returns {{
 *   alertas: Array<{tipo, match, posicion, severidad, label, emoji}>,
 *   score: number,
 *   color: 'verde'|'amarillo'|'rojo',
 *   total_alertas: number,
 *   por_tipo: Record<string, number>,
 *   analizado_at: string
 * }}
 */
export function analyzeContent(texto) {
  const t = (texto || '').toString();

  // Emails primero — sus dominios no deben contar también como URL.
  const emails = _scan(t, RE_EMAIL, 'email');

  // URLs filtradas: descarta cualquier match cuyo rango caiga dentro
  // del rango de un email (evita doble alerta para "gmail.com" en
  // "user@gmail.com").
  const urlsRaw = _scan(t, RE_URL, 'url');
  const urls = urlsRaw.filter(u => {
    const uStart = u.posicion;
    const uEnd = u.posicion + u.match.length;
    return !emails.some(e => {
      const eStart = e.posicion;
      const eEnd = e.posicion + e.match.length;
      return uStart >= eStart && uEnd <= eEnd;
    });
  });

  const alertas = [
    ..._scan(t, RE_DIRECCION, 'direccion'),
    ..._scan(t, RE_CELULAR,   'celular'),
    ..._scan(t, RE_FIJO,      'fijo'),
    ...emails,
    ...urls,
  ];

  // Score: empieza en 100, resta peso por alerta. Clamp 0-100.
  let score = 100;
  for (const a of alertas) score -= TIPO_CONFIG[a.tipo].peso;
  score = Math.max(0, Math.min(100, score));

  // Conteo por tipo (útil para badges).
  const por_tipo = {};
  for (const a of alertas) por_tipo[a.tipo] = (por_tipo[a.tipo] || 0) + 1;

  return {
    alertas,
    score,
    color: _colorFromScore(score),
    total_alertas: alertas.length,
    por_tipo,
    analizado_at: new Date().toISOString(),
  };
}

/**
 * Versión "rápida": ¿hay al menos una alerta? Útil para gates UI
 * sin necesitar el reporte completo.
 *
 * @param {string} texto
 * @returns {boolean}
 */
export function hasPII(texto) {
  const t = (texto || '').toString();
  return RE_DIRECCION.test(t) || RE_CELULAR.test(t) ||
         RE_FIJO.test(t) || RE_EMAIL.test(t) || RE_URL.test(t);
}
