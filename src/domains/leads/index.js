/**
 * Módulo: domains/leads (Intereses / "Me interesa")
 *
 * Sistema completo de captura y calificación de leads sobre inmuebles:
 *   FASE 3 — Captura ("Me interesa" estructurado):
 *     abrirInteres(inmId)              → entry point, pide rol si es público
 *     _abrirInteresDirecto(inmId)      → formulario comprador (presup/fecha/crédito/pago/propósito)
 *     _abrirInteresComisionista(inmId) → confirmación simple, HOUSE llama al comisionista
 *     guardarInteres / _guardarInteresComisionista → submit + noti admins
 *     calcScoreInteres / getScoreLabel → scoring auto 0-100 (verde/amarillo/rojo)
 *
 *   FASE 4 — Calificación admin (cola verde/amarillo/rojo):
 *     calificarInteresRapido(intId)          → verde directo (sin motivo)
 *     abrirCalificarInteres(intId, score)    → modal para amarillo/rojo (con motivo)
 *     _aplicarCalificacionInteres            → aplica + notifica captador y cliente
 *
 * NOTA: Los badges/counts viven en:
 *   - src/interesados-ui.js       → badgeInteresadosInmueble
 *   - src/core/interesados.js     → precargarCountsInteresados / getCachedIntCount
 *
 * Toda la superficie está en window.* para compat con onclick inline.
 */

import { getSupabaseClient } from '../../config/supabase.js';

// ─── Shortcuts locales (mismo patrón que functions.js) ───────────────
const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const D = () => window.D || [];
const findInm = (id) => D().find((p) => p.id === id);
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));

// ══════════════════════════════════════════════════════════════════════
// FASE 3 — Captura ("Me interesa" estructurado)
// ══════════════════════════════════════════════════════════════════════

/**
 * Entry point del "Me interesa". Si el usuario no está logueado dispara auth
 * prompt. Si es público, muestra el picker de rol (para mí / para otro).
 * Si es interno, va directo al formulario comprador.
 */
window.abrirInteres = async function (inmId) {
  const u = U();
  if (!u) {
    window._pendingContactInmuebleId = inmId;
    window.showAuthPrompt('contacto', {
      icono: '💙', titulo: 'Expresar interés',
      mensaje: 'Crea tu cuenta gratis para que el asesor de House sepa que te interesa este inmueble.',
      beneficios: ['💙 El asesor te contacta', '🔔 Solo notificaciones que autorices', '🔒 Tus datos protegidos'],
      cta: 'Crear cuenta gratis', ctaSecundario: 'Ahora no',
    });
    return;
  }

  // Momento 2: preguntar para quién es (solo públicos, no internos)
  if (u.tipo_usuario === 'publico') {
    const { data: p } = await SB().from('inmuebles').select('id,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,codigo_house').eq('id', inmId).single();
    if (!p) { window.toast('Inmueble no encontrado', 'terr'); return; }
    const precio = (p.negociacion === 'Arriendo' ? fm(p.precio_arriendo || 0) + '/mes' : fm(p.precio_venta || 0));
    const _eh = window.escapeHtml || String;
    const html = `
    <div id="ciRolDlg" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)" onclick="if(event.target===this)this.remove()">
      <div style="max-width:480px;width:100%;max-height:90vh;overflow:auto;background:#faf9f7;border-radius:20px;padding:20px" onclick="event.stopPropagation()">
        <div style="background:#fff;border-radius:14px;padding:14px;border:1px solid #e0ddd8;margin-bottom:20px;display:flex;gap:12px">
          <div style="width:64px;height:64px;border-radius:10px;background:#e8e5e0;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${p.tipo === 'Apartamento' ? '🏢' : p.tipo === 'Casa' ? '🏡' : p.tipo === 'Local' ? '🏪' : '🏠'}</div>
          <div><div style="font-size:15px;font-weight:700;color:#1a1a1a">${_eh(p.tipo || '')} en ${_eh(p.barrio || p.ciudad || '')}</div><div style="font-size:13px;color:#5a5550">${_eh(p.ciudad || '')} · ${precio}</div><div style="font-size:12px;color:#1a4f8b;font-weight:700;margin-top:2px">${_eh(p.codigo_house || '')}</div></div>
        </div>
        <div style="font-size:26px;font-weight:800;color:#122d4f;line-height:1.2;margin-bottom:8px">¿Para quién es este inmueble?</div>
        <div style="font-size:16px;color:#5a5550;line-height:1.6;margin-bottom:24px">Nosotros verificamos todo y acompañamos la visita.</div>
        <div id="opt-para-mi" onclick="document.getElementById('ciRolDlg').remove();window._interesTipo='comprador';window._abrirInteresDirecto('${inmId}')" style="background:#fff;border:2.5px solid #e0ddd8;border-radius:20px;padding:28px 24px;cursor:pointer;margin-bottom:16px;transition:all .25s">
          <div style="font-size:48px;margin-bottom:12px">🙋</div>
          <div style="font-size:20px;font-weight:800;color:#1a1a1a;margin-bottom:6px">Para mí</div>
          <div style="font-size:15px;color:#5a5550;line-height:1.6">Estoy buscando un inmueble para comprar o arrendar para mí.</div>
          <div style="margin-top:10px;padding:8px 12px;background:#3b82f612;border-radius:10px;font-size:13px;color:#1e40af;line-height:1.5">✅ Sin costo para el comprador. House te acompaña gratis.</div>
        </div>
        <div id="opt-para-otro" onclick="document.getElementById('ciRolDlg').remove();window._interesTipo='comisionista';window._abrirInteresComisionista('${inmId}')" style="background:#fff;border:2.5px solid #e0ddd8;border-radius:20px;padding:28px 24px;cursor:pointer;margin-bottom:16px;transition:all .25s">
          <div style="font-size:48px;margin-bottom:12px">💼</div>
          <div style="font-size:20px;font-weight:800;color:#1a1a1a;margin-bottom:6px">Para alguien que conozco</div>
          <div style="font-size:15px;color:#5a5550;line-height:1.6">Tengo un cliente, amigo o familiar que busca algo así.</div>
          <div style="margin-top:10px;padding:10px 12px;background:#8b5cf612;border-radius:10px">
            <div style="font-size:14px;font-weight:800;color:#6d28d9">💰 Gana hasta 1.5% del valor de venta</div>
            <div style="font-size:12px;color:#5a5550;margin-top:4px;line-height:1.5">Si se cierra el negocio, te transferimos tu comisión. Ejemplo: inmueble de $300M → hasta $4.500.000 para ti.</div>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    return;
  }

  // Internos: ir directo al formulario de comprador
  window._interesTipo = 'comprador';
  window._abrirInteresDirecto(inmId);
};

// Formulario comprador (form completo)
window._abrirInteresDirecto = async function (inmId) {
  const u = U(); if (!u) return;

  const { data: p } = await SB().from('inmuebles')
    .select('id,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo')
    .eq('id', inmId).single();
  if (!p) { window.toast('Inmueble no encontrado', 'terr'); return; }

  let prev = null;
  try {
    const { data } = await SB().from('intereses_compradores')
      .select('*').eq('usuario_id', u.id).eq('inmueble_id', inmId).maybeSingle();
    prev = data || null;
  } catch (e) { /* tabla no existe → tratar como nuevo */ }

  const pa = p.precio_arriendo || 0, pv = p.precio_venta || 0;
  const modalidadAuto = (pa > 0 && pv === 0) ? 'arriendo' : (pv > 0 && pa === 0) ? 'compra' : (prev?.modalidad || 'compra');
  const modSelArriendo = modalidadAuto === 'arriendo' ? 'selected' : '';
  const modSelCompra = modalidadAuto === 'compra' ? 'selected' : '';
  const ambasModalidades = pa > 0 && pv > 0;

  const presupVal = prev?.presupuesto_max ? String(prev.presupuesto_max) : '';
  const fechaVal = prev?.fecha_ideal || '';
  const msgVal = (prev?.mensaje || '').replace(/</g, '&lt;');
  const isUpdate = !!prev;

  const safeId = inmId.replace(/[^a-zA-Z0-9-]/g, '');

  const html = `
  <div id="ciDlg" class="modal-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)">
    <div class="card" style="max-width:480px;width:100%;max-height:90vh;overflow:auto;border-radius:14px">
      <div class="cdh"><div class="chl"><div class="chi">💙</div><div><div class="cht">${isUpdate ? 'Actualizar interés' : 'Me interesa este inmueble'}</div><div style="font-size:11px;color:var(--sub);margin-top:2px">${p.tipo || ''} · ${p.barrio || p.ciudad || ''}</div></div></div>
        <button onclick="document.getElementById('ciDlg').remove()" style="background:none;border:none;font-size:20px;color:var(--sub);cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div class="cdb" style="padding:18px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.5">Cuéntale al asesor qué buscas. Esta información es <b>privada</b> y solo la ve el equipo de House para ayudarte mejor.</div>

        ${ambasModalidades ? `
        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">Te interesa para</label>
          <select id="ci_modalidad" class="esel" style="width:100%;padding:10px;font-size:13px">
            <option value="arriendo" ${modSelArriendo}>🔑 Arriendo (${fm(pa)}/mes)</option>
            <option value="compra" ${modSelCompra}>💰 Compra (${fm(pv)})</option>
          </select>
        </div>` : `<input type="hidden" id="ci_modalidad" value="${modalidadAuto}">`}

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">Presupuesto máximo (opcional)</label>
          <input id="ci_presup" type="number" min="0" step="100000" placeholder="Ej: 1500000" value="${presupVal}" class="ffi">
          <div style="font-size:10px;color:var(--sub);margin-top:4px">Lo que puedes pagar como tope. Nos ayuda a saber si encaja.</div>
        </div>

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">¿Cuándo necesitas mudarte / cerrar? (opcional)</label>
          <input id="ci_fecha" type="date" value="${fechaVal}" class="ffi">
        </div>

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">¿Tenés crédito hipotecario aprobado?</label>
          <div style="display:flex;gap:6px" id="ci_credito_wrap">
            ${['si', 'no', 'en_tramite', 'no_sabe'].map((v) => { const labels = { si: '✅ Sí', no: '❌ No', en_tramite: '⏳ En trámite', no_sabe: '🤷 No sé' }; const sel = (prev?.credito_aprobado || '') === v; return '<button type="button" onclick="document.getElementById(\'ci_credito\').value=\'' + v + '\';document.querySelectorAll(\'#ci_credito_wrap button\').forEach(b=>{b.style.background=\'#fff\';b.style.borderColor=\'var(--brd)\';b.style.color=\'var(--tx)\'});this.style.background=\'var(--b600)\';this.style.borderColor=\'var(--b600)\';this.style.color=\'#fff\'" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid ' + (sel ? 'var(--b600)' : 'var(--brd)') + ';background:' + (sel ? 'var(--b600)' : '#fff') + ';color:' + (sel ? '#fff' : 'var(--tx)') + ';font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">' + labels[v] + '</button>'; }).join('')}
          </div>
          <input type="hidden" id="ci_credito" value="${prev?.credito_aprobado || ''}">
        </div>

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">¿Cómo planeas pagar?</label>
          <div style="display:flex;gap:6px" id="ci_pago_wrap">
            ${['credito', 'efectivo', 'mixto'].map((v) => { const labels = { credito: '💳 Crédito', efectivo: '💵 Efectivo', mixto: '🔄 Mixto' }; const sel = (prev?.tipo_pago || '') === v; return '<button type="button" onclick="document.getElementById(\'ci_pago\').value=\'' + v + '\';document.querySelectorAll(\'#ci_pago_wrap button\').forEach(b=>{b.style.background=\'#fff\';b.style.borderColor=\'var(--brd)\';b.style.color=\'var(--tx)\'});this.style.background=\'var(--b600)\';this.style.borderColor=\'var(--b600)\';this.style.color=\'#fff\'" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid ' + (sel ? 'var(--b600)' : 'var(--brd)') + ';background:' + (sel ? 'var(--b600)' : '#fff') + ';color:' + (sel ? '#fff' : 'var(--tx)') + ';font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' + labels[v] + '</button>'; }).join('')}
          </div>
          <input type="hidden" id="ci_pago" value="${prev?.tipo_pago || ''}">
        </div>

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">¿Para qué es?</label>
          <div style="display:flex;gap:6px" id="ci_prop_wrap">
            ${['vivienda', 'inversion', 'comercial'].map((v) => { const labels = { vivienda: '🏡 Vivienda', inversion: '📈 Inversión', comercial: '🏢 Comercial' }; const sel = (prev?.proposito || '') === v; return '<button type="button" onclick="document.getElementById(\'ci_prop\').value=\'' + v + '\';document.querySelectorAll(\'#ci_prop_wrap button\').forEach(b=>{b.style.background=\'#fff\';b.style.borderColor=\'var(--brd)\';b.style.color=\'var(--tx)\'});this.style.background=\'var(--b600)\';this.style.borderColor=\'var(--b600)\';this.style.color=\'#fff\'" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid ' + (sel ? 'var(--b600)' : 'var(--brd)') + ';background:' + (sel ? 'var(--b600)' : '#fff') + ';color:' + (sel ? '#fff' : 'var(--tx)') + ';font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' + labels[v] + '</button>'; }).join('')}
          </div>
          <input type="hidden" id="ci_prop" value="${prev?.proposito || ''}">
        </div>

        <div class="ff" style="margin-bottom:14px">
          <label class="ffl">Mensaje al asesor (opcional)</label>
          <textarea id="ci_msg" placeholder="Ej: Lo quiero ver el sábado, tengo fiador, necesito 3 habitaciones..." style="width:100%;min-height:60px;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;color:var(--tx);background:var(--cd)">${msgVal}</textarea>
        </div>

        ${isUpdate ? `<div style="font-size:11px;color:var(--b700);background:var(--b50);border:1px solid var(--b200);padding:8px 10px;border-radius:6px;margin-bottom:12px">📝 Ya habías expresado interés en este inmueble. Estás actualizando los datos.</div>` : ''}

        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('ciDlg').remove()" style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:10px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Cancelar</button>
          <button onclick="window.guardarInteres('${safeId}')" style="flex:2;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:800;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">${isUpdate ? '💾 Actualizar' : '💙 Enviar interés'}</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

// Score automático de compatibilidad comprador (0-100)
window.calcScoreInteres = function (interes, inmueble) {
  let score = 0;
  if (interes.credito_aprobado === 'si') score += 30;
  else if (interes.credito_aprobado === 'en_tramite') score += 15;
  if (interes.presupuesto_max && inmueble) {
    const precio = interes.modalidad === 'arriendo' ? (inmueble.precio_arriendo || 0) : (inmueble.precio_venta || 0);
    if (precio > 0 && interes.presupuesto_max >= precio) score += 30;
    else if (precio > 0 && interes.presupuesto_max >= precio * 0.8) score += 15;
  }
  if (interes.fecha_ideal) {
    const dias = (new Date(interes.fecha_ideal) - new Date()) / 86400000;
    if (dias <= 30 && dias >= 0) score += 20;
    else if (dias <= 90 && dias > 30) score += 10;
  }
  if (interes.proposito) score += 10;
  if (interes.tipo_pago) score += 10;
  return Math.min(score, 100);
};

window.getScoreLabel = function (score) {
  if (score >= 70) return { label: 'Alta', color: 'var(--green)', bg: 'var(--greenbg)', emoji: '🟢' };
  if (score >= 40) return { label: 'Media', color: 'var(--gold)', bg: 'var(--goldbg)', emoji: '🟡' };
  return { label: 'Baja', color: 'var(--red)', bg: 'var(--redbg)', emoji: '🔴' };
};

window.guardarInteres = async function (inmId) {
  const u = U(); if (!u) return;
  const dlg = document.getElementById('ciDlg'); if (!dlg) return;
  const presup = parseFloat(document.getElementById('ci_presup')?.value || '') || null;
  const fecha = document.getElementById('ci_fecha')?.value || null;
  const modalidad = document.getElementById('ci_modalidad')?.value || 'compra';
  const mensaje = (document.getElementById('ci_msg')?.value || '').trim() || null;
  const credito = document.getElementById('ci_credito')?.value || null;
  const tipoPago = document.getElementById('ci_pago')?.value || null;
  const proposito = document.getElementById('ci_prop')?.value || null;

  // Auto-score
  const { data: _inm } = await SB().from('inmuebles').select('precio_venta,precio_arriendo').eq('id', inmId).single();
  const _scoreData = { presupuesto_max: presup, fecha_ideal: fecha, modalidad, mensaje, credito_aprobado: credito, tipo_pago: tipoPago, proposito };
  const scoreAuto = window.calcScoreInteres(_scoreData, _inm);

  try {
    const { data: prev } = await SB().from('intereses_compradores')
      .select('id').eq('usuario_id', u.id).eq('inmueble_id', inmId).maybeSingle();

    if (prev) {
      const upd = { presupuesto_max: presup, fecha_ideal: fecha, modalidad, mensaje, estado: 'nuevo', updated_at: new Date().toISOString(), credito_aprobado: credito, tipo_pago: tipoPago, proposito, score_auto: scoreAuto };
      let { error } = await SB().from('intereses_compradores').update(upd).eq('id', prev.id);
      if (error && /credito_aprobado|tipo_pago|proposito|score_auto/i.test(error.message)) {
        delete upd.credito_aprobado; delete upd.tipo_pago; delete upd.proposito; delete upd.score_auto;
        ({ error } = await SB().from('intereses_compradores').update(upd).eq('id', prev.id));
      }
      if (error) throw error;
      window.toast('💾 Interés actualizado');
    } else {
      const row = {
        inmueble_id: inmId, usuario_id: u.id,
        presupuesto_max: presup, fecha_ideal: fecha, modalidad, mensaje,
        estado: 'nuevo', interes_tipo: window._interesTipo || 'comprador',
        credito_aprobado: credito, tipo_pago: tipoPago, proposito, score_auto: scoreAuto,
      };
      let { error } = await SB().from('intereses_compradores').insert(row);
      if (error && /interes_tipo|credito_aprobado|tipo_pago|proposito|score_auto/i.test(error.message)) {
        delete row.interes_tipo; delete row.credito_aprobado; delete row.tipo_pago; delete row.proposito; delete row.score_auto;
        ({ error } = await SB().from('intereses_compradores').insert(row));
      }
      if (error) throw error;
      if (typeof window.activarPerfilPublico === 'function') window.activarPerfilPublico('comprador');
      window.toast('💙 ¡Interés enviado!');
    }

    if (window.trackEvent) {
      const inmObj = findInm(inmId);
      window.trackEvent('interes', {
        inmueble_id: inmId,
        ciudad: inmObj?.ciudad, barrio: inmObj?.barrio,
        tipo_inmueble: inmObj?.tipo, negociacion: inmObj?.negociacion,
        precio: presup || inmObj?.precio_venta || inmObj?.precio_arriendo,
        habitaciones: inmObj?.habitaciones,
      });
      if (window.recalcularPreferencias) window.recalcularPreferencias(u.id).catch(() => { /* noop */ });
    }
    // Marca sugerencia como convertida si aplicaba
    SB().from('sugerencias_enviadas').update({ resultado: 'convertida', convertida_at: new Date().toISOString() })
      .eq('usuario_id', u.id).eq('inmueble_id', inmId).neq('resultado', 'convertida')
      .then(() => { /* noop */ }, (e) => console.warn('[sug conv int]', e));

    // Notifica a admins
    try {
      const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,barrio').eq('id', inmId).single();
      const titulo = '💙 Nuevo interés en ' + (inm?.tipo || 'inmueble');
      const detalle = (u.nombre || 'Un cliente') + ' está interesado en ' + (inm?.tipo || 'inmueble')
        + ' en ' + (inm?.barrio || inm?.ciudad || '') + '.'
        + (presup ? '\nPresupuesto: ' + fm(presup) : '')
        + (fecha ? '\nFecha ideal: ' + fecha : '')
        + (mensaje ? '\nMensaje: ' + mensaje : '');
      await window.noti('interes_nuevo', 'amarillo', titulo, detalle, null, 'admin', inmId);
    } catch (e) { console.warn('[guardarInteres] noti falló:', e); }

    dlg.remove();
    if (typeof window.rMisIntereses === 'function' && location.hash === '#/mis-intereses') window.rMisIntereses();
  } catch (e) {
    console.error('[guardarInteres]', e);
    if (/intereses_compradores/i.test(e.message || '')) {
      window.toast('Falta correr sql/21-intereses-compradores.sql', 'terr');
    } else if (/duplicate|unique/i.test(e.message || '')) {
      window.toast('Ya tienes un interés activo en este inmueble', 'twarn');
    } else {
      window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
    }
  }
};

// Formulario comisionista: NUNCA se piden datos del cliente/propietario.
// Solo confirmación simple + comentario opcional. HOUSE llama al comisionista.
window._abrirInteresComisionista = async function (inmId) {
  const u = U(); if (!u) return;
  const { data: p } = await SB().from('inmuebles').select('id,tipo,ciudad,barrio,codigo_house').eq('id', inmId).single();
  const desc = (p?.tipo || 'Inmueble') + ' en ' + (p?.barrio || p?.ciudad || '');
  const html = `
  <div id="ciDlg" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)" onclick="if(event.target===this)this.remove()">
    <div style="max-width:480px;width:100%;background:#fff;border-radius:20px;overflow:auto;max-height:90vh" onclick="event.stopPropagation()">
      <div style="padding:24px 20px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">💼</div>
        <div style="font-size:20px;font-weight:800;color:#8b5cf6;margin-bottom:6px">Tengo a alguien interesado</div>
        <div style="font-size:15px;color:#5a5550;line-height:1.6;margin-bottom:4px">${desc}</div>
        <div style="font-size:12px;color:#1a4f8b;font-weight:700">${p?.codigo_house || ''}</div>
      </div>
      <div style="padding:0 20px 24px">
        <div style="padding:16px;border-radius:14px;background:#8b5cf612;border:2px solid #8b5cf630;text-align:center;margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:4px">💰 TU COMISIÓN</div>
          <div style="font-size:28px;font-weight:900;color:#8b5cf6">Hasta 1.5%</div>
          <div style="font-size:14px;color:#5a5550;margin-top:4px;line-height:1.5">Del valor de venta. Si otro comisionista publicó el inmueble, la comisión se divide entre los participantes.</div>
          <div style="font-size:13px;color:#6d28d9;font-weight:700;margin-top:6px">Ejemplo: $300M → hasta $4.500.000 para ti</div>
        </div>
        <div style="background:#f5f3ff;border-radius:14px;padding:16px;margin-bottom:16px;border:1px solid #8b5cf620">
          <div style="font-size:14px;color:#1a1a1a;line-height:1.6;margin-bottom:10px">Al confirmar, nuestro equipo te contacta por WhatsApp para coordinar.</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;gap:8px;align-items:center"><div style="font-size:18px">🔒</div><div style="font-size:13px;color:#5a5550"><b>No necesitas compartir datos</b> de tu cliente. Te llamamos a ti.</div></div>
            <div style="display:flex;gap:8px;align-items:center"><div style="font-size:18px">📞</div><div style="font-size:13px;color:#5a5550">Tú coordinas con tu contacto. Nosotros contigo.</div></div>
            <div style="display:flex;gap:8px;align-items:center"><div style="font-size:18px">🤝</div><div style="font-size:13px;color:#5a5550">Si se cierra, <b>te transferimos tu parte</b>. Sin letra chica.</div></div>
          </div>
        </div>
        <div style="margin-bottom:16px"><label style="font-size:14px;font-weight:700;display:block;margin-bottom:6px">Comentario (opcional)</label><textarea id="ci_ref_msg" rows="2" placeholder="Ej: Mi cliente busca algo de 3 habitaciones, tiene presupuesto..." style="width:100%;padding:12px;border-radius:12px;border:2px solid #e0ddd8;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box"></textarea></div>
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('ciDlg').remove()" style="flex:1;padding:14px;border:1.5px solid var(--g200);border-radius:12px;background:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;color:var(--sub)">Cancelar</button>
          <button onclick="window._guardarInteresComisionista('${inmId}')" style="flex:2;padding:14px;border:none;border-radius:12px;background:#8b5cf6;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit">🤝 Confirmar interés</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window._guardarInteresComisionista = async function (inmId) {
  const u = U(); if (!u) return;
  const msg = document.getElementById('ci_ref_msg')?.value?.trim() || null;
  try {
    const row = { inmueble_id: inmId, usuario_id: u.id, estado: 'nuevo', interes_tipo: 'comisionista', mensaje: msg };
    const { error } = await SB().from('intereses_compradores').insert(row);
    if (error && /interes_tipo/i.test(error.message)) {
      delete row.interes_tipo;
      row.mensaje = '[COMISIONISTA] ' + (msg || 'Sin comentario');
      const { error: e2 } = await SB().from('intereses_compradores').insert(row);
      if (e2) throw e2;
    } else if (error) throw error;
    await window.activarPerfilPublico('comisionista');
    const { data: inm } = await SB().from('inmuebles').select('tipo,barrio').eq('id', inmId).single();
    await window.noti('interes_nuevo', 'amarillo', '🤝 Comisionista interesado', u.nombre + ' tiene un cliente para ' + (inm?.tipo || '') + ' en ' + (inm?.barrio || '') + '. Contactar al comisionista.', null, 'admin', inmId);
    document.getElementById('ciDlg')?.remove();
    window.toast('✅ ¡Confirmado! Te contactaremos por WhatsApp para coordinar.');
  } catch (e) {
    console.error('[guardarInteresComisionista]', e);
    window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
  }
};

// ══════════════════════════════════════════════════════════════════════
// FASE 4 — Calificación admin (verde/amarillo/rojo)
// ══════════════════════════════════════════════════════════════════════

window.calificarInteresRapido = async function (intId) {
  // Verde directo: sin motivo, notifica al captador
  await window._aplicarCalificacionInteres(intId, 'verde', '');
};

window.abrirCalificarInteres = function (intId, score) {
  // score = 'amarillo' | 'rojo' (necesitan motivo)
  const titulo = score === 'amarillo' ? '🟡 Pedir más información al cliente' : '🔴 Descartar interés';
  const placeholder = score === 'amarillo'
    ? 'Ej: ¿Tienes fiador? ¿Cuándo puedes ver el inmueble? Necesito más detalles del presupuesto...'
    : 'Ej: El inmueble ya está reservado. El presupuesto no alcanza. No cumple los requisitos del propietario...';
  const btnTxt = score === 'amarillo' ? '📨 Enviar al cliente' : '🔴 Descartar';
  const btnBg = score === 'amarillo' ? 'var(--gold)' : 'var(--red)';

  document.getElementById('calIntDlg')?.remove();
  const html = `
  <div id="calIntDlg" class="modal-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)">
    <div class="card" style="max-width:480px;width:100%;border-radius:14px">
      <div class="cdh"><div class="chl"><div class="chi">${score === 'amarillo' ? '🟡' : '🔴'}</div><div><div class="cht">${titulo}</div></div></div>
        <button onclick="document.getElementById('calIntDlg').remove()" style="background:none;border:none;font-size:20px;color:var(--sub);cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div class="cdb" style="padding:18px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.5">${score === 'amarillo' ? 'El cliente recibirá una notificación pidiéndole que complete o ajuste su interés.' : 'El cliente verá su interés marcado como "No disponible" con este motivo.'}</div>
        <textarea id="calIntMotivo" placeholder="${placeholder}" style="width:100%;min-height:100px;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;color:var(--tx);background:var(--cd);margin-bottom:14px"></textarea>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('calIntDlg').remove()" style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:10px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Cancelar</button>
          <button onclick="window._aplicarCalificacionInteres('${intId}','${score}',document.getElementById('calIntMotivo').value)" style="flex:2;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:800;background:${btnBg};color:#fff;cursor:pointer;font-family:inherit">${btnTxt}</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window._aplicarCalificacionInteres = async function (intId, score, motivo) {
  const u = U(); if (!u) return;
  motivo = (motivo || '').trim();
  if ((score === 'amarillo' || score === 'rojo') && !motivo) {
    window.toast('Escribe un motivo', 'terr'); return;
  }
  try {
    const { data: it, error: errLoad } = await SB().from('intereses_compradores')
      .select('*,inmueble:inmuebles(id,tipo,ciudad,barrio,captador_id,captador:usuarios!captador_id(id,nombre,email)),comprador:usuarios!usuario_id(id,nombre,email)')
      .eq('id', intId).single();
    if (errLoad) throw errLoad;
    if (!it) { window.toast('Interés no encontrado', 'terr'); return; }

    const nuevoEstado = score === 'verde' ? 'calificado' : score === 'rojo' ? 'descartado' : 'nuevo';
    // Amarillo deja estado=nuevo (sigue en cola hasta que cliente ajuste)

    const { error: errUpd } = await SB().from('intereses_compradores').update({
      score, motivo_score: motivo || null,
      calificado_por: u.id, calificado_at: new Date().toISOString(),
      estado: nuevoEstado, updated_at: new Date().toISOString(),
    }).eq('id', intId);
    if (errUpd) throw errUpd;

    const inm = it.inmueble || {};
    const compradorEmail = it.comprador?.email || '';
    const compradorNom = it.comprador?.nombre || 'Cliente';
    const captadorEmail = inm.captador?.email || '';
    const ubicacion = inm.barrio || inm.ciudad || '';
    const detalleInteres = (it.presupuesto_max ? '\n💰 Presupuesto: ' + fm(it.presupuesto_max) : '')
      + (it.fecha_ideal ? '\n📅 Fecha ideal: ' + it.fecha_ideal : '')
      + (it.mensaje ? '\n💬 ' + it.mensaje : '');

    if (score === 'verde') {
      if (captadorEmail) {
        await window.noti('interes_calificado', 'verde', '🟢 Cliente calificado para tu ' + (inm.tipo || 'inmueble'), compradorNom + ' fue calificado como buen prospecto para tu ' + (inm.tipo || 'inmueble') + ' en ' + ubicacion + '.' + detalleInteres, captadorEmail, null, inm.id);
      }
      if (it.comprador?.id) await window.mensajeDeNegocio({ inmuebleId: inm.id, clienteId: it.comprador.id, contextoTipo: 'interes', tipoMensaje: 'sistema', texto: '✅ Tu interés en ' + (inm.tipo || '') + ' en ' + ubicacion + ' fue aprobado. Un asesor te contactará pronto.' });
      window.toast('🟢 Cliente calificado y notificado');
    } else if (score === 'amarillo') {
      if (compradorEmail) {
        await window.noti('interes_pedir_info', 'amarillo', '🟡 Necesitamos más información', 'Sobre tu interés en ' + (inm.tipo || 'inmueble') + ' en ' + ubicacion + ':\n\n' + motivo, compradorEmail, null, inm.id);
      }
      if (it.comprador?.id) await window.mensajeDeNegocio({ inmuebleId: inm.id, clienteId: it.comprador.id, contextoTipo: 'interes', tipoMensaje: 'sistema', texto: '🟡 Necesitamos más información sobre tu interés en ' + (inm.tipo || '') + ' en ' + ubicacion + ': ' + motivo });
      window.toast('🟡 Solicitud enviada al cliente');
    } else if (score === 'rojo') {
      if (compradorEmail) {
        await window.noti('interes_descartado', 'rojo', '🔴 Tu interés fue revisado', 'Sobre tu interés en ' + (inm.tipo || 'inmueble') + ' en ' + ubicacion + ':\n\n' + motivo, compradorEmail, null, inm.id);
      }
      if (it.comprador?.id) await window.mensajeDeNegocio({ inmuebleId: inm.id, clienteId: it.comprador.id, contextoTipo: 'interes', tipoMensaje: 'declinacion', texto: motivo });
      window.toast('🔴 Interés descartado');
    }

    document.getElementById('calIntDlg')?.remove();
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch (e) {
    console.error('[_aplicarCalificacionInteres]', e);
    if (/intereses_compradores|score|motivo_score/i.test(e.message || '')) {
      window.toast('Falta correr sql/21-intereses-compradores.sql', 'terr');
    } else {
      window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
    }
  }
};
