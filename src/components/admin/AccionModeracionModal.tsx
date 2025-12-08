import { useState } from 'react';
import { Trash2, EyeOff, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import {
  AccionModeracion,
  ACCIONES_MODERACION,
  TEMPLATES_MENSAJE,
  TITULOS_NOTIFICACION,
  MOTIVOS_REPORTE,
  MotivoReporte,
} from '@/types/reportes.types';

interface ReporteParaAccion {
  id: string;
  receta_id: string;
  motivo: MotivoReporte;
  descripcion: string | null;
  receta?: {
    nombre: string;
    usuario_id: string;
  };
}

interface AccionModeracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporte: ReporteParaAccion | null;
  onAccionCompletada: () => void;
}

const ICONOS_ACCION = {
  eliminar: Trash2,
  hacer_privada: EyeOff,
  solicitar_cambios: MessageSquare,
};

export function AccionModeracionModal({
  open,
  onOpenChange,
  reporte,
  onAccionCompletada,
}: AccionModeracionModalProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [accion, setAccion] = useState<AccionModeracion>('solicitar_cambios');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);

  const recetaNombre = reporte?.receta?.nombre || 'Receta';

  const aplicarTemplate = (template: string) => {
    setMensaje(template.replace('{nombre}', recetaNombre));
  };

  const ejecutarAccion = async () => {
    if (!user || !reporte) return;

    if (!mensaje.trim()) {
      toast({
        title: 'Mensaje requerido',
        description: 'Debes escribir un mensaje para el usuario',
        variant: 'destructive',
      });
      return;
    }

    // Si es eliminar, mostrar confirmación extra
    if (accion === 'eliminar' && !confirmarEliminacion) {
      setConfirmarEliminacion(true);
      return;
    }

    setLoading(true);
    try {
      const usuarioDuenoId = reporte.receta?.usuario_id;

      // 1. Ejecutar acción sobre la receta usando funciones RPC con SECURITY DEFINER
      if (accion === 'eliminar') {
        const { data, error } = await supabase.rpc('admin_eliminar_receta', {
          p_receta_id: reporte.receta_id,
          p_admin_id: user.id,
        });
        if (error) {
          console.error('Error al eliminar:', error);
          throw new Error(error.message || 'No se pudo eliminar la receta. Verifica que tienes permisos de admin.');
        }
      } else if (accion === 'hacer_privada') {
        const { data, error } = await supabase.rpc('admin_hacer_receta_privada', {
          p_receta_id: reporte.receta_id,
          p_moderador_id: user.id,
        });
        if (error) {
          console.error('Error al hacer privada:', error);
          throw new Error(error.message || 'No se pudo hacer privada la receta. Verifica que tienes permisos de moderación.');
        }
      }
      // solicitar_cambios no modifica la receta

      // 2. Enviar notificación al usuario dueño usando RPC con SECURITY DEFINER
      if (usuarioDuenoId) {
        const { data: notifId, error: notifError } = await supabase.rpc('enviar_notificacion_moderacion', {
          p_usuario_destino_id: usuarioDuenoId,
          p_moderador_id: user.id,
          p_tipo: 'moderacion',
          p_mensaje: mensaje,
          p_receta_id: accion === 'eliminar' ? null : reporte.receta_id,
          p_metadata: {
            accion_moderacion: accion,
            receta_nombre: recetaNombre,
            motivo_reporte: reporte.motivo,
          },
        });
        
        if (notifError) {
          console.error('Error enviando notificación:', notifError);
          // Mostrar warning pero no fallar (la acción principal ya se completó)
          toast({
            title: 'Advertencia',
            description: 'La acción se completó pero no se pudo notificar al usuario',
            variant: 'destructive',
          });
        } else {
          console.log('[Moderación] Notificación enviada con ID:', notifId);
        }
      }

      // 3. Marcar reporte como resuelto
      const { error: reporteError } = await supabase
        .from('reportes_recetas')
        .update({
          estado: 'resuelto',
          resuelto_por: user.id,
          resuelto_at: new Date().toISOString(),
          notas_moderacion: `[${ACCIONES_MODERACION[accion].label}] ${mensaje}`,
        })
        .eq('id', reporte.id);

      if (reporteError) throw reporteError;

      toast({
        title: 'Acción completada',
        description: `${ACCIONES_MODERACION[accion].label} - Se notificó al usuario`,
      });

      // Reset y cerrar
      setMensaje('');
      setAccion('solicitar_cambios');
      setConfirmarEliminacion(false);
      onOpenChange(false);
      onAccionCompletada();
    } catch (error: any) {
      console.error('Error ejecutando acción:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo completar la acción',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const accionesDisponibles = Object.entries(ACCIONES_MODERACION).filter(
    ([key, config]) => !config.requiereAdmin || isAdmin
  );

  if (!reporte) return null;

  return (
    <>
      <Dialog open={open && !confirmarEliminacion} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Tomar acción de moderación
            </DialogTitle>
            <DialogDescription>
              Receta: <strong>{recetaNombre}</strong>
              <br />
              Motivo del reporte: {MOTIVOS_REPORTE[reporte.motivo]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Selector de acción */}
            <div className="space-y-3">
              <Label>Seleccionar acción</Label>
              <RadioGroup
                value={accion}
                onValueChange={(value) => setAccion(value as AccionModeracion)}
                className="space-y-2"
              >
                {accionesDisponibles.map(([key, config]) => {
                  const IconComponent = ICONOS_ACCION[key as AccionModeracion];
                  return (
                    <div
                      key={key}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        accion === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setAccion(key as AccionModeracion)}
                    >
                      <RadioGroupItem value={key} id={key} />
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={key} className="cursor-pointer font-medium">
                          {config.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {config.descripcion}
                        </p>
                      </div>
                      {config.requiereAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Solo admin
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Templates rápidos */}
            <div className="space-y-2">
              <Label>Templates rápidos</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES_MENSAJE[accion].map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 whitespace-normal text-left"
                    onClick={() => aplicarTemplate(template)}
                  >
                    {template.replace('{nombre}', recetaNombre).slice(0, 50)}...
                  </Button>
                ))}
              </div>
            </div>

            {/* Mensaje personalizado */}
            <div className="space-y-2">
              <Label htmlFor="mensaje">
                Mensaje para el usuario <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="mensaje"
                placeholder="Escribe el mensaje que recibirá el dueño de la receta..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Este mensaje será enviado como notificación al usuario dueño de la receta.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={ejecutarAccion}
              disabled={loading || !mensaje.trim()}
              variant={accion === 'eliminar' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {ACCIONES_MODERACION[accion].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={confirmarEliminacion} onOpenChange={setConfirmarEliminacion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar receta permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta "{recetaNombre}" será eliminada
              permanentemente y el usuario será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmarEliminacion(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={ejecutarAccion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sí, eliminar receta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
