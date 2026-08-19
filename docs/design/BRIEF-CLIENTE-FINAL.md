# Brief de rediseño · Cliente final · HOUSE CRM

> **Para**: Claude Design  
> **Producto**: HOUSE CRM (ahora SaaS multi-tenant)  
> **Alcance**: TODO lo que ve el usuario final / visitante / cliente registrado. NO incluye el back-office interno (asesores, admins, superadmin, panel financiero).  
> **Formato de entrega esperado**: mockups high-fidelity de las 12 pantallas listadas, sistema de componentes reutilizables, tokens de diseño (colores/tipografía/espaciado/sombras/radios), estados y micro-interacciones. Mobile-first obligatorio, desktop preservado.

---

## 1 · Contexto del producto

**Qué es**: HOUSE CRM nació como el sistema interno de una inmobiliaria (Inmobiliaria House, Pereira · Colombia). Después del refactor de agosto 2026, se convirtió en un **SaaS multi-tenant**: la misma app sirve a múltiples inmobiliarias, cada una con su marca (logo, color primario, teléfono).

**Este brief es sobre la parte pública** — todo lo que ve alguien que:
- Llega desde un anuncio, WhatsApp o buscando "arriendo en Pereira"
- Explora inmuebles sin loguearse
- Se registra como comprador para expresar interés en propiedades
- O se registra como vendedor para publicar su propio inmueble
- O como comisionista para referir inmuebles y ganar comisión

**Público objetivo**:
- Compradores / arrendatarios (segmento principal, ~70% del tráfico esperado)
- Propietarios que quieren vender o arrendar (segmento captación)
- Comisionistas externos (segmento programa de referidos)

**Competencia y referentes** (deseables como benchmark visual):
- **Metrocuadrado**, **Fincaraíz**, **Ciencuadras** — competencia directa en Colombia (referentes de "cómo debería lucir")
- **Idealista** (España) — el estándar en filtros y ficha inmueble
- **Zillow** (US) — mejor experiencia de ficha + galería
- **Airbnb** — hero de galería + booking flow (para inspiración de "reserva visita")
- **Notion / Linear** — sistema de diseño limpio para las pantallas admin del usuario público

**Sensación buscada**: Editorial + confiable + local + moderno. NO "startup" agresivo. NO "corporativo" aburrido. Piensa "un vecino confiable que sabe mucho de inmuebles".

---

## 2 · Diseño actual y por qué se rediseña

**Estado hoy**: funciona, es responsive básico, cumple el flujo. Pero:

- Tipografía monótona y chica
- Cards muy funcionales pero sin personalidad
- Filtros como chips-dropdown apretados (Metrocuadrado los tiene mucho mejores)
- Header genérico, sin jerarquía
- Poca diferenciación entre inmuebles destacados vs regulares
- La ficha del inmueble no comunica confianza / cierre de venta
- Falta storytelling en la landing pública
- El flujo "Me interesa" es un modal con 6 campos — friccional
- Mobile responsive existe pero no está pensado desde el móvil

**Meta del rediseño**:
1. **Aumentar tasa de "Me interesa" 30-50%** (medible por analytics existente)
2. **Aumentar tasa de signup** (visitante → cliente registrado)
3. **Reducir bounce en la landing** (hoy es alto)
4. **Verse creíble desde el primer scroll** — no "prototipo de developer"
5. **Ser template-able** — cualquier inmobiliaria que llegue debe verse bien (multi-tenant)

**Screens actuales** (screenshots adjuntos en el chat que precedió a este brief):
- Landing pública `/#/portafolio` — header + banner stats + filtros + grid de tarjetas
- Ficha pública `/ver/HOUSE-XXX` — galería + info + precio + specs + descripción + sticky footer

---

## 3 · Multi-tenant · consideraciones críticas

El diseño **NO puede asumir la marca de Inmobiliaria House**. Cada inmobiliaria configurará:

- **Logo**: URL a una imagen (típico: PNG con transparencia, aspect 1:1 o wide)
- **Color primario**: 1 valor hex (ej `#1d4ed8`, `#059669`, `#ea580c`)
- **Nombre comercial**: string (ej "Inmobiliaria Ejemplo")
- **Teléfono WhatsApp**: string con prefijo país
- **Ciudad principal**: string
- (Opcional futuro: color secundario, tipografía brand)

**Implicaciones**:
- **El color primario es la ÚNICA variable de brand disponible**. Todo el sistema tiene que reaccionar bien a cualquier color (rojo, verde, azul, morado). Nada puede estar cocido a azul.
- **El logo tiene que ser flexible** (dimensiones variables). Diseñar un slot claro en el header, no un "logo perfectamente balanceado con nuestro azul".
- **La tipografía es global** (misma para todos los tenants). No hay libertad brand ahí.
- **Debe haber un "modo genérico" elegante** para el tenant que aún no configuró su logo — algo tipo "🏠 [Nombre]" o iniciales.

**Modo demo / plataforma raíz**: La landing en `plataforma.com` (dominio principal SaaS) tiene su propia identidad — es la marca de la plataforma, no de un tenant. Eso lo verá el usuario que NO viene por un subdominio. Ese modo no está en scope de este brief (se puede diseñar aparte).

---

## 4 · Screens a rediseñar (12 pantallas)

### 4.1 · Landing pública `/` o `/#/portafolio`

**Quién la ve**: cualquier visitante que llega al subdominio del tenant. Puede estar logueado o no.

**Objetivo primario**: Que el visitante haga scroll y clickee al menos 1 inmueble.

**Elementos que debe contener**:
1. Header con logo del tenant + botones "Ingresar" y "Registrarse gratis"
2. Hero/banner con: nombre inmobiliaria + tagline + stats vivos (total, en venta, en arriendo, ambas)
3. Barra de búsqueda por texto (con autocomplete de barrios/tipos/ciudades)
4. Filtros: **Negociación** (Comprar/Arrendar/Las dos), **Ciudad** (multi-select), **Tipo** (9 opciones: Casa, Apto, Apartaestudio, Finca, Local, Oficina, Lote, Bodega, PH), **Precio** (rango venta + rango arriendo), **Favoritos** (toggle, requiere login)
5. Selection bar con chips removibles de filtros activos
6. Ordenación (Más recientes, Mejor precio, etc)
7. Grid de tarjetas (paginado o infinite scroll — decidir)
8. CTA banner: "¿Tenés un inmueble? Publicá gratis" (para captación de vendedores)
9. Banner referidos: "Gana hasta 1.5% refiriendo arriendos" (link a `/#/referidos-landing`)
10. Footer con contacto, política, redes

**Data disponible**:
- 192 inmuebles (número real actual — puede llegar a miles con más tenants)
- Cada uno con: tipo, negociación, ciudad, barrio, dirección pública, precio(s), habitaciones, baños, área, estrato, parqueaderos, características, código, fotos, captador, estado (Disponible/Aún Disponible/etc)

**Estados**:
- Loading (skeleton)
- Empty (sin inmuebles publicados)
- Sin resultados (filtros muy restrictivos)
- Con muchos resultados (paginación)

### 4.2 · Ficha pública del inmueble `/ver/HOUSE-XXX`

**Quién la ve**: llega vía link compartido por WhatsApp / redes sociales (por eso tenemos OG tags dinámicos).

**Objetivo primario**: Que el visitante haga click en "Me interesa" o WhatsApp.

**Elementos**:
1. Header sticky compacto con logo + botón "✕ Volver" + botón contacto (WhatsApp)
2. Galería (foto principal + thumbnails scrollables, swipe en móvil, lightbox en desktop)
3. Chip de tipo + negociación + código HOUSE
4. Título principal (dirección pública, ej "Pinares · Torres del Bosque")
5. Ciudad
6. Bloque precio destacado (Venta y/o Arriendo, con formato COP)
7. Grid de specs (6 items): habitaciones, baños, área construida, área total, estrato, parqueaderos
8. Chips de amenidades (de la lista libre de "características")
9. Descripción larga (texto)
10. Card del asesor (foto/inicial + nombre + rol)
11. Sticky footer con 3 CTAs: **Me interesa este inmueble** (primary), WhatsApp, Llamar
12. Banners al final: "Explorar más inmuebles" + "Publicá tu inmueble gratis"

**Variantes según sesión**:
- Visitante anónimo: CTAs abren auth prompt tras click
- Logueado como comprador: CTA "Me interesa" abre form directo
- Logueado como asesor externo/comisionista: CTAs cambian ("Estoy interesado" para su cliente + botón "🏠 Me interesa" internal)
- Logueado como propietario: se muestra "Editar" en vez de "Me interesa"

**Estados**:
- Loading
- Inmueble no encontrado (link expirado)
- Inmueble retirado del mercado

### 4.3 · Signup nuevo tenant (`/#/signup`)

**Quién la ve**: dueño/gerente de una inmobiliaria que quiere crear su cuenta en la plataforma SaaS.

**Objetivo**: Bajar la fricción al máximo — crear cuenta en <60 segundos, sin tarjeta.

**Elementos**:
1. Landing hero: "Empezá tu prueba gratis · 15 días · sin tarjeta"
2. Form:
   - Nombre inmobiliaria (auto-genera slug al escribir)
   - Slug/subdominio con feedback en vivo (✅/❌ disponibilidad — YA implementado)
   - Email admin
   - Teléfono WhatsApp (opcional)
   - Ciudad (opcional)
3. CTA "Crear mi cuenta gratis"
4. Confirmación post-signup con URL asignada + siguiente paso

### 4.4 · Signup usuario público (comprador)

**Quién la ve**: visitante que quiere favoritear / expresar interés / recibir sugerencias.

**Diseño actual**: `showAuthPrompt` modal con icono, título, mensaje, beneficios (lista de bullets), 2 CTAs.

**Contextos** (afectan el mensaje del prompt):
- "favorito" — "Guardá tus favoritos"
- "contacto" — "Expresar interés"
- "publicar" — "Publicá tu inmueble"
- "chat" — "Enviá tu mensaje"

**Elementos**:
- Icono grande
- Título accionable
- Mensaje
- Lista de 3 beneficios con emojis
- Botón primary + secundario "Ahora no"

### 4.5 · Flujo "Me interesa" — Split (para quién es)

Cuando un cliente público hace click "Me interesa" y NO está logueado como interno:

**Paso 1**: Modal split — "¿Para quién es este inmueble?"
- Opción A: **Para mí** (con badge "✅ Sin costo. House te acompaña gratis")
- Opción B: **Para alguien que conozco** (con badge "💰 Gana hasta 1.5% del valor de venta")

### 4.6 · Flujo "Me interesa" — Form comprador (después del split)

Form con 6 campos:
1. Modalidad (compra/arriendo) — auto-selected si el inmueble solo tiene un precio
2. Presupuesto máximo (número)
3. ¿Cuándo necesitás mudarte/cerrar? (date)
4. Crédito hipotecario (Sí / No / En trámite / No sé — button group)
5. Tipo de pago (Crédito / Efectivo / Mixto — button group)
6. ¿Para qué es? (Vivienda / Inversión / Comercial — button group)
7. Mensaje al asesor (textarea)

Al enviar: se crea `interes_comprador`, se notifica al asesor, se activa perfil "comprador" del usuario público.

### 4.7 · Flujo "Me interesa" — Form comisionista

Form super simple (sin fricción):
- Copy motivador: "💰 Gana hasta 1.5% del valor de venta"
- Comentario libre (opcional)
- Sin pedir datos del cliente (importante: comisionistas no confían todavía)

### 4.8 · Mis Intereses `/#/mis-intereses`

**Quién la ve**: usuario público que ya expresó interés en ≥1 inmueble.

**Elementos**:
- Grid de tarjetas: 1 por cada `interes_comprador` activo
- Cada tarjeta muestra: inmueble, estado (nuevo/calificado/pedir_info/descartado), presupuesto, fecha, mensaje del asesor si hay respuesta
- Badge de estado con color (verde/amarillo/rojo)
- CTA "Editar interés" o "Chat con asesor"

### 4.9 · Favoritos `/#/favoritos`

Grid de las tarjetas que el usuario marcó con ❤️. Igual formato que las de portafolio pero sin CTA de share (ya se conocen).

### 4.10 · Mensajes / Chat `/#/mensajes`

Lista de conversaciones con asesores + view de conversación. Cada conversación tiene contexto (interés / cita / negocio).

### 4.11 · Publicar mi inmueble `/#/publicar`

Wizard para vendedores/comisionistas externos:

**Paso 1**: ¿Vendedor propietario o comisionista? (split, similar a "Me interesa")

**Paso 2** (form): tipo, negociación, ciudad, barrio, dirección exacta (privada), precio, habitaciones, baños, área, estrato, parqueaderos, características (checkboxes), descripción para el cliente, fotos (upload con Cloudinary)

**Paso 3**: Confirmación → "Publicado en revisión. Te avisamos en 24h."

### 4.12 · Referidos `/#/referir` y `/#/mis-referidos`

**Landing referidos**: Explicación del programa (5 pasos con timeline), políticas (accordion), estrategias (accordion), calculadora "si es un apto de $X, ganás $Y".

**Mis Referidos**: Dashboard de comisiones + lista de referidos con estado + total ganado + próximo pago.

---

## 5 · Sistema de componentes reutilizables

Diseñar UNA sola vez, usar en todas las screens:

### 5.1 · Tarjeta de inmueble (public card)

**Variantes**:
- Compacta (grilla de 3 cols desktop, 2 cols tablet, 1 col mobile)
- Featured / destacada (span 2 cols, foto más grande, badge "⭐ Destacado")
- Sold/rented (grayscale + tag "Vendido"/"Arrendado")
- Skeleton loading

**Info visible**:
- Foto principal (con carousel: swipe en mobile, arrows en desktop, dots indicator)
- Contador de fotos (📷 14)
- Botón favorito (❤️ arriba derecha, gated si no está logueado)
- Botón share (📤 arriba derecha izq del favorito)
- Chip precio principal (venta o arriendo, ambos si aplica)
- Tipo + código HOUSE
- Ubicación (Barrio · Ciudad)
- Specs (🛏️ 3, 🚿 2, 📐 90m², E4) — íconos + valor
- Nombre asesor (opcional)
- CTA primary "Ver detalle" + secundario "Me interesa"

### 5.2 · Filter bar

- Chips horizontales con dropdown al click
- Multi-select para Ciudad y Tipo
- Single select para Negociación
- Range inputs para Precio (venta + arriendo separados)
- Auto-cierre 400ms tras última selección
- Chip visual del filtro aplicado con ✕

### 5.3 · Selection bar (filtros activos)

- Fila horizontal scrollable de chips removibles
- Cada chip: emoji + texto + ✕
- Vive debajo de la barra de filtros
- Auto-hide si no hay filtros activos

### 5.4 · Search input con autocomplete

- Icon 🔍 dentro del input
- Placeholder rotativo (barrios/tipos/ciudades)
- Dropdown con secciones:
  - 🕐 Recientes (últimas 5 búsquedas del user)
  - 📍 Barrios matching
  - 🏢 Tipos matching
  - 🗺️ Ciudades matching
- Navegación con ↑↓ + Enter

### 5.5 · Galería inmueble

- Foto principal grande (aspect 4:3 o 16:9)
- Thumbnails horizontales scrollables abajo
- Swipe en móvil
- Contador (1/14)
- Fullscreen lightbox al click
- Placeholder si no hay fotos

### 5.6 · Botón CTA

**Variantes**:
- Primary (color primario del tenant, fondo lleno)
- Secondary (borde color primario, fondo transparente)
- WhatsApp (verde #25d366, ícono chat)
- Llamar (azul #2563eb, ícono teléfono)
- Ghost (sin borde, para acciones destructivas)
- FAB (floating action button, sticky bottom mobile)

### 5.7 · Auth prompt modal

- Icono grande (contexto-dependent)
- Título accionable
- Mensaje corto
- Lista de 3 beneficios con emojis
- CTA primary + secondary
- Backdrop semi-transparente

### 5.8 · Confirm dialog

- Modal centrado
- Icono círculo grande
- Título + mensaje
- 2 botones (Cancelar + Confirmar)

### 5.9 · Toast

- Bottom-right (mobile: bottom center)
- Auto-dismiss 3.2s
- Variantes: ok (verde), error (rojo), warning (ámbar), info (azul)

### 5.10 · Bell notifications

- Icono 🔔 con badge de count no-leídas
- Dropdown 360px x 560px max
- Agrupación por contexto
- Sección "Nuevas (24h)" + "Anteriores"
- Cada item: avatar/emoji + título + mensaje + tiempo relativo (5m, 2h, 3d)
- Quick actions para tipo 'verificar' (✅ Disponible / ❌ No)

### 5.11 · Access banner

- Warning banner top-of-page para tenants en grace period o suspendidos
- Ámbar para grace, rojo para suspendido
- Solo visible si tenant.acceso.estado != 'activa'

---

## 6 · Tokens de diseño requeridos

Deben ser **CSS vars** definidas en `:root` para que el motor de branding las pueda sobrescribir por tenant:

### 6.1 · Colores

```
--color-primario     ← DEFINIDO POR TENANT (default #1d4ed8)
--color-primario-hover
--color-primario-light  (fondos suaves, 10% opacity)

--bg           (fondo página)
--bg-secondary (fondo cards)
--cd           (card default)
--cd2          (card secondary)
--brd          (borders)
--tx           (texto principal)
--sub          (texto secundario)

--green, --greenbg, --gb  (success)
--gold, --goldbg, --yb    (warning)
--red, --redbg, --rb      (error)
--b50 → --b900            (escala azul primary actual — puede ser derivada de --color-primario)
```

### 6.2 · Tipografía

- Sans: Segoe UI, Apple System, sans-serif (base)
- Serif: **Fraunces** (Google Font, ya cargada) — para titulares
- Sizes: 10/11/12/13/14/16/18/22/26/32 px
- Weights: 400/600/700/800

### 6.3 · Radios

- Small: 6px (chips, botones chicos)
- Medium: 10px (inputs, cards secundarios)
- Large: 14px (cards principales)
- XL: 20px (modales)

### 6.4 · Espaciado

Múltiplos de 4: 4, 8, 12, 16, 20, 24, 32, 40, 48

### 6.5 · Sombras

- sm: `0 1px 3px rgba(0,0,0,.06)`
- md: `0 4px 12px rgba(0,0,0,.08)`
- lg: `0 12px 32px rgba(0,0,0,.12)`
- xl: `0 20px 60px rgba(0,0,0,.15)` (modales)

### 6.6 · Modo oscuro

**Nice to have, no bloqueante**. La app hoy tiene apariencia por perfil (light/dark + tonalidades + fuente + color letra en Mi cuenta), gestionado por `data-modo` en `<html>`. El diseño del cliente final debería considerar variantes dark, pero MVP puede ser solo light.

---

## 7 · Constraints técnicos

**Stack**:
- Vanilla JavaScript (NO React, NO Vue) + Vite
- Renderizado imperativo: funciones que devuelven HTML strings + innerHTML
- Estilos: inline styles + CSS vars + una hoja global chica
- Supabase para datos + auth
- Cloudinary para fotos (con transformaciones `f_auto,q_auto,w_600`)

**Implicaciones**:
- Componentes son funciones JS que retornan strings, no JSX
- Interactividad vía onclick inline + event delegation
- El diseño debe ser factible en HTML/CSS puro sin depender de Framer Motion / componentes React

**Fonts a usar**:
- Fraunces (serif) — display, titulares
- Segoe UI / Apple System (sans) — texto UI
- No agregar fonts nuevas sin justificación

**Responsive breakpoints** (por convención):
- Mobile: <768px
- Tablet: 768-1024px
- Desktop: >1024px
- Wide: >1440px

**Performance**:
- Cards del portafolio: se renderizan 60 a la vez (con más se pagina). Cada card no debe pasar de ~1KB HTML.
- Imágenes: lazy load nativo (`loading="lazy"`)
- Prefer inline SVG a íconos font
- No cargar librerías pesadas

---

## 8 · Data model resumido

### Inmueble

```typescript
{
  id: uuid,
  codigo_house: string,       // ej "HOUSE-243"
  tipo: enum,                 // Casa, Apartamento, Apartaestudio, Finca, Local, Oficina, Lote, Bodega, Penthouse
  negociacion: enum,          // Venta, Arriendo, Venta y Arriendo
  ciudad: string,
  barrio: string,
  direccion_publica: string,  // versión sin número exacto
  direccion: string,          // real (privada, solo admin+captador)
  precio_venta: number,
  precio_arriendo: number,
  valor_administracion: number,
  area_construida: number,
  area_total: number,
  habitaciones: number,
  banos: number,
  parqueaderos: number,
  estrato: number,
  antiguedad: string,
  caracteristicas: string,    // string con lista libre "piscina, gimnasio..."
  descripcion_cliente: string,
  observaciones: string,
  estado: enum,               // Disponible, Aún Disponible, Verificar Disponibilidad, Arrendado, Vendido, Retirado
  fotos: [{ url, url_thumb, orden }],
  url_metrocuadrado: string,
  url_fincaraiz: string,
  captador: { nombre, telefono_contacto },
  origen: enum,               // interno, externo, comisionista
  fecha_estado: date
}
```

### Usuario público

```typescript
{
  id, nombre, email, telefono_contacto, foto,
  tipo_usuario: 'publico',
  perfiles_publicos: string[],  // ['comprador', 'vendedor', 'comisionista']
  preferencias_calculadas: {…},
  favoritos: uuid[]
}
```

### Interés en inmueble

```typescript
{
  inmueble_id, usuario_id,
  modalidad: 'compra' | 'arriendo',
  presupuesto_max, fecha_ideal, mensaje,
  credito_aprobado: 'si' | 'no' | 'en_tramite' | 'no_sabe',
  tipo_pago: 'credito' | 'efectivo' | 'mixto',
  proposito: 'vivienda' | 'inversion' | 'comercial',
  interes_tipo: 'comprador' | 'comisionista',
  score_auto: 0-100,
  estado: 'nuevo' | 'calificado' | 'descartado',
  score: 'verde' | 'amarillo' | 'rojo',
  motivo_score: string
}
```

### Tenant (para branding)

```typescript
{
  id, slug, nombre,
  logo_url, color_primario,
  telefono, ciudad, dominio_custom,
  acceso: {
    permitido: boolean,
    estado: 'trial' | 'activa' | 'grace' | 'cancelada',
    grace_hasta: date
  }
}
```

---

## 9 · Flujos de conversión clave

### Flujo A · Visitante → Interés

```
Landing → filtra → tarjeta → ficha → "Me interesa"
  → auth prompt (si anon)
  → signup / login rápido
  → split: para mí / para otro
  → form (comprador) o confirmación (comisionista)
  → toast éxito + "Un asesor te contactará"
```

**Fricción actual**: 6 pasos con múltiples modales. Meta: bajar a 3-4.

### Flujo B · Visitante → Vendedor

```
Landing → banner CTA "Publica tu inmueble"
  → landing publicar (educación)
  → signup / login
  → split: propietario / comisionista
  → wizard form multi-paso
  → confirmación "en revisión"
  → email + push cuando se apruebe
```

### Flujo C · Visitante → Comisionista

```
Landing → banner "Gana 1.5% refiriendo"
  → landing referidos (5 pasos + calculadora + FAQ)
  → signup / login
  → form referido
  → confirmación "te contactamos en 24h"
```

### Flujo D · Cliente registrado → Cita

```
"Mis Intereses" → interés calificado en verde
  → recibe mensaje del asesor
  → chat / WhatsApp
  → agenda visita (form)
  → confirmación cita
  → recordatorios
```

---

## 10 · Priorización de screens

**Tier 1** (mayor impacto en conversión, hacer primero):
1. Landing pública `/#/portafolio`
2. Ficha inmueble `/ver/HOUSE-XXX`
3. Tarjeta inmueble (componente atómico)
4. Filter bar + Search + Autocomplete

**Tier 2** (funnel de conversión):
5. Auth prompt modal
6. Signup público (usuario final)
7. Flujo "Me interesa" (split + form comprador)

**Tier 3** (retención + captación B2B):
8. Mis Intereses (dashboard cliente)
9. Favoritos
10. Publicar inmueble (wizard)

**Tier 4** (secundarios):
11. Referidos landing + calculadora
12. Signup nuevo tenant (SaaS onboarding)

---

## 11 · Entregables esperados de Claude Design

1. **Design tokens** (colores, tipografía, espaciado, sombras, radios) como variables CSS
2. **12 pantallas high-fidelity** — desktop + mobile, en un canvas navegable
3. **Sistema de componentes** — cada uno con estados (default, hover, active, disabled, loading, empty, error)
4. **Prototipo interactivo** de al menos el Flujo A (visitante → interés)
5. **Guía de multi-tenant**: cómo se ven las 3 pantallas principales con 3 colores primarios distintos (azul, verde, morado) — validación de que el diseño soporta cualquier brand
6. **Assets exportables**: SVGs de íconos, especificaciones tipográficas, componentes copy-pastable como HTML+CSS (no React)

---

## 12 · Anti-goals (qué NO hacer)

- ❌ **No agregar dependencias JS** (React, Vue, Tailwind, etc). El stack es vanilla + Vite.
- ❌ **No usar imágenes stock genéricas** para el diseño — usar fotos reales del schema (Cloudinary tiene 1676 fotos reales)
- ❌ **No inventar features nuevas** — mejorar las existentes visualmente, no agregar funcionalidad no documentada acá
- ❌ **No hardcodear el color azul** — todo referenced a `--color-primario`
- ❌ **No romper el mobile actual** — es donde vive el 70%+ del tráfico
- ❌ **No usar animaciones pesadas** — micro-transitions sí (150-250ms), motion libraries no
- ❌ **No cambiar los IDs / clases del DOM actual** sin explicar el mapeo — hay onclick inline que dependen de nombres específicos

---

## 13 · Contexto adicional útil

### Rutas SPA existentes (para navegar el diseño)

Cliente-final routes (hash-based):
- `/` o `/#/portafolio` — Home / inventario público
- `/ver/HOUSE-XXX` — Ficha pública
- `/#/signup` — Signup nuevo tenant (NUEVA, ya construida)
- `/#/publicar` — Wizard publicar
- `/#/favoritos` — Favoritos del usuario
- `/#/mis-intereses` — Intereses del comprador
- `/#/mis-inm` — Inmuebles publicados por el vendedor
- `/#/mis-negocios` — Negocios cerrados
- `/#/mensajes` — Chat con asesores
- `/#/cuenta` — Perfil del usuario
- `/#/referir` — Formulario referir inmueble
- `/#/mis-referidos` — Dashboard referidos
- `/#/referidos-landing` — Landing programa referidos (para no logueados)
- `/#/facturacion` — Facturación del tenant (admin only, YA construida)

### Tone of voice (para copies existentes)

Es cercano, colombiano, sin exceso de anglicismos:
- "Explorá" (voseo), "Mirá", "Chatéalo" (imperativo directo)
- Emojis funcionales en labels: 🏠 🔑 💰 📍 🛏️ 🚿 📐 ⭐
- Copy de CTAs claros: "Me interesa este inmueble", "Ver detalle", "Publicá tu inmueble gratis"
- Nombres de estados en español: "Disponible", "Aún Disponible", "Verificar Disponibilidad"

### Métricas actuales del negocio (datos reales de House)

- 243 inmuebles totales (post-refactor: 192 disponibles públicos)
- 1676 fotos
- 47 usuarios internos
- 11 referidos activos
- 6 cierres registrados
- Tráfico principal: Pereira + Eje Cafetero + Colombia
- Dispositivo dominante: móvil (~70%)
- Fuente principal de tráfico: WhatsApp share + Google directo

---

## 14 · Cómo procesar este brief con Claude Design

1. Cargar este archivo como contexto inicial
2. Pedir el sistema de tokens primero (colores + tipo + espaciado) como base
3. Luego el componente atómico "tarjeta de inmueble" con sus 4 variantes
4. Luego cada screen del Tier 1 (landing, ficha)
5. Iterar con validaciones de multi-tenant (probar con 3 colores primarios distintos)
6. Continuar con Tier 2, 3, 4
7. Entregar canvas navegable + export de componentes

---

## Apéndice · Screenshots del estado actual

Adjuntos en la conversación de origen — 2 imágenes que muestran:
1. Landing pública actual con inventario en grid, filtros como chips-dropdown, hero azul con stats
2. Ficha pública actual con galería + info + sticky bottom bar de CTAs

Estos screenshots representan el "punto de partida" — el rediseño debe conservar el flujo pero elevar el diseño a nivel Metrocuadrado / Idealista.

---

**Fin del brief.**

Cualquier ambigüedad, defaulte a: "hacer lo que haría Idealista" (referente principal) o "hacer lo que haría Airbnb en su ficha de propiedad" (para el detail).
