/**
 * Módulo: billing/facturacion-panel
 *
 * Página /facturacion del tenant. Muestra:
 *   - Plan actual + estado (activa/trial/grace/cancelada)
 *   - Próximo cobro / fecha de corte
 *   - Botón "Renovar" que abre Wompi
 *   - Botón "Cambiar plan" (para upgrade/downgrade)
 *
 * Solo visible a admin del tenant.
 * Ruta: #/facturacion
 */

import { getSupabaseClient } from '../config/supabase.js';
import { getCurrentTenant } from '../tenant/current.js';
import { openWompiCheckout } from './wompi-checkout.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const ESTADO_META = {
  activa:    { color: '#10b981', label: 'Activa',    desc: 'Tu suscripción está al día.' },
  trial:     { color: '#3b82f6', label: 'En prueba', desc: 'Trial gratis, agregá método de pago antes del corte.' },
  grace:     { color: '#f59e0b', label: 'Vence',     desc: '⚠️ Regularizá el pago antes de la fecha de corte.' },
  cancelada: { color: '#ef4444', label: 'Suspendida', desc: '🔒 El acceso está bloqueado. Renová para reactivar.' },
};

const PLANES_UI = [
  { id: 'basic',    nombre: 'Basic',    precio: 89000,  desc: 'Solo CRM · 5 asesores · 100 inmuebles' },
  { id: 'pro',      nombre: 'Pro',      precio: 189000, desc: 'CRM + Posventa · 15 asesores · 500 inmuebles' },
  { id: 'business', nombre: 'Business', precio: 349000, desc: 'Sin límite práctico' },
];

const fm = (n) => n > 0 ? '$' + n.toLocaleString('es-CO') : 'Gratis';

async function fetchSuscripcion(tenantId) {
  const { data } = await SB()
    .from('suscripcion')
    .select('*,plan:plan!plan_id(id,nombre,precio_mensual_cop,incluye_crm,incluye_admin)')
    .eq('inmobiliaria_id', tenantId)
    .single();
  return data;
}

export async function renderFacturacionPanel() {
  const el = document.getElementById('res') || document.getElementById('app');
  if (!el) return;

  const u = U();
  const t = getCurrentTenant();

  if (!u || u.rol !== 'admin') {
    el.innerHTML = `<div style="padding:40px;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700">Solo administradores</div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px">Necesitás rol admin para gestionar la suscripción.</div>
    </div>`;
    return;
  }

  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--sub)">Cargando…</div>';

  const sus = await fetchSuscripcion(t.id);
  if (!sus) {
    el.innerHTML = `<div style="padding:40px;text-align:center">
      <div style="font-size:40px">📋</div>
      <div style="font-size:18px;font-weight:700;margin:10px 0">Sin suscripción</div>
      <div style="font-size:13px;color:var(--sub)">Contactá soporte para activar tu plan.</div>
    </div>`;
    return;
  }

  const meta = ESTADO_META[sus.estado] || ESTADO_META.activa;
  const planActual = sus.plan || {};

  el.innerHTML = `
    <div style="padding:20px;max-width:800px;margin:0 auto">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 4px">Facturación</h1>
      <div style="font-size:13px;color:var(--sub);margin-bottom:24px">${esc(t.nombre)} · ${esc(t.slug)}</div>

      <!-- Estado actual -->
      <div style="background:${meta.color}10;border:2px solid ${meta.color}40;border-radius:14px;padding:20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
          <div>
            <div style="font-size:11px;font-weight:700;color:${meta.color};text-transform:uppercase;letter-spacing:1px">${meta.label}</div>
            <div style="font-family:'Fraunces',serif;font-size:24px;font-weight:800;color:var(--tx);margin-top:4px">${esc(planActual.nombre || sus.plan_id)}</div>
            <div style="font-size:13px;color:var(--sub);margin-top:4px">${meta.desc}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--sub)">Próximo cobro</div>
            <div style="font-size:14px;font-weight:700">${sus.proximo_cobro || '—'}</div>
            ${sus.grace_hasta ? `<div style="font-size:11px;color:${meta.color};margin-top:2px">Grace hasta ${sus.grace_hasta}</div>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px">
          ${sus.estado !== 'cancelada' || u.rol === 'admin' ? `
            <button onclick="window._facRenew('${esc(sus.plan_id)}')" style="flex:1;padding:12px;background:${meta.color};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer">
              💳 ${sus.estado === 'cancelada' ? 'Reactivar suscripción' : 'Pagar mes'}
            </button>
          ` : ''}
          <button onclick="document.getElementById('facPlanes').scrollIntoView({behavior:'smooth'})" style="padding:12px 20px;background:transparent;color:${meta.color};border:1.5px solid ${meta.color};border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
            Cambiar plan
          </button>
        </div>
      </div>

      <!-- Planes disponibles -->
      <h2 id="facPlanes" style="font-size:16px;font-weight:800;margin:24px 0 12px">Otros planes</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${PLANES_UI.map((p) => {
          const activo = p.id === sus.plan_id;
          return `<div style="background:var(--cd);border:2px solid ${activo ? meta.color : 'var(--brd)'};border-radius:12px;padding:16px">
            <div style="font-size:16px;font-weight:800">${p.nombre}${activo ? ' <span style="font-size:10px;color:'+meta.color+';font-weight:700">ACTUAL</span>' : ''}</div>
            <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:var(--tx);margin:4px 0">${fm(p.precio)}<span style="font-size:11px;color:var(--sub);font-weight:400">/mes</span></div>
            <div style="font-size:12px;color:var(--sub);margin-bottom:12px">${p.desc}</div>
            ${!activo ? `<button onclick="window._facSwitchPlan('${p.id}')" style="width:100%;padding:8px;background:transparent;color:var(--b600);border:1.5px solid var(--b600);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Cambiar a ${p.nombre}</button>` : ''}
          </div>`;
        }).join('')}
      </div>

      <div style="margin-top:24px;padding:16px;background:var(--cd2);border-radius:10px;font-size:12px;color:var(--sub);line-height:1.6">
        💡 <strong>Método de pago</strong>: usamos Wompi (débito, crédito y PSE) con encriptación PCI. Nunca guardamos datos de tu tarjeta.
      </div>
    </div>`;
}

window._facRenew = async function (planId) {
  try {
    await openWompiCheckout(planId);
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

window._facSwitchPlan = async function (planId) {
  const ok = await (window.cfShow?.('💳', '¿Cambiar plan?', 'Pagarás el nuevo plan y el cambio queda activo inmediatamente.'));
  if (!ok) return;
  try {
    await openWompiCheckout(planId);
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

window.rFacturacion = renderFacturacionPanel;
window.goFacturacion = () => { location.hash = '#/facturacion'; };

// Listener manual para la ruta
function handleHash() {
  if (location.hash === '#/facturacion') {
    setTimeout(() => renderFacturacionPanel(), 50);
  }
}
window.addEventListener('hashchange', handleHash);
if (typeof window !== 'undefined' && document.readyState !== 'loading') handleHash();
else if (typeof window !== 'undefined') document.addEventListener('DOMContentLoaded', handleHash);
