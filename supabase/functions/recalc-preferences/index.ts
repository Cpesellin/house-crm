// ============================================================
// HOUSE CRM — Edge Function: recalc-preferences
// Se ejecuta vía cron (diario). Recalcula preferencias_calculadas
// para todos los usuarios con actividad en los últimos 90 días.
//
// Replica la lógica de src/core/sugerencias.js#recalcularPreferencias,
// pero en el servidor (Deno) usando service_role key.
//
// Despliegue:
//   supabase functions deploy recalc-preferences
//
// Cron (Dashboard Supabase → Database → Cron Jobs):
//   SELECT cron.schedule(
//     'recalc-preferences-daily',
//     '0 3 * * *',   -- cada día 3:00 AM UTC (~10pm Colombia)
//     $$ SELECT net.http_post(
//          url:='https://<PROJECT_REF>.supabase.co/functions/v1/recalc-preferences',
//          headers:='{"Authorization":"Bearer <SERVICE_ROLE_JWT>"}'::jsonb
//        ) $$
//   );
// ============================================================

// @ts-ignore deno runtime import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const VENTANA_DIAS = 90;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── recálculo por usuario ────────────────────────────────────
async function recalcUsuario(SB: any, usuarioId: string) {
  const desde = new Date(Date.now() - VENTANA_DIAS * 864e5).toISOString();
  const { data: eventos } = await SB.from('eventos_usuario')
    .select('*').eq('usuario_id', usuarioId).gte('created_at', desde).limit(1000);
  if (!eventos || eventos.length < 3) {
    await SB.from('preferencias_calculadas').upsert({
      usuario_id: usuarioId,
      muestra_eventos: eventos?.length || 0,
      engagement_score: 0,
      eventos_totales: eventos?.length || 0,
      calculado_at: new Date().toISOString(),
    });
    return false;
  }

  const ciudades: Record<string, number> = {};
  const barrios: Record<string, number> = {};
  const tipos: Record<string, number> = {};
  const negocs: Record<string, number> = {};
  const habs: number[] = [];
  const precios: number[] = [];
  let engagement = 0;
  let ultEvt: string | null = null;

  for (const e of eventos) {
    const p = e.peso || 1;
    engagement += p;
    if (!ultEvt || new Date(e.created_at) > new Date(ultEvt)) ultEvt = e.created_at;
    if (e.ciudad)        ciudades[e.ciudad] = (ciudades[e.ciudad] || 0) + p;
    if (e.barrio)        barrios[e.barrio] = (barrios[e.barrio] || 0) + p;
    if (e.tipo_inmueble) tipos[e.tipo_inmueble] = (tipos[e.tipo_inmueble] || 0) + p;
    if (e.negociacion)   negocs[e.negociacion] = (negocs[e.negociacion] || 0) + p;
    if (e.habitaciones && e.habitaciones > 0) habs.push(e.habitaciones);
    if (e.precio && e.precio > 0 && p > 0) precios.push(e.precio);
    if (e.filtro_payload) {
      const f = e.filtro_payload;
      if (f.ciudad) ciudades[f.ciudad] = (ciudades[f.ciudad] || 0) + 1;
      if (f.tipo)   tipos[f.tipo] = (tipos[f.tipo] || 0) + 1;
      if (f.precio_min) precios.push(f.precio_min);
      if (f.precio_max) precios.push(f.precio_max);
    }
  }

  const topN = (obj: Record<string, number>, n: number) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  let pmin: number | null = null, pmax: number | null = null;
  if (precios.length >= 2) {
    precios.sort((a, b) => a - b);
    const i15 = Math.max(0, Math.floor(precios.length * 0.15));
    const i85 = Math.min(precios.length - 1, Math.floor(precios.length * 0.85));
    pmin = Math.round(precios[i15] * 0.85);
    pmax = Math.round(precios[i85] * 1.15);
  } else if (precios.length === 1) {
    pmin = Math.round(precios[0] * 0.7);
    pmax = Math.round(precios[0] * 1.3);
  }

  let hmin: number | null = null, hmax: number | null = null;
  if (habs.length) { hmin = Math.max(1, Math.min(...habs) - 1); hmax = Math.max(...habs) + 1; }

  await SB.from('preferencias_calculadas').upsert({
    usuario_id: usuarioId,
    negociacion: topN(negocs, 1)[0] || null,
    tipos_preferidos: topN(tipos, 3),
    ciudades: topN(ciudades, 3),
    barrios: topN(barrios, 5),
    precio_min: pmin,
    precio_max: pmax,
    habitaciones_min: hmin,
    habitaciones_max: hmax,
    engagement_score: engagement,
    eventos_totales: eventos.length,
    ultimo_evento_at: ultEvt,
    muestra_eventos: eventos.length,
    calculado_at: new Date().toISOString(),
  }, { onConflict: 'usuario_id' });

  return true;
}

// ─── handler ─────────────────────────────────────────────────
// @ts-ignore deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // @ts-ignore deno env
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore deno env
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SB = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const desde = new Date(Date.now() - VENTANA_DIAS * 864e5).toISOString();
    const { data } = await SB.from('eventos_usuario')
      .select('usuario_id').gte('created_at', desde).limit(5000);
    const ids: string[] = [...new Set((data || []).map((r: any) => r.usuario_id))];

    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await recalcUsuario(SB, id); ok++; } catch (e) { fail++; console.error('[recalc]', id, e); }
    }

    const res = { ok: true, candidatos: ids.length, recalculados: ok, fallidos: fail, ts: new Date().toISOString() };
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[recalc-preferences]', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
