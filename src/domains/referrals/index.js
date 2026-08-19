/**
 * Módulo: domains/referrals
 *
 * Programa de referidos ("refiere arriendos y gana comisiones"). Extraído
 * de las secciones 23 (Referral UX) y 24 (Referral Program) de functions.js.
 *
 * Superficie:
 *   UX (renderers de contenido informativo):
 *     renderHowItWorks, renderReferralPolicies, renderReferralStrategies
 *     renderCommissionDashboard, renderReferralInbox
 *     renderReferralBanner (banner en el portal público)
 *
 *   Programa (creación + admin + wizard):
 *     normTelRef, normEmailRef (helpers de normalización)
 *     crearReferido (con dedup multi-tabla, rate limit, anti self-referral)
 *     iniciarVerificacion, aprobarReferido, rechazarConMotivo + _ejecutarRechazo
 *     vincularPorCodigo, marcarComisionPagada, guardarNotasAdmin
 *     registrarComisionArrendado (auto al pasar a Arrendado)
 *     compartirPropuestaPropietario, copiarPropuesta
 *     actualizarTelReferido
 *     Wizard: _refData, _refStep, refNext, refPrev, refSubmit, refUpdateCalc
 *
 * Deps window.*: toast, cfShow, go, getAdminIds, notificar, obtenerMetodoPago,
 *                userStore, renderMisReferidos
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { houseWaUrl } from '../../core/constants.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));

// ══════════════════════════════════════════════════════════════════════
// 23. REFERRAL UX — Renderers informativos + dashboard + inbox admin
// ══════════════════════════════════════════════════════════════════════

window.renderHowItWorks = function (startOpen) {
  const open = startOpen ? ' open' : '';
  const steps = [
    { icon: '👀', color: '#f59e0b', title: 'Paso 1 · Encuentra un inmueble', desc: 'Camina por tu barrio, tu conjunto, o pregunta a conocidos. ¿Ves un aviso de "Se Arrienda"? ¡Ese es tu negocio!' },
    { icon: '🤝', color: '#3b82f6', title: 'Paso 2 · Habla con el propietario', desc: 'Cuéntale los beneficios: pago garantizado, estudio al inquilino, contrato legal, publicación en 3 portales. Tienes material de apoyo para compartir por WhatsApp.' },
    { icon: '📝', color: '#8b5cf6', title: 'Paso 3 · Registra el referido aquí', desc: 'Llena el formulario con los datos del propietario y del inmueble. ¡Toma menos de 2 minutos!' },
    { icon: '📄', color: '#10b981', title: 'Paso 4 · Contrato con propietario = $50.000 para ti', desc: 'Si el propietario acepta nuestros servicios y firma contrato de administración con la inmobiliaria, recibes tu bono de $50.000. ¡Así de simple!' },
    { icon: '💰', color: '#059669', title: 'Paso 5 · Inmueble arrendado = el resto de tu comisión', desc: 'Cuando consigamos inquilino y se firme contrato de arriendo, ganas el resto de la comisión (10% del canon - bono). Un apto de $2.5M = $250.000 para ti.' },
  ];
  const timeline = steps.map((s, i) => '<div style="position:relative;padding-bottom:' + (i < 4 ? '24px' : '0') + '">' + (i < 4 ? '<div style="position:absolute;left:-20px;top:28px;bottom:0;width:2px;background:var(--g200)"></div>' : '') + '<div style="position:absolute;left:-28px;top:2px;width:20px;height:20px;border-radius:50%;background:' + s.color + ';display:flex;align-items:center;justify-content:center;font-size:10px">' + s.icon + '</div><div style="font-size:13px;font-weight:700;color:' + s.color + ';margin-bottom:3px">' + s.title + '</div><div style="font-size:12px;color:var(--sub);line-height:1.5">' + s.desc + '</div></div>').join('');
  return '<details' + open + ' style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">📖</span> ¿Cómo funciona el programa de referidos?</summary><div style="padding:0 16px 20px"><div style="position:relative;padding-left:32px;margin-top:8px">' + timeline + '</div><div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:20px;text-align:center"><div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:8px">💡 Ejemplo real</div><div style="font-size:12px;color:#065f46;line-height:1.6">Don Carlos, celador de un conjunto, refirió <strong>3 apartamentos</strong> en un mes. Canon promedio: $1.800.000. <strong>Ganó $540.000</strong> sin salir de su trabajo.</div></div></div></details>';
};

window.renderReferralPolicies = function () {
  return '<details style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">📋</span> Políticas y condiciones</summary><div style="padding:0 16px 20px;font-size:12px;color:var(--sub);line-height:1.7">'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-top:12px;margin-bottom:6px">💰 Sobre la comisión</div><div style="padding-left:12px;border-left:2px solid var(--b600);margin-bottom:14px">• Tu comisión es sobre el <strong>valor del canon</strong> mensual (no sobre la administración).<br>• Dos partes: <strong>$50.000 de bono</strong> cuando el propietario firma contrato con la inmobiliaria + <strong>el resto</strong> cuando se arriende el inmueble.<br>• Se calcula sobre el canon final pactado.</div>'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">📋 Sobre la administración</div><div style="padding-left:12px;border-left:2px solid var(--b600);margin-bottom:14px">• La inmobiliaria cobra el <strong>10% + IVA</strong> del canon mensual por administración.<br>• El IVA es del 19% sobre la comisión (aplica por facturación en Colombia).<br>• Ejemplo: canon de $2.000.000 → administración $200.000 + IVA $38.000 = $238.000.</div>'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">📅 Fechas de pago al propietario</div><div style="padding-left:12px;border-left:2px solid var(--gold);margin-bottom:14px">• <strong>Corte del 1 al 30:</strong> el canon se paga el <strong>10</strong> de cada mes.<br>• <strong>Corte del 15 al 14:</strong> el canon se paga el <strong>25</strong> de cada mes.<br>• Siempre por transferencia a la cuenta del propietario.</div>'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">✅ Requisitos</div><div style="padding-left:12px;border-left:2px solid var(--green);margin-bottom:14px">• Propietario dispuesto a firmar contrato de administración.<br>• Inmueble en condiciones habitables.<br>• Sin contrato vigente con otra inmobiliaria.<br>• Datos reales y verificables.</div>'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">⏰ Tiempos</div><div style="padding-left:12px;border-left:2px solid var(--gold);margin-bottom:14px">• Verificación: máximo <strong>5 días hábiles</strong>.<br>• Bono: se confirma al verificar.<br>• Comisión final: dentro de <strong>15 días</strong> después del arriendo.<br>• Pago: transferencia o efectivo.</div>'
    + '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">📌 General</div><div style="padding-left:12px;border-left:2px solid var(--sub);margin-bottom:14px">• Cualquier persona mayor de edad puede participar.<br>• No hay límite de referidos.<br>• Si uno es rechazado, puedes referir otro diferente.</div>'
    + '<div style="text-align:center;padding:12px;background:var(--cd2);border-radius:10px;margin-top:8px"><div style="font-size:11px;color:var(--sub)">¿Dudas?</div><a href="' + houseWaUrl('Hola, tengo una pregunta sobre referidos') + '" target="_blank" style="display:inline-block;margin-top:6px;padding:8px 20px;background:#25d366;color:#fff;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none">📞 WhatsApp</a></div></div></details>';
};

window.renderReferralStrategies = function () {
  const strats = [
    { n: 1, c: '#3b82f6', t: 'El enfoque del "Vecino que ayuda"', q: '"Vi que está arrendando. Yo trabajo con una inmobiliaria que consigue inquilino, le hace estudio, y le paga cada 10 sin falta. ¿Le cuento?"', tip: 'No vendas. Ayuda. Ofreces solución a un problema que ya tiene.' },
    { n: 2, c: '#8b5cf6', t: 'El miedo al mal inquilino', q: '"La ventaja es que hacen estudio de crédito, verifican en DataCrédito, piden referencias... No entra cualquier persona. Y si hay problemas, ellos se encargan."', tip: 'El estudio de crédito y la póliza son los argumentos más fuertes.' },
    { n: 3, c: '#10b981', t: 'El argumento del 10% vs. la "joda"', q: '"¿Cuánto tiempo lleva con el aviso? Cada mes vacío son $X que pierde. Por el 10% se olvida de todo: cobros, contratos, mantenimiento."', tip: 'Si lleva +1 mes vacío, enfatiza el costo de oportunidad.' },
    { n: 4, c: '#f59e0b', t: 'Para celadores y administradores', q: '"Don/Doña [nombre], vi que desocuparon el apto del [piso]. Conozco una inmobiliaria seria que le ayuda a arrendar rápido."', tip: 'Ustedes saben cuándo se desocupan los aptos antes que nadie. Ese timing es oro.' },
    { n: 5, c: '#ef4444', t: 'El WhatsApp de seguimiento', q: '"Hola [nombre], ¿pudo revisar la info de la inmobiliaria? Quedo atento por si tiene dudas."', tip: 'Usa el botón "Enviar propuesta" de esta app. Si no responde en 3 días, envía mensaje corto.' },
  ];
  const objs = [
    ['"No quiero pagar comisión"', '"No paga nada inicial. Solo se cobra cuando YA está arrendado y generando plata."'],
    ['"Ya tengo inquilino"', '"Perfecto, la inmobiliaria le hace estudio y contrato a su inquilino. Se protege legalmente."'],
    ['"Las inmobiliarias son lentas"', '"Esta publica en 3 portales al tiempo. Promedio de arriendo: menos de 30 días."'],
    ['"Prefiero manejarlo yo"', '"Si el inquilino queda mal, ¿tiene abogado para desalojo? ¿Póliza de daños? Todo eso está en el 10%."'],
    ['"Déjeme pensarlo"', '"Sin presión. Le envío la info por WhatsApp. Y puede llamar directo a la inmobiliaria."'],
  ];
  const sh = strats.map((s) => '<div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:24px;height:24px;border-radius:50%;background:' + s.c + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">' + s.n + '</div><div style="font-size:13px;font-weight:700">' + s.t + '</div></div><div style="padding-left:32px;font-size:12px;color:var(--sub);line-height:1.5"><div style="background:var(--cd2);border-radius:8px;padding:10px;font-style:italic;margin-bottom:6px">' + s.q + '</div><div style="font-size:11px"><strong>Tip:</strong> ' + s.tip + '</div></div></div>').join('');
  const oh = objs.map((o) => '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:2px">' + o[0] + '</div><div style="font-size:11px;color:var(--sub);padding-left:12px;border-left:2px solid var(--green);line-height:1.5">' + o[1] + '</div></div>').join('');
  return '<details style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">🎯</span> Guía: estrategias para cerrar más referidos</summary><div style="padding:0 16px 20px"><div style="margin-top:12px">' + sh + '</div><div style="margin-top:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">💬 Objeciones comunes</div>' + oh + '</div><div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:16px;text-align:center"><div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:4px">🏆 Meta del mes</div><div style="font-size:12px;color:#78350f">3 referidos cerrados = entre <strong>$200K y $750K</strong> de ingreso extra.</div></div></div></details>';
};

window.renderCommissionDashboard = function (stats, refs) {
  const pendPago = (refs || []).filter((r) => r.bono_pagado && !r.comision_pagada && r.estado === 'arrendado').reduce((s, r) => s + (r.comision_monto || 0), 0);
  const enProc = (refs || []).filter((r) => r.estado === 'registrado' || r.estado === 'verificando').length;
  const potencial = (refs || []).filter((r) => !['rechazado', 'arrendado'].includes(r.estado)).reduce((s, r) => s + Math.max(0, Math.round((r.canon_aproximado || 0) * 0.10)), 0);
  let h = '<div style="background:linear-gradient(135deg,#1e3a5f,#1e40af);border-radius:16px;padding:24px;margin-bottom:16px;color:#fff;text-align:center">';
  h += '<div style="font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Total ganado</div>';
  h += '<div style="font-family:Fraunces,serif;font-size:36px;font-weight:700">' + fm(stats.totalGanado) + '</div>';
  h += '<div style="display:flex;justify-content:center;gap:24px;margin-top:12px;font-size:12px;opacity:.9"><div><div style="font-size:18px;font-weight:700">' + fm(stats.bonosCobrados) + '</div><div style="font-size:10px;opacity:.7">Bonos</div></div><div style="width:1px;background:rgba(255,255,255,.3)"></div><div><div style="font-size:18px;font-weight:700">' + fm(stats.comisionesCobradas) + '</div><div style="font-size:10px;opacity:.7">Comisiones</div></div></div>';
  h += '<div style="display:flex;justify-content:center;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2)">';
  if (pendPago > 0) h += '<div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 16px;font-size:11px"><span style="color:#fbbf24">⏳</span> Pendiente: <strong>' + fm(pendPago) + '</strong></div>';
  if (enProc > 0) h += '<div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 16px;font-size:11px">🔄 ' + enProc + ' en proceso' + (potencial > 0 ? ' · Potencial: <strong>' + fm(potencial) + '</strong>' : '') + '</div>';
  h += '</div></div>';
  const contratoProp = (refs || []).filter((r) => r.estado === 'contrato_firmado').length;
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">';
  const _f = (e) => "window._refFiltro='" + e + "';renderMisReferidos()";
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--brd);cursor:pointer" onclick="window._refFiltro=\'en_proceso\';renderMisReferidos()"><div style="font-size:18px;font-weight:700;color:var(--gold)">' + enProc + '</div><div style="font-size:9px;color:var(--sub)">En proceso</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--b600);cursor:pointer" onclick="' + _f('contrato_firmado') + '"><div style="font-size:18px;font-weight:700;color:var(--b600)">' + contratoProp + '</div><div style="font-size:9px;color:var(--sub)">Contrato prop.</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--green);cursor:pointer" onclick="' + _f('arrendado') + '"><div style="font-size:18px;font-weight:700;color:var(--green)">' + stats.arrendados + '</div><div style="font-size:9px;color:var(--sub)">Arrendados</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--red);cursor:pointer" onclick="' + _f('rechazado') + '"><div style="font-size:18px;font-weight:700;color:var(--red)">' + stats.rechazados + '</div><div style="font-size:9px;color:var(--sub)">Rechazados</div></div>';
  h += '</div>';
  return h;
};

window.renderReferralInbox = async function (containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const { data: pend } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(nombre,foto,telefono_contacto)').in('estado', ['registrado', 'verificando']).order('created_at', { ascending: false }).limit(10);
  if (!pend?.length) { el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--sub);font-size:12px">✅ Sin referidos pendientes</div>'; return; }
  let h = '<div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">📥</span> Referidos recibidos <span style="background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">' + pend.length + '</span></div>';
  pend.forEach((r) => {
    const mins = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000);
    const tTxt = mins < 60 ? 'Hace ' + mins + ' min' : mins < 1440 ? 'Hace ' + Math.floor(mins / 60) + 'h' : 'Hace ' + Math.floor(mins / 1440) + ' días';
    const esNuevo = r.estado === 'registrado';
    h += '<div style="background:var(--cd);border:1.5px solid ' + (esNuevo ? 'var(--gold)' : 'var(--brd)') + ';border-radius:12px;padding:12px;margin-bottom:8px">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += r.referidor?.foto ? '<img src="' + r.referidor.foto + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">' : '<div style="width:32px;height:32px;border-radius:50%;background:var(--b600);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">' + (r.referidor?.nombre?.[0] || '?') + '</div>';
    h += '<div style="flex:1"><div style="font-size:13px;font-weight:700">' + (r.referidor?.nombre || '?') + '</div><div style="font-size:10px;color:var(--sub)">' + tTxt + '</div></div>';
    h += '<span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px;background:' + (esNuevo ? '#fef3c7' : '#dbeafe') + ';color:' + (esNuevo ? '#92400e' : '#1e40af') + '">' + (esNuevo ? 'NUEVO' : 'VERIFICANDO') + '</span></div>';
    h += '<div style="background:var(--cd2);border-radius:8px;padding:10px;margin-bottom:8px;font-size:12px">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--sub)">Propietario</span><span style="font-weight:700">' + r.propietario_nombre + '</span></div>';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--sub)">Inmueble</span><span style="font-weight:700">' + (r.tipo_inmueble || '?') + ' · ' + (r.barrio || r.ciudad || '') + '</span></div>';
    if (r.canon_aproximado) h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--sub)">Canon</span><span style="font-weight:700;color:var(--green)">' + fm(r.canon_aproximado) + '/mes</span></div>';
    if (r.foto_aviso_url) h += '<div style="margin-top:8px"><img src="' + r.foto_aviso_url + '" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px"></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<a href="https://wa.me/57' + (r.propietario_telefono || '').replace(/^57/, '') + '" target="_blank" style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:#25d366;color:#fff;text-align:center;text-decoration:none">📞 Propietario</a>';
    if (esNuevo) h += '<button style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--gold);color:#fff;font-family:inherit;cursor:pointer" onclick="iniciarVerificacion(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">🔍 Verificar</button>';
    else h += '<button style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="aprobarReferido(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">✅ Aprobar</button>';
    h += '<button style="padding:8px 12px;border:1.5px solid var(--rb);border-radius:8px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="rechazarConMotivo(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">❌</button>';
    h += '</div></div>';
  });
  h += '<div style="text-align:center;margin-top:8px"><a onclick="go(\'mis-referidos\')" style="font-size:12px;color:var(--b600);cursor:pointer;font-weight:600">Ver todos los referidos →</a></div>';
  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════════
// 24. REFERRAL PROGRAM — Crear + admin + auto-comisión
// ══════════════════════════════════════════════════════════════════════

const BONO_BASE = 50000;
const COMISION_PCT = 0.10;
const REF_RATE_DAY = 5;
const REF_RATE_WEEK = 20;

// Helpers de normalización
window.normTelRef = function (t) {
  let x = (t || '').replace(/\D/g, '');
  if (x.startsWith('57') && x.length === 12) x = x.slice(2);
  return x;
};
window.normEmailRef = function (e) {
  const v = (e || '').trim().toLowerCase();
  return v || null;
};

// Crear referido (con dedup multi-tabla, rate limit, anti self-referral, foto hash)
window.crearReferido = async function (d) {
  if (!d.propNombre?.trim()) { window.toast('Nombre del propietario obligatorio', 'twarn'); return null; }
  if (!d.propTelefono?.trim()) { window.toast('Teléfono del propietario obligatorio', 'twarn'); return null; }
  if (!d.comoEncontro) { window.toast('Selecciona cómo lo encontraste', 'twarn'); return null; }

  // Capa 1 — Normalización y validación estricta
  const tel = window.normTelRef(d.propTelefono);
  const email = window.normEmailRef(d.propEmail);
  if (tel.length !== 10 || !tel.startsWith('3')) {
    window.toast('Teléfono inválido. Debe ser celular colombiano de 10 dígitos (3XXXXXXXXX)', 'twarn');
    return null;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.toast('Email inválido', 'twarn'); return null;
  }

  const u = U();
  if (!u) { window.toast('Sesión expirada', 'twarn'); return null; }

  // Capa 2 — Self-referral guard
  const myTel = window.normTelRef(u.telefono_contacto);
  const myEmail = window.normEmailRef(u.email || u.usuario);
  if (tel && myTel && tel === myTel) { window.toast('No puedes referirte a ti mismo', 'twarn'); return null; }
  if (email && myEmail && email === myEmail) { window.toast('No puedes referirte a ti mismo', 'twarn'); return null; }

  // Capa 5 — Rate limit por referidor
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: cDay }, { count: cWeek }] = await Promise.all([
    SB().from('referidos').select('id', { count: 'exact', head: true }).eq('referidor_id', u.id).gte('created_at', dayAgo),
    SB().from('referidos').select('id', { count: 'exact', head: true }).eq('referidor_id', u.id).gte('created_at', weekAgo),
  ]);
  if ((cDay || 0) >= REF_RATE_DAY) { window.toast('Límite diario alcanzado (' + REF_RATE_DAY + ' referidos/día). Intenta mañana.', 'twarn'); return null; }
  if ((cWeek || 0) >= REF_RATE_WEEK) { window.toast('Límite semanal alcanzado (' + REF_RATE_WEEK + ' referidos/semana).', 'twarn'); return null; }

  // Capa 3 — Cruce multi-tabla (referidos, inmuebles, usuarios) + cooldown 30d para rechazos subjetivos
  const COOLDOWN_DAYS = 30;
  const cooldownCut = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).getTime();
  const isBlockingReferral = (rows) => {
    if (!rows?.length) return null;
    for (const r of rows) {
      if (r.estado !== 'rechazado') return r;
      if (r.tipo_rechazo === 'objetivo') return r;
      if (r.tipo_rechazo === 'subjetivo' && new Date(r.created_at).getTime() > cooldownCut) return r;
    }
    return null;
  };

  const checks = [
    SB().from('referidos').select('id,estado,tipo_rechazo,created_at,referidor:usuarios!referidor_id(nombre)').eq('propietario_telefono', tel).order('created_at', { ascending: false }).limit(5),
    SB().from('inmuebles').select('id,codigo_house,captador:usuarios!captador_id(nombre)').eq('propietario_telefono', tel).eq('eliminado', false).limit(1),
    SB().from('usuarios').select('id,nombre,tipo_usuario').eq('telefono_contacto', tel).limit(1),
  ];
  if (email) {
    checks.push(SB().from('referidos').select('id,estado,tipo_rechazo,created_at,referidor:usuarios!referidor_id(nombre)').eq('propietario_email', email).order('created_at', { ascending: false }).limit(5));
    checks.push(SB().from('inmuebles').select('id,codigo_house,captador:usuarios!captador_id(nombre)').eq('propietario_email', email).eq('eliminado', false).limit(1));
    checks.push(SB().from('usuarios').select('id,nombre,tipo_usuario').eq('email', email).limit(1));
  }
  // Capa 7 — foto hash (solo si viene)
  if (d.fotoHash) {
    checks.push(SB().from('referidos').select('id,referidor:usuarios!referidor_id(nombre)').eq('foto_hash', d.fotoHash).not('estado', 'eq', 'rechazado').limit(1));
  }
  const results = await Promise.all(checks);
  let idx = 0;
  const refTel = results[idx++];
  const invTel = results[idx++];
  const usrTel = results[idx++];
  const refMail = email ? results[idx++] : null;
  const invMail = email ? results[idx++] : null;
  const usrMail = email ? results[idx++] : null;
  const fotoDup = d.fotoHash ? results[idx++] : null;

  const blockRefTel = isBlockingReferral(refTel?.data);
  if (blockRefTel) { window.toast('Este propietario ya fue referido por ' + (blockRefTel.referidor?.nombre || 'otro referidor'), 'twarn'); return null; }
  const blockRefMail = isBlockingReferral(refMail?.data);
  if (blockRefMail) { window.toast('Este email ya fue referido por ' + (blockRefMail.referidor?.nombre || 'otro referidor'), 'twarn'); return null; }
  if (invTel?.data?.length) { window.toast('Este propietario ya está en el inventario House (código ' + (invTel.data[0].codigo_house || '?') + ')', 'twarn'); return null; }
  if (invMail?.data?.length) { window.toast('Este email ya está en el inventario House (código ' + (invMail.data[0].codigo_house || '?') + ')', 'twarn'); return null; }
  if (usrTel?.data?.length) { const tipo = usrTel.data[0].tipo_usuario || 'interno'; window.toast('Este teléfono ya pertenece a un usuario del portal (' + tipo + ')', 'twarn'); return null; }
  if (usrMail?.data?.length) { const tipo = usrMail.data[0].tipo_usuario || 'interno'; window.toast('Este email ya pertenece a un usuario del portal (' + tipo + ')', 'twarn'); return null; }
  if (fotoDup?.data?.length) { window.toast('Esta misma foto del aviso ya fue usada por ' + (fotoDup.data[0].referidor?.nombre || 'otro referidor'), 'twarn'); return null; }

  const { data, error } = await SB().from('referidos').insert({
    referidor_id: u.id, propietario_nombre: d.propNombre.trim(), propietario_telefono: tel,
    propietario_email: email, tipo_inmueble: d.tipo || null,
    ciudad: d.ciudad?.trim() || 'Pereira', barrio: d.barrio?.trim() || null,
    direccion_aprox: d.direccion?.trim() || null, canon_aproximado: d.canon ? parseFloat(d.canon) : null,
    foto_aviso_url: d.fotoUrl || null, foto_hash: d.fotoHash || null,
    como_encontro: d.comoEncontro, notas: d.notas?.trim() || null,
    estado: 'registrado', bono_monto: BONO_BASE, comision_porcentaje: COMISION_PCT,
  }).select().single();
  if (error) {
    if (error.code === '23505') { window.toast('Este propietario ya fue referido (conflicto de concurrencia)', 'twarn'); return null; }
    window.toast('Error: ' + error.message, 'terr');
    return null;
  }
  const _admins = await window.getAdminIds();
  await window.notificar({
    tipo: 'referido_nuevo', categoria: 'referido',
    titulo: '🤝 Nuevo referido de ' + u.nombre,
    mensaje: u.nombre + ' refirió ' + (d.tipo || 'inmueble') + ' en ' + (d.barrio || d.ciudad || '?') + '. Propietario: ' + d.propNombre + ' (' + tel + ')' + (d.canon ? '. Canon aprox: ' + fm(d.canon) : ''),
    icono: '🤝', color: '#f59e0b',
    destinatarios: _admins,
    accion_tipo: 'abrir_referido', accion_destino: data.id,
    contexto_tipo: 'referido', contexto_id: data.id,
    prioridad: 'alta',
  });
  window.toast('🤝 Referido registrado exitosamente');
  return data;
};

// --- Admin actions ---
window.iniciarVerificacion = async function (id) {
  await SB().from('referidos').update({ estado: 'verificando' }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_verificando', categoria: 'referido',
    titulo: '🔍 Tu referido está siendo verificado',
    mensaje: 'Estamos contactando al propietario del ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || ''),
    icono: '🔍', color: '#3b82f6',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'normal',
  });
  window.toast('🔍 En verificación');
};

window.aprobarReferido = async function (id) {
  const u = U();
  await SB().from('referidos').update({ estado: 'contrato_firmado', verificado_por: u.id, verificado_at: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor:usuarios!referidor_id(id,nombre,usuario,email),tipo_inmueble,barrio,ciudad').eq('id', id).single();
  const refId = r?.referidor?.id;
  const metodo = await window.obtenerMetodoPago(refId);
  if (!metodo && refId) {
    await window.notificar({
      tipo: 'configurar_pago', categoria: 'pago',
      titulo: '💳 Configura tu método de pago',
      mensaje: '¡Tu referido fue aprobado! Para recibir tu bono de ' + fm(BONO_BASE) + ', configura dónde quieres recibir tus pagos en Mi cuenta → Método de pago.',
      icono: '💳', color: '#f59e0b',
      destinatarios: [refId],
      accion_tipo: 'abrir_pago', accion_destino: null,
      contexto_tipo: 'referido', contexto_id: id,
      prioridad: 'alta',
    });
  }
  if (refId) await window.notificar({
    tipo: 'referido_aprobado', categoria: 'referido',
    titulo: '🎉 ¡Tu referido fue aprobado!',
    mensaje: '¡Felicidades ' + (r?.referidor?.nombre || '') + '! Contrato con propietario firmado. Tu bono de ' + fm(BONO_BASE) + ' está pendiente de pago.' + (!metodo ? ' Configura tu método de pago para recibirlo.' : ''),
    icono: '🎉', color: '#10b981',
    destinatarios: [refId],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'alta',
  });
  window.toast('✅ Aprobado · Bono ' + fm(BONO_BASE) + ' pendiente de pago');
};

window.rechazarConMotivo = function (id) {
  const motivos = [
    'Propietario no está interesado en inmobiliaria',
    'Propietario ya tiene contrato con otra inmobiliaria',
    'Inmueble ya está arrendado',
    'Inmueble no cumple condiciones para arriendo',
    'Datos falsos o teléfono inexistente',
    'Inmueble ya está en el inventario de House',
    'Propietario tiene impedimentos legales',
    'No se pudo contactar al propietario',
    'Otro motivo',
  ];
  const html = '<div class="cfdlg" id="rechazoDlg" style="display:flex"><div class="cfbox" style="text-align:left;max-width:400px">'
    + '<div style="font-size:16px;font-weight:800;text-align:center;margin-bottom:12px">❌ Rechazar referido</div>'
    + '<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Motivo del rechazo</label>'
    + '<select id="rechazoMotivo" class="esel" style="width:100%;font-size:12px;padding:8px"><option value="">— Selecciona el motivo —</option>'
    + motivos.map((m) => '<option value="' + m + '">' + m + '</option>').join('') + '</select></div>'
    + '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Nota adicional (opcional)</label>'
    + '<textarea id="rechazoNota" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;font-family:inherit;min-height:40px;resize:none;color:var(--tx);background:var(--cd)" placeholder="Detalle adicional..."></textarea></div>'
    + '<div style="display:flex;gap:8px"><button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="document.getElementById(\'rechazoDlg\').remove()">Cancelar</button>'
    + '<button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="_ejecutarRechazo(\'' + id + '\')">❌ Rechazar</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  return new Promise((r) => { window._rechazoResolve = r; });
};

window._ejecutarRechazo = async function (id) {
  const motivo = document.getElementById('rechazoMotivo')?.value;
  if (!motivo) { window.toast('Selecciona un motivo', 'twarn'); return; }
  const nota = document.getElementById('rechazoNota')?.value?.trim();
  const motivoFinal = motivo + (nota ? ' — ' + nota : '');
  // Capa 6 — objetivo (bloqueo permanente) vs subjetivo (30d cooldown)
  const motivosObjetivos = [
    'Datos falsos o teléfono inexistente',
    'Inmueble ya está en el inventario de House',
    'Propietario tiene impedimentos legales',
  ];
  const tipoRechazo = motivosObjetivos.includes(motivo) ? 'objetivo' : 'subjetivo';
  document.getElementById('rechazoDlg')?.remove();
  const u = U();
  await SB().from('referidos').update({ estado: 'rechazado', motivo_rechazo: motivoFinal, tipo_rechazo: tipoRechazo, verificado_por: u.id, verificado_at: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_rechazado', categoria: 'referido',
    titulo: '❌ Referido no aprobado',
    mensaje: 'Tu referido del ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || '') + ' no fue aprobado. Motivo: ' + motivoFinal,
    icono: '❌', color: '#ef4444',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'alta',
  });
  window.toast('❌ Rechazado');
  if (window._rechazoResolve) { window._rechazoResolve(); window._rechazoResolve = null; }
  if (typeof window.renderMisReferidos === 'function') window.renderMisReferidos();
};

window.vincularPorCodigo = async function (refId) {
  const input = document.getElementById('vinc_' + refId); if (!input) return;
  const cod = input.value.trim(); if (!cod) { window.toast('Ingresa código', 'twarn'); return; }
  let q = SB().from('inmuebles').select('id');
  if (cod.startsWith('HOUSE-')) q = q.eq('codigo_house', cod); else q = q.eq('id', cod);
  const { data } = await q.single();
  if (!data) { window.toast('Inmueble no encontrado', 'terr'); return; }
  await SB().from('referidos').update({ inmueble_id: data.id, estado: 'publicado', publicado_at: new Date().toISOString() }).eq('id', refId);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio,ciudad').eq('id', refId).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_publicado', categoria: 'referido',
    titulo: '📢 ¡Tu referido está publicado!',
    mensaje: 'El ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || r.ciudad || '') + ' ya está en portales. Te avisaremos cuando se arriende.',
    icono: '📢', color: '#3b82f6',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: refId,
    contexto_tipo: 'referido', contexto_id: refId,
    prioridad: 'normal',
  });
  window.toast('📋 Vinculado y publicado'); window.renderMisReferidos();
};

window.marcarComisionPagada = async function (id) {
  const ok = await window.cfShow('💰', '¿Marcar comisión como pagada?', 'Confirma que ya transferiste al referidor.'); if (!ok) return;
  await SB().from('referidos').update({ comision_pagada: true, comision_fecha_pago: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,comision_monto').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'comision_pagada', categoria: 'pago',
    titulo: '✅ ¡Comisión pagada!',
    mensaje: 'Tu comisión de ' + fm(r.comision_monto || 0) + ' fue pagada. ¡Gracias por referir!',
    icono: '✅', color: '#10b981',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'normal',
  });
  window.toast('💰 Comisión pagada');
};

window.guardarNotasAdmin = async function (id, notas) {
  await SB().from('referidos').update({ notas_admin: notas }).eq('id', id);
  window.toast('📝 Nota guardada');
};

// Auto-comisión cuando el inmueble pasa a Arrendado (llamado desde cierres)
window.registrarComisionArrendado = async function (inmuebleId) {
  const { data: ref } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(nombre,usuario,email)').eq('inmueble_id', inmuebleId).in('estado', ['contrato_firmado', 'publicado']).single();
  if (!ref) return;
  const { data: inm } = await SB().from('inmuebles').select('precio_arriendo').eq('id', inmuebleId).single();
  const canon = inm?.precio_arriendo || ref.canon_real || ref.canon_aproximado || 0;
  const comNeta = Math.max(0, Math.round(canon * ref.comision_porcentaje) - ref.bono_monto);
  await SB().from('referidos').update({ estado: 'arrendado', comision_monto: comNeta, canon_real: canon, arrendado_at: new Date().toISOString() }).eq('id', ref.id);
  if (ref.referidor_id) await window.notificar({
    tipo: 'comision_lista', categoria: 'pago',
    titulo: '💰 ¡Comisión lista! ' + fm(comNeta),
    mensaje: '¡Felicidades ' + (ref.referidor?.nombre || '') + '! Canon: ' + fm(canon) + '/mes. Comisión: ' + fm(comNeta),
    icono: '💰', color: '#10b981',
    destinatarios: [ref.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: ref.id,
    contexto_tipo: 'referido', contexto_id: ref.id,
    prioridad: 'alta',
  });
  const _admins2 = await window.getAdminIds();
  await window.notificar({
    tipo: 'comision_pendiente', categoria: 'pago',
    titulo: '💰 Comisión pendiente: ' + fm(comNeta),
    mensaje: 'Referido de ' + (ref.referidor?.nombre || '?') + ' fue arrendado. Pagar ' + fm(comNeta),
    icono: '💰', color: '#f59e0b',
    destinatarios: _admins2,
    accion_tipo: 'abrir_referido', accion_destino: ref.id,
    contexto_tipo: 'referido', contexto_id: ref.id,
    prioridad: 'alta', escalable: true, horas_para_escalar: 48,
  });
};

// Propuesta al propietario por WhatsApp
window.compartirPropuestaPropietario = function (ref) {
  const tel = ref?.propietario_telefono || '';
  const msg = '💰 *Arriende su inmueble y reciba el 90% del canon cada mes SIN MOVER UN DEDO*\n\n'
    + '✅ Sin costo inicial\n'
    + '✅ Pago garantizado\n'
    + '✅ Nosotros manejamos TODO\n\n'
    + 'Conozca el sistema:\n'
    + 'https://inmobiliariahouse.com.co/#/propietarios';
  window.open('https://wa.me/57' + tel.replace(/^57/, '') + '?text=' + encodeURIComponent(msg), '_blank');
};

function _getPropuestaTexto() {
  return '💰 Arriende su inmueble y reciba el 90% del canon cada mes SIN MOVER UN DEDO\n\n'
    + '✅ Sin costo inicial\n'
    + '✅ Pago garantizado\n'
    + '✅ Nosotros manejamos TODO\n\n'
    + 'Conozca el sistema:\n'
    + 'https://inmobiliariahouse.com.co/#/propietarios';
}

window.copiarPropuesta = function () {
  const texto = _getPropuestaTexto();
  navigator.clipboard.writeText(texto).then(() => {
    window.toast('📋 Texto copiado al portapapeles');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    window.toast('📋 Texto copiado');
  });
};

window.actualizarTelReferido = async function (refId, nuevoTel) {
  const tel = (nuevoTel || '').replace(/\D/g, '');
  if (tel.length < 7) { window.toast('Teléfono inválido', 'twarn'); return; }
  try {
    await SB().from('referidos').update({ propietario_telefono: tel }).eq('id', refId);
    window.toast('📞 Teléfono actualizado');
  } catch (e) { window.toast('Error: ' + e.message, 'terr'); }
};

// --- Wizard del formulario de referido ---
window._refData = {};
window._refStep = 1;

window.refNext = function () {
  const n = document.getElementById('ref_prop_nom')?.value?.trim();
  const t = document.getElementById('ref_prop_tel')?.value?.trim();
  const c = document.getElementById('ref_como')?.value;
  if (!n) { window.toast('Nombre obligatorio', 'twarn'); return; }
  if (!t) { window.toast('Teléfono obligatorio', 'twarn'); return; }
  if (!c) { window.toast('Selecciona cómo lo encontraste', 'twarn'); return; }
  window._refData.propNombre = n;
  window._refData.propTelefono = t;
  window._refData.propEmail = document.getElementById('ref_prop_email')?.value?.trim() || '';
  window._refData.comoEncontro = c;
  window._refStep = 2;
  window.renderReferralForm();
};

window.refPrev = function () { window._refStep = 1; window.renderReferralForm(); };

window.refSubmit = async function () {
  window._refData.ciudad = document.getElementById('ref_ciudad')?.value?.trim() || 'Pereira';
  window._refData.barrio = document.getElementById('ref_barrio')?.value?.trim() || '';
  window._refData.direccion = document.getElementById('ref_dir')?.value?.trim() || '';
  window._refData.canon = parseFloat(document.getElementById('ref_canon')?.value) || null;
  window._refData.notas = document.getElementById('ref_notas')?.value?.trim() || '';
  const result = await window.crearReferido(window._refData);
  if (result) { window._refData = {}; window._refStep = 1; window.go('mis-referidos'); }
};

window.refUpdateCalc = function () {
  const box = document.getElementById('refCalcBox');
  const input = document.getElementById('ref_canon');
  if (!box || !input) return;
  const canon = parseFloat(input.value) || 0;
  if (canon <= 0) { box.innerHTML = ''; return; }
  const total = Math.round(canon * 0.10);
  const neto = Math.max(0, total - 50000);
  box.innerHTML = '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin:8px 0;text-align:center"><div style="font-size:11px;color:#065f46;font-weight:600;margin-bottom:6px">💰 Si se arrienda, ganas:</div><div style="font-family:Fraunces,serif;font-size:28px;font-weight:700;color:#065f46">' + fm(total) + '</div><div style="font-size:11px;color:#065f46;margin-top:4px">' + fm(50000) + ' al aprobar + ' + fm(neto) + ' al firmar contrato con inquilino</div><div style="font-size:10px;color:#5a5550;margin-top:6px">Tu comisión se calcula sobre el valor del canon, no sobre la administración.</div></div>';
};

// Banner para el portal (visible al público)
window.renderReferralBanner = function () {
  const u = window.userStore?.get();
  const cta = u ? "go('referir')" : "go('referidos-landing')";
  const btnTxt = u ? '🤝 Quiero referir un inmueble' : '🤝 Conoce el programa';
  return '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:16px;padding:24px;margin:20px 14px;text-align:center;color:#fff"><div style="font-size:36px;margin-bottom:10px">💰</div><div style="font-family:Fraunces,serif;font-size:22px;font-weight:700;margin-bottom:6px">Gana dinero refiriendo inmuebles</div><div style="font-size:13px;opacity:.9;margin-bottom:16px;max-width:400px;margin-left:auto;margin-right:auto">¿Conoces un inmueble en arriendo? Refiérelo y gana hasta el <strong>10%</strong> del valor del canon.</div><div style="font-family:Fraunces,serif;font-size:24px;font-weight:700;margin-bottom:16px">Un apto de $2.5M = $250.000 para ti</div><button onclick="' + cta + '" style="padding:14px 32px;border:none;border-radius:30px;background:#fff;color:#1e3a5f;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' + btnTxt + '</button></div>';
};
