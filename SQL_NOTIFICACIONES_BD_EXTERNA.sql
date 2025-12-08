-- ============================================================
-- SQL PARA SISTEMA DE NOTIFICACIONES - BD EXTERNA (cikrrifmawnptypogrdl)
-- Ejecutar este SQL en tu base de datos externa
-- ============================================================

-- 1. Función RPC con SECURITY DEFINER para enviar notificaciones de moderación
-- Permite a admins/moderadores enviar notificaciones a CUALQUIER usuario (bypasa RLS)
CREATE OR REPLACE FUNCTION public.enviar_notificacion_moderacion(
  p_usuario_destino_id UUID,
  p_moderador_id UUID,
  p_tipo TEXT,
  p_mensaje TEXT,
  p_receta_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tiene_permisos BOOLEAN;
  v_notificacion_id UUID;
BEGIN
  -- Verificar que el usuario es admin o moderador
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_moderador_id AND role IN ('admin', 'moderador')
  ) INTO v_tiene_permisos;
  
  IF NOT v_tiene_permisos THEN
    RAISE EXCEPTION 'No tienes permisos de moderación';
  END IF;
  
  -- Insertar notificación (bypasa RLS gracias a SECURITY DEFINER)
  INSERT INTO notificaciones (
    usuario_id, 
    tipo, 
    mensaje, 
    receta_id, 
    usuario_actor_id, 
    metadata, 
    leida
  )
  VALUES (
    p_usuario_destino_id, 
    p_tipo, 
    p_mensaje, 
    p_receta_id,
    p_moderador_id, 
    p_metadata, 
    false
  )
  RETURNING id INTO v_notificacion_id;
  
  RETURN v_notificacion_id;
END;
$$;

-- 2. Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.enviar_notificacion_moderacion(UUID, UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ============================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que funcionó
-- ============================================================
-- SELECT proname FROM pg_proc WHERE proname LIKE '%notificacion%';

-- ============================================================
-- (OPCIONAL) Habilitar Realtime para notificaciones
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
