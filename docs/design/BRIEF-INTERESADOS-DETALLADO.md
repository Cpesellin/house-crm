# Brief · Módulo de Interesados (CRM de leads)

> **Para**: Claude Design
> **Producto**: HOUSE CRM — SaaS inmobiliario multi-tenant
> **Ruta**: `#/interesados` + modales invocables desde la ficha del inmueble
> **Audiencia**: asesores, gestores de arriendo, oficina y admin
> **Nivel de detalle**: exhaustivo — extraído de las 2.033 líneas de `core/interesados.js` + `interesados-ui.js`
> **Complementa**: `BRIEF-EMBUDO-VENTAS.md` (visión de los dos embudos). Este baja al detalle de uno solo.

---

## 0 · Punto de partida

El sistema de diseño v2 **ya está implementado y en producción**:

- `src/styles/tokens-v2.css` — paleta cream/paper/ink, `--v2-primary` del tenant
- `src/ui/icons.js` — iconos SVG stroke-based
- La ficha interna del inmueble ya usa **tabs + rail crítico + barra de guardado**

Usá esos tokens y esos iconos. Si falta uno, pedilo en vez de meter un SVG suelto.

---

## 1 · Qué hace este módulo

Un **interesado** (lead) es una persona que preguntó por un inmueble concreto. **Siempre nace vinculado a un inmueble** — no existen leads sueltos: `inmueble_id` es obligatorio en la creación.

El asesor lo registra, lo mueve por el embudo, agenda visitas, deja notas y lo cierra.

Es la herramienta de trabajo diaria. Si es lenta, los leads se enfrían.

---

## 2 · Modelo de datos completo

### 2.1 · Tabla `interesados`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `inmueble_id` | uuid | **obligatorio** |
| `nombre_completo` | text | **obligatorio**, mínimo 3 caracteres |
| `telefono` | text | **obligatorio**, mínimo 7 caracteres |
| `email` | text | opcional |
| `canal_origen` | enum | default `whatsapp` |
| `presupuesto_min` | numeric | opcional |
| `presupuesto_max` | numeric | opcional |
| `urgencia` | enum | `inmediata` · `1-3_meses` · `6+_meses` |
| `motivo_busqueda` | enum | `inversion` · `vivienda` · `arriendo` · `otro` |
| `modalidad` | text | se fuerza a `arriendo` si el inmueble lo es |
| `nota_inicial` | text | opcional |
| `tipificacion` | enum | nace en `nuevo` — es la posición en el embudo |
| `estado` | enum | `activo` · `convertido` · `perdido` · `descartado` |
| `privado` | boolean | default: `true` si lo crea un admin |
| `asesor_creador_id` | uuid | quién lo registró |
| `asesor_asignado_id` | uuid | quién lo gestiona |
| `fecha_ultima_actividad` | timestamp | **el dato que más importa para priorizar** |

**`tipificacion` vs `estado`**: la tipificación es la columna del kanban; el estado es el ciclo de vida. Al llegar a `cierre_ganado` el estado pasa a `convertido`; en `cierre_perdido` pasa a `perdido`. Eliminar es un soft delete a `descartado`.

### 2.2 · Las 8 tipificaciones

| id | Label | Color v1 | Orden |
|---|---|---|---|
| `nuevo` | Nuevo | `#3B82F6` | 1 |
| `contactado` | Contactado | `#EAB308` | 2 |
| `visita_agendada` | Visita Agendada | `#F97316` | 3 |
| `visita_realizada` | Visita Realizada | `#8B5CF6` | 4 |
| `negociacion` | En Negociación | `#EF4444` | 5 |
| `cierre_ganado` | Cierre Ganado | `#22C55E` | 6 |
| `cierre_perdido` | Cierre Perdido | `#6B7280` | 7 |
| `en_seguimiento` | En Seguimiento | `#9CA3AF` | 8 |

**1-5 son el flujo activo. 6-8 son terminales o pausados.** Hoy pesan lo mismo visualmente y ese es uno de los problemas.

Los colores son del sistema v1 (azules fríos). Reinterpretalos en la paleta v2 manteniendo la progresión: frío al entrar → cálido al negociar → verde al ganar.

**Regla dura**: pasar a `cierre_ganado` exige que exista **al menos una visita en estado `realizada`**. Si no, el sistema lanza `requiere_visita_realizada`. El diseño tiene que comunicar ese bloqueo antes de que el asesor lo intente.

### 2.3 · Los 6 canales de origen

`whatsapp` 💬 · `web` 🌐 · `referido` 🤝 · `llameya` 📞 · `publico` 👤 · `otro` ❓

Los emojis deberían pasar a SVG del sistema.

### 2.4 · Historial (`interesados_historial`)

4 tipos de actividad: `creacion` · `cambio_tipificacion` · `nota` · `visita_agendada`.
En los cambios de tipificación se guardan además `tipificacion_anterior` y `tipificacion_nueva`.

### 2.5 · Visitas (`visitas_agendadas`)

Estados: `pendiente` · `reprogramada` · `realizada` · (cancelada).
**Validación**: no se puede agendar si ya hay una visita `pendiente` o `reprogramada` en el mismo horario para ese inmueble — lanza `conflicto_horario`.

---

## 3 · Reglas de negocio que el diseño debe reflejar

### 3.1 · Auto-asignación de arriendos

Si el inmueble es de **arriendo** y no se especifica asesor:
1. Se busca al usuario `johan.m`
2. Si no está, cualquier gestor de arriendos activo (el más antiguo)
3. Si no hay, queda el creador

Se registra en el historial como *"Auto-asignado al gestor de arriendos"*, y se notifica **a todos los gestores activos** por si el principal no responde.

**Implicación de diseño**: el asesor que registra un lead de arriendo debe entender que el lead **deja de ser suyo**. Hoy eso se comunica con un texto chico: *"🔑 Arriendo — Redirige a gestor"*.

### 3.2 · Leads privados

Un lead privado **solo lo ve su creador** (y los admin). Nacen privados cuando los crea un admin.
Cuando un lead es privado, las notificaciones van **solo a los admins**, no al captador del inmueble.

**Implicación**: hace falta un indicador visible de privacidad, y que al crear se entienda qué implica marcarlo.

### 3.3 · Permisos

| Rol | Ver | Editar | Nota | Eliminar |
|---|---|---|---|---|
| **admin** | todo, incluidos privados | sí | sí | **solo admin** |
| **oficina** | todo lo no privado | sí | sí | no |
| **gestor** | todo lo no privado | solo los suyos | sí | no |
| **asesor** | los que creó o tiene asignados | solo los suyos | sí | no |
| **usuario público** | — | — | **no** | no |

### 3.4 · Notificación al crear

Va al **captador del inmueble** (si no es el creador). Si es arriendo, también a los gestores.
Título: `👤 Nuevo interesado en {tipo}` (+ `(arriendo)` si aplica)
Color: `#F97316` naranja para arriendo, `#3B82F6` azul para venta. Prioridad alta.

---

## 4 · Pantallas

### 4.1 · Vista principal `#/interesados`

**Header**: título + subtítulo dinámico — `"{N} leads totales · Pipeline con drag & drop"` o `"{N} leads míos · Agrupados por inmueble"`.

**Toggle de vista**: `📋 Pipeline` / `🏠 Por Inmueble`.

**Filtros**:
- Búsqueda: *"Buscar nombre, teléfono, código, barrio…"*
- `⚡ Urgencia`: 🔴 Inmediata / 🟡 1-3 meses / 🟢 6+ meses
- `📱 Canal`
- `👥 Todos los asesores` (solo admin/oficina)
- `✕ Limpiar`

**Modo Pipeline**: columnas horizontales con scroll, drag & drop entre ellas. Las 5 principales se muestran completas; las 3 restantes, más compactas al final.

**Modo Por Inmueble**: acordeón, un bloque por inmueble con sus leads adentro. El estado de expansión se guarda por inmueble.

### 4.2 · Tarjeta del lead

**Semáforo de inactividad** — la señal más importante:

| Días sin actividad | Indicador |
|---|---|
| > 3 días | 🔴 |
| > 1 día | 🟡 |
| ≤ 1 día | 🟢 |

Muestra: nombre, teléfono, tipificación (borde de color), inmueble, asesor asignado, canal, urgencia, y el semáforo.

**Se expande** (`toggleLeadExp`) revelando:
`💬 WhatsApp` · `📞 Llamar` · `✉️ email` · `🏠 Ver inmueble` · `⇄ Mover a…` · `📋 Ficha completa`

Dos contextos: **kanban** (draggable, compacta) y **inmueble** (borde izquierdo de color).

### 4.3 · Ficha del lead (modal)

Overlay oscuro con blur. Contiene:
- Nombre + chip de tipificación + chip de urgencia
- **🏠 Inmueble principal** con su negociación
- Aviso `🔑 Arriendo — Redirige a gestor` si aplica
- `📱 teléfono` con **💬 WhatsApp** y **📞 Llamar**
- Selector de tipificación
- **📅 Agendar visita** · **📝 Nueva nota** · **🗑️ Eliminar** (solo admin)
- **📅 Visitas** agendadas
- Historial de actividad

**Problema**: es un modal denso donde todo pesa igual. Debería usar el patrón de la ficha del inmueble — contenido + rail con lo crítico + acciones fijas abajo.

### 4.4 · Crear interesado

Dos entradas:
- **Desde un inmueble** — `abrirCrearInteresado(inmuebleId)`, el inmueble viene fijo
- **Libre** — `abrirCrearInteresadoLibre()`, hay que elegir inmueble

Obligatorios: **nombre** (3+) y **teléfono** (7+). Todo lo demás es opcional.

**Contexto de uso**: el asesor está hablando por teléfono con el cliente. El formulario tiene que llenarse sin fricción — nombre, teléfono, guardar. El resto se completa después.

### 4.5 · Agendar visita

Fecha + hora. Valida conflicto de horario en el mismo inmueble. Registra en historial y notifica.

### 4.6 · Nota rápida

Textarea con **autocompletado de menciones `@`** — usuarios e inmuebles quedan enlazados y notifican. El cache de menciones vive en `window._mentionCache`.

**Problema**: la función existe pero no se comunica. El usuario no sabe que puede escribir `@`.

### 4.7 · Badge en la ficha del inmueble

`badgeInteresadosInmueble(inmuebleId)` — contador de leads, precargado en batch para evitar N+1. Ya integrado en la ficha interna v2 y en las tarjetas del inventario.

---

## 5 · Mensajes de error a diseñar

El backend lanza estos códigos. La UI necesita un texto humano para cada uno:

| Código | Cuándo |
|---|---|
| `nombre_invalido` | menos de 3 caracteres |
| `telefono_invalido` | menos de 7 caracteres |
| `inmueble_requerido` | falta el inmueble |
| `requiere_visita_realizada` | intentó cerrar como ganado sin visita |
| `conflicto_horario` | ya hay visita a esa hora |
| `sin_permiso` | no es creador ni asignado |
| `solo_admin_elimina` | intentó eliminar sin ser admin |
| `solo_internos_pueden_notar` | usuario público intentó dejar nota |
| `fecha_hora_requeridas` | faltan datos de la visita |

---

## 6 · Flujos

### A · Registrar un lead que llegó por WhatsApp
```
Asesor recibe mensaje → busca el inmueble → Registrar interesado
  → nombre + teléfono → nace en "Nuevo", canal whatsapp
  → si es arriendo, se auto-asigna al gestor y se le notifica
  → el asesor responde por WhatsApp desde la ficha
  → lo mueve a "Contactado"
```

### B · Gestión diaria ← *el que peor funciona*
```
Abre #/interesados → ¿a quién contacto hoy?
  → no hay respuesta directa: filtra por urgencia
  → recorre tarjetas buscando semáforos rojos
  → abre cada una, llama, deja nota
```

### C · Del interés al cierre
```
Contactado → Agendar visita → Visita Agendada
  → se marca realizada → Visita Realizada
  → En Negociación
  → Cierre Ganado (bloqueado si no hay visita realizada)
  → estado pasa a "convertido"
  → dispara el cierre del inmueble con reparto de comisiones
```

---

## 7 · Los 5 problemas a resolver

1. **El asesor no sabe a quién llamar primero.** Ninguna vista responde eso. Una vista **"Mi día"** ordenada por semáforo y urgencia sería la respuesta.
2. **El kanban de 8 columnas no entra en pantalla.** Scroll horizontal, tarjetas angostas, texto cortado.
3. **La ficha es un modal plano** sin jerarquía.
4. **El drag & drop no funciona bien en móvil**, que es donde trabajan los asesores.
5. **Las reglas invisibles**: que cerrar como ganado exige visita realizada, que un lead de arriendo se va al gestor, que un lead privado no lo ve nadie más. Todo eso se descubre al chocar con el error.

---

## 8 · Componentes

1. **Tarjeta de lead** — kanban / lista / compacta / expandida, con semáforo
2. **Columna del kanban** — header con contador, zona de drop, vacío
3. **Semáforo de inactividad** — 🔴 >3d, 🟡 >1d, 🟢 ≤1d
4. **Chip de tipificación** — los 8, diferenciando activos de terminales
5. **Chip de urgencia** — 3 niveles
6. **Chip de canal** — 6 orígenes con SVG
7. **Indicador de lead privado**
8. **Selector de tipificación** — con el bloqueo de cierre ganado visible
9. **Timeline de actividad** — como conversación, no lista
10. **Formulario rápido** — nombre + teléfono + guardar
11. **Panel de visitas** con sus estados
12. **Barra de filtros** compacta
13. **Toggle de vistas** — pipeline / por inmueble / mi día
14. **Aviso de auto-asignación a gestor**

---

## 9 · Estados

- Sin leads (primer uso)
- Sin resultados con filtros
- Cargando
- Columna vacía
- Lead privado
- Lead con visita próxima
- Lead inactivo (3 niveles de semáforo)
- Lead convertido / perdido / descartado
- Intento de cierre bloqueado por falta de visita
- Conflicto de horario al agendar
- Error al mover (falla el drop)

---

## 10 · Constraints

- **Vanilla JavaScript** — sin React ni frameworks
- Componentes = funciones que devuelven **strings HTML**
- `onclick` inline y event delegation
- **Tokens v2** obligatorios · **Iconos de `icons.js`**
- Mobile-first
- Drag & drop HTML5 nativo (`draggable`, `ondragstart`, `ondrop`)

---

## 11 · Archivos

| Qué | Dónde |
|---|---|
| Lógica de negocio | `src/core/interesados.js` (736 líneas) |
| UI | `src/interesados-ui.js` (1.297 líneas) |
| Intereses del público | `src/domains/leads/index.js` |
| Badge en la ficha | `src/domains/inmuebles/detail-modal-v2.js` |
| Tokens · Iconos | `src/styles/tokens-v2.css` · `src/ui/icons.js` |

---

## 12 · Entregables

1. **Vista "Mi día"** — la propuesta central
2. **Pipeline** con las 8 tipificaciones resueltas — desktop y móvil
3. **Vista por inmueble**
4. **Tarjeta de lead** con todas sus variantes y el semáforo
5. **Ficha del lead** con patrón contenido + rail + acciones fijas
6. **Formulario rápido** de creación
7. **Timeline de actividad**
8. **Los 11 estados** del punto 9
9. **Validación multi-tenant** con 2 colores de marca

---

## 13 · Anti-goals

- ❌ No agregar dependencias JS
- ❌ No inventar paleta — usar `tokens-v2.css`
- ❌ No romper el drag & drop sin proponer alternativa táctil
- ❌ No asumir pantalla grande
- ❌ No agregar campos al modelo sin justificarlo
- ❌ No mezclar con cobranza ni liquidación — eso vive en PropietarioSoft
- ❌ No usar emojis donde ya hay iconos SVG

---

## 14 · La pregunta

> Un asesor abre el módulo un lunes a las 9am.
> **¿En cuántos segundos sabe a quién llamar primero?**

Hoy: no lo sabe. Tiene que filtrar y recorrer tarjetas buscando semáforos rojos.

---

**Fin del brief.**

Ante la duda, priorizá velocidad de gestión sobre completitud visual: esto se usa muchas veces por día.
