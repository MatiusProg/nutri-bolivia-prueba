import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChefHat, User, Heart, Bookmark, Loader2, Edit, Trash2, Flag, Copy } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useRecetaMultimedia } from '@/hooks/useRecetaMultimedia';
import { VideoPreview } from '@/components/recetas/VideoPreview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SistemaCalificaciones } from '@/components/recetas/SistemaCalificaciones';
import { DIFICULTADES } from '@/types/receta.types';
import { CopiarRecetaModal } from '@/components/recetas/CopiarRecetaModal';
import { ReportarRecetaModal } from '@/components/recetas/ReportarRecetaModal';
import { NutrientesExpandibles } from '@/components/recetas/NutrientesExpandibles';

interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  ingredientes: any[];
  nutrientes_totales: any;
  visibilidad: string;
  tiempo_preparacion: number;
  dificultad: string;
  etiquetas: string[];
  usuario_id: string;
  contador_likes: number;
  contador_guardados: number;
  created_at: string;
  perfil?: {
    nombre_completo: string;
    avatar_url: string;
    email: string;
  };
}

interface IngredienteDetallado {
  nombre: string;
  cantidad_g: number;
  alimento?: any;
  nutrientes: {
    energia_kcal: number;
    proteinas_g: number;
    grasas_g: number;
    hidratoscarbonototal_g: number;
    fibracruda_g: number;
  };
}

export default function RecetaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackRecipeView } = useAnalytics();
  const { multimedia, loading: multimediaLoading } = useRecetaMultimedia(id);
  const [receta, setReceta] = useState<Receta | null>(null);
  const [ingredientesDetallados, setIngredientesDetallados] = useState<IngredienteDetallado[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiarModalOpen, setCopiarModalOpen] = useState(false);
  const [reportarModalOpen, setReportarModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      cargarReceta();
      if (user) cargarInteracciones();
      // Track recipe view
      trackRecipeView(id);
    }
  }, [id, user, trackRecipeView]);

  const cargarReceta = async () => {
    try {
      // 1. Obtener receta sin join
      const { data: recetaData, error: recetaError } = await supabase
        .from('recetas')
        .select('*')
        .eq('id', id)
        .single();
  
      if (recetaError) throw recetaError;
      if (!recetaData) {
        toast({ 
          title: 'Receta no encontrada', 
          description: 'La receta que buscas no existe',
          variant: 'destructive' 
        });
        navigate('/comunidad');
        return;
      }
  
      // 2. Obtener perfil por separado
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('nombre_completo, avatar_url, email')
        .eq('id', recetaData.usuario_id)
        .single();
  
    // 3. Combinar datos manualmente
    const recetaCompleta = {
      ...recetaData,
      ingredientes: recetaData.ingredientes as unknown as any[],
      nutrientes_totales: recetaData.nutrientes_totales as unknown as any,
      perfil: perfilData || { 
        nombre_completo: 'Usuario', 
        avatar_url: null, 
        email: null 
      }
    };

    setReceta(recetaCompleta);
    await cargarDetalleIngredientes(recetaData.ingredientes as unknown as any[]);
    } catch (error: any) {
      console.error('Error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'No se pudo cargar la receta', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalleIngredientes = async (ingredientes: any[]) => {
    if (!ingredientes || ingredientes.length === 0) return;

    try {
      // Usar id_alimento (correcto) en lugar de alimento_id
      const ids = ingredientes.map((ing: any) => ing.id_alimento);
      const { data: alimentos } = await supabase
        .from('alimentos')
        .select('*')
        .in('id_alimento', ids);

      const detallados: IngredienteDetallado[] = ingredientes.map((ing: any) => {
        const alimento = alimentos?.find((a: any) => a.id_alimento === ing.id_alimento);
        
        // Si el ingrediente YA tiene nutrientes guardados, usarlos directamente
        const nutrientesGuardados = ing.nutrientes;
        const factor = ing.cantidad_g / 100;

        return {
          nombre: ing.nombre_alimento || alimento?.nombre_alimento || 'Desconocido',
          cantidad_g: ing.cantidad_g,
          alimento,
          nutrientes: nutrientesGuardados || {
            energia_kcal: (alimento?.energia_kcal || 0) * factor,
            proteinas_g: (alimento?.proteinas_g || 0) * factor,
            grasas_g: (alimento?.grasas_g || 0) * factor,
            hidratoscarbonototal_g: (alimento?.hidratoscarbonototal_g || 0) * factor,
            fibracruda_g: (alimento?.fibracruda_g || 0) * factor,
          },
        };
      });

      setIngredientesDetallados(detallados);
    } catch (error) {
      console.error('Error cargando ingredientes:', error);
    }
  };

  const cargarInteracciones = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('recetas_interacciones')
        .select('tipo')
        .eq('receta_id', id)
        .eq('usuario_id', user.id);

      setHasLiked(data?.some((i: any) => i.tipo === 'like') || false);
      setHasSaved(data?.some((i: any) => i.tipo === 'guardar') || false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para dar like', variant: 'destructive' });
      return;
    }
    if (!receta) return;

    setActionLoading('like');
    try {
      if (hasLiked) {
        await supabase.from('recetas_interacciones').delete().eq('receta_id', receta.id).eq('usuario_id', user.id).eq('tipo', 'like');
        setHasLiked(false);
        setReceta({ ...receta, contador_likes: Math.max(0, receta.contador_likes - 1) });
      } else {
        await supabase.from('recetas_interacciones').insert({ receta_id: receta.id, usuario_id: user.id, tipo: 'like' });
        setHasLiked(true);
        setReceta({ ...receta, contador_likes: receta.contador_likes + 1 });
      }
      await cargarInteracciones();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para guardar', variant: 'destructive' });
      return;
    }
    if (!receta) return;

    setActionLoading('save');
    try {
      if (hasSaved) {
        await supabase.from('recetas_interacciones').delete().eq('receta_id', receta.id).eq('usuario_id', user.id).eq('tipo', 'guardar');
        setHasSaved(false);
        setReceta({ ...receta, contador_guardados: Math.max(0, receta.contador_guardados - 1) });
      } else {
        await supabase.from('recetas_interacciones').insert({ receta_id: receta.id, usuario_id: user.id, tipo: 'guardar' });
        setHasSaved(true);
        setReceta({ ...receta, contador_guardados: receta.contador_guardados + 1 });
      }
      await cargarInteracciones();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEliminar = async () => {
    if (!receta || !user) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', receta.id)
        .eq('usuario_id', user.id);

      if (error) throw error;

      toast({
        title: 'Receta eliminada',
        description: 'La receta ha sido eliminada exitosamente',
      });

      navigate('/mis-recetas');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la receta',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!receta) {
    return null;
  }

  const esOwner = user?.id === receta.usuario_id;
  const nutrientes = receta.nutrientes_totales || {};
  const pesoTotal = ingredientesDetallados.reduce((sum, ing) => sum + ing.cantidad_g, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">{receta.nombre}</h1>
            {receta.descripcion && (
              <p className="text-lg text-muted-foreground mb-4">{receta.descripcion}</p>
            )}

            {/* Autor */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={receta.perfil?.avatar_url || undefined} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{receta.perfil?.nombre_completo || receta.perfil?.email || 'Usuario'}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(receta.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 mb-4">
              {receta.dificultad && (
                <Badge variant="outline" className="gap-1">
                  <ChefHat className="h-3 w-3" />
                  {DIFICULTADES[receta.dificultad as keyof typeof DIFICULTADES]}
                </Badge>
              )}
              {receta.tiempo_preparacion && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {receta.tiempo_preparacion} min
                </Badge>
              )}
              {receta.etiquetas?.map((etiqueta: string) => (
                <Badge key={etiqueta} variant="secondary">{etiqueta}</Badge>
              ))}
            </div>
          </div>

          {/* Acciones - grid en móvil, flex en desktop */}
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            {esOwner ? (
              <>
                <Button variant="outline" onClick={() => navigate(`/mis-recetas`)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCopiarModalOpen(true)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copiar</span>
                </Button>
                <Button
                  variant={hasLiked ? 'default' : 'outline'}
                  onClick={handleLike}
                  disabled={actionLoading === 'like'}
                  className="gap-2"
                >
                  {actionLoading === 'like' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />}
                  {receta.contador_likes}
                </Button>
                <Button
                  variant={hasSaved ? 'default' : 'outline'}
                  onClick={handleSave}
                  disabled={actionLoading === 'save'}
                  className="gap-2"
                >
                  {actionLoading === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${hasSaved ? 'fill-current' : ''}`} />}
                  <span className="hidden sm:inline">Guardar</span>
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReportarModalOpen(true)}
                    className="text-muted-foreground hover:text-destructive col-span-2 sm:col-span-1"
                    title="Reportar receta"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sistema de Calificaciones */}
        <Card className="p-6 mb-6">
          <SistemaCalificaciones recetaId={receta.id} tamaño="lg" mostrarEstadisticas={true} readonly={esOwner} />
        </Card>

        {/* Sección Multimedia */}
        {!multimediaLoading && (multimedia.imagen_url || multimedia.video_id) && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Imagen */}
            {multimedia.imagen_url && (
              <Card className="p-0 overflow-hidden">
                <img
                  src={multimedia.imagen_url}
                  alt={receta.nombre}
                  className="w-full h-auto object-cover"
                />
              </Card>
            )}
            
            {/* Video */}
            {multimedia.video_id && multimedia.embed_url && (
              <Card className="p-0 overflow-hidden">
                <VideoPreview
                  embedUrl={multimedia.embed_url}
                  plataforma={(multimedia.plataforma as 'tiktok' | 'youtube') || 'youtube'}
                />
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ingredientes y Desglose Nutricional */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingredientes */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Ingredientes</h2>
            <div className="space-y-2">
              {ingredientesDetallados.map((ing, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{ing.nombre}</span>
                  <span className="text-muted-foreground">{ing.cantidad_g}g</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Peso total: <span className="font-semibold text-foreground">{pesoTotal}g</span>
              </p>
            </div>
          </Card>

          {/* Desglose Nutricional por Ingrediente */}
          <Card className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Desglose Nutricional</h2>
            
            {/* Versión móvil - tarjetas */}
            <div className="block md:hidden space-y-3">
              {ingredientesDetallados.map((ing, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{ing.nombre}</h4>
                    <Badge variant="outline">{ing.cantidad_g}g</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">Energía</p>
                      <p className="font-semibold">{ing.nutrientes.energia_kcal.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">Proteínas</p>
                      <p className="font-semibold">{ing.nutrientes.proteinas_g.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">g</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">Carbos</p>
                      <p className="font-semibold">{ing.nutrientes.hidratoscarbonototal_g.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">g</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">Grasas</p>
                      <p className="font-semibold">{ing.nutrientes.grasas_g.toFixed(1)}g</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">Fibra</p>
                      <p className="font-semibold">{ing.nutrientes.fibracruda_g.toFixed(1)}g</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Versión desktop - tabla */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Energía</TableHead>
                    <TableHead className="text-right">Proteínas</TableHead>
                    <TableHead className="text-right">Grasas</TableHead>
                    <TableHead className="text-right">Carbohidratos</TableHead>
                    <TableHead className="text-right">Fibra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientesDetallados.map((ing, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{ing.nombre}</TableCell>
                      <TableCell className="text-right">{ing.cantidad_g}g</TableCell>
                      <TableCell className="text-right">{ing.nutrientes.energia_kcal.toFixed(0)} kcal</TableCell>
                      <TableCell className="text-right">{ing.nutrientes.proteinas_g.toFixed(1)}g</TableCell>
                      <TableCell className="text-right">{ing.nutrientes.grasas_g.toFixed(1)}g</TableCell>
                      <TableCell className="text-right">{ing.nutrientes.hidratoscarbonototal_g.toFixed(1)}g</TableCell>
                      <TableCell className="text-right">{ing.nutrientes.fibracruda_g.toFixed(1)}g</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Nutrientes Totales */}
        <div className="space-y-6">
          <Card className="p-4 sm:p-6 lg:sticky lg:top-4">
            <h2 className="text-2xl font-bold mb-4">Nutrientes Totales</h2>
            <NutrientesExpandibles 
              nutrientes={nutrientes}
              ingredientesDetallados={ingredientesDetallados}
            />
          </Card>

          {/* Calificaciones */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Calificación</h2>
            <SistemaCalificaciones recetaId={receta.id} readonly={esOwner} />
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta "{receta.nombre}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal de Copiar Receta */}
      {receta && (
        <CopiarRecetaModal
          open={copiarModalOpen}
          onOpenChange={setCopiarModalOpen}
          recetaOriginal={receta}
        />
      )}

      {/* Modal de Reportar Receta */}
      {receta && (
        <ReportarRecetaModal
          open={reportarModalOpen}
          onOpenChange={setReportarModalOpen}
          recetaId={receta.id}
          recetaNombre={receta.nombre}
        />
      )}
    </div>
  );
}
