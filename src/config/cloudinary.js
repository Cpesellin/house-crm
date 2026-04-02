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

/**
 * Upload a single file to Cloudinary. Identical to original uploadToCloudinary().
 * @param {File} file
 * @returns {Promise<{url:string, thumb:string, tipo:string}>}
 */
export async function uploadToCloudinary(file) {
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

export { CLOUD_NAME, CLOUD_PRESET, MAX_FOTOS };

// Backward compat
if (typeof window !== 'undefined') {
  window.uploadToCloudinary = uploadToCloudinary;
  window.initFotoUpload = initFotoUpload;
  window.CLOUD_NAME = CLOUD_NAME;
  window.CLOUD_PRESET = CLOUD_PRESET;
  window.MAX_FOTOS = MAX_FOTOS;
}
