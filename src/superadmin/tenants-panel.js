/**
 * Módulo: superadmin/tenants-panel
 *
 * Panel para que un admin de House gestione TODOS los tenants:
 *   - Lista con estado (activa/trial/grace/cancelada), n_usuarios, n_inmuebles
 *   - Crear tenant nuevo (slug + nombre + email admin + plan + trial days)
 *   - Pausar / Reactivar
 *
 * Ruta: #/superadmin/tenants
 * Solo visible si el usuario logueado es admin de House.
 *
 * Backend: RPCs superadmin_* en Supabase (sql/51).
 */

import { getSupabaseClient } from '../config/supabase.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/** Chequea si el usuario logueado es superadmin (admin de House) */
export async function esSuperadmin() {
  const u = U();
  if (!u || u.rol !== 'admin') return false;
  try {
    const { data } = await SB().rpc('is_superadmin');
    return data === true;
  } catch (e) {
    console.warn('[superadmin] is_superadmin failed:', e);
    return false;
  }
}

/** Render de la tabla de tenants + botones de acción */
export async function renderTenantsPanel() {
  const el = document.getElementById('res') || document.getElementById('app');
  if (!el) return;

  if (!(await esSuperadmin())) {
    el.innerHTML = `<div style="padding:40px;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700">Acceso restringido</div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px">Solo superadmins de House pueden ver este panel.</div>
    </div>`;
    return;
  }

  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--sub)">Cargando tenants…</div>';

  const { data: tenants, error } = await SB().rpc('superadmin_list_tenants');
  if (error) {
    el.innerHTML = `<div style="padding:20px;color:var(--red)">Error: ${esc(error.message)}</div>`;
    return;
  }

  const rows = (tenants || []).map((t) => {
    const estado = t.suscripcion_estado || 'sin_suscripcion';
    const colorEstado = ({
      activa: '#10b981', trial: '#3b82f6',
      grace: '#f59e0b',  cancelada: '#ef4444',
      sin_suscripcion: '#94a3b8',
    })[estado] || '#94a3b8';

    return `<tr style="border-bottom:1px solid var(--brd)">
      <td style="padding:10px 8px">
        <div style="font-weight:700">${esc(t.nombre)}</div>
        <div style="font-size:11px;color:var(--sub);font-family:monospace">${esc(t.slug)}</div>
      </td>
      <td style="padding:10px 8px">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${colorEstado}22;color:${colorEstado};font-size:11px;font-weight:700;text-transform:uppercase">${esc(estado)}</span>
      </td>
      <td style="padding:10px 8px;text-align:center">${t.n_usuarios || 0}</td>
      <td style="padding:10px 8px;text-align:center">${t.n_inmuebles || 0}</td>
      <td style="padding:10px 8px;font-size:11px;color:var(--sub)">${esc(t.email_admin)}</td>
      <td style="padding:10px 8px;font-size:11px">${t.proximo_cobro ? esc(t.proximo_cobro) : '—'}</td>
      <td style="padding:10px 8px;text-align:right">
        ${t.slug !== 'house' ? (
          t.acceso_permitido
            ? `<button onclick="window._superadminPause('${esc(t.slug)}')" style="padding:5px 10px;border:1px solid #ef4444;color:#ef4444;background:transparent;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">Pausar</button>`
            : `<button onclick="window._superadminReactivate('${esc(t.slug)}')" style="padding:5px 10px;border:1px solid #10b981;color:#10b981;background:transparent;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">Reactivar</button>`
        ) : '<span style="font-size:10px;color:var(--sub)">— founder —</span>'}
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:20px;max-width:1200px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:800;margin:0">Superadmin · Tenants</h1>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">${(tenants || []).length} inmobiliarias en la plataforma</div>
        </div>
        <button onclick="window._superadminCreate()" style="padding:10px 16px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">+ Crear tenant</button>
      </div>

      <div style="background:var(--cd);border:1px solid var(--brd);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead style="background:var(--cd2)">
            <tr>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--sub);text-transform:uppercase">Inmobiliaria</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--sub);text-transform:uppercase">Estado</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:var(--sub);text-transform:uppercase">Users</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:var(--sub);text-transform:uppercase">Inmuebles</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--sub);text-transform:uppercase">Admin</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:var(--sub);text-transform:uppercase">Próx. cobro</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:var(--sub);text-transform:uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── Handlers window (onclick inline) ─────────────────────────────────

window._superadminCreate = function () {
  const html = `
    <div id="admCreateDlg" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
      <div style="background:var(--cd);border-radius:14px;max-width:460px;width:100%;padding:24px" onclick="event.stopPropagation()">
        <h2 style="font-size:18px;font-weight:800;margin:0 0 16px">Crear tenant nuevo</h2>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="font-size:12px;font-weight:700">Nombre comercial<input id="adm_nombre" placeholder="Inmobiliaria Ejemplo" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          <label style="font-size:12px;font-weight:700">Slug (subdominio) <span style="color:var(--sub);font-weight:400">— lowercase, sin espacios</span><input id="adm_slug" placeholder="ejemplo" pattern="[a-z0-9-]+" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px;font-family:monospace"></label>
          <label style="font-size:12px;font-weight:700">Email admin<input id="adm_email" type="email" placeholder="admin@ejemplo.com" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          <div style="display:flex;gap:8px">
            <label style="font-size:12px;font-weight:700;flex:1">Teléfono (opc)<input id="adm_tel" placeholder="+57 300 000 0000" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
            <label style="font-size:12px;font-weight:700;flex:1">Ciudad (opc)<input id="adm_ciudad" placeholder="Pereira" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          </div>
          <div style="display:flex;gap:8px">
            <label style="font-size:12px;font-weight:700;flex:1">Plan<select id="adm_plan" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"><option value="basic">Basic ($89K)</option><option value="pro">Pro ($189K)</option><option value="business">Business ($349K)</option></select></label>
            <label style="font-size:12px;font-weight:700;flex:1">Días de trial<input id="adm_trial" type="number" value="15" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;margin-top:4px;font-size:13px"></label>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px">
          <button onclick="document.getElementById('admCreateDlg').remove()" style="flex:1;padding:10px;border:1.5px solid var(--brd);background:transparent;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Cancelar</button>
          <button onclick="window._superadminSubmitCreate()" style="flex:2;padding:10px;border:none;background:#10b981;color:#fff;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">✅ Crear tenant</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window._superadminSubmitCreate = async function () {
  const slug = document.getElementById('adm_slug')?.value?.trim().toLowerCase();
  const nombre = document.getElementById('adm_nombre')?.value?.trim();
  const email = document.getElementById('adm_email')?.value?.trim();
  const tel = document.getElementById('adm_tel')?.value?.trim() || null;
  const ciudad = document.getElementById('adm_ciudad')?.value?.trim() || null;
  const plan = document.getElementById('adm_plan')?.value || 'basic';
  const trialDays = parseInt(document.getElementById('adm_trial')?.value) || 15;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) { window.toast?.('Slug inválido (solo lowercase, números, guiones)', 'twarn'); return; }
  if (!nombre || !email) { window.toast?.('Nombre y email obligatorios', 'twarn'); return; }

  try {
    const { data, error } = await SB().rpc('superadmin_create_tenant', {
      p_slug: slug, p_nombre: nombre, p_email_admin: email,
      p_telefono: tel, p_ciudad: ciudad,
      p_plan_id: plan, p_dias_trial: trialDays,
    });
    if (error) throw error;
    document.getElementById('admCreateDlg')?.remove();
    window.toast?.(`✅ Tenant "${slug}" creado en trial ${trialDays} días`);
    renderTenantsPanel(); // refresh
  } catch (e) {
    window.toast?.('Error: ' + e.message, 'terr');
  }
};

window._superadminPause = async function (slug) {
  const ok = await (window.cfShow?.('⚠️', `¿Pausar tenant "${slug}"?`, 'Sus usuarios perderán acceso hasta reactivar.'));
  if (!ok) return;
  const motivo = prompt('Motivo del pausado (opcional):') || null;
  try {
    const { error } = await SB().rpc('superadmin_pause_tenant', { p_slug: slug, p_motivo: motivo });
    if (error) throw error;
    window.toast?.(`⚠️ ${slug} pausado`);
    renderTenantsPanel();
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

window._superadminReactivate = async function (slug) {
  const dias = prompt('Días de extensión de la suscripción:', '30');
  if (!dias) return;
  try {
    const { error } = await SB().rpc('superadmin_reactivate_tenant', {
      p_slug: slug, p_plan_id: 'basic', p_dias_extension: parseInt(dias) || 30,
    });
    if (error) throw error;
    window.toast?.(`✅ ${slug} reactivado por ${dias} días`);
    renderTenantsPanel();
  } catch (e) { window.toast?.('Error: ' + e.message, 'terr'); }
};

// Inyecta un botón en el header (junto a la campana) para superadmins.
// Idempotente + espera a que el shell exista.
async function injectSuperadminNavIfNeeded() {
  if (document.getElementById('superadminNavBtn')) return;
  const bellWrap = document.querySelector('.bell-wrap');
  if (!bellWrap) return; // shell aún no renderizado
  const isSuper = await esSuperadmin();
  if (!isSuper) return;

  const btn = document.createElement('button');
  btn.id = 'superadminNavBtn';
  btn.title = 'Panel de tenants (superadmin)';
  btn.style.cssText = 'background:none;border:none;padding:6px 10px;cursor:pointer;font-size:18px;position:relative;margin-right:4px';
  btn.innerHTML = '🛠️';
  btn.onclick = () => { location.hash = '#/superadmin-tenants'; };
  bellWrap.parentNode?.insertBefore(btn, bellWrap);
}

// Correr después de que la app + auth boot terminen. El listener escucha
// cambios de usuario (login/logout) porque el shell puede repintarse.
function scheduleInjection() {
  // Múltiples intentos progresivos hasta que el shell exista
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    injectSuperadminNavIfNeeded();
    if (attempts > 20 || document.getElementById('superadminNavBtn')) clearInterval(timer);
  }, 500);
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInjection);
  } else {
    scheduleInjection();
  }
}

// Expuesto en window para invocación programática
window.rSuperadminTenants = renderTenantsPanel;
window.goSuperadminTenants = () => { location.hash = '#/superadmin-tenants'; };

// Listener propio de la ruta — el router principal no la conoce
function handleHash() {
  if (location.hash === '#/superadmin-tenants') {
    // Esperar que el shell haya creado #res o #app
    setTimeout(() => renderTenantsPanel(), 50);
  }
}
window.addEventListener('hashchange', handleHash);
// Al cargar la página, chequear también
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  handleHash();
} else if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', handleHash);
}
