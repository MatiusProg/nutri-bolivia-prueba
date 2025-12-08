import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Loader2, ChefHat, Clock, Heart, X } from "lucide-react";
import { RecetaCardImagen } from "@/components/recetas/RecetaCardImagen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client-unsafe";
import { toast } from "@/hooks/use-toast";
import { SistemaCalificaciones } from "@/components/recetas/SistemaCalificaciones";
import { IRecetaConPerfil, DIFICULTADES } from "@/types/receta.types";
import { PromedioEstrellas } from "@/components/recetas/PromedioEstrellas";

type RecetaConPromedios = IRecetaConPerfil & {
  promedio_calificacion?: number;
  total_calificaciones?: number;
};

export default function RecetasGuardadas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState<RecetaConPromedios[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadRecetasGuardadas();
    
    // Escuchar eventos de actualización
    const handleRecetasActualizadas = () => {
      console.log("🔄 Evento recetasActualizadas recibido en RecetasGuardadas");
      loadRecetasGuardadas();
    };

    window.addEventListener("recetasActualizadas", handleRecetasActualizadas);
    return () => window.removeEventListener("recetasActualizadas", handleRecetasActualizadas);
  }, [user, navigate]);

  const loadRecetasGuardadas = async () => {
    try {
      if (!user) {
        navigate('/');
        return;
      }
  
      // 1. Obtener IDs de recetas guardadas
      const { data: interacciones, error: interError } = await supabase
        .from('recetas_interacciones')
        .select('receta_id')
        .eq('usuario_id', user.id)
        .eq('tipo', 'guardar');
  
      if (interError) throw interError;
  
      if (!interacciones || interacciones.length === 0) {
        setRecetas([]);
        setLoading(false);
        return;
      }
  
      const recetaIds = interacciones.map((i: any) => i.receta_id);
  
      // 2. Cargar recetas desde comunidad (YA INCLUYE los promedios)
      const { data: recetasData, error: recetasError } = await supabase
        .from('recetas_comunidad')
        .select('*')
        .in('id', recetaIds)
        .order('created_at', { ascending: false });
  
      if (recetasError) throw recetasError;
  
      // 3. DEBUG: Ver datos de la vista
      recetasData?.forEach(receta => {
        console.log('🔍 Receta guardada - datos vista:', {
          nombre: receta.nombre,
          promedio: receta.promedio_calificacion,
          total: receta.total_calificaciones
        });
      });
  
      // 4. Adaptar datos (USAR objeto perfil de la vista)
      const recetasAdaptadas = recetasData?.map((receta: any) => ({
        ...receta,
        perfil: receta.perfil || {
          nombre_completo: 'Usuario',
          avatar_url: '',
          email: ''
        },
        // ✅ USAR DIRECTAMENTE las columnas de la vista
        promedio_calificacion: receta.promedio_calificacion || 0,
        total_calificaciones: receta.total_calificaciones || 0,
        contador_likes: receta.contador_likes || 0,
        contador_guardados: receta.contador_guardados || 0
      })) || [];
  
      console.log('📊 Recetas guardadas con promedios:', recetasAdaptadas);
      setRecetas(recetasAdaptadas);
  
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las recetas guardadas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (recetaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setRemovingId(recetaId);
    try {
      const { error } = await supabase
        .from("recetas_interacciones")
        .delete()
        .eq("receta_id", recetaId)
        .eq("usuario_id", user.id)
        .eq("tipo", "guardar");

      if (error) throw error;

      toast({
        title: "Receta eliminada",
        description: "La receta se quitó de tus guardados",
      });

      setRecetas(recetas.filter((r) => r.id !== recetaId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Bookmark className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Recetas Guardadas</h1>
            <p className="text-muted-foreground mt-1">
              {recetas.length} {recetas.length === 1 ? "receta guardada" : "recetas guardadas"}
            </p>
          </div>
        </div>
      </div>

      {recetas.length === 0 ? (
        <Card className="p-12 text-center">
          <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No tienes recetas guardadas</h3>
          <p className="text-muted-foreground mb-6">Explora la comunidad y guarda tus recetas favoritas</p>
          <Button onClick={() => navigate("/comunidad")} className="gap-2">
            <ChefHat className="h-4 w-4" />
            Explorar Comunidad
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recetas.map((receta) => (
            <Card
              key={receta.id}
              className="p-0 hover:shadow-lg transition-all flex flex-col cursor-pointer overflow-hidden relative"
              onClick={() => navigate(`/receta/${receta.id}`)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                onClick={(e) => handleRemove(receta.id, e)}
                disabled={removingId === receta.id}
              >
                {removingId === receta.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>

              {/* Imagen de la receta */}
              <div className="p-4 pb-0">
                <RecetaCardImagen recetaId={receta.id} />
              </div>

              <div className="p-6 pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={receta.perfil?.avatar_url || undefined} />
                    <AvatarFallback>{receta.perfil?.nombre_completo?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {receta.perfil?.nombre_completo || receta.perfil?.email || "Usuario"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {receta.dificultad && (
                        <Badge variant="outline" className="text-xs">
                          {DIFICULTADES[receta.dificultad]}
                        </Badge>
                      )}
                      {receta.tiempo_preparacion && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {receta.tiempo_preparacion} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 line-clamp-2">{receta.nombre}</h3>
                {receta.descripcion && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{receta.descripcion}</p>
                )}

                <div className="mb-3">
                  <PromedioEstrellas
                    promedio={receta.promedio_calificacion || 0}
                    totalCalificaciones={receta.total_calificaciones || 0}
                    tamaño="sm"
                    mostrarTexto={true}
                  />
                </div>

                <div className="flex gap-2 mt-auto">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{receta.contador_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Bookmark className="h-4 w-4 fill-current" />
                    <span>{receta.contador_guardados || 0}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
