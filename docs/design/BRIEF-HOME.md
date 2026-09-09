# BRIEF DE DISEÑO — Home de Inmobiliaria House

**Para:** Claude Design
**Entregable:** pantalla de inicio de `www.inmobiliariahouse.com.co`
**Fecha:** 9 de septiembre de 2026
**Referencia analizada:** home de Fincaraiz (4 capturas aportadas por el cliente)

---

## 0. Lee esto antes que nada

Este brief lleva **cifras reales del portafolio**, consultadas en la base de
datos el 9 de septiembre de 2026. No son ejemplos ni cifras de relleno: son
las que van a aparecer en pantalla, y **condicionan el diseño**.

Hay dos reglas que no se negocian:

1. **No inventar datos.** Nada de "15 años de experiencia", "500 clientes
   satisfechos" ni "47 negocios cerrados". Esa última cifra existe hoy en
   otra página del sitio y **no tiene ningún dato detrás**: la tabla de
   cierres está vacía. Si un número no está en la lista de la sección 3, no
   se usa.
2. **El diseño se somete al inventario, no al revés.** Un carrusel preciso
   de 8 fichas buenas vence a una parrilla de 20 donde 8 salen en gris.

---

## 1. Qué es Inmobiliaria House y por qué no es un portal

Inmobiliaria House es una inmobiliaria **local** de Pereira, Risaralda, con
oficina abierta al público. No es un portal de anuncios.

Esa distinción es el eje de todo el diseño, porque la referencia que trae el
cliente —Fincaraiz— es exactamente lo contrario: un portal nacional que
presume de volumen.

| | Fincaraiz | Inmobiliaria House |
|---|---|---|
| Modelo | Portal de anuncios | Inmobiliaria con inventario propio |
| Ingreso | Vende pauta a inmobiliarias | Comisión al cerrar el negocio |
| Alcance | Nacional, cientos de miles de fichas | Pereira y el Eje Cafetero, 174 fichas |
| Promesa | "El portal inmobiliario #1 de Colombia" | Verificamos, filtramos y acompañamos |
| Trato | Autoservicio | Un asesor con nombre por inmueble |

**Consecuencia de diseño:** copiar su home tal cual sería competir en su
terreno con 174 fichas contra sus cientos de miles. Perderíamos. Hay que
tomar su *usabilidad* —que es excelente— y rechazar su *posicionamiento*.

La frase que resume nuestra postura, y que puede usarse como copy:

> Publicar es fácil. Acompañar hasta la firma es el trabajo.

---

## 2. A quién le hablamos

Tres visitantes, en este orden de prioridad:

**1. Quien busca vivienda (70% del tráfico esperado).**
Llega de un enlace de WhatsApp o de Google. Quiere ver inmuebles ya. Si en
los primeros dos segundos no ve una foto de una casa y un precio, se va.

**2. El propietario que quiere vender o arrendar (25%).**
Viene con desconfianza: probablemente ya publicó en un portal y recibió
veinte llamadas de curiosos. Necesita ver que hay una oficina, una dirección
y personas.

**3. El comisionista (5%).**
Tiene inmuebles de terceros y busca con quién repartir comisión.

**Consecuencia de diseño:** el home abre para el comprador. El propietario y
el comisionista tienen su entrada, pero más abajo. No al revés.

---

## 3. Cifras reales — las únicas que se pueden usar

Consultadas el 2026-09-09. **Todas se calcularán en vivo al pintar la
página**, así que el diseño debe funcionar aunque cambien.

### Inventario
- **174 inmuebles** activos
- **163** solo en venta · **10** solo en arriendo · **1** en ambas
- **101 con fotos** · **73 sin ninguna foto** (42%)
- **75 con descripción** · 99 sin ella

### Cobertura
- **Pereira 116** · **Dosquebradas 36** · **Armenia 3**
- Sólo esas tres pasan de 3 inmuebles. El resto son municipios con 1 o 2.

### Sectores con inventario suficiente para ofrecerlos
Pinares 11 · Cerritos 5 · Centro 4 · Frailes 4 · La Macarena 3 · Av. Ferrocarril 3

### Tipos
Casa 66 · Apartamento 64 · Casa campestre 16 · Apartaestudio 10 · Lote 9 ·
Finca 5 · Oficina 3 · Local comercial 1

### Rango de precios
- Venta: desde **$4.700.000** hasta **$19.800.000.000** (mediana **$430.000.000**)
- Arriendo: desde **$800.000** hasta **$98.000.000/mes**

### Las tres restricciones que más afectan el diseño

**a) El 42% no tiene fotos.**
Cualquier sección visual del home debe alimentarse **sólo de las 101 con
foto**. Las otras 73 siguen accesibles al explorar y al buscar, pero no
entran a la portada. Un home con marcadores grises de "Sin fotos" no vende.
No es ocultar inventario: es elegir qué se pone en la vitrina.

**b) Sólo hay 10 arriendos contra 163 ventas.**
Fincaraiz tiene una pestaña "Arriendo" a secas porque detrás hay miles. Si
la copiamos, alguien la toca y ve diez fichas.
→ **Las pestañas deben mostrar el conteo real**: `Todos 174 · Venta 163 ·
Arriendo 10`. Es honesto y además informa.

**c) Sólo hay dos ciudades de verdad.**
Fincaraiz tiene un bloque "explora por ciudad" con Bogotá, Medellín, Cali y
Barranquilla, cada una con su foto. Nosotros tendríamos Pereira y
Dosquebradas, y quedaría pobre.
→ **Cambiar ciudades por sectores**, que es como se busca en Pereira:
Pinares, Cerritos, Centro, Frailes. Con su conteo.

---

## 4. Identidad visual — de las piezas reales del cliente

El sistema visual **no se invente**: sale de los flyers que la inmobiliaria
ya publica (piezas de Cerritos y Molivento, aportadas por el cliente). Estos
son los cinco rasgos que las hacen reconocibles y que el home debe heredar:

### 4.1 Color

```
--marino      #0d2a52   dominante: fondos de bloque, titulares sobre claro
--marino-2    #133a6b   degradados
--marino-3    #1b4d8a   hover, iconos sobre fondo claro
--claro       #8fc4f0   acento: la palabra clave del titular, iconos
--claro-2     #b8dcf7   píldoras, botones secundarios, precio destacado
--claro-3     #e8f3fc   fondos suaves de icono
--gris        #f4f7fb   fondo de sección alterna
--tinta       #0f1b2d   texto principal
--tinta-2     #4a5a70   texto secundario
--tinta-3     #8394a8   etiquetas
--linea       #dde6f0   bordes
--whatsapp    #25D366   sólo el botón de WhatsApp
```

El azul marino manda. El azul claro es **acento**, no fondo: se usa para lo
que debe resaltar (el precio, la palabra clave del titular, un icono), nunca
para grandes superficies.

**Velo sobre fotografía.** El hero va sobre foto, así que hace falta un
velo que garantice el contraste del texto blanco. Usar marino, no negro:
`linear-gradient(180deg, rgba(13,42,82,.72), rgba(13,42,82,.45) 45%, rgba(13,42,82,.80))`.
Un velo negro apaga la foto y despega el hero del resto de la marca; el
marino la integra. El texto blanco sobre ese velo debe medir **4.5:1 como
mínimo** contra el punto más claro de la fotografía.

**Prohibido:** verde como color de marca (existe en otra página del sitio y
está fuera de la identidad), cremas beige, cualquier degradado de tres o
más colores, y velos negros sobre las fotos.

### 4.2 Tipografía

- **Montserrat** para todo: de 400 a 900. Cubre el titular extra-negro y el
  rótulo espaciado, que es justo el rango que usan las piezas.
- **Dancing Script** 700 para el acento manuscrito.

Escala:
```
h1   clamp(30px, 7vw, 56px)   900   line-height .98   letter-spacing -.025em
h2   clamp(26px, 5vw, 40px)   800   line-height 1.06  letter-spacing -.02em
h3   17-19px                  800   line-height 1.3
lead 15.5-18.5px              500   line-height 1.62
rótulo 11-11.5px              700   letter-spacing .2em   MAYÚSCULAS
```

El **letter-spacing ancho en los rótulos es la firma de la marca**. Sin él
un rótulo parece simplemente texto pequeño. Ejemplos de rótulos reales de
sus piezas: `PROPIEDADES QUE ELEVAN TU ESTILO DE VIDA`, `CONFIANZA EN CADA
ESPACIO`, `ESPACIOS QUE CONECTAN TU VIDA`.

### 4.3 Los cuatro motivos gráficos

1. **Cortes diagonales** entre bloques, no bordes rectos. En las piezas el
   bloque marino de la cabecera termina en diagonal.
2. **Píldoras de etiqueta**: fondo azul claro, texto marino, mayúsculas
   espaciadas, radio completo. En sus flyers dicen `ARRIENDO`.
3. **Tira de datos con iconos de línea**: icono arriba, número grande,
   etiqueta pequeña debajo, filete vertical entre columnas. Es como muestran
   habitaciones / baños / garaje / m² / estrato.
4. **Un acento manuscrito por pieza.** Uno, no tres: es un remate, y
   repetido deja de destacar. Los suyos: *"Vive la tranquilidad de
   Cerritos"*, *"Dosquebradas te conecta"*, *"Más que inmuebles, creamos
   hogares"*.

### 4.4 Logo

Casa de trazo (línea, no relleno) + `HOUSE` en mayúsculas muy espaciadas +
`INMOBILIARIA` debajo, más pequeño y aún más espaciado. Sobre marino va en
blanco.

---

## 5. Datos de contacto — deben aparecer y ser accionables

```
Oficina    Calle 14 #14-09, Pereira, Risaralda   (abierta al público, sin cita)
WhatsApp   310 592 2763      → https://wa.me/573105922763?text=<mensaje>
Correo     info@inmobiliariahouse.com
Sitio      www.inmobiliariahouse.com.co
```

Requisitos:
- El WhatsApp debe llevar **mensaje pre-escrito** distinto según desde dónde
  se pulse (ej. "Hola, quiero que publiquen mi inmueble" vs "Hola, quiero
  asesoría para comprar").
- La dirección debe **enlazar a mapas**.
- El correo, a `mailto:` con asunto.
- Hay una **foto real de la fachada** disponible (`/img/oficina-lg.jpg`,
  1536×1024). Úsala: es la prueba de que la oficina existe. En el teléfono
  conviene recortarla vertical (4/5).

---

## 6. Estructura del home, sección por sección

Orden obligatorio. El comprador manda arriba; el propietario, después.

### 6.1 Cabecera
Fija al hacer scroll, fondo marino con leve transparencia.
- Izquierda: logo.
- Derecha: `Ver inmuebles` (secundario) + `WhatsApp` (verde, prominente).
- En el teléfono el logo se mantiene y `Ver inmuebles` se oculta.

### 6.2 Hero a sangre con buscador encima — LO MÁS IMPORTANTE DE LA PÁGINA

Es lo que Fincaraiz hace mejor y lo que hay que adoptar sin dudar: **el
buscador es el protagonista, no un adorno en la esquina.** Y va sobre una
**fotografía a sangre**, de borde a borde, no sobre un fondo plano.

Medido en su captura (ventana de 1366×768): el hero ocupa **~690px de
alto**, la foto llega a los cuatro bordes sin esquinas redondeadas, y
encima va un velo oscuro que permite leer el texto blanco.

Contenido, centrado, en este orden:

1. **Titular en blanco, centrado, ~48px, peso 800.** Una sola línea, sin
   subtítulo debajo. Ellos ponen *"El portal inmobiliario #1 de Colombia"*
   y nada más: la seguridad viene de no explicarse.
   Propuesta nuestra: **"Tu próximo hogar está en Pereira"** o
   **"Inmuebles verificados en Pereira y el Eje Cafetero"**.
   Una palabra clave puede ir en azul claro.

2. **Control segmentado de modalidad.** Contenedor oscuro translúcido con
   radio completo; la pestaña **activa es una píldora BLANCA con texto
   marino**, las inactivas van translúcidas con texto blanco. Es un patrón
   distinto del de las píldoras de filtro y se lee mucho mejor sobre foto.
   Con el conteo real: `Todos 174` · `Venta 163` · `Arriendo 10`.

3. **Barra de búsqueda: una sola tarjeta blanca**, no tres controles
   suertos. Dentro, de izquierda a derecha:
   `[ selector de tipo ⌄ | campo de texto | botón azul con lupa ]`
   El botón es un **cuadrado de esquinas redondeadas a la altura completa
   de la barra**, pegado al extremo derecho. Ellos lo hacen así y es lo que
   hace que la barra se lea como un solo objeto.

4. **"Buscar por código" va DEBAJO y a la derecha**, como botón secundario
   translúcido pequeño — no dentro de la barra. Ellos lo resuelven
   exactamente así. En nuestro caso pesa más que en un portal nacional,
   porque los asesores comparten códigos `HOUSE-259` por WhatsApp todo el
   día: debe aceptar `259` y `house 259`, no sólo el formato exacto.

**Qué foto va en el hero.** No la fachada de la oficina: eso va más abajo,
en "quiénes somos". Aquí va la **mejor fotografía de inmueble del
portafolio** — hay una casa campestre en Cerritos con piscina y terraza que
sirve. Debe elegirse a mano, no automáticamente: el hero es la única imagen
que no puede fallar.

El bloque termina en **corte diagonal** hacia el blanco.

**En el teléfono:** el titular baja a `clamp(30px,7vw,…)`, la barra de
búsqueda **se apila** en tres filas (tres controles en 375px dejan campos de
90px donde no se lee lo que se escribe), y el alto del hero se limita a
~72vh para que se intuya que hay más abajo.

**Lo que NO copiamos de su hero:** la tarjeta de pauta abajo a la derecha
(Click Living). Ellos venden publicidad; nosotros inmuebles.

### 6.3 Tira de datos
Justo debajo, montada sobre la diagonal (margen negativo), tarjeta blanca
elevada con tres columnas e iconos de línea:

```
🏠 174            📍 3                    ⇄ 3
INMUEBLES         CIUDADES CON            VENTA · ARRIENDO ·
EN CARTERA        INVENTARIO              VACACIONAL
```

Nada de repetir estas cifras en otra parte de la misma pantalla.

### 6.4 Últimos ingresos — carrusel
- Rótulo `RECIÉN PUBLICADOS` + título `Últimos ingresos` + botón `Ver todo`.
- **Carrusel horizontal**, sólo con las que tienen foto, ordenadas por fecha.
- Flechas **sólo en escritorio**; en el teléfono se desliza con el dedo y las
  flechas estorbarían encima de las tarjetas.
- La tarjeta del móvil debe medir ~84vw para que **asome la siguiente**: es
  lo que comunica que hay más.

**Anatomía de la tarjeta.** Es la pieza que más se repite en todo el sitio,
así que va medida contra la referencia. El orden de Fincaraiz es el
correcto y lo adoptamos tal cual:

```
┌──────────────────────────────┐
│ [foto ~4:3]              ♡   │  ← corazón arriba-derecha, contorno
│  (píldora "En arriendo")     │     blanco SIN círculo de fondo
├──────────────────────────────┤
│ $ 1.700.000 /mes             │  ← 1º PRECIO · 20px · 800 · marino
│ Molivento · Dosquebradas     │  ← 2º ubicación · 14px · gris
│ 🛏 3   🛁 2   ⬜ 70 m²        │  ← 3º especificaciones con iconos de línea
│ Apartamento en arriendo      │  ← 4º frase descriptiva · 14px · 700
│ en Molivento                 │     recortada con puntos suspensivos
└──────────────────────────────┘
```

Cuatro decisiones concretas tomadas de la referencia:

1. **El precio va primero y grande.** Es el dato por el que se descarta o se
   sigue mirando. Ellos incluso dejan un espacio tras el `$`.
2. **La frase descriptiva va al FINAL**, no arriba. Al ojo le sirve más
   precio → dónde → cuánto mide → y por último qué es.
3. **Sólo dos o tres especificaciones**, no cinco. Ellos muestran baños y
   metros y ya. Nosotros: alcobas, baños y m². El resto está en la ficha.
4. **El corazón va sin círculo de fondo**, sólo el contorno blanco sobre la
   foto.

Una diferencia deliberada: **nosotros añadimos la píldora de modalidad**
("En venta" / "En arriendo") sobre la foto. Ellos no la necesitan porque la
frase del final ya lo dice; nosotros sí, porque con 163 ventas contra 10
arriendos el visitante necesita distinguirlo de un golpe.

### 6.5 Explora por sector
Chips con icono de ubicación, nombre y conteo:
`📍 Pinares 11` · `Cerritos 5` · `Centro 4` · `Frailes 4` · `La Macarena 3`

**Regla crítica:** el número del chip debe coincidir **exactamente** con los
resultados que salen al pulsarlo. Ya nos pasó que un chip decía 5 y devolvía
10, porque el filtro buscaba también en la descripción. Un chip que miente
mina la confianza en todo lo demás.

### 6.6 Por tipo de inmueble
Tarjetas con icono de línea, nombre y conteo. Rejilla de 2 columnas en el
teléfono, auto-ajustable en escritorio.

### 6.7 En arriendo
Segundo carrusel, sólo si hay al menos 4 con foto. Botón `Ver los 10`.
Si no llega a 4, **la sección no se pinta**: mejor ausente que ridícula.

### 6.8 Franja marina — el diferencial
Rótulo `POR QUÉ CON NOSOTROS` + título `Lo que un portal no hace`.
Tres tarjetas sobre marino:

- **Verificamos cada ficha** — Visitamos el inmueble y levantamos los datos.
  No publicamos lo que no hemos visto.
- **Filtramos a los curiosos** — Al inmueble sólo llega quien tiene con qué,
  y siempre con un asesor de House.
- **Tenemos oficina** — Calle 14 #14-09, Pereira. Puedes venir, sentarte y
  preguntar mirando a alguien a la cara.

Cierra con dos botones: `Quiero que publiquen mi inmueble` (azul claro) y
`Escríbenos por WhatsApp` (contorno).

### 6.9 Cómo exponemos tu inmueble — para el propietario
Resumen de tres o cuatro pasos con enlace a la página completa `/publicamos`.
No repetir aquí los seis pasos: son otra página.

### 6.10 Contacto
Tres tarjetas accionables: WhatsApp, correo, oficina (con mapa). Sobre
marino, con la dirección completa.

### 6.11 Pie
Logo, lema espaciado `MÁS QUE INMUEBLES, CREAMOS HOGARES`, dirección,
teléfono y correo. **Rejilla adaptable**: 4 columnas en escritorio, 2 en
tableta, 1 en teléfono. Nunca columnas fijas — ya provocó que la página se
desplazara en horizontal en el teléfono.

---

## 6.12 Anatomía medida de la referencia

Medidas y patrones leídos directamente de las capturas de Fincaraiz
(ventana de 1366px). Se dan para que no haya que improvisar la jerarquía.

### Títulos de sección
**Centrados**, no alineados a la izquierda. Color azul marino, ~32px, peso
**medio-alto (600-700), no extra-negro**. Sin rótulo espaciado encima.

Ejemplos suyos: `Destacados`, `Últimos Ingresos`, `Proyectos`.

Cuando la sección necesita explicarse, ponen un subtítulo gris centrado
debajo y, si hay un enlace de "ver todo", va **a la derecha en su propia
línea** con una flecha: `Ver todos los proyectos →`.

→ **Decisión para nosotros:** adoptamos el centrado y el peso medio. Los
rótulos espaciados de la marca House se reservan para los bloques marinos,
donde funcionan; en secciones claras compiten con el título.

### Carrusel
- **4 tarjetas visibles** en escritorio, con la quinta asomando por el borde
  derecho. Eso es lo que comunica que hay más.
- **Flechas circulares**, fondo blanco, sin borde marcado, **centradas
  verticalmente sobre el área de la FOTO** (no sobre la tarjeta completa), y
  **medio fuera del borde** de la primera y última tarjeta.
- Sin puntos indicadores.

### Bloque de ciudades (el que nosotros reemplazamos por sectores)
Cuatro columnas. Cada una: **fotografía de la ciudad** (~16:10, esquinas
redondeadas), nombre en negrita debajo, y **cinco enlaces** de barrios en
azul, uno por línea, con buen aire entre ellos.

→ **Decisión:** el patrón visual es bueno pero nosotros no tenemos cuatro
ciudades. Se traslada a **sectores de Pereira**, y si no hay fotografía de
sector disponible, se usan chips con conteo en vez de tarjetas con foto.
**Nunca una tarjeta con foto genérica de banco de imágenes**: se nota y
resta credibilidad a una inmobiliaria local.

### Pie
Ocho columnas de enlaces con título en negrita y enlaces en azul separados
por un filete finísimo. Una columna de redes con icono + nombre.

→ **Decisión:** ese pie sirve a escala nacional para posicionamiento en
buscadores. A escala local es ruido. Nosotros vamos a **cuatro columnas**:
Explorar · Servicios · Contacto · marca y lema. Con la dirección completa
visible, que es lo que ellos no tienen y nosotros sí.

### Insignias sobre la foto
Usan píldoras oscuras con estrella: `★ DESTACADO BLACK`. Es un producto
publicitario suyo.

→ **Decisión:** no lo copiamos como categoría de pago, pero **el patrón
visual sí sirve** para nuestra píldora de modalidad ("En arriendo") y para
un `NUEVO` en las fichas de los últimos siete días.

### Cabecera
Fondo blanco, no transparente sobre la foto. Logo a la izquierda, menú con
chevrones, y a la derecha una acción de texto (`Publica tu propiedad`), el
usuario y una campana con contador.

→ **Decisión:** nuestra cabecera va **marina translúcida** para asentarse
sobre la foto del hero, y la acción de la derecha es **WhatsApp en verde**,
que es nuestro canal real. Sin campana: en el home público no hay
notificaciones que mostrar.

---

## 7. Qué NO copiar de Fincaraiz

| Elemento suyo | Por qué no |
|---|---|
| "El portal inmobiliario #1 de Colombia" | No somos un portal ni somos #1. Presumir de lo que no se es se nota. |
| Banners de pauta (Click Living, Finca Fest) | Ellos venden publicidad; nosotros inmuebles. Un banner ajeno en nuestro home resta. |
| Pestaña "Proyectos" | No manejamos proyectos de obra nueva. |
| Bloque de ciudades con foto (Bogotá, Medellín…) | Tenemos dos ciudades. Se reemplaza por sectores. |
| Pie gigante de posicionamiento (8 columnas de enlaces) | Sirve a escala nacional. A escala local es ruido. |
| Corazón de favorito en la tarjeta del home | Exige cuenta. En el home añade un paso antes de enganchar. Va en el listado, no aquí. |

---

## 8. Requisitos del teléfono — es la vista principal

El 80% del tráfico llega de WhatsApp, o sea del teléfono. **El diseño se
hace para 375px y se expande**, no al contrario.

- Sin desplazamiento horizontal en ningún punto. Ni un pixel.
- Todo lo pulsable, **mínimo 44px de alto**.
- Campos de texto a **16px** de fuente: por debajo de eso iOS hace zoom al
  enfocar y descoloca la página.
- Respetar el área segura inferior (`env(safe-area-inset-bottom)`): hay un
  menú fijo de la app.
- Botón de WhatsApp **fijo abajo** en el teléfono. El contacto no debe
  depender de llegar al final de la página.
- Imágenes con `srcset`: la del teléfono no debe pasar de ~80 KB.
- Toda tabla, diagrama o fila ancha con su propio desplazamiento interno.

Puntos de corte sugeridos: `900px` (dos columnas → una), `700px` (buscador
apilado, carrusel a 84vw), `520px` (pie a una columna).

---

## 9. Miniatura para WhatsApp

Cuando se comparta `www.inmobiliariahouse.com.co` debe llegar con vista
previa atractiva.

**Imagen:** 1200×630 px, JPEG progresivo, **menos de 200 KB**.
Contenido propuesto: la fachada o un inmueble destacado, con el logo y una
franja marina inferior que diga `INMOBILIARIA HOUSE · PEREIRA` y
`174 inmuebles verificados`.

**Etiquetas:**
```
og:title        Inmobiliaria House · Inmuebles en Pereira y el Eje Cafetero
og:description  174 inmuebles verificados. Verificamos, filtramos y
                acompañamos hasta la firma. Oficina en Calle 14 #14-09.
og:image        1200×630, con og:image:width y height declarados
```

**Dos lecciones ganadas a golpes en este proyecto, respétalas:**
1. **Declarar `og:image:width/height` sólo si se garantiza la medida.**
   Anunciar 1200×630 para una imagen que no lo es descuadra la vista previa.
2. **La descripción no debe repetir el titular.** Ya nos pasó: la tarjeta
   decía lo mismo que el mensaje de abajo y el lector veía dos veces los
   mismos datos.

---

## 10. Restricciones técnicas de implementación

Quien implemente esto trabaja sobre un proyecto existente. El diseño debe
poder construirse con:

- **HTML + CSS + JavaScript sin framework.** El proyecto es Vite + JS
  plano. **No React, no Vue, no Tailwind.** Los componentes son funciones
  que devuelven cadenas de HTML.
- **Sin dependencias nuevas.** Iconos en SVG en línea. El set disponible
  tiene: alert, area, bath, bed, bell, camera, car, chat, check,
  chevronDown, chevronLeft, chevronRight, close, grid, heart, home, money,
  phone, pin, plus, search, share, tag, user. **Si el diseño necesita otro
  icono, entrégalo como SVG.**
- **Tipografías desde Google Fonts** (Montserrat + Dancing Script), con
  familia de reserva declarada.
- **Todos los conteos se calculan al pintar** desde los datos en memoria.
  Ningún número escrito a mano en el HTML.
- **Fotos por Cloudinary** con transformaciones de ancho (`w_520` etc.).
- Debe respetar `prefers-reduced-motion`.

---

## 11. Copy — tono y ejemplos

Español de Colombia, trato de **tú**. Frases cortas. Cero jerga inmobiliaria
vacía ("excelente oportunidad de inversión", "ubicación privilegiada").

**Sí:**
- "Publicar es fácil. Acompañar hasta la firma es el trabajo."
- "Al inmueble sólo llega quien tiene con qué."
- "Puedes venir, sentarte y preguntar mirando a alguien a la cara."
- "No publicamos lo que no hemos visto."

**No:**
- "Somos líderes del sector" (no demostrable)
- "Miles de opciones" (son 174)
- "La mejor experiencia inmobiliaria digital" (no dice nada)

---

## 12. Qué esperamos recibir

1. **Home completo**, en HTML+CSS, mobile-first y responsivo.
2. **Estados de la tarjeta de inmueble**: normal, hover, sin foto, y con
   precio ausente ("Consúltanos").
3. **Estados vacíos**: qué se ve si una sección no tiene suficientes fichas
   con foto.
4. **La miniatura 1200×630** como pieza aparte.
5. Los **SVG** de cualquier icono que no esté en la lista de la sección 10.

### Criterio de aceptación

- A 375px: sin desplazamiento horizontal y nada pulsable por debajo de 44px.
- Ninguna cifra escrita a mano.
- Ninguna sección que se vea mal si el inventario baja a 20 fichas o sube a
  1.000.
- Un solo acento manuscrito en toda la página.
- El buscador visible sin hacer scroll en un teléfono de 375×667.
- El titular del hero legible sobre la fotografía: 4.5:1 contra el punto más
  claro de la imagen, comprobado, no estimado.
- La foto del hero por debajo de 250 KB en escritorio y 90 KB en teléfono.

---

## Anexo — errores ya cometidos en este proyecto

Se listan para no repetirlos. Todos son reales y costaron tiempo:

1. **Una lista de ciudades escrita a mano** incluía "Cerritos", que es un
   corregimiento de Pereira, compitiendo con el municipio del que forma
   parte. → Los datos se derivan, no se escriben.
2. **El pie con 4 columnas fijas** hacía que toda la app se desplazara en
   horizontal en el teléfono (536px en una pantalla de 375).
3. **Una foto de 2,9 MB** (un PNG de una fotografía) en una página que se
   abre desde el teléfono. La misma en JPEG pesa 261 KB.
4. **`aspect-ratio` ignorado** por dejar el atributo `height` del HTML sin
   `height:auto`: la foto salía vertical en vez de panorámica.
5. **Un chip que decía "Cerritos 5" y devolvía 10.** El conteo y el
   resultado tienen que salir del mismo criterio.
6. **Vista previa de WhatsApp que repetía la ficha** del mensaje de abajo.
   Cada parte debe aportar algo distinto.

---

## 13. ARQUITECTURA MULTI-INQUILINO — el home es de marca blanca

**Esto es un requisito, no una mejora futura.** El mismo home tiene que
servir para Inmobiliaria House y para cualquier otra inmobiliaria que
entre a la plataforma, con **su nombre, su logo, su color y su propio
dominio**. Si el diseño se hace pensando en House, cada alta nueva será
una cirugía.

### 13.1 Qué ya existe (no hay que inventarlo)

La plataforma resuelve el inquilino en este orden:

1. `?tenant=slug` — para pruebas y previsualizaciones
2. **Subdominio** — `arias.plataforma.com` → inquilino `arias`
3. **Dominio propio** — se busca el hostname en la ficha del inquilino
4. Si nada coincide, cae en House

Y ya existe un mecanismo de marca que sustituye valores en el DOM:

```html
<img data-brand="logo">              <!-- src y alt del inquilino -->
<span data-brand="nombre"></span>    <!-- razón social -->
<a data-brand="whatsapp"></a>        <!-- teléfono con enlace armado -->
```

más variables CSS: `--color-primario` y `--b600`.

**El diseño debe usar ese mecanismo.** Todo lo que sea de marca va marcado
con `data-brand`, nunca escrito en el HTML.

### 13.2 Datos que el inquilino aporta hoy

| Campo | House | Notas |
|---|---|---|
| `nombre` | Inmobiliaria House | longitud variable |
| `slug` | house | subdominio |
| `logo_url` | *vacío* | cae en `/img/logo.png` |
| `color_primario` | `#1d4ed8` | ⚠️ ver 13.5 |
| `telefono` | +573105922763 | |
| `ciudad` | Pereira | |
| `email_admin` | info@… | |
| `direccion` | *vacío* | ⚠️ ver 13.5 |
| `metadata.dominio_custom` | inmobiliariahouse.com.co | |

### 13.3 Las cinco reglas de diseño que esto impone

**a) El nombre es de longitud variable.**
Va desde "House" (5 caracteres) hasta "Inmobiliaria Arias & Asociados"
(30). El diseño debe verse bien en los dos extremos.
→ En la cabecera: una línea, sin recorte hasta 24 caracteres; de ahí en
adelante puntos suspensivos. En el teléfono el logo solo, sin texto, si
pasa de 18.
→ **Nunca meter el nombre dentro de una frase de titular.** "Bienvenido a
Inmobiliaria House" se rompe con un nombre largo; "Encuentra tu inmueble"
no.

**b) El logo tiene proporción desconocida.**
Uno traerá un cuadrado, otro un rectángulo apaisado tres veces más ancho.
→ Definir un **hueco de tamaño fijo** y encajar dentro con
`object-fit: contain`: `max-height 40px`, `max-width 170px` en escritorio;
`36px × 140px` en el teléfono. Centrado vertical.
→ **El diseño debe funcionar sin logo**: si el inquilino no subió ninguno,
se muestra la inicial del nombre en un cuadro con el color de marca. Hoy
House no tiene logo cargado en su ficha.

**c) El color es del inquilino; la estructura no.**
Sólo hay **un** color configurable: `color_primario`. De él se derivan los
tonos:

```css
--marca:       var(--color-primario);
--marca-osc:   color-mix(in srgb, var(--marca) 78%, #000);   /* hover, degradados */
--marca-claro: color-mix(in srgb, var(--marca) 26%, #fff);   /* acentos, píldoras */
--marca-suave: color-mix(in srgb, var(--marca)  8%, #fff);   /* fondos de icono */
```

Lo que **NO** se deriva y queda fijo para todos:
- Los grises y neutros (texto, bordes, fondos alternos)
- El verde de WhatsApp (`#25D366`): es de WhatsApp, no de la marca
- Los colores de estado (disponible, arrendado, vendido)

→ Consecuencia: **el diseño no puede depender de que el color sea azul
marino.** Debe verse bien con un verde, un vinotinto o un naranja. Si una
composición sólo funciona en azul, está mal resuelta.
→ Y el **velo del hero** se arma con el color de marca, no con un azul
escrito a mano: `color-mix(in srgb, var(--marca) 72%, transparent)`.

**d) Ninguna cifra ni ciudad escrita en el HTML.**
"174 inmuebles", "Pereira", "Eje Cafetero": todo sale del inquilino y de
sus datos. Un inquilino de Bucaramanga no puede ver "Eje Cafetero".
→ El titular debe admitir la ciudad como variable:
*"Inmuebles verificados en **{ciudad}**"*.

**e) Las secciones se degradan solas.**
Un inquilino nuevo entra con 5 inmuebles, no con 174. El diseño debe
especificar qué se ve:
- Carrusel con menos de 4 fichas con foto → **no se pinta la sección**
- Sin sectores con 3+ inmuebles → **no se pinta "explora por sector"**
- Sin arriendos → **no se pinta la pestaña ni la sección de arriendo**
- Inquilino con 0 inmuebles → el hero y el bloque de confianza se
  mantienen; el resto desaparece y el buscador queda igual

Entregar **el estado "inquilino nuevo con 5 fichas"** como pantalla aparte.
Es el que van a ver todos los clientes nuevos el primer día, y hoy nadie
lo ha diseñado.

### 13.4 Dominio propio — qué implica para el diseño

Cuando el inquilino corre en su dominio:
- La vista previa de WhatsApp debe llevar **su** nombre, **su** logo y
  **su** imagen, no la de House.
- Por eso la miniatura 1200×630 **no puede ser un archivo fijo**: se
  compone con el logo y la foto del inquilino, o se genera desde su mejor
  fotografía.
→ Entregar la miniatura como **plantilla**: dónde va el logo, dónde el
texto, qué pasa con un logo cuadrado y con uno apaisado.
- Y el pie no puede decir "Inmobiliaria House": va `data-brand="nombre"`.

### 13.5 Dos huecos en los datos — los cierro yo, no son de diseño

Los anoto aquí para que quede constancia de que el diseño depende de ellos:

1. **`color_primario` de House es `#1d4ed8`**, un azul que **no es el de
   sus propias piezas** (`#0d2a52`). Si el home lee ese campo, el home de
   House saldría del color equivocado. Hay que corregir el dato.
2. **`direccion` está vacía** y `logo_url` también. El home muestra la
   dirección de la oficina y el logo: ambos deben pasar a ser **campos
   obligatorios al dar de alta** un inquilino.

Y hay campos que el home necesita y el modelo aún no tiene. Los agrego yo:

| Campo | Para qué |
|---|---|
| `lema` | el manuscrito ("Más que inmuebles, creamos hogares") |
| `hero_foto_url` | la fotografía del hero, elegida a mano |
| `og_imagen_url` | la miniatura de WhatsApp |
| `horario` | "Lun a vie 8–6, sáb 9–1" |
| `redes` | Instagram, Facebook |

**Para el diseño:** trata esos cinco como si ya existieran. Si alguno
falta, la sección correspondiente debe poder omitirse sin dejar un hueco.

### 13.6 Cómo se prueba

El diseño se valida con **tres inquilinos imaginarios**, y conviene
entregar el home en los tres estados:

| | Inquilino A | Inquilino B | Inquilino C |
|---|---|---|---|
| Nombre | House | Arias & Asociados Inmobiliaria | Vive |
| Logo | ninguno (inicial) | apaisado 3:1 | cuadrado |
| Color | `#0d2a52` azul marino | `#166534` verde | `#7c2d12` vinotinto |
| Ciudad | Pereira | Bucaramanga | Medellín |
| Inmuebles | 174 | 12 | 3 |
| Dominio | propio | subdominio | subdominio |

Si el home se ve bien en los tres, está bien resuelto. Si sólo se ve bien
en el primero, es un home de House disfrazado de plataforma.
