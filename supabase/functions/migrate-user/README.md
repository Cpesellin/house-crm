# migrate-user — Edge Function

Migra un usuario del sistema legacy (SHA-256 + salt hardcodeado) a Supabase Auth nativo, preservando su UUID.

## Flujo

```
Usuario intenta login
  ↓
Frontend: signInWithPassword(email, password)
  ├── ✅ éxito → ya estaba migrado, listo
  └── ❌ Invalid credentials → fallback a migrate-user
        ↓
        Frontend: POST /functions/v1/migrate-user { email, password }
        ↓
        Edge Function:
          1. Busca usuarios.password_hash
          2. Valida SHA-256(password + 'HOUSE_CRM_SALT_2026')
          3. Si coincide → auth.admin.createUser con id = usuarios.id
          4. Marca usuarios.auth_migrated = true
          5. Retorna { ok: true }
        ↓
        Frontend: signInWithPassword(email, password) de nuevo → ahora sí funciona
```

## Deploy

**Opción 1 — Dashboard:**
1. Supabase Dashboard → Edge Functions → Deploy new function → Via Editor
2. Nombre: `migrate-user`
3. Pegar contenido de `index.ts`
4. Deploy
5. **IMPORTANTE:** Verificar que está con "Verify JWT with legacy secret" = **OFF** (esta función la llama el anon key, no un JWT)

**Opción 2 — CLI:**
```bash
supabase functions deploy migrate-user --no-verify-jwt
```

## Test

```bash
curl -X POST https://keasjfgcjkskvdcudoml.supabase.co/functions/v1/migrate-user \
  -H "Content-Type: application/json" \
  -H "apikey: ANON_KEY" \
  -d '{"email":"katherin.m@example.com","password":"tu_pwd_real"}'
```

Respuesta esperada al primer llamado:
```json
{"ok":true,"migrated":true,"email":"katherin.m@...","user_id":"..."}
```

Segundo llamado (ya migrado):
```json
{"ok":true,"already_migrated":true,"email":"..."}
```

Password incorrecto:
```json
{"ok":false,"error":"invalid_credentials"}
```

## Seguridad

- Solo funciona con usuarios `activo = true`
- No expone `password_hash` en respuestas
- Password SOLO viaja en HTTPS (enforced por Supabase)
- Rate limiting a nivel Supabase (60 rpm por IP por default)
- Si alguien ya está migrado, no se re-crea → idempotente

## Próximo paso

Una vez probado con 1 usuario real, modificar `src/core/auth.js` para usar esta función como fallback en `loginWithCredentials`.
