/**
 * VISIBILIDAD PÚBLICA — qué inmueble puede ver un cliente
 * ══════════════════════════════════════════════════════════════════════
 *
 * Criterio único. Antes vivía duplicado en cada página del portafolio, con
 * dos caminos que filtraban distinto:
 *
 *   · desde window.D (ya en memoria):  sólo excluía 'Retirado'
 *   · consultando a Supabase:          .in(['Disponible','Aún Disponible'])
 *
 * Es decir, cuando los datos ya estaban cargados los clientes veían
 * inmuebles VENDIDOS y ARRENDADOS. Lo que decide es una lista blanca, no
 * una lista negra: si mañana alguien añade un estado nuevo ('Reservado',
 * 'En trámite'), queda oculto por defecto en vez de filtrarse a la web.
 */

/** Estados que un cliente puede ver. Todo lo demás queda fuera. */
export const ESTADOS_PUBLICOS = ['Disponible', 'Aún Disponible'];

/** Estados que cierran el ciclo del inmueble. */
export const ESTADOS_FINALES = ['Arrendado', 'Vendido', 'Retirado'];

/**
 * ¿Este inmueble es visible para un cliente?
 * Exige estado publicable, no eliminado y —cuando el dato viene— revisión
 * aprobada. `estado_revision` se omite en algunas consultas ligeras: si no
 * está presente no se bloquea, pero si está y no es 'aprobado', sí.
 */
export function esVisiblePublico(p) {
  if (!p || p.eliminado) return false;
  if (!ESTADOS_PUBLICOS.includes(p.estado)) return false;
  if (p.estado_revision != null && p.estado_revision !== 'aprobado') return false;
  return true;
}

/** Filtra una lista dejando sólo lo que un cliente puede ver. */
export function soloPublicos(lista) {
  return (lista || []).filter(esVisiblePublico);
}

/** ¿El inmueble ya cerró su ciclo? Usado por el inventario interno. */
export function esEstadoFinal(estado) {
  return ESTADOS_FINALES.includes(estado);
}

if (typeof window !== 'undefined') {
  window.ESTADOS_PUBLICOS = ESTADOS_PUBLICOS;
  window.esVisiblePublico = esVisiblePublico;
  window.soloPublicos = soloPublicos;
}

export default { ESTADOS_PUBLICOS, ESTADOS_FINALES, esVisiblePublico, soloPublicos, esEstadoFinal };
