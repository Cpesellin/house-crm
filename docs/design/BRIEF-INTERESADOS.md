# Brief de rediseño · Módulo de Interesados (CRM de leads)

> **Para**: Claude Design
> **Producto**: HOUSE CRM — SaaS inmobiliario multi-tenant
> **Alcance**: el módulo de Interesados completo — pipeline, ficha del lead, creación, agendamiento y notas
> **Audiencia**: asesores, gestores de arriendo, oficina y admin (NO el cliente final)
> **Ruta**: `#/interesados` + modales invocables desde la ficha del inmueble

---

## 0 · Lo que ya existe y hay que respetar

Este brief continúa el trabajo de `BRIEF-CLIENTE-FINAL.md` y `BRIEF-FICHA-INTERNA.md`. **El sistema de diseño v2 ya está implementado y en producción**:

- Tokens en `src/styles/tokens-v2.css` (paleta cream/paper/ink, `--v2-primary` del tenant)
- Iconografía en `src/ui/icons.js` (SVG stroke-based, ~24 iconos)
- La ficha interna del inmueble ya usa el patrón de **6 tabs + rail crítico + barra de guardado**

**Usá esos tokens y esos iconos.** No inventes una paleta nueva. Si falta un icono, decilo y lo agrego a `icons.js` en vez de meter un SVG suelto.

---

## 1 · Qué es este módulo y por qué importa

Un **interesado** (lead) es una persona que preguntó por un inmueble. Puede llegar por WhatsApp, por el portal público, por un referido o por teléfono.

El módulo es donde el asesor:
1. **Registra** al interesado apenas lo contacta
2. Lo **mueve por el pipeline** a medida que avanza la gestión
3. **Agenda visitas** al inmueble
4. **Deja notas** de cada conversación
5. **Cierra** el negocio (ganado o perdido)

Es la herramienta de trabajo diaria del asesor. Si es lenta o confusa, los leads se enfrían y se pierden ventas.

**Volumen real hoy**: decenas de leads activos por asesor. Un inmueble popular puede acumular 11+ interesados.

---

## 2 · Estado actual y por qué se rediseña

El módulo funciona pero tiene problemas de experiencia:

- **El kanban se rompe con muchos leads** — 8 columnas en scroll horizontal, las tarjetas quedan angostas y la información se corta
- **La ficha del lead es un modal denso** — todo apilado sin jerarquía, hay que scrollear para llegar a las acciones
- **No se ve el "qué sigue"** — el asesor no sabe de un vistazo a quién tiene que llamar hoy
- **Los estados se parecen entre sí** — 8 tipificaciones con colores que no comunican urgencia
- **Sin vista de agenda** — las visitas agendadas viven dentro de cada lead, no hay un calendario
- **La vista "por inmueble" es un acordeón plano** — no aprovecha el espacio

**Meta del rediseño**:
1. Que el asesor abra el módulo y sepa **a quién contactar ahora**
2. Que mover un lead de estado sea **una acción, no un formulario**
3. Que la ficha del lead muestre **el historial como una conversación**, no como una lista
4. Que funcione bien **en el celular** — los asesores gestionan desde la calle

---

## 3 · Modelo de datos

### Lead (`interesados`)

```typescript
{
  id: uuid,
  nombre_completo: string,      // obligatorio
  telefono: string,             // obligatorio, es el identificador real
  email: string | null,
  inmueble_id: uuid | null,     // el inmueble por el que preguntó
  modalidad: 'compra' | 'arriendo' | null,
  tipificacion: enum,           // el estado en el pipeline (ver 3.1)
  urgencia: 'inmediata' | '1-3_meses' | '6+_meses' | null,
  canal_origen: enum,           // whatsapp | web | referido | llameya | publico | otro
  asesor_creador_id: uuid,      // quién lo registró
  asesor_asignado_id: uuid,     // quién lo gestiona (puede diferir)
  privado: boolean,             // si true, sólo lo ve el creador
  fecha_ultima_actividad: timestamp,
  created_at: timestamp
}
```

### 3.1 · Tipificaciones (los 8 estados del pipeline)

| id | Label | Color | Orden |
|---|---|---|---|
| `nuevo` | Nuevo | `#3B82F6` azul | 1 |
| `contactado` | Contactado | `#EAB308` amarillo | 2 |
| `visita_agendada` | Visita Agendada | `#F97316` naranja | 3 |
| `visita_realizada` | Visita Realizada | `#8B5CF6` violeta | 4 |
| `negociacion` | En Negociación | `#EF4444` rojo | 5 |
| `cierre_ganado` | Cierre Ganado | `#22C55E` verde | 6 |
| `cierre_perdido` | Cierre Perdido | `#6B7280` gris | 7 |
| `en_seguimiento` | En Seguimiento | `#9CA3AF` gris claro | 8 |

**Nota de diseño**: hoy los 8 estados pesan lo mismo visualmente. Los estados 1-5 son el flujo activo; 6-8 son terminales o pausados. El diseño debería reflejar esa diferencia — quizás los terminales colapsados o en una zona aparte.

**Los colores actuales son del sistema v1** (azules fríos). Habría que reinterpretarlos en la paleta v2 manteniendo la progresión semántica: frío al entrar → cálido al negociar → verde al ganar.

### 3.2 · Canales de origen

| id | Label | Emoji actual |
|---|---|---|
| `whatsapp` | WhatsApp | 💬 |
| `web` | Web | 🌐 |
| `referido` | Referido | 🤝 |
| `llameya` | LlameYa | 📞 |
| `publico` | Público | 👤 |
| `otro` | Otro | ❓ |

Los emojis deberían pasar a SVG del sistema.

### 3.3 · Historial (`interesados_historial`)

Cada lead tiene una bitácora. Tipos de actividad:

- `creacion` — al registrarlo
- `cambio_tipificacion` — cada movimiento en el pipeline
- `nota` — texto libre del asesor
- `visita_agendada` — cuando se programa una visita

Cada entrada tiene: `asesor_id`, `tipo_actividad`, `descripcion`, `created_at`.

**Oportunidad de diseño**: hoy se muestra como lista plana. Podría ser un timeline tipo conversación, con el avatar del asesor y agrupación por día.

### 3.4 · Visitas (`visitas_agendadas`)

Vinculadas al lead y al inmueble. Tienen fecha/hora, asesor y estado (agendada / realizada).

---

## 4 · Permisos — quién ve qué

| Rol | Alcance |
|---|---|
| **admin** | Todos los leads, incluidos los privados |
| **oficina** | Todos los NO privados |
| **gestor de arriendos** | Todos los NO privados (foco en arriendos) |
| **asesor** | Los que creó + los que tiene asignados |

**Lead privado**: sólo lo ve su creador (y admin). Sirve para proteger contactos comerciales sensibles. Por defecto, los leads que crea un admin nacen privados.

**Auto-asignación**: si el inmueble es de **arriendo**, el lead se asigna automáticamente al gestor de arriendos, y se notifica también a los demás gestores por si el principal no responde.

---

## 5 · Pantallas a rediseñar

### 5.1 · Vista principal `#/interesados`

Hoy tiene dos modos que se alternan con un toggle:

**Modo Pipeline (kanban)**
- 8 columnas horizontales con scroll
- Drag & drop entre columnas para cambiar la tipificación
- Contador de leads por columna
- Las columnas 6-8 se muestran "más compactas al final"

**Modo Por Inmueble**
- Acordeón: cada inmueble con sus leads adentro
- Se expande/colapsa por inmueble

**Header con filtros**:
- Búsqueda por nombre, teléfono, código de inmueble o barrio
- Urgencia (inmediata / 1-3 meses / 6+ meses)
- Canal de origen
- Asesor (sólo admin/oficina)
- Botón limpiar filtros

**Qué resolver**:
- El kanban de 8 columnas no entra en pantalla — ¿colapsar terminales? ¿scroll con snap? ¿vista compacta?
- En móvil el drag & drop es incómodo — ¿alternativa táctil?
- Falta un tercer modo: **"Mi día"** — a quién contactar hoy, ordenado por urgencia y tiempo sin actividad
- Los filtros ocupan mucho espacio vertical antes de llegar a los leads

### 5.2 · Tarjeta del lead

Aparece en el kanban y en la vista por inmueble. Muestra hoy:
- Nombre
- Teléfono
- Tipificación (borde de color)
- Inmueble asociado
- Asesor asignado
- Urgencia

Tiene dos contextos: `kanban` (draggable, compacta) e `inmueble` (con borde izquierdo de color).

**Qué resolver**:
- Falta **"hace cuánto sin actividad"** — es la señal más importante para priorizar
- Las acciones rápidas (WhatsApp, llamar) requieren abrir la ficha
- No se distingue un lead caliente de uno frío

### 5.3 · Ficha del lead (modal)

Contiene:
- Nombre + tipificación + urgencia
- Inmueble principal con su negociación
- Aviso si es arriendo → "Redirige a gestor"
- Teléfono con botones **WhatsApp** y **Llamar**
- Selector de tipificación (cambiar estado)
- **Agendar visita**
- **Nueva nota**
- **Eliminar**
- Sección de visitas agendadas
- Historial de actividad

**Qué resolver**:
- Es un modal denso sin jerarquía — todo pesa igual
- El historial debería leerse como una conversación
- Las acciones principales (WhatsApp, agendar, nota) deberían estar siempre accesibles, no perdidas en el scroll
- Considerar el mismo patrón que la ficha interna del inmueble: **contenido + rail crítico + acciones fijas**

### 5.4 · Crear interesado

Dos variantes:
- **Desde un inmueble** (`abrirCrearInteresado(inmuebleId)`) — el inmueble viene pre-cargado
- **Libre** (`abrirCrearInteresadoLibre()`) — sin inmueble, se elige después

Campos: nombre, teléfono, email, inmueble, modalidad, urgencia, canal de origen, nota inicial, privado (checkbox).

**Qué resolver**:
- El asesor suele estar en el teléfono con el cliente — el formulario debe llenarse rápido
- ¿Qué campos son realmente obligatorios? Hoy: nombre y teléfono
- El resto podría completarse después, sin bloquear el registro

### 5.5 · Agendar visita

Modal con fecha, hora y confirmación. Se registra en el historial y notifica.

**Qué resolver**: hoy es un formulario básico. Podría mostrar disponibilidad, o al menos sugerir horarios.

### 5.6 · Nota rápida

Textarea con **autocompletado de menciones `@`** — permite mencionar usuarios e inmuebles, que quedan enlazados y notifican.

**Qué resolver**: el autocompletado existe pero no se comunica visualmente. El usuario no sabe que puede escribir `@`.

### 5.7 · Badge de interesados en la ficha del inmueble

`badgeInteresadosInmueble(inmuebleId)` muestra el contador de leads de ese inmueble. Se precargan en batch para evitar N+1.

Ya existe integrado en la ficha interna v2 (tab Interesados) y en las tarjetas del inventario.

---

## 6 · Flujos clave

### Flujo A · Llega un lead por WhatsApp
```
Asesor recibe mensaje → abre el CRM → busca el inmueble
  → "Registrar interesado" → llena nombre y teléfono
  → el lead nace en "Nuevo"
  → responde por WhatsApp desde la ficha
  → lo mueve a "Contactado"
```

### Flujo B · Gestión diaria
```
Asesor abre #/interesados
  → ¿a quién contacto hoy? (hoy no hay respuesta clara)
  → filtra por urgencia inmediata
  → recorre las tarjetas buscando las que llevan días sin actividad
  → abre cada una, llama, deja nota
```
**Este flujo es el que peor funciona hoy.** Es el que debería resolver la vista "Mi día".

### Flujo C · Agendar y cerrar
```
Lead en "Contactado" → Agendar visita → pasa a "Visita Agendada"
  → tras la visita, "Visita Realizada"
  → si hay oferta, "En Negociación"
  → cierre: Ganado (dispara el registro de cierre con comisiones)
            o Perdido (con motivo)
```

---

## 7 · Componentes a diseñar

1. **Tarjeta de lead** — variantes: kanban, lista, compacta, con alerta de inactividad
2. **Columna de pipeline** — header con contador, zona de drop, estado vacío
3. **Selector de tipificación** — cambiar estado sin abrir un formulario
4. **Timeline de actividad** — la bitácora como conversación
5. **Chip de urgencia** — inmediata / 1-3 meses / 6+ meses
6. **Chip de canal** — con icono SVG
7. **Barra de filtros** — compacta, que no empuje el contenido
8. **Toggle de vistas** — pipeline / por inmueble / mi día
9. **Formulario rápido de lead** — optimizado para llenar mientras se habla por teléfono
10. **Panel de visitas** — las agendadas del lead

---

## 8 · Estados a cubrir

- Sin leads (primer uso)
- Sin resultados con los filtros aplicados
- Cargando
- Columna del kanban vacía
- Lead sin inmueble asociado
- Lead privado (indicador)
- Lead con visita agendada próxima
- Lead sin actividad hace X días (alerta)
- Error al mover un lead (falla el drag & drop)

---

## 9 · Constraints técnicos

Los mismos del brief anterior:

- **Vanilla JavaScript**, sin React ni frameworks
- Componentes = funciones que devuelven **strings HTML**
- Interactividad con `onclick` inline y event delegation
- **Tokens v2 obligatorios** (`--v2-*` de `tokens-v2.css`)
- **Iconos de `src/ui/icons.js`** — si falta alguno, pedilo
- Mobile-first: los asesores gestionan desde el celular
- El drag & drop actual usa HTML5 nativo (`draggable`, `ondragstart`, `ondrop`)

---

## 10 · Archivos del repo

| Qué | Dónde |
|---|---|
| Lógica de negocio | `src/core/interesados.js` (736 líneas) |
| UI del módulo | `src/interesados-ui.js` (1297 líneas) |
| Intereses del público | `src/domains/leads/index.js` |
| Integración en la ficha | `src/domains/inmuebles/detail-modal-v2.js` (tab Interesados) |
| Tokens | `src/styles/tokens-v2.css` |
| Iconos | `src/ui/icons.js` |

---

## 11 · Entregables esperados

1. **Vista principal** en sus 3 modos (pipeline, por inmueble, mi día) — desktop y móvil
2. **Tarjeta de lead** con todas sus variantes y estados
3. **Ficha del lead** con el patrón contenido + rail + acciones fijas
4. **Formulario de creación** rápido
5. **Timeline de actividad**
6. **Los 9 estados** del punto 8
7. **Validación multi-tenant** — las pantallas principales con 2 colores de marca distintos

---

## 12 · Anti-goals

- ❌ No agregar dependencias JS
- ❌ No inventar paleta nueva — usar `tokens-v2.css`
- ❌ No romper el drag & drop nativo sin proponer alternativa
- ❌ No asumir pantalla grande — el asesor trabaja desde el celular
- ❌ No agregar campos al modelo de datos sin justificarlo
- ❌ No usar emojis donde el sistema ya tiene iconos SVG

---

## 13 · La pregunta que debe responder el diseño

> Un asesor abre el módulo un lunes a las 9am. **¿En cuántos segundos sabe a quién llamar primero?**

Hoy la respuesta es "no lo sabe, tiene que buscar". Ese es el problema a resolver.

---

**Fin del brief.**

Ante la duda, priorizá la velocidad de gestión sobre la completitud visual: este módulo se usa muchas veces por día, no se contempla.
