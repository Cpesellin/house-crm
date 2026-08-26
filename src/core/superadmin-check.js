/**
 * ¿ES SUPERADMIN? — consulta única y memorizada
 * ══════════════════════════════════════════════════════════════════════
 *
 * `is_superadmin` es una función del panel SaaS (sql/50-54) que todavía no
 * está instalada, así que devuelve 404. Se consultaba desde dos sitios y
 * uno de ellos dentro de un intervalo, con lo que la consola acumulaba
 * veinte líneas rojas por sesión.
 *
 * No es inofensivo: el 2026-08-26 esas líneas taparon el error real de un
 * fallo al registrar inmuebles, y se perdió una ronda entera diagnosticando
 * el ruido en vez del problema.
 *
 * Aquí se consulta UNA vez. Si la función no existe, se recuerda y no se
 * vuelve a preguntar: no va a aparecer sola a mitad de sesión. La respuesta
 * afirmativa también se cachea — el rol no cambia mientras dura la sesión.
 */

import { getSupabaseClient } from '../config/supabase.js';

let _cache = null;        // null = sin consultar, true/false = respuesta
let _noInstalada = false; // la función no existe en esta base
let _enVuelo = null;      // llamadas concurrentes comparten la promesa

/** Reinicia el cache. Llamar al cambiar de usuario. */
export function olvidarSuperadmin() {
  _cache = null;
  _enVuelo = null;
  // _noInstalada NO se reinicia: que la función exista no depende del usuario.
}

/**
 * @returns {Promise<boolean>} false ante cualquier duda: es la respuesta
 * segura, porque ser superadmin sólo concede privilegios.
 */
export async function esSuperadmin() {
  if (_cache !== null) return _cache;
  if (_noInstalada) return false;
  if (_enVuelo) return _enVuelo;

  _enVuelo = (async () => {
    try {
      const { data, error } = await getSupabaseClient().rpc('is_superadmin');

      if (error) {
        const falta = /does not exist|PGRST202|42883|404/i
          .test(`${error.message || ''} ${error.code || ''}`);
        if (falta) {
          _noInstalada = true;
          console.info('[superadmin] is_superadmin no está instalada (sql/50-54 pendiente). No se volverá a consultar.');
        } else {
          console.warn('[superadmin] fallo consultando is_superadmin:', error.message);
        }
        _cache = false;
        return false;
      }

      _cache = data === true;
      return _cache;
    } catch (e) {
      console.warn('[superadmin] excepción consultando is_superadmin:', e?.message || e);
      _cache = false;
      return false;
    } finally {
      _enVuelo = null;
    }
  })();

  return _enVuelo;
}

if (typeof window !== 'undefined') {
  window.esSuperadmin = esSuperadmin;
  window.olvidarSuperadmin = olvidarSuperadmin;
}

export default { esSuperadmin, olvidarSuperadmin };
