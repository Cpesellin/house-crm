/**
 * Módulo: billing/wompi-checkout
 *
 * Abre el widget de Wompi para pagar la suscripción del tenant activo.
 * Consume Wompi Widget Checkout (script cargado on-demand).
 *
 * SETUP:
 *   Vercel env var (public): VITE_WOMPI_PUBLIC_KEY
 *   Signature integrity: se calcula en el backend (endpoint /api/wompi-integrity)
 *
 * FLUJO:
 *   1. Usuario elige plan → click "Renovar suscripción"
 *   2. Pedimos referencia única al backend: `tenant:{slug}:{plan}:{timestamp}`
 *   3. Abrimos widget de Wompi con amount + reference
 *   4. Wompi cobra + envía webhook a /api/wompi-webhook → actualiza suscripcion
 *   5. Widget devuelve success/error al usuario
 *
 * Este módulo NO carga hasta que el usuario click "Renovar" (lazy).
 */

import { getCurrentTenant } from '../tenant/current.js';
import { getSupabaseClient } from '../config/supabase.js';

const WOMPI_WIDGET_URL = 'https://checkout.wompi.co/widget.js';

function loadWompiScript() {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) return resolve();
    const existing = document.querySelector('script[data-wompi]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.src = WOMPI_WIDGET_URL;
    s.dataset.wompi = '1';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar Wompi'));
    document.head.appendChild(s);
  });
}

/**
 * Obtiene precio del plan desde tabla `plan` en Supabase.
 * Fallback si RPC no está: usa mapa hardcoded.
 */
async function getPlanAmount(planId) {
  const SB = getSupabaseClient();
  try {
    const { data } = await SB.from('plan').select('precio_mensual_cop').eq('id', planId).single();
    if (data?.precio_mensual_cop) return data.precio_mensual_cop;
  } catch (e) { /* noop */ }
  const fallback = { basic: 89000, pro: 189000, business: 349000, enterprise: 0 };
  return fallback[planId] || 0;
}

/**
 * Abre el checkout de Wompi para renovar la suscripción del tenant activo.
 * @param {string} planId — 'basic' | 'pro' | 'business'
 */
export async function openWompiCheckout(planId) {
  const publicKey = import.meta.env?.VITE_WOMPI_PUBLIC_KEY;
  if (!publicKey) {
    window.toast?.('Wompi no está configurado. Contactá soporte.', 'terr');
    console.error('[wompi] Falta VITE_WOMPI_PUBLIC_KEY');
    return;
  }

  const tenant = getCurrentTenant();
  if (!tenant?.slug) { window.toast?.('Tenant no identificado', 'terr'); return; }

  const amount = await getPlanAmount(planId);
  if (amount <= 0) { window.toast?.('Plan sin precio o gratuito, no requiere pago', 'twarn'); return; }

  await loadWompiScript();

  const reference = `tenant:${tenant.slug}:${planId}:${Date.now()}`;

  const checkout = new window.WidgetCheckout({
    currency: 'COP',
    amountInCents: amount * 100,
    reference,
    publicKey,
    redirectUrl: window.location.origin + '/#/facturacion?wompi_result=1',
    customerData: {
      email: tenant.email_admin || '',
      fullName: tenant.nombre || '',
    },
  });

  checkout.open((result) => {
    // Wompi entrega el resultado en pantalla; nuestro backend recibe webhook
    // con la actualización real de la suscripción.
    if (result?.transaction?.status === 'APPROVED') {
      window.toast?.('✅ Pago aprobado. Tu suscripción quedará activa en minutos.');
    } else if (result?.transaction) {
      window.toast?.(`⚠️ Pago ${result.transaction.status}. Chequeá tu email.`, 'twarn');
    }
  });
}

// Expose para código legacy
if (typeof window !== 'undefined') {
  window.__wompi = { open: openWompiCheckout };
}
