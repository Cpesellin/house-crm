// ============================================================
// HOUSE CRM — Vercel Serverless: /api/wompi-webhook
//
// Recibe notificaciones de Wompi cuando un pago cambia de estado.
// Actualiza la suscripcion.proximo_cobro y estado del tenant.
//
// SETUP EN VERCEL:
//   Environment Variables:
//     WOMPI_EVENTS_SECRET   → secret configurado en dashboard Wompi
//     SUPABASE_SERVICE_KEY  → service role key (bypasses RLS)
//     VITE_SUPA_URL         → URL del proyecto Supabase
//
// SETUP EN WOMPI:
//   Dashboard → Configuración → Eventos → agregar URL:
//     https://tu-dominio.com/api/wompi-webhook
//
// ============================================================

import crypto from 'node:crypto';

function verifyWompiSignature(body, timestamp, signature, secret) {
  // Wompi firma con SHA256(body + timestamp + secret)
  const data = body + timestamp + secret;
  const expected = crypto.createHash('sha256').update(data).digest('hex');
  return expected === signature;
}

async function updateSubscription(supaUrl, serviceKey, reference, status, transactionId) {
  // reference viene del client cuando armamos el checkout: "tenant:{slug}:{planId}"
  const [prefix, slug, planId] = String(reference || '').split(':');
  if (prefix !== 'tenant' || !slug) {
    console.warn('[wompi] reference formato inválido:', reference);
    return { skipped: true };
  }

  const fetch = globalThis.fetch;
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // 1) Buscar el tenant
  const rIn = await fetch(`${supaUrl}/rest/v1/inmobiliaria?slug=eq.${encodeURIComponent(slug)}&select=id`, { headers });
  const inmData = await rIn.json();
  const inm = Array.isArray(inmData) ? inmData[0] : null;
  if (!inm) return { skipped: true, reason: 'tenant no existe' };

  // 2) Solo actuar en APPROVED
  if (status !== 'APPROVED') {
    // Registrar el intento pero no cambiar suscripción
    return { logged: true, status };
  }

  // 3) Extender proximo_cobro en 30 días desde hoy + estado='activa'
  const nuevaFecha = new Date();
  nuevaFecha.setDate(nuevaFecha.getDate() + 30);
  const proximo = nuevaFecha.toISOString().slice(0, 10);

  const body = {
    estado: 'activa',
    proximo_cobro: proximo,
    grace_hasta: null,
    plan_id: planId || undefined,
    updated_at: new Date().toISOString(),
  };
  // Limpiar undefined
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const rUpd = await fetch(
    `${supaUrl}/rest/v1/suscripcion?inmobiliaria_id=eq.${inm.id}`,
    { method: 'PATCH', headers, body: JSON.stringify(body) }
  );
  const updData = await rUpd.json();

  return { updated: true, tenant: slug, proximo, transactionId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const secret = process.env.WOMPI_EVENTS_SECRET || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
  const supaUrl = process.env.VITE_SUPA_URL || process.env.SUPABASE_URL || '';

  if (!secret || !serviceKey || !supaUrl) {
    console.error('[wompi] Faltan env vars: WOMPI_EVENTS_SECRET / SUPABASE_SERVICE_KEY / VITE_SUPA_URL');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  try {
    // Vercel body puede venir parseado o como string
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Verificar firma Wompi
    const timestamp = parsed?.timestamp || '';
    const signature = parsed?.signature?.checksum || '';
    if (!verifyWompiSignature(body, timestamp, signature, secret)) {
      // En dev con test-mode, aceptamos sin firma
      const skipVerify = process.env.WOMPI_SKIP_VERIFY === 'true';
      if (!skipVerify) {
        res.status(401).json({ error: 'invalid_signature' });
        return;
      }
    }

    const event = parsed?.event || '';
    const transaction = parsed?.data?.transaction || {};
    const status = transaction.status || '';
    const reference = transaction.reference || '';
    const id = transaction.id || '';

    if (event !== 'transaction.updated') {
      // Ignorar otros tipos de evento
      res.status(200).json({ ignored: event });
      return;
    }

    const result = await updateSubscription(supaUrl, serviceKey, reference, status, id);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('[wompi-webhook] error:', e);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
}
