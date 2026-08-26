/**
 * Módulo: tenant/access-gate
 *
 * Gate que bloquea el uso del CRM si el tenant está en estado
 * 'cancelada' (suspendido). Reemplaza el shell del app con una
 * pantalla de "suscripción suspendida" + CTA de contacto.
 *
 * Se llama después de initTenant() y verifica cada 5 minutos.
 * Los superadmins de House NUNCA son bloqueados (para poder
 * reactivar).
 */

import { getCurrentTenant } from './current.js';
import { esSuperadmin } from '../core/superadmin-check.js';
import { getSupabaseClient } from '../config/supabase.js';

const SB = () => getSupabaseClient();
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min

let _blockingScreenShown = false;
let _intervalId = null;

/** Muestra la pantalla de bloqueo (reemplaza #app) */
function showBlockScreen(tenant) {
  if (_blockingScreenShown) return;
  _blockingScreenShown = true;

  const app = document.getElementById('app');
  if (!app) return;

  const soporteHref = 'mailto:soporte@' + (tenant?.dominio_custom || 'inmobiliariahouse.com.co');
  app.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:linear-gradient(135deg,#fef3c7,#fee2e2)">
      <div style="background:#fff;border-radius:20px;padding:48px 32px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15);text-align:center">
        <div style="font-size:64px;margin-bottom:16px">🔒</div>
        <h1 style="font-size:22px;font-weight:800;color:#1e293b;margin:0 0 8px">Suscripción suspendida</h1>
        <div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px">
          El acceso a <strong>${tenant?.nombre || 'este CRM'}</strong> está temporalmente bloqueado.<br>
          Contactá al equipo de soporte para reactivar tu suscripción.
        </div>
        <a href="${soporteHref}" style="display:inline-block;padding:14px 28px;background:#1e40af;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">📧 Contactar soporte</a>
        <div style="margin-top:20px;font-size:11px;color:#94a3b8">Si sos administrador, podés reactivar desde el panel de facturación.</div>
      </div>
    </div>`;
}

/** Chequea si el usuario es superadmin de House (no debe bloquearse).
 *  Delega en el helper memorizado: este gate corre en un intervalo y
 *  antes disparaba un 404 por cada vuelta. */
const isSuperadminSafe = esSuperadmin;

/** Chequea el estado de acceso del tenant activo */
async function checkAccess() {
  const t = getCurrentTenant();
  if (!t?.acceso) return; // sin data de acceso, no bloqueamos

  // House NUNCA se bloquea
  if (t.slug === 'house') return;

  // Superadmin NUNCA se bloquea (para poder reactivar tenants)
  if (await isSuperadminSafe()) return;

  if (!t.acceso.permitido) {
    showBlockScreen(t);
    // Detener el interval — ya no hay razón de seguir chequeando
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }
}

/** Instala el gate: chequeo inicial + verificación periódica */
export function installAccessGate() {
  // Chequeo inicial (ya con tenant cargado)
  checkAccess();

  // Re-verificar cada 5 min (por si mientras el usuario tiene el tab abierto
  // el admin lo suspende manualmente o el cron auto-cierra)
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(() => { checkAccess(); }, CHECK_INTERVAL_MS);
}

// Expose para debug
if (typeof window !== 'undefined') {
  window.__accessGate = { check: checkAccess, install: installAccessGate };
}
