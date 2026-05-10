-- ============================================================
-- FIXES DE SEGURIDAD - BD EXTERNA (cikrrifmawnptypogrdl)
-- Ejecutar en Supabase SQL Editor del proyecto externo
-- ============================================================

-- ------------------------------------------------------------
-- 1) eventos_analytics: cerrar INSERT público
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Eventos son insertables por cualquiera" ON public.eventos_analytics;

CREATE POLICY "Solo usuarios autenticados insertan eventos propios"
ON public.eventos_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- 2) recetas_imagenes: cerrar INSERT público y exigir ownership
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir inserción pública de imágenes" ON public.recetas_imagenes;
DROP POLICY IF EXISTS "Permitir uploads públicos" ON public.recetas_imagenes;

CREATE POLICY "Usuarios autenticados insertan sus propias imágenes"
ON public.recetas_imagenes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- 3) Storage bucket recetas-imagenes: quitar INSERT público
--    y dejar solo el authenticated con ownership por carpeta
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir uploads públicos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload to recetas-imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to recetas-imagenes" ON storage.objects;

-- (Re)crear policy authenticated con ownership por carpeta = user.id
DROP POLICY IF EXISTS "Usuarios autenticados suben a su carpeta en recetas-imagenes" ON storage.objects;
CREATE POLICY "Usuarios autenticados suben a su carpeta en recetas-imagenes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recetas-imagenes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus archivos en recetas-imagenes" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar sus archivos en recetas-imagenes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recetas-imagenes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus archivos en recetas-imagenes" ON storage.objects;
CREATE POLICY "Usuarios pueden eliminar sus archivos en recetas-imagenes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recetas-imagenes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Lectura pública sigue OK al ser bucket público (servido por CDN).
-- Si NO quieres permitir listing del bucket, restringe SELECT a paths exactos
-- (esto es opcional; afecta listFiles del SDK):
-- DROP POLICY IF EXISTS "Public read recetas-imagenes" ON storage.objects;
-- CREATE POLICY "Public read recetas-imagenes"
-- ON storage.objects FOR SELECT TO public
-- USING (bucket_id = 'recetas-imagenes');

-- ------------------------------------------------------------
-- 4) reportes_recetas: SELECT solo para staff (admin/moderador)
--    Las RPC SECURITY DEFINER ya están bien; esto cierra el read directo.
-- ------------------------------------------------------------
ALTER TABLE public.reportes_recetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo staff puede ver reportes" ON public.reportes_recetas;
CREATE POLICY "Solo staff puede ver reportes"
ON public.reportes_recetas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderador')
  )
);

-- Permitir a usuarios autenticados crear reportes propios
DROP POLICY IF EXISTS "Usuarios crean sus propios reportes" ON public.reportes_recetas;
CREATE POLICY "Usuarios crean sus propios reportes"
ON public.reportes_recetas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_reportador_id);

-- ------------------------------------------------------------
-- 5) Endurecer SECURITY DEFINER funciones: revocar EXECUTE a anon
--    (mantener solo authenticated, ya que validan rol internamente)
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.enviar_notificacion_moderacion(UUID, UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon;

-- Si tienes admin_eliminar_receta y admin_hacer_receta_privada:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_eliminar_receta') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_eliminar_receta(uuid) FROM PUBLIC, anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_hacer_receta_privada') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_hacer_receta_privada(uuid) FROM PUBLIC, anon';
  END IF;
END$$;

-- ============================================================
-- Verificación rápida
-- ============================================================
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename IN ('eventos_analytics','recetas_imagenes','reportes_recetas');
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
