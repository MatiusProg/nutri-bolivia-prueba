import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/hooks/useAuth';

// Sonido de notificación (base64 encoded small notification sound)
const NOTIFICATION_SOUND = '/notification.mp3';

interface UseNotificacionesGlobalesReturn {
  contadorNoLeidas: number;
  hayNuevas: boolean;
  resetHayNuevas: () => void;
  refetchContador: () => Promise<void>;
}

export function useNotificacionesGlobales(): UseNotificacionesGlobalesReturn {
  const { user } = useAuth();
  const [contadorNoLeidas, setContadorNoLeidas] = useState(0);
  const [hayNuevas, setHayNuevas] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevContadorRef = useRef<number>(0);

  // Inicializar audio element
  useEffect(() => {
    // Crear audio element para notificaciones
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const reproducirSonido = useCallback(() => {
    if (audioRef.current) {
      // Usar un sonido de notificación simple generado
      // En producción podrías usar un archivo mp3 real
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log('[Notificaciones] No se pudo reproducir sonido:', error);
      }
    }
  }, []);

  const fetchContador = useCallback(async () => {
    if (!user) {
      setContadorNoLeidas(0);
      return;
    }

    try {
      const { count, error } = await (supabase as any)
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (error) {
        console.error('[Notificaciones] Error obteniendo contador:', error);
        return;
      }

      const nuevoContador = count || 0;
      
      // Detectar si llegó una nueva notificación
      if (nuevoContador > prevContadorRef.current && prevContadorRef.current > 0) {
        setHayNuevas(true);
        reproducirSonido();
      }
      
      prevContadorRef.current = nuevoContador;
      setContadorNoLeidas(nuevoContador);
    } catch (error) {
      console.error('[Notificaciones] Error en fetchContador:', error);
    }
  }, [user, reproducirSonido]);

  // Cargar contador inicial y configurar suscripción realtime
  useEffect(() => {
    if (!user) {
      setContadorNoLeidas(0);
      prevContadorRef.current = 0;
      return;
    }

    console.log('[NotificacionesGlobales] Inicializando para usuario:', user.id);
    
    // Cargar contador inicial
    fetchContador();

    // Suscripción realtime para cambios en notificaciones
    const channel = supabase
      .channel('notificaciones-globales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[NotificacionesGlobales] Cambio detectado:', payload.eventType);
          fetchContador();
        }
      )
      .subscribe((status) => {
        console.log('[NotificacionesGlobales] Estado del canal:', status);
      });

    return () => {
      console.log('[NotificacionesGlobales] Limpiando suscripción');
      supabase.removeChannel(channel);
    };
  }, [user, fetchContador]);

  const resetHayNuevas = useCallback(() => {
    setHayNuevas(false);
  }, []);

  return {
    contadorNoLeidas,
    hayNuevas,
    resetHayNuevas,
    refetchContador: fetchContador,
  };
}
