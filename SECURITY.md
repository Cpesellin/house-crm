# Seguridad — HOUSE CRM

Documento de referencia para el equipo. Resume el modelo de autenticación, RLS y los procedimientos para nuevas tablas.

---

## Modelo de autenticación

### Capas

```
┌──────────────────────────────────────────────────────┐
│  Frontend (SPA Vite)                                 │
│  - Anon key visible (público por diseño)             │
│  - sessionStorage 'hcrm' (legacy, en deprecación)    │
│  - localStorage 'sb-...-auth-token' (Supabase Auth)  │
└──────────────────────────────────────────────────────┘
                       ↓ JWT firmado
┌──────────────────────────────────────────────────────┐
│  Supabase Auth (servidor)                            │
│  - Bcrypt + magic links                              │
│  - JWT con sub = usuarios.id                         │
└──────────────────────────────────────────────────────┘
                       ↓ auth.uid()
┌──────────────────────────────────────────────────────┐
│  PostgreSQL + RLS                                    │
│  - Policies basadas en auth.uid() y rol              │
│  - Helpers SECURITY DEFINER para evitar recursión    │
└──────────────────────────────────────────────────────┘
```

### Flujo de login (dual)

`src/core/auth.js#loginWithCredentials`:

1. **Lookup ligero** en `usuarios` (sin password_hash) → obtiene `auth_migrated`
2. Si **migrated=true**: `SB.auth.signInWithPassword` directo
3. Si **migrated=false**: llama Edge Function `migrate-user`:
   - Valida SHA-256 legacy contra `password_hash` (con service_role)
   - Crea `auth.users` con id idéntico a `usuarios.id`
   - Marca `auth_migrated=true`
   - Frontend retry `signInWithPassword`
4. Hidrata `userStore` desde `usuarios` con el JWT del access_token

### Reset de contraseña

`SB.auth.resetPasswordForEmail` → magic link → user setea nueva pwd → `SB.auth.updateUser({password})`.

Custom SMTP configurado en Supabase Dashboard:
- Provider: **Resend**
- Sender: `noreply@inmobiliariahouse.com.co`
- Dominio verificado con SPF + DKIM + DMARC

---

## Row-Level Security (RLS)

### Helpers globales

Definidos en SQL #40, disponibles en todas las policies:

```sql
public.current_user_rol()        -- TEXT, retorna el rol del usuario auth
public.is_admin_or_oficina()     -- BOOLEAN
public.is_admin_oficina_or_gestor()  -- BOOLEAN
```

Todas son `SECURITY DEFINER` → bypassan RLS al hacer la lookup interna en `usuarios`.

### Estado de tablas (Abril 2026)

| Tabla | RLS estricto | Patrón |
|---|---|---|
| `usuarios` | 🟡 | Row abierto, columna `password_hash` blindada vía REVOKE/GRANT |
| `inmuebles` | 🔴 abierto | Necesario para listado público sin login |
| `participantes_comision` | 🟢 | admin/oficina + propio participante |
| `cierres` | 🟢 | admin/oficina + captador + participantes |
| `mensajes` | 🟢 | emisor o receptor (preexistente) |
| `interesados` | 🟢 | admin + oficina/gestor (no privados) + creador/asignado/prospecto |
| `interesados_historial` | 🟢 | admin/oficina + dueños del interesado padre |
| `inmuebles_interesados` | 🟢 | admin/oficina + asesor que vinculó |
| `visitas_agendadas` | 🟢 | admin/oficina + asesor de la visita |
| `eventos_usuario` | 🟢 | admin/oficina + propio usuario |
| `preferencias_calculadas` | 🟢 | admin/oficina + propio usuario |
| `sugerencias_enviadas` | 🟢 | admin/oficina + destinatario |
| `historial_roles_usuario` | 🟢 | solo admin/oficina |
| `notificaciones` | 🟢 | destinatario_id = auth.uid() (preexistente) |

### Procedimiento para nueva tabla

Cuando agregues una nueva tabla con datos sensibles:

```sql
-- 1. Habilitar RLS
ALTER TABLE public.tabla_nueva ENABLE ROW LEVEL SECURITY;

-- 2. Definir policies por operación (NO USING(true))
CREATE POLICY "tabla_select" ON public.tabla_nueva FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR usuario_id = auth.uid()
  );

CREATE POLICY "tabla_insert" ON public.tabla_nueva FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "tabla_update" ON public.tabla_nueva FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "tabla_delete" ON public.tabla_nueva FOR DELETE
  USING (public.current_user_rol() = 'admin');

-- 3. Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tabla_nueva';
```

### Trampas comunes

- ❌ **`USING (true)` en producción** — equivale a no tener RLS
- ❌ **Embedding (JOIN) sin permisos en relacionada** — falla con 400 PGRST200
- ❌ **Column-level REVOKE con `select=*`** — PostgREST lo rechaza si no se reotorgan columnas explícitas
- ❌ **Policies recursivas** sin SECURITY DEFINER → infinite loop al chequear rol
- ❌ **Múltiples policies PERMISSIVE para mismo cmd** → se combinan con OR, una `USING(true)` invalida las demás

---

## Edge Functions

### `migrate-user`
- **Input**: `{email, password}` (legacy creds)
- Valida SHA-256, crea `auth.users` con UUID = `usuarios.id`, marca migrado
- **Auth**: requiere anon key (NO service_role en headers desde frontend)
- Toggle `Verify JWT with legacy secret` = OFF
- Service-role key viene de env Supabase `SUPABASE_SERVICE_ROLE_KEY`

### `recalc-preferences`
- **Input**: vacío
- Recalcula `preferencias_calculadas` para usuarios con eventos en últimos 90 días
- **Auth**: requiere service_role JWT
- Se invoca diariamente por pg_cron (job `recalc-preferences-daily`)

---

## Cumplimiento OWASP Top 10 (2021)

| Categoría | Cumple | Mitigaciones |
|---|---|---|
| A01 Broken Access Control | 🟢 | RLS estricto + auth.uid() |
| A02 Cryptographic Failures | 🟢 | Bcrypt (Supabase Auth nativo) |
| A03 Injection | 🟢 | PostgreSQL + helpers escapeHtml en innerHTML |
| A04 Insecure Design | 🟢 | Magic link reset, validación uploads |
| A05 Security Misconfiguration | 🟢 | CSP en Vercel + URL allowlist en Supabase |
| A06 Vulnerable Components | 🟡 | npm audit pendiente esbuild update |
| A07 Auth Failures | 🟢 | Supabase Auth + rate limit |
| A08 Data Integrity Failures | 🟢 | No detectado |
| A09 Logging Failures | 🟡 | Supabase logs + audit trails parciales |
| A10 SSRF | 🟢 | No detectado |

---

## Pendientes / deuda técnica

1. **Sandra Morales** (1 admin) sigue sin migrar. Se autocompleta al re-loguearse.
2. **38 usuarios** con `auth_migrated=false`. Se migran al primer login con dual flow.
3. **MEDIO-03** (Google OAuth firma): mitigado por GSI client-side, pero idealmente migrar a `signInWithOAuth` nativo. Riesgo bajo.
4. **CSP `unsafe-inline` y `unsafe-eval`** en `vercel.json`: requeriría refactor de inline event handlers (~200 ocurrencias).
5. **Service_role key expuesta en chat de desarrollo** durante el sprint. Rotar cuando el equipo coordine ventana de mantenimiento.
6. **SHA-256 en `migrate-user`**: eliminar cuando todos los 41 usuarios estén en Supabase Auth.

---

## Contactos para incidentes

- Owner: Cristhian Pesellin (`cristhian.pesellin@gmail.com`)
- Supabase Project: `keasjfgcjkskvdcudoml`
- Cloudinary: `dfelsbmbo`
- Hosting: Vercel (`inmobiliariahouse.com.co`)
- Resend (SMTP): cuenta del owner

---

*Documento mantenido como parte del sprint de seguridad de Abril 2026.*
