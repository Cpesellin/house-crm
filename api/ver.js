// ============================================================
// HOUSE CRM — Vercel Serverless Function: /api/ver
//
// Genera HTML con Open Graph meta tags dinámicos para que las
// previews de WhatsApp / Facebook / Telegram muestren la foto
// y el precio del inmueble en lugar del logo genérico.
// ============================================================

const SITE_URL = 'https://inmobiliariahouse.com.co';
const FALLBACK_OG = `${SITE_URL}/img/og-image.png`;

// Lee env vars de varios nombres por compatibilidad (Vercel suele
// exponer las VITE_* al runtime también, pero por si acaso).
function getEnv() {
  const e = process.env || {};
  return {
    url: e.VITE_SUPA_URL || e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || '',
    key: e.VITE_SUPA_KEY || e.SUPABASE_PUBLISHABLE_KEY || e.SUPABASE_ANON_KEY || e.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cloudinaryOG(url) {
  if (!url || typeof url !== 'string') return FALLBACK_OG;
  if (url.indexOf('res.cloudinary.com/') === -1) return url;
  // Optimizado para WhatsApp/FB scraper:
  //   - 1200x630: dimensión recomendada por OpenGraph
  //   - c_fill: rellena el frame, recortando si es necesario
  //   - g_auto: gravity automático (centra en zonas de interés)
  //   - q_auto:good: calidad alta pero compatible con todo
  //   - f_jpg: forzar JPEG (algunas versiones viejas de WhatsApp no leen WebP)
  //   - fl_progressive: progressive JPEG (carga incremental, más confiable)
  //   - dpr_2.0: alta resolución para Retina
  const params = 'w_1200,h_630,c_fill,g_auto,q_auto:good,f_jpg,fl_progressive';
  const transformRx = /\/upload\/[^/]*\b(?:w_|h_|c_|q_|f_|dpr_|ar_|g_|e_|fl_)[^/]*\//;
  if (transformRx.test(url)) return url.replace(transformRx, `/upload/${params}/`);
  return url.replace('/upload/', `/upload/${params}/`);
}

function fmtCOP(n) {
  if (!n || n <= 0) return '';
  try { return '$' + Math.round(n).toLocaleString('es-CO'); }
  catch (_) { return '$' + Math.round(n); }
}

function precioTxt(p) {
  const v = fmtCOP(p.precio_venta), a = fmtCOP(p.precio_arriendo);
  if (v && a) return v + ' venta · ' + a + '/mes';
  if (v) return v + ' venta';
  if (a) return a + '/mes arriendo';
  return 'Consulta el precio';
}

function tituloInmueble(p) {
  const tipo = p.tipo || 'Inmueble';
  const ubic = p.barrio || p.ciudad || '';
  return ubic ? (tipo + ' en ' + ubic) : tipo;
}

// NOTA: tituloPreview() y descripcionInmueble() están sin usar desde que
// la tarjeta se dejó sólo con la foto (el mensaje ya lleva la ficha en
// viñetas). Se conservan porque devolver el titular a la tarjeta es
// cambiar las dos líneas del renderHTML de más abajo.
//
// Título del preview. En WhatsApp es la línea en negrita bajo la foto y
// muchas veces lo único que se lee antes de decidir si abrir el enlace,
// así que lleva lo que decide: qué es, cuántas alcobas, dónde y CUÁNTO.
// Antes decía sólo "Apartamento en Álamos" y el precio quedaba escondido
// en la descripción.
function tituloPreview(p) {
  const tipo = String(p.tipo || 'Inmueble').toUpperCase();
  const neg = String(p.negociacion || '').toLowerCase();
  const accion = neg.includes('arriendo') && !neg.includes('venta') ? 'EN ARRIENDO'
    : neg.includes('venta') && !neg.includes('arriendo') ? 'EN VENTA'
    : 'EN VENTA Y ARRIENDO';

  const hab = p.habitaciones
    ? p.habitaciones + (Number(p.habitaciones) === 1 ? ' HABITACIÓN' : ' HABITACIONES')
    : '';

  // Recortado: hay ciudades guardadas con espacios de sobra ('Pereira ')
  // y aparecían en el título como "REBECA, PEREIRA ".
  const ubic = [p.barrio, p.ciudad]
    .map(function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); })
    .filter(Boolean).join(', ').toUpperCase();

  // Un precio a secas se lee como precio de venta. Si el que mostramos es
  // el arriendo lleva "/mes", que si no un local en venta Y arriendo
  // aparenta venderse por el valor de un mes.
  const arriendo = fmtCOP(p.precio_arriendo);
  const venta = fmtCOP(p.precio_venta);
  const precio = neg.includes('arriendo') && arriendo ? arriendo + '/mes'
    : venta || (arriendo ? arriendo + '/mes' : '');

  const cabeza = [tipo, accion, hab, ubic && '· ' + ubic].filter(Boolean).join(' ');
  return precio ? cabeza + ' - ' + precio : cabeza;
}

// Segunda línea de la vista previa.
//
// Repetía la ficha (precio, alcobas, baños, m², estrato) — exactamente lo
// mismo que el mensaje lista debajo en viñetas, así que el lector veía dos
// veces los mismos datos y ninguna aportaba nada.
//
// Cuando el inmueble tiene descripción para el cliente se usa ésa: cuenta
// lo que las viñetas no pueden (el sector, el condominio, los acabados) y
// es lo que hace que alguien abra el enlace. Sin descripción se mantiene la
// ficha, que es mejor que dejar la línea vacía.
function resumenComercial(p) {
  const d = String(p.descripcion_cliente == null ? '' : p.descripcion_cliente)
    .replace(/\s+/g, ' ')
    .trim();
  if (d.length < 40) return '';           // demasiado corta para aportar
  if (d.length <= 180) return d;
  // Cortar en el último espacio para no partir una palabra.
  const cortado = d.slice(0, 180);
  const sp = cortado.lastIndexOf(' ');
  return (sp > 120 ? cortado.slice(0, sp) : cortado) + '…';
}

function descripcionInmueble(p) {
  const comercial = resumenComercial(p);
  if (comercial) return comercial;

  const det = [];
  if (p.habitaciones) det.push(p.habitaciones + ' hab');
  if (p.banos) det.push(p.banos + (Number(p.banos) === 1 ? ' baño' : ' baños'));
  if (p.parqueaderos) det.push(p.parqueaderos + (p.parqueaderos === 1 ? ' garaje' : ' garajes'));
  if (p.area_construida) det.push(p.area_construida + ' m²');
  if (p.estrato) det.push('Estrato ' + p.estrato);
  return [precioTxt(p), det.join(' · ')].filter(Boolean).join(' — ');
}

function renderHTML(opts) {
  const t = esc(opts.title);
  const d = esc(opts.description);
  const i = esc(opts.image);
  const u = esc(opts.canonical);
  const altText = esc(opts.imageAlt || opts.title);
  const redirectTo = opts.redirectTo || opts.canonical;
  const r = esc(redirectTo);
  return '<!DOCTYPE html>\n<html lang="es"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + t + '</title>' +
    '<link rel="canonical" href="' + u + '">' +
    // Preconnect a Cloudinary para que el bot pueda fetchear la imagen rápido
    '<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>' +
    '<link rel="dns-prefetch" href="https://res.cloudinary.com">' +
    // Open Graph (Facebook, WhatsApp, LinkedIn, Telegram)
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + u + '">' +
    '<meta property="og:title" content="' + t + '">' +
    // La descripción se omite si viene vacía: WhatsApp deja entonces esa
    // línea fuera de la tarjeta en vez de pintarla en blanco.
    (d ? '<meta property="og:description" content="' + d + '">' : '') +
    '<meta property="og:image" content="' + i + '">' +
    '<meta property="og:image:url" content="' + i + '">' +
    '<meta property="og:image:secure_url" content="' + i + '">' +
    // Sólo se declara el tamaño cuando lo garantizamos: la transformación
    // de Cloudinary devuelve exactamente 1200x630. Para una foto servida
    // desde otro sitio (las viejas de Google Drive) anunciar esa medida es
    // mentirle al scraper y el preview puede salir recortado o pequeño.
    (opts.sizedOG
      ? '<meta property="og:image:width" content="1200">' +
        '<meta property="og:image:height" content="630">' +
        '<meta property="og:image:type" content="image/jpeg">'
      : '') +
    '<meta property="og:image:alt" content="' + altText + '">' +
    '<meta property="og:locale" content="es_CO">' +
    '<meta property="og:site_name" content="Inmobiliaria House">' +
    // Twitter Card (también lo usan algunos clientes)
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + t + '">' +
    (d ? '<meta name="twitter:description" content="' + d + '">' : '') +
    '<meta name="twitter:image" content="' + i + '">' +
    '<meta name="twitter:image:alt" content="' + altText + '">' +
    // Redirect humano (los bots ignoran refresh y JS)
    '<meta http-equiv="refresh" content="0;url=' + r + '">' +
    '<script>window.location.replace(' + JSON.stringify(redirectTo) + ');</script>' +
    '</head><body style="margin:0;font-family:system-ui">' +
    // Imagen visible para ayuda visual + fallback para clientes que no parsean OG
    '<div style="text-align:center;padding:32px"><img src="' + i + '" alt="' + altText + '" style="max-width:100%;height:auto;border-radius:8px"><p>Redirigiendo a <a href="' + r + '">' + t + '</a>…</p></div>' +
    '</body></html>';
}

function fallbackHtml(canonical) {
  return renderHTML({
    title: 'Inmobiliaria House · Asesores Inmobiliarios',
    description: 'Casas, apartamentos, fincas y locales en Pereira y el Eje Cafetero.',
    image: FALLBACK_OG,
    canonical: canonical || SITE_URL,
  });
}

export default async function handler(req, res) {
  // Cualquier excepción no controlada debe devolver fallback, no 500.
  try {
    const ref = ((req.query && req.query.ref) || '').toString().trim();
    const canonical = ref
      ? (SITE_URL + '/ver/' + encodeURIComponent(ref))
      : SITE_URL;

    if (!ref) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send(fallbackHtml(canonical));
    }

    const env = getEnv();
    if (!env.url || !env.key) {
      console.error('[/api/ver] missing env vars', {
        hasUrl: !!env.url, hasKey: !!env.key,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=30');
      return res.status(200).send(fallbackHtml(canonical));
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    const filter = isUuid
      ? 'id=eq.' + ref
      : 'codigo_house=eq.' + encodeURIComponent(ref);

    const sbUrl = env.url.replace(/\/+$/, '') +
      '/rest/v1/inmuebles?' + filter +
      '&eliminado=eq.false' +
      '&select=id,codigo_house,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,parqueaderos,area_construida,estrato,descripcion_cliente,updated_at,fotos(url,url_thumb,orden,id)' +
      '&limit=1';

    let p = null;
    try {
      const r = await fetch(sbUrl, {
        headers: {
          'apikey': env.key,
          'Authorization': 'Bearer ' + env.key,
          'Accept': 'application/json',
        },
      });
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) p = rows[0];
      } else {
        console.error('[/api/ver] supabase status', r.status);
      }
    } catch (eFetch) {
      console.error('[/api/ver] fetch error', eFetch && eFetch.message);
    }

    if (!p) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send(fallbackHtml(canonical));
    }

    const fotos = Array.isArray(p.fotos)
      ? p.fotos.slice().sort(function(a, b) { return (a.orden || 0) - (b.orden || 0); })
      : [];
    const rawImg = fotos.length ? (fotos[0].url || fotos[0].url_thumb) : null;
    const ogImage = rawImg ? cloudinaryOG(rawImg) : FALLBACK_OG;
    // Sólo Cloudinary nos deja fijar el encuadre a 1200x630.
    const sizedOG = ogImage.indexOf('res.cloudinary.com/') !== -1;

    // Canonical = URL "linda" estable (lo que ven WhatsApp/Facebook al scrapear).
    // RedirectTo = ficha v2 con hash route (lo que el navegador del humano carga).
    // Preferimos el código HOUSE-XXX en el redirect para que la URL sea legible.
    const codeForUrl = p.codigo_house || ref;
    const redirectTo = SITE_URL + '/#/p/' + encodeURIComponent(codeForUrl);

    const html = renderHTML({
      // La tarjeta se queda con la foto y nada más.
      //
      // Antes llevaba el titular con el precio y una segunda línea con la
      // ficha; el mensaje repite las dos cosas justo debajo, en viñetas.
      // Ver dos veces lo mismo no aporta y alarga el mensaje.
      //
      // No se deja el título en blanco del todo: sin ningún título
      // WhatsApp puede decidir no dibujar la tarjeta, y con ella se iría
      // la foto. Se pone la marca, que es lo único que el texto de abajo
      // no repite.
      title: 'Inmobiliaria House',
      description: '',
      image: ogImage,
      sizedOG: sizedOG,
      imageAlt: tituloInmueble(p) + ' - foto del inmueble',
      canonical: canonical,
      redirectTo: redirectTo,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Generar esta página en frío cuesta ~3,5s (arranque de la función +
    // consulta a la base). WhatsApp no espera tanto: si al pedirla no la
    // encuentra lista, el mensaje sale sin foto.
    //
    // Con ?v= la URL ya identifica una versión concreta del inmueble (el
    // botón Compartir la arma con updated_at), así que su contenido no
    // puede quedar desactualizado: si el inmueble cambia, cambia la URL.
    // Por eso se guarda un día entero y sólo el primero en compartir paga
    // la espera — y ni ése, porque compartir pide la página de antemano.
    //
    // Sin ?v= (alguien escribió la dirección a mano) se mantiene el
    // caché corto: esa URL no distingue versiones.
    const versionada = !!(req.query && req.query.v);
    res.setHeader(
      'Cache-Control',
      versionada
        ? 'public, s-maxage=86400, stale-while-revalidate=604800'
        : 'public, s-maxage=60, stale-while-revalidate=300'
    );
    return res.status(200).send(html);

  } catch (e) {
    console.error('[/api/ver] uncaught', e && (e.stack || e.message || e));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).send(fallbackHtml(SITE_URL));
  }
}
