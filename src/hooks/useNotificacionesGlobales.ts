import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/hooks/useAuth';

// Sonido de notificación (base64 encoded small notification sound)
const NOTIFICATION_SOUND = '/notification.mp3';

// 🔇 TEMPORAL: Desactivar sonido de notificaciones
// Cambiar a 'true' para reactivar
const SONIDO_HABILITADO = false;

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
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Función para crear un tono con envelope suave
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Envelope suave para evitar clics
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      // Sonido "ding-dong" agradable con dos tonos armónicos
      playTone(830, now, 0.15);          // Mi5 - "ding"
      playTone(1046, now + 0.12, 0.2);   // Do6 - "dong"
      
      console.log('[Notificaciones] 🔔 Sonido reproducido');
    } catch (error) {
      console.log('[Notificaciones] No se pudo reproducir sonido:', error);
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
        // Solo reproducir si el sonido está habilitado
        if (SONIDO_HABILITADO) {
          reproducirSonido();
        }
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
