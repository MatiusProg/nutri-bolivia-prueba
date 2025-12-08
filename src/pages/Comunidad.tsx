import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Heart, Bookmark, Loader2, Search, SlidersHorizontal, Clock, ChefHat, Copy } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { RecetaCardImagen } from "@/components/recetas/RecetaCardImagen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client-unsafe";
import { toast } from "@/hooks/use-toast";
import { SistemaCalificaciones } from "@/components/recetas/SistemaCalificaciones";
import {
  IRecetaConPerfil,
  IInteraccionUsuario,
  TDificultad,
  TVisibilidad,
  IIngrediente,
  INutrientesTotales,
  DIFICULTADES,
} from "@/types/receta.types";
import { CopiarRecetaModal } from "@/components/recetas/CopiarRecetaModal";
import { PromedioEstrellas } from "@/components/recetas/PromedioEstrellas";

type RecetaConPromedios = IRecetaConPerfil & {
  promedio_calificacion?: number;
  total_calificaciones?: number;
};

export default function Comunidad() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackPageView, trackRecipeView } = useAnalytics();
  const [recetas, setRecetas] = useState<RecetaConPromedios[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInteractions, setUserInteractions] = useState<Record<string, IInteraccionUsuario>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  //Nuevos imports para copiar receta
  const [copiarModalOpen, setCopiarModalOpen] = useState(false);
  const [recetaACopiar, setRecetaACopiar] = useState<any>(null);

  // Estados de filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroDificultad, setFiltroDificultad] = useState<TDificultad | "todas">("todas");
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "popularidad" | "tiempo">("fecha");

  useEffect(() => {
    trackPageView('Comunidad');
    loadRecetas();
    
    // Escuchar eventos de actualización
    const handleRecetasActualizadas = () => {
      console.log("🔄 Evento recetasActualizadas recibido en Comunidad");
      loadRecetas();
    };

    window.addEventListener("recetasActualizadas", handleRecetasActualizadas);
    return () => window.removeEventListener("recetasActualizadas", handleRecetasActualizadas);
  }, [trackPageView]);

  useEffect(() => {
    if (user) {
      loadUserInteractions();
    }
  }, [user, recetas]);

  const loadRecetas = async () => {
    try {
      console.log("🔄 Cargando recetas desde vista comunidad...");

      // 1. Cargar recetas desde la vista comunidad (YA INCLUYE los promedios)
      const { data, error } = await supabase
        .from("recetas_comunidad")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("📊 Recetas cargadas:", data?.length);

      // 2. DEBUG: Ver los datos que llegan de la vista
      data?.forEach((receta) => {
        console.log("🔍 Datos de vista comunidad:", {
          nombre: receta.nombre,
          promedio_vista: receta.promedio_calificacion,
          total_vista: receta.total_calificaciones,
          tiene_promedio: !!receta.promedio_calificacion,
        });
      });

      // 3. Adaptar datos - USAR DIRECTAMENTE las columnas de la vista
      const recetasAdaptadas =
        data?.map((receta) => ({
          ...receta,
          ingredientes: receta.ingredientes as unknown as IIngrediente[],
          nutrientes_totales: receta.nutrientes_totales as unknown as INutrientesTotales,
          visibilidad: receta.visibilidad as TVisibilidad,
          dificultad: receta.dificultad as TDificultad | null,
          etiquetas: receta.etiquetas as string[] | null,
          es_duplicada: receta.es_duplicada ?? false,
          perfil: receta.perfil as {
            nombre_completo: string;
            avatar_url: string;
            email: string;
          } || {
            nombre_completo: 'Usuario',
            avatar_url: '',
            email: '',
          },
          // ✅ USAR DIRECTAMENTE las columnas que YA EXISTEN en la vista
          promedio_calificacion: receta.promedio_calificacion || 0,
          total_calificaciones: receta.total_calificaciones || 0,
          contador_likes: receta.contador_likes || 0,
          contador_guardados: receta.contador_guardados || 0,
        })) || [];

      console.log("✅ Recetas finales:", recetasAdaptadas);
      setRecetas(recetasAdaptadas);
    } catch (error: any) {
      console.error("❌ Error:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("recetas_interacciones").select("receta_id, tipo").eq("usuario_id", user.id);

      const interactions: Record<string, IInteraccionUsuario> = {};
      data?.forEach((i: any) => {
        if (!interactions[i.receta_id]) interactions[i.receta_id] = { hasLiked: false, hasSaved: false };
        if (i.tipo === "like") interactions[i.receta_id].hasLiked = true;
        if (i.tipo === "guardar") interactions[i.receta_id].hasSaved = true;
      });
      setUserInteractions(interactions);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleLike = async (recetaId: string) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para dar like", variant: "destructive" });
      return;
    }

    const hasLiked = userInteractions[recetaId]?.hasLiked || false;
    setActionLoading({ ...actionLoading, [`like-${recetaId}`]: true });

    try {
      if (hasLiked) {
        await supabase
          .from("recetas_interacciones")
          .delete()
          .eq("receta_id", recetaId)
          .eq("usuario_id", user.id)
          .eq("tipo", "like");
        setUserInteractions({ ...userInteractions, [recetaId]: { ...userInteractions[recetaId], hasLiked: false } });
        setRecetas(
          recetas.map((r) => (r.id === recetaId ? { ...r, contador_likes: Math.max(0, r.contador_likes - 1) } : r)),
        );
      } else {
        await supabase.from("recetas_interacciones").insert({ receta_id: recetaId, usuario_id: user.id, tipo: "like" });
        setUserInteractions({ ...userInteractions, [recetaId]: { ...userInteractions[recetaId], hasLiked: true } });
        setRecetas(recetas.map((r) => (r.id === recetaId ? { ...r, contador_likes: r.contador_likes + 1 } : r)));
      }
      // Recargar interacciones del usuario
      await loadUserInteractions();
      // Recargar recetas para actualizar contadores
      await loadRecetas();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading({ ...actionLoading, [`like-${recetaId}`]: false });
    }
  };

  const handleSave = async (recetaId: string) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para guardar", variant: "destructive" });
      return;
    }

    const hasSaved = userInteractions[recetaId]?.hasSaved || false;
    setActionLoading({ ...actionLoading, [`save-${recetaId}`]: true });

    try {
      if (hasSaved) {
        await supabase
          .from("recetas_interacciones")
          .delete()
          .eq("receta_id", recetaId)
          .eq("usuario_id", user.id)
          .eq("tipo", "guardar");
        setUserInteractions({ ...userInteractions, [recetaId]: { ...userInteractions[recetaId], hasSaved: false } });
        setRecetas(
          recetas.map((r) =>
            r.id === recetaId ? { ...r, contador_guardados: Math.max(0, r.contador_guardados - 1) } : r,
          ),
        );
      } else {
        await supabase
          .from("recetas_interacciones")
          .insert({ receta_id: recetaId, usuario_id: user.id, tipo: "guardar" });
        setUserInteractions({ ...userInteractions, [recetaId]: { ...userInteractions[recetaId], hasSaved: true } });
        setRecetas(
          recetas.map((r) => (r.id === recetaId ? { ...r, contador_guardados: r.contador_guardados + 1 } : r)),
        );
      }
      // Recargar interacciones del usuario
      await loadUserInteractions();
      // Recargar recetas para actualizar contadores
      await loadRecetas();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading({ ...actionLoading, [`save-${recetaId}`]: false });
    }
  };

  const recetasFiltradas = useMemo(() => {
    let resultado = [...recetas];
    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      resultado = resultado.filter(
        (r) => r.nombre.toLowerCase().includes(b) || r.descripcion?.toLowerCase().includes(b),
      );
    }
    if (filtroDificultad !== "todas") resultado = resultado.filter((r) => r.dificultad === filtroDificultad);
    resultado.sort((a, b) => {
      if (ordenarPor === "popularidad")
        return b.contador_likes + b.contador_guardados - (a.contador_likes + a.contador_guardados);
      if (ordenarPor === "tiempo") return (a.tiempo_preparacion || 9999) - (b.tiempo_preparacion || 9999);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return resultado;
  }, [recetas, busqueda, filtroDificultad, ordenarPor]);

  if (loading)
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Comunidad</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Descubre recetas compartidas</p>
          </div>
        </div>

        {/* Filtros responsivos */}
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
          {/* Búsqueda - ancho completo en móvil */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar recetas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Selectores en fila en móvil */}
          <div className="grid grid-cols-2 gap-2 md:contents">
            <Select value={filtroDificultad} onValueChange={(v) => setFiltroDificultad(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Dificultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(DIFICULTADES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fecha">Más recientes</SelectItem>
                <SelectItem value="popularidad">Más populares</SelectItem>
                <SelectItem value="tiempo">Menos tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {recetasFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recetasFiltradas.map((receta) => (
            <Card
              key={receta.id}
              className="p-0 hover:shadow-lg transition-all flex flex-col cursor-pointer overflow-hidden"
              onClick={() => {
                trackRecipeView(receta.id);
                navigate(`/receta/${receta.id}`);
              }}
            >
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
                {/* ✅ NUEVO: Botón Copiar Receta */}
                {user?.id !== receta.usuario_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecetaACopiar(receta);
                      setCopiarModalOpen(true);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant={userInteractions[receta.id]?.hasLiked ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(receta.id);
                  }}
                  disabled={actionLoading[`like-${receta.id}`]}
                >
                  {actionLoading[`like-${receta.id}`] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className={`h-4 w-4 ${userInteractions[receta.id]?.hasLiked ? "fill-current" : ""}`} />
                  )}
                  {receta.contador_likes || 0}
                </Button>
                <Button
                  variant={userInteractions[receta.id]?.hasSaved ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(receta.id);
                  }}
                  disabled={actionLoading[`save-${receta.id}`]}
                >
                  {actionLoading[`save-${receta.id}`] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark className={`h-4 w-4 ${userInteractions[receta.id]?.hasSaved ? "fill-current" : ""}`} />
                  )}
                  {receta.contador_guardados || 0}
                </Button>
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* ✅ NUEVO: Modal de Copiar Receta */}
      {recetaACopiar && (
        <CopiarRecetaModal open={copiarModalOpen} onOpenChange={setCopiarModalOpen} recetaOriginal={recetaACopiar} />
      )}
    </div>
  );
}
