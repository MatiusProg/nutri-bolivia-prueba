import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Configuración de preferencias con categorías y colores
const PREFERENCIAS_CONFIG = [
  // Dieta (Verde)
  { id: "vegetariano", label: "🥗 Vegetariano", categoria: "dieta" },
  { id: "vegano", label: "🌱 Vegano", categoria: "dieta" },
  { id: "saludable", label: "❤️ Saludable", categoria: "dieta" },
  
  // Restricciones (Amarillo)
  { id: "sin-gluten", label: "🚫 Sin Gluten", categoria: "restriccion" },
  { id: "bajo-carbohidratos", label: "📉 Bajo Carbs", categoria: "restriccion" },
  
  // Objetivos (Azul)
  { id: "alto-proteinas", label: "💪 Alto Proteína", categoria: "objetivo" },
  { id: "rapido", label: "⚡ Rápido", categoria: "objetivo" },
  
  // Estilo (Naranja)
  { id: "economico", label: "💰 Económico", categoria: "estilo" },
  { id: "tradicional", label: "🏛️ Tradicional", categoria: "estilo" },
  { id: "postres", label: "🍰 Postres", categoria: "estilo" },
] as const;

// Mapeo de categorías a clases de Tailwind
const CATEGORIA_STYLES: Record<string, { selected: string; unselected: string }> = {
  dieta: {
    selected: "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300",
    unselected: "bg-green-500/5 border-green-500/30 text-green-600/70 dark:text-green-400/70 hover:bg-green-500/10",
  },
  restriccion: {
    selected: "bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300",
    unselected: "bg-yellow-500/5 border-yellow-500/30 text-yellow-600/70 dark:text-yellow-400/70 hover:bg-yellow-500/10",
  },
  objetivo: {
    selected: "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300",
    unselected: "bg-blue-500/5 border-blue-500/30 text-blue-600/70 dark:text-blue-400/70 hover:bg-blue-500/10",
  },
  estilo: {
    selected: "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300",
    unselected: "bg-orange-500/5 border-orange-500/30 text-orange-600/70 dark:text-orange-400/70 hover:bg-orange-500/10",
  },
};

interface PreferenciasSelectorProps {
  seleccionadas: string[];
  onChange: (preferencias: string[]) => void;
}

export function PreferenciasSelector({
  seleccionadas,
  onChange,
}: PreferenciasSelectorProps) {
  const togglePreferencia = (id: string) => {
    if (seleccionadas.includes(id)) {
      onChange(seleccionadas.filter((p) => p !== id));
    } else {
      onChange([...seleccionadas, id]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selecciona tus preferencias dietéticas para recibir recomendaciones personalizadas
      </p>
      
      <div className="flex flex-wrap gap-2">
        {PREFERENCIAS_CONFIG.map((pref) => {
          const isSelected = seleccionadas.includes(pref.id);
          const styles = CATEGORIA_STYLES[pref.categoria];
          
          return (
            <Badge
              key={pref.id}
              variant="outline"
              onClick={() => togglePreferencia(pref.id)}
              className={cn(
                "cursor-pointer transition-all duration-200 px-3 py-1.5 text-sm font-medium border-2",
                isSelected ? styles.selected : styles.unselected
              )}
            >
              {isSelected && <Check className="h-3 w-3 mr-1" />}
              {pref.label}
            </Badge>
          );
        })}
      </div>
      
      {seleccionadas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {seleccionadas.length} preferencia{seleccionadas.length !== 1 ? "s" : ""} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// Exportar configuración para uso en otros componentes
export { PREFERENCIAS_CONFIG };
