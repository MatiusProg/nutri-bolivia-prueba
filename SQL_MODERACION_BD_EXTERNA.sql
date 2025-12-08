-- ============================================================
-- SQL PARA EJECUTAR EN TU BASE DE DATOS EXTERNA (cikrrifmawnptypogrdl)
-- Esto habilita las acciones de moderación para admins/moderadores
-- ============================================================

-- 1. Función para eliminar receta (solo admins)
-- ACTUALIZADA: Elimina dependencias antes de la receta
CREATE OR REPLACE FUNCTION public.admin_eliminar_receta(
  p_receta_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_es_admin BOOLEAN;
BEGIN
  -- Verificar que el usuario es admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_admin_id AND role = 'admin'
  ) INTO v_es_admin;
  
  IF NOT v_es_admin THEN
    RAISE EXCEPTION 'No tienes permisos de administrador';
  END IF;
  
  -- ============================================================
  -- ELIMINAR DEPENDENCIAS EN ORDEN (evitar FK constraint)
  -- ============================================================
  
  -- 1. Eliminar interacciones (likes, guardados)
  DELETE FROM recetas_interacciones WHERE receta_id = p_receta_id;
  
  -- 2. Eliminar calificaciones
  DELETE FROM recetas_calificaciones WHERE receta_id = p_receta_id;
  
  -- 3. Eliminar imágenes
  DELETE FROM recetas_imagenes WHERE receta_id = p_receta_id;
  
  -- 4. Eliminar videos
  DELETE FROM recetas_videos WHERE receta_id = p_receta_id;
  
  -- 5. Eliminar reportes asociados
  DELETE FROM reportes_recetas WHERE receta_id = p_receta_id;
  
  -- 6. Notificaciones: solo nullificar referencia (no eliminar para historial)
  UPDATE notificaciones SET receta_id = NULL WHERE receta_id = p_receta_id;
  
  -- 7. Nullificar referencias de recetas duplicadas
  UPDATE recetas SET receta_original_id = NULL WHERE receta_original_id = p_receta_id;
  
  -- ============================================================
  -- AHORA SÍ ELIMINAR LA RECETA
  -- ============================================================
  DELETE FROM recetas WHERE id = p_receta_id;
  
  RETURN TRUE;
END;
$$;

-- 2. Función para hacer receta privada (admins y moderadores)
CREATE OR REPLACE FUNCTION public.admin_hacer_receta_privada(
  p_receta_id UUID,
  p_moderador_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tiene_permisos BOOLEAN;
BEGIN
  -- Verificar que el usuario es admin o moderador
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_moderador_id AND role IN ('admin', 'moderador')
  ) INTO v_tiene_permisos;
  
  IF NOT v_tiene_permisos THEN
    RAISE EXCEPTION 'No tienes permisos de moderación';
  END IF;
  
  -- Cambiar visibilidad a privada
  UPDATE recetas 
  SET visibilidad = 'privada', updated_at = now()
  WHERE id = p_receta_id;
  
  RETURN TRUE;
END;
$$;

-- 3. Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.admin_eliminar_receta(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hacer_receta_privada(UUID, UUID) TO authenticated;

-- ============================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que funcionó
-- ============================================================
-- SELECT proname FROM pg_proc WHERE proname LIKE 'admin_%';
