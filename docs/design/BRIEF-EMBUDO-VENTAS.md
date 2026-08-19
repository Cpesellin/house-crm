# Brief de rediseño · Embudo de ventas

> **Para**: Claude Design
> **Producto**: HOUSE CRM — SaaS inmobiliario multi-tenant
> **Alcance**: el sistema comercial completo — el embudo de **inmuebles** (`#/mis`), el embudo de **interesados** (`#/interesados`), y el dashboard que los mide
> **Audiencia**: asesores, gestores de arriendo, oficina y admin
> **Reemplaza a**: `BRIEF-INTERESADOS.md` (cubría solo la mitad)

---

## 0 · Lo que ya existe y hay que respetar

Este brief continúa `BRIEF-CLIENTE-FINAL.md` y `BRIEF-FICHA-INTERNA.md`. **El sistema de diseño v2 ya está implementado y en producción**:

- Tokens en `src/styles/tokens-v2.css` — paleta cream/paper/ink, `--v2-primary` viene del tenant
- Iconos SVG en `src/ui/icons.js`
- La ficha interna del inmueble usa el patrón **tabs + rail crítico + barra de guardado**

Usá esos tokens y esos iconos. Si falta un icono, pedilo en vez de meter un SVG suelto.

---

## 1 · La idea central: dos embudos que se cruzan

El CRM mueve **dos cosas en paralelo**, y hoy viven en pantallas separadas que no se hablan:

```
EMBUDO DE INMUEBLES  (#/mis · "Mi embudo")
  Qué mueve: propiedades captadas
  Pregunta:  ¿cuáles de mis inmuebles están frescos y cuáles se enfrían?

        Disponible → Aún Disponible → Arrendado / Vendido / Retirado

EMBUDO DE INTERESADOS  (#/interesados)
  Qué mueve: personas que preguntaron
  Pregunta:  ¿a quién tengo que llamar hoy?

        Nuevo → Contactado → Visita Agendada → Visita Realizada
              → En Negociación → Cierre Ganado / Perdido
```

**El cruce**: un inmueble del primer embudo acumula leads del segundo. Cuando un lead llega a "Cierre Ganado", el inmueble pasa a "Vendido" o "Arrendado" y se dispara el registro de cierre con reparto de comisiones.

**Este cruce hoy es invisible en la interfaz.** El asesor tiene que saltar entre pantallas para entender su situación comercial. Resolverlo es el objetivo principal del rediseño.

---

## 2 · Embudo de inmuebles (`#/mis`)

### 2.1 · Los 5 estados

| id | Label | Emoji | Umbral de alerta |
|---|---|---|---|
| `Disponible` | Disponible | ✅ | **15 días** sin confirmar |
| `Aún Disponible` | Aún Disponible | ✓ | **10 días** sin confirmar |
| `Arrendado` | Arrendado | 🔑 | 30 días |
| `Vendido` | Vendido | 💰 | 30 días |
| `Retirado` | Retirado | ⛔ | — |

Hay un sexto estado transitorio: **`Verificar Disponibilidad`**, que aparece cuando otro asesor pregunta si el inmueble sigue disponible. Se agrupa visualmente con `Disponible`.

Estados finales: `Arrendado`, `Vendido`, `Retirado` — salen del inventario público.

### 2.2 · El mecanismo de frescura

Cada inmueble lleva `_dias` = días desde la última confirmación. Si supera el umbral de su estado, **el inmueble está frío** y necesita verificación.

Esto es el corazón del embudo de inmuebles: un portafolio con inmuebles desactualizados hace perder credibilidad con los clientes.

**Hoy la alerta es sutil** — un badge de color en la tarjeta. Debería ser lo primero que ve el asesor.

### 2.3 · Navegación

Tabs por estado, con contador. El tab activo se guarda en `window._pipeTab`, default `Disponible`.

Los **gestores de arriendo** ven además una bolsa extra: los inmuebles de arriendo de *otros* asesores que están disponibles. Es su zona de trabajo.

### 2.4 · Acciones sobre la tarjeta

- **✅ Disponible** / **❌ No disponible** — respuesta rápida a una solicitud de verificación
- **🔄 Volver a validar** (`reVal`) — reinicia el contador de días
- **⇄ Mover a…** — selector con los otros estados (`quickMove`)
- **🔍** — solicitar verificación a otro asesor (`solicitarVerif`)
- Copiar código al portapapeles
- Abrir la ficha completa (`oM`)
- **Badge de interesados** — cuántos leads tiene ese inmueble (el cruce entre embudos)

Mover a `Arrendado` o `Vendido` **no cambia el estado directamente**: abre el formulario de cierre con reparto de comisiones.

### 2.5 · Solicitudes entre asesores

Un asesor puede preguntarle a otro si su inmueble sigue disponible. Genera:
- Una notificación al captador
- Un contador de solicitudes pendientes en la tarjeta
- Botones de respuesta rápida (sí / no)

### 2.6 · Filtros

- Búsqueda de texto ("Buscar en mi embudo…")
- Orden: por días ⏱️ / precio ↓ / precio ↑

---

## 3 · Embudo de interesados (`#/interesados`)

### 3.1 · Las 8 tipificaciones

| id | Label | Color v1 | Orden |
|---|---|---|---|
| `nuevo` | Nuevo | `#3B82F6` azul | 1 |
| `contactado` | Contactado | `#EAB308` amarillo | 2 |
| `visita_agendada` | Visita Agendada | `#F97316` naranja | 3 |
| `visita_realizada` | Visita Realizada | `#8B5CF6` violeta | 4 |
| `negociacion` | En Negociación | `#EF4444` rojo | 5 |
| `cierre_ganado` | Cierre Ganado | `#22C55E` verde | 6 |
| `cierre_perdido` | Cierre Perdido | `#6B7280` gris | 7 |
| `en_seguimiento` | En Seguimiento | `#9CA3AF` gris claro | 8 |

Los estados **1-5 son el flujo activo**; **6-8 son terminales o pausados**. Hoy pesan lo mismo visualmente — el diseño debería diferenciarlos.

Los colores son del sistema v1. Reinterpretarlos en la paleta v2 manteniendo la progresión: frío al entrar → cálido al negociar → verde al ganar.

### 3.2 · El lead

```typescript
{
  id, nombre_completo, telefono, email,
  inmueble_id,                    // por qué inmueble preguntó
  modalidad: 'compra' | 'arriendo',
  tipificacion,                   // su estado en el embudo
  urgencia: 'inmediata' | '1-3_meses' | '6+_meses',
  canal_origen,                   // whatsapp | web | referido | llameya | publico | otro
  asesor_creador_id,
  asesor_asignado_id,             // puede diferir del creador
  privado: boolean,               // sólo lo ve el creador
  fecha_ultima_actividad
}
```

### 3.3 · Canales de origen

`whatsapp` 💬 · `web` 🌐 · `referido` 🤝 · `llameya` 📞 · `publico` 👤 · `otro` ❓
Los emojis deberían pasar a SVG del sistema.

### 3.4 · Historial

Bitácora por lead con 4 tipos de actividad: `creacion`, `cambio_tipificacion`, `nota`, `visita_agendada`. Cada entrada guarda quién y cuándo.

Hoy se muestra como lista plana. **Debería leerse como una conversación** — timeline con avatar y agrupación por día.

### 3.5 · Vistas actuales

**Pipeline (kanban)** — 8 columnas con scroll horizontal, drag & drop entre ellas.
**Por inmueble** — acordeón que agrupa los leads de cada propiedad.

### 3.6 · Filtros

Búsqueda (nombre, teléfono, código, barrio) · Urgencia · Canal · Asesor (solo admin/oficina) · Limpiar.

### 3.7 · Acciones

Desde la tarjeta: arrastrar entre columnas.
Desde la ficha: WhatsApp · Llamar · cambiar tipificación · agendar visita · nueva nota (con menciones `@`) · eliminar.

---

## 4 · El dashboard que los mide

En `#/dash` ya existen dos visualizaciones:

- **EMBUDO GLOBAL** — barras con la distribución de todos los inmuebles por estado y su porcentaje
- **MI EMBUDO** — lo mismo, filtrado al asesor

**Qué falta**: el embudo de *conversión* — cuántos leads entran, cuántos llegan a visita, cuántos cierran. Hoy sólo se mide el inventario, no la gestión comercial.

---

## 5 · Permisos

| Rol | Embudo de inmuebles | Embudo de interesados |
|---|---|---|
| **admin** | Todos | Todos, incluidos privados |
| **oficina** | Todos | Todos los no privados |
| **gestor de arriendos** | Los suyos + arriendos de otros | Todos los no privados |
| **asesor** | Solo los suyos | Los que creó + los asignados |

**Lead privado**: sólo su creador (y admin). Protege contactos sensibles. Los leads que crea un admin nacen privados.

**Auto-asignación**: si el inmueble es de arriendo, el lead se asigna al gestor de arriendos y se notifica a los demás gestores por si el principal no responde.

---

## 6 · Los 4 problemas a resolver

### 6.1 · El asesor no sabe qué hacer primero

Abre el CRM un lunes a las 9am y tiene que buscar manualmente:
- ¿Qué inmuebles se enfriaron?
- ¿Qué leads llevan días sin contacto?
- ¿Qué visitas tiene hoy?

**Ninguna pantalla responde esto.** La propuesta más fuerte del rediseño sería una vista **"Mi día"** que cruce ambos embudos y ordene por urgencia real.

### 6.2 · Los dos embudos no se hablan

Un inmueble con 11 interesados y uno con 0 se ven igual en `#/mis`. Un lead no muestra si su inmueble está por enfriarse.

### 6.3 · El kanban de 8 columnas no entra en pantalla

Scroll horizontal, tarjetas angostas, información cortada. En móvil el drag & drop es incómodo.

### 6.4 · La frescura del inventario no se comunica

El umbral de días es el mecanismo más importante del embudo de inmuebles y hoy es un badge discreto.

---

## 7 · Flujos clave

### A · Llega un lead por WhatsApp
```
Asesor recibe mensaje → busca el inmueble → "Registrar interesado"
  → nombre y teléfono → nace en "Nuevo"
  → responde por WhatsApp desde la ficha → lo pasa a "Contactado"
```

### B · Gestión diaria ← *el que peor funciona*
```
Abre #/interesados → ¿a quién contacto? → filtra por urgencia
  → recorre tarjetas buscando las que llevan días quietas
  → abre cada una, llama, deja nota
```

### C · Del interés al cierre
```
Contactado → Agendar visita → Visita Agendada → Visita Realizada
  → En Negociación → Cierre Ganado
  → dispara el formulario de cierre con reparto de comisiones
  → el inmueble pasa a Vendido/Arrendado y sale del inventario público
```

### D · Mantener el inventario fresco
```
Inmueble supera su umbral de días → aparece la alerta
  → el asesor confirma con el propietario
  → "Volver a validar" reinicia el contador
  → o lo mueve a Retirado
```

---

## 8 · Componentes a diseñar

**Compartidos**
1. Tarjeta de inmueble en pipeline — con estado de frescura y contador de leads
2. Tarjeta de lead — variantes kanban / lista / compacta, con alerta de inactividad
3. Columna de embudo — header con contador, zona de drop, estado vacío
4. Barra de filtros compacta
5. Toggle de vistas

**Del embudo de inmuebles**
6. Indicador de frescura — días transcurridos vs umbral
7. Selector "mover a" con los estados disponibles
8. Panel de solicitudes de verificación

**Del embudo de interesados**
9. Selector de tipificación — cambiar estado sin abrir formulario
10. Chip de urgencia y chip de canal
11. Timeline de actividad como conversación
12. Formulario rápido de lead — para llenar mientras se habla por teléfono

**Del cruce**
13. **Vista "Mi día"** — lo pendiente de ambos embudos, priorizado
14. Widget de conversión para el dashboard

---

## 9 · Estados a cubrir

- Embudo vacío (primer uso)
- Columna sin items
- Sin resultados con filtros
- Cargando
- Inmueble frío (superó el umbral)
- Inmueble con solicitud de verificación pendiente
- Lead sin inmueble asociado
- Lead privado
- Lead sin actividad hace X días
- Visita agendada próxima
- Error al mover (falla el drag & drop)

---

## 10 · Constraints técnicos

- **Vanilla JavaScript** — sin React ni frameworks
- Componentes = funciones que devuelven **strings HTML**
- Interactividad con `onclick` inline y event delegation
- **Tokens v2 obligatorios** (`--v2-*`)
- **Iconos de `src/ui/icons.js`**
- Mobile-first: los asesores gestionan desde la calle
- El drag & drop usa HTML5 nativo (`draggable`, `ondragstart`, `ondrop`)

---

## 11 · Archivos del repo

| Qué | Dónde |
|---|---|
| Embudo de inmuebles (`rPipe`) | `src/sections.js` (~línea 69) |
| Estados y umbrales (`PCOLS`, `UMBRAL`) | `src/sections.js` (~línea 25) |
| Acciones del pipeline | `src/domains/inmuebles/lifecycle.js` |
| Lógica de leads | `src/core/interesados.js` |
| UI de leads | `src/interesados-ui.js` |
| Cierre con comisiones | `src/domains/cierres/index.js` |
| Dashboard | `src/sections.js` (~línea 499) |
| Tokens · Iconos | `src/styles/tokens-v2.css` · `src/ui/icons.js` |

---

## 12 · Entregables esperados

1. **Vista "Mi día"** — la propuesta central, cruzando ambos embudos
2. **Embudo de inmuebles** — desktop y móvil, con la frescura resuelta
3. **Embudo de interesados** — kanban y por inmueble, desktop y móvil
4. **Las dos tarjetas** con todas sus variantes y estados
5. **Ficha del lead** con el patrón contenido + rail + acciones fijas
6. **Formulario rápido** de lead
7. **Timeline de actividad**
8. **Widget de conversión** para el dashboard
9. **Los 11 estados** del punto 9
10. **Validación multi-tenant** — las pantallas principales con 2 colores de marca

---

## 13 · Anti-goals

- ❌ No agregar dependencias JS
- ❌ No inventar paleta — usar `tokens-v2.css`
- ❌ No romper el drag & drop nativo sin proponer alternativa táctil
- ❌ No asumir pantalla grande
- ❌ No agregar campos al modelo sin justificarlo
- ❌ No mezclar con cobranza ni liquidación — eso vive en otro producto (PropietarioSoft), no en este CRM
- ❌ No usar emojis donde el sistema ya tiene iconos SVG

---

## 14 · La pregunta que debe responder el diseño

> Un asesor abre el CRM un lunes a las 9am.
> **¿En cuántos segundos sabe qué inmueble verificar y a qué persona llamar?**

Hoy la respuesta es "no lo sabe, tiene que buscar en dos pantallas distintas".

---

**Fin del brief.**

Ante la duda, priorizá la velocidad de gestión sobre la completitud visual: esto se usa muchas veces por día, no se contempla.
