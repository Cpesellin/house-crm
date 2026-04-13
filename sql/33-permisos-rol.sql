-- =====================================================================
-- House CRM — Configuración de permisos por rol
-- =====================================================================
-- Cada fila = un permiso específico + su estado por rol
-- El admin puede activar/desactivar cualquier permiso desde la UI
-- =====================================================================

CREATE TABLE IF NOT EXISTS permisos_rol (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  admin BOOLEAN NOT NULL DEFAULT TRUE,
  oficina BOOLEAN NOT NULL DEFAULT FALSE,
  gestor BOOLEAN NOT NULL DEFAULT FALSE,
  asesor BOOLEAN NOT NULL DEFAULT FALSE,
  publico BOOLEAN NOT NULL DEFAULT FALSE,
  es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permisos_rol ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_permisos_rol" ON permisos_rol;
CREATE POLICY "open_permisos_rol" ON permisos_rol FOR ALL USING (true) WITH CHECK (true);

-- Seed: permisos iniciales basados en la matriz verificada
INSERT INTO permisos_rol (codigo, categoria, nombre, descripcion, admin, oficina, gestor, asesor, publico, es_sistema) VALUES
-- VER INMUEBLES
('ver_inventario',        'ver_inmuebles', 'Ver inventario completo',          'Ver todos los inmuebles del portafolio', true, true, true, true, true, true),
('ver_desc_publica',      'ver_inmuebles', 'Ver descripción pública',          'Descripción creada para el público', true, true, true, true, true, true),
('ver_desc_privada',      'ver_inmuebles', 'Ver descripción privada',          'Notas internas del inmueble', true, true, true, true, false, false),
('ver_direccion_real',    'ver_inmuebles', 'Ver dirección real',               'Dirección exacta del inmueble', true, true, true, false, false, false),
('ver_datos_propietario', 'ver_inmuebles', 'Ver datos del propietario',        'Nombre, teléfono y email del propietario', true, true, true, false, false, false),
('ver_observaciones',     'ver_inmuebles', 'Ver observaciones internas',       'Notas internas del equipo', true, true, true, true, false, false),
('ver_portales_urls',     'ver_inmuebles', 'Ver URLs Metrocuadrado/FincaRaíz', 'Links a portales inmobiliarios', true, true, true, true, false, false),
-- EDITAR INMUEBLES
('editar_todos',          'editar_inmuebles', 'Editar todos los inmuebles',    'Puede editar cualquier inmueble sin importar captador', true, true, false, false, false, false),
('editar_arriendos',      'editar_inmuebles', 'Editar arriendos de otros',     'Puede editar inmuebles de arriendo de otros asesores', true, true, true, false, false, false),
('editar_propios',        'editar_inmuebles', 'Editar inmuebles propios',      'Puede editar solo los inmuebles donde es captador', true, true, true, true, false, false),
('reasignar_captador',    'editar_inmuebles', 'Reasignar captador',            'Cambiar el asesor asignado a un inmueble', true, true, false, false, false, false),
('eliminar_inmueble',     'editar_inmuebles', 'Eliminar inmueble',             'Enviar inmueble a papelera', true, false, false, false, false, false),
('eliminar_arriendo',     'editar_inmuebles', 'Eliminar inmueble de arriendo', 'Gestor puede eliminar arriendos con motivo', true, false, true, false, false, false),
-- PUBLICAR
('publicar_directo',      'publicar', 'Publicar directo (sin revisión)',       'Inmueble pasa directo a Disponible', true, true, true, true, false, false),
('publicar_revision',     'publicar', 'Publicar con revisión',                 'Inmueble queda pendiente de aprobación (máx 3)', false, false, false, false, true, false),
-- MODERACIÓN
('notif_publicacion_ext', 'moderacion', 'Recibir notificación publicación',   'Recibe alerta cuando un público publica inmueble', true, false, false, false, false, false),
('aprobar_publicacion',   'moderacion', 'Aprobar/Rechazar publicaciones',      'Moderar inmuebles de usuarios públicos', true, false, false, false, false, false),
('calificar_intereses',   'moderacion', 'Calificar intereses compradores',     'Evaluar y calificar compradores interesados', true, false, false, false, false, false),
-- PIPELINE
('ver_pipeline_todos',    'pipeline', 'Ver pipeline de todos',                 'Ve todos los inmuebles en el embudo', true, true, false, false, false, false),
('ver_pipeline_propios',  'pipeline', 'Ver pipeline propio',                   'Ve solo sus inmuebles en el embudo', true, true, true, true, false, false),
('tab_arriendos_otros',   'pipeline', 'Tab Arriendos de otros',                'Ver arriendos de otros asesores (exclusivo gestor)', true, false, true, false, false, false),
-- AGENDA
('acceder_agenda',        'agenda', 'Acceder a Agenda',                        'Ver y gestionar la agenda de citas', true, true, true, false, false, false),
('programar_citas_todos', 'agenda', 'Programar citas a todos',                 'Agendar citas para cualquier asesor', true, true, false, false, false, false),
('programar_citas_propias','agenda', 'Programar citas propias',                'Agendar sus propias citas', true, true, true, false, false, false),
('ver_mis_citas',         'agenda', 'Ver mis citas (participante)',             'Ver citas donde es comprador o vendedor', true, true, true, true, true, false),
-- SOLICITUDES
('crear_consulta',        'solicitudes', 'Crear consulta disponibilidad',      'Preguntar si un inmueble sigue disponible', true, true, true, true, true, false),
('responder_consultas',   'solicitudes', 'Responder consultas propias',        'Responder cuando preguntan por su inmueble', true, true, true, true, false, false),
-- SECCIONES ADMIN
('centro_comando',        'admin', 'Centro de Comando',                        'Panel de control operativo del admin', true, false, false, false, false, false),
('gestion_usuarios',      'admin', 'Gestión de Usuarios',                      'Administrar usuarios, roles y permisos', true, false, false, false, false, false),
('negocios_admin',        'admin', 'Negocios Admin',                           'Pipeline, citas, pagos y declinados del admin', true, false, false, false, false, false),
('arriendos_admin',       'admin', 'Arriendos Admin',                          'Administrados, buscando inquilino, publicaciones', true, false, false, false, false, false),
('pagos_admin',           'admin', 'Pagos Admin',                              'Gestionar pagos de referidos y comisiones', true, false, false, false, false, false),
('papelera',              'admin', 'Papelera',                                 'Ver y restaurar inmuebles eliminados', true, false, false, false, false, false),
('conciliacion',          'admin', 'Conciliación',                             'Verificación de portales', true, true, false, false, false, false),
-- COMÚN
('alertas',               'comun', 'Alertas / Notificaciones',                 'Recibir alertas del sistema', true, true, true, true, false, false),
('portales',              'comun', 'Portales M²/FR',                           'Gestión de Metrocuadrado y FincaRaíz', true, true, true, true, false, false),
('dashboard',             'comun', 'Dashboard',                                'KPIs y métricas del negocio', true, true, true, true, false, false),
('favoritos',             'comun', 'Favoritos ⭐',                             'Guardar inmuebles favoritos', true, true, true, true, true, false),
('me_interesa',           'comun', 'Me interesa ❤️',                           'Expresar interés formal en un inmueble', false, false, false, false, true, false),
('mis_negocios',          'comun', 'Mis Negocios',                             'Pipeline de negocios del usuario', true, true, true, true, true, false),
('mensajes',              'comun', 'Mensajes',                                 'Canal de comunicación con House', true, true, true, true, true, false),
('referir_arriendo',      'comun', 'Referir arriendo',                         'Programa de referidos', true, true, true, true, true, false),
('mi_perfil',             'comun', 'Mi Perfil',                                'Datos personales y configuración', true, true, true, true, true, true),
-- CONTACTO
('contacto_captador',     'contacto', 'WhatsApp → teléfono captador',         'Ver teléfono real del asesor captador', true, true, true, true, false, false),
('contacto_house',        'contacto', 'WhatsApp → línea HOUSE',               'Contacto siempre a línea central', false, false, false, false, true, true)
ON CONFLICT (codigo) DO NOTHING;
