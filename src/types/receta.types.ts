/**
 * Tipos e interfaces centralizadas para el sistema de recetas
 * Siguiendo principios DRY y Type Safety
 */

export interface INutrientesTotales {
  energia_kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  hidratoscarbonototal_g: number | null;
  fibracruda_g?: number | null;
  calcio_mg?: number | null;
  hierro_mg?: number | null;
}

export interface IIngrediente {
  id_alimento: string;
  nombre_alimento: string;
  cantidad_g: number;
  nutrientes?: Partial<INutrientesTotales>;
}

export type TVisibilidad = "privada" | "publica" | "enlace";
export type TDificultad = "facil" | "medio" | "dificil";

export interface IReceta {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion: string | null;
  ingredientes: IIngrediente[];
  nutrientes_totales: INutrientesTotales;
  visibilidad: TVisibilidad;
  es_duplicada: boolean;
  receta_original_id: string | null;
  contador_guardados: number;
  contador_likes: number;
  tiempo_preparacion: number | null;
  dificultad: TDificultad | null;
  etiquetas: string[] | null;
  imagen_url?: string | null;
  video_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IRecetaConPerfil extends IReceta {
  perfil: {
    nombre_completo: string | null;
    avatar_url: string | null;
    email: string;
  };
  promedio_calificacion?: number;
  total_calificaciones?: number;
}

export interface IInteraccionUsuario {
  hasLiked: boolean;
  hasSaved: boolean;
}

export interface IFiltrosRecetas {
  dificultad: TDificultad | "todas";
  tiempoMax: number | null;
  ordenarPor: "fecha" | "popularidad" | "calificacion" | "tiempo";
  busqueda: string;
}

export interface IEstadisticasCalificacion {
  promedio: number;
  total: number;
  distribucion: {
    [key: number]: number; // 1-5 estrellas
  };
}

// Constants
export const LIMITE_RECETAS_PRIVADAS = 5;

export const ETIQUETAS_DISPONIBLES = [
  "vegetariano",
  "vegano",
  "sin-gluten",
  "bajo-carbohidratos",
  "alto-proteinas",
  "rapido",
  "economico",
  "tradicional",
  "saludable",
  "postres",
] as const;

export const DIFICULTADES: Record<TDificultad, string> = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
};
