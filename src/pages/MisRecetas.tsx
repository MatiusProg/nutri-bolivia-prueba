import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Plus, Edit, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { RecetaCardImagen } from '@/components/recetas/RecetaCardImagen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { toast } from '@/hooks/use-toast';
import { EditarRecetaModal } from '@/components/recetas/EditarRecetaModal';
import { IReceta, LIMITE_RECETAS_PRIVADAS } from '@/types/receta.types';
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

export default function MisRecetas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState<IReceta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [changingVisibility, setChangingVisibility] = useState<string | null>(null);
  const [recetaEditando, setRecetaEditando] = useState<IReceta | null>(null);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);

  const recetasPrivadas = recetas.filter(r => r.visibilidad === 'privada').length;
  const limiteAlcanzado = recetasPrivadas >= LIMITE_RECETAS_PRIVADAS;

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadRecetas();
  }, [user, navigate]);

  const loadRecetas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('recetas')
        .select('*')
        .eq('usuario_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecetas(data || []);
    } catch (error) {
      console.error('Error cargando recetas:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las recetas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await (supabase as any)
        .from('recetas')
        .delete()
        .eq('id', deleteId)
        .eq('usuario_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Receta eliminada',
        description: 'La receta ha sido eliminada exitosamente',
      });

      setRecetas(recetas.filter(r => r.id !== deleteId));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la receta',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleVisibility = async (receta: IReceta) => {
    const nuevaVisibilidad = receta.visibilidad === 'privada' ? 'publica' : 'privada';
    
    // Verificar límite antes de cambiar a privada
    if (nuevaVisibilidad === 'privada' && limiteAlcanzado) {
      toast({
        title: 'Límite alcanzado',
        description: `Ya tienes ${LIMITE_RECETAS_PRIVADAS} recetas privadas. Haz pública alguna para liberar espacio.`,
        variant: 'destructive',
      });
      return;
    }

    setChangingVisibility(receta.id);
    try {
      const { error } = await (supabase as any)
        .from('recetas')
        .update({ visibilidad: nuevaVisibilidad })
        .eq('id', receta.id);

      if (error) throw error;

      toast({
        title: 'Visibilidad actualizada',
        description: `Receta ahora es ${nuevaVisibilidad}`,
      });

      setRecetas(recetas.map(r => 
        r.id === receta.id ? { ...r, visibilidad: nuevaVisibilidad } : r
      ));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar la visibilidad',
        variant: 'destructive',
      });
    } finally {
      setChangingVisibility(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-xl">
              <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Mis Recetas
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gestiona tus recetas personalizadas
              </p>
            </div>
          </div>

          <Button onClick={() => navigate('/recetas/nueva')} size="lg" className="w-full sm:w-auto gap-2">
            <Plus className="h-5 w-5" />
            Nueva Receta
          </Button>
        </div>

        {/* Contador de límite */}
        <Card className={`p-4 ${limiteAlcanzado ? 'bg-destructive/10 border-destructive' : 'bg-primary/5 border-primary/20'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`h-5 w-5 ${limiteAlcanzado ? 'text-destructive' : 'text-primary'}`} />
            <div className="flex-1">
              <p className="font-semibold">
                Recetas Privadas: {recetasPrivadas}/{LIMITE_RECETAS_PRIVADAS}
              </p>
              {limiteAlcanzado && (
                <p className="text-sm text-muted-foreground mt-1">
                  Límite alcanzado. Haz pública una receta para crear más privadas.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {recetas.length === 0 ? (
        <Card className="p-12 text-center">
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">Aún no has creado recetas</h3>
          <p className="text-muted-foreground mb-6">
            Comienza a crear recetas nutritivas ahora
          </p>
          <Button onClick={() => navigate('/recetas/nueva')} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear Mi Primera Receta
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recetas.map((receta) => (
            <Card 
              key={receta.id} 
              className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => navigate(`/receta/${receta.id}`)}
            >
              {/* Imagen de la receta */}
              <div className="p-4 pb-0">
                <RecetaCardImagen recetaId={receta.id} />
              </div>

              <div className="p-6 pt-2">
                <div className="flex items-start justify-between mb-4">
                <Badge variant={receta.visibilidad === 'publica' ? 'default' : 'secondary'}>
                  {receta.visibilidad === 'publica' ? '🌐 Pública' : '🔒 Privada'}
                </Badge>
                {receta.visibilidad === 'publica' && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>❤️</span>
                    <span>{receta.contador_likes || 0}</span>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2 line-clamp-2">{receta.nombre}</h3>
              {receta.descripcion && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {receta.descripcion}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Energía</p>
                  <p className="font-semibold">{(receta.nutrientes_totales as any)?.energia_kcal?.toFixed(0) || 0} kcal</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proteínas</p>
                  <p className="font-semibold">{(receta.nutrientes_totales as any)?.proteinas_g?.toFixed(1) || 0}g</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecetaEditando(receta);
                    setModalEdicionAbierto(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(receta);
                  }}
                  disabled={changingVisibility === receta.id}
                >
                  {changingVisibility === receta.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : receta.visibilidad === 'privada' ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(receta.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Edición */}
      <EditarRecetaModal
        receta={recetaEditando}
        open={modalEdicionAbierto}
        onOpenChange={setModalEdicionAbierto}
        onRecetaActualizada={loadRecetas}
        recetasPrivadasCount={recetasPrivadas}
      />
    </div>
  );
}
