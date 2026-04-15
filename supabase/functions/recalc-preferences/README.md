# recalc-preferences — Edge Function

Recalcula `preferencias_calculadas` para todos los usuarios con eventos en los últimos 90 días. Replica la lógica de `src/core/sugerencias.js#recalcularPreferencias` en el servidor.

## Deploy

```bash
# Desde la raíz del repo
supabase functions deploy recalc-preferences
```

Requiere que ya haya `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` configurados como secrets del proyecto (vienen por defecto en Supabase).

## Test manual

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/recalc-preferences \
  -H "Authorization: Bearer <SERVICE_ROLE_JWT>"
```

Respuesta esperada:
```json
{"ok":true,"candidatos":24,"recalculados":24,"fallidos":0,"ts":"2026-04-14T04:00:00.123Z"}
```

## Cron diario (Supabase pg_cron)

Dashboard → Database → **Extensions** → habilitar `pg_cron` y `pg_net`.

Luego **SQL Editor**:

```sql
SELECT cron.schedule(
  'recalc-preferences-daily',
  '0 3 * * *',   -- cada día 3:00 AM UTC (~10pm Colombia)
  $$ SELECT net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/recalc-preferences',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <SERVICE_ROLE_JWT>',
         'Content-Type', 'application/json'
       )
     ) $$
);
```

Para listar: `SELECT * FROM cron.job;`
Para cancelar: `SELECT cron.unschedule('recalc-preferences-daily');`

## Alternativa sin pg_cron (GitHub Actions)

`.github/workflows/recalc-preferences.yml`:

```yaml
name: Recalc Preferences Daily
on:
  schedule: [{ cron: '0 3 * * *' }]
  workflow_dispatch:
jobs:
  recalc:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sf -X POST "${{ secrets.SB_FUNC_URL }}/recalc-preferences" \
            -H "Authorization: Bearer ${{ secrets.SB_SERVICE_ROLE }}"
```
