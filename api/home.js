// ============================================================
// HOUSE CRM — Vercel Serverless Function: /api/home
//
// Vista previa del HOME al compartirlo por WhatsApp.
//
// POR QUÉ HACE FALTA
//   El index.html de la app lleva etiquetas OG fijas, con el logo
//   genérico. Compartir el dominio a secas llegaba sin foto y sin decir
//   qué es. Y en una plataforma multi-inmobiliaria eso es peor todavía:
//   cada inquilino tiene su nombre, su logo y su dominio, así que una
//   imagen fija sería la de otra empresa.
//
//   Esta función se sirve SÓLO a los lectores de enlaces (WhatsApp,
//   Facebook, Telegram…) mediante una regla en vercel.json. La persona
//   sigue recibiendo la app normal.
//
// DE DÓNDE SALE LA IMAGEN, en este orden
//   1. og_imagen_url del inquilino, si la subió a mano.
//   2. Su hero_foto_url recortada a 1200x630 por Cloudinary. Así cada
//      inquilino tiene miniatura propia sin que nadie la componga.
//   3. La imagen genérica del sitio.
//
// SE RESUELVE EL INQUILINO POR EL DOMINIO
//   El mismo mecanismo que usa la app: se busca el hostname en
//   metadata->>'dominio_custom'. Si no coincide, cae en 'house'.
//
// ⚠️ api/*.js DEBE usar `export default`: el package.json declara
//    "type": "module" y con module.exports la función no arranca.
// ============================================================

function getEnv() {
  const e = process.env || {};
  return {
    url: e.VITE_SUPA_URL || e.SUPABASE_URL || '',
    key: e.VITE_SUPA_KEY || e.SUPABASE_PUBLISHABLE_KEY || e.SUPABASE_ANON_KEY || '',
  };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Recorta a 1200x630 si la imagen vive en Cloudinary.
 *
 * g_auto deja el encuadre en manos de Cloudinary, que suele acertar con
 * la fachada o la piscina. f_jpg a propósito: algunas versiones viejas de
 * WhatsApp no leen WebP y se quedan sin vista previa.
 */
function og1200(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.indexOf('res.cloudinary.com/') === -1) return url;
  const params = 'w_1200,h_630,c_fill,g_auto,q_auto:good,f_jpg,fl_progressive';
  const rx = /\/upload\/[^/]*\b(?:w_|h_|c_|q_|f_|dpr_|ar_|g_|e_|fl_)[^/]*\//;
  return rx.test(url)
    ? url.replace(rx, `/upload/${params}/`)
    : url.replace('/upload/', `/upload/${params}/`);
}

async function sb(env, path) {
  const r = await fetch(env.url.replace(/\/+$/, '') + '/rest/v1/' + path, {
    headers: {
      apikey: env.key,
      Authorization: 'Bearer ' + env.key,
      Accept: 'application/json',
    },
  });
  if (!r.ok) return null;
  return r.json();
}

function html({ titulo, descripcion, imagen, sitio, canonical, tieneMedida }) {
  const t = esc(titulo), d = esc(descripcion), i = esc(imagen);
  const u = esc(canonical), s = esc(sitio);
  return '<!DOCTYPE html>\n<html lang="es"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + t + '</title>' +
    '<meta name="description" content="' + d + '">' +
    '<link rel="canonical" href="' + u + '">' +
    '<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + u + '">' +
    '<meta property="og:title" content="' + t + '">' +
    '<meta property="og:description" content="' + d + '">' +
    '<meta property="og:image" content="' + i + '">' +
    '<meta property="og:image:secure_url" content="' + i + '">' +
    // Sólo se declara la medida si la garantizamos (recorte de Cloudinary).
    // Anunciar 1200x630 para una imagen que no lo es descuadra la vista
    // previa — ya nos pasó en /api/ver.
    (tieneMedida
      ? '<meta property="og:image:width" content="1200">' +
        '<meta property="og:image:height" content="630">' +
        '<meta property="og:image:type" content="image/jpeg">'
      : '') +
    '<meta property="og:locale" content="es_CO">' +
    '<meta property="og:site_name" content="' + s + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + t + '">' +
    '<meta name="twitter:description" content="' + d + '">' +
    '<meta name="twitter:image" content="' + i + '">' +
    // Los lectores de enlaces ignoran refresh y JS; la persona que caiga
    // aquí por accidente sí va a la app.
    '<meta http-equiv="refresh" content="0;url=' + u + '">' +
    '<script>window.location.replace(' + JSON.stringify(canonical) + ');</script>' +
    '</head><body style="margin:0;font-family:system-ui">' +
    '<div style="text-align:center;padding:32px">' +
    '<img src="' + i + '" alt="' + t + '" style="max-width:100%;height:auto;border-radius:8px">' +
    '<p>Abriendo <a href="' + u + '">' + s + '</a>…</p></div>' +
    '</body></html>';
}

export default async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'inmobiliariahouse.com.co');
  const canonical = 'https://' + host + '/';

  // Respaldo: si algo falla, mejor una vista previa genérica que un 500.
  let datos = {
    titulo: 'Inmuebles en venta y arriendo',
    descripcion: 'Casas, apartamentos, fincas y locales. Verificamos cada inmueble y acompañamos la visita.',
    imagen: 'https://' + host + '/img/og-image.png',
    sitio: 'Inmobiliaria House',
    canonical,
    tieneMedida: false,
  };

  try {
    const env = getEnv();
    if (!env.url || !env.key) throw new Error('faltan variables de entorno');

    // 1) Inquilino por dominio; si no coincide, House.
    const limpio = host.replace(/^www\./, '');
    let tenants = await sb(env, 'inmobiliaria?select=id,nombre,ciudad,logo_url,hero_foto_url,og_imagen_url,slug,metadata&activo=eq.true');
    tenants = Array.isArray(tenants) ? tenants : [];
    // Mismo orden que la app: dominio propio → subdominio → House.
    // Sin el paso del subdominio, un inquilino en arias.plataforma.com
    // compartiría su home con la marca de otra inmobiliaria.
    const porDominio = tenants.find((x) => {
      const d = (x.metadata && x.metadata.dominio_custom) || '';
      return d && (d === host || d === limpio);
    });
    const partes = limpio.split('.');
    const sub = partes.length > 2 ? partes[0] : '';
    const porSubdominio = sub && sub !== 'www'
      ? tenants.find((x) => x.slug === sub)
      : null;
    const t = porDominio || porSubdominio
      || tenants.find((x) => x.slug === 'house') || tenants[0];

    if (t) {
      // Ya no se cuentan los inmuebles: la descripción no lleva
      // cantidades (son información del negocio), así que pedir el
      // conteo era una petición de red para nada.
      const ciudad = t.ciudad ? String(t.ciudad).trim() : '';

      // Imagen, en orden de preferencia:
      //
      //   1. og_imagen_url — la que el inquilino subió a mano.
      //   2. /img/og-<slug>.jpg — la miniatura COMPUESTA (foto + panel de
      //      marca + logo + lema + contacto). Es la buena: una foto
      //      recortada a secas no dice de quién es ni cómo contactarlo.
      //      Se comprueba con un HEAD para no anunciar un 404: si el
      //      inquilino no tiene la suya, se pasa al siguiente paso.
      //   3. hero_foto_url recortada a 1200x630 por Cloudinary.
      //   4. La genérica del sitio.
      let compuesta = null;
      if (t.slug) {
        const ruta = 'https://' + host + '/img/og-' + t.slug + '.jpg';
        try {
          const h = await fetch(ruta, { method: 'HEAD' });
          if (h.ok) compuesta = ruta;
        } catch (e) { /* sin miniatura propia; sigue al recorte */ }
      }

      const cruda = t.og_imagen_url || compuesta || t.hero_foto_url || null;
      const img = og1200(cruda);

      datos = {
        titulo: t.nombre + (ciudad ? ' · Inmuebles en ' + ciudad : ' · Inmuebles en venta y arriendo'),
        // Sin cantidades: el visitante no ve cuántos inmuebles hay en
        // venta ni en arriendo — es información del negocio. Misma
        // decisión que en el home.
        descripcion:
          'Verificamos cada inmueble, filtramos a los interesados y acompañamos cada visita hasta la firma' +
          (ciudad ? ' en ' + ciudad + '.' : '.'),
        imagen: img || ('https://' + host + '/img/og-image.png'),
        sitio: t.nombre,
        canonical,
        // La medida se declara sólo cuando la garantizamos: el recorte de
        // Cloudinary y la miniatura compuesta miden 1200x630 exactos.
        // Para cualquier otra imagen no se declara: anunciar una medida
        // que no es descuadra la vista previa.
        tieneMedida: !!(img && (
          img.indexOf('res.cloudinary.com/') !== -1 || img === compuesta
        )),
      };
    }
  } catch (e) {
    console.error('[/api/home]', e && (e.message || e));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // El home cambia poco y el conteo puede ir con unos minutos de retraso;
  // lo que no puede es tardar en responder al lector de enlaces.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).send(html(datos));
}
