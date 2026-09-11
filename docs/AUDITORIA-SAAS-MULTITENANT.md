# HOUSE CRM · Auditoría de arquitectura para SaaS multi-tenant

**Fecha:** 2026-09-10 · **Alcance:** diagnóstico, sin cambios de código
**Método:** lectura del repositorio (102 módulos JS, 53 migraciones SQL) + pruebas
empíricas contra la base de producción usando la llave pública, la misma que
va dentro del navegador de cualquier visitante.

> Las pruebas se hicieron **desde fuera** del SQL Editor. El editor corre por
> encima de las políticas de seguridad, así que sirve para crear objetos pero
> no para comprobar quién puede ver qué. Todo lo que dice este documento sobre
> permisos está medido, no supuesto.

---

## 1. Resumen ejecutivo

Tres conclusiones, en orden de importancia.

**1. Hay una fuga de datos personales, hoy, en producción, con un solo
inquilino.** Cualquiera que abra la aplicación puede extraer de la base —sin
iniciar sesión, con la llave que ya está en el código del navegador— la lista
de usuarios con sus correos y **36 hashes de contraseña**, 31 leads con
teléfono (22 marcados como privados), 26 anotaciones internas marcadas "solo
admin y yo", y 1.723 notificaciones internas. Esto es anterior al multi-tenant
y no lo causa el multi-tenant: lo hereda. **Es lo primero que hay que cerrar,
antes que cualquier funcionalidad nueva.**

**2. El aislamiento entre inquilinos está diseñado pero anulado por una sola
línea.** La política de aislamiento existe y es correcta. El problema es la
función que decide "a qué inquilino pertenece quien pregunta":

```sql
SELECT COALESCE(
  (SELECT inmobiliaria_id FROM usuarios WHERE id = auth.uid() LIMIT 1),
  (SELECT id FROM inmobiliaria WHERE slug = 'house' LIMIT 1)   -- ← aquí
);
```

Quien no tiene sesión **es House** para la base de datos. Con un inquilino eso
parecía inofensivo; con dos, significa que el público de cualquier inmobiliaria
lee los datos de House, y que cualquier fallo de sesión degrada a "acceso a
House" en vez de a "sin acceso".

**3. No hay que construir el multi-tenant: hay que terminarlo y asegurarlo.**
Existe mucho más de lo que el encargo asume. Las 45 tablas ya tienen
`inmobiliaria_id` poblado y NOT NULL, hay triggers que lo asignan, políticas de
aislamiento, panel de inquilinos, alta de inquilino, planes, suscripciones,
pasarela de pago con webhook y hasta un runbook de despliegue. Está **apagado**
con `window.__MULTITENANT__ = false`. Reconstruirlo sería tirar trabajo bueno.

---

## 2. Estado real frente al estado supuesto

| El encargo asume | La realidad medida |
|---|---|
| Hay que introducir el concepto de inquilino | Ya existe: tabla `inmobiliaria`, 45 tablas con `inmobiliaria_id` NOT NULL, triggers y políticas |
| Hay que crear el panel central | Existe `src/superadmin/tenants-panel.js` con listar/crear/pausar/reactivar |
| Hay que diseñar planes y suscripciones | Existen las tablas `plan` (9 filas) y `suscripcion`, más `v_acceso` |
| Hay que construir la facturación del SaaS | Existe pasarela Wompi + `api/wompi-webhook.js` |
| El CRM tiene integración DIAN | **No la tiene.** No hay una sola línea de DIAN en este repositorio |
| La seguridad está resuelta (13/13 OWASP) | **No lo está.** Ver sección 4 |

### Sobre DIAN — hay que aclararlo antes de planificar

El encargo dedica un apartado entero a aislar credenciales DIAN por inquilino.
Busqué en todo el repositorio: **no hay integración DIAN en HOUSE CRM**. La
facturación electrónica vive en el otro proyecto (PropietarioSoft, Next.js +
Prisma), que es una base de código y una base de datos distintas.

Esto importa para el plan: si el SaaS que se quiere vender incluye facturación
DIAN, no es un apartado de esta arquitectura sino **la integración de dos
productos**, que es un proyecto en sí mismo. Conviene decidirlo explícitamente
antes de dibujar el roadmap, porque cambia el alcance por completo.

---

## 3. Arquitectura actual

### Frontend
Vanilla JS + Vite. 102 módulos. Sin framework: los componentes son funciones
que devuelven cadenas de HTML y se cablean a `window.*` para los `onclick`
en línea. Enrutador propio por hash (`src/router.js`) con un mapa de rutas a
secciones. El menú lateral es **HTML fijo** en `App.js`, no se genera de las
rutas (esto ya costó una sección sin entrada de menú).

### Backend
No hay servidor propio. Tres piezas:
- **Supabase** (PostgreSQL + Auth + PostgREST) — casi todo.
- **Funciones serverless de Vercel** (`api/`) — 4: vistas previas para
  WhatsApp (`ver`, `home`, `arriendos`) y el webhook de pagos (`wompi-webhook`).
- **Edge Functions de Supabase** — 2: `migrate-user`, `recalc-preferences`.

### Datos
PostgreSQL en Supabase. 45 tablas operativas con `inmobiliaria_id`, más la
capa SaaS (`inmobiliaria`, `plan`, `suscripcion`) y las recientes
(`alerta_busqueda`, `inmueble_estado_historial`).

### Almacenamiento
**No se usa Supabase Storage.** Las fotos van a **Cloudinary** con un preset
**sin firmar** (`fichas_unsigned`). Dos consecuencias:
- Cualquiera que conozca el nombre de la nube y el preset puede **subir
  archivos a la cuenta**: es una puerta abierta a costes y a contenido ajeno.
- Las imágenes son públicas por URL. Para fotos de inmuebles publicados es
  aceptable; para documentos (escrituras, cédulas) **no lo sería**, y ese es
  un módulo que el SaaS pedirá tarde o temprano.

### Autenticación
Migrada a **Supabase Auth**. El flujo actual:
1. Se busca el usuario por nombre en la tabla `usuarios`.
2. Si `auth_migrated` es verdadero → `signInWithPassword`.
3. Si no → la Edge Function `migrate-user` valida contra el hash antiguo con
   permisos de servicio y migra la cuenta.

Google OAuth está en el código pero **el proveedor está deshabilitado** en el
panel de Supabase, así que hoy no funciona.

**Riesgo:** `migrate-user` corre con la llave de servicio y, según se
documentó, con la verificación de JWT desactivada. Es un punto público que
valida credenciales: necesita límite de intentos.

### Roles
Dos ejes que conviven:
- `usuarios.tipo_usuario`: `interno` | `publico` (13 internos, 34 del público).
- `usuarios.rol`: `admin`, `oficina`, `gestor`, `asesor`…, con una tabla
  `permisos_rol` (45 filas).

---

## 4. Auditoría de aislamiento — lo crítico

### 4.1 Qué se lee hoy sin ninguna sesión

Medido contra producción con la llave pública:

| Tabla | Filas visibles | Contenido |
|---|---:|---|
| `notificaciones` | 1.723 | mensajes internos del equipo |
| `fotos` | 1.857 | — |
| `alertas` | 878 | — |
| `historial` | 240 | auditoría de cambios |
| `inmuebles` | 176 | (público por diseño) |
| `usuarios` | 47 | **incluye `password_hash` (36 con valor) y `email` (40)** |
| `interesados` | 31 | **teléfono (29), presupuesto, notas; 22 marcados privados** |
| `anotaciones` | 30 | **26 marcadas "privada — solo admin y yo"** |
| `favoritos` | 26 | — |
| `referidos` | 11 | — |
| `permisos_rol` | 45 | mapa de permisos del sistema |

### 4.2 Causa raíz

Dos decisiones, ambas razonables en su momento, que hoy suman mal:

**a) `sql/57` abrió `anon` de par en par.** Concedió `SELECT/INSERT/UPDATE/
DELETE` con `USING (true)` sobre 19 tablas. El motivo está escrito en el
propio archivo: *"los usuarios del CRM operan como anon: entran con el login
antiguo y no tienen sesión de Supabase Auth"*. Era cierto entonces.

**Ya no lo es.** La migración a Supabase Auth se completó: los asesores
terminan con sesión real (`authenticated`). Las políticas de `anon` son un
residuo — y el residuo es justamente el agujero.

**b) `current_tenant()` cae a House.** Explicado en el resumen. Es lo que hace
que la política restrictiva de aislamiento deje pasar todo lo de House a
cualquiera.

### 4.3 Por qué esto es peor con varios inquilinos

Hoy la fuga es de una inmobiliaria. Mañana:
- El público de Arias, sin sesión, sería "House" y leería datos de House.
- Cualquier usuario de cualquier inquilino con la llave pública (que está en
  el navegador de todos) leería las tablas abiertas a `anon`, que **no filtran
  por inquilino en absoluto** cuando la política restrictiva se satisface.
- Un fallo de sesión no deja al usuario fuera: lo deja dentro de House.

### 4.4 El superadmin no está separado

```sql
CREATE FUNCTION is_superadmin() ... SELECT EXISTS (
  SELECT 1 FROM usuarios u JOIN inmobiliaria i ON i.id = u.inmobiliaria_id
  WHERE u.id = auth.uid() AND u.rol = 'admin' AND i.slug = 'house');
```

**Superadmin = cualquier admin de House.** Es decir, el administrador de una
inmobiliaria cliente es también el administrador de toda la plataforma. Hoy
coincide porque House es del dueño del SaaS; el día que House sea un cliente
más —o que un empleado de House sea admin— esa persona podrá listar, pausar y
crear inquilinos. Hay que separarlo **antes** de vender el primer acceso.

---

## 5. Qué existe y qué falta de la capa SaaS

| Pieza | Estado |
|---|---|
| `inmobiliaria_id` en 45 tablas, NOT NULL, con triggers | ✅ aplicado |
| Política de aislamiento por inquilino | ⚠️ existe, anulada por el respaldo a House |
| Detección de inquilino (subdominio / dominio / `?tenant=`) | ✅ código listo, apagado |
| Marca por inquilino (logo, color, nombre) | ✅ funcionando |
| Bloqueo por suscripción (`access-gate`) | ✅ código listo |
| Panel de inquilinos (listar/crear/pausar/reactivar) | ✅ código listo |
| Alta pública con prueba de 15 días | ✅ código listo |
| Planes | ✅ tabla `plan` con 9 filas |
| Suscripciones | ⚠️ tabla `suscripcion`, **sin historial de eventos** |
| Cobro (Wompi + webhook) | ✅ código listo |
| Cron de suspensión por vencimiento | ✅ función creada |
| **Permisos por módulo (feature flags)** | ❌ no existe |
| **Soporte / tickets** | ❌ no existe |
| **Registro de auditoría** | ❌ no existe |
| **Medición de consumo y límites** | ❌ no existe |
| **Estado de servicios / observabilidad** | ❌ no existe |
| **Separación superadmin ↔ admin de inquilino** | ❌ no existe |
| **Acceso de soporte "ver como inquilino"** | ❌ no existe |

---

## 6. Qué tablas necesitan `inmobiliaria_id` y cuáles no

Ya está resuelto para las 45 operativas. Para lo que viene:

**Globales (sin `inmobiliaria_id`):** `inmobiliaria`, `plan`, y las futuras
`plan_feature`, `plataforma_admin`, `estado_servicio`.

**Por inquilino (con `inmobiliaria_id`):** todo lo operativo, más las futuras
`suscripcion_evento`, `consumo`, `inquilino_feature`.

**Mixtas — cuidado:** `soporte_ticket` y `auditoria` llevan `inmobiliaria_id`
pero deben poder consultarse **entre inquilinos** desde el panel central. No
resolverlo con la política de aislamiento normal: necesitan una excepción
explícita para el superadmin, o el panel no verá nada.

**`permisos_rol` está mal clasificada.** Hoy tiene `inmobiliaria_id` y 45
filas visibles: es un catálogo del sistema, no dato de un cliente. Duplicarlo
por inquilino significa que añadir un permiso nuevo obligue a replicarlo en
cada uno.

---

## 7. Riesgos para producción

| # | Riesgo | Gravedad | Nota |
|---|---|---|---|
| R1 | Hashes de contraseña y correos legibles sin sesión | **Crítica** | Datos personales; habeas data (Ley 1581) |
| R2 | Leads y notas privadas legibles sin sesión | **Crítica** | 22 leads y 26 notas marcados privados |
| R3 | `anon` puede **modificar y borrar** en 15 tablas | **Crítica** | No solo leer: `USING (true)` en UPDATE y DELETE |
| R4 | `current_tenant()` cae a House | **Alta** | Bloquea el aislamiento real |
| R5 | Superadmin = admin de House | **Alta** | Escalada de privilegios entre cliente y plataforma |
| R6 | Preset de Cloudinary sin firmar | **Media** | Subida de archivos por terceros |
| R7 | `migrate-user` sin límite de intentos | **Media** | Fuerza bruta contra credenciales |
| R8 | Sin registro de auditoría | **Media** | Sin trazabilidad de acciones administrativas |
| R9 | Sin historial de suscripción | **Baja** | Impide reconstruir por qué se cobró qué |

**R3 merece una frase aparte:** con la llave pública se puede *escribir* en
`interesados`, `notificaciones`, `inmuebles`, `favoritos`, `agenda` y otras.
No lo probé de forma destructiva contra producción —no voy a borrar datos del
cliente para demostrarlo—, pero las políticas están escritas así en `sql/57`.

---

## 8. Modelo propuesto

### Identidad
Mantener `inmobiliaria` como la entidad inquilino (renombrarla sería una
migración masiva sin ganancia). Añadir lo que falta como columnas o tablas
satélite, no reescribir.

### Resolución del inquilino — el cambio de fondo
Sustituir el respaldo a House por resolución explícita:

1. **Con sesión** → el `inmobiliaria_id` del usuario. Sin respaldo.
2. **Sin sesión (visitante público)** → no debe existir "inquilino actual". El
   catálogo público se sirve por **funciones de lectura acotadas**
   (`SECURITY DEFINER`) que reciben el inquilino como parámetro y devuelven
   **solo campos publicables**, nunca por acceso directo a las tablas.
3. **Superadmin** → excepción explícita, auditada.

Es el cambio más importante del proyecto y el que más hay que probar: toca
todas las lecturas públicas.

### Superadmin
Tabla `plataforma_admin` separada de `usuarios`, con su propio rol
(`superadmin`, `soporte`, `facturacion`). Pertenecer a House deja de dar
poderes de plataforma.

### Entitlements
`plan_feature` (qué incluye cada plan) + `inquilino_feature` (excepciones por
cliente) + una función `tiene_modulo(codigo)` usada en la base **y** en el
frontend. Nunca condicionar módulos por el nombre del plan repartido por el
código.

---

## 9. Roadmap propuesto

Ordenado por **riesgo y valor**, no por vistosidad. Difiere del que plantea el
encargo: soporte, facturación y observabilidad se mueven después del cierre de
seguridad, porque hoy no hay ningún cliente esperándolos y sí hay datos
personales expuestos.

### Fase 0 — Cerrar la fuga · *urgente, días*
Quitar las políticas de `anon` que ya no hacen falta (la app usa sesión real).
Sacar `password_hash` del alcance de PostgREST. Verificar desde fuera que cada
tabla devuelve cero.
**Aceptación:** con la llave pública y sin sesión, `usuarios`, `interesados`,
`anotaciones`, `notificaciones` e `historial` devuelven 0 filas; el CRM sigue
funcionando con sesión; el catálogo público sigue viéndose.
**Riesgo:** alto de regresión — es la capa que usa la app. Requiere inventario
previo de cada lectura pública y pruebas módulo por módulo.

### Fase 1 — Aislamiento real
Quitar el respaldo a House de `current_tenant()`. Funciones de lectura pública
acotadas. Reclasificar `permisos_rol`.
**Aceptación:** un usuario del inquilino A no obtiene ni una fila del B, en
ninguna de las 45 tablas, probado desde fuera con dos inquilinos reales.

### Fase 2 — Separar la plataforma del inquilino
`plataforma_admin`, `is_superadmin()` basado en ella, auditoría de acciones
administrativas.
**Aceptación:** quitarle el rol admin en House a una cuenta no le quita el
acceso al panel central, y viceversa.

### Fase 3 — Encender el multi-tenant
Activar la detección, DNS con comodín, crear un inquilino de prueba real y
operarlo una semana en paralelo.
**Aceptación:** dos inquilinos operando a la vez sin que ninguno vea al otro;
House sigue igual que hoy.

### Fase 4 — Entitlements y límites
`plan_feature`, `inquilino_feature`, `tiene_modulo()`, contadores de consumo.
**Aceptación:** apagar un módulo desde el panel lo apaga en el cliente sin
tocar código ni desplegar.

### Fase 5 — Onboarding repetible
Alta completa desde el panel: datos, plan, administrador, marca, módulos.
**Aceptación:** crear un inquilino operativo en menos de cinco minutos sin
tocar la base a mano.

### Fase 6 — Suscripciones con historial
`suscripcion_evento`, `suscripcion_pago`, estados formales y sus transiciones.

### Fase 7 — Soporte
Tickets con el contexto del inquilino al lado.

### Fase 8 — Acceso de soporte ("ver como")
Solo después de la auditoría de la Fase 2. Sesión temporal con motivo,
caducidad, registro y aviso visible permanente.

### Fase 9 — Observabilidad y facturación del SaaS
Errores, estado de servicios, MRR/ARR.

### Fase 10 — Endurecimiento
Doble factor para la plataforma, reautenticación en operaciones críticas,
límite de intentos, firma en Cloudinary.

---

## 10. Tres objeciones al encargo

**a) El panel completo antes de tener clientes es sobreingeniería.** Soporte,
facturación del SaaS, salud de servicios, alertas inteligentes y cuatro roles
administrativos son correctos como visión. Construirlos ahora, con un inquilino
y cero clientes de pago, es mantener código que nadie usa mientras hay hashes
de contraseña expuestos. Propongo el orden de la sección 9 y revisar tras la
Fase 5.

**b) "Diseñar para 10.000 inquilinos" no debe pagarse hoy.** La estructura
aguanta cientos sin cambios. Lo que sí conviene ahora, porque después duele, es
no tomar decisiones que lo impidan: índices por `inmobiliaria_id`, paginación,
y nada de contar filas de todos los inquilinos en cada carga del panel.

**c) El criterio de éxito nº 15 ("una tenant jamás pueda acceder a
información de otra") no se cumple hoy ni con una sola.** Es el punto de
partida real, y por eso la Fase 0 va antes que todo lo demás.

---

## 11. Lo que necesito decidido antes de implementar

1. **DIAN:** ¿el SaaS que se vende incluye facturación electrónica? Si sí, es
   integrar dos productos y hay que planificarlo aparte.
2. **House:** ¿seguirá siendo el inquilino nº 1 *y* la casa del SaaS, o se
   separa la empresa dueña de la plataforma?
3. **Ventana de mantenimiento:** la Fase 0 toca la capa que usa la aplicación a
   diario. ¿Hay una franja aceptable para cortar si algo sale mal?
4. **Alcance de la Fase 0:** ¿se cierra todo de golpe o primero lo más
   sensible (`usuarios`, `interesados`, `anotaciones`) y el resto después?
