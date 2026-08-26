/**
 * HOUSE CRM — Registration Store
 *
 * Replaces globals: fS, fD{}, _pendingFotos[], fTp[], fAP[], fAX[]
 * Manages wizard state (5 steps), form data, validation, localStorage memory.
 */

import { inventory, propertyEmoji, formatMoney } from '../inventory/inventoryStore.js';

// ─── Constants (identical to original) ───────────────────────────

export const STEP_LABELS = ['Lo esencial', 'Propietario', 'Características', 'Amenidades', 'Fotos', 'Revisar'];

/** Número de pasos del wizard. Derivado de STEP_LABELS para que añadir un
 *  paso no exija cazar el número 5 por media docena de archivos. */
export const TOTAL_STEPS = STEP_LABELS.length;

export const PROPERTY_TYPES = [
  { id: 'Casa', emoji: '🏠' }, { id: 'Apartamento', emoji: '🏢' },
  { id: 'Apartaestudio', emoji: '🏬' },
  { id: 'Finca', emoji: '🌾' }, { id: 'Local comercial', emoji: '🏪' },
  { id: 'Oficina', emoji: '💼' }, { id: 'Lote', emoji: '🌳' },
  { id: 'Casa campestre', emoji: '🌿' }, { id: 'Bodega', emoji: '🏭' },
  { id: 'Penthouse', emoji: '👑' },
];

export const AMENITIES_PRIMARY = [
  { id: 'parqueadero', label: 'Parqueo', emoji: '🚗' },
  { id: 'ascensor', label: 'Ascensor', emoji: '🛗' },
  { id: 'piscina', label: 'Piscina', emoji: '🏊' },
  { id: 'gimnasio', label: 'Gimnasio', emoji: '🏋️' },
  { id: 'zonas_verdes', label: 'Zonas V.', emoji: '🌿' },
  { id: 'seguridad', label: 'Seguridad', emoji: '🛡️' },
  { id: 'salon_comunal', label: 'Salón', emoji: '🎉' },
  { id: 'terraza', label: 'Terraza', emoji: '☀️' },
];

export const AMENITIES_EXTRA = [
  { id: 'cancha_tennis', label: 'Tenis', emoji: '🎾' },
  { id: 'cancha_futbol', label: 'Fútbol', emoji: '⚽' },
  { id: 'sauna', label: 'Sauna', emoji: '🧖' },
  { id: 'juegos_ninos', label: 'Juegos', emoji: '🎠' },
  { id: 'bbq', label: 'BBQ', emoji: '🔥' },
  { id: 'coworking', label: 'Cowork', emoji: '💻' },
  { id: 'pet_friendly', label: 'Pet', emoji: '🐕' },
  { id: 'cuarto_util', label: 'Útil', emoji: '📦' },
  { id: 'lavanderia', label: 'Lavand.', emoji: '🧺' },
  { id: 'deposito', label: 'Depósito', emoji: '🗄️' },
];

export const CARACTERISTICAS = [
  { id: 'cocina_integral', label: '🍳 Cocina' },
  { id: 'balcon', label: '🏞️ Balcón' },
  { id: 'patio', label: '🌳 Patio' },
  { id: 'estudio', label: '📚 Estudio' },
  { id: 'zona_ropas', label: '👕 Ropas' },
  { id: 'doble_altura', label: '📐 Doble alt.' },
];

const STORAGE_KEY = 'hcrm_fmem';
const DEFAULTS = {
  tipo: '', negociacion: 'VENTA', precioVenta: '', precioArriendo: '',
  direccion: '', ciudad: '', barrio: '', nombre: '', telefono: '', email: '',
  area: 120, areaTotal: '', estrato: 0, habitaciones: 3, banos: 2, parqueos: 1,
  caracteristicas: [], amenidades: [], observaciones: '',
  fecha_vencimiento_autorizacion: '',
};

// ─── Internal state ──────────────────────────────────────────────

const _state = {
  step: 1,
  formData: { ...DEFAULTS },
  pendingFotos: [],
  status: 'idle', // idle | submitting | success | error
  error: null,
};

const _listeners = new Set();

function _notify() {
  const snap = { step: _state.step, formData: { ..._state.formData }, pendingFotos: [..._state.pendingFotos], status: _state.status, error: _state.error };
  _listeners.forEach(fn => { try { fn(snap); } catch (e) { console.error('[regStore]', e); } });
}

// ─── localStorage memory (identical to fMem/fSaveMem) ────────────

function _loadMemory() {
  try {
    const m = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (m.ciudad && !_state.formData.ciudad) _state.formData.ciudad = m.ciudad;
    if (m.tipo && !_state.formData.tipo) _state.formData.tipo = m.tipo;
  } catch (e) { /* ignore */ }
}

function _saveMemory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ciudad: _state.formData.ciudad,
      tipo: _state.formData.tipo,
    }));
  } catch (e) { /* ignore */ }
}

// ─── Public API ──────────────────────────────────────────────────

const registration = {

  STEP_LABELS, TOTAL_STEPS, PROPERTY_TYPES, AMENITIES_PRIMARY, AMENITIES_EXTRA, CARACTERISTICAS,

  init() { _loadMemory(); _notify(); },

  // ── Step navigation ────────────────────────────────────────

  getStep()      { return _state.step; },
  getFormData()  { return { ..._state.formData }; },
  getState()     { return { step: _state.step, formData: { ..._state.formData }, pendingFotos: [..._state.pendingFotos], status: _state.status, error: _state.error }; },

  setStep(n) {
    if (n >= 1 && n <= TOTAL_STEPS) { _state.step = n; _notify(); }
  },

  nextStep() {
    if (_state.step < TOTAL_STEPS) { _state.step++; _notify(); }
  },

  prevStep() {
    if (_state.step > 1) { _state.step--; _notify(); }
  },

  // ── Field updates ──────────────────────────────────────────

  updateField(field, value) {
    if (field in _state.formData) {
      _state.formData[field] = value;
      _notify();
    }
  },

  toggleCaracteristica(id) {
    const arr = _state.formData.caracteristicas;
    const i = arr.indexOf(id);
    if (i > -1) arr.splice(i, 1); else arr.push(id);
    _notify();
  },

  toggleAmenidad(id) {
    const arr = _state.formData.amenidades;
    const i = arr.indexOf(id);
    if (i > -1) arr.splice(i, 1); else arr.push(id);
    _notify();
  },

  incrementField(field) {
    if (typeof _state.formData[field] === 'number') { _state.formData[field]++; _notify(); }
  },

  decrementField(field) {
    if (typeof _state.formData[field] === 'number') {
      _state.formData[field] = Math.max(0, _state.formData[field] - 1);
      _notify();
    }
  },

  // ── Photos ─────────────────────────────────────────────────

  addPendingFoto(foto) {
    _state.pendingFotos.push(foto);
    _notify();
  },

  removePendingFoto(url) {
    _state.pendingFotos = _state.pendingFotos.filter(f => f.url !== url);
    _notify();
  },

  getPendingFotos() { return [..._state.pendingFotos]; },

  // ── Validation ─────────────────────────────────────────────

  canAdvance(step) {
    const fd = _state.formData;
    const s = step || _state.step;
    if (s === 1) return !!(fd.tipo && fd.negociacion && fd.direccion.trim() && fd.ciudad.trim());
    if (s === 2) return !!(fd.nombre.trim() && fd.telefono.trim());
    return true; // steps 3, 4, 5 have no required fields
  },

  getValidationErrors(step) {
    const fd = _state.formData;
    const s = step || _state.step;
    const errors = [];
    if (s === 1) {
      if (!fd.tipo) errors.push('Selecciona un tipo de inmueble');
      if (!fd.negociacion) errors.push('Selecciona negociación');
      if (!fd.direccion.trim()) errors.push('La dirección es obligatoria');
      if (!fd.ciudad.trim()) errors.push('La ciudad es obligatoria');
    }
    if (s === 2) {
      if (!fd.nombre.trim()) errors.push('El nombre del propietario es obligatorio');
      if (!fd.telefono.trim()) errors.push('El teléfono es obligatorio');
    }
    return errors;
  },

  // ── HOUSE code generation (INTOCABLE logic) ────────────────

  nextHouseCode() {
    let maxN = 0;
    inventory.getAll().forEach(p => {
      if (p.codigo_house) {
        const n = parseInt(p.codigo_house.replace('HOUSE-', ''));
        if (n > maxN) maxN = n;
      }
    });
    return 'HOUSE-' + String(maxN + 1).padStart(3, '0');
  },

  // ── Status ─────────────────────────────────────────────────

  setStatus(status, error = null) {
    _state.status = status;
    _state.error = error;
    _notify();
  },

  // ── Reset (after successful submit) ────────────────────────

  reset() {
    const lastCity = _state.formData.ciudad;
    const lastType = _state.formData.tipo;
    _state.formData = { ...DEFAULTS, ciudad: lastCity, tipo: lastType };
    _state.step = 1;
    _state.pendingFotos = [];
    _state.status = 'idle';
    _state.error = null;
    _saveMemory();
    _notify();
  },

  // ── Build Supabase payload ─────────────────────────────────

  buildPayload(userId) {
    const fd = _state.formData;
    const neg = fd.negociacion === 'AMBAS' ? 'Venta y Arriendo' : fd.negociacion === 'VENTA' ? 'Venta' : 'Arriendo';
    return {
      captador_id: userId,
      tipo: fd.tipo,
      negociacion: neg,
      direccion: fd.direccion,
      ciudad: fd.ciudad,
      barrio: fd.barrio,
      precio_venta: fd.precioVenta ? parseFloat(fd.precioVenta) : null,
      precio_arriendo: fd.precioArriendo ? parseFloat(fd.precioArriendo) : null,
      area_construida: fd.area ? parseFloat(fd.area) : null,
      area_total: fd.areaTotal ? parseFloat(fd.areaTotal) : null,
      estrato: fd.estrato ? String(fd.estrato) : null,
      habitaciones: fd.habitaciones || null,
      banos: fd.banos || null,
      parqueaderos: fd.parqueos || null,
      caracteristicas: fd.amenidades.join(', '),
      observaciones: fd.observaciones,
      descripcion_cliente: fd.observaciones,
      propietario_nombre: fd.nombre,
      propietario_telefono: fd.telefono,
      propietario_email: fd.email,
      fecha_vencimiento_aut: fd.fecha_vencimiento_autorizacion || null,
      estado: 'Disponible',
    };
  },

  // ── Subscription ───────────────────────────────────────────

  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

// Backward compat
if (typeof window !== 'undefined') {
  window.fD = _state.formData;
  Object.defineProperty(window, 'fS', {
    get() { return _state.step; },
    set(v) { registration.setStep(v); },
    configurable: true,
  });
  window._pendingFotos = _state.pendingFotos;
  window.registration = registration;
  window.nextHouseCode = () => registration.nextHouseCode();
  window.fTp = PROPERTY_TYPES.map(t => ({ id: t.id, i: t.emoji }));
  window.fAP = AMENITIES_PRIMARY.map(a => ({ id: a.id, l: a.label, i: a.emoji }));
  window.fAX = AMENITIES_EXTRA.map(a => ({ id: a.id, l: a.label, i: a.emoji }));
  window.tgC = (id) => registration.toggleCaracteristica(id);
  window.tgAm = (id) => registration.toggleAmenidad(id);
}

export { registration };
export default registration;
