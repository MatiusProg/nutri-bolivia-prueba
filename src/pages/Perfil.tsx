import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client-unsafe";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/perfil/AvatarUpload";
import { PreferenciasSelector } from "@/components/perfil/PreferenciasSelector";
import {
  BookOpen,
  Eye,
  EyeOff,
  Heart,
  Bookmark,
  Star,
  Loader2,
  Mail,
  User,
  Save,
} from "lucide-react";

interface Perfil {
  nombre_completo: string | null;
  avatar_url: string | null;
  preferencias_dieteticas: string[];
}

interface Stats {
  total_recetas: number;
  recetas_privadas: number;
  recetas_publicas: number;
  total_likes: number;
  total_guardados: number;
  calificaciones_dadas: number;
  promedio_calificaciones: number;
}

export default function Perfil() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>({
    nombre_completo: "",
    avatar_url: null,
    preferencias_dieteticas: [],
  });
  const [stats, setStats] = useState<Stats>({
    total_recetas: 0,
    recetas_privadas: 0,
    recetas_publicas: 0,
    total_likes: 0,
    total_guardados: 0,
    calificaciones_dadas: 0,
    promedio_calificaciones: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadProfile();
    loadStats();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("perfiles")
        .select("nombre_completo, avatar_url, preferencias_dieteticas")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Parsear preferencias si viene como string o JSON
        let preferencias = data.preferencias_dieteticas;
        if (typeof preferencias === "string") {
          try {
            preferencias = JSON.parse(preferencias);
          } catch {
            preferencias = preferencias ? [preferencias] : [];
          }
        }

        setPerfil({
          nombre_completo: data.nombre_completo || "",
          avatar_url: data.avatar_url || null,
          preferencias_dieteticas: Array.isArray(preferencias) ? preferencias : [],
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Cargar estadísticas de recetas
      const { data: recetas } = await (supabase as any)
        .from("recetas")
        .select("id, visibilidad, contador_likes, contador_guardados")
        .eq("usuario_id", user.id);

      if (recetas) {
        const total = recetas.length;
        const publicas = recetas.filter((r: any) => r.visibilidad === "publica").length;
        const privadas = recetas.filter((r: any) => r.visibilidad === "privada").length;
        const likes = recetas.reduce((acc: number, r: any) => acc + (r.contador_likes || 0), 0);
        const guardados = recetas.reduce((acc: number, r: any) => acc + (r.contador_guardados || 0), 0);

        // Cargar calificaciones dadas por el usuario
        const { count: calificacionesDadas } = await (supabase as any)
          .from("calificaciones")
          .select("*", { count: "exact", head: true })
          .eq("usuario_id", user.id);

        // Cargar promedio de calificaciones recibidas
        const recetaIds = recetas.map((r: any) => r.id);
        let promedio = 0;

        if (recetaIds.length > 0) {
          const { data: calificacionesRecibidas } = await (supabase as any)
            .from("calificaciones")
            .select("puntuacion")
            .in("receta_id", recetaIds);

          if (calificacionesRecibidas && calificacionesRecibidas.length > 0) {
            promedio =
              calificacionesRecibidas.reduce((acc: number, c: any) => acc + c.puntuacion, 0) /
              calificacionesRecibidas.length;
          }
        }

        setStats({
          total_recetas: total,
          recetas_privadas: privadas,
          recetas_publicas: publicas,
          total_likes: likes,
          total_guardados: guardados,
          calificaciones_dadas: calificacionesDadas || 0,
          promedio_calificaciones: promedio,
        });
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("perfiles")
        .update({
          nombre_completo: perfil.nombre_completo,
          avatar_url: perfil.avatar_url,
          preferencias_dieteticas: perfil.preferencias_dieteticas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados exitosamente",
      });
    } catch (error: any) {
      console.error("Error guardando perfil:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="w-28 h-28 rounded-full mx-auto md:mx-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-xl">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mi Perfil
            </h1>
            <p className="text-muted-foreground">
              Personaliza tu experiencia en Bolivia Nutrición
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total_recetas}</p>
              <p className="text-xs text-muted-foreground">Recetas Totales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <Eye className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.recetas_publicas}</p>
              <p className="text-xs text-muted-foreground">Públicas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <EyeOff className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.recetas_privadas}/5</p>
              <p className="text-xs text-muted-foreground">Privadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{stats.total_likes}</p>
              <p className="text-xs text-muted-foreground">Likes Recibidos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <Bookmark className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.total_guardados}</p>
              <p className="text-xs text-muted-foreground">Veces Guardado</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-purple-500 fill-purple-500" />
              <p className="text-2xl font-bold">
                {stats.promedio_calificaciones.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Promedio ⭐</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 md:col-span-2">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.calificaciones_dadas}</p>
              <p className="text-xs text-muted-foreground">
                Calificaciones que has dado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar */}
              <div className="flex justify-center md:justify-start">
                <AvatarUpload
                  avatarActual={perfil.avatar_url}
                  onAvatarCargado={(url) =>
                    setPerfil((prev) => ({ ...prev, avatar_url: url }))
                  }
                  onAvatarEliminado={() =>
                    setPerfil((prev) => ({ ...prev, avatar_url: null }))
                  }
                />
              </div>

              {/* Campos */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    placeholder="Tu nombre completo"
                    value={perfil.nombre_completo || ""}
                    onChange={(e) =>
                      setPerfil((prev) => ({
                        ...prev,
                        nombre_completo: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preferencias Dietéticas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Mis Preferencias Dietéticas
              </Label>
              <PreferenciasSelector
                seleccionadas={perfil.preferencias_dieteticas}
                onChange={(preferencias) =>
                  setPerfil((prev) => ({
                    ...prev,
                    preferencias_dieteticas: preferencias,
                  }))
                }
              />
            </div>

            <Separator />

            {/* Botón Guardar */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto gap-2"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
