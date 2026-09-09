/**
 * HOME — portada del portafolio
 * ══════════════════════════════════════════════════════════════════════
 *
 * QUÉ SUSTITUYE
 *   La entrada del visitante era la lista completa: 173 tarjetas seguidas,
 *   38.143 px de alto, sin secciones ni jerarquía. Quien llegaba sin saber
 *   qué buscar sólo podía desplazarse.
 *
 * DE DÓNDE SALE LA ESTRUCTURA
 *   Del análisis del home de Fincaraiz, tomando su USABILIDAD y no su
 *   posicionamiento:
 *
 *     · Buscador protagonista con modalidad + tipo + texto en una línea.
 *     · Atajo "buscar por código" — aquí pesa más que allá: los asesores
 *       comparten HOUSE-xxx por WhatsApp todo el día.
 *     · Carrusel horizontal de últimos ingresos: muestra cuatro y deja
 *       claro que hay más, sin alargar la página.
 *     · Entradas para explorar por sector y por tipo, para quien no trae
 *       una búsqueda en mente.
 *
 *   Lo que NO se copia, y por qué:
 *
 *     · Su pestaña de Arriendo funciona con miles de fichas; aquí hay 9.
 *       Las pestañas muestran el conteo real para no prometer inventario
 *       que no existe.
 *     · Su bloque de ciudades (Bogotá, Medellín, Cali…) no tiene
 *       equivalente: sólo tres ciudades pasan de 3 inmuebles. Se cambia
 *       por sectores, que es como se busca en Pereira.
 *     · Sin banners de pauta: ellos venden publicidad, nosotros inmuebles.
 *
 * DECISIÓN SOBRE LAS FICHAS SIN FOTO
 *   73 de 173 no tienen fotos (42%). En las secciones del home sólo entran
 *   las que sí, porque una portada de marcadores grises no vende. Siguen
 *   estando al explorar y al buscar: no se esconde inventario, se elige qué
 *   se pone en la portada.
 *
 * TODOS LOS CONTEOS SE CALCULAN AL PINTAR
 *   Nada de números escritos a mano: salen de window.D en cada render, así
 *   que no se quedan viejos cuando el portafolio cambia.
 */

import { icon } from '../ui/icons.js';
import { getCurrentTenant } from '../tenant/current.js';

const D = () => window.D || [];
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const titulo = (s) => {
  const t = norm(s).toLowerCase();
  return t.replace(/(^|\s|\()([a-záéíóúñ])/g, (m) => m.toUpperCase());
};
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmt = (n) => {
  const v = Number(n);
  if (!v || v <= 0) return null;
  try { return '$' + Math.round(v).toLocaleString('es-CO'); }
  catch (e) { return '$' + Math.round(v); }
};

const esVenta = (p) => /venta/i.test(p.negociacion || '');
const esArriendo = (p) => /arriendo|renta/i.test(p.negociacion || '');
const conFoto = (p) => Array.isArray(p.fotos) && p.fotos.length > 0;

/** Precio a mostrar: el de la modalidad que el inmueble ofrece. */
function precioDe(p) {
  const a = fmt(p.precio_arriendo);
  const v = fmt(p.precio_venta);
  if (esArriendo(p) && a) return { txt: a, suf: '/mes' };
  if (v) return { txt: v, suf: '' };
  if (a) return { txt: a, suf: '/mes' };
  return { txt: 'Consúltanos', suf: '' };
}

// ══════════════════════════════════════════════════════════════════════
// Conteos reales
// ══════════════════════════════════════════════════════════════════════

function conteos() {
  const d = D();
  const venta = d.filter((p) => esVenta(p) && !esArriendo(p)).length;
  const arriendo = d.filter((p) => esArriendo(p) && !esVenta(p)).length;

  const porClave = (campo, minimo) => {
    const m = new Map();
    d.forEach((p) => {
      const k = titulo(p[campo]);
      if (!k) return;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()]
      .filter(([, n]) => n >= minimo)
      .sort((a, b) => b[1] - a[1]);
  };

  return {
    total: d.length,
    venta,
    arriendo,
    sectores: porClave('barrio', 3).slice(0, 8),
    tipos: porClave('tipo', 1).slice(0, 8),
  };
}

// ══════════════════════════════════════════════════════════════════════
// Buscar
// ══════════════════════════════════════════════════════════════════════

/**
 * Aplica los filtros elegidos en el home y lleva al listado.
 *
 * Reutiliza el motor que ya existe (window.F + doSearch) en vez de
 * duplicar la lógica de filtrado: F.ciu y F.tipo comparan por subcadena,
 * así que sirven aunque la ciudad esté guardada como 'PEREIRA' o
 * 'Pereira '.
 */
function buscar({ neg, tipo, barrio, texto } = {}) {
  const F = window.F;
  if (F) {
    F.neg.clear(); F.ciu.clear(); F.tipo.clear();
    if (F.barrio) F.barrio.clear();
    if (neg) F.neg.add(neg);
    if (tipo) F.tipo.add(String(tipo).toLowerCase());
    if (barrio && F.barrio) F.barrio.add(barrio);
  }
  window._myFilter = false;
  window._favFilterActive = false;
  window._tiempoFiltro = null;

  irAlListado(texto);
}

/** Salta al listado y dispara la búsqueda con el texto indicado. */
function irAlListado(texto) {
  const destino = window.userStore?.get() ? 'inv' : 'portafolio';
  if (typeof window.go === 'function') window.go(destino);
  else location.hash = '#/' + destino;

  // El campo #q vive en la sección del listado, que puede acabar de
  // montarse: se espera un tick antes de escribir en él.
  setTimeout(() => {
    const q = document.getElementById('q');
    if (q) q.value = texto || '';
    if (typeof window.renderPanel === 'function') {
      try { window.updatePills && window.updatePills(); } catch (e) { /* noop */ }
    }
    if (typeof window.doSearch === 'function') window.doSearch();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, 60);
}

// ══════════════════════════════════════════════════════════════════════
// Piezas
// ══════════════════════════════════════════════════════════════════════

/** Tarjeta de inmueble para los carruseles. */
function tarjeta(p) {
  const pr = precioDe(p);
  const foto = (p.fotos || [])
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))[0];
  const img = foto ? (foto.url_thumb || foto.url) : '';
  const ubic = [titulo(p.barrio), titulo(p.ciudad)].filter(Boolean).join(' · ');
  const modo = esArriendo(p) && !esVenta(p) ? 'En arriendo'
    : esVenta(p) && !esArriendo(p) ? 'En venta' : 'Venta o arriendo';

  // Singular cuando toca: la maqueta mostraba "1 baños", y es el mismo
  // descuido que ya habíamos corregido en el mensaje de WhatsApp.
  const pl = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;
  const especs = [
    p.habitaciones ? pl(p.habitaciones, 'alcoba', 'alcobas') : '',
    p.banos ? pl(p.banos, 'baño', 'baños') : '',
    p.area_construida ? `${p.area_construida} m²` : '',
  ].filter(Boolean).join(' · ');

  // Frase descriptiva al final, como en el diseño: al ojo le sirve más
  // cuánto cuesta y dónde queda antes de qué es.
  const modoTx = esArriendo(p) && !esVenta(p) ? 'en arriendo'
    : esVenta(p) && !esArriendo(p) ? 'en venta' : 'en venta o arriendo';
  const donde = titulo(p.barrio) || titulo(p.ciudad);
  const frase = `${titulo(p.tipo) || 'Inmueble'} ${modoTx}${donde ? ' en ' + donde : ''}`;

  const ref = esc(p.codigo_house || p.id);

  return `<article class="hm-card" onclick="window._hmAbrir('${ref}')" tabindex="0"
      onkeydown="if(event.key==='Enter')window._hmAbrir('${ref}')"
      aria-label="${esc(titulo(p.tipo))} en ${esc(ubic)}">
    <div class="hm-card-img">
      ${img
        ? `<img src="${esc(window.cldOpt ? window.cldOpt(img, 520) : img)}" alt="${esc(titulo(p.tipo))} en ${esc(ubic)}" loading="lazy">`
        : `<div class="hm-nofoto">${icon('camera', 22)}</div>`}
      <span class="hm-modo">${modo}</span>
    </div>
    <div class="hm-card-body">
      <div class="hm-precio">${esc(pr.txt)}<span>${esc(pr.suf)}</span></div>
      <div class="hm-ubic">${icon('pin', 12)}${esc(ubic)}</div>
      ${especs ? `<div class="hm-especs">${esc(especs)}</div>` : ''}
      <div class="hm-frase">${esc(frase)}</div>
    </div>
  </article>`;
}

/** Carrusel con flechas. En el teléfono se desliza con el dedo. */
function carrusel(id, lista) {
  if (!lista.length) return '';
  return `<div class="hm-carr-wrap">
    <button class="hm-flecha hm-izq" aria-label="Anterior" onclick="window._hmScroll('${id}',-1)">${icon('chevronLeft', 18)}</button>
    <div class="hm-carr" id="${id}">${lista.map(tarjeta).join('')}</div>
    <button class="hm-flecha hm-der" aria-label="Siguiente" onclick="window._hmScroll('${id}',1)">${icon('chevronRight', 18)}</button>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Render
// ══════════════════════════════════════════════════════════════════════

export function renderHomeV2(container) {
  const cont = container || document.getElementById('homeC');
  if (!cont) return;

  const c = conteos();

  // ── Marca del inquilino ────────────────────────────────────────────
  //
  // Nada de "Pereira" ni "Inmobiliaria House" escrito aquí: el home es de
  // marca blanca y un inquilino de Bucaramanga no puede leer "Eje
  // Cafetero". Todo sale de su ficha, con respaldos por si un campo está
  // vacío (los inquilinos nuevos entran con lo mínimo).
  const t = getCurrentTenant() || {};
  const marca = {
    nombre: t.nombre || 'Inmobiliaria',
    ciudad: t.ciudad || '',
    lema: t.lema || '',
    heroFoto: t.hero_foto_url || '',
  };
  // El titular admite la ciudad como variable, y funciona sin ella: nunca
  // se mete el nombre del inquilino dentro de la frase, porque con un
  // nombre largo se rompe.
  const titular = marca.ciudad
    ? `Encuentra tu inmueble en <span>${esc(marca.ciudad)}</span>`
    : 'Encuentra tu próximo inmueble';
  const d = D();

  // Sólo con foto: una portada de marcadores grises no vende. Los demás
  // siguen apareciendo al explorar.
  const conFotos = d.filter(conFoto);
  const recientes = conFotos
    .slice()
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 10);

  const arriendos = conFotos.filter((p) => esArriendo(p)).slice(0, 10);

  // Sólo iconos que existen en ui/icons.js: el set no trae building,
  // tree, briefcase ni store, y pedir uno inexistente pinta un hueco.
  const tipoIcono = {
    'Casa': 'home', 'Apartamento': 'grid', 'Casa Campestre': 'home',
    'Apartaestudio': 'grid', 'Lote': 'area', 'Finca': 'home',
    'Oficina': 'grid', 'Local Comercial': 'tag',
  };

  cont.innerHTML = `
  <!-- ═══════════════════ BUSCADOR PROTAGONISTA ═══════════════════ -->
  <section class="hm-hero${marca.heroFoto ? ' con-foto' : ''}"
           ${marca.heroFoto ? `style="--hm-hero-foto:url('${esc(marca.heroFoto)}')"` : ''}>
    <div class="hm-hero-in">
      <h1 class="hm-h1">${titular}</h1>
      <p class="hm-sub">${c.total} ${c.total === 1 ? 'inmueble verificado' : 'inmuebles verificados'}, con asesor que te acompaña.</p>

      <!-- Modalidad con el conteo real: prometer una pestaña de arriendo
           llena cuando hay 9 se descubre al primer clic. -->
      <div class="hm-tabs" role="tablist" aria-label="Modalidad">
        <button class="hm-tab is-on" role="tab" aria-selected="true" data-neg="" onclick="window._hmTab(this)">
          Todos <b>${c.total}</b>
        </button>
        <button class="hm-tab" role="tab" aria-selected="false" data-neg="venta" onclick="window._hmTab(this)">
          Venta <b>${c.venta}</b>
        </button>
        <button class="hm-tab" role="tab" aria-selected="false" data-neg="arriendo" onclick="window._hmTab(this)">
          Arriendo <b>${c.arriendo}</b>
        </button>
      </div>

      <div class="hm-buscador">
        <select id="hmTipo" aria-label="Tipo de inmueble">
          <option value="">Cualquier tipo</option>
          ${c.tipos.map(([t, n]) => `<option value="${esc(t)}">${esc(t)} (${n})</option>`).join('')}
        </select>
        <input id="hmTexto" type="search" placeholder="Barrio, sector o palabra clave"
               aria-label="Barrio, sector o palabra clave"
               onkeydown="if(event.key==='Enter')window._hmBuscar()">
        <button class="hm-btn-buscar" onclick="window._hmBuscar()" aria-label="Buscar">
          ${icon('search', 19)}<span>Buscar</span>
        </button>
      </div>

      <!-- Atajo por código: aquí vale más que en un portal nacional,
           porque los asesores comparten HOUSE-xxx por WhatsApp. -->
      <div class="hm-codigo">
        <input id="hmCodigo" type="text" placeholder="HOUSE-259" aria-label="Código del inmueble"
               onkeydown="if(event.key==='Enter')window._hmPorCodigo()">
        <button onclick="window._hmPorCodigo()">Buscar por código</button>
      </div>
    </div>
  </section>

  <!-- ══════════════════════ ÚLTIMOS INGRESOS ═════════════════════ -->
  ${recientes.length ? `
  <section class="hm-sec">
    <div class="hm-sec-head">
      <div>
        <div class="hm-rotulo">Recién publicados</div>
        <h2>Últimos ingresos</h2>
      </div>
      <button class="hm-vertodo" onclick="window._hmVerTodo()">Ver todo ${icon('chevronRight', 15)}</button>
    </div>
    ${carrusel('hmCarrNuevos', recientes)}
  </section>` : ''}

  <!-- ════════════════════════ POR SECTOR ═════════════════════════ -->
  ${c.sectores.length ? `
  <section class="hm-sec hm-gris">
    <div class="hm-sec-head">
      <div>
        <div class="hm-rotulo">Dónde buscas</div>
        <h2>Explora por sector</h2>
      </div>
    </div>
    <div class="hm-chips">
      ${c.sectores.map(([b, n]) => `
        <button class="hm-chip" onclick="window._hmSector('${esc(b)}')">
          ${icon('pin', 14)}<span>${esc(b)}</span><b>${n}</b>
        </button>`).join('')}
    </div>
  </section>` : ''}

  <!-- ═════════════════════════ POR TIPO ══════════════════════════ -->
  <section class="hm-sec">
    <div class="hm-sec-head">
      <div>
        <div class="hm-rotulo">Qué buscas</div>
        <h2>Por tipo de inmueble</h2>
      </div>
    </div>
    <div class="hm-tipos">
      ${c.tipos.map(([t, n]) => `
        <button class="hm-tipo-card" onclick="window._hmTipo('${esc(t)}')">
          <span class="hm-tipo-ic">${icon(tipoIcono[t] || 'home', 22)}</span>
          <span class="hm-tipo-tx"><b>${esc(t)}</b><span>${n} ${n === 1 ? 'inmueble' : 'inmuebles'}</span></span>
        </button>`).join('')}
    </div>
  </section>

  <!-- ══════════════════════ EN ARRIENDO ══════════════════════════ -->
  ${arriendos.length ? `
  <section class="hm-sec hm-gris">
    <div class="hm-sec-head">
      <div>
        <div class="hm-rotulo">Para vivir ya</div>
        <h2>En arriendo</h2>
      </div>
      <button class="hm-vertodo" onclick="window._hmTab(null,'arriendo')">Ver los ${c.arriendo} ${icon('chevronRight', 15)}</button>
    </div>
    ${carrusel('hmCarrArr', arriendos)}
  </section>` : ''}

  <!-- ═══════════════ LO QUE UN PORTAL NO HACE ════════════════════ -->
  <!-- Nuestro argumento es el contrario al de un portal nacional: no
       competimos por volumen. Esta franja lo dice donde se decide. -->
  <section class="hm-marino">
    <div class="hm-sec-head hm-centro">
      <div class="hm-rotulo claro">Por qué con nosotros</div>
      <h2>Lo que un portal no hace</h2>
      <p class="hm-sub claro">Publicar es fácil. Acompañar hasta la firma es el trabajo.</p>
    </div>
    <div class="hm-3">
      <div class="hm-vent">
        <span class="hm-vent-ic">${icon('check', 20)}</span>
        <h3>Verificamos cada ficha</h3>
        <p>Visitamos el inmueble y levantamos los datos. No publicamos lo que no hemos visto.</p>
      </div>
      <div class="hm-vent">
        <span class="hm-vent-ic">${icon('user', 20)}</span>
        <h3>Filtramos a los curiosos</h3>
        <p>Al inmueble sólo llega quien tiene con qué, y siempre con un asesor de House.</p>
      </div>
      <div class="hm-vent">
        <span class="hm-vent-ic">${icon('pin', 20)}</span>
        <h3>Tenemos oficina</h3>
        <p>${esc(t.direccion || marca.ciudad || 'Nuestra oficina')}. Puedes venir, sentarte y preguntar mirando a alguien a la cara.</p>
      </div>
    </div>
    ${marca.lema ? `<div class="hm-lema">${esc(marca.lema)}</div>` : ''}
    <div class="hm-cta-fila">
      <a class="hm-btn-claro" href="/publicamos">Quiero que publiquen mi inmueble</a>
      <a class="hm-btn-linea" href="https://wa.me/573105922763?text=Hola%2C%20quiero%20asesor%C3%ADa" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
    </div>
  </section>
  `;

  // El carrusel arranca a la izquierda aunque se vuelva a esta vista.
  requestAnimationFrame(() => {
    ['hmCarrNuevos', 'hmCarrArr'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollLeft = 0;
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
// Cableado en window (onclick inline, como el resto del CRM)
// ══════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.renderHomeV2 = renderHomeV2;
  window.rHome = () => renderHomeV2();

  window._hmNeg = '';

  window._hmTab = function (btn, neg) {
    if (btn) {
      document.querySelectorAll('.hm-tab').forEach((b) => {
        b.classList.remove('is-on');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-on');
      btn.setAttribute('aria-selected', 'true');
      window._hmNeg = btn.dataset.neg || '';
      return;
    }
    // Llamada directa desde "Ver los 9": filtra y salta al listado.
    buscar({ neg: neg || '' });
  };

  window._hmBuscar = function () {
    const tipo = document.getElementById('hmTipo')?.value || '';
    const texto = document.getElementById('hmTexto')?.value || '';
    buscar({ neg: window._hmNeg, tipo, texto });
  };

  window._hmSector = function (barrio) {
    // Filtro exacto por barrio, no búsqueda de texto: con texto el chip
    // decía "Cerritos 5" y devolvía 10, porque el buscador también mira
    // la descripción comercial.
    buscar({ barrio });
  };

  window._hmTipo = function (t) {
    buscar({ tipo: t });
  };

  window._hmVerTodo = function () {
    buscar({});
  };

  window._hmAbrir = function (ref) {
    if (typeof window.oM === 'function') window.oM(ref);
    else location.hash = '#/p/' + encodeURIComponent(ref);
  };

  window._hmPorCodigo = function () {
    const el = document.getElementById('hmCodigo');
    let v = (el?.value || '').trim().toUpperCase();
    if (!v) { el?.focus(); return; }
    // Se acepta "259" o "house 259": el asesor no siempre copia el formato.
    if (/^\d+$/.test(v)) v = 'HOUSE-' + v.padStart(3, '0');
    v = v.replace(/\s+/g, '-').replace(/^HOUSE-?/, 'HOUSE-');

    const hit = D().find((p) => String(p.codigo_house || '').toUpperCase() === v);
    if (hit) { window._hmAbrir(hit.codigo_house || hit.id); return; }
    if (window.toast) window.toast(`No encontramos el código ${v}`, 'twarn');
  };

  window._hmScroll = function (id, dir) {
    const el = document.getElementById(id);
    if (!el) return;
    // Se desplaza el ancho de una tarjeta más el hueco.
    const t = el.querySelector('.hm-card');
    const paso = t ? t.getBoundingClientRect().width + 14 : 300;
    el.scrollBy({ left: paso * dir, behavior: 'smooth' });
  };
}

export default { renderHomeV2 };
