/**
 * House CRM v2.0 — Root Application Shell
 *
 * Renders the complete app structure using the EXACT same HTML/CSS
 * classes from the original monolithic HTML.
 */

import { load } from './load.js';

// ---------------------------------------------------------------------------
// Logo SVG (brand asset — used in header + login)
// ---------------------------------------------------------------------------

const LOGO_SVG_SM = `<img src="/img/logo.png" alt="House" style="width:32px;height:32px;object-fit:contain">`;

const LOGO_SVG_LG = `<img src="/img/logo.png" alt="House" style="width:64px;height:64px;object-fit:contain">`;

// ---------------------------------------------------------------------------
// Shell renderer — uses EXACT original CSS classes
// ---------------------------------------------------------------------------

function renderShell(container) {
  container.innerHTML = `
<!-- LOGIN OVERLAY -->
<div id="lov" style="position:fixed;inset:0;z-index:9999;background:#0a0f1e;display:flex;align-items:center;justify-content:center;padding:16px;overflow:hidden">
  <div style="position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.15),transparent 70%);top:-100px;right:-100px"></div>
  <div style="position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.12),transparent 70%);bottom:-80px;left:-80px"></div>
  <div class="lbox">
    <div style="display:flex;justify-content:center;margin-bottom:20px">${LOGO_SVG_LG}</div>
    <div class="lbr">House</div>
    <div class="lsb">Gesti\u00F3n Inmobiliaria Inteligente</div>

    <!-- PANEL LOGIN (default) -->
    <div id="lov_login">
      <div id="g_id_signin" style="margin-bottom:12px"></div>
      <div class="lor"><span>o ingresa con</span></div>
      <div class="lfrm">
        <input id="lin_usr" type="text" placeholder="Usuario" autocomplete="username">
        <input id="lin_pwd" type="password" placeholder="Contrase\u00F1a" autocomplete="current-password">
        <button id="lin_btn" type="button">Ingresar</button>
      </div>
      <div id="lerr" style="display:none;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:11px;color:#fca5a5;text-align:center"></div>
      <div style="margin-top:16px;text-align:center">
        <button onclick="toggleRegForm()" style="background:none;border:none;color:#60a5fa;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;font-family:inherit">\u{1F4DD} Crear cuenta gratis</button>
      </div>
    </div>

    <!-- PANEL REGISTRO (hidden by default) -->
    <div id="lov_register" style="display:none">
      <div style="font-size:15px;font-weight:800;text-align:center;color:#fff;margin-bottom:4px">\u{1F3E0} Crear cuenta</div>
      <div style="font-size:11px;color:#94a3b8;text-align:center;margin-bottom:14px">Gratis \u00B7 Sin spam \u00B7 Cancela cuando quieras</div>
      <div id="g_id_signin_reg" style="margin-bottom:12px"></div>
      <div class="lor"><span>o con email</span></div>
      <div class="lfrm">
        <input id="reg_nombre" type="text" placeholder="Tu nombre completo" autocomplete="name" style="margin-bottom:8px">
        <input id="reg_email" type="email" placeholder="Email" autocomplete="email" style="margin-bottom:8px">
        <input id="reg_pwd" type="password" placeholder="Crea una contrase\u00F1a" autocomplete="new-password" style="margin-bottom:8px">
        <input id="reg_tel" type="tel" placeholder="Tel\u00E9fono WhatsApp (opcional)" autocomplete="tel" style="margin-bottom:10px">
        <button type="button" onclick="registerExternal()" id="reg_btn" style="background:#2563eb;color:#fff;font-weight:700">Crear mi cuenta</button>
      </div>
      <div id="reg_err" style="display:none;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:11px;color:#fca5a5;text-align:center"></div>
      <div style="text-align:center;margin-top:12px">
        <button onclick="toggleRegForm()" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;text-decoration:underline;font-family:inherit">\u00BFYa tienes cuenta? Inicia sesi\u00F3n</button>
      </div>
    </div>

    <div style="margin-top:12px;text-align:center">
      <a href="#/portafolio" onclick="document.getElementById('lov').style.display='none'" style="color:#94a3b8;font-size:12px;text-decoration:underline;cursor:pointer">\u{1F50D} Explorar inmuebles sin cuenta</a>
    </div>
  </div>
</div>

<!-- HEADER -->
<header id="mhdr" style="display:none">
  <div class="nav">
    <div style="display:flex;align-items:center;gap:6px">
      <button class="ib" onclick="omenu()">\u2630</button>
      <a class="lw" onclick="go('inv')">${LOGO_SVG_SM}<div><div class="lm">House</div></div></a>
    </div>
    <div class="nr">
      <div class="bell-wrap">
        <button class="ib" onclick="toggleBell()">\u{1F514}<span class="bdg" id="habdg" style="display:none">0</span></button>
        <div class="bell-dd" id="belldd">
          <div class="bell-hd"><span>\u{1F514} Notificaciones</span></div>
          <div class="bell-list" id="belllist"></div>
          <button class="bell-all" onclick="go('alertas');closeBell()">Ver todas \u2192</button>
        </div>
      </div>
      <button class="ib" onclick="tTh()" id="tbtn">\u2600\uFE0F</button>
      <div class="up"><img id="ufoto" src="" style="display:none"><div id="ufoto-ini" style="display:none;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--b500),var(--b700));color:#fff;font-size:12px;font-weight:800;align-items:center;justify-content:center"></div><span id="uname">\u2014</span></div>
    </div>
  </div>
</header>

<!-- MOBILE SIDEBAR -->
<div class="mov" id="mov" onclick="cmenu()"></div>
<div class="mp" id="mpnl">
  <div class="mhd">
    <span class="mbr" style="display:flex;align-items:center;gap:8px">${LOGO_SVG_SM} House</span>
    <button class="mcl" onclick="cmenu()">\u2715</button>
  </div>
  <div style="padding:6px 0">
    <button class="mi act" data-s="inv" onclick="go('inv')"><span class="mic">\u{1F3E0}</span>Inventario</button>
    <button class="mi" data-s="mis" onclick="go('mis')"><span class="mic">\u{1F500}</span>Mis Inmuebles</button>
    <button class="mi" data-s="favoritos" onclick="go('favoritos')"><span class="mic">\u2764\uFE0F</span>Favoritos</button>
    <button class="mi" data-s="reg" onclick="go('reg')"><span class="mic">\u2795</span>Registrar</button>
    <button class="mi" data-s="alertas" onclick="go('alertas')"><span class="mic">\u{1F514}</span>Alertas<span class="mib" id="malb" style="display:none">0</span></button>
    <button class="mi" data-s="portales" onclick="go('portales')" id="mport" style="display:none"><span class="mic">\u{1F310}</span>Portales</button>
    <button class="mi" data-s="dash" onclick="go('dash')"><span class="mic">\u{1F4CA}</span>Dashboard</button>
    <button class="mi" data-s="agenda" onclick="go('agenda')" id="magenda" style="display:none"><span class="mic">\u{1F4C5}</span>Agenda<span class="mib" id="magb" style="display:none">0</span></button>

    <button class="mi" data-s="referir" onclick="go('referir')"><span class="mic">\u{1F91D}</span>Referir arriendo</button>
    <button class="mi" data-s="mis-referidos" onclick="go('mis-referidos')"><span class="mic">\u{1F4B0}</span>Mis referidos<span class="mib" id="mrefb" style="display:none">0</span></button>
    <button class="mi" data-s="admin-pagos" onclick="go('admin-pagos')" id="madminpagos" style="display:none"><span class="mic">\u{1F4B3}</span>Pagos referidos</button>
    <button class="mi" data-s="users" onclick="go('users')" id="musrs" style="display:none"><span class="mic">\u{1F465}</span>Usuarios</button>
    <button class="mi" data-s="perfil" onclick="go('perfil')"><span class="mic">\u2699\uFE0F</span>Mi Perfil</button>
    <button class="mi" data-s="papelera" onclick="go('papelera')" id="mpap" style="display:none"><span class="mic">\u{1F5D1}\uFE0F</span>Papelera</button>
  </div>
  <div class="mdv"></div>
  <div class="mu">
    <img id="mufoto" src="" style="display:none"><div id="mufoto-ini" style="display:none;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--b500),var(--b700));color:#fff;font-size:14px;font-weight:800;align-items:center;justify-content:center;flex-shrink:0"></div>
    <div style="flex:1"><div class="mun" id="muname">\u2014</div><div class="mur" id="murole">\u2014</div></div>
    <button class="mlo" onclick="logout()">Salir</button>
  </div>
</div>

<!-- STATUS BAR -->
<div class="stb" id="stbar" style="display:none">
  <div class="sti">
    <span id="stbdg" class="sb sbld"><em class="sbsp">\u27F3</em> Cargando...</span>
    <span id="stt" style="font-size:9px;color:var(--g400)"></span>
    <button class="rlb" id="rlb" onclick="load()" style="display:none">\u21BA</button>
  </div>
</div>

<!-- SECTIONS -->
<div class="sec act" id="sec-inv">
  <div style="display:none"><span id="hst"></span><span id="hsv"></span><span id="hsa"></span><span id="hsb"></span></div>
  <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;min-height:100vh">
    <div class="wban" id="wban" style="display:none"></div>

    <!-- HEADER STATS -->
    <div id="invHeader" style="background:linear-gradient(170deg,#122d4f 0%,#1a4f8b 40%,#2563a8 100%);padding:14px 16px 16px;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;opacity:.03;background-image:radial-gradient(circle at 30% 60%,#fff 1px,transparent 1px);background-size:20px 20px"></div>
      <div style="position:relative;z-index:1">
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:3px">Portafolio disponible</div>
        <div style="font-size:12px;color:rgba(255,255,255,.4)">Encuentra el inmueble perfecto para ti</div>
        <div style="display:flex;gap:6px;margin-top:14px">
          <div style="flex:1;background:rgba(255,255,255,.06);border-radius:10;padding:8px 0;text-align:center;border:1px solid rgba(255,255,255,.06)"><div id="hst2" style="font-size:20px;font-weight:800;color:#fff">0</div><div style="font-size:9px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:.5px;text-transform:uppercase">Total</div></div>
          <div style="flex:1;background:rgba(52,211,153,.1);border-radius:10;padding:8px 0;text-align:center;border:1px solid rgba(52,211,153,.06)"><div id="hsv2" style="font-size:20px;font-weight:800;color:#34d399">0</div><div style="font-size:9px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:.5px;text-transform:uppercase">Venta</div></div>
          <div style="flex:1;background:rgba(251,191,36,.1);border-radius:10;padding:8px 0;text-align:center;border:1px solid rgba(251,191,36,.06)"><div id="hsa2" style="font-size:20px;font-weight:800;color:#fbbf24">0</div><div style="font-size:9px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:.5px;text-transform:uppercase">Arriendo</div></div>
          <div style="flex:1;background:rgba(167,139,250,.12);border-radius:10;padding:8px 0;text-align:center;border:1px solid rgba(167,139,250,.06)"><div id="hsb2" style="font-size:20px;font-weight:800;color:#a78bfa">0</div><div style="font-size:9px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:.5px;text-transform:uppercase">Ambas</div></div>
        </div>
      </div>
    </div>

    <!-- SEARCH -->
    <div style="padding:12px 16px 0;position:relative">
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:0 14px;border:1.5px solid #e8e4df">
        <span style="font-size:16px;color:#c4b9a8">🔍</span>
        <input id="q" placeholder="Busca por barrio, tipo o dirección..." autocomplete="off" oninput="autoSearch();updateAC()" onfocus="showAC()" onkeydown="acKey(event)" style="flex:1;border:none;outline:none;padding:13px 0;font-size:14px;font-family:inherit;color:#2c2520;background:transparent">
        <button id="qClear" onclick="document.getElementById('q').value='';this.style.display='none';hideAC();doSearch()" style="display:none;border:none;background:#f0ece6;border-radius:8px;width:24px;height:24px;cursor:pointer;font-size:10px;color:#8b7e6e;display:flex;align-items:center;justify-content:center;font-weight:800">✕</button>
      </div>
      <div id="acDrop" class="ac-drop" style="display:none"></div>
    </div>

    <!-- STICKY FILTERS -->
    <div class="sticky-filters" id="stickyFilters">
    <!-- PILLS BAR -->
    <div class="pill-bar" id="pillBar">
      <button class="pill pill-off" id="pillNeg" onclick="togglePanel('neg')"><span style="font-size:15px">🏷️</span><span id="pillNegTxt">Negocio</span><svg class="pill-chev" id="chevNeg" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="#8b7e6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
      <button class="pill pill-off" id="pillCiu" onclick="togglePanel('ciudad')"><span style="font-size:15px">📍</span><span id="pillCiuTxt">Ciudad</span><svg class="pill-chev" id="chevCiu" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="#8b7e6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
      <button class="pill pill-off" id="pillTipo" onclick="togglePanel('tipo')"><span style="font-size:15px">🏢</span><span id="pillTipoTxt">Tipo</span><svg class="pill-chev" id="chevTipo" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="#8b7e6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
      <button class="pill pill-off" id="pillPrecio" onclick="togglePanel('precio')"><span style="font-size:15px">💰</span><span id="pillPrecioTxt">Precio</span><svg class="pill-chev" id="chevPrecio" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="#8b7e6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
      <button class="pill pill-off" id="pillAsesor" onclick="togglePanel('asesor')" style="display:none"><span style="font-size:15px">👤</span><span id="pillAseTxt">Asesores</span><svg class="pill-chev" id="chevAsesor" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="#8b7e6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
      <button class="pill pill-off" id="myToggle" onclick="toggleMis()" style="color:#1a4f8b;border-color:#d0dff2">📌 Míos</button>
      <button class="pill pill-off" id="favToggle" onclick="toggleFavFilter()" style="color:#b91c3a;border-color:#f5d0d7">♡ Favs</button>
    </div>

    <!-- PANELS (inside sticky so they follow pills) -->
    <div id="panelNeg" style="display:none"></div>
    <div id="panelCiudad" style="display:none"></div>
    <div id="panelTipo" style="display:none"></div>
    <div id="panelPrecio" style="display:none"></div>
    <div id="panelAsesor" style="display:none"></div>
    </div><!-- /sticky-filters -->

    <!-- SELECTION BAR -->
    <div id="selBar" style="display:none" class="sel-bar">
      <div class="sel-bar-inner">
        <div class="sel-title">Lo que seleccionaste</div>
        <div id="selChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <button onclick="limpiar()" class="sel-clear">🗑️ Limpiar todos los filtros</button>
      </div>
    </div>

    <!-- RESULTS HEADER + TIME DROPDOWN -->
    <div style="padding:14px 16px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;color:#8b7e6e"><span id="resCount" style="font-weight:800;color:#2c2520;font-size:16px">0</span> inmuebles</div>
        <div style="position:relative" id="tiempoWrap">
          <button id="tiempoBtn" onclick="toggleTiempo()" style="font-size:12px;color:#6b5c4d;font-weight:700;background:#fff;padding:8px 12px;border-radius:10px;border:1.5px solid #e8e4df;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px">📅 Más recientes ▾</button>
          <div id="tiempoDD" class="tiempo-dd" style="display:none"></div>
        </div>
      </div>
    </div>

    <div id="res" style="padding:0 16px 24px"></div>
    <div class="rsrch" id="rsrch"></div>
  </div>
</div>
<div class="sec" id="sec-mis"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 80px"><div class="pnav-wrap" id="mis-nav"></div><div class="pipe-filters"><input class="pf-search" id="pipeQ" placeholder="\u{1F50D} Buscar en mi embudo..." oninput="rPipe()"><select class="pf-sort" id="pipeSort" onchange="rPipe()"><option value="dias">\u23F1\uFE0F Por d\u00EDas</option><option value="precio_desc">\u{1F4B0} Precio \u2193</option><option value="precio_asc">\u{1F4B0} Precio \u2191</option></select></div><div class="pw"><div class="pipe" id="pipeline"></div></div></div></div>
<div class="sec" id="sec-reg"><div class="fsec"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u2795</div><div><div class="cht">Registrar</div><div class="chsb" id="fsl">Paso 1/5</div></div></div></div><div class="cdb"><div class="pds" id="fdt"></div><div id="fc"></div><div class="fsn"><button class="bt bs2" id="fp" onclick="fPr()" style="display:none">\u2190</button><button class="bt bp" id="fn" onclick="fNx()">Continuar \u2192</button></div></div></div></div></div>
<div class="sec" id="sec-alertas"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F514}</div><div><div class="cht">Alertas</div></div></div></div><div class="cdb" id="all"></div></div></div>
<div class="sec" id="sec-portales"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F310}</div><div><div class="cht">Portales</div></div></div></div><div class="cdb" id="ptl"></div></div></div>
<div class="sec" id="sec-dash"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px" id="dsc"></div></div>
<div class="sec" id="sec-agenda"><div style="max-width:700px;margin:0 auto;padding:10px 14px 60px" id="agc"></div></div>
<div class="sec" id="sec-users"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F465}</div><div><div class="cht">Usuarios</div></div></div><button class="bt bsm bp" onclick="newUsr()">+ Nuevo</button></div><div class="cdb" id="usrl"></div></div></div>
<div class="sec" id="sec-perfil"><div class="fsec"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u2699\uFE0F</div><div><div class="cht">Mi Perfil</div></div></div></div><div class="cdb" id="perfilc"></div></div></div></div>
<div class="sec" id="sec-papelera"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F5D1}\uFE0F</div><div><div class="cht">Papelera</div><div class="chsb">Inmuebles eliminados</div></div></div></div><div class="cdb" id="papc"></div></div></div>

<!-- EXTERNAL USER SECTIONS -->
<div class="sec" id="sec-portafolio"><div style="max-width:1300px;margin:0 auto;padding:0 0 60px" id="portafolioc"></div></div>
<div class="sec" id="sec-favoritos"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px" id="favoritosc"></div></div>
<div class="sec" id="sec-cuenta"><div class="fsec" id="cuentac"></div></div>
<div class="sec" id="sec-mis-pub"><div style="max-width:800px;margin:0 auto;padding:10px 14px 60px" id="mispubc"></div></div>
<div class="sec" id="sec-publicar"><div class="fsec" id="publicarc"></div></div>
<div class="sec" id="sec-espera"><div style="max-width:500px;margin:0 auto;padding:40px 20px;text-align:center" id="esperac"></div></div>
<div class="sec" id="sec-mensajes"><div style="max-width:600px;margin:0 auto;padding:10px 14px 60px" id="mensajesc"></div></div>
<div class="sec" id="sec-metodo-pago"><div class="fsec"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F4B3}</div><div><div class="cht">M\u00E9todo de pago</div><div class="chsb">Configura d\u00F3nde recibir tus pagos</div></div></div></div><div class="cdb" id="metodoPagoContent"></div></div></div></div>
<div class="sec" id="sec-admin-pagos"><div style="max-width:800px;margin:0 auto;padding:10px 14px 60px" id="adminPagosContent"></div></div>
<div class="sec" id="sec-propietarios"><div style="max-width:600px;margin:0 auto;padding:0 0 60px" id="propietariosc"></div></div>
<div class="sec" id="sec-referidos-landing"><div style="max-width:600px;margin:0 auto;padding:0 0 60px" id="referidosLandingC"></div></div>
<div class="sec" id="sec-referir"><div class="fsec"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F91D}</div><div><div class="cht">Referir Inmueble</div><div class="chsb">Gana hasta 10% del canon</div></div></div></div><div class="cdb" id="sec-referir-content"></div></div></div></div>
<div class="sec" id="sec-misref"><div style="max-width:800px;margin:0 auto;padding:10px 14px 60px" id="sec-misref-content"></div></div>
<div class="sec" id="sec-mis-inm"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px" id="misinmc"></div></div>

<!-- MODAL -->
<div class="mo" id="mdl" style="display:none" onclick="if(event.target===this)cm()"><div class="mb2"><div class="m-handle"></div><div class="mhd2"><div><div class="mtt" id="mtt"></div><div class="msb2" id="msb3"></div></div><button class="mcl3" onclick="cm()">\u2715</button></div><form autocomplete="off" onsubmit="return false"><div class="mbd2" id="mbd"></div></form></div></div>

<!-- CONFIRM -->
<div class="cfdlg" id="cfdlg" style="display:none"><div class="cfbox"><div class="cfi" id="cfi"></div><div class="cft" id="cft"></div><div class="cfm" id="cfm"></div><div class="cfbtns"><button style="background:var(--g100);color:var(--g700)" onclick="cfCancel()">Cancelar</button><button id="cfok" style="background:var(--b600);color:#fff">Confirmar</button></div></div></div>
  `;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function tTh() {
  const d = document.body.classList.toggle('dark');
  localStorage.setItem('ht', d ? 'd' : 'l');
  const btn = document.getElementById('tbtn');
  if (btn) btn.textContent = d ? '\u{1F319}' : '\u2600\uFE0F';
  // Refresh accordion visuals for new theme colors
  if (window.renderAccOpts) window.renderAccOpts();
  if (window.toggleAcc) window.toggleAcc(window._openAcc || null);
}

function iTh() {
  if (localStorage.getItem('ht') === 'd') {
    document.body.classList.add('dark');
    const btn = document.getElementById('tbtn');
    if (btn) btn.textContent = '\u{1F319}';
  }
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function omenu() {
  document.getElementById('mov')?.classList.add('op');
  document.getElementById('mpnl')?.classList.add('op');
}

function cmenu() {
  document.getElementById('mov')?.classList.remove('op');
  document.getElementById('mpnl')?.classList.remove('op');
}

// ---------------------------------------------------------------------------
// Toast (uses original CSS classes)
// ---------------------------------------------------------------------------

function toast(msg, type = 'tok') {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------------------------------------------------------------------------
// Confirm dialog (uses original IDs)
// ---------------------------------------------------------------------------

let cfRes = null;

function cfShow(icon, title, msg) {
  return new Promise(r => {
    document.getElementById('cfi').textContent = icon;
    document.getElementById('cft').textContent = title;
    document.getElementById('cfm').textContent = msg;
    document.getElementById('cfdlg').style.display = 'flex';
    cfRes = r;
    document.getElementById('cfok').onclick = () => {
      document.getElementById('cfdlg').style.display = 'none';
      r(true);
    };
  });
}

function cfCancel() {
  document.getElementById('cfdlg').style.display = 'none';
  if (cfRes) cfRes(false);
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function sSt(t, m) {
  const e = document.getElementById('stbdg');
  if (!e) return;
  e.className = 'sb ' + (t === 'ok' ? 'sbok' : t === 'err' ? 'sber' : 'sbld');
  e.innerHTML = t === 'load' ? '<em class="sbsp">\u27F3</em> ' + m : m;
}

// ---------------------------------------------------------------------------
// sApp — show app after login
// ---------------------------------------------------------------------------

function sApp() {
  const U = window.userStore?.get();
  if (!U) return;

  const tipoU = U.tipo_usuario || 'interno';
  const isExterno = tipoU === 'cliente' || tipoU === 'vendedor_externo' || tipoU === 'propietario' || tipoU === 'pendiente';

  document.getElementById('lov').style.display = 'none';
  document.getElementById('mhdr').style.display = 'block';
  // Clear visitor portal to prevent duplicate headers
  const _pc = document.getElementById('portafolioc');
  if (_pc) _pc.innerHTML = '';

  const _ini = (U.nombre||'?')[0].toUpperCase();
  if (U.foto) {
    document.getElementById('ufoto').src = U.foto;
    document.getElementById('ufoto').style.display = '';
    document.getElementById('ufoto-ini').style.display = 'none';
    document.getElementById('mufoto').src = U.foto;
    document.getElementById('mufoto').style.display = '';
    document.getElementById('mufoto-ini').style.display = 'none';
  } else {
    document.getElementById('ufoto').style.display = 'none';
    document.getElementById('ufoto-ini').textContent = _ini;
    document.getElementById('ufoto-ini').style.display = 'flex';
    document.getElementById('mufoto').style.display = 'none';
    document.getElementById('mufoto-ini').textContent = _ini;
    document.getElementById('mufoto-ini').style.display = 'flex';
  }

  if (isExterno) {
    // External user: hide internal-only UI elements
    document.getElementById('stbar').style.display = 'none';
    // Replace "Mostrar mis inmuebles" with "Mis favoritos"
    const myTgl = document.getElementById('myToggle');
    if (myTgl) {
      if (tipoU === 'cliente') {
        myTgl.textContent = '♥ Mis favoritos';
        myTgl.setAttribute('onclick', 'toggleFavFilter()');
      } else {
        // vendedor_externo: keep original toggle but also add favoritos
        myTgl.textContent = '♥ Mis favoritos';
        myTgl.setAttribute('onclick', 'toggleFavFilter()');
      }
    }
    // Hide internal-only filters
    const aseFilter = document.getElementById('asesorFilter');
    if (aseFilter) aseFilter.style.display = 'none';
    const estadoInfo = document.getElementById('filterEstadoInfo');
    if (estadoInfo) estadoInfo.style.display = 'none';
    // Hide internal sections from sidebar that shouldn't show
    ['mis','reg','alertas','portales','dash'].forEach(s => { const b = document.querySelector('.mi[data-s="'+s+'"]'); if (b) b.style.display = 'none'; });
    document.getElementById('uname').textContent = U.nombre;
    document.getElementById('muname').textContent = U.nombre;
    document.getElementById('murole').textContent = (tipoU === 'vendedor_externo' || tipoU === 'propietario') ? 'Asesor Externo' : tipoU === 'pendiente' ? 'Pendiente' : 'Cliente';

    // Replace sidebar menu with external options
    const menuDiv = document.querySelector('#mpnl > div:nth-child(2)');
    if (menuDiv) {
      let menuH = '';
      if (tipoU === 'pendiente') {
        menuH = '<button class="mi act" data-s="portafolio" onclick="go(\'portafolio\')"><span class="mic">\u{1F50D}</span>Explorar</button>';
        menuH += '<button class="mi" data-s="referir" onclick="go(\'referir\')"><span class="mic">\u{1F91D}</span>Referir arriendo</button>';
        menuH += '<button class="mi" data-s="mis-referidos" onclick="go(\'mis-referidos\')"><span class="mic">\u{1F4B0}</span>Mis referidos<span class="mib" id="mrefb" style="display:none">0</span></button>';
        menuH += '<button class="mi" data-s="cuenta" onclick="go(\'cuenta\')"><span class="mic">\u2699\uFE0F</span>Mi cuenta</button>';
      } else {
        // CLIENTE + VENDEDOR EXTERNO: same menu (clients can now publish too)
        menuH = '<button class="mi act" data-s="portafolio" onclick="go(\'portafolio\')"><span class="mic">\u{1F50D}</span>Explorar</button>';
        menuH += '<button class="mi" data-s="mis-inm" onclick="go(\'mis-inm\')"><span class="mic">\u{1F3E0}</span>Mis inmuebles<span class="mib" id="misinmBadge" style="display:none">0</span></button>';
        menuH += '<button class="mi" data-s="publicar" onclick="go(\'publicar\')"><span class="mic">\u2795</span>Publicar inmueble</button>';
        menuH += '<button class="mi" data-s="favoritos" onclick="go(\'favoritos\')"><span class="mic">\u2764\uFE0F</span>Favoritos</button>';
        menuH += '<button class="mi" data-s="mensajes" onclick="go(\'mensajes\')"><span class="mic">\u{1F4AC}</span>Mensajes<span class="mib" id="msgBadge" style="display:none">0</span></button>';
        menuH += '<button class="mi" data-s="referir" onclick="go(\'referir\')"><span class="mic">\u{1F91D}</span>Referir arriendo</button>';
        menuH += '<button class="mi" data-s="mis-referidos" onclick="go(\'mis-referidos\')"><span class="mic">\u{1F4B0}</span>Mis referidos<span class="mib" id="mrefb" style="display:none">0</span></button>';
        menuH += '<button class="mi" data-s="cuenta" onclick="go(\'cuenta\')"><span class="mic">\u2699\uFE0F</span>Mi cuenta</button>';
      }
      menuDiv.innerHTML = menuH;
    }
  } else {
    // Internal user: show full CRM menu
    document.getElementById('stbar').style.display = 'block';
    document.getElementById('uname').textContent = U.nombre;
    document.getElementById('muname').textContent = U.nombre;
    document.getElementById('murole').textContent = U.rol;
    document.getElementById('mport').style.display = 'flex';

    // Show asesor filter for admin/oficina
    const aseF = document.getElementById('asesorFilter');
    if (aseF) aseF.style.display = (U.rol === 'admin' || U.rol === 'oficina') ? 'inline-block' : 'none';

    if (U.rol === 'admin' || U.rol === 'oficina' || U.es_gestor_arriendos)
      document.getElementById('magenda').style.display = 'flex';
    if (U.rol === 'admin') {
      document.getElementById('musrs').style.display = 'flex';
      const apEl = document.getElementById('madminpagos');
      if (apEl) apEl.style.display = 'flex';
      document.getElementById('mpap').style.display = 'flex';
    }
  }

  iTh();
}

// ---------------------------------------------------------------------------
// initApp
// ---------------------------------------------------------------------------

export async function initApp(container) {
  console.log('[App] Initializing shell...');

  // 1. Render shell with all original HTML structure
  renderShell(container);

  // 2. Theme
  iTh();

  // 3. Auth
  try {
    const { initAuth, onAuthEvent, AUTH_EVENTS } = await import('./core/auth.js');

    // Subscribe to auth events
    onAuthEvent(({ event, detail }) => {
      console.log('[App] Auth event:', event);
      if (event === AUTH_EVENTS.LOGIN_SUCCESS || event === AUTH_EVENTS.SESSION_RESTORED) {
        sApp();
        // Clear visitor portal content
        const portafolioc = document.getElementById('portafolioc');
        if (portafolioc) portafolioc.innerHTML = '';
        // Show loading spinner
        const resEl = document.getElementById('res');
        if (resEl) resEl.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
        // Navigate to correct default route and show the section
        const u2 = window.userStore?.get();
        const t2 = u2?.tipo_usuario || 'interno';
        const isExt2 = t2 === 'cliente' || t2 === 'vendedor_externo' || t2 === 'propietario';
        // Use go() to activate the right section immediately
        const currentHash = location.hash.replace(/^#\/?/, '');
        if (typeof window.go === 'function') {
          window.go(currentHash || (isExt2 ? 'portafolio' : 'inv'));
        }
        if (typeof window.load === 'function') window.load();
      }
      if (event === AUTH_EVENTS.LOGIN_ERROR) {
        const errEl = document.getElementById('lerr');
        if (errEl) {
          errEl.textContent = detail || 'Error de conexión';
          errEl.style.display = 'block';
        }
      }
      if (event === AUTH_EVENTS.LOGOUT) {
        document.getElementById('lov').style.display = 'flex';
      }
    });

    // Init auth (restores session + starts Google One Tap)
    const { hasSession } = initAuth();

    if (hasSession) {
      sApp();
    } else {
      // Check if visitor wants to access public portal
      const hash = location.hash.replace(/^#\/?/, '');
      if (hash === 'portafolio' || hash === 'propietarios') {
        // Hide login for visitors browsing public pages
        document.getElementById('lov').style.display = 'none';
      }
    }

    // Auto-open registration form if ?reg=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reg') === '1') {
      // Wait for functions.js to load and expose toggleRegForm
      const tryToggle = () => {
        if (typeof window.toggleRegForm === 'function') {
          window.toggleRegForm();
        } else {
          setTimeout(tryToggle, 200);
        }
      };
      setTimeout(tryToggle, 500);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }

    // Bind credential login button
    const loginBtn = document.getElementById('lin_btn');
    const pwdInput = document.getElementById('lin_pwd');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => window.loginCred?.());
    }
    if (pwdInput) {
      pwdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.loginCred?.();
      });
    }

  } catch (err) {
    console.error('[App] Auth init failed:', err);
    toast('Error inicializando auth: ' + err.message, 'terr');
  }

  console.log('[App] Shell ready');
}

// ---------------------------------------------------------------------------
// Backward compat globals
// ---------------------------------------------------------------------------

window.sApp = sApp;
window.sSt = sSt;
window.omenu = omenu;
window.cmenu = cmenu;
window.tTh = tTh;
window.iTh = iTh;
window.toast = toast;
window.cfShow = cfShow;
window.cfCancel = cfCancel;
window.go = (route) => {
  const r = window.__router;
  if (r?.navigateTo) r.navigateTo(route);
  else location.hash = '#/' + route;
};

export { sApp, sSt, toast, cfShow, cfCancel, omenu, cmenu, tTh, iTh };
