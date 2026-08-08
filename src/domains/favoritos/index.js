/**
 * Módulo: favoritos
 *
 * Gestión de inmuebles favoritos por usuario.
 * - `toggleFavorito(inmId)`: agrega/quita favorito. Si no hay sesión,
 *   abre el auth prompt. Emite eventos de tracking.
 * - `toggleFavFilter()`: activa/desactiva el filtro "solo favoritos"
 *   en la vista de inventario.
 *
 * State compartido en window para compat con el resto del CRM:
 *   - window.FAVS[]        → ids de inmuebles favoritos
 *   - window._favFilterActive → boolean
 *
 * Expuesto en window para onclick inline en cards (load.js).
 */

import { getSupabaseClient } from '../../config/supabase.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const findInm = (id) => (window.D || []).find((p) => p.id === id);

/**
 * Toggle de favorito. Si no hay sesión → prompt de auth.
 * Actualiza window.FAVS[] y refresca la UI relevante.
 */
export async function toggleFavorito(inmId) {
  const u = U();

  if (!u) {
    window._pendingFavoriteId = inmId;
    if (typeof window.showAuthPrompt === 'function') {
      window.showAuthPrompt('favorito', {
        icono: '❤️',
        titulo: 'Guarda tus favoritos',
        mensaje: 'Crea tu cuenta gratis para guardar inmuebles y verlos cuando quieras. Solo toma 30 segundos.',
        beneficios: [
          '❤️ Guarda inmuebles que te gustan',
          '🔔 Te avisamos si baja de precio',
          '📱 Accede desde cualquier dispositivo',
        ],
        cta: 'Crear cuenta gratis',
        ctaSecundario: 'Ahora no',
      });
    }
    return;
  }

  try {
    const { data: existing } = await SB()
      .from('favoritos')
      .select('id')
      .eq('usuario_id', u.id)
      .eq('inmueble_id', inmId)
      .single();

    const inmObj = findInm(inmId);
    const trackPayload = {
      inmueble_id: inmId,
      ciudad: inmObj?.ciudad,
      barrio: inmObj?.barrio,
      tipo_inmueble: inmObj?.tipo,
      negociacion: inmObj?.negociacion,
      precio: inmObj?.precio_venta || inmObj?.precio_arriendo,
      habitaciones: inmObj?.habitaciones,
    };

    if (existing) {
      await SB().from('favoritos').delete().eq('id', existing.id);
      if (window.toast) window.toast('💔 Eliminado de favoritos');
      if (window.trackEvent) window.trackEvent('favorito_remove', trackPayload);
    } else {
      await SB().from('favoritos').insert({ usuario_id: u.id, inmueble_id: inmId });
      if (window.toast) window.toast('❤️ Guardado en favoritos');
      if (window.trackEvent) window.trackEvent('favorito_add', trackPayload);

      // Si era sugerencia, marcar como convertida (best-effort)
      SB()
        .from('sugerencias_enviadas')
        .update({ resultado: 'convertida', convertida_at: new Date().toISOString() })
        .eq('usuario_id', u.id)
        .eq('inmueble_id', inmId)
        .neq('resultado', 'convertida')
        .then(
          () => {},
          (e) => console.warn('[sug conv fav]', e)
        );
    }

    // Actualiza window.FAVS
    if (existing) {
      window.FAVS = (window.FAVS || []).filter((id) => id !== inmId);
    } else {
      window.FAVS = [...(window.FAVS || []), inmId];
    }

    // Refresh UI relevante
    if (typeof window.rFavoritos === 'function' && location.hash === '#/favoritos') {
      window.rFavoritos();
    }
    if (typeof window.render === 'function') {
      window.render(window.D || []);
    }
  } catch (e) {
    console.error('[toggleFavorito]', e);
  }
}

/**
 * Filtro "solo favoritos" en la vista inventario.
 * Toggle: activa filtra window.D por FAVS[], desactiva vuelve a doSearch.
 */
export function toggleFavFilter() {
  window._favFilterActive = !window._favFilterActive;

  const btn = document.getElementById('myToggle');
  if (btn) {
    btn.style.background = window._favFilterActive
      ? '#e11d73'
      : 'linear-gradient(135deg,#fdf2f8,#fce7f3)';
    btn.style.color = window._favFilterActive ? '#fff' : '#be185d';
  }

  const D = window.D || [];
  const favs = window.FAVS || [];

  if (window._favFilterActive && favs.length) {
    if (typeof window.render === 'function') {
      window.render(D.filter((p) => favs.includes(p.id)));
    }
  } else {
    window._favFilterActive = false;
    if (typeof window.doSearch === 'function') window.doSearch();
    else if (typeof window.render === 'function') window.render(D);
  }
}

// Inicialización del state global (mantiene compat con código existente
// que lee window._favFilterActive / window.FAVS directamente)
if (typeof window !== 'undefined') {
  if (typeof window._favFilterActive === 'undefined') {
    window._favFilterActive = false;
  }
  window.toggleFavorito = toggleFavorito;
  window.toggleFavFilter = toggleFavFilter;
}
