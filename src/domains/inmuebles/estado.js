/**
 * CAMBIO DE ESTADO DEL INMUEBLE — punto único de escritura
 * ══════════════════════════════════════════════════════════════════════
 *
 * Un UPDATE directo sobre `inmuebles.estado` es rechazado para cualquier
 * estado que no sea 'Disponible'. La causa está en la RLS: la única policy
 * de SELECT que tiene el rol anon exige
 *
 *     estado IN ('Disponible', 'Aún Disponible')
 *
 * así que al escribir un estado final la fila deja de ser legible para el
 * rol que la está escribiendo y el UPDATE falla con
 * "new row violates row-level security policy".
 *
 * Efecto en producción: ningún asesor podía cerrar un negocio. Los 195
 * inmuebles estaban todos en Disponible / Aún Disponible, sin un solo
 * Vendido, Arrendado ni Retirado registrado.
 *
 * La escritura pasa ahora por la función `cambiar_estado_inmueble`
 * (sql/58), SECURITY DEFINER, que salta la RLS de forma controlada
 * validando el estado y respetando el aislamiento por inmobiliaria.
 *
 * RESERVA
 *   Si la función todavía no está en la base, se cae al UPDATE directo.
 *   Así el código funciona antes y después de correr la migración: los
 *   estados públicos seguirán funcionando como hasta ahora, y los finales
 *   darán el error de RLS hasta que sql/58 se aplique.
 */

import { getSupabaseClient } from '../../config/supabase.js';

const SB = () => getSupabaseClient();

/** Estados que el inmueble puede tomar. Debe coincidir con sql/58. */
export const ESTADOS_INMUEBLE = [
  'Disponible', 'Aún Disponible', 'Verificar Disponibilidad',
  'Arrendado', 'Vendido', 'Retirado',
];

/**
 * Cambia el estado de un inmueble.
 * @returns {Promise<{ok:boolean, error?:string, viaRpc?:boolean}>}
 */
export async function actualizarEstadoInmueble(id, estado) {
  if (!id) return { ok: false, error: 'falta el inmueble' };
  if (!ESTADOS_INMUEBLE.includes(estado)) {
    return { ok: false, error: `Estado no válido: ${estado}` };
  }

  // Vía preferente: la función con permisos propios.
  const { error: errRpc } = await SB().rpc('cambiar_estado_inmueble', {
    p_id: id,
    p_estado: estado,
  });

  if (!errRpc) return { ok: true, viaRpc: true };

  // ¿La función no existe todavía? Entonces la migración no se ha corrido
  // y toca el camino viejo. Cualquier otro error es real y se propaga.
  const noExiste = /function .*cambiar_estado_inmueble.* does not exist|PGRST202|42883/i
    .test(`${errRpc.message || ''} ${errRpc.code || ''}`);

  if (!noExiste) {
    return { ok: false, error: traducir(errRpc.message) };
  }

  console.warn('[estado] cambiar_estado_inmueble no está en la base; usando UPDATE directo. Corre sql/58.');

  const ahora = new Date().toISOString();
  const { error } = await SB()
    .from('inmuebles')
    .update({ estado, fecha_estado: ahora, updated_at: ahora })
    .eq('id', id);

  if (error) return { ok: false, error: traducir(error.message) };
  return { ok: true, viaRpc: false };
}

/** Convierte los errores de Postgres en algo que un asesor entienda. */
function traducir(msg = '') {
  if (/row-level security/i.test(msg)) {
    return 'La base no permite este cambio de estado todavía. Falta aplicar la migración sql/58.';
  }
  if (/inmueble_no_encontrado/.test(msg)) return 'No se encontró el inmueble.';
  if (/estado_invalido/.test(msg))       return 'Ese estado no es válido.';
  return msg || 'No se pudo cambiar el estado';
}

if (typeof window !== 'undefined') {
  window.actualizarEstadoInmueble = actualizarEstadoInmueble;
  window.ESTADOS_INMUEBLE = ESTADOS_INMUEBLE;
}

export default { actualizarEstadoInmueble, ESTADOS_INMUEBLE };
