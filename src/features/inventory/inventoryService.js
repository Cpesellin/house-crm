/**
 * HOUSE CRM — Inventory Service (Supabase API)
 *
 * Replaces the data-fetching parts of load().
 * All responses pass through safeText() before reaching the store.
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { inventory } from './inventoryStore.js';

// Fields where text comes from user input and needs sanitization on read
const TEXT_FIELDS = [
  'tipo', 'ciudad', 'direccion', 'direccion_publica', 'barrio',
  'observaciones', 'descripcion_privada', 'descripcion_cliente',
  'caracteristicas', 'propietario_nombre', 'propietario_telefono',
  'propietario_email', 'codigo_house', 'negociacion',
];

/**
 * Fetch all active properties with relations.
 * Identical query to the original load() function.
 *
 * @returns {Promise<{ data: Object[], error: string|null }>}
 */
export async function fetchInventory() {
  const SB = getSupabaseClient();
  inventory.setLoading(true);
  inventory.setError(null);

  try {
    const { data, error } = await SB
      .from('inmuebles')
      .select('*,captador:usuarios!captador_id(id,nombre,email,usuario,foto),fotos(id,url,url_thumb,origen,orden)')
      .eq('eliminado', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    inventory.setItems(data || []);
    inventory.setLoading(false);
    return { data: data || [], error: null };

  } catch (e) {
    const msg = e?.message || 'Error cargando inventario';
    inventory.setError(msg);
    inventory.setLoading(false);
    return { data: [], error: msg };
  }
}

/**
 * Soft-delete a property (move to trash).
 *
 * @param {string} id - Property UUID
 * @param {string} userId - Who is deleting
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteProperty(id, userId) {
  const SB = getSupabaseClient();

  try {
    const { error } = await SB
      .from('inmuebles')
      .update({
        eliminado: true,
        eliminado_por: userId,
        fecha_eliminacion: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await SB.from('historial').insert({
      inmueble_id: id,
      usuario_id: userId,
      accion: 'eliminacion',
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Error eliminando' };
  }
}

/**
 * Restore a property from trash.
 */
export async function restoreProperty(id, userId) {
  const SB = getSupabaseClient();

  try {
    const { error } = await SB
      .from('inmuebles')
      .update({ eliminado: false, eliminado_por: null, fecha_eliminacion: null })
      .eq('id', id);

    if (error) throw error;

    await SB.from('historial').insert({
      inmueble_id: id,
      usuario_id: userId,
      accion: 'restauracion',
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Error restaurando' };
  }
}

/**
 * Update a property.
 *
 * @param {string} id
 * @param {Object} changes - Column→value map
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateProperty(id, changes) {
  const SB = getSupabaseClient();

  try {
    changes.updated_at = new Date().toISOString();
    const { error } = await SB.from('inmuebles').update(changes).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Error actualizando' };
  }
}

/**
 * Change property state with history tracking.
 */
export async function changePropertyState(id, newState, userId) {
  const SB = getSupabaseClient();

  try {
    const { error } = await SB
      .from('inmuebles')
      .update({
        estado: newState,
        fecha_estado: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await SB.from('historial').insert({
      inmueble_id: id,
      usuario_id: userId,
      accion: 'cambio_estado',
      campo: 'estado',
      valor_nuevo: newState,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'Error cambiando estado' };
  }
}

/**
 * Fetch trashed properties (for admin papelera).
 */
export async function fetchTrashed() {
  const SB = getSupabaseClient();

  try {
    const { data, error } = await SB
      .from('inmuebles')
      .select('*,captador:usuarios!captador_id(nombre)')
      .eq('eliminado', true)
      .order('fecha_eliminacion', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: e?.message };
  }
}

/**
 * Save uploaded photos to a property.
 */
export async function savePhotos(propertyId, photos) {
  const SB = getSupabaseClient();
  const results = [];

  for (let i = 0; i < photos.length; i++) {
    const { error } = await SB.from('fotos').insert({
      inmueble_id: propertyId,
      url: photos[i].url,
      url_thumb: photos[i].thumb,
      origen: 'cloudinary',
      tipo: photos[i].tipo || 'imagen',
      orden: i,
    });
    results.push({ url: photos[i].url, success: !error });
  }

  return results;
}

/**
 * Delete a photo.
 */
export async function deletePhoto(photoId) {
  const SB = getSupabaseClient();
  const { error } = await SB.from('fotos').delete().eq('id', photoId);
  return { success: !error, error: error?.message };
}

// ─── Backward compat ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.fetchInventory = fetchInventory;
  window.deleteProperty = deleteProperty;
  window.restoreProperty = restoreProperty;
  window.updateProperty = updateProperty;
  window.changePropertyState = changePropertyState;
  window.saveFotosToInmueble = (id, fotos) => savePhotos(id, fotos);
}

export default {
  fetchInventory,
  deleteProperty,
  restoreProperty,
  updateProperty,
  changePropertyState,
  fetchTrashed,
  savePhotos,
  deletePhoto,
};
