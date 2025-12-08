import { useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type TipoNotificacion = 'like' | 'guardado' | 'calificacion' | 'comentario' | 'moderacion';

interface INotificacion {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  receta_id: string | null;
  usuario_actor_id: string | null;
  metadata: {
    receta_id?: string;
    receta_nombre?: string;
    usuario_origen?: string;
    calificacion?: number;
    accion_moderacion?: string;
  } | null;
  created_at: string;
}

const ICONOS_TIPO: Record<TipoNotificacion, string> = {
  like: '❤️',
  guardado: '🔖',
  calificacion: '⭐',
  comentario: '💬',
  moderacion: '⚠️',
};

const TITULOS_TIPO: Record<TipoNotificacion, string> = {
  like: 'Nuevo like',
  guardado: 'Receta guardada',
  calificacion: 'Nueva calificación',
  comentario: 'Nuevo comentario',
  moderacion: 'Aviso de moderación',
};

export function CentroNotificaciones() {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<INotificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacion | 'todas'>('todas');

  useEffect(() => {
    if (user && open) {
      console.log('[Notificaciones] Cargando para usuario:', user.id);
      cargarNotificaciones();
      
      // Suscripción a tiempo real
      const channel = supabase
        .channel('notificaciones-cambios')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `usuario_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[Notificaciones] Cambio detectado:', payload);
            cargarNotificaciones();
          }
        )
        .subscribe((status) => {
          console.log('[Notificaciones] Estado del canal realtime:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, open]);

  const cargarNotificaciones = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = (supabase as any)
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filtroTipo !== 'todas') {
        query = query.eq('tipo', filtroTipo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Notificaciones] Error en query:', error);
        throw error;
      }
      
      console.log('[Notificaciones] Datos recibidos:', data?.length || 0, 'notificaciones');
      setNotificaciones(data || []);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificacionId);

      if (error) throw error;

      setNotificaciones(prev =>
        prev.map(n => (n.id === notificacionId ? { ...n, leida: true } : n))
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo marcar como leída',
        variant: 'destructive',
      });
    }
  };

  const marcarTodasComoLeidas = async () => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (error) throw error;

      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));

      toast({
        title: 'Notificaciones marcadas',
        description: 'Todas las notificaciones se marcaron como leídas',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron marcar las notificaciones',
        variant: 'destructive',
      });
    }
  };

  const getTitulo = (notificacion: INotificacion): string => {
    // Para moderación, usar el metadata si existe
    if (notificacion.tipo === 'moderacion' && notificacion.metadata?.accion_moderacion) {
      const accion = notificacion.metadata.accion_moderacion;
      if (accion === 'eliminar') return '⚠️ Tu receta fue eliminada';
      if (accion === 'hacer_privada') return '🔒 Tu receta fue restringida';
      if (accion === 'solicitar_cambios') return '✏️ Se requieren cambios';
    }
    return TITULOS_TIPO[notificacion.tipo] || 'Notificación';
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const notificacionesFiltradas =
    filtroTipo === 'todas'
      ? notificaciones
      : notificaciones.filter(n => n.tipo === filtroTipo);

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {noLeidas > 9 ? '9+' : noLeidas}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-96 sm:max-w-96">
        <SheetHeader>
          <SheetTitle>Notificaciones</SheetTitle>
          <SheetDescription>
            {noLeidas > 0
              ? `Tienes ${noLeidas} notificación${noLeidas > 1 ? 'es' : ''} sin leer`
              : 'No tienes notificaciones sin leer'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filtroTipo === 'todas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('todas')}
            >
              Todas
            </Button>
            {(['like', 'guardado', 'calificacion', 'comentario', 'moderacion'] as TipoNotificacion[]).map(
              (tipo) => (
                <Button
                  key={tipo}
                  variant={filtroTipo === tipo ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroTipo(tipo)}
                >
                  {ICONOS_TIPO[tipo]}
                </Button>
              )
            )}
          </div>

          {/* Acción marcar todas como leídas */}
          {noLeidas > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={marcarTodasComoLeidas}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}

          {/* Lista de notificaciones */}
          <ScrollArea className="h-[calc(100vh-250px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : notificacionesFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificacionesFiltradas.map((notificacion) => (
                  <Card
                    key={notificacion.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      !notificacion.leida 
                        ? notificacion.tipo === 'moderacion'
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-primary/5 border-primary/20' 
                        : ''
                    }`}
                    onClick={() => !notificacion.leida && marcarComoLeida(notificacion.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {ICONOS_TIPO[notificacion.tipo]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm line-clamp-1">
                            {getTitulo(notificacion)}
                          </p>
                          {!notificacion.leida && (
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 mt-1 ${
                              notificacion.tipo === 'moderacion' ? 'bg-destructive' : 'bg-primary'
                            }`} />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                          {notificacion.mensaje}
                        </p>
                        {notificacion.metadata?.receta_nombre && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Receta: {notificacion.metadata.receta_nombre}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notificacion.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
