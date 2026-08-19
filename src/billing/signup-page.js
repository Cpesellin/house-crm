/**
 * Módulo: billing/signup-page
 *
 * Landing simple de signup — el visitante crea su tenant (trial 15 días).
 * Reemplaza el shell del app cuando la URL es #/signup.
 *
 * Consume RPC signup_tenant (sql/53). El acceso es anon.
 */

import { getSupabaseClient } from '../config/supabase.js';

const SB = () => getSupabaseClient();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function slugFromNombre(nombre) {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export function renderSignupPage() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(135deg,#eff6ff,#f0f1ff);padding:40px 20px">
      <div style="max-width:560px;margin:0 auto">
        <div style="text-align:center;margin-bottom:32px">
          <div style="font-size:44px">🏠</div>
          <h1 style="font-family:'Fraunces',serif;font-size:28px;font-weight:800;color:#1e293b;margin:16px 0 8px">Empezá tu prueba gratis</h1>
          <div style="font-size:15px;color:#64748b">15 días de acceso completo, sin tarjeta de crédito.</div>
        </div>

        <div id="signupForm" style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.06)">
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:14px">
            Nombre de tu inmobiliaria *
            <input id="sg_nombre" type="text" placeholder="Ej: Inmobiliaria Ejemplo"
              oninput="window._signupAutoSlug(this.value)"
              style="width:100%;margin-top:6px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box">
          </label>

          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:14px">
            Tu URL en la plataforma *
            <div style="display:flex;align-items:center;margin-top:6px;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden">
              <input id="sg_slug" type="text" placeholder="tuempresa" pattern="[a-z0-9-]+"
                oninput="window._signupCheckSlug()"
                style="flex:1;padding:12px;border:none;font-size:15px;font-family:monospace;text-transform:lowercase">
              <span style="padding:12px 14px;background:#f8fafc;font-size:13px;color:#64748b;border-left:1px solid #e2e8f0">.plataforma.com</span>
            </div>
            <div id="sg_slug_hint" style="font-size:11px;color:#94a3b8;margin-top:4px">Solo minúsculas, números y guiones</div>
          </label>

          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:14px">
            Email del administrador *
            <input id="sg_email" type="email" placeholder="tu@email.com"
              style="width:100%;margin-top:6px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box">
          </label>

          <div style="display:flex;gap:12px;margin-bottom:14px">
            <label style="flex:1;font-size:12px;font-weight:700;color:#334155">
              WhatsApp (opcional)
              <input id="sg_tel" type="tel" placeholder="+57 300 000 0000"
                style="width:100%;margin-top:6px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box">
            </label>
            <label style="flex:1;font-size:12px;font-weight:700;color:#334155">
              Ciudad (opcional)
              <input id="sg_ciudad" type="text" placeholder="Pereira"
                style="width:100%;margin-top:6px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box">
            </label>
          </div>

          <button onclick="window._signupSubmit()" id="sg_btn"
            style="width:100%;padding:14px;background:#1e40af;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;margin-top:8px">
            🚀 Crear mi cuenta gratis
          </button>

          <div id="sg_error" style="display:none;margin-top:12px;padding:10px 14px;background:#fee2e2;color:#991b1b;border-radius:8px;font-size:13px"></div>

          <div style="text-align:center;margin-top:20px;font-size:11px;color:#94a3b8">
            Al crear tu cuenta aceptás los términos de servicio.
            <br>Tenés 15 días para probar todo. Sin cargos hasta que decidas quedarte.
          </div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:13px;color:#64748b">
          ¿Ya tenés cuenta? <a href="/" style="color:#1e40af;font-weight:700;text-decoration:none">Iniciá sesión</a>
        </div>
      </div>
    </div>`;
}

window._signupAutoSlug = function (nombre) {
  const slugEl = document.getElementById('sg_slug');
  if (!slugEl) return;
  // Solo auto-completar si el usuario no editó manualmente
  if (slugEl.dataset.manual === '1') return;
  slugEl.value = slugFromNombre(nombre);
  window._signupCheckSlug();
};

// Chequeo de disponibilidad del slug (debounced 400ms)
window._signupCheckSlug = function () {
  clearTimeout(window._sgSlugTimer);
  window._sgSlugTimer = setTimeout(async () => {
    const slug = document.getElementById('sg_slug')?.value?.trim().toLowerCase();
    const hint = document.getElementById('sg_slug_hint');
    if (!hint) return;
    if (!slug || slug.length < 2) {
      hint.textContent = 'Solo minúsculas, números y guiones';
      hint.style.color = '#94a3b8';
      return;
    }
    hint.textContent = '⏳ Verificando disponibilidad…';
    hint.style.color = '#94a3b8';
    try {
      const { data, error } = await SB().rpc('check_slug_available', { p_slug: slug });
      if (error) throw error;
      if (data?.available) {
        hint.textContent = `✅ "${data.clean_slug}" está disponible`;
        hint.style.color = '#10b981';
      } else {
        const razon = { reservado: 'reservado por el sistema', ocupado: 'ya está en uso', muy_corto: 'muy corto' }[data?.reason] || 'no disponible';
        hint.textContent = `❌ "${data?.clean_slug || slug}" ${razon}`;
        hint.style.color = '#ef4444';
      }
    } catch (e) {
      hint.textContent = 'No se pudo verificar';
      hint.style.color = '#94a3b8';
    }
  }, 400);
};

window._signupSubmit = async function () {
  const nombre = document.getElementById('sg_nombre')?.value?.trim();
  const slug = document.getElementById('sg_slug')?.value?.trim().toLowerCase();
  const email = document.getElementById('sg_email')?.value?.trim();
  const tel = document.getElementById('sg_tel')?.value?.trim() || null;
  const ciudad = document.getElementById('sg_ciudad')?.value?.trim() || null;

  const errEl = document.getElementById('sg_error');
  const btn = document.getElementById('sg_btn');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  errEl.style.display = 'none';
  if (!nombre || nombre.length < 3) return showErr('Nombre de la inmobiliaria obligatorio (mínimo 3 caracteres)');
  if (!slug || !/^[a-z0-9-]{2,30}$/.test(slug)) return showErr('URL inválida (solo minúsculas, números, guiones)');
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return showErr('Email inválido');

  btn.disabled = true;
  btn.textContent = '⏳ Creando cuenta…';

  try {
    const { data, error } = await SB().rpc('signup_tenant', {
      p_slug: slug, p_nombre: nombre, p_email_admin: email,
      p_telefono: tel, p_ciudad: ciudad,
    });
    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || 'Error desconocido');

    // Éxito
    document.getElementById('signupForm').innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:56px">🎉</div>
        <h2 style="font-family:'Fraunces',serif;font-size:24px;font-weight:800;margin:16px 0 8px">¡Cuenta creada!</h2>
        <div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px">
          Tu inmobiliaria <strong>${esc(data.nombre)}</strong> está lista.<br>
          Trial gratis hasta el <strong>${esc(data.trial_hasta)}</strong>.
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px">
          <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:4px">Tu URL</div>
          <div style="font-family:monospace;font-size:14px;color:#1e293b;font-weight:700">${esc(data.url_tenant)}</div>
        </div>
        <div style="font-size:13px;color:#64748b;line-height:1.6">
          ${esc(data.siguiente_paso)}
        </div>
      </div>`;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '🚀 Crear mi cuenta gratis';
    showErr(e.message || 'Error al crear la cuenta. Intentá de nuevo.');
  }
};

// Detectar edición manual del slug
document.addEventListener('input', (e) => {
  if (e.target?.id === 'sg_slug') e.target.dataset.manual = '1';
});

// Listener de ruta
window.rSignup = renderSignupPage;
window.goSignup = () => { location.hash = '#/signup'; };

function handleHash() {
  if (location.hash === '#/signup') {
    setTimeout(() => renderSignupPage(), 50);
  }
}
window.addEventListener('hashchange', handleHash);
if (typeof window !== 'undefined' && document.readyState !== 'loading') handleHash();
else if (typeof window !== 'undefined') document.addEventListener('DOMContentLoaded', handleHash);
