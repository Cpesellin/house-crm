# Brief de rediseño · Ficha interna del inmueble (modal `oM`)

> **Para**: Claude Design
> **Producto**: HOUSE CRM — vista interna del asesor
> **Alcance**: El modal de detalle que ven los EMPLEADOS (asesores, gestores, oficina, admin) al hacer click en "Ver detalle" desde el inventario. NO es la ficha pública del cliente (esa ya está rediseñada).
> **Prioridad**: ALTA. Es la pantalla más usada del CRM y hoy la experiencia es mala.
> **Formato de entrega**: mockups high-fidelity desktop + móvil, con los 4 modos de permiso, todos los estados, y el sistema de componentes que faltan.

---

## 1 · Por qué se rediseña

Este modal es donde el asesor **pasa el día**: consulta datos, edita precios, sube fotos, cambia estados, deja notas, revisa interesados. Hoy:

- **Es un scroll infinito sin jerarquía** — 8 secciones apiladas verticalmente sin navegación interna. Para cambiar un precio hay que hacer scroll pasando por todo.
- **Todo es editable al mismo tiempo** — 22 inputs abiertos simultáneamente. No hay modo lectura vs modo edición. El asesor no sabe si ya guardó.
- **El guardado es un solo botón al fondo** — hay un FAB flotante que hace scroll hasta él, síntoma de que el botón está demasiado lejos.
- **Densidad visual plana** — todos los campos se ven igual de importantes. El precio (dato crítico) tiene el mismo peso que "hall alcobas".
- **Sin feedback de estado** — no se ve qué cambió, qué falta, ni cuándo se guardó por última vez.
- **La galería es funcional pero pobre** — reordenar fotos con drag es poco descubrible.
- **Anotaciones enterradas al fondo** — es la función más usada para coordinación entre asesores y está al final del scroll.
- **En móvil es peor** — el modal ocupa toda la pantalla, el scroll es largísimo, y el FAB tapa contenido.

**Meta**: que un asesor pueda hacer las 5 tareas frecuentes en menos de 3 segundos cada una, sin scroll innecesario.

---

## 2 · Contexto de uso real

**Quién lo usa**: 47 usuarios internos hoy (asesores, gestores de arriendo, oficina, admin).

**Frecuencia**: es la pantalla más abierta del CRM. Un asesor la abre decenas de veces por día.

**Tareas frecuentes** (ordenadas por frecuencia real):
1. **Consultar** datos del inmueble para responder a un cliente por WhatsApp (lectura pura, sin editar)
2. **Ver/copiar el teléfono del propietario** para llamarlo
3. **Cambiar el estado** (Disponible → Verificar → Aún Disponible)
4. **Dejar una anotación** de seguimiento
5. **Actualizar el precio** tras hablar con el propietario
6. **Subir o reordenar fotos**
7. **Compartir con un cliente** (genera link público)
8. **Revisar los interesados** vinculados al inmueble

**Contexto físico**: mucho uso en la calle desde el celular, entre visitas. También en escritorio en la oficina.

---

## 3 · Los 4 modos de permiso (crítico para el diseño)

El mismo modal cambia radicalmente según quién lo abre. **Cada modo necesita su mockup.**

### Modo A · Captador dueño del inmueble (`esMio`)
- Ve y edita TODO
- Ve la dirección real y los datos del propietario
- Puede cambiar estado, subir fotos, editar precios

### Modo B · Admin u Oficina (`esP`)
- Todo lo del Modo A
- **Además**: bloque "Reasignar captador" (dropdown con todos los usuarios)
- **Además**: botón "Eliminar inmueble" (destructivo, va a papelera)

### Modo C · Gestor de arriendos (`esGestor`)
- Puede editar
- Ve datos del propietario **sólo si el inmueble es de arriendo**
- No ve el bloque de reasignar ni eliminar

### Modo D · Asesor sin permiso de edición (read-only)
- **Modo lectura pura** — sin ningún input
- NO ve: dirección real, datos del propietario, descripción privada, portales
- SÍ ve: precios, características públicas, descripción de equipo, nombre del captador
- Puede: leer anotaciones de visibilidad "equipo", compartir el inmueble

> Hoy los 4 modos usan el mismo layout con bloques que aparecen/desaparecen. El resultado es que el Modo D se ve como una versión "rota" del A. Necesita ser una pantalla propia y bien resuelta, no una mutilación.

---

## 4 · Inventario COMPLETO de lo que contiene el modal

### 4.1 · Cabecera (`#mtt`, `#msb3`)
- **Título**: `HOUSE-243 · Apartamento`
- **Subtítulo**: `📍 Pereira · [dirección real si tiene permiso, si no la pública]`
- Botón cerrar (✕) + handle de swipe en móvil (`.m-handle`, `.mhd2`)

### 4.2 · Galería (`#gal`)
- Foto principal grande, click abre en pestaña nueva
- Flechas prev/next si hay más de 1 foto
- Contador `1/14` (`#gal-ct`)
- Tira de thumbnails horizontal (`#gal-th`), la activa con clase `.act`
- Swipe táctil en móvil
- Fallback si no hay fotos: caja punteada con "Sin fotos disponibles"
- **Fallback de imagen rota**: `drFallback` reintenta con URL alternativa de Google Drive

### 4.3 · Bloque "🏠 Información" (editable)
| Campo | Control | ID |
|---|---|---|
| Tipo | select (10 opciones) | `me_tipo` |
| Negociación | select (Venta / Arriendo / Venta y Arriendo) | `me_neg` |
| **🔒 Dirección real** | input · nota "Solo tú y admin" | `me_dir` |
| **📍 Ubicación pública** | input · nota "Visible para todos" | `me_dir_pub` |
| Ciudad | input | `me_ciu` |
| Estrato | select (vacío, 1-6) | `me_est` |

> El par dirección-real / ubicación-pública es un concepto de privacidad importante que hoy se comunica sólo con texto chico. Merece tratamiento visual explícito.

### 4.4 · Bloque "💰 Precios" (editable)
| Campo | Control | ID |
|---|---|---|
| Venta | input number · highlight azul (`.hlb`) | `me_pv` |
| Arriendo/mes | input number · highlight verde (`.hlg`) | `me_pa` |

> **Comportamiento crítico**: al guardar, si el precio cambió se registra en `historial`, se notifica a TODO el equipo, y se avisa a los usuarios que tienen el inmueble en favoritos. Hoy nada de eso se anticipa en la UI — el asesor no sabe que cambiar un número dispara notificaciones masivas.

### 4.5 · Bloque "📐 Características" (editable)
| Campo | Control | ID |
|---|---|---|
| Habitaciones | number | `me_hab` |
| Baños | number | `me_ban` |
| Área construida m² | number | `me_area` |
| Área total m² | number | `me_areatot` |
| Parqueaderos | number | `me_parq` |
| Características | input texto libre ("piscina, gimnasio...") | `me_carac` |

> El campo "Características" es un string separado por comas que en la ficha pública se renderiza como chips. Debería editarse como chips, no como texto plano.

### 4.6 · Bloque "👤 Propietario" (editable, sensible)
- Banner verde "🔒 Solo tú y admin"
- Nombre (`me_prop`), Teléfono (`me_tel`), Email (`me_email`)

> **Es el bloque más consultado y peor resuelto**. El asesor necesita el teléfono para llamar YA. Hoy está en un input dentro de un scroll. Debería tener acción directa de llamar/WhatsApp y copiar.

### 4.7 · Bloque "🔄 Reasignar captador" (sólo admin/oficina)
- Muestra captador actual
- Select con todos los usuarios
- Botón "Reasignar" (`reasignarCap`)

### 4.8 · Bloque "📝 Descripciones" (3 textareas con visibilidad distinta)
| Textarea | Visibilidad | ID |
|---|---|---|
| 🔒 Privada | Solo el captador y admin | `me_desc_priv` |
| 👁️ Para cliente | Se publica en el link público | `me_desc_cli` |
| 👥 Para equipo | Todos los asesores internos | `me_obs` |

> Tres cajas iguales que se distinguen sólo por un header de color. Alta probabilidad de escribir en la equivocada — con consecuencias (publicar algo interno).

### 4.9 · Bloque "📷 Fotos" (editable)
- Contador en el título: `Fotos (14)`
- Grilla de miniaturas con número de orden
- **Drag & drop para reordenar** (desktop) + **long-press + arrastre** (móvil)
- Botón ✕ por foto (`delFoto`, con confirmación)
- Zona de upload (`initFotoUpload` → Cloudinary)
- Las fotos nuevas quedan pendientes (`_pendingFotos`) y se insertan al guardar

> El reordenamiento por drag es la funcionalidad menos descubrible del modal. La única pista es texto chico: "mantén presionado para reordenar".

### 4.10 · Bloque "🌐 Portales" (editable, sólo internos)
- Input URL Metrocuadrado (`me_m2`) + link "Abrir↗" si tiene valor
- Input URL Fincaraíz (`me_fr`) + link "Abrir↗"

### 4.11 · Bloque "⚙️ Estado" (editable)
- Select con los 5 estados: `Disponible`, `Aún Disponible`, `Arrendado`, `Vendido`, `Retirado`
- Botón "✓ Confirmar" (`confD`) — resetea el timer de antigüedad

> **Comportamiento crítico**: elegir `Arrendado` o `Vendido` NO cambia el estado directamente — abre el formulario de cierre con reparto de comisiones entre N participantes. Elegir `Retirado` pide confirmación y notifica al equipo. Nada de esto se anticipa visualmente.

### 4.12 · Botón "📤 Compartir con cliente"
- Genera el link público y abre el share sheet

### 4.13 · Bloque "📝 Anotaciones"
- Lista de notas con autor, fecha y badge de visibilidad (🔒 Privada / 👥 Equipo)
- Filtradas por permiso: privadas sólo las ve su autor, el captador y admin
- Textarea + select de visibilidad + botón "Agregar"
- **Efecto lateral**: agregar una nota resetea el timer de antigüedad del inmueble

### 4.14 · Bloque "👤 Interesados" (sólo internos)
- Título + botón "+ Nuevo" (`abrirCrearInteresado`)
- Carga async la lista de leads vinculados al inmueble
- Cada uno: nombre, teléfono, asesor asignado, chip de tipificación con color
- Máximo 8 visibles + link "ver todos"

### 4.15 · Botón "🗑️ Eliminar" (sólo admin)
- Envía a papelera con confirmación

### 4.16 · Guardado
- Botón "💾 Guardar cambios" al fondo (`#saveAnchor`)
- **FAB flotante** (`.fab-save`) que hace scroll hasta el botón
- Tracker `_modalDirty`: si hay cambios sin guardar y se cierra, aparece un diálogo custom "Cambios sin guardar — Descartar / Guardar"

---

## 5 · Problemas concretos a resolver

| # | Problema | Impacto |
|---|---|---|
| 1 | Scroll infinito sin navegación interna | El asesor pierde tiempo buscando el bloque que necesita |
| 2 | Todo editable siempre | No hay claridad de si está viendo o editando; riesgo de cambios accidentales |
| 3 | Teléfono del propietario dentro de un input | La acción más frecuente (llamar) requiere seleccionar y copiar |
| 4 | 3 descripciones visualmente idénticas | Riesgo real de publicar contenido interno |
| 5 | Cambiar precio dispara notificaciones sin avisar | El asesor no anticipa el efecto |
| 6 | Estado Arrendado/Vendido abre otro flujo sin avisar | Sorpresa: esperaba cambiar un campo, se abre un formulario de comisiones |
| 7 | Reordenar fotos poco descubrible | Las fotos quedan en mal orden, afectando la conversión pública |
| 8 | Anotaciones al fondo del scroll | La coordinación entre asesores se resiente |
| 9 | Guardado lejano + FAB parche | Fricción en la tarea más común |
| 10 | Modo lectura se ve como versión rota | Los asesores sin permiso tienen mala experiencia |
| 11 | Sin indicador de "guardado hace X" | Incertidumbre sobre si el cambio se aplicó |
| 12 | En móvil todo es peor | Es donde más se usa |

---

## 6 · Direcciones de diseño sugeridas (no prescriptivas)

Explorá estas ideas, descartá lo que no funcione:

### 6.1 · Separar lectura de edición
Vista por defecto en **modo lectura**, optimizada para consulta rápida: datos grandes y legibles, teléfono con botones de llamar/WhatsApp/copiar directos. Un botón "Editar" entra al modo formulario. Reduce riesgo y hace la consulta (tarea #1) instantánea.

### 6.2 · Navegación interna
Tabs o índice lateral sticky: `Resumen · Fotos · Propietario · Notas · Interesados · Publicación`. Que el asesor salte directo a lo que necesita.

### 6.3 · Zona de acciones rápidas fija
Barra siempre visible con las 4 acciones más frecuentes: **Llamar propietario · Cambiar estado · Nota rápida · Compartir**. Sin scroll.

### 6.4 · Jerarquía por importancia
El precio, el estado y el teléfono del propietario son los tres datos críticos. Que se vean como tales — no al mismo nivel que "hall alcobas".

### 6.5 · Anticipar consecuencias
- Al editar precio: nota inline "Se notificará al equipo y a los N clientes que lo tienen en favoritos"
- Al elegir Arrendado/Vendido: indicar que abrirá el registro de cierre con comisiones
- Al escribir en "Para cliente": recordar que es público

### 6.6 · Diferenciar las 3 descripciones
Colores, iconos y ubicaciones distintas. Quizá la pública dentro de la sección "Publicación" junto a los portales, y las internas juntas en otro lado.

### 6.7 · Guardado permanente y con feedback
Barra de guardado sticky que aparece sólo cuando hay cambios, mostrando cuántos campos se modificaron. Con timestamp de último guardado.

### 6.8 · Fotos como sección propia
Grilla grande con drag evidente (handle visible), botón de subir prominente, marca clara de cuál es la portada.

---

## 7 · Sistema de diseño a respetar

Ya existe implementado. **Usalo, no inventes uno nuevo.**

```css
/* Superficies */
--v2-cream: #faf6f1     --v2-paper: #ffffff
--v2-cream-2: #fdf8ef   --v2-cream-3: #f0e8d4

/* Texto (marrón cálido) */
--v2-ink: #2c2520    --v2-ink-2: #4a4540
--v2-ink-3: #6b6760  --v2-ink-4: #9b948a

/* Líneas */
--v2-line: #ece4d4  --v2-line-2: #f0e8d8  --v2-line-3: #e8e0d2

/* Marca — VIENE DEL TENANT, nunca hardcodear */
--v2-primary: var(--color-primario)
--v2-primary-soft / --v2-primary-hover / --v2-primary-tint

/* Semánticos */
--v2-green: #10b981  --v2-amber: #d97706  --v2-red: #dc2626
(cada uno con su variante -soft)

/* Radios */  6 / 10 / 14 / 16 / 999px
/* Sombras */ sm, md, lg, xl
```

**Tipografía**: Plus Jakarta Sans (UI) · Fraunces italic (display) · JetBrains Mono (códigos, labels)

**Iconos**: SVG stroke-based ya implementados en `src/ui/icons.js` — `home, search, pin, heart, camera, bed, bath, area, car, tag, chevronDown/Right/Left, close, share, phone, chat, money, grid, user, bell, plus, check, alert`. Pedí más si hacen falta.

**Componentes existentes**: `.v2-card`, `.v2-btn` (ghost/outline/solid), `.v2-pill`, `.v2-chip`, `.v2-badge`, `.v2-skeleton`

**Referencia visual**: la landing y la ficha pública ya rediseñadas. El modal interno debe sentirse de la misma familia, pero más denso — es una herramienta de trabajo, no una vitrina.

---

## 8 · Constraints técnicos

- **Vanilla JavaScript**, sin React/Vue/Tailwind. Los componentes son funciones que devuelven strings HTML.
- **Interactividad con `onclick` inline** + event delegation.
- El modal se renderiza completo en `#mbd` con `innerHTML`, sobre `#mdl`.
- **IDs de campo NO negociables** — `saveAll` mapea 22 IDs a columnas de la base. Si el diseño los mueve, hay que mantener los mismos IDs o entregar el mapeo nuevo explícito.
- Fotos vía Cloudinary con transformaciones (`f_auto,q_auto,w_600`).
- Debe funcionar sin librerías de animación.
- **Móvil primero**: swipe-down para cerrar ya existe.

---

## 9 · Estados a diseñar

| Estado | Cuándo |
|---|---|
| Carga | Mientras trae anotaciones e interesados (llegan async) |
| Sin fotos | Placeholder con CTA de subir |
| Sin anotaciones | Empty state con invitación a escribir la primera |
| Sin interesados | "Sin interesados aún. Creá el primero." |
| Cambios sin guardar | Indicador visible + diálogo al intentar cerrar |
| Guardando | Feedback en el botón |
| Guardado | Confirmación + timestamp |
| Error al guardar | Mensaje claro sin perder los datos escritos |
| Foto subiendo | Progreso en la grilla |
| Modo lectura | Sin ningún input, optimizado para consulta |

---

## 10 · Entregables esperados

1. **Modo lectura** (desktop + móvil) — la vista por defecto
2. **Modo edición** (desktop + móvil) — con navegación interna resuelta
3. **Los 4 modos de permiso** — al menos las diferencias marcadas sobre el layout base
4. **Sección de fotos** con reordenamiento evidente
5. **Bloque de propietario** con acciones directas
6. **Sistema de guardado** — barra sticky, estados, feedback
7. **Anotaciones e interesados** rediseñados
8. **Todos los estados** de la tabla anterior
9. **Componentes nuevos** que el diseño requiera, en HTML+CSS copy-pasteable (no React)

---

## 11 · Anti-goals

- ❌ No agregar dependencias JS
- ❌ No cambiar los IDs de los campos sin entregar el mapeo
- ❌ No hardcodear el azul — todo referenciado a `--v2-primary`
- ❌ No quitar funcionalidad: todo lo del inventario de la sección 4 debe seguir accesible
- ❌ No romper el swipe-down para cerrar en móvil
- ❌ No inventar un sistema de diseño nuevo — usar el que ya existe
- ❌ No asumir pantalla grande: mucho uso es en celular en la calle

---

## 12 · Preguntas abiertas para el diseñador

1. ¿Modo lectura por defecto con botón "Editar", o edición inline campo por campo (click en un valor lo convierte en input)?
2. ¿Tabs, acordeón o scroll con índice sticky para navegar las secciones?
3. ¿El bloque de interesados vive acá o merece su propia pantalla con link desde el modal?
4. ¿La galería en móvil debe ser fullscreen o mantenerse en el flujo?
5. ¿Guardado automático por campo (como Notion) o explícito? El automático elimina el problema del botón lejano pero necesita feedback muy claro.

---

## Apéndice · Ubicación en el código

```
src/domains/inmuebles/detail-modal.js   ← el modal (409 líneas)
src/functions.js:247                     ← saveAll (mapeo de 22 campos)
src/functions.js:288                     ← ldAn / addA (anotaciones)
src/functions.js:620+                    ← drag & drop de fotos
src/domains/inmuebles/lifecycle.js       ← chgE, confD, delFoto, reasignarCap
src/domains/cierres/index.js             ← abrirFormularioCierre
src/config/cloudinary.js:246             ← initFotoUpload
src/sections.js:25                       ← PCOLS (los 5 estados)
src/styles/tokens-v2.css                 ← sistema de diseño v2
src/ui/icons.js                          ← iconos SVG
```

**Estado del diseño v2**: activo detrás del flag `?v2=1`. La landing y la ficha pública ya están migradas. Este modal es el siguiente paso, y el de mayor impacto en la productividad diaria del equipo.

---

**Fin del brief.**

Ante la duda, priorizá: **velocidad de consulta > seguridad al editar > densidad de información > belleza**. Es una herramienta de trabajo que se usa decenas de veces al día.
