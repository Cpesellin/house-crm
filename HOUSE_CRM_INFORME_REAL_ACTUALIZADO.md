# HOUSE CRM — INFORME ARQUITECTÓNICO REAL ACTUALIZADO
## Estado verificado del software al 13 de abril de 2026
## Inmobiliaria House · Pereira, Risaralda, Colombia

---

# 1. STACK TECNOLÓGICO (VERIFICADO)

```
Frontend:     Vite 5 SPA modular (src/) con ES modules
Backend:      Supabase (PostgreSQL + RLS + Edge Functions)
Auth:         Custom (SHA-256 + salt) + Google OAuth (NO Supabase Auth nativo)
Base de datos: PostgreSQL (Supabase)
Storage fotos: Cloudinary (cloud: dfelsbmbo, preset: fichas_unsigned)
Fotos legacy: Google Drive (solo lectura)
Hosting:      ⚠️ VERCEL (NO GitHub Pages) — con vercel.json + rewrites
Edge Funcs:   Supabase Edge Functions (og previews para /ver/HOUSE-XXX)
Repo:         github.com/Cpesellin/house-crm
WhatsApp:     573105922763 (línea única de contacto público)
Dominio:      inmobiliariahouse.com.co
```

### Credenciales

```
Supabase URL:  https://keasjfgcjkskvdcudoml.supabase.co
Supabase Key:  eyJhbGci...Regw (anon key)
Cloudinary:    dfelsbmbo / preset fichas_unsigned
Google CID:    VITE_GID (env variable)
```

---

# 2. ESTRUCTURA DE ARCHIVOS (VERIFICADA)

```
house-crm/
├── src/                          # 54 archivos .js
│   ├── main.js                   # Entry point (House CRM v2.0)
│   ├── App.js                    # 635 líneas — Shell, menús, auth bridge
│   ├── functions.js              # 4,955 líneas — TODAS las funciones globales
│   ├── sections.js               # 3,156 líneas — TODOS los renderers de secciones
│   ├── load.js                   # 532 líneas — Carga de datos + render cards
│   ├── landing.js                # Landing page (pendiente integrar)
│   ├── core/
│   │   ├── auth.js               # Google OAuth + credential login
│   │   ├── user.js               # UserStore + helpers (esPublico, esInterno, etc.)
│   │   ├── notifications.js      # 38 tipos TIPO_CONFIG + notificar() + escalamientos
│   │   ├── constants.js          # HOUSE_PHONE, houseWaUrl
│   │   └── contentModerator.js   # Análisis PII (teléfonos, emails, direcciones)
│   ├── config/
│   │   ├── supabase.js           # Supabase client singleton
│   │   └── cloudinary.js         # Upload de fotos
│   ├── styles/
│   │   └── global.css            # 61 CSS variables (light + dark) + 550 líneas
│   └── features/                 # Módulos modulares (pipeline, inventory, etc.)
├── public/
│   ├── vender.html               # Landing de conversión (standalone)
│   ├── arriendos.html            # OG tags para /arriendos
│   ├── og-generator.html         # Generador de imagen OG
│   ├── manifest.json
│   └── img/
│       ├── logo.png              # 206x200
│       ├── logo-512.png          # 512x512
│       ├── og-image.png          # OG genérica
│       ├── og-arriendos.png      # OG para /arriendos
│       ├── og-vender.png         # OG para /vender
│       └── og-vender.svg         # Fuente SVG del diseño
├── sql/                          # 17 archivos de migración
├── vercel.json                   # Rewrites + CSP headers
├── vite.config.js
├── package.json
└── index.html
```

---

# 3. BASE DE DATOS — ESTADO REAL

## 3.1 Tablas verificadas (✅ = existe, ❌ = no existe)

| Tabla | Estado | Descripción |
|-------|--------|-------------|
| `usuarios` | ✅ | 39 usuarios (2 admin, 8 asesor, 1 gestor, 28 público) |
| `inmuebles` | ✅ | 155 inmuebles, 74 columnas |
| `fotos` | ✅ | Fotos Cloudinary + Drive legacy |
| `anotaciones` | ✅ | Notas por inmueble |
| `historial` | ✅ | Cambios en inmuebles |
| `solicitudes` | ✅ | Consultas de disponibilidad |
| `registro_solicitudes` | ✅ | Solicitudes de registro |
| `alertas` | ✅ | Sistema legacy de alertas |
| `agenda` | ✅ | Eventos de calendario + citas |
| `conciliacion` | ❌ | **NO EXISTE en Supabase** (referenciada en código) |
| `favoritos` | ✅ | Favoritos de usuarios |
| `mensajes` | ✅ | Chat + mensajes contextuales |
| `notificaciones` | ✅ | Sistema v2 de notificaciones |
| `intereses_compradores` | ✅ | Pipeline de intereses |
| `cierres` | ✅ | Negocios cerrados + comisiones |
| `participantes_comision` | ✅ | N participantes con % libres |
| `permisos_rol` | ✅ | 45 permisos × 5 roles configurables |
| `historial_roles_usuario` | ✅ | Auditoría de cambios de rol |
| `referidos` | ✅ | Programa de referidos |

### ⚠️ Tablas que NO existen pero se referencian en specs:
- `negocios_cerrados` — **NO EXISTE**. Se usa `cierres` en su lugar.
- `conciliacion` — **NO EXISTE** en Supabase (error al consultar).
- `intereses_inmueble` — Se llama `intereses_compradores` en realidad.
- `citas_inmueble` — Se usa la tabla `agenda` con campos extendidos.

## 3.2 Columnas REALES de `usuarios` (31 columnas verificadas)

```sql
id UUID PRIMARY KEY
nombre TEXT
email TEXT
usuario TEXT                       -- username para login con credenciales
password_hash TEXT                 -- SHA-256 + salt (auth custom, NO Supabase Auth)
telefono TEXT                      -- campo legacy (puede estar vacío)
telefono_contacto TEXT             -- WhatsApp (campo principal)
foto TEXT                          -- URL de foto (campo principal)
foto_url TEXT                      -- campo alternativo de foto
rol TEXT                           -- 'admin' | 'oficina' | 'asesor'
tipo_usuario TEXT                  -- 'interno' | 'publico' (CHECK constraint)
activo BOOLEAN
es_gestor_arriendos BOOLEAN        -- permiso especial gestor
puede_publicar BOOLEAN             -- flag para publicar inmuebles
puede_referir BOOLEAN              -- flag para referir
perfiles_publicos TEXT[]           -- {'comprador','vendedor','comisionista'}
intencion_registro TEXT            -- contexto de por qué se registró
estado_usuario TEXT                -- 'activo','inactivo','suspendido','pendiente'
notificaciones_email BOOLEAN       -- opt-in (default false)
comprador_credito_aprobado BOOLEAN
comprador_monto_credito NUMERIC
comprador_tipo_pago TEXT
comprador_proposito TEXT
comprador_notas_admin TEXT
comprador_calificado BOOLEAN
comprador_calificado_at TIMESTAMPTZ
comprador_calificado_por UUID
creado_por UUID REFERENCES usuarios(id)
notas_admin TEXT
ultimo_login TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**CHECK constraint:** `tipo_usuario IN ('interno', 'publico')` — NO acepta 'cliente', 'vendedor_externo', 'propietario', 'pendiente' (estos fueron eliminados).

## 3.3 Columnas REALES de `inmuebles` (74 columnas verificadas)

Las más relevantes para el marketplace:
```sql
estado_revision TEXT               -- 'en_revision','aprobado','rechazado','cambios_solicitados'
moderacion_estado TEXT
moderacion_auto JSONB              -- resultado análisis PII automático
alertas_moderacion JSONB           -- alertas PII con color/severidad
motivo_cambios TEXT
cambios_solicitados_at TIMESTAMPTZ
publicado_por_tipo TEXT            -- 'interno','vendedor','comisionista'
comisionista_id UUID
comision_split TEXT
comision_porcentaje NUMERIC
origen TEXT                        -- 'externo' para publicaciones de público
```

## 3.4 Columnas REALES de `intereses_compradores`

```sql
id, inmueble_id, usuario_id, presupuesto_max, fecha_ideal, modalidad,
mensaje, score, calificado_por, calificado_at, motivo_score, estado,
interes_tipo TEXT,                 -- 'comprador' | 'comisionista'
referido_nombre TEXT,              -- solo si interes_tipo='comisionista' (legacy, ya no se pide)
referido_telefono TEXT,            -- idem
credito_aprobado TEXT,             -- 'si','no','en_tramite','no_sabe'
tipo_pago TEXT,                    -- 'credito','efectivo','mixto'
proposito TEXT,                    -- 'vivienda','inversion','comercial'
score_auto INT,                    -- puntaje 0-100 automático
created_at, updated_at
```

## 3.5 Columnas REALES de `cierres`

```sql
id, inmueble_id, tipo ('arriendo'|'venta'), estado ('activo'|'reabierto'|'anulado'),
precio_final, fecha_cierre, contraparte_nombre, duracion_meses,
interes_id, nota,
comision_total, comision_captador, comision_casa,  -- legacy snapshot
comision_porcentaje NUMERIC,                        -- % configurable
fase_a_pagada, fase_a_pagada_at,                   -- arriendo fase A
fase_b_pagada, fase_b_pagada_at,                   -- arriendo fase B
pagada, pagada_at,                                  -- venta pago único
captador_id, cerrado_por, created_at, updated_at
```

## 3.6 Columnas REALES de `participantes_comision`

```sql
id, cierre_id UUID REFERENCES cierres(id),  -- ⚠️ NO negocios_cerrados
usuario_id UUID REFERENCES usuarios(id),
nombre_externo TEXT, telefono_externo TEXT,
rol_comision TEXT CHECK IN ('house','comisionista_inmueble','comisionista_comprador',
  'asesor_captador','referidor','otro'),
porcentaje NUMERIC(5,2), monto NUMERIC,
pago_estado TEXT CHECK IN ('pendiente','pagado','parcial'),
pago_fecha TIMESTAMPTZ, pago_referencia TEXT, notas TEXT, created_at
```

## 3.7 Columnas REALES de `mensajes`

```sql
-- Campos existentes
id, conversacion_id, emisor_id, receptor_id, inmueble_id, texto, leido, created_at
-- Campos de contexto (sql/31, ejecutado ✅)
contexto_tipo TEXT,    -- 'moderacion','interes','cita','negocio'
contexto_id UUID,
tipo_mensaje TEXT      -- 'texto','sistema','declinacion'
```

## 3.8 Tabla `permisos_rol` (45 permisos × 5 roles)

```sql
id, codigo TEXT UNIQUE, categoria TEXT, nombre TEXT, descripcion TEXT,
admin BOOLEAN, oficina BOOLEAN, gestor BOOLEAN, asesor BOOLEAN, publico BOOLEAN,
es_sistema BOOLEAN, created_at, updated_at
```

10 categorías: ver_inmuebles (7), editar_inmuebles (6), publicar (2), moderacion (3), pipeline (3), agenda (4), solicitudes (2), admin (7), comun (9), contacto (2).

---

# 4. MIGRACIONES SQL — ESTADO REAL (17 archivos)

| # | Archivo | Estado | Contenido |
|---|---------|--------|-----------|
| 17 | 17-notificaciones.sql | ✅ | Tabla notificaciones (22 cols, 6 índices, 4 RLS) |
| 18 | 18-auth-progresiva.sql | ✅ | notificaciones_email en usuarios |
| 19 | 19-moderacion-pii.sql | ✅ | alertas_moderacion JSONB en inmuebles |
| 20 | 20-cola-moderacion.sql | ✅ | motivo_cambios, cambios_solicitados_at en inmuebles |
| 21 | 21-intereses-compradores.sql | ✅ | Tabla intereses_compradores |
| — | referidos-dedup.sql | ✅ | Deduplicación de referidos |
| 23 | 23-cierres.sql | ✅ | Tabla cierres + trigger updated_at |
| 24 | 24-roles-dinamicos.sql | ✅ | puede_publicar, puede_referir en usuarios |
| 25 | 25-consolidar-roles.sql | ✅ | perfiles_publicos[], CHECK interno/publico |
| 26 | 26-interes-tipo.sql | ✅ | interes_tipo, referido_nombre/telefono |
| 27 | 27-intencion-registro.sql | ✅ | intencion_registro en usuarios |
| 28 | 28-participantes-comision.sql | ✅ | Tabla participantes_comision + comision_porcentaje |
| 29 | 29-calificacion-comprador.sql | ✅ | credito_aprobado, tipo_pago, proposito, score_auto |
| 30 | 30-campos-inmueble-publicacion.sql | ✅ | publicado_por_tipo, comisionista_id, comision_split |
| 31 | 31-mensajes-contexto.sql | ✅ | contexto_tipo, contexto_id, tipo_mensaje en mensajes |
| 32 | 32-historial-roles.sql | ✅ | Tabla historial_roles_usuario + estado_usuario/etc |
| 33 | 33-permisos-rol.sql | ✅ | Tabla permisos_rol (45 permisos seed) |

**⚠️ NO existe migración #22.** La numeración salta de 21 a 23.

---

# 5. SISTEMA DE ROLES (ESTADO REAL)

## 5.1 Distribución actual de usuarios

| Rol | Cantidad | tipo_usuario |
|-----|----------|-------------|
| 🔴 Admin | 2 | interno |
| 🔵 Asesor | 8 | interno |
| 🟢 Gestor | 1 | interno (es_gestor_arriendos=true) |
| ⚫ Público | 28 | publico |
| **Total** | **39** | |

## 5.2 Valores de rol en la base de datos

- `rol`: solo `'admin'`, `'asesor'` (oficina existe en código pero no hay usuarios con ese rol actualmente)
- `tipo_usuario`: solo `'interno'` o `'publico'` (CHECK constraint enforced)
- `es_gestor_arriendos`: boolean separado del rol
- **NO existe** `rol='cliente'`, `tipo_usuario='vendedor_externo'`, etc. — fueron eliminados en sql/25

## 5.3 Auth — cómo funciona realmente

```
⚠️ NO usa Supabase Auth nativo.
Auth es CUSTOM:
  - Google OAuth: decode JWT client-side → lookup en tabla usuarios → userStore.set()
  - Credential login: SHA-256(password + 'HOUSE_CRM_SALT_2026') → compare con password_hash
  - Session: sessionStorage con key 'hcrm'
  - RLS: open policies (all tables use USING(true) WITH CHECK(true))
  - Filtrado de permisos: todo en client-side JS
  - Recuperar contraseña: reset directo con email (sin envío de código)
```

---

# 6. FUNCIONES GLOBALES REGISTRADAS EN WINDOW

## 6.1 Role helpers (user.js)

```
esInterno(), esPublico(), esAdmin(), esOficina(),
esAdminOOficina(), esGestorArriendos(), tienePerfilPublico(perfil)
```

## 6.2 Principales de functions.js (~200 funciones window.*)

```
// Inmuebles
oM(idx), saveAll(id), chgE(id,e), quickMove(id,e), eliminarInm(id),
restaurarInm(id), reasignarCap(id), showPublicView(id)

// Publicación
interceptarPublicacion(), _mostrarPreguntaPublicacion(),
_seleccionarTipoPublicacion(tipo), ownerPublish(), ownerSaveStep(step),
ownerWizardNext(), ownerWizardPrev()

// Intereses
abrirInteres(inmId), _abrirInteresDirecto(inmId),
_abrirInteresComisionista(inmId), guardarInteres(inmId),
_guardarInteresComisionista(inmId), calcScoreInteres(int,inm),
getScoreLabel(score), calificarInteresRapido(id),
abrirCalificarInteres(id,score), _aplicarCalificacionInteres(id,score,motivo)

// Cierres + Comisiones
calcularComision(tipo,precio,pct), abrirFormularioCierre(inmId,estado),
_guardarCierre(inmId,tipo), marcarPagoParticipante(id), marcarPagoCierre(id,fase),
_cierreApplyPreset(idx), _cierreAddParticipante(), _cierreRenderPctBar(tipo),
_cierreRenderParticipantes(tipo), _cierreRefreshPreview(tipo)

// Roles
abrirCambiarRol(userId,dir), cambiarRolUsuario(userId,nuevoRol),
abrirCrearUsuario(), togglePublicar(userId,val), activarPerfilPublico(perfil)

// Mensajes
mensajeDeNegocio(opts), abrirChat(receptorId,inmId)

// Moderación
aprobarInmuebleExterno(inmId), rechazarInmuebleExterno(inmId),
pedirCambiosInmuebleExterno(inmId), abrirPedirCambios(inmId),
aprobarRegistro(userId,tipo), rechazarRegistro(userId)

// Auth
registerExternal(), completeEmailReg(tipo), selectProfile(tipo,email,nombre,foto),
showOnboarding(payload), showOnboardingEmail(), _registrarConIntencion(intencion),
resetPassword(), toggleRegForm(), toggleResetForm()

// Landing
renderLandingPage(), _landingOpenReg(intencion), compartirArriendos()

// Referidos
renderReferralForm(), refNext(), refPrev(), refSubmit(),
renderReferralBanner(), refUpdateCalc()

// Utilidades
toast(msg,cls), cfShow(ico,tit,msg), go(sec), fm(n), emo(tipo),
noti(...), notificar(...), doSearch(), load(), loadPublic()
```

## 6.3 Renderers de secciones (sections.js)

```
rInv(), rPipe(), rReg(), rAl(), rPort(), rDash(), rAgenda(), rUsers(),
rPerfil(), rPapelera(), rPortafolio(), rFavoritos(), rMisIntereses(),
rMisCitas(), rCitasInternal(), rMisNegocios(), rCuenta(), rPublicar(),
rEspera(), renderMensajes(), renderMisInmueblesExt(),
renderPropietariosLanding(), renderReferidosLanding(),
renderLandingRoles(), renderReferralForm(), renderMisReferidos(),
renderPaymentSetup(), renderAdminPaymentPanel(),
rComando(), rNegociosAdmin(), rArriendosAdmin(), rConfigUsuarios()
```

---

# 7. RUTAS Y NAVEGACIÓN (router.js)

## 7.1 Rutas internas (solo tipo_usuario='interno')

| Ruta | Renderer | Roles |
|------|----------|-------|
| inv | rInv | Todos internos |
| mis | rPipe | Todos internos |
| reg | rReg | Todos internos |
| alertas | rAl | Todos internos |
| portales | rPort | Todos internos |
| dash | rDash | Todos internos |
| agenda | rAgenda | admin, oficina, gestor |
| citas | rCitasInternal | Todos internos |
| users | rUsers | Solo admin |
| comando | rComando | Solo admin |
| negocios-admin | rNegociosAdmin | Solo admin |
| arriendos-admin | rArriendosAdmin | Solo admin |
| config-usuarios | rConfigUsuarios | Solo admin |
| papelera | rPapelera | Solo admin |

## 7.2 Rutas públicas (tipo_usuario='publico')

| Ruta | Renderer |
|------|----------|
| portafolio | rInv (override) |
| publicar | rPublicar |
| favoritos | rFavoritos (tabs ⭐+❤️) |
| mensajes | renderMensajes |
| mis-citas | rMisCitas |
| mis-inm | renderMisInmueblesExt |
| mis-negocios | rMisNegocios |
| referir | renderReferralForm (+mis referidos inline) |
| cuenta | rCuenta |

## 7.3 Rutas sin auth

| Ruta | Renderer |
|------|----------|
| portafolio | rInv (portafolio público) |
| ver | showPublicView (detalle inmueble) |
| propietarios | renderPropietariosLanding |
| referidos-landing | renderReferidosLanding |
| registro | renderLandingRoles |

## 7.4 URLs especiales (vercel.json)

| URL | Destino | Condición |
|-----|---------|-----------|
| /ver/:ref | Edge Function Supabase | Solo bots (WhatsApp/Facebook) |
| /arriendos | arriendos.html | Solo bots; browsers → SPA con filtro arriendo |
| /vender | vender.html | Todos (landing standalone) |
| /* | index.html | Catch-all SPA |

---

# 8. MENÚ REAL DEL CLIENTE PÚBLICO (9 items)

```
🏠 Explorar inmuebles    → go('portafolio')
📝 Publicar inmueble     → interceptarPublicacion()
⭐ Favoritos              → go('favoritos')     [tabs: ⭐ Favs + ❤️ Me interesa]
💬 Mensajes              → go('mensajes')
📅 Citas                 → go('mis-citas')
🏡 Mis inmuebles         → go('mis-inm')
💰 Mis negocios          → go('mis-negocios')
🤝 Referir arriendo      → go('referir')        [form + mis referidos inline]
👤 Mi perfil             → go('cuenta')
```

---

# 9. MENÚ REAL DEL ADMIN (items visibles)

```
🏠 Inventario            → siempre
🔀 Mis Inmuebles         → siempre
➕ Registrar              → siempre
❤️ Favoritos              → siempre (ruta, no en menú interno)
🔔 Alertas               → siempre
🌐 Portales              → siempre
📊 Dashboard             → siempre
🎯 Centro Comando        → solo admin
📅 Agenda                → admin, oficina, gestor
🤝 Citas                 → siempre
🏆 Mis Negocios          → siempre
💼 Negocios              → solo admin
🔑 Arriendos             → solo admin
🤝 Referir arriendo      → siempre
💰 Mis referidos         → siempre
💳 Pagos referidos       → solo admin
👥 Usuarios              → solo admin
⚙️ Config Usuarios       → solo admin
🗑️ Papelera              → solo admin
⚙️ Mi Perfil             → siempre
```

---

# 10. MATRIZ DE PERMISOS VERIFICADA

| Feature | Admin | Oficina | Gestor | Asesor | Público |
|---|---|---|---|---|---|
| **VER INMUEBLES** |
| Ver inventario completo | ✅ | ✅ | ✅ | ✅ | ✅ (solo aprobados) |
| Ver descripción pública | ✅ | ✅ | ✅ | ✅ | ✅ (solo esta) |
| Ver descripción privada | ✅ | ✅ | ✅ propios+arriendos | ✅ solo propios | ❌ |
| Ver dirección real | ✅ | ✅ | ✅ arriendos+propios | ✅ solo propios | ❌ |
| Ver datos propietario | ✅ | ✅ | ✅ arriendos | ❌ | ❌ |
| Ver URLs M²/FR | ✅ | ✅ | ✅ | ✅ | ❌ |
| **EDITAR** |
| Editar todos los inmuebles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar arriendos de otros | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar solo propios | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reasignar captador | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar inmueble | ✅ todos | ❌ | ✅ arriendos (con motivo) | ❌ | ❌ |
| **PUBLICAR** |
| Publicar directo → Disponible | ✅ | ✅ | ✅ | ✅ | ❌ |
| Publicar → pendiente revisión | ❌ | ❌ | ❌ | ❌ | ✅ (máx 3) |
| **MODERACIÓN** |
| Notificación publicación ext. | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprobar/Rechazar publicaciones | ✅ | ❌ | ❌ | ❌ | ❌ |
| Calificar intereses | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PIPELINE** |
| Ver pipeline de todos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver pipeline propio | ✅ | ✅ | ✅ | ✅ | ✅ (mis publicaciones) |
| Tab Arriendos de otros | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AGENDA** |
| Acceder a Agenda | ✅ | ✅ | ✅ | ❌ | ❌ |
| Programar citas a todos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Programar citas propias | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver mis citas | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SOLICITUDES** |
| Crear consulta disponibilidad | ✅ | ✅ | ✅ | ✅ | ✅ |
| Responder consultas | ✅ | ✅ | ✅ | ✅ | ❌ |
| **ADMIN** |
| Centro Comando | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestión Usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Config Usuarios (permisos) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Negocios Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Arriendos Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pagos Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Papelera | ✅ | ❌ | ❌ | ❌ | ❌ |
| Conciliación | ✅ | ✅ | ❌ | ❌ | ❌ |
| **COMÚN** |
| Alertas (las suyas) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Portales M²/FR | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Favoritos ⭐ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Me interesa ❤️ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Mis Negocios | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mensajes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Referir arriendo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mi Perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CONTACTO** |
| WhatsApp → captador | ✅ | ✅ | ✅ | ✅ | ❌ |
| WhatsApp → HOUSE_PHONE | ❌ | ❌ | ❌ | ❌ | ✅ |

---

# 11. SISTEMA DE NOTIFICACIONES (38 TIPO_CONFIG)

| Categoría | Tipos |
|---|---|
| Inmueble (10) | cambio_precio, cambio_estado, inmueble_nuevo, inmueble_externo, inmueble_aprobado, inmueble_rechazado, inmueble_cambios_solicitados, eliminar_inmueble, portal_listo, actualizar_portal |
| Solicitud (5) | verificar, interes_nuevo, interes_calificado, interes_pedir_info, interes_descartado |
| Referidos (5) | referido_nuevo, referido_verificando, referido_aprobado, referido_rechazado, referido_publicado |
| Pagos (5) | configurar_pago, comision_lista, comision_pendiente, comision_pagada, pago_realizado |
| Agenda (4) | agenda_gestor, cita_propuesta, cita_confirmada, cita_cancelada |
| Cierres (4) | cierre_registrado, cierre_fase_a_pagada, cierre_fase_b_pagada, cierre_venta_pagada |
| Sistema (4) | registro_externo, registro_aprobado, registro_rechazado, sistema_escalamiento |
| Mensaje (1) | mensaje |

---

# 12. COMISIONES FLEXIBLES (ESTADO REAL)

## Modelo implementado

```
Tabla: cierres (NO negocios_cerrados)
Tabla: participantes_comision (FK → cierres.id, NO negocios_cerrados.id)

Constructor del admin:
  - Selector % base: venta [2%][3%][4%][5%][custom], arriendo [5%][8%][10%][custom]
  - N participantes con % libres
  - Presets: [100] [50/50] [60/40] [40/60] [34/33/33]
  - Validación: suma = 100%
  - Pago individual por participante (pendiente/pagado)
  - Se abre al mover inmueble a Arrendado/Vendido (intercepta quickMove y chgE)

Score automático de compatibilidad:
  - Crédito aprobado: +30
  - Presupuesto cubre precio: +30
  - Plazo <30 días: +20
  - Propósito definido: +10
  - Tipo pago definido: +10
  - Total: 0-100 → 🟢 Alta (≥70), 🟡 Media (40-69), 🔴 Baja (<40)
```

---

# 13. LANDING PAGES

## /vender (standalone HTML)

```
URL: inmobiliariahouse.com.co/vender
Archivo: public/vender.html (no depende del SPA)
Calculadora:
  - VENTA: slider $150M-$2B + slider comisión 0%-1.5% (max)
  - ARRIENDO: slider $1M-$10M + 10% completo para captador
OG: og-vender.png (1200x630)
```

## /arriendos (filtro automático)

```
URL: inmobiliariahouse.com.co/arriendos
Archivo: arriendos.html (solo para bots OG)
Comportamiento: carga SPA → aplica filtro F.neg='arriendo' automáticamente
Filtro estricto: solo arriendos puros (excluye "Venta y Arriendo")
```

---

# 14. DARK MODE

```
Default: SIEMPRE claro
Activación: solo por toggle manual del usuario (botón 🌙 en header)
Persistencia: localStorage 'ht' = 'd'
One-time reset: flag 'ht_v2' fuerza light para usuarios existentes
CSS: 61 variables en body.dark + 40+ override rules para inline styles hardcodeados
NO usa prefers-color-scheme (removido para evitar dark forzado)
```

---

# 15. AUTH Y RECUPERACIÓN DE CONTRASEÑA

```
Login: Google OAuth + usuario/contraseña (SHA-256)
Registro: desde landing roles (#/registro) o desde login overlay
Recuperar contraseña: ingresa email + nueva contraseña directamente (sin código por email)
Onboarding: simplificado — sin pregunta de rol, todos empiezan como 'comprador'
Roles se asignan por acción: al publicar pregunta propietario/comisionista,
  al mostrar interés pregunta para mí/para alguien
```

---

# 16. DIFERENCIAS CON INFORME ANTERIOR (CORRECCIONES)

| Tema | Informe anterior | Realidad |
|---|---|---|
| Hosting | GitHub Pages | **Vercel** con vercel.json |
| Auth | Supabase Auth nativo | **Custom** SHA-256 + Google OAuth client-side |
| SQL pendientes | #20-#22 pendientes | **Hasta #33 ejecutadas** |
| Tabla cierres | negocios_cerrados | **cierres** (negocios_cerrados NO existe) |
| participantes_comision FK | negocios_cerrados(id) | **cierres(id)** |
| conciliacion | existe | **NO existe en Supabase** |
| intereses_inmueble | nombre en spec | **intereses_compradores** (nombre real) |
| citas_inmueble | tabla separada | **agenda** con campos extendidos |
| Usuarios | ~15 | **39** (2 admin, 8 asesor, 1 gestor, 28 público) |
| Inmuebles | ~143 | **155** |
| Campo foto | foto_url | **foto** (campo principal) + foto_url (alternativo) |
| Campo teléfono | telefono | **telefono_contacto** (principal) + telefono (legacy) |
| Campo gestor | gestor_arriendos | **es_gestor_arriendos** |
| tipo_usuario | acepta cliente/vendedor_externo | **Solo 'interno' o 'publico'** (CHECK constraint) |
| Dark mode | auto-detect sistema | **Default claro, solo manual** |
| Recuperar contraseña | no mencionado | **Implementado** (reset directo con email) |
| Landing /vender | no existía | **Implementada** con calculadora |
| Landing /arriendos | no existía | **Implementada** con filtro automático |
| Config Usuarios | no existía | **Implementada** (45 permisos × 5 roles) |

---

## FIN DEL INFORME ACTUALIZADO
