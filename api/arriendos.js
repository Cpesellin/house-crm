// ============================================================
// HOUSE CRM — Vercel Serverless Function: /api/arriendos
//
// Enlace para compartir por WhatsApp con TODO lo que hay en arriendo.
//
// La miniatura se arma con datos reales: la foto del arriendo más
// reciente, el número de inmuebles disponibles y el precio más bajo.
// Antes /arriendos servía un HTML estático cuya og:image era
// og-arriendos.png — que resultó ser el logo genérico (mismo MD5 que
// logo.png), así que el enlace se veía igual que cualquier otro.
//
// Los humanos caen en el portafolio ya filtrado por arriendo.
// ============================================================

const SITE_URL = 'https://inmobiliariahouse.com.co';
const FALLBACK_OG = `${SITE_URL}/img/og-image.png`;

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

// Mismos parámetros que /api/ver: f_jpg porque algunas versiones viejas de
// WhatsApp no leen WebP, y progressive para que cargue de forma incremental.
function cloudinaryOG(url) {
  if (!url || typeof url !== 'string') return FALLBACK_OG;
  if (url.indexOf('res.cloudinary.com/') === -1) return url;
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

// Los datos traen la misma ciudad escrita de varias formas —'PEREIRA',
// 'Pereira' y 'Pereira ' conviven en la tabla—, y lo mismo con los tipos.
// Sin normalizar, la tarjeta diría "Pereira y alrededores" habiendo una
// sola ciudad, y listaría "APARTAMENTO, Apartamento" como si fueran dos.
function normalizar(s) {
  const t = String(s || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Valores únicos ya normalizados, preservando el orden de aparición. */
function unicos(lista, campo) {
  const vistos = new Set();
  const out = [];
  for (const it of lista) {
    const v = normalizar(it[campo]);
    if (v && !vistos.has(v)) { vistos.add(v); out.push(v); }
  }
  return out;
}

function renderHTML(o) {
  const t = esc(o.title), d = esc(o.description), i = esc(o.image);
  const u = esc(o.canonical), alt = esc(o.imageAlt || o.title);
  const r = esc(o.redirectTo);
  return '<!DOCTYPE html>\n<html lang="es"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + t + '</title>' +
    '<link rel="canonical" href="' + u + '">' +
    '<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>' +
    '<meta name="description" content="' + d + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + u + '">' +
    '<meta property="og:title" content="' + t + '">' +
    '<meta property="og:description" content="' + d + '">' +
    '<meta property="og:image" content="' + i + '">' +
    '<meta property="og:image:url" content="' + i + '">' +
    '<meta property="og:image:secure_url" content="' + i + '">' +
    '<meta property="og:image:width" content="1200">' +
    '<meta property="og:image:height" content="630">' +
    '<meta property="og:image:type" content="image/jpeg">' +
    '<meta property="og:image:alt" content="' + alt + '">' +
    '<meta property="og:locale" content="es_CO">' +
    '<meta property="og:site_name" content="Inmobiliaria House">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + t + '">' +
    '<meta name="twitter:description" content="' + d + '">' +
    '<meta name="twitter:image" content="' + i + '">' +
    '<meta http-equiv="refresh" content="0;url=' + r + '">' +
    '<script>window.location.replace(' + JSON.stringify(o.redirectTo) + ');</script>' +
    '</head><body style="margin:0;font-family:system-ui">' +
    '<div style="text-align:center;padding:32px">' +
    '<img src="' + i + '" alt="' + alt + '" style="max-width:100%;height:auto;border-radius:8px">' +
    '<p>Redirigiendo a <a href="' + r + '">' + t + '</a>…</p></div>' +
    '</body></html>';
}

export default async function handler(req, res) {
  const canonical = SITE_URL + '/arriendos';
  // Los humanos llegan aquí sólo si su cliente se anuncia como bot; el
  // tráfico normal de /arriendos lo sirve la SPA, que ya filtra por el
  // pathname. Este destino es el equivalente por hash.
  const redirectTo = SITE_URL + '/#/portafolio?deal=arriendo';

  // Valores por defecto: si la consulta falla, el enlace sigue sirviendo.
  let titulo = 'Arriendos en Pereira · Inmobiliaria House';
  let desc = 'Apartamentos, casas y locales en arriendo, verificados por Inmobiliaria House.';
  let imagen = FALLBACK_OG;
  let alt = 'Inmuebles en arriendo — Inmobiliaria House';

  try {
    const { url, key } = getEnv();
    if (url && key) {
      const campos = 'id,codigo_house,tipo,ciudad,barrio,negociacion,precio_arriendo,estado,created_at,fotos(url,url_thumb,orden)';
      const q = `${url}/rest/v1/inmuebles` +
        `?select=${encodeURIComponent(campos)}` +
        `&eliminado=eq.false` +
        `&estado=in.(${encodeURIComponent('"Disponible","Aún Disponible"')})` +
        `&precio_arriendo=gt.0` +
        `&order=created_at.desc&limit=60`;

      const r = await fetch(q, {
        headers: { apikey: key, Authorization: 'Bearer ' + key },
      });

      if (r.ok) {
        const todos = await r.json();
        // La negociación es texto libre ('Arriendo', 'Venta y Arriendo'…),
        // así que se filtra por contenido y no por igualdad.
        const arr = (todos || []).filter(
          (p) => String(p.negociacion || '').toLowerCase().includes('arriendo')
        );

        if (arr.length) {
          const precios = arr.map((p) => Number(p.precio_arriendo) || 0).filter((n) => n > 0);
          const desde = precios.length ? Math.min.apply(null, precios) : 0;

          const ciudades = unicos(arr, 'ciudad');
          const donde = ciudades.length === 1 ? ciudades[0]
            : ciudades.length === 2 ? ciudades.join(' y ')
            : ciudades.length > 2 ? 'Pereira y alrededores'
            : 'Pereira';

          titulo = `${arr.length} inmuebles en arriendo en ${donde}`;

          const tipos = unicos(arr, 'tipo').slice(0, 3);
          desc = [
            desde ? `Desde ${fmtCOP(desde)}/mes` : null,
            tipos.length ? tipos.join(', ') : null,
            'Inmobiliaria House',
          ].filter(Boolean).join(' · ');

          // Portada: la primera foto del arriendo más reciente que tenga alguna.
          const conFoto = arr.find((p) => Array.isArray(p.fotos) && p.fotos.length);
          if (conFoto) {
            const fotos = conFoto.fotos.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
            const cruda = fotos[0].url || fotos[0].url_thumb;
            if (cruda) {
              imagen = cloudinaryOG(cruda);
              alt = `${normalizar(conFoto.tipo) || 'Inmueble'} en arriendo` +
                (conFoto.barrio ? ` en ${normalizar(conFoto.barrio)}` : '');
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[/api/arriendos]', e && (e.message || e));
    // Se cae a los valores por defecto: el enlace no debe romperse nunca.
  }

  const html = renderHTML({
    title: titulo,
    description: desc,
    image: imagen,
    imageAlt: alt,
    canonical,
    redirectTo,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache corto: el conteo y la portada cambian con el inventario.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).send(html);
}
