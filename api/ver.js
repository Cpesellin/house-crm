// ============================================================
// HOUSE CRM — Vercel Function: /api/ver
//
// Genera HTML con Open Graph meta tags dinámicos para que las
// previews de WhatsApp / Facebook / Telegram / etc muestren la
// foto y el precio del inmueble en lugar del logo genérico.
//
// Flujo:
//   1. Bot (user-agent whatsapp/facebookexternalhit/etc) abre
//      https://inmobiliariahouse.com.co/ver/HOUSE-178
//   2. vercel.json rewrites a /api/ver?ref=HOUSE-178
//   3. Esta función consulta Supabase (codigo_house o id)
//   4. Devuelve HTML mínimo con og:title/og:image/og:description
//   5. <meta http-equiv="refresh"> redirige a humanos al SPA real
//
// Cache: 5 min en CDN de Vercel para no saturar Supabase.
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPA_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPA_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SITE_URL = 'https://inmobiliariahouse.com.co';
const FALLBACK_OG = `${SITE_URL}/img/og-image.png`;

// Escape HTML — sin librerías
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Cloudinary OG-friendly: 1200x630, c_fill, f_jpg (WhatsApp acepta WebP en
// versiones nuevas pero JPG es 100% compatible)
function cloudinaryOG(url) {
  if (!url || typeof url !== 'string') return FALLBACK_OG;
  if (!/res\.cloudinary\.com\//.test(url)) return url;
  // Insertar transformaciones después de /upload/, reemplazando si existen
  const params = 'w_1200,h_630,c_fill,g_auto,q_auto,f_jpg';
  const transformRx = /\/upload\/[^/]*\b(?:w_|h_|c_|q_|f_|dpr_|ar_|g_|e_)[^/]*\//;
  if (transformRx.test(url)) {
    return url.replace(transformRx, `/upload/${params}/`);
  }
  return url.replace('/upload/', `/upload/${params}/`);
}

function fmtCOP(n) {
  if (!n || n <= 0) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function precioTxt(p) {
  const v = fmtCOP(p.precio_venta), a = fmtCOP(p.precio_arriendo);
  if (v && a) return `${v} venta · ${a}/mes`;
  if (v) return `${v} venta`;
  if (a) return `${a}/mes arriendo`;
  return 'Consulta el precio';
}

function tituloInmueble(p) {
  const tipo = p.tipo || 'Inmueble';
  const ubic = p.barrio || p.ciudad || '';
  return ubic ? `${tipo} en ${ubic}` : tipo;
}

function descripcionInmueble(p) {
  const detalles = [];
  if (p.habitaciones) detalles.push(`${p.habitaciones} hab`);
  if (p.banos) detalles.push(`${p.banos} baños`);
  if (p.area_construida) detalles.push(`${p.area_construida} m²`);
  if (p.estrato) detalles.push(`Estrato ${p.estrato}`);
  const head = detalles.join(' · ');
  const precio = precioTxt(p);
  return [precio, head].filter(Boolean).join(' — ');
}

// HTML con OG y redirect a SPA — tanto bots como humanos llegan acá si
// abren el link directo, los humanos rebotan al SPA en <100ms
function renderHTML({ title, description, image, canonical }) {
  const t = esc(title);
  const d = esc(description);
  const i = esc(image);
  const u = esc(canonical);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<link rel="canonical" href="${u}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="${u}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:image:secure_url" content="${i}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:locale" content="es_CO">
<meta property="og:site_name" content="Inmobiliaria House">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">

<!-- Redirige humanos al SPA real (los bots no ejecutan refresh ni JS) -->
<meta http-equiv="refresh" content="0;url=${u}">
<script>window.location.replace(${JSON.stringify(canonical)});</script>
</head>
<body>
<p>Redirigiendo a <a href="${u}">${t}</a>…</p>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const ref = (req.query?.ref || '').trim();

  if (!ref) {
    res.status(400).setHeader('Content-Type', 'text/plain').send('Falta parámetro ref');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[/api/ver] Faltan env vars SUPABASE_URL/KEY');
    res.status(500).setHeader('Content-Type', 'text/plain').send('Server misconfigured');
    return;
  }

  const canonical = `${SITE_URL}/ver/${encodeURIComponent(ref)}`;

  try {
    // Buscar por codigo_house O por id (UUID). Solo aprobados, no eliminados.
    // Limit 1, embed sólo la primera foto ordenada.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    const filter = isUuid
      ? `id=eq.${ref}`
      : `codigo_house=eq.${encodeURIComponent(ref)}`;

    const url = `${SUPABASE_URL}/rest/v1/inmuebles?${filter}&eliminado=eq.false&select=id,codigo_house,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,area_construida,estrato,descripcion_cliente,fotos(url,url_thumb,orden)&limit=1`;

    const r = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const rows = await r.json();
    const p = Array.isArray(rows) && rows.length ? rows[0] : null;

    // No encontrado → fallback genérico
    if (!p) {
      const html = renderHTML({
        title: 'Inmobiliaria House · Asesores Inmobiliarios',
        description: 'Casas, apartamentos, fincas y locales en Pereira y el Eje Cafetero.',
        image: FALLBACK_OG,
        canonical: SITE_URL,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      res.status(200).send(html);
      return;
    }

    // Primera foto ordenada → og:image optimizada para WhatsApp
    const fotos = Array.isArray(p.fotos)
      ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
      : [];
    const rawImg = fotos.length ? (fotos[0].url || fotos[0].url_thumb) : null;
    const ogImage = rawImg ? cloudinaryOG(rawImg) : FALLBACK_OG;

    const titulo = tituloInmueble(p);
    const descripcion = descripcionInmueble(p);

    const html = renderHTML({
      title: `${titulo} · Inmobiliaria House`,
      description: descripcion,
      image: ogImage,
      canonical,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // 5 min CDN cache; los inmuebles no cambian de precio cada minuto
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);

  } catch (e) {
    console.error('[/api/ver] error', e);
    // Fallback amigable: página genérica, no 500 (para no romper el preview)
    const html = renderHTML({
      title: 'Inmobiliaria House · Asesores Inmobiliarios',
      description: 'Casas, apartamentos, fincas y locales en Pereira y el Eje Cafetero.',
      image: FALLBACK_OG,
      canonical: SITE_URL,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.status(200).send(html);
  }
};
