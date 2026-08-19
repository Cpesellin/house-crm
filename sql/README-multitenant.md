# Multitenant · Fase A · Runbook

Migraciones para convertir HOUSE CRM en SaaS multitenant. **Correr en orden estricto** en el SQL Editor de Supabase.

## Orden de ejecución

| # | Archivo | Riesgo | Estado |
|---|---------|--------|--------|
| 1 | `44-multitenant-a1-1-registrar-house.sql` | ✅ BAJO — solo INSERTs | ✅ **YA CORRIDO** (2026-08-08) |
| 2 | `45-multitenant-a1-2-inmobiliaria-id.sql` | 🟡 MEDIO — ALTER TABLE + UPDATE 45 tablas | ⏳ pendiente |
| 3 | `46-multitenant-a1-2-verificacion.sql` | ✅ NINGUNO — solo SELECTs | ⏳ pendiente |
| 4 | `47-multitenant-a1-3-not-null.sql` | 🟠 ALTO — SET NOT NULL, punto de no retorno | 🚧 no creado (después de A1.2 verde) |
| 5 | `48-multitenant-a2-current-tenant.sql` | 🟠 ALTO — función + triggers | 🚧 no creado |
| 6 | `49-multitenant-a3-rls-policies.sql` | 🔴 CRÍTICO — reemplaza `allow_all_*` | 🚧 no creado |

## Cómo correr cada archivo

1. Abrí Supabase → SQL Editor
2. Nueva query
3. Copiá el contenido completo del `.sql` (todo)
4. Run
5. Al final: correr `46-...-verificacion.sql` en query nueva
6. Pegar el output para review antes de ir al siguiente

## Qué NO cambia con Fase A1

Después de A1.1 + A1.2:
- La app funciona idéntica — nadie lee `inmobiliaria_id` todavía
- Policies RLS actuales (`allow_all_*`) siguen igual
- Deploy no requiere cambio de código frontend
- **Zero downtime, zero cambio de comportamiento**

## Qué SÍ desbloqueás con Fase A completa (A1 + A2 + A3)

- Agregar un tenant nuevo = 3 INSERTs
- Aislamiento total de datos entre inmobiliarias vía RLS
- Base para Fase B (detección por subdominio + branding dinámico)
- Base para Fase C (billing con Wompi + panel admin)

## Rollback

Cada archivo tiene su bloque de rollback al final, comentado. Descomentar sólo si es estrictamente necesario.

**Punto de no retorno**: `47-...-not-null.sql`. Antes de ese, todo se puede revertir sin data loss. Después, cualquier INSERT sin `inmobiliaria_id` falla.
