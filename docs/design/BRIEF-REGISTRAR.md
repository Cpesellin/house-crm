# Brief de diseño — Módulo REGISTRAR (alta de inmueble)

> **Para:** Claude Design
> **Producto:** HOUSE CRM — Inmobiliaria House, Pereira (Eje Cafetero, Colombia)
> **Estado:** módulo funcional y en producción diaria. **No** se rediseña la
> lógica: se rediseña la experiencia. Todo lo que aquí se describe existe y
> funciona hoy.
> **Fecha:** 2026-08-27

---

## 0. Resumen en una frase

Un asesor inmobiliario, **de pie frente a un inmueble, con el teléfono en
una mano**, tiene que dejar registrada una propiedad completa —datos,
propietario, características, fotos— antes de irse. Este formulario es el
punto de entrada de todo el inventario: si algo no se captura aquí, no
existe en el resto del sistema.

---

## 1. Quién lo usa y en qué condiciones

| | |
|---|---|
| **Perfil** | Asesor inmobiliario (capta el inmueble). También admin/oficina. |
| **Dispositivo real** | Teléfono, mayoritariamente Android, navegador Brave/Chrome. |
| **Contexto físico** | En el inmueble o recién salido de él. De pie, a veces en el carro. Una mano. Sol directo sobre la pantalla. |
| **Conectividad** | 4G variable. Las fotos se suben mientras el asesor sigue llenando campos. |
| **Presión** | El propietario está esperando. La sesión típica dura entre 3 y 8 minutos. |
| **Frecuencia** | Varias veces por semana por asesor. Es una tarea **repetida**, no excepcional: el diseño debe premiar la velocidad del que ya sabe, no sólo guiar al novato. |

**Consecuencia de diseño:** cada toque cuenta y cada campo que se puede
inferir o recordar no debería preguntarse dos veces. Ya hay memoria de
`ciudad` y `tipo` entre registros (ver §6).

---

## 2. Estructura actual: 6 pasos

Rótulo visible: `Paso {n}/6 · {etiqueta}`, con una fila de puntos de
progreso (`.pd`, con estados `act` = actual, `dn` = completado).

| # | Etiqueta | Contenido |
|---|---|---|
| 1 | **Lo esencial** | Código asignado, tipo, negociación, precios, dirección, ciudad, barrio |
| 2 | **Propietario** | Nombre, teléfono, email |
| 3 | **Características** | Áreas, estrato, habitaciones, baños, parqueaderos, características internas |
| 4 | **Amenidades** | Amenidades del conjunto + descripción pública |
| 5 | **Fotos** | Subida de imágenes y video, portada |
| 6 | **Revisar** | Resumen antes de publicar |

Navegación: botón **`← `** (atrás, oculto en el paso 1) y **`Continuar →`**,
que en el último paso pasa a **`✓ Publicar`**.

---

## 3. Paso a paso, campo por campo

### Paso 1 — Lo esencial

**a) Tarjeta de código.** Lo primero que ve. Muestra el próximo código
disponible (`HOUSE-252`) en monoespaciada grande, con botón de copiar al
portapapeles. Es el identificador con el que el equipo hablará del inmueble
para siempre.

**b) Tipo** *(obligatorio)* — 10 opciones como botones con icono:
Casa 🏠 · Apartamento 🏢 · Apartaestudio 🏬 · Finca 🌾 · Local comercial 🏪 ·
Oficina 💼 · Lote 🌳 · Casa campestre 🌿 · Bodega 🏭 · Penthouse 👑

**c) Negociación** *(obligatorio)* — tres estados excluyentes:
`VENTA` (por defecto) · `ARRIENDO` · `AMBAS`

**d) Precios** — condicionados por la negociación: venta, arriendo/mes, o
ambos. Entrada numérica con formato de miles al escribir (clase
`.precio-input`, helper `fmtPrice`).

**e) Dirección** *(obligatorio)* — dirección real, interna. **No** es la que
ve el cliente: existe un campo separado `direccion_publica`.

**f) Ciudad** *(obligatorio)* y **g) Barrio**.

### Paso 2 — Propietario

- **Nombre** *(obligatorio)*
- **Teléfono** *(obligatorio)* — es la vía real de contacto
- **Email** (opcional)

> Son datos personales de un tercero que no está usando la app. Merecen
> un tratamiento visual que lo reconozca.

### Paso 3 — Características

- **Área construida m²** (por defecto **120**)
- **Área total m²**
- **Estrato** (0–6; por defecto 0 = sin definir)
- **Habitaciones** (por defecto **3**), **Baños** (**2**), **Parqueaderos** (**1**)
  → controles de tipo *stepper* (−/+), no teclado numérico
- **Características internas** — chips múltiples (`.ch` / `.cps`):
  🍳 Cocina · 🏞️ Balcón · 🌳 Patio · 📚 Estudio · 👕 Ropas · 📐 Doble altura

### Paso 4 — Amenidades

**Principales** — rejilla de 4 columnas, botones con icono grande (`.amb`/`.amg`/`.ami`):
🚗 Parqueo · 🛗 Ascensor · 🏊 Piscina · 🏋️ Gimnasio · 🌿 Zonas V. ·
🛡️ Seguridad · 🎉 Salón · ☀️ Terraza

**Extra** — chips: 🎾 Tenis · ⚽ Fútbol · 🧖 Sauna · 🎠 Juegos · 🔥 BBQ ·
💻 Cowork · 🐕 Pet · 📦 Útil · 🧺 Lavand. · 🗄️ Depósito

**Descripción del inmueble** — textarea con distintivo **«👁️ Visible para
clientes»**. Es el único texto libre que llega al portal público, y por eso
pasa por moderación automática de datos personales (§7).

### Paso 5 — Fotos

- Zona de toque grande (`.foto-up`): *"Toca para agregar fotos o videos"*
- Formatos: JPG, PNG, MP4. **Máx. 10 MB** por imagen, **50 MB** por video
- **Hasta 30 archivos**; contador «Quedan N de 30»
- Miniaturas con botón de borrado (`.foto-prev-item` / `.foto-del`)
- **La primera es la portada** — lleva distintivo `.foto-portada`, porque es
  la que aparece al compartir el inmueble por WhatsApp
- Aviso de estado: verde *«✓ N archivos listos»* / ámbar *«Puedes continuar
  sin fotos, pero el inmueble no se podrá mostrar en el portafolio»*
- Subida a Cloudinary con barra de progreso; **es asíncrona**: el asesor
  puede seguir a otros pasos mientras suben

### Paso 6 — Revisar

Tarjeta-resumen con: emoji del tipo, código asignado, tipo, dirección y
ciudad, precios, negociación, y chips de habitaciones/baños/área. Al pie,
propietario y teléfono. Luego **`✓ Publicar`**.

---

## 4. Lo que pasa al publicar

1. Se guarda `ciudad` y `tipo` en memoria local para el próximo registro
2. Se pide un código libre; **si colisiona, reintenta hasta 3 veces** (dos
   asesores pueden registrar a la vez)
3. Se inserta el inmueble con `estado: 'Disponible'`
4. Se insertan las fotos (en lote)
5. Se notifica al equipo; si es arriendo, también al gestor de arriendos
6. Se limpia el formulario **conservando ciudad y tipo**
7. Redirige al inventario

**Guard contra doble envío:** un segundo toque mientras el primero está en
vuelo creaba el inmueble dos veces. Está resuelto, pero el diseño debe
**mostrar** que algo está en curso (hoy sólo cambia el texto a
«Enviando...»).

**Fallo parcial:** si el inmueble se crea pero las fotos fallan, se avisa
*«El inmueble quedó creado, pero las fotos no se guardaron»* y **no** se
trata como error — así se evitaba que el asesor reintentara y duplicara.
Ese matiz —éxito con reserva— hoy es un simple toast y merece mejor trato.

---

## 5. Estados que el diseño debe cubrir

| Estado | Hoy |
|---|---|
| Paso en blanco | Sin indicación de qué falta |
| Campo obligatorio vacío | **Nada.** Ver §8 |
| Subiendo fotos | Barra de progreso dentro del bloque |
| Foto rechazada por tamaño | Toast |
| Publicando | Botón deshabilitado, texto «Enviando...» |
| Publicado | Toast verde + redirección |
| Publicado sin fotos | Toast ámbar de aviso |
| Error de red | Toast rojo con el mensaje de Postgres |
| Código colisionado | Invisible: reintenta solo |
| Moderación detecta datos personales | Se registra en `alertas_moderacion`; **el asesor no ve nada** |

---

## 6. Detalles que no se ven pero condicionan el diseño

- **Memoria entre registros:** `ciudad` y `tipo` se recuerdan
  (`localStorage: hcrm_fmem`). Un asesor que capta 5 apartamentos en Pinares
  no debería repetir eso cinco veces. El diseño puede hacer esa memoria
  visible («Sigues en Pereira · Apartamento — cambiar»).
- **Valores por defecto opinables:** área 120, 3 habitaciones, 2 baños,
  1 parqueadero. Aceleran el caso típico, pero también **se publican tal
  cual si el asesor no los revisa**. Merecen distinguirse visualmente de un
  dato confirmado.
- **Dos direcciones:** la real (interna) y la pública. Hoy sólo se captura
  la real en este formulario.
- **El código es la identidad:** `HOUSE-XXX` es como el equipo se refiere al
  inmueble en WhatsApp, llamadas y el portal.

---

## 7. Moderación automática de datos personales

La descripción pública se analiza al publicar buscando teléfonos, correos y
nombres. El resultado se guarda en `alertas_moderacion` para revisión de
oficina. **El asesor no recibe ninguna señal.**

Oportunidad clara: avisar **en el momento de escribir** («este texto incluye
un teléfono; el portal es público») en vez de dejarlo pasar y corregirlo
después.

---

## 8. Problemas conocidos, con nombre y apellido

Esto es lo que hay que arreglar. No son sospechas: están medidos.

### 8.1 No hay validación. Ninguna.
Cuatro campos del paso 1 y dos del paso 2 están marcados con `*`, pero
**nada impide avanzar ni publicar con todos vacíos**. `fNx` sólo incrementa
el paso. Un inmueble puede llegar a la base sin tipo, sin dirección y sin
propietario.
→ El diseño necesita definir **cómo se comunica lo que falta**: en el campo,
en el botón, en el paso, en los puntos de progreso.

### 8.2 El progreso no informa
Seis puntos idénticos. No dicen qué paso está completo, cuál tiene un hueco,
ni permiten saltar a uno concreto para corregir.

### 8.3 El paso 6 revisa menos de lo que se capturó
El resumen muestra 11 campos de los ~20 capturados. **No muestra las fotos,
ni las amenidades, ni la descripción pública** — justo lo que más se olvida
y lo único que el cliente verá.

### 8.4 Las fotos llegan demasiado tarde
Son el paso 5 de 6, cuando el asesor ya está cansado y con prisa. Y son el
activo más importante: sin fotos el inmueble no se publica ni se comparte.
Históricamente los inmuebles se registraban **sin ninguna**.

### 8.5 Densidad en pantalla pequeña
El paso 4 apila dos rejillas de amenidades (18 opciones) más un textarea.
El paso 3 tiene 6 controles numéricos. En 390px eso es mucho scroll dentro
de un paso, sin señal de cuánto queda.

### 8.6 «Enviando...» es todo el feedback
Publicar dispara entre 4 y 8 operaciones de red. El asesor ve un botón
apagado, sin saber si está subiendo fotos, creando el inmueble o notificando.

---

## 9. Qué NO cambiar

- **El código `HOUSE-XXX` visible desde el paso 1.** Los asesores lo apuntan
  y lo dictan por teléfono antes de terminar el registro.
- **Los 6 pasos como agrupación conceptual.** Se puede reordenar o fusionar,
  pero el troceado en pasos cortos funciona en la calle.
- **Los valores por defecto.** Aceleran; el problema es que no se distinguen.
- **La subida asíncrona de fotos.** No bloquear al asesor mientras suben.
- **El distintivo «Visible para clientes».** Es la única señal de qué es
  público y qué interno.

---

## 10. Sistema visual

El diseño v2 ya está implantado y es la referencia:

- **Paleta cálida:** cream `#faf6f1`, paper `#fff`, ink `#2c2520`,
  líneas `#ece4d4`. Acentos: verde `#047857`, ámbar `#8a5a00`, rojo `#a51c1c`.
- **Color de marca:** variable por inmobiliaria (`--v2-primary`). **Ningún
  elemento con significado propio debe derivar su color de la marca**, o se
  vuelve ilegible con un tenant de marca roja.
- **Tipografía:** Fraunces (serif) para títulos, Plus Jakarta Sans para
  interfaz, JetBrains Mono para códigos y cifras.
- **Móvil:** todo lo tocable ≥ 44px. Los campos de texto **a 16px como
  mínimo**: por debajo, iOS hace zoom al enfocar y descuadra el formulario.
- **Clases existentes:** `.ff` (grupo), `.ffl` (etiqueta), `.ffi` (input),
  `.amb`/`.amg`/`.ami` (amenidades), `.ch`/`.cps` (chips), `.pd` (puntos de
  progreso), `.foto-up`/`.foto-prev-item`/`.foto-del`/`.foto-portada`,
  `.precio-input`.

---

## 11. Lo que se espera del entregable

1. **Los 6 pasos**, en móvil 390px (prioritario) y escritorio.
2. **Cómo se comunica lo que falta** — es el problema 8.1 y el más urgente.
3. **Un indicador de progreso que informe**, no cuatro puntos decorativos.
4. **El paso de Revisar completo**, con fotos y amenidades incluidas.
5. **El estado de publicación** con sus fases, y el caso «creado pero sin
   fotos».
6. **Los estados vacíos, de carga y de error** de cada paso.
7. Si ves una estructura mejor que estos 6 pasos, **propónla**: llega con la
   nota de por qué, y respetando el §9.

Dos preguntas abiertas que agradecería que respondas con diseño, no con
texto:

- **¿Las fotos deberían ir antes?** Están al final y son lo más importante.
  Pero el asesor a veces registra primero y fotografía después.
- **¿Cómo se distingue un valor por defecto de uno confirmado?** «3
  habitaciones» puede ser un dato real o que nadie lo miró, y hoy se ven
  idénticos.
