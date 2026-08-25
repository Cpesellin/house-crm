/**
 * HOUSE CRM — Respaldo de la base a JSON
 * ══════════════════════════════════════════════════════════════════════
 *
 * Vuelca cada tabla a un .json paginado, vía PostgREST con la anon key.
 *
 * ALCANCE — importante entenderlo:
 *   Esto NO sustituye a `pg_dump`. Guarda FILAS, no esquema: no trae
 *   tablas, índices, políticas RLS, funciones, triggers ni secuencias.
 *   Restaurar desde aquí exige una base ya creada con las migraciones de
 *   sql/ aplicadas; entonces estos JSON se reinsertan.
 *   Para un respaldo completo hace falta la contraseña de Postgres:
 *     pg_dump "postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres" -Fc -f house.dump
 *
 *   Además sólo copia lo que el rol anon puede leer. Una tabla sin policy
 *   de SELECT para anon sale vacía — el resumen lo marca como SIN ACCESO
 *   para que no se confunda con "no tenía datos".
 *
 * PRIVACIDAD
 *   El volcado lleva datos personales de clientes (nombres, teléfonos,
 *   correos). Se escribe fuera del repositorio y no debe subirse a ningún
 *   servicio ni commitearse.
 *
 * USO
 *   node scripts/backup-supabase.mjs [carpeta-destino]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PAGINA = 1000;

function leerEnv() {
  const txt = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const val = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
  const url = val('VITE_SUPA_URL');
  const key = val('VITE_SUPA_KEY');
  if (!url || !key) throw new Error('Faltan VITE_SUPA_URL / VITE_SUPA_KEY en .env');
  return { url, key };
}

/** Descarga una tabla completa, de mil en mil. */
async function volcarTabla(url, key, tabla) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const r = await fetch(`${url}/rest/v1/${tabla}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${desde}-${desde + PAGINA - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!r.ok) {
      const cuerpo = await r.text().catch(() => '');
      return { error: `HTTP ${r.status} ${cuerpo.slice(0, 120)}` };
    }
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return { filas };
}

// Las tablas van embebidas a propósito: el endpoint que las lista requiere
// la service_role key, que este script no usa. Si añades una tabla nueva en
// sql/, agrégala también aquí o quedará fuera del respaldo.
const TABLAS = [
  'agenda', 'alertas', 'anotaciones', 'cierres', 'citas_inmueble',
  'eventos_usuario', 'favoritos', 'fotos', 'historial',
  'historial_roles_usuario', 'inmobiliaria', 'inmuebles',
  'inmuebles_interesados', 'interesados', 'interesados_historial',
  'intereses_inmueble', 'logros_referidor', 'logros_usuario', 'mensajes',
  'metodos_pago', 'negocios_cerrados', 'niveles_referidor', 'notificaciones',
  'participantes_comision', 'permisos_rol', 'plan', 'preferencias_calculadas',
  'pv_alertas', 'pv_casos', 'pv_categorias', 'pv_checklist',
  'pv_checklist_plantillas', 'pv_evidencias', 'pv_historial', 'pv_inquilinos',
  'pv_mensajes', 'pv_problemas', 'pv_profesionales', 'pv_propiedades',
  'pv_propietarios', 'pv_usuarios', 'referidos', 'registro_solicitudes',
  'solicitudes', 'sugerencias_enviadas', 'suscripcion', 'usuarios',
  'visitas_agendadas',
];

const { url, key } = leerEnv();
const tablas = TABLAS;

// Sello de tiempo para la carpeta. Lo calcula el proceso, no el modelo.
const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const destino = resolve(process.argv[2] || join('..', 'house-crm-backups', `backup-${sello}`));
if (!existsSync(destino)) mkdirSync(destino, { recursive: true });

console.log(`Respaldando ${tablas.length} tablas en:\n  ${destino}\n`);

const resumen = [];
let totalFilas = 0;

for (const t of tablas) {
  const r = await volcarTabla(url, key, t);
  if (r.error) {
    const sinAcceso = /401|403|permission|policy/i.test(r.error);
    resumen.push({ tabla: t, filas: 0, nota: sinAcceso ? 'SIN ACCESO (anon)' : r.error });
    console.log(`  ${t.padEnd(26)} —      ${sinAcceso ? 'SIN ACCESO' : r.error}`);
    continue;
  }
  writeFileSync(join(destino, `${t}.json`), JSON.stringify(r.filas, null, 1), 'utf8');
  totalFilas += r.filas.length;
  resumen.push({ tabla: t, filas: r.filas.length, nota: r.filas.length ? '' : 'vacía' });
  console.log(`  ${t.padEnd(26)} ${String(r.filas.length).padStart(6)} filas`);
}

writeFileSync(join(destino, '_resumen.json'), JSON.stringify({
  generado: new Date().toISOString(),
  origen: url,
  rol: 'anon',
  advertencia: 'Sólo filas legibles por anon. NO incluye esquema, RLS, funciones ni triggers. No sustituye pg_dump.',
  totalFilas,
  tablas: resumen,
}, null, 2), 'utf8');

const sinAcceso = resumen.filter(r => r.nota === 'SIN ACCESO (anon)');
console.log(`\n${totalFilas} filas en ${resumen.filter(r => r.filas).length} tablas.`);
if (sinAcceso.length) {
  console.log(`${sinAcceso.length} tabla(s) sin acceso como anon: ${sinAcceso.map(r => r.tabla).join(', ')}`);
  console.log('Ésas sólo se recuperan con pg_dump o la service_role key.');
}
