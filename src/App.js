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

const LOGO_SVG_SM = `<svg width="32" height="32" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#lg1)"/><path d="M20 8L31 17H9L20 8Z" fill="#fff" opacity=".95"/><rect x="12" y="17" width="16" height="15" rx="1.5" fill="#fff" opacity=".85"/><rect x="17" y="22" width="6" height="10" rx="1.5" fill="#6366f1" opacity=".5"/><rect x="18.5" y="23.5" width="3" height="3" rx=".5" fill="#fff" opacity=".5"/></svg>`;

const LOGO_SVG_LG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><defs><linearGradient id="llg1" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient><linearGradient id="llg2" x1="20" y1="16" x2="44" y2="50"><stop stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#e0e7ff" stop-opacity=".8"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#llg1)"/><path d="M32 12L50 26H14L32 12Z" fill="url(#llg2)"/><rect x="20" y="26" width="24" height="24" rx="2" fill="url(#llg2)"/><rect x="27" y="34" width="10" height="16" rx="2" fill="#3b82f6" opacity=".6"/><rect x="29" y="36" width="6" height="6" rx="1" fill="#fff" opacity=".4"/></svg>`;

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
    <div class="lbr">House CRM</div>
    <div class="lsb">Gesti\u00F3n Inmobiliaria Inteligente</div>
    <div id="g_id_signin"></div>
    <div class="lor"><span>o ingresa con</span></div>
    <div class="lfrm">
      <input id="lin_usr" type="text" placeholder="Usuario" autocomplete="username">
      <input id="lin_pwd" type="password" placeholder="Contrase\u00F1a" autocomplete="current-password">
      <button id="lin_btn" type="button">Ingresar</button>
    </div>
    <div class="ldiv"></div>
    <div class="lfooter">Ingresa con Google o con tus credenciales</div>
    <div id="lerr" style="display:none"></div>
    <div style="margin-top:16px;text-align:center">
      <a href="#/portafolio" onclick="document.getElementById('lov').style.display='none';document.getElementById('mhdr').style.display='block'" style="color:#94a3b8;font-size:12px;text-decoration:underline;cursor:pointer">\u{1F50D} Explorar inmuebles sin cuenta</a>
    </div>
  </div>
</div>

<!-- HEADER -->
<header id="mhdr" style="display:none">
  <div class="nav">
    <div style="display:flex;align-items:center;gap:6px">
      <button class="ib" onclick="omenu()">\u2630</button>
      <a class="lw" onclick="go('inv')">${LOGO_SVG_SM}<div><div class="lm">House CRM</div></div></a>
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
      <div class="up"><img id="ufoto" src=""><span id="uname">\u2014</span></div>
    </div>
  </div>
</header>

<!-- MOBILE SIDEBAR -->
<div class="mov" id="mov" onclick="cmenu()"></div>
<div class="mp" id="mpnl">
  <div class="mhd">
    <span class="mbr" style="display:flex;align-items:center;gap:8px">${LOGO_SVG_SM} House CRM</span>
    <button class="mcl" onclick="cmenu()">\u2715</button>
  </div>
  <div style="padding:6px 0">
    <button class="mi act" data-s="inv" onclick="go('inv')"><span class="mic">\u{1F3E0}</span>Inventario</button>
    <button class="mi" data-s="mis" onclick="go('mis')"><span class="mic">\u{1F500}</span>Mis Inmuebles</button>
    <button class="mi" data-s="reg" onclick="go('reg')"><span class="mic">\u2795</span>Registrar</button>
    <button class="mi" data-s="alertas" onclick="go('alertas')"><span class="mic">\u{1F514}</span>Alertas<span class="mib" id="malb" style="display:none">0</span></button>
    <button class="mi" data-s="portales" onclick="go('portales')" id="mport" style="display:none"><span class="mic">\u{1F310}</span>Portales</button>
    <button class="mi" data-s="dash" onclick="go('dash')"><span class="mic">\u{1F4CA}</span>Dashboard</button>
    <button class="mi" data-s="agenda" onclick="go('agenda')" id="magenda" style="display:none"><span class="mic">\u{1F4C5}</span>Agenda<span class="mib" id="magb" style="display:none">0</span></button>
    <button class="mi" data-s="conc" onclick="go('conc')"><span class="mic">\u{1F504}</span>Portales M\u00B2/FR<span class="mib" id="mconcb" style="display:none">0</span></button>
    <button class="mi" data-s="users" onclick="go('users')" id="musrs" style="display:none"><span class="mic">\u{1F465}</span>Usuarios</button>
    <button class="mi" data-s="perfil" onclick="go('perfil')"><span class="mic">\u2699\uFE0F</span>Mi Perfil</button>
    <button class="mi" data-s="papelera" onclick="go('papelera')" id="mpap" style="display:none"><span class="mic">\u{1F5D1}\uFE0F</span>Papelera</button>
  </div>
  <div class="mdv"></div>
  <div class="mu">
    <img id="mufoto" src="">
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
  <!-- Hidden counters for uSt() compatibility -->
  <div style="display:none"><span id="hst"></span><span id="hsv"></span><span id="hsa"></span><span id="hsb"></span></div>
  <div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px">
    <div class="wban" id="wban" style="display:none"></div>
    <div class="rsrch" id="rsrch"></div>
    <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
      <button id="myToggle" onclick="toggleMis()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:22px;font-size:12px;font-weight:800;border:2.5px solid #e11d73;background:linear-gradient(135deg,#fdf2f8,#fce7f3);color:#be185d;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(225,29,115,.15);letter-spacing:.3px">\u{1F3E0} Mostrar mis inmuebles</button>
      <select id="asesorFilter" class="esel" style="font-size:11px;padding:6px 10px;display:none" onchange="doSearch()"><option value="">\u{1F464} Todos los asesores</option></select>
    </div>
    <div style="margin-bottom:8px"><div class="siw"><span class="sii">\u{1F50D}</span><input class="si" id="q" placeholder="Buscar..." onkeypress="if(event.key==='Enter')doSearch()" oninput="autoSearch()"><button class="sig" onclick="doSearch()">\u2192</button></div></div>
    <!-- COLLAPSED STATE: compact bar with tags + expand button -->
    <div id="filterCollapsed" style="display:none;background:var(--cd);border:1px solid var(--brd);border-radius:var(--r);padding:10px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--b600)">\u2726 Filtros activos</span>
        <div style="flex:1"></div>
        <button class="bt bsm bp" onclick="expandFilters()" style="font-size:10px;padding:5px 10px">\u2699\uFE0F Modificar</button>
        <button class="bt bsm bd" onclick="limpiar()" style="font-size:10px;padding:5px 10px">\u2715 Limpiar</button>
      </div>
      <div id="seltagsCompact" style="display:flex;flex-wrap:wrap;gap:4px"></div>
    </div>

    <!-- EXPANDED STATE: full filter panel -->
    <div class="card" id="filterExpanded"><div class="cdh"><div class="chl"><div class="chi">\u2699\uFE0F</div><div><div class="cht">Filtros</div></div></div><button class="bt bsm bd" onclick="limpiar()">\u2715 Limpiar</button></div><div class="cdb"><div class="fg">
      <div class="fs"><div class="fl">Negociaci\u00F3n</div><div class="cps"><div class="ch" data-g="neg" data-v="venta" data-c="cg" onclick="tc(this)">\u{1F4B0} Venta</div><div class="ch" data-g="neg" data-v="arriendo" onclick="tc(this)">\u{1F511} Arriendo</div><div class="ch" data-g="neg" data-v="ambas" data-c="cy" onclick="tc(this)">\u{1F504} Ambas</div></div></div>
      <div class="fs"><div class="fl">Ciudad</div><div class="cps"><div class="ch" data-g="ciu" data-v="pereira" onclick="tc(this)">\u{1F4CD} Pereira</div><div class="ch" data-g="ciu" data-v="dosquebradas" onclick="tc(this)">\u{1F4CD} Dosq.</div><div class="ch" data-g="ciu" data-v="santa rosa" onclick="tc(this)">\u{1F4CD} Sta Rosa</div><div class="ch" data-g="ciu" data-v="cerritos" onclick="tc(this)">\u{1F4CD} Cerritos</div></div></div>
      <div class="fs ful"><div class="fl">Tipo</div><div class="cps"><div class="ch" data-g="tipo" data-v="apartamento" onclick="tc(this)">\u{1F3E2} Apto</div><div class="ch" data-g="tipo" data-v="casa" onclick="tc(this)">\u{1F3E1} Casa</div><div class="ch" data-g="tipo" data-v="finca" data-c="cg" onclick="tc(this)">\u{1F33E} Finca</div><div class="ch" data-g="tipo" data-v="local" data-c="cy" onclick="tc(this)">\u{1F3EA} Local</div><div class="ch" data-g="tipo" data-v="lote" data-c="cg" onclick="tc(this)">\u{1F333} Lote</div><div class="ch" data-g="tipo" data-v="oficina" onclick="tc(this)">\u{1F4BC} Oficina</div><div class="ch" data-g="tipo" data-v="bodega" onclick="tc(this)">\u{1F3ED} Bodega</div><div class="ch" data-g="tipo" data-v="penthouse" data-c="cy" onclick="tc(this)">\u{1F451} PH</div></div></div>
      <div class="fs ful"><div class="fl">Estado de info</div><div class="cps"><div class="ch" data-g="fresco" data-v="si" data-c="cg" onclick="tc(this)">\u2705 Solo frescos (\u22647d)</div><div class="ch" data-g="fresco" data-v="atencion" data-c="cy" onclick="tc(this)">\u26A0\uFE0F Necesitan atenci\u00F3n</div></div></div>
      <div class="slb"><div class="slt"><span class="sltt">\u{1F511} Arriendo/mes</span></div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><label style="font-size:8px;color:var(--sub);font-weight:700">M\u00CDN</label><input id="arMin" type="number" placeholder="0" style="width:100%;padding:8px 10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;color:var(--tx);background:var(--cd)" onchange="doSearch()"></div><span style="color:var(--sub);font-weight:700;font-size:14px">\u2014</span><div style="flex:1"><label style="font-size:8px;color:var(--sub);font-weight:700">M\u00C1X</label><input id="arMax" type="number" placeholder="10.000.000" style="width:100%;padding:8px 10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;color:var(--tx);background:var(--cd)" onchange="doSearch()"></div></div></div>
      <div class="slb"><div class="slt"><span class="sltt">\u{1F4B0} Precio venta</span></div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><label style="font-size:8px;color:var(--sub);font-weight:700">M\u00CDN</label><input id="vnMin" type="number" placeholder="0" style="width:100%;padding:8px 10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;color:var(--tx);background:var(--cd)" onchange="doSearch()"></div><span style="color:var(--sub);font-weight:700;font-size:14px">\u2014</span><div style="flex:1"><label style="font-size:8px;color:var(--sub);font-weight:700">M\u00C1X</label><input id="vnMax" type="number" placeholder="3.000.000.000" style="width:100%;padding:8px 10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;color:var(--tx);background:var(--cd)" onchange="doSearch()"></div></div></div>
    </div>
    <div class="br"><button class="bt bp" onclick="doSearch();collapseFilters()">\u{1F50D} Buscar</button><button class="bt bs2" onclick="mostrarTodo()">Todos</button><button class="bt bd" onclick="limpiar()">\u2715</button></div></div></div>
    <div id="res"></div>
  </div>
</div>
<div class="sec" id="sec-mis"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 80px"><div class="pnav-wrap" id="mis-nav"></div><div class="pipe-filters"><input class="pf-search" id="pipeQ" placeholder="\u{1F50D} Buscar en mi embudo..." oninput="rPipe()"><select class="pf-sort" id="pipeSort" onchange="rPipe()"><option value="dias">\u23F1\uFE0F Por d\u00EDas</option><option value="precio_desc">\u{1F4B0} Precio \u2193</option><option value="precio_asc">\u{1F4B0} Precio \u2191</option></select></div><div class="pw"><div class="pipe" id="pipeline"></div></div></div></div>
<div class="sec" id="sec-reg"><div class="fsec"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u2795</div><div><div class="cht">Registrar</div><div class="chsb" id="fsl">Paso 1/5</div></div></div></div><div class="cdb"><div class="pds" id="fdt"></div><div id="fc"></div><div class="fsn"><button class="bt bs2" id="fp" onclick="fPr()" style="display:none">\u2190</button><button class="bt bp" id="fn" onclick="fNx()">Continuar \u2192</button></div></div></div></div></div>
<div class="sec" id="sec-alertas"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F514}</div><div><div class="cht">Alertas</div></div></div></div><div class="cdb" id="all"></div></div></div>
<div class="sec" id="sec-portales"><div class="card"><div class="cdh"><div class="chl"><div class="chi">\u{1F310}</div><div><div class="cht">Portales</div></div></div></div><div class="cdb" id="ptl"></div></div></div>
<div class="sec" id="sec-dash"><div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px" id="dsc"></div></div>
<div class="sec" id="sec-agenda"><div style="max-width:700px;margin:0 auto;padding:10px 14px 60px" id="agc"></div></div>
<div class="sec" id="sec-conc"><div style="max-width:800px;margin:0 auto;padding:10px 14px 60px" id="concc"></div></div>
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

<!-- MODAL -->
<div class="mo" id="mdl" style="display:none" onclick="if(event.target===this)cm()"><div class="mb2"><div class="m-handle"></div><div class="mhd2"><div><div class="mtt" id="mtt"></div><div class="msb2" id="msb3"></div></div><button class="mcl3" onclick="cm()">\u2715</button></div><div class="mbd2" id="mbd"></div></div></div>

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
  const isExterno = tipoU === 'cliente' || tipoU === 'propietario' || tipoU === 'pendiente';

  document.getElementById('lov').style.display = 'none';
  document.getElementById('mhdr').style.display = 'block';

  if (U.foto) {
    document.getElementById('ufoto').src = U.foto;
    document.getElementById('mufoto').src = U.foto;
  }

  if (isExterno) {
    // External user: hide internal menu, show external menu
    document.getElementById('stbar').style.display = 'none';
    document.getElementById('uname').textContent = U.nombre;
    document.getElementById('muname').textContent = U.nombre;
    document.getElementById('murole').textContent = tipoU === 'propietario' ? 'Propietario' : tipoU === 'pendiente' ? 'Pendiente' : 'Cliente';

    // Replace sidebar menu with external options
    const menuDiv = document.querySelector('#mpnl > div:nth-child(2)');
    if (menuDiv) {
      let menuH = '';
      if (tipoU === 'pendiente') {
        menuH = '<button class="mi act" data-s="espera" onclick="go(\'espera\')"><span class="mic">\u23F3</span>En espera</button>';
      } else {
        menuH = '<button class="mi act" data-s="portafolio" onclick="go(\'portafolio\')"><span class="mic">\u{1F50D}</span>Explorar</button>';
        menuH += '<button class="mi" data-s="favoritos" onclick="go(\'favoritos\')"><span class="mic">\u2764\uFE0F</span>Favoritos</button>';
        if (tipoU === 'propietario') {
          menuH += '<button class="mi" data-s="mis-pub" onclick="go(\'mis-pub\')"><span class="mic">\u{1F3E0}</span>Mis publicaciones</button>';
          menuH += '<button class="mi" data-s="publicar" onclick="go(\'publicar\')"><span class="mic">\u2795</span>Publicar</button>';
        }
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

    if (U.rol === 'admin' || U.rol === 'oficina' || U.es_gestor_arriendos)
      document.getElementById('magenda').style.display = 'flex';
    if (U.rol === 'admin') {
      document.getElementById('musrs').style.display = 'flex';
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
      if (hash === 'portafolio' || hash === '') {
        // Hide login, show portafolio for visitors
        document.getElementById('lov').style.display = 'none';
        // Don't show main header — rPortafolio renders its own
      }
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
