/**
 * HOUSE CRM — Landing Page
 * Replaces login overlay for visitors (no session).
 * Converted from React mockup to vanilla JS.
 */

import { HOUSE_PHONE } from './core/constants.js';

const _fm = n => '$' + (n||0).toLocaleString('es-CO');

const _ROLES = {
  comprador: { emoji:'👤', titulo:'Quiero comprar o arrendar', color:'#3b82f6' },
  vendedor: { emoji:'🏠', titulo:'Quiero vender mi inmueble', color:'#10b981' },
  comisionista: { emoji:'💼', titulo:'Soy comisionista', color:'#f59e0b' },
  arriendo_admin: { emoji:'🏡', titulo:'Administración House', color:'#122d4f' },
  arriendo_pub: { emoji:'📢', titulo:'Publicación con exposición', color:'#d97706' },
};

window._landingRole = 'comprador';
window._landingPlan = null;

export function renderLanding(container) {
  const role = window._landingRole || 'comprador';

  let h = `<style>
    .pf{font-family:'Playfair Display',Georgia,serif}
    .lpill{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:100px;font-size:14px;font-weight:700;cursor:pointer;transition:all .25s;border:none;font-family:inherit}
    .lpill.on{background:#122d4f;color:#fff;box-shadow:0 4px 16px #122d4f40}
    .lpill.off{background:#f0eeeb;color:#5a5550}
    .lstep{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}
    .lstep-ico{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .lplan{border-radius:20px;padding:24px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden;margin-bottom:16px}
    .lplan:hover{transform:translateY(-2px)}
  </style>`;

  // ── HERO ──
  h += `<section style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40px 20px;position:relative;background:#faf9f7">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,#122d4f08 0%,transparent 50%);pointer-events:none"></div>
    <div style="font-size:13px;font-weight:700;letter-spacing:3px;color:#1a4f8b;margin-bottom:24px;text-transform:uppercase">Inmobiliaria House · Pereira</div>
    <h1 class="pf" style="font-size:clamp(32px,7vw,56px);font-weight:900;line-height:1.1;max-width:700;color:#122d4f">Negocios inmobiliarios<br><span style="color:#1a4f8b">sin perder el tiempo</span></h1>
    <p style="font-size:clamp(15px,2.2vw,18px);color:#5a5550;max-width:520;line-height:1.7;margin-top:24px">No somos un portal. Somos tu aliado inmobiliario. Verificamos cada inmueble, calificamos cada comprador y acompañamos cada negocio hasta el cierre.</p>
    <div style="margin-top:36px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button onclick="window._landingOpenReg('comprador')" style="padding:14px 28px;border-radius:12px;background:linear-gradient(135deg,#122d4f,#1a4f8b);color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;box-shadow:0 4px 16px #122d4f40;font-family:inherit">Quiero comprar o arrendar</button>
      <button onclick="window._landingRole='vendedor';renderLandingPage()" style="padding:14px 28px;border-radius:12px;background:#fff;color:#122d4f;font-weight:700;font-size:15px;border:2px solid #122d4f20;cursor:pointer;font-family:inherit">Tengo un inmueble</button>
    </div>
    <div style="margin-top:12px"><button onclick="toggleRegForm&&toggleRegForm()" style="background:none;border:none;color:#60a5fa;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;font-family:inherit">Ya tengo cuenta → Ingresar</button></div>
    <div style="position:absolute;bottom:32px;font-size:11px;color:#999;letter-spacing:2px">DESCUBRE CÓMO ↓</div>
  </section>`;

  // ── PROBLEMA ──
  h += `<section style="padding:80px 20px;max-width:800px;margin:0 auto">
    <div style="font-size:12px;font-weight:700;letter-spacing:3px;color:#ef4444;text-transform:uppercase;margin-bottom:12px">El problema de los portales</div>
    <h2 class="pf" style="font-size:clamp(24px,4vw,36px);font-weight:800;line-height:1.2;margin-bottom:32px">Conectan personas,<br>pero no garantizan resultados</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
      ${[
        {e:'😩',t:'Vendedores agotados',d:'Reciben 20 llamadas de curiosos que no tienen cómo comprar.'},
        {e:'😕',t:'Compradores perdidos',d:'Visitan inmuebles que no les sirven. Nadie los asesora.'},
        {e:'🤷',t:'Sin garantías',d:'No hay un experto que intermedie, verifique o acompañe.'},
      ].map(x => `<div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #e8e5e0"><div style="font-size:32px;margin-bottom:10px">${x.e}</div><div style="font-size:15px;font-weight:700;margin-bottom:6px">${x.t}</div><div style="font-size:13px;color:#5a5550;line-height:1.6">${x.d}</div></div>`).join('')}
    </div>
  </section>`;

  // ── SOLUCIÓN ──
  h += `<section style="padding:80px 20px;background:linear-gradient(135deg,#122d4f,#1a4f8b);color:#fff">
    <div style="max-width:800px;margin:0 auto;text-align:center">
      <div style="font-size:12px;font-weight:700;letter-spacing:3px;color:#ffffff80;text-transform:uppercase;margin-bottom:12px">Nuestra solución</div>
      <h2 class="pf" style="font-size:clamp(24px,4vw,36px);font-weight:800;line-height:1.2;margin-bottom:40px">House está en el medio.<br>Y eso lo cambia todo.</h2>
      <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;padding:20px 0">
        <div style="text-align:center;padding:16px"><div style="width:72px;height:72px;border-radius:50%;background:#ffffff15;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 8px;border:2px solid #ffffff30">🏠</div><div style="font-size:14px;font-weight:700">Propietario</div></div>
        <div style="padding:0 8px;font-size:24px;color:#ffffff50">→</div>
        <div style="text-align:center;padding:24px;background:#ffffff12;border-radius:20px;border:2px solid #ffffff25"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#fff,#e0e7ff);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 10px;box-shadow:0 8px 32px #00000030">🏢</div><div style="font-size:16px;font-weight:800">HOUSE</div><div style="font-size:11px;color:#ffffff90">Verifica · Califica · Acompaña</div></div>
        <div style="padding:0 8px;font-size:24px;color:#ffffff50">→</div>
        <div style="text-align:center;padding:16px"><div style="width:72px;height:72px;border-radius:50%;background:#ffffff15;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 8px;border:2px solid #ffffff30">👤</div><div style="font-size:14px;font-weight:700">Comprador</div></div>
      </div>
    </div>
  </section>`;

  // ── ROLES TABS ──
  h += `<section style="padding:80px 20px;max-width:800px;margin:0 auto">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:40px;flex-wrap:wrap">
      ${[{id:'comprador',l:'Quiero comprar'},{id:'vendedor',l:'Quiero vender'},{id:'arriendo',l:'Tengo para arrendar'},{id:'comisionista',l:'Soy comisionista'}].map(r =>
        `<button class="lpill ${role===r.id?'on':'off'}" onclick="window._landingRole='${r.id}';window._landingPlan=null;renderLandingPage()">${r.l}</button>`
      ).join('')}
    </div>
    <div id="landing-role-content"></div>
  </section>`;

  // ── COMISIONES ──
  h += `<section style="padding:60px 20px;max-width:700px;margin:0 auto">
    <h3 class="pf" style="font-size:24px;font-weight:800;color:#122d4f;text-align:center;margin-bottom:24px">Comisiones transparentes</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px">
      ${[{t:'3%',l:'Venta',s:'Solo si se cierra'},{t:'10%',l:'Administración',s:'Mensual del canon'},{t:'$100K',l:'Publicación',s:'4 portales · /mes'},{t:'50%',l:'1 comisionista',s:'De la comisión'},{t:'33%',l:'2 comisionistas',s:'Se divide entre 3'}].map(c =>
        `<div style="background:#fff;border-radius:14px;padding:18px;border:1px solid #e8e5e0;text-align:center"><div style="font-size:26px;font-weight:900;color:#122d4f">${c.t}</div><div style="font-size:13px;font-weight:700;margin-top:2px">${c.l}</div><div style="font-size:11px;color:#5a5550;margin-top:4px">${c.s}</div></div>`
      ).join('')}
    </div>
    <div style="text-align:center;margin-top:12px;font-size:13px;color:#5a5550">Todas las comisiones son configurables por el administrador.</div>
  </section>`;

  // ── CTA ──
  h += `<section style="padding:80px 20px;background:linear-gradient(135deg,#122d4f,#1a4f8b);text-align:center">
    <div style="max-width:500px;margin:0 auto">
      <h2 class="pf" style="font-size:clamp(24px,4vw,34px);font-weight:800;color:#fff;line-height:1.2;margin-bottom:16px">¿Listo para hacer negocios de verdad?</h2>
      <p style="font-size:15px;color:#ffffffcc;margin-bottom:32px;line-height:1.7">Una sola línea. Un equipo experto. Cero complicaciones.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="https://wa.me/${HOUSE_PHONE}?text=Hola%20Inmobiliaria%20House%2C%20quiero%20saber%20más" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:16px 28px;border-radius:14px;background:#25D366;color:#fff;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 4px 16px #25D36640">💬 WhatsApp</a>
        <a href="tel:+${HOUSE_PHONE}" style="display:inline-flex;align-items:center;gap:8px;padding:16px 28px;border-radius:14px;background:#ffffff15;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border:2px solid #ffffff30">📞 Llamar</a>
      </div>
    </div>
  </section>`;

  h += `<footer style="padding:24px 20px;text-align:center;background:#0f2440;color:#ffffff50;font-size:12px">© ${new Date().getFullYear()} Inmobiliaria House · Pereira, Risaralda · Colombia</footer>`;

  container.innerHTML = h;

  // Render role content
  _renderRoleContent(role);
}

function _renderRoleContent(role) {
  const el = document.getElementById('landing-role-content');
  if (!el) return;
  if (role === 'comprador') _renderComprador(el);
  else if (role === 'vendedor') _renderVendedor(el);
  else if (role === 'arriendo') _renderArriendo(el);
  else if (role === 'comisionista') _renderComisionista(el);
}

function _renderComprador(el) {
  const pasos = [
    {n:'1',e:'🔍',t:'Explora el inventario',d:'Navega libremente todos los inmuebles. Filtra por precio, tipo, zona.'},
    {n:'2',e:'❤️',t:'Muestra tu interés',d:'¿Te gustó algo? Cuéntanos si tienes crédito aprobado, de cuánto, para qué es.'},
    {n:'3',e:'✅',t:'Te calificamos',d:'Si cumples el perfil para ese inmueble, te conectamos. Si no, te ayudamos a encontrar otro.'},
    {n:'4',e:'📅',t:'Visita con acompañamiento',d:'Tú, el vendedor y un representante de HOUSE. No vas solo.'},
    {n:'5',e:'🎉',t:'Cierra con garantía',d:'Tratos limpios, documentación en orden, sin sorpresas.'},
  ];
  let h = `<h2 class="pf" style="font-size:28px;font-weight:800;color:#122d4f;margin-bottom:8px">Compra con la tranquilidad de tener un experto a tu lado</h2>
    <p style="font-size:15px;color:#5a5550;line-height:1.7;margin-bottom:32px">No vas a perder tiempo visitando inmuebles que no van contigo. Nosotros verificamos que todo esté en orden antes de que des un solo paso.</p>`;
  pasos.forEach(s => {
    h += `<div class="lstep"><div class="lstep-ico" style="background:#122d4f10">${s.e}</div><div><div style="font-size:15px;font-weight:700"><span style="color:#1a4f8b">Paso ${s.n}.</span> ${s.t}</div><div style="font-size:13px;color:#5a5550;line-height:1.6;margin-top:4px">${s.d}</div></div></div>`;
  });
  h += `<button onclick="window._landingOpenReg('comprador')" style="width:100%;padding:18px;border-radius:16px;border:none;background:linear-gradient(135deg,#122d4f,#1a4f8b);color:#fff;font-size:17px;font-weight:800;cursor:pointer;margin-top:16px;font-family:inherit;box-shadow:0 4px 16px #122d4f40">Registrarme como comprador</button>`;
  el.innerHTML = h;
}

function _renderVendedor(el) {
  const pasos = [
    {n:'1',e:'📝',t:'Publica tu inmueble',d:'Fotos interiores, precio y descripción. No publicamos dirección exacta ni fachada.'},
    {n:'2',e:'🔒',t:'Nosotros lo verificamos',d:'Revisamos que cumpla criterios de seguridad. Si está bien, aparece en la plataforma.'},
    {n:'3',e:'📞',t:'Te llamamos con prospectos reales',d:'Solo cuando un comprador calificado con crédito aprobado muestra interés.'},
    {n:'4',e:'📅',t:'Visita con representante',d:'Un asesor de HOUSE acompaña la visita. No recibes extraños solo.'},
    {n:'5',e:'💰',t:'Cierra con respaldo',d:'Negociación y cierre profesional. Comisión del 3% solo si se cierra.'},
  ];
  let h = `<h2 class="pf" style="font-size:28px;font-weight:800;color:#122d4f;margin-bottom:8px">Vende sin perder el tiempo con curiosos</h2>
    <p style="font-size:15px;color:#5a5550;line-height:1.7;margin-bottom:32px">No vas a recibir una sola llamada de alguien que no puede comprar. Solo prospectos reales.</p>`;
  pasos.forEach(s => {
    h += `<div class="lstep"><div class="lstep-ico" style="background:#10b98110">${s.e}</div><div><div style="font-size:15px;font-weight:700"><span style="color:#10b981">Paso ${s.n}.</span> ${s.t}</div><div style="font-size:13px;color:#5a5550;line-height:1.6;margin-top:4px">${s.d}</div></div></div>`;
  });
  h += `<button onclick="window._landingOpenReg('vendedor')" style="width:100%;padding:18px;border-radius:16px;border:none;background:#10b981;color:#fff;font-size:17px;font-weight:800;cursor:pointer;margin-top:16px;font-family:inherit">Publicar mi inmueble</button>`;
  el.innerHTML = h;
}

function _renderArriendo(el) {
  const plan = window._landingPlan;
  let h = `<h2 class="pf" style="font-size:28px;font-weight:800;color:#122d4f;margin-bottom:8px">¿Tienes un inmueble para arrendar?<br><span style="color:#1a4f8b">Déjalo en nuestras manos.</span></h2>
    <p style="font-size:15px;color:#5a5550;line-height:1.7;margin-bottom:28px">Encontrar inquilino, cobrar cada mes, lidiar con reparaciones... Por eso te ofrecemos dos opciones.</p>`;

  // Plan 1: Administración
  const p1 = plan === 1;
  h += `<div class="lplan" onclick="window._landingPlan=${p1?'null':'1'};renderLandingPage()" style="background:${p1?'linear-gradient(135deg,#122d4f,#1a4f8b)':'#fff'};border:2px solid ${p1?'#1a4f8b':'#e0ddd8'};color:${p1?'#fff':'#1a1a1a'};box-shadow:${p1?'0 12px 32px #122d4f30':'none'}">
    ${p1?'':'<div style="position:absolute;top:12px;right:12px;background:#10b981;color:#fff;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:800">⭐ RECOMENDADO</div>'}
    <div style="font-size:40px;margin-bottom:8px">🏡</div>
    <div style="font-size:20px;font-weight:800;margin-bottom:4px">Administración House</div>
    <div style="font-size:14px;opacity:.8;line-height:1.6">Tú solo recibes la plata cada mes. Nosotros nos encargamos de todo.</div>`;
  if (p1) {
    h += `<div style="margin-top:16px">`;
    ['🔍 Encontramos al inquilino ideal','📋 Contrato con garantías legales','💰 Cobramos el arriendo puntualmente','🔧 Reparaciones y mantenimiento','📞 Atendemos las llamadas del inquilino','🏦 Te consignamos tu plata sin falta','📊 Reporte mensual del estado'].forEach(t => {
      h += `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span style="font-size:16px;flex-shrink:0">${t.slice(0,2)}</span><span style="font-size:14px;color:#ffffffdd">${t.slice(3)}</span></div>`;
    });
    h += `<div style="background:#ffffff15;border-radius:14px;padding:16px;text-align:center;margin-top:12px">
      <div style="font-size:13px;color:#ffffff90">Comisión</div>
      <div style="font-size:28px;font-weight:900">10% <span style="font-size:14px;font-weight:500">mensual del canon</span></div>
      <div style="font-size:13px;color:#ffffff80;margin-top:4px">Canon de $1.800.000 → recibes $1.620.000/mes</div>
    </div>
    <button onclick="event.stopPropagation();window._landingOpenReg('arriendo_admin')" style="width:100%;padding:16px;border-radius:14px;border:2px solid #ffffff40;background:#ffffff20;color:#fff;font-size:16px;font-weight:800;cursor:pointer;margin-top:12px;font-family:inherit">Quiero administración House</button></div>`;
  } else {
    h += `<div style="font-size:12px;color:#1a4f8b;font-weight:700;margin-top:8px">Toca para ver todo lo que incluye →</div>`;
  }
  h += `</div>`;

  // Plan 2: Publicación
  const p2 = plan === 2;
  h += `<div class="lplan" onclick="window._landingPlan=${p2?'null':'2'};renderLandingPage()" style="background:${p2?'linear-gradient(135deg,#f59e0b,#d97706)':'#fff'};border:2px solid ${p2?'#f59e0b':'#e0ddd8'};color:${p2?'#fff':'#1a1a1a'};box-shadow:${p2?'0 12px 32px #f59e0b30':'none'}">
    <div style="font-size:40px;margin-bottom:8px">📢</div>
    <div style="font-size:20px;font-weight:800;margin-bottom:4px">Publicación con exposición máxima</div>
    <div style="font-size:14px;opacity:.8;line-height:1.6">Si prefieres manejar tu arriendo, al menos que todo el mundo vea tu inmueble.</div>`;
  if (p2) {
    h += `<div style="margin-top:16px">`;
    ['🏠 Publicado en plataforma HOUSE','📘 Facebook Marketplace','🟢 Metrocuadrado','🔵 FincaRaíz','📸 Fotos optimizadas y descripción profesional','🔔 Filtramos interesados — solo gente seria'].forEach(t => {
      h += `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span style="font-size:16px;flex-shrink:0">${t.slice(0,2)}</span><span style="font-size:14px;color:#ffffffdd">${t.slice(3)}</span></div>`;
    });
    h += `<div style="background:#ffffff15;border-radius:14px;padding:16px;text-align:center;margin-top:12px">
      <div style="font-size:13px;color:#ffffff90">Inversión mensual</div>
      <div style="font-size:28px;font-weight:900">$100.000 <span style="font-size:14px;font-weight:500">/mes</span></div>
      <div style="font-size:13px;color:#ffffff80;margin-top:4px">4 portales · Sin permanencia · Cancela cuando quieras</div>
    </div>
    <div style="background:#ffffff10;border-radius:10px;padding:10px;margin-top:8px;text-align:center;font-size:12px;color:#ffffff90">💡 Si después te pasas a Administración, te devolvemos lo pagado.</div>
    <button onclick="event.stopPropagation();window._landingOpenReg('arriendo_pub')" style="width:100%;padding:16px;border-radius:14px;border:2px solid #ffffff40;background:#ffffff20;color:#fff;font-size:16px;font-weight:800;cursor:pointer;margin-top:12px;font-family:inherit">Publicar mi inmueble</button></div>`;
  } else {
    h += `<div style="font-size:12px;color:#f59e0b;font-weight:700;margin-top:8px">Toca para ver qué incluye →</div>`;
  }
  h += `</div>`;

  el.innerHTML = h;
}

function _renderComisionista(el) {
  const pasos = [
    {n:'1',e:'🏠',t:'Publica el inmueble',d:'Fotos interiores, precio y zona. Sin dirección exacta ni datos del propietario.'},
    {n:'2',e:'🔍',t:'Nosotros calificamos compradores',d:'Verificamos crédito, capacidad de pago e intención real.'},
    {n:'3',e:'📞',t:'Te llamamos con comprador listo',d:'Tú coordinas con tu cliente para la visita.'},
    {n:'4',e:'📅',t:'Cita con acompañamiento',d:'El comprador, tú (o el propietario), y un representante de House.'},
    {n:'5',e:'💰',t:'Comisión compartida',d:'Configurable por negocio. La más común: 50% de la comisión total.'},
  ];
  let h = `<h2 class="pf" style="font-size:28px;font-weight:800;color:#122d4f;margin-bottom:8px">Trae inmuebles. Nosotros conseguimos el comprador.</h2>
    <p style="font-size:15px;color:#5a5550;line-height:1.7;margin-bottom:24px">Tú consigues el inmueble, nosotros hacemos el trabajo pesado. Y nos repartimos la comisión.</p>
    <div style="background:#f59e0b08;border:2px solid #f59e0b25;border-radius:16px;padding:20px;margin-bottom:24px;display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:32px;flex-shrink:0">🔐</div>
      <div><div style="font-size:17px;font-weight:800;color:#92400e;margin-bottom:4px">Plataforma sin confianza</div>
      <div style="font-size:14px;color:#5a5550;line-height:1.7"><strong>Nunca te pedimos los datos de tu cliente ni del propietario.</strong> Tu contacto es tu activo y lo respetamos.</div></div>
    </div>`;
  pasos.forEach(s => {
    h += `<div class="lstep"><div class="lstep-ico" style="background:#f59e0b10">${s.e}</div><div><div style="font-size:15px;font-weight:700"><span style="color:#f59e0b">Paso ${s.n}.</span> ${s.t}</div><div style="font-size:13px;color:#5a5550;line-height:1.6;margin-top:4px">${s.d}</div></div></div>`;
  });

  // Escenarios de comisión
  h += `<div style="margin-top:8px;margin-bottom:20px"><div style="font-size:16px;font-weight:800;color:#122d4f;margin-bottom:14px">¿Cómo se reparte la comisión?</div>`;
  // 50/50
  h += `<div style="background:#fff;border-radius:14px;padding:16px;border:2px solid #f59e0b20;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:14px;font-weight:800;color:#f59e0b">Tú traes el inmueble</div><div style="background:#f59e0b15;color:#f59e0b;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700">Lo más común</div></div>
    <div style="font-size:13px;color:#5a5550;line-height:1.6;margin-bottom:12px">Publicas un inmueble de un conocido. House consigue comprador calificado.</div>
    <div style="display:flex;gap:8px"><div style="flex:1;background:#122d4f08;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:#122d4f">50%</div><div style="font-size:11px;color:#5a5550">House</div></div><div style="flex:1;background:#f59e0b08;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:#f59e0b">50%</div><div style="font-size:11px;color:#5a5550">Tú</div></div></div>
    <div style="font-size:12px;color:#5a5550;margin-top:8px;text-align:center">Venta de $300M × 3% = $9M → <strong>$4.500.000 para ti</strong></div>
  </div>`;
  // 33/33/33
  h += `<div style="background:#fff;border-radius:14px;padding:16px;border:2px solid #8b5cf620;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:14px;font-weight:800;color:#8b5cf6">Dos comisionistas</div><div style="background:#8b5cf615;color:#8b5cf6;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700">Coincidencia</div></div>
    <div style="font-size:13px;color:#5a5550;line-height:1.6;margin-bottom:12px">Un comisionista publicó el inmueble. Otro tiene un comprador. La comisión se divide entre los 3.</div>
    <div style="display:flex;gap:8px"><div style="flex:1;background:#122d4f08;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:#122d4f">34%</div><div style="font-size:11px;color:#5a5550">House</div></div><div style="flex:1;background:#f59e0b08;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:#f59e0b">33%</div><div style="font-size:11px;color:#5a5550">Inmueble</div></div><div style="flex:1;background:#8b5cf608;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:#8b5cf6">33%</div><div style="font-size:11px;color:#5a5550">Comprador</div></div></div>
    <div style="font-size:12px;color:#5a5550;margin-top:8px;text-align:center">$9M → <strong>$2.970.000 cada comisionista</strong></div>
  </div>`;
  h += `</div>`;

  h += `<div style="background:#fffbeb;border-radius:14px;padding:16px;border:1px solid #f59e0b15;margin-bottom:16px"><div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:4px">⚙️ Todas las comisiones son configurables</div><div style="font-size:13px;color:#5a5550;line-height:1.7">Los porcentajes se acuerdan con el administrador según cada negocio.</div></div>`;
  h += `<div style="background:#fef2f2;border-radius:14px;padding:16px;border:1px solid #ef444415;margin-bottom:16px"><div style="font-size:14px;font-weight:700;color:#991b1b;margin-bottom:6px">🚫 Lo que NUNCA pedimos</div><div style="font-size:13px;color:#5a5550;line-height:1.8">❌ Datos del propietario · ❌ Dirección exacta · ❌ Fotos de fachada · ❌ Documentos</div></div>`;
  h += `<button onclick="window._landingOpenReg('comisionista')" style="width:100%;padding:18px;border-radius:16px;border:none;background:#f59e0b;color:#fff;font-size:17px;font-weight:800;cursor:pointer;font-family:inherit">Registrarme como comisionista</button>`;
  el.innerHTML = h;
}

// Open registration from landing (redirects to #/registro with intention)
window._landingOpenReg = function(intencion) {
  window._landingIntencion = intencion;
  document.getElementById('lov').style.display = 'none';
  window.go('registro');
};

// Global render function
window.renderLandingPage = function() {
  const lov = document.getElementById('lov');
  if (!lov) return;
  renderLanding(lov);
};
