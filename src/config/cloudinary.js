/**
 * HOUSE CRM — Cloudinary Upload Config
 *
 * Extracted from the monolithic HTML: CLOUD_NAME, CLOUD_PRESET, uploadToCloudinary(),
 * initFotoUpload(), processFiles(), removePendingFoto()
 */

function getEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) return window.__ENV__[key];
  return null;
}

const CLOUD_NAME   = getEnv('VITE_CLOUD_NAME') || 'dfelsbmbo';
const CLOUD_PRESET = getEnv('VITE_CLOUD_PRESET') || 'fichas_unsigned';
const MAX_FOTOS = 30;

// ─── Validaciones de archivos (defensa en profundidad) ─────────
// La validación real debe ocurrir en el preset de Cloudinary dashboard.
// Acá agregamos checks cliente-side para fallar temprano y dar feedback
// al usuario legítimo; NO es una barrera de seguridad absoluta (un atacante
// sofisticado bypasea el cliente fácil), pero reduce el ruido y protege
// contra errores de usuarios.

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]);
const MAX_SIZE_IMAGE = 10 * 1024 * 1024;   // 10 MB para imágenes
const MAX_SIZE_VIDEO = 50 * 1024 * 1024;   // 50 MB para videos

// Magic bytes (primeros bytes del archivo) para validar tipo real
// https://en.wikipedia.org/wiki/List_of_file_signatures
const MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (WebP is RIFF-based)
  // Videos comienzan con variedad de headers — no chequeamos magic bytes para ellos
];

async function checkMagicBytes(file) {
  // Solo validamos magic bytes para imágenes (videos tienen muchas variantes)
  if (!file.type.startsWith('image/')) return true;
  try {
    const slice = file.slice(0, 12);
    const buf = new Uint8Array(await slice.arrayBuffer());
    for (const sig of MAGIC_BYTES) {
      if (sig.bytes.every((b, i) => buf[i] === b)) return true;
    }
    // Ningún magic byte de imagen coincide
    return false;
  } catch (e) {
    console.warn('[cloudinary] magic bytes check failed:', e);
    return true; // fail open (no bloqueamos por error de lectura)
  }
}

function validateFile(file) {
  // 1. Tipo MIME
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, reason: 'tipo_no_permitido', detail: `Tipo "${file.type}" no permitido. Solo JPG, PNG, WebP, GIF, MP4.` };
  }
  // 2. Tamaño
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? MAX_SIZE_VIDEO : MAX_SIZE_IMAGE;
  if (file.size > maxSize) {
    const mb = Math.round(file.size / 1024 / 1024);
    const limit = Math.round(maxSize / 1024 / 1024);
    return { ok: false, reason: 'muy_grande', detail: `${file.name} pesa ${mb}MB. Máximo ${limit}MB.` };
  }
  // 3. Nombre sospechoso (extensiones double-encoded, ejecutables)
  const badExt = /\.(html?|svg|js|mjs|ts|exe|bat|cmd|sh|py|php|rb|dll|msi|jar|zip|rar|tar|gz|7z)$/i;
  if (badExt.test(file.name)) {
    return { ok: false, reason: 'extension_peligrosa', detail: `Extensión "${file.name.split('.').pop()}" no permitida.` };
  }
  return { ok: true };
}

/**
 * Upload a single file to Cloudinary with client-side validation.
 * @param {File} file
 * @returns {Promise<{url:string, thumb:string, tipo:string}>}
 */
export async function uploadToCloudinary(file) {
  // ── Validación cliente (defensa en profundidad) ──
  const v = validateFile(file);
  if (!v.ok) {
    console.warn('[cloudinary] rejected:', v.reason, v.detail);
    throw new Error(v.detail);
  }
  // Magic bytes: verifica que el contenido real coincida con el MIME declarado
  const magicOk = await checkMagicBytes(file);
  if (!magicOk) {
    throw new Error(`${file.name}: el contenido no coincide con una imagen válida.`);
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUD_PRESET);
  fd.append('folder', 'fichas_inmobiliarias');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (data.secure_url) {
    return {
      url: data.secure_url,
      thumb: data.secure_url.replace('/upload/', '/upload/w_400,c_fill,f_auto/'),
      tipo: data.resource_type === 'video' ? 'video' : 'imagen',
      hash: data.etag || null, // MD5 del archivo — usado para detectar fotos duplicadas
    };
  }
  throw new Error(data.error?.message || 'Upload failed');
}

/**
 * Process multiple files with progress tracking.
 * @param {File[]} files
 * @param {Function} onEach - Called with result after each upload
 * @param {Function} onProgress - Called with (pct: 0-100)
 * @param {number} existingCount - How many photos already exist
 * @returns {Promise<{url,thumb,tipo}[]>}
 */
export async function processFileUploads(files, onEach, onProgress, existingCount = 0) {
  const remaining = MAX_FOTOS - existingCount;
  if (remaining <= 0) {
    if (typeof window !== 'undefined' && window.toast) window.toast('📷 Límite de ' + MAX_FOTOS + ' fotos alcanzado', 'twarn');
    return [];
  }

  const toUpload = files.slice(0, remaining);
  if (toUpload.length < files.length && typeof window !== 'undefined' && window.toast) {
    window.toast('⚠️ Solo se subirán ' + toUpload.length + ' de ' + files.length + ' (límite ' + MAX_FOTOS + ')', 'twarn');
  }

  const results = [];
  for (let i = 0; i < toUpload.length; i++) {
    if (onProgress) onProgress(Math.round((i / toUpload.length) * 100));
    try {
      const result = await uploadToCloudinary(toUpload[i]);
      results.push(result);
      if (onEach) onEach(result);
    } catch (e) {
      if (typeof window !== 'undefined' && window.toast) window.toast('Error subiendo: ' + toUpload[i].name, 'terr');
    }
  }
  if (onProgress) onProgress(100);
  if (typeof window !== 'undefined' && window.toast) window.toast('📷 ' + results.length + ' archivo(s) subidos');
  return results;
}

/**
 * Initialize a foto upload zone in a container element.
 * Identical behavior to original initFotoUpload().
 */
export function initFotoUpload(containerId, onAdd, existingCount) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const remaining = MAX_FOTOS - (existingCount || 0);

  if (remaining <= 0) {
    el.innerHTML = `<div style="padding:12px;text-align:center;background:var(--goldbg);border:1.5px solid var(--yb);border-radius:10px;font-size:11px;color:#92400e;font-weight:700">📷 Límite de ${MAX_FOTOS} fotos alcanzado</div>`;
    return;
  }

  el.innerHTML = `<div class="foto-up" id="${containerId}_drop" onclick="document.getElementById('${containerId}_input').click()"><div class="foto-up-ico">📷</div><div class="foto-up-txt">Toca para agregar fotos o videos</div><div class="foto-up-sub">JPG, PNG, MP4 · Máx 10MB · Quedan ${remaining} de ${MAX_FOTOS}</div></div><input type="file" id="${containerId}_input" multiple accept="image/*,video/*" style="display:none"><div class="foto-progress" id="${containerId}_prog" style="display:none"><span style="width:0%"></span></div><div class="foto-prev" id="${containerId}_prev"></div>`;

  const inp = document.getElementById(containerId + '_input');
  const drop = document.getElementById(containerId + '_drop');

  const handleFiles = (fileList) => {
    const prog = document.getElementById(containerId + '_prog');
    const prev = document.getElementById(containerId + '_prev');
    const currentUploaded = prev ? prev.children.length : 0;

    prog.style.display = 'block';
    processFileUploads(
      Array.from(fileList),
      (result) => {
        if (onAdd) onAdd(result);
        const item = document.createElement('div');
        item.className = 'foto-prev-item';
        item.innerHTML = `<img src="${result.thumb}"><button class="foto-del" onclick="this.parentElement.remove()" type="button">✕</button>`;
        prev.appendChild(item);
      },
      (pct) => { prog.querySelector('span').style.width = pct + '%'; },
      (existingCount || 0) + currentUploaded
    ).then(() => {
      setTimeout(() => { prog.style.display = 'none'; prog.querySelector('span').style.width = '0%'; }, 1000);
    });
  };

  inp.addEventListener('change', () => { if (inp.files.length) handleFiles(inp.files); });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragging'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
}

// ─── Optimización on-the-fly de URLs Cloudinary ─────────────────
// Inyecta f_auto,q_auto + ancho responsive en cualquier URL existente,
// incluso fotos viejas que se guardaron sin url_thumb optimizado.
//
// Uso:
//   cldOpt(url)            → 800px, calidad/formato auto (default cards/modal)
//   cldOpt(url, 400)       → 400px (thumbnails grilla)
//   cldOpt(url, 1200)      → 1200px (galería full-screen)
//   cldOpt(url, 'thumb')   → preset thumbnail 400px cuadrado
//
// Detecta si la URL ya tiene transformaciones para no duplicarlas.
const _CLD_HOST_RX = /res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\//;
// Detecta si DESPUÉS de /upload/ hay un segmento de transformaciones
// (cualquier cosa que empiece con una letra/número/coma seguida de "/").
// Las transforms tienen forma: w_400,c_fill,q_auto/...
// Los public_ids con folder pueden empezar con letras también, pero NO contienen
// las claves típicas (w_, h_, c_, q_, f_, dpr_, ar_). Usamos esa heurística.
const _CLD_TRANSFORM_RX = /\/upload\/([^/]*\b(?:w_|h_|c_|q_|f_|dpr_|ar_|g_|e_|x_|y_)[^/]*)\//;

export function cldOpt(url, sizeOrPreset) {
  if (!url || typeof url !== 'string') return url || '';
  if (!_CLD_HOST_RX.test(url)) return url; // no es Cloudinary

  // Resolver preset → params
  let params = 'f_auto,q_auto,c_fill,w_800';
  if (typeof sizeOrPreset === 'number') {
    params = `f_auto,q_auto,c_fill,w_${sizeOrPreset}`;
  } else if (sizeOrPreset === 'thumb') {
    params = 'f_auto,q_auto,c_fill,w_400,h_300';
  } else if (sizeOrPreset === 'avatar') {
    params = 'f_auto,q_auto,c_fill,w_128,h_128,g_face';
  } else if (sizeOrPreset === 'full') {
    params = 'f_auto,q_auto,c_limit,w_1600';
  }

  // Si ya hay transformaciones de tamaño/formato, las reemplazamos
  if (_CLD_TRANSFORM_RX.test(url)) {
    return url.replace(_CLD_TRANSFORM_RX, `/upload/${params}/`);
  }
  // Si no, las insertamos justo después de /upload/
  return url.replace(/\/upload\//, `/upload/${params}/`);
}

export { CLOUD_NAME, CLOUD_PRESET, MAX_FOTOS };

// Backward compat
if (typeof window !== 'undefined') {
  window.uploadToCloudinary = uploadToCloudinary;
  window.initFotoUpload = initFotoUpload;
  window.cldOpt = cldOpt;
  window.CLOUD_NAME = CLOUD_NAME;
  window.CLOUD_PRESET = CLOUD_PRESET;
  window.MAX_FOTOS = MAX_FOTOS;
}
