import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Plus, Trash2, Calculator, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client-unsafe';

import { toast } from '@/hooks/use-toast';
import { ImagenUpload } from '@/components/recetas/ImagenUpload';
import { VideoInput } from '@/components/recetas/VideoInput';

type Alimento = any; // Will be updated when Supabase types regenerate
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface RecipeIngredient {
  alimento: Alimento;
  cantidad_g: number;
}

export default function RecipeBuilder() {
  const { user, signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  
  // Estados para multimedia (almacenar la info para guardar después)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [imagenStoragePath, setImagenStoragePath] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any>(null);
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchAlimentos = async (query: string) => {
    if (!query || query.length < 2) {
      setAlimentos([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('alimentos')
        .select('*')
        .ilike('nombre_alimento', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setAlimentos(data || []);
    } catch (error) {
      console.error('Error buscando alimentos:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addIngredient = (alimento: Alimento) => {
    setIngredients([...ingredients, { alimento, cantidad_g: 100 }]);
    setSearchOpen(false);
    setSearchValue('');
    setAlimentos([]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, cantidad: number) => {
    const updated = [...ingredients];
    updated[index].cantidad_g = cantidad;
    setIngredients(updated);
  };

  const calculateNutrients = () => {
    const totals = {
      energia_kcal: 0,
      proteinas_g: 0,
      grasas_g: 0,
      hidratoscarbonototal_g: 0,
      fibracruda_g: 0,
    };

    ingredients.forEach(({ alimento, cantidad_g }) => {
      const factor = cantidad_g / 100;
      totals.energia_kcal += (alimento.energia_kcal || 0) * factor;
      totals.proteinas_g += (alimento.proteinas_g || 0) * factor;
      totals.grasas_g += (alimento.grasas_g || 0) * factor;
      totals.hidratoscarbonototal_g += (alimento.hidratoscarbonototal_g || 0) * factor;
      totals.fibracruda_g += (alimento.fibracruda_g || 0) * factor;
    });

    return totals;
  };

  const handleSaveRecipe = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (!recipeName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa un nombre para tu receta',
        variant: 'destructive',
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: 'Ingredientes requeridos',
        description: 'Agrega al menos un ingrediente a tu receta',
        variant: 'destructive',
      });
      return;
    }

    // Check private recipe limit
    const { data: existingRecipes } = await (supabase as any)
      .from('recetas')
      .select('visibilidad')
      .eq('usuario_id', user.id);

    const privateCount = existingRecipes?.filter((r: any) => r.visibilidad === 'privada').length || 0;
    
    if (privateCount >= 5) {
      toast({
        title: 'Límite alcanzado',
        description: 'Ya tienes 5 recetas privadas. Haz pública alguna para crear más.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const nutrientes = calculateNutrients();
      const ingredientesData = ingredients.map(({ alimento, cantidad_g }) => {
        const factor = cantidad_g / 100;
        return {
          id_alimento: alimento.id_alimento,
          nombre_alimento: alimento.nombre_alimento,
          cantidad_g,
          nutrientes: {
            energia_kcal: (alimento.energia_kcal || 0) * factor,
            proteinas_g: (alimento.proteinas_g || 0) * factor,
            grasas_g: (alimento.grasas_g || 0) * factor,
            hidratoscarbonototal_g: (alimento.hidratoscarbonototal_g || 0) * factor,
            fibracruda_g: (alimento.fibracruda_g || 0) * factor,
          }
        };
      });

      // Guardar receta y obtener el ID
      const { data: recetaData, error } = await (supabase as any)
        .from('recetas')
        .insert([{
          usuario_id: user.id,
          nombre: recipeName,
          descripcion: description || null,
          ingredientes: ingredientesData as any,
          nutrientes_totales: nutrientes as any,
          visibilidad: 'privada',
        }])
        .select('id')
        .single();

      if (error) throw error;

      // Guardar imagen en Cloud si existe
      if (recetaData?.id && imagenUrl && imagenStoragePath) {
        const { error: imagenError } = await (supabase as any)
          .from('recetas_imagenes')
          .insert({
            receta_id: recetaData.id,
            imagen_url: imagenUrl,
            storage_path: imagenStoragePath,
            usuario_id: user.id,
            es_principal: true,
          });

        if (imagenError) console.error('Error guardando imagen:', imagenError);
      }

      // Guardar video si existe
      if (recetaData?.id && videoData) {
        const { error: videoError } = await (supabase as any)
          .from('recetas_videos')
          .insert({
            receta_id: recetaData.id,
            video_id: videoData.videoId,
            video_url: videoData.videoUrlNormalizada,
            video_url_normalizada: videoData.videoUrlNormalizada,
            embed_url: videoData.embedUrl,
            plataforma: videoData.plataforma,
            usuario_id: user.id,
          });

        if (videoError) console.error('Error guardando video:', videoError);
      }

      toast({
        title: '¡Receta guardada!',
        description: 'Tu receta ha sido guardada exitosamente',
      });

      navigate('/mis-recetas');
    } catch (error: any) {
      console.error('Error al guardar receta:', error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudo guardar la receta',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const nutrients = calculateNutrients();
  const totalWeight = ingredients.reduce((sum, ing) => sum + ing.cantidad_g, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Crear Nueva Receta
            </h1>
            <p className="text-muted-foreground mt-1">
              Añade ingredientes y calcula el valor nutricional
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Recipe Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipe Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Información de la Receta</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nombre de la Receta *
                </label>
                <Input
                  placeholder="Ej: Sopa de Quinua con Verduras"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Descripción (opcional)
                </label>
                <Textarea
                  placeholder="Describe tu receta..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Multimedia Section */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Multimedia (Opcional)</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Imagen de la receta
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Añade una imagen atractiva de tu receta para compartirla con la comunidad
                </p>
                <ImagenUpload
                  imagenActual={imagenUrl}
                  onImagenCargada={(url, storagePath) => {
                    setImagenUrl(url);
                    setImagenStoragePath(storagePath);
                  }}
                  onImagenEliminada={() => {
                    setImagenUrl(null);
                    setImagenStoragePath(null);
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Video de TikTok o YouTube
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Comparte el video de preparación de tu receta
                </p>
                <VideoInput
                  videoActual={videoData}
                  onVideoValidado={(data) => setVideoData(data)}
                  onVideoEliminado={() => setVideoData(null)}
                />
              </div>
            </div>
          </Card>

          {/* Ingredients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ingredientes</h2>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Ingrediente
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar alimento..."
                      value={searchValue}
                      onValueChange={(value) => {
                        setSearchValue(value);
                        searchAlimentos(value);
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchLoading ? 'Buscando...' : 'No se encontraron alimentos'}
                      </CommandEmpty>
                      <CommandGroup>
                        {alimentos.map((alimento) => (
                          <CommandItem
                            key={alimento.id_alimento}
                            onSelect={() => addIngredient(alimento)}
                            className="cursor-pointer"
                          >
                            <div>
                              <p className="font-medium">{alimento.nombre_alimento}</p>
                              <p className="text-xs text-muted-foreground">
                                {alimento.grupo_alimenticio}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay ingredientes aún</p>
                <p className="text-sm">Agrega ingredientes para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ingredient.alimento.nombre_alimento}</p>
                      <p className="text-xs text-muted-foreground">
                        {ingredient.alimento.energia_kcal?.toFixed(0)} kcal/100g
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={ingredient.cantidad_g}
                        onChange={(e) => updateQuantity(index, Number(e.target.value))}
                        className="w-24 text-center"
                        min="1"
                      />
                      <span className="text-sm text-muted-foreground">g</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Nutrition Summary */}
        <div className="space-y-6">
          {/* Nutrition Card */}
          <Card className="p-6 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Información Nutricional</h2>
            </div>

            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Agrega ingredientes para ver el cálculo nutricional
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Peso Total</p>
                  <p className="text-2xl font-bold">{totalWeight}g</p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Energía</span>
                    <Badge variant="secondary" className="text-base">
                      {nutrients.energia_kcal.toFixed(0)} kcal
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Proteínas</span>
                    <span className="font-semibold">{nutrients.proteinas_g.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Carbohidratos</span>
                    <span className="font-semibold">
                      {nutrients.hidratoscarbonototal_g.toFixed(1)}g
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grasas</span>
                    <span className="font-semibold">{nutrients.grasas_g.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fibra</span>
                    <span className="font-semibold">
                      {nutrients.fibracruda_g.toFixed(1)}g
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button
                    onClick={handleSaveRecipe}
                    disabled={saving || !recipeName.trim()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : user ? (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar Receta
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Crear Cuenta para Guardar
                      </>
                    )}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      Necesitas una cuenta gratuita para guardar recetas
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar tu Receta</DialogTitle>
            <DialogDescription>
              Crea una cuenta gratis para guardar tus recetas y acceder a ellas desde cualquier
              dispositivo
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Tu receta está lista:</h4>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>{recipeName || 'Sin nombre'}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {ingredients.length} ingredientes • {nutrients.energia_kcal.toFixed(0)} kcal
              </p>
            </div>
            <div className="space-y-3">
              <Button onClick={signInWithGoogle} className="w-full" size="lg">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Crear Cuenta con Google
              </Button>

              <Button onClick={signInWithFacebook} variant="outline" className="w-full" size="lg">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Crear Cuenta con Facebook
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
              Continuar sin Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
