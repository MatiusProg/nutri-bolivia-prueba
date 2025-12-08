import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Leaf, TrendingUp, Users, BookOpen, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { RecetaCardImagen } from '@/components/recetas/RecetaCardImagen';
import { PromedioEstrellas } from '@/components/recetas/PromedioEstrellas';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface RecetaTrending {
  id: string;
  nombre: string;
  descripcion: string;
  contador_likes: number;
  contador_guardados: number;
  promedio_calificacion: number;
  total_calificaciones: number;
  autor_nombre: string;
  tiempo_preparacion: number;
  autor_avatar?: string;
}

interface Stats {
  totalRecetas: number;
  totalAlimentos: number;
  totalUsuarios: number;
}

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signInWithGoogle } = useAuth();
  const { trackPageView } = useAnalytics();
  const [recetasTrending, setRecetasTrending] = useState<RecetaTrending[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRecetas: 0, totalAlimentos: 0, totalUsuarios: 0 });
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    trackPageView('Home');
    loadTrendingRecetas();
    loadStats();
  }, [trackPageView]);

  const loadTrendingRecetas = async () => {
    try {
      const { data, error } = await supabase
        .from('recetas_comunidad')
        .select('*')
        .eq('visibilidad', 'publica')
        .order('contador_likes', { ascending: false })
        .limit(6);

      if (error) throw error;

      const trending = data?.map(r => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion || '',
        contador_likes: r.contador_likes || 0,
        contador_guardados: r.contador_guardados || 0,
        promedio_calificacion: r.promedio_calificacion || 0,
        total_calificaciones: r.total_calificaciones || 0,
        autor_nombre: (r.perfil as any)?.nombre_completo || 'Usuario',
        tiempo_preparacion: r.tiempo_preparacion || 0,
        autor_avatar: (r.perfil as any)?.avatar_url || null,
      })) || [];

      setRecetasTrending(trending);
    } catch (error) {
      console.error('Error cargando trending:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadStats = async () => {
    try {
      const [recetasRes, alimentosRes, usuariosRes] = await Promise.all([
        supabase.from('recetas').select('id', { count: 'exact', head: true }),
        supabase.from('alimentos').select('id_alimento', { count: 'exact', head: true }),
        supabase.from('perfiles').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalRecetas: recetasRes.count || 0,
        totalAlimentos: alimentosRes.count || 0,
        totalUsuarios: usuariosRes.count || 0,
      });
    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/alimentos?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section Mejorado */}
      <header className="relative overflow-hidden bg-gradient-fresh">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-6 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full animate-scale-in">
              <Leaf className="h-5 w-5 text-white" />
              <span className="text-white font-medium">100% Datos Bolivianos</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Nutrición Boliviana al Alcance de Todos
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Explora {stats.totalAlimentos}+ alimentos bolivianos, crea recetas nutritivas y únete a nuestra comunidad
            </p>

            {/* Search Bar Prominente */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar alimentos: quinua, papa, chuño, ají..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-14 h-16 text-lg bg-white shadow-xl border-2 border-white/20 group-hover:border-white/40 transition-all"
                />
                <Button 
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12"
                  size="lg"
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Stats animadas - responsivas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <BookOpen className="h-5 w-5 sm:h-8 sm:w-8 text-white mx-auto mb-1 sm:mb-2" />
                <p className="text-xl sm:text-4xl font-bold text-white mb-0.5 sm:mb-1">{stats.totalAlimentos}+</p>
                <p className="text-white/80 text-xs sm:text-sm">Alimentos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <ChefHat className="h-5 w-5 sm:h-8 sm:w-8 text-white mx-auto mb-1 sm:mb-2" />
                <p className="text-xl sm:text-4xl font-bold text-white mb-0.5 sm:mb-1">{stats.totalRecetas}+</p>
                <p className="text-white/80 text-xs sm:text-sm">Recetas</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Users className="h-5 w-5 sm:h-8 sm:w-8 text-white mx-auto mb-1 sm:mb-2" />
                <p className="text-xl sm:text-4xl font-bold text-white mb-0.5 sm:mb-1">{stats.totalUsuarios}+</p>
                <p className="text-white/80 text-xs sm:text-sm">Usuarios</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sección Recetas Trending */}
      {recetasTrending.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold">Recetas Populares</h2>
                <p className="text-muted-foreground">Las más amadas de la comunidad</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/comunidad')}
              className="gap-2"
            >
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recetasTrending.map((receta, index) => (
              <Card
                key={receta.id}
                className="p-0 hover:shadow-xl transition-all cursor-pointer overflow-hidden animate-fade-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/receta/${receta.id}`)}
              >
                <div className="p-4 pb-0">
                  <RecetaCardImagen recetaId={receta.id} />
                </div>

                <div className="p-6 pt-2">
                  {/* Autor */}
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={receta.autor_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {receta.autor_nombre?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {receta.autor_nombre}
                    </span>
                    {receta.tiempo_preparacion > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {receta.tiempo_preparacion} min
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {receta.nombre}
                  </h3>

                  {receta.descripcion && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {receta.descripcion}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <PromedioEstrellas
                      promedio={receta.promedio_calificacion}
                      totalCalificaciones={receta.total_calificaciones}
                      tamaño="sm"
                      mostrarTexto={false}
                    />
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        ❤️ {receta.contador_likes}
                      </span>
                      <span className="flex items-center gap-1">
                        🔖 {receta.contador_guardados}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Sección Cómo Funciona */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Cómo Funciona?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tres pasos simples para comenzar tu viaje nutricional
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold z-10">
              1
            </div>
            <Card className="pt-8 pb-6 px-6 text-center h-full hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Explora Alimentos</h3>
              <p className="text-muted-foreground">
                Busca entre más de {stats.totalAlimentos} alimentos bolivianos con información nutricional completa
              </p>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold z-10">
              2
            </div>
            <Card className="pt-8 pb-6 px-6 text-center h-full hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Crea Recetas</h3>
              <p className="text-muted-foreground">
                Combina ingredientes y calcula automáticamente los valores nutricionales totales
              </p>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold z-10">
              3
            </div>
            <Card className="pt-8 pb-6 px-6 text-center h-full hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Comparte</h3>
              <p className="text-muted-foreground">
                Publica tus recetas y descubre creaciones de {stats.totalUsuarios}+ usuarios
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Detalladas */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 hover:shadow-xl transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Base de Datos Completa</h3>
                <p className="text-muted-foreground mb-4">
                  Accede a información nutricional detallada de alimentos tradicionales bolivianos. 
                  Desde la quinua hasta el chuño, conoce macronutrientes, vitaminas y minerales.
                </p>
                <Button variant="outline" onClick={() => navigate('/alimentos')} className="gap-2">
                  Explorar alimentos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-xl transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Constructor Inteligente</h3>
                <p className="text-muted-foreground mb-4">
                  Crea recetas personalizadas y observa cómo se calculan automáticamente los valores 
                  nutricionales. Perfecto para planificar comidas balanceadas.
                </p>
                <Button variant="outline" onClick={() => navigate('/crear-receta')} className="gap-2">
                  Crear receta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Final Mejorado */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="bg-gradient-primary rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
          
          <div className="relative z-10">
            <Sparkles className="h-16 w-16 text-white mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {user ? '¡Bienvenido de nuevo!' : '¿Listo para Comenzar?'}
            </h2>
            <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
              {user 
                ? 'Explora nuevas recetas y comparte tus creaciones con la comunidad'
                : `Únete a ${stats.totalUsuarios}+ usuarios y comienza a crear recetas saludables hoy mismo`
              }
            </p>
            {!user ? (
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl h-14 px-8 text-lg"
                onClick={signInWithGoogle}
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-xl"
                  onClick={() => navigate('/crear-receta')}
                >
                  Crear Receta
                  <ChefHat className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => navigate('/comunidad')}
                >
                  Explorar Comunidad
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
