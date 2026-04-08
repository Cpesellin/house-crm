/**
 * HOUSE CRM — Constantes globales
 *
 * Fuente única de verdad para datos institucionales que antes estaban
 * dispersos como literales (teléfono, etc.). Nunca exponer teléfonos
 * individuales de captadores/asesores en botones de contacto público:
 * todo el contacto saliente debe enrutarse a HOUSE_PHONE.
 */

// Teléfono institucional único de Inmobiliaria House (formato E.164 sin '+').
export const HOUSE_PHONE = '573105922763';

// Variante para enlaces tel: (con '+').
export const HOUSE_PHONE_TEL = '+573105922763';

// Formato visible para usuarios finales.
export const HOUSE_PHONE_DISPLAY = '310 592 2763';

/**
 * Construye una URL de WhatsApp Web para el teléfono institucional.
 * @param {string} [text] - Mensaje opcional (sin codificar).
 * @returns {string}
 */
export function houseWaUrl(text) {
  const base = `https://wa.me/${HOUSE_PHONE}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
