# XSS Sanitization Map — House CRM

## Funciones de sanitización disponibles

| Función | Uso | Ejemplo |
|---------|-----|---------|
| `escapeHtml(text)` | Texto dentro de HTML | `<div>${escapeHtml(p.tipo)}</div>` |
| `safeText(val)` | Null-safe escapeHtml | `safeText(null)` → `''` |
| `escapeAttr(val)` | Valores de atributos | `value="${escapeAttr(p.direccion)}"` |
| `safeUrl(url)` | URLs en href/src | `href="${safeUrl(p.url_metrocuadrado)}"` |
| `allowBasicHtml(html)` | Descripciones (solo b,i,br,p) | `${allowBasicHtml(p.observaciones)}` |
| `safeJsonAttr(json)` | JSON en data-attributes | `data-fotos='${safeJsonAttr(...)}'` |

---

## render() — Campos escapados

### Con escapeHtml() (texto visible)
| Variable | Campo BD | Contexto |
|----------|----------|----------|
| `tip` | `p.tipo` | Nombre del tipo de inmueble |
| `ciu` | `p.ciudad` | Ciudad |
| `ase` | `p.captador.nombre` | Nombre del asesor |
| `cod` | `p.codigo_house` | Código HOUSE-XXX display |
| `dirTxt` | `p.direccion` o `p.direccion_publica` | Ubicación en card |

### Con escapeAttr() (dentro de atributos)
| Variable | Campo BD | Contexto |
|----------|----------|----------|
| `codRaw` | `p.codigo_house` | `onclick="...writeText('${escapeAttr(codRaw)}')..."` |
| `p.id` | UUID | `onclick="solicitarVerif('${escapeAttr(p.id)}')"` |
| `fUrls[0]` | `fotos[].url_thumb` | `<img src="${escapeAttr(url)}">` |

### Con safeJsonAttr()
| Variable | Campo BD | Contexto |
|----------|----------|----------|
| `fUrls` JSON | `fotos[].url_thumb` | `data-fotos='${safeJsonAttr(JSON.stringify(fUrls))}'` |

### NO escapados (seguros por naturaleza)
| Variable | Razón |
|----------|-------|
| `pv, pa` | Números de BD (precio_venta, precio_arriendo) |
| `hab, ban, area, est` | Números (habitaciones, baños, etc.) |
| `dias` | Número calculado (_dias) |
| `fm()` output | String formateado `$NNN,NNN` |
| `emo()` output | Emoji Unicode fijo |
| `idx` | Integer index de array JS |
| `ls.length` | Integer count |
| `solCount` | Integer count |

---

## oM() — Campos escapados

### Con escapeHtml() (texto visible en modo lectura)
| Campo BD | Sección |
|----------|---------|
| `p.tipo` | Header, Características |
| `p.ciudad` | Header, Características |
| `p.direccion` | Características (lectura) |
| `p.direccion_publica` | Características (lectura) |
| `p.captador.nombre` | Asesor, Reasignar |
| `p.propietario_nombre` | Propietario (lectura gestor) |
| `p.propietario_telefono` | Propietario (lectura gestor) |
| `p.propietario_email` | Propietario (lectura gestor) |
| `USERS[].nombre` | Selector de reasignación |
| `USERS[].rol` | Selector de reasignación |
| `PCOLS[].id` | Selector de estado |

### Con escapeAttr() (en atributos value="" y onclick)
| Campo BD | Atributo |
|----------|----------|
| `p.direccion` | `<input value="...">` via inp() helper |
| `p.direccion_publica` | `<input value="...">` via inp() |
| `p.ciudad` | `<input value="...">` via inp() |
| `p.estrato` | `<option>` via sel() |
| `p.precio_venta` | `<input value="...">` via inp() |
| `p.precio_arriendo` | `<input value="...">` via inp() |
| `p.habitaciones` | `<input value="...">` via inp() |
| `p.banos` | `<input value="...">` via inp() |
| `p.area_construida` | `<input value="...">` via inp() |
| `p.area_total` | `<input value="...">` via inp() |
| `p.parqueaderos` | `<input value="...">` via inp() |
| `p.caracteristicas` | `<input value="...">` via inp() |
| `p.propietario_nombre` | `<input value="...">` via inp() |
| `p.propietario_telefono` | `<input value="...">` via inp() |
| `p.propietario_email` | `<input value="...">` via inp() |
| `p.url_metrocuadrado` | `<input value="...">` |
| `p.url_fincaraiz` | `<input value="...">` |
| `p.id` | Todos los onclick handlers |
| `fotos[].id` | `onclick="delFoto('...')"` |
| `fotos[].url` | `<img src="...">` |
| `fotos[].url_thumb` | `<img src="...">` |

### Con safeUrl() (en href de enlaces)
| Campo BD | Contexto |
|----------|----------|
| `p.url_metrocuadrado` | `<a href="...">Abrir ↗</a>` |
| `p.url_fincaraiz` | `<a href="...">Abrir ↗</a>` |

### Con escapeHtml() dentro de textarea
| Campo BD | Razón |
|----------|-------|
| `p.descripcion_privada` | HTML no se renderiza dentro de textarea, pero escapeHtml previene inyección al cerrar el tag textarea |
| `p.descripcion_cliente` | Idem |
| `p.observaciones` | Idem |

### Con allowBasicHtml() (modo lectura de descripciones)
| Campo BD | Contexto |
|----------|----------|
| `p.observaciones` | `<div>...${allowBasicHtml(p.observaciones)}...</div>` en modo lectura |

---

## ldAn() — Anotaciones (también sanitizada)

| Campo BD | Función | Contexto |
|----------|---------|----------|
| `a.autor.nombre` | `escapeHtml()` | Nombre del autor de la anotación |
| `a.texto` | `escapeHtml()` | Contenido de la anotación |

---

## Funciones PENDIENTES de sanitizar (Fase 2)

| # | Función | Campos en riesgo |
|---|---------|-----------------|
| 1 | `rPipe()` | Mismos que render() + s.nota_solicitante, s.solicitante.nombre |
| 2 | `rAl()` | a.titulo, a.mensaje, a.emisor.nombre |
| 3 | `renderBell()` | a.titulo, a.emisor.nombre |
| 4 | `rPort()` | p.tipo, p.ciudad, p.direccion, p.captador.nombre, p.url_* |
| 5 | `rUsers()` | u.nombre, u.email, u.usuario, u.foto |
| 6 | `rDashAdmin()` / `rDashAsesor()` | captador.nombre, p.tipo, p.ciudad |
| 7 | `rConc()` | c.detalle, c.tipo_inmueble, c.ciudad, c.direccion, c.destacado |
| 8 | `ldConcNotas()` | n.texto, n.autor.nombre |
| 9 | `showPublicView()` | p.tipo, p.ciudad, p.direccion_publica, p.descripcion_cliente, p.caracteristicas |
| 10 | `rPapelera()` | p.tipo, p.ciudad, p.captador.nombre |
| 11 | `renderRecent()` | queries de localStorage → onclick injection |
| 12 | `renderWelcome()` | U.nombre |
| 13 | `rPerfil()` | U.nombre, U.email, U.usuario |
| 14 | `shareInm()` | p.tipo, p.ciudad, p.direccion_publica |
| 15 | `rAgenda()` / `renderAgDay()` | e.titulo, e.nota, e.cliente_nombre |
| 16 | `populateAsesorFilter()` | captador.nombre dentro de <option> |
