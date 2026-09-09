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

**Prohibido:** verde como color de marca (existe en otra página del sitio y
está fuera de la identidad), cremas beige, y cualquier degradado de tres o
más colores.

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

### 6.2 Bloque marino con buscador — LO MÁS IMPORTANTE DE LA PÁGINA

Es lo que Fincaraiz hace mejor y lo que hay que adoptar sin dudar: **el
buscador es el protagonista, no un adorno en la esquina.**

Contenido, en este orden:
1. Rótulo espaciado + píldora de contexto.
2. **Titular** con una palabra clave en azul claro. Propuesta:
   *"Encuentra tu inmueble en **Pereira** y el Eje Cafetero"*.
3. Subtítulo con la cifra viva: *"174 inmuebles verificados, con asesor que
   te acompaña."*
4. **Pestañas de modalidad con conteo real**: `Todos 174` · `Venta 163` ·
   `Arriendo 10`. La activa en azul claro con texto marino.
5. **Buscador en una tarjeta blanca elevada**: selector de tipo (con conteo
   por tipo) + campo de texto libre (barrio, sector o palabra clave) + botón
   marino con lupa.
6. **Atajo "Buscar por código"**: campo pequeño + botón. Aquí pesa más que
   en un portal nacional, porque los asesores comparten códigos `HOUSE-259`
   por WhatsApp todo el día. Debe aceptar `259` y `house 259`, no sólo el
   formato exacto.
7. A la derecha (o debajo en móvil): la **foto de la fachada** con un
   pie que diga la dirección, y el acento manuscrito.

El bloque termina en **corte diagonal**.

**En el teléfono el buscador se apila.** Tres controles en 375px dejan
campos de 90px donde no se lee lo que se escribe.

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

**Anatomía de la tarjeta** (importante, es la pieza que más se repite):
```
[foto 4:3, con píldora "En arriendo"/"En venta" arriba-izquierda]
$1.700.000/mes          ← precio PRIMERO, 19px, 900, marino
Apartamento             ← tipo, 13.5px, 700
📍 Molivento · Dosquebradas
──────────────────────
3 hab · 2 baños · 70 m²
```
El precio va primero y grande porque es el dato por el que se descarta o se
sigue mirando. Fincaraiz lo hace así y tienen razón.

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
