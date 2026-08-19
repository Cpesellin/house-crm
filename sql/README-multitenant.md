# HOUSE CRM · Multitenant · Runbook completo

Runbook operativo para llevar HOUSE CRM de single-tenant a SaaS multi-tenant vendible.

## Estado del código

| Componente | Ubicación | Estado |
|---|---|---|
| SQL Fase A (44-49) | `sql/44-49-*.sql` | ✅ APLICADO en Supabase |
| SQL Fase B/C/D (50-54) | `sql/50-54-*.sql` | ⏳ Pendiente correr |
| Frontend `src/tenant/` | current, branding, config, access-gate | ✅ Código listo |
| Frontend `src/billing/` | signup-page, facturacion-panel, wompi-checkout | ✅ Código listo |
| Frontend `src/superadmin/` | tenants-panel | ✅ Código listo |
| Backend `api/wompi-webhook.js` | Vercel serverless function | ✅ Código listo |
| Merge a main | PR #2 | ⏳ Pendiente |

## Orden de ejecución completo

### Paso 1: Correr SQL en Supabase (nueva query por cada archivo)

```
sql/44-multitenant-a1-1-registrar-house.sql       [✅ ya corrido]
sql/45-multitenant-a1-2-inmobiliaria-id.sql       [✅ ya corrido]
sql/46-multitenant-a1-2-verificacion.sql          [✅ ya corrido]
sql/47-multitenant-a2-triggers.sql                [✅ ya corrido]
sql/48-multitenant-a1-3-not-null.sql              [✅ ya corrido]
sql/49-multitenant-a3-rls-tenant.sql              [✅ ya corrido]
sql/50-multitenant-b2-rpc-tenant-by-slug.sql      [⏳ ahora]
sql/51-multitenant-c4-superadmin-rpcs.sql         [⏳ ahora]
sql/52-multitenant-c2-cron-vencidos.sql           [⏳ ahora]
sql/53-multitenant-d-signup-rpc.sql               [⏳ ahora]
sql/54-multitenant-mejoras.sql                    [⏳ ahora]
```

### Paso 2: Instalar crons (si pg_cron está disponible)

```sql
-- Cron diario 03:00 UTC: auto-suspende tenants vencidos
SELECT cron.schedule(
  'suspender-tenants-vencidos',
  '0 3 * * *',
  $$ SELECT cron_suspender_tenants_vencidos(); $$
);

-- Cron diario 09:30 UTC: alertas de trial próximo a vencer
SELECT cron.schedule(
  'alertar-trials-venciendo',
  '30 9 * * *',
  $$ SELECT cron_alertar_trials_venciendo(); $$
);
```

Si pg_cron no está: usar GitHub Actions o Upstash con curl a los endpoints RPC.

### Paso 3: Merge PR #2 en GitHub

Rama: `feature/ronda2-notifications` → `main`. Vercel deploy prod automático tras merge.

### Paso 4: Env vars en Vercel

Project Settings → Environment Variables:

| Variable | Ámbito | Descripción |
|---|---|---|
| `VITE_SUPA_URL` | Public | Ya existe |
| `VITE_SUPA_KEY` | Public | Ya existe |
| `VITE_WOMPI_PUBLIC_KEY` | Public | De Wompi dashboard (widget) |
| `WOMPI_EVENTS_SECRET` | Secret | De Wompi dashboard (firma webhook) |
| `SUPABASE_SERVICE_KEY` | Secret | Service role key de Supabase |

Después de agregar env vars: redeploy manual desde Vercel dashboard.

### Paso 5: Configurar webhook Wompi

Wompi dashboard → Configuración → Eventos → añadir URL:

```
https://tudominio.com/api/wompi-webhook
```

Eventos a escuchar: `transaction.updated`.

### Paso 6: Activar multi-tenant en el frontend

En `index.html` o via feature flag:

```html
<script>window.__MULTITENANT__ = true;</script>
```

Con esto, la detección de subdominio en `src/tenant/current.js` empieza a resolver realmente.

### Paso 7: Configurar DNS

Dominio raíz (ej: `plataforma.com`):
- `www.plataforma.com` → Vercel (landing)
- `*.plataforma.com` → Vercel (wildcard para tenants)

Sub-dominios activos automáticamente con el certificado wildcard de Vercel.

### Paso 8: Crear el primer tenant nuevo (test)

Opción A — Panel superadmin (necesitás ser admin de House):
1. Login como admin House en `www.inmobiliariahouse.com.co`
2. Click 🛠️ en el header → panel de tenants
3. Botón "+ Crear tenant"

Opción B — Signup público:
1. Abrir `https://plataforma.com/#/signup`
2. Llenar form
3. Trial 15 días arranca solo

Opción C — SQL directo:
```sql
SELECT signup_tenant('democlient', 'Demo Client', 'admin@demo.com', '+573001234567', 'Bogotá');
```

## Verificación end-to-end

### Aislamiento de datos
```sql
-- Ver inmuebles del tenant House (esperado: ~192)
SELECT COUNT(*) FROM inmuebles;

-- Ver inmuebles totales cross-tenant (solo con service_key bypasseando RLS)
SELECT COUNT(*) FROM inmuebles WHERE inmobiliaria_id != (SELECT id FROM inmobiliaria WHERE slug='house');
```

### Branding
Abrir en el navegador (subdominio o `?tenant=xxx`):
- `<title>` debe cambiar al nombre del tenant
- Botones WhatsApp deben usar el teléfono del tenant
- URLs de share deben usar el dominio del tenant

### Access gate
Pausar un tenant desde el panel superadmin → sus usuarios ven pantalla "🔒 Suspendida" al recargar.

### Wompi (sandbox primero)
1. Ir a `/#/facturacion` como admin del tenant
2. Click "💳 Pagar mes"
3. Widget de Wompi abre
4. Usar tarjeta de test de Wompi
5. Después del pago: `suscripcion.estado='activa'`, `proximo_cobro` +30 días

## Estructura de archivos

```
sql/
  44-53-multitenant-*.sql         ← migraciones ordenadas
  54-multitenant-mejoras.sql      ← slug check + cron alerts
  README-multitenant.md           ← este archivo

src/tenant/
  current.js                      ← detección subdomain/query/custom-domain
  branding.js                     ← aplica logo/color/favicon
  config.js                       ← helpers tenantPhone/tenantName/etc
  access-gate.js                  ← bloqueo si suscripción cancelada

src/superadmin/
  tenants-panel.js                ← #/superadmin-tenants + nav 🛠️

src/billing/
  signup-page.js                  ← #/signup (público, trial 15d)
  facturacion-panel.js            ← #/facturacion (admin del tenant)
  wompi-checkout.js               ← widget de Wompi (lazy-load)

api/
  wompi-webhook.js                ← recibe transaction.updated
  ver.js                          ← OG tags (existente, sin cambios)
```

## Rollback plan

Cada archivo SQL tiene su bloque `ROLLBACK` comentado al final.

**El único paso irreversible sin data loss**: `sql/48-multitenant-a1-3-not-null.sql`. Después de eso, la columna `inmobiliaria_id` no puede ser NULL.

Para deshacer todo: correr los rollbacks en orden inverso (54 → 44). Los datos backfilleados quedan intactos incluso al hacer DROP COLUMN.

## Consideraciones futuras

- **Feature diferencial Customer 360** (memoria `plataforma-saas-inmobiliaria`): cruce live entre HOUSE CRM y PropietarioSoft para mostrar cartera+leads unificados. No implementado, en roadmap.
- **Onboarding wizard primer login**: después de signup, guiar al admin a subir logo, invitar equipo, publicar primer inmueble. No implementado.
- **Landing marketing en `plataforma.com`**: página estática con planes + CTA signup. Placeholder actual usa dominio genérico, ajustar cuando esté decidida la marca.
- **Rate limit signup**: proteger `signup_tenant` de bots. Recomendado agregar hCaptcha en el form.
