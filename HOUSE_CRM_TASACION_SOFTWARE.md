# HOUSE CRM — TASACIÓN DE SOFTWARE
## Estimación profesional de valor como CTO/Arquitecto Senior
## Abril 2026

---

# 1. METODOLOGÍA DE TASACIÓN

Se utilizan 3 métodos complementarios:

1. **Costo de reposición** — ¿Cuánto costaría reconstruir desde cero con un equipo LATAM?
2. **Esfuerzo invertido** — Horas reales de desarrollo × tarifa de mercado
3. **Valor funcional** — Valoración por módulo según complejidad y madurez

---

# 2. INVENTARIO TÉCNICO CUANTIFICADO

## 2.1 Código fuente

| Componente | Líneas | Archivos |
|---|---|---|
| functions.js (lógica de negocio) | 4,955 | 1 |
| sections.js (UI/renderers) | 3,156 | 1 |
| App.js (shell/routing/auth bridge) | 635 | 1 |
| load.js (data loading/cards) | 532 | 1 |
| Core modules (auth, notifications, user, moderator, constants) | ~1,200 | 5 |
| Router | ~250 | 1 |
| Config (supabase, cloudinary) | ~200 | 2 |
| Landing page standalone | ~350 | 1 |
| Features modules (pipeline, inventory, agenda, registration) | ~2,500 | ~40 |
| CSS (design system + dark mode) | 610 | 1 |
| SQL migrations | ~800 | 17 |
| **TOTAL** | **~15,200** | **~70** |

## 2.2 Base de datos

| Ítem | Cantidad |
|---|---|
| Tablas en producción | 18+ |
| Columnas en tabla usuarios | 31 |
| Columnas en tabla inmuebles | 74 |
| Migraciones SQL ejecutadas | 17 |
| Índices | 20+ |
| RLS policies | 15+ |
| Triggers | 2 |

## 2.3 Funcionalidades contadas

| Categoría | Funciones window.* | Complejidad |
|---|---|---|
| Gestión inmuebles (CRUD, modal, fotos, share) | ~35 | Alta |
| Pipeline/embudo (kanban, drag&drop, estados) | ~15 | Alta |
| Sistema de roles (5 niveles, upgrade/downgrade) | ~10 | Alta |
| Comisiones flexibles (N participantes, presets) | ~12 | Alta |
| Notificaciones (38 tipos, escalamiento, campana) | ~8 | Alta |
| Moderación PII (análisis texto, cola, aprobación) | ~8 | Media-Alta |
| Intereses/calificación (score automático, formularios) | ~12 | Alta |
| Cierres de negocio (constructor, pagos individuales) | ~10 | Alta |
| Referidos (pipeline, gamificación, pagos, niveles) | ~20 | Alta |
| Auth (Google OAuth, credenciales, reset, onboarding) | ~12 | Media |
| Mensajería contextual (por negocio, tipos visuales) | ~5 | Media |
| Filtros avanzados (pills, precio, búsqueda, debounce) | ~15 | Media |
| Dashboard (KPIs, salud, semáforo, distribución) | ~5 | Media |
| Conciliación portales | ~5 | Media |
| Agenda/citas (bilateral, confirmación) | ~8 | Media |
| Landing de conversión (calculadora interactiva) | ~5 | Media |
| Favoritos + Me interesa (tabs) | ~5 | Baja-Media |
| Mis Negocios (pipeline completo con mensajes inline) | ~8 | Alta |
| Admin sections (Negocios, Arriendos, Config Usuarios) | ~6 | Media |
| Gestión usuarios admin (búsqueda, filtros, roles) | ~8 | Media |
| Configuración permisos (45 × 5 toggle matrix) | ~3 | Media |
| Dark mode (variables + overrides inline) | — | Media |
| SEO/OG (Edge Function, meta tags, rewrites) | — | Media |
| **TOTAL** | **~230** | |

---

# 3. MÉTODO 1: COSTO DE REPOSICIÓN

## 3.1 Equipo necesario para reconstruir desde cero

| Rol | Dedicación | Duración | Salario mensual LATAM (USD) |
|---|---|---|---|
| CTO / Arquitecto Senior | 50% | 5 meses | $4,000 - $6,000 |
| Fullstack Developer Senior | 100% | 5 meses | $3,000 - $4,500 |
| Frontend Developer Mid | 100% | 4 meses | $2,000 - $3,000 |
| Backend/DB Developer Mid | 50% | 3 meses | $2,000 - $3,000 |
| UX/UI Designer | 30% | 2 meses | $1,500 - $2,500 |
| QA Tester | 50% | 2 meses | $1,200 - $1,800 |

## 3.2 Desglose por fase de reconstrucción

| Fase | Duración | Descripción |
|---|---|---|
| 1. Arquitectura + DB | 3 semanas | Schema 18 tablas, 74+ cols inmuebles, RLS, triggers, migraciones |
| 2. Auth + roles | 2 semanas | Google OAuth, credencial, 5 niveles de rol, perfiles dinámicos |
| 3. CRUD inmuebles | 3 semanas | Modal 5 secciones, 74 campos, fotos Cloudinary, share WhatsApp |
| 4. Pipeline/embudo | 2 semanas | Kanban drag&drop, estados, antigüedad, semáforo |
| 5. Filtros avanzados | 2 semanas | 6 pills, búsqueda, precio range, debounce, responsive |
| 6. Dashboard + alertas | 1.5 semanas | KPIs, salud portafolio, alertas por antigüedad, badge |
| 7. Sistema notificaciones | 2 semanas | 38 tipos, escalamiento, campana, bridge legacy |
| 8. Moderación PII | 1.5 semanas | Análisis regex, cola, aprobación, pedir cambios |
| 9. Intereses + calificación | 2 semanas | Formulario financiero, score automático, cola admin |
| 10. Comisiones flexibles | 2 semanas | Constructor N participantes, presets, pagos individuales |
| 11. Referidos completo | 2.5 semanas | Pipeline 7 estados, gamificación 4 niveles, pagos, landing |
| 12. Mensajería contextual | 1.5 semanas | Chat, contexto por negocio, 3 tipos visuales |
| 13. Citas bilaterales | 1 semana | Propuesta, confirmación, cancelación |
| 14. Mis Negocios (cliente) | 2 semanas | Pipeline completo, KPIs, tabs, timeline, mensajes inline |
| 15. Admin sections | 2 semanas | Negocios, Arriendos, Centro Comando, Config Usuarios |
| 16. Gestión usuarios | 1.5 semanas | Búsqueda, filtros, upgrade/downgrade, historial |
| 17. Auth progresiva | 1 semana | Browse-first, 6 momentos, anti-saturación |
| 18. Roles dinámicos | 1 semana | Identificación por acción, 2 momentos UX |
| 19. Landings | 1 semana | /vender (calculadora), /arriendos (filtro), OG tags |
| 20. Portales + conciliación | 1 semana | M²/FR tracking, cruce de datos |
| 21. Agenda | 1 semana | Calendario, eventos, filtros |
| 22. Dark mode + responsive | 1 semana | Variables CSS, overrides, mobile-first |
| 23. Edge Functions + SEO | 1 semana | OG previews, rewrites Vercel, meta tags |
| 24. Testing + deploy | 1.5 semanas | QA, fix bugs, deploy Vercel, DNS |
| **TOTAL** | **~40 semanas** (~10 meses) | |

## 3.3 Cálculo de costo de reposición

### Escenario conservador (LATAM junior-mid, ciudades tier 2)

| Rol | Meses | $/mes | Total |
|---|---|---|---|
| CTO/Arquitecto (50%) | 5 | $2,000 | $10,000 |
| Fullstack Senior (100%) | 5 | $3,000 | $15,000 |
| Frontend Mid (100%) | 4 | $2,000 | $8,000 |
| Backend Mid (50%) | 3 | $1,500 | $4,500 |
| UX/UI (30%) | 2 | $1,000 | $2,000 |
| QA (50%) | 2 | $800 | $1,600 |
| **Subtotal equipo** | | | **$41,100** |
| Infraestructura (Supabase, Cloudinary, Vercel, dominio) | 10 meses | $100 | $1,000 |
| **TOTAL CONSERVADOR** | | | **$42,100 USD** |

### Escenario realista (LATAM mid-senior, Colombia/México/Argentina)

| Rol | Meses | $/mes | Total |
|---|---|---|---|
| CTO/Arquitecto (50%) | 5 | $4,000 | $20,000 |
| Fullstack Senior (100%) | 5 | $4,000 | $20,000 |
| Frontend Mid-Sr (100%) | 4 | $3,000 | $12,000 |
| Backend Mid-Sr (50%) | 3 | $2,500 | $7,500 |
| UX/UI (30%) | 2 | $2,000 | $4,000 |
| QA (50%) | 2 | $1,500 | $3,000 |
| **Subtotal equipo** | | | **$66,500** |
| Infraestructura | 10 meses | $100 | $1,000 |
| Overhead (gestión, comunicación, herramientas) | 15% | | $10,125 |
| **TOTAL REALISTA** | | | **$77,625 USD** |

### Escenario premium (seniors LATAM con experiencia real estate)

| Rol | Meses | $/mes | Total |
|---|---|---|---|
| CTO/Arquitecto (50%) | 5 | $6,000 | $30,000 |
| Fullstack Senior (100%) | 5 | $5,000 | $25,000 |
| Frontend Senior (100%) | 4 | $4,000 | $16,000 |
| Backend Senior (50%) | 3 | $4,000 | $12,000 |
| UX/UI Senior (30%) | 2 | $3,000 | $6,000 |
| QA Senior (50%) | 2 | $2,500 | $5,000 |
| **Subtotal equipo** | | | **$94,000** |
| Infraestructura | 10 meses | $100 | $1,000 |
| Overhead | 20% | | $19,000 |
| **TOTAL PREMIUM** | | | **$114,000 USD** |

---

# 4. MÉTODO 2: ESFUERZO INVERTIDO

## 4.1 Horas estimadas por módulo

| Módulo | Horas dev | Horas diseño | Horas QA | Total |
|---|---|---|---|---|
| Arquitectura + DB (18 tablas, 17 migraciones) | 80 | 0 | 10 | 90 |
| Auth completo (OAuth, credencial, reset, roles) | 60 | 8 | 15 | 83 |
| CRUD inmuebles (74 campos, modal, fotos) | 120 | 20 | 25 | 165 |
| Pipeline/embudo (kanban, drag&drop) | 80 | 15 | 15 | 110 |
| Filtros v6 (pills, precio, responsive) | 60 | 20 | 10 | 90 |
| Dashboard + alertas (KPIs, semáforo) | 40 | 10 | 8 | 58 |
| Notificaciones (38 tipos, escalamiento) | 60 | 5 | 10 | 75 |
| Moderación PII (regex, cola, UI) | 50 | 8 | 10 | 68 |
| Intereses + calificación + score | 60 | 10 | 12 | 82 |
| Comisiones flexibles (constructor, pagos) | 70 | 12 | 15 | 97 |
| Referidos completo (pipeline, gamificación) | 80 | 15 | 15 | 110 |
| Mensajería contextual | 40 | 5 | 8 | 53 |
| Citas bilaterales | 30 | 5 | 8 | 43 |
| Mis Negocios pipeline (KPIs, tabs, mensajes) | 60 | 15 | 12 | 87 |
| Admin sections (3 nuevas) | 50 | 8 | 10 | 68 |
| Gestión usuarios (upgrade/downgrade) | 50 | 10 | 10 | 70 |
| Config permisos (45×5 matrix) | 25 | 5 | 5 | 35 |
| Auth progresiva + roles dinámicos | 35 | 10 | 8 | 53 |
| Landings (/vender, /arriendos) + SEO | 30 | 15 | 5 | 50 |
| Portales + conciliación | 25 | 5 | 5 | 35 |
| Agenda calendario | 30 | 8 | 5 | 43 |
| Dark mode + responsive | 20 | 10 | 8 | 38 |
| Edge Functions + Vercel config | 15 | 0 | 5 | 20 |
| CSS design system (61 variables) | 25 | 15 | 5 | 45 |
| **TOTAL** | **1,175** | **234** | **237** | **1,646 horas** |

## 4.2 Cálculo por tarifa hora LATAM

| Nivel | Tarifa/hora USD | × 1,646 horas | Total |
|---|---|---|---|
| Junior LATAM | $15 | | $24,690 |
| Mid LATAM | $25 | | $41,150 |
| Senior LATAM | $40 | | $65,840 |
| Senior con dominio inmobiliario | $55 | | $90,530 |

**Tarifa promedio ponderada (70% senior + 20% mid + 10% diseño):**
- $40 × 0.70 + $25 × 0.20 + $35 × 0.10 = **$36.50/hora**
- 1,646 × $36.50 = **$60,079 USD**

---

# 5. MÉTODO 3: VALOR FUNCIONAL POR MÓDULO

| Módulo | Madurez | Valor USD |
|---|---|---|
| **Core CRM inmobiliario** (CRUD 74 campos, fotos, share, código HOUSE) | 90% | $12,000 |
| **Pipeline/embudo** (kanban, drag&drop, estados, antigüedad) | 85% | $8,000 |
| **Sistema de roles** (5 niveles, upgrade/downgrade, historial, permisos configurables) | 90% | $7,000 |
| **Comisiones flexibles** (N participantes, %, presets, pagos individuales) | 85% | $6,000 |
| **Notificaciones** (38 tipos, escalamiento, campana, bridge) | 80% | $5,000 |
| **Moderación PII** (análisis automático, cola, aprobación) | 85% | $4,000 |
| **Intereses + calificación** (formulario financiero, score automático) | 80% | $4,000 |
| **Referidos completo** (pipeline, gamificación, pagos, niveles, landing) | 90% | $6,000 |
| **Auth** (Google OAuth, credencial, reset, auth progresiva, roles dinámicos) | 85% | $4,000 |
| **Filtros avanzados** (pills v6, precio, búsqueda, responsive) | 95% | $3,500 |
| **Mensajería contextual** (por negocio, 3 tipos, hilo inline) | 75% | $3,000 |
| **Mis Negocios** (pipeline cliente, KPIs, tabs, timeline, participantes) | 80% | $4,000 |
| **Admin sections** (Negocios, Arriendos, Centro Comando) | 70% | $3,500 |
| **Dashboard** (KPIs, salud, semáforo, distribución) | 80% | $2,500 |
| **Gestión usuarios admin** (búsqueda, filtros, upgrade/downgrade) | 85% | $3,000 |
| **Landing conversión** (calculadora, OG, responsive) | 80% | $2,000 |
| **Agenda/citas** (bilateral, confirmación) | 70% | $2,000 |
| **Portales + conciliación** | 70% | $1,500 |
| **Design system** (CSS variables, dark mode, responsive) | 85% | $2,000 |
| **Infraestructura** (Vercel, Supabase, Edge Functions, Cloudinary) | 90% | $2,000 |
| **Base de datos** (18 tablas, 17 migraciones, RLS) | 90% | $3,000 |
| **TOTAL VALOR FUNCIONAL** | | **$86,000 USD** |

---

# 6. RESUMEN DE TASACIÓN

| Método | Rango USD |
|---|---|
| **Costo de reposición** | $42,100 — $114,000 |
| **Esfuerzo invertido** | $41,150 — $90,530 |
| **Valor funcional** | $86,000 |

## Valor estimado del software

| Escenario | Valor USD | Valor COP (aprox. TRM 4,200) |
|---|---|---|
| **Conservador** (equipo junior LATAM) | **$45,000** | ~$189.000.000 |
| **Realista** (equipo mid-senior LATAM) | **$70,000 — $80,000** | ~$294M — $336M |
| **Premium** (equipo senior + dominio inmobiliario) | **$95,000 — $115,000** | ~$399M — $483M |

### **Valor recomendado: $75,000 — $85,000 USD (~$330M COP)**

Este valor considera:
- 15,200+ líneas de código funcional
- 1,646 horas de desarrollo estimadas
- 18 tablas en producción con data real (39 usuarios, 155 inmuebles)
- 230+ funciones de negocio implementadas
- Sistema de roles con 45 permisos configurables
- Modelo de comisiones flexible único en el mercado colombiano
- Programa de referidos con gamificación completo
- Infraestructura cloud (Supabase + Vercel + Cloudinary) lista para escalar
- Dominio y SEO configurados (OG tags, Edge Functions)

---

# 7. FACTORES QUE INCREMENTAN EL VALOR

| Factor | Impacto |
|---|---|
| **Software en producción con data real** — no es prototipo | +15-20% |
| **Dominio inmobiliario específico** — reglas de negocio colombianas | +10-15% |
| **Modelo marketplace con intermediación** — diferenciador de mercado | +15-20% |
| **Comisiones configurables** — flexibilidad que no tienen portales genéricos | +10% |
| **Programa referidos con gamificación** — motor de crecimiento orgánico | +10% |
| **Auth progresiva** — UX moderna que reduce fricción | +5% |

## Con factores de mercado aplicados

**Valor ajustado: $90,000 — $110,000 USD (~$400M — $460M COP)**

---

# 8. FACTORES QUE REDUCEN EL VALOR

| Factor | Impacto |
|---|---|
| **Código monolítico** — functions.js de 4,955 líneas sin modularizar | -10% |
| **Sin tests** — no hay framework de testing | -10-15% |
| **Inline styles** — dificulta mantenimiento del dark mode | -5% |
| **Auth custom** — no usa Supabase Auth nativo (menos seguro) | -5% |
| **RLS abierto** — toda la seguridad está en el client-side | -10% |
| **Dependencia de un solo desarrollador** — riesgo bus factor | -10% |
| **Sin CI/CD** — no hay pipeline de integración continua | -5% |

---

# 9. COSTO MENSUAL DE MANTENIMIENTO

| Concepto | USD/mes |
|---|---|
| Supabase (Free → Pro si escala) | $0 — $25 |
| Vercel (Free tier) | $0 |
| Cloudinary (Free tier) | $0 |
| Dominio | ~$2 |
| Desarrollador mantenimiento (10-20h/mes) | $400 — $1,000 |
| **TOTAL** | **$400 — $1,025/mes** |

---

# 10. CONCLUSIÓN

## Valor final recomendado para tasación

| Concepto | Valor |
|---|---|
| **Valor base del software** | **$75,000 — $85,000 USD** |
| **Con factores de mercado** | **$90,000 — $110,000 USD** |
| **Con factores de reducción** | **$65,000 — $85,000 USD** |
| **Valor justo de mercado** | **$75,000 USD (~$315.000.000 COP)** |

### En resumen:

Un equipo de 4-5 personas en LATAM tardaría **8-10 meses** en reconstruir este software desde cero, con un costo de **$70,000 — $115,000 USD** dependiendo del nivel de experiencia. El software está en producción con data real, tiene un modelo de negocio diferenciado (intermediación activa), y resuelve problemas específicos del mercado inmobiliario colombiano que no existen en soluciones genéricas.

---

## FIN DE LA TASACIÓN
