import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface NutrientesExpandiblesProps {
  nutrientes: any;
  ingredientesDetallados: any[];
}

interface NutrienteCompleto {
  nombre: string;
  valor: number | null;
  unidad: string;
  categoria: 'principal' | 'minerales' | 'vitaminas' | 'otros';
}

export function NutrientesExpandibles({ nutrientes, ingredientesDetallados }: NutrientesExpandiblesProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calcular nutrientes completos sumando de todos los ingredientes
  const calcularNutrientesCompletos = (): NutrienteCompleto[] => {
    const nutrientesCompletos: Record<string, NutrienteCompleto> = {};

    // Inicializar con los principales - usar ?? null para distinguir de 0
    nutrientesCompletos['energia_kcal'] = {
      nombre: 'Energía',
      valor: nutrientes.energia_kcal ?? null,
      unidad: 'kcal',
      categoria: 'principal'
    };
    nutrientesCompletos['proteinas_g'] = {
      nombre: 'Proteínas',
      valor: nutrientes.proteinas_g ?? null,
      unidad: 'g',
      categoria: 'principal'
    };
    nutrientesCompletos['hidratoscarbonototal_g'] = {
      nombre: 'Carbohidratos',
      valor: nutrientes.hidratoscarbonototal_g ?? null,
      unidad: 'g',
      categoria: 'principal'
    };
    nutrientesCompletos['grasas_g'] = {
      nombre: 'Grasas',
      valor: nutrientes.grasas_g ?? null,
      unidad: 'g',
      categoria: 'principal'
    };
    nutrientesCompletos['fibracruda_g'] = {
      nombre: 'Fibra',
      valor: nutrientes.fibracruda_g ?? null,
      unidad: 'g',
      categoria: 'principal'
    };

    // Calcular otros nutrientes sumando de los ingredientes
    ingredientesDetallados.forEach((ing) => {
      const alimento = ing.alimento;
      if (!alimento) return;

      const factor = ing.cantidad_g / 100;

      // Minerales
      const minerales = [
        { key: 'calcio_mg', nombre: 'Calcio', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'hierro_mg', nombre: 'Hierro', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'fosforo_mg', nombre: 'Fósforo', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'sodio_mg', nombre: 'Sodio', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'potasio_mg', nombre: 'Potasio', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'zinc_mg', nombre: 'Zinc', unidad: 'mg', categoria: 'minerales' as const },
        { key: 'magnesio_mg', nombre: 'Magnesio', unidad: 'mg', categoria: 'minerales' as const },
      ];

      // Vitaminas
      const vitaminas = [
        { key: 'vitamina_a_ug', nombre: 'Vitamina A', unidad: 'µg', categoria: 'vitaminas' as const },
        { key: 'vitamina_c_mg', nombre: 'Vitamina C', unidad: 'mg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b1_mg', nombre: 'Vitamina B1 (Tiamina)', unidad: 'mg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b2_mg', nombre: 'Vitamina B2 (Riboflavina)', unidad: 'mg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b3_mg', nombre: 'Vitamina B3 (Niacina)', unidad: 'mg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b6_mg', nombre: 'Vitamina B6', unidad: 'mg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b9_ug', nombre: 'Vitamina B9 (Folato)', unidad: 'µg', categoria: 'vitaminas' as const },
        { key: 'vitamina_b12_ug', nombre: 'Vitamina B12', unidad: 'µg', categoria: 'vitaminas' as const },
        { key: 'vitamina_e_mg', nombre: 'Vitamina E', unidad: 'mg', categoria: 'vitaminas' as const },
      ];

      // Otros
      const otros = [
        { key: 'colesterol_mg', nombre: 'Colesterol', unidad: 'mg', categoria: 'otros' as const },
        { key: 'agua_g', nombre: 'Agua', unidad: 'g', categoria: 'otros' as const },
        { key: 'cenizas_g', nombre: 'Cenizas', unidad: 'g', categoria: 'otros' as const },
      ];

      [...minerales, ...vitaminas, ...otros].forEach(({ key, nombre, unidad, categoria }) => {
        const valor = alimento[key];
        // Solo agregar si el valor existe y no es null (0 es válido)
        if (valor !== undefined && valor !== null) {
          if (!nutrientesCompletos[key]) {
            nutrientesCompletos[key] = {
              nombre,
              valor: 0,
              unidad,
              categoria
            };
          }
          nutrientesCompletos[key].valor = (nutrientesCompletos[key].valor || 0) + valor * factor;
        }
      });
    });

    // Filtrar: para secundarios excluir null, para principales mantener
    return Object.values(nutrientesCompletos).filter(n => 
      n.categoria === 'principal' || (n.valor !== null && n.valor !== undefined)
    );
  };

  const todosNutrientes = calcularNutrientesCompletos();
  const principales = todosNutrientes.filter(n => n.categoria === 'principal');
  const secundarios = todosNutrientes.filter(n => n.categoria !== 'principal');
  
  const minerales = secundarios.filter(n => n.categoria === 'minerales');
  const vitaminas = secundarios.filter(n => n.categoria === 'vitaminas');
  const otros = secundarios.filter(n => n.categoria === 'otros');

  // Formatear valor - distinguir null de 0
  const formatearValor = (valor: number | null, unidad: string): string => {
    if (valor === null || valor === undefined) return 'N/D';
    if (unidad === 'kcal') return valor.toFixed(0);
    if (unidad === 'g') return valor.toFixed(1);
    if (unidad === 'mg' || unidad === 'µg') return valor.toFixed(2);
    return valor.toFixed(2);
  };
  
  // Verificar si un valor es numérico válido (incluye 0)
  const esValorValido = (valor: number | null): boolean => {
    return valor !== null && valor !== undefined;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-4">
        {/* Nutrientes principales siempre visibles */}
        <div className="p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Energía Total</p>
          <p className="text-3xl font-bold text-primary">
            {esValorValido(nutrientes.energia_kcal) 
              ? `${formatearValor(nutrientes.energia_kcal, 'kcal')} kcal`
              : 'N/D'}
          </p>
        </div>

        <div className="space-y-3">
          {principales.slice(1).filter(n => esValorValido(n.valor)).map((nutriente) => (
            <div key={nutriente.nombre} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">{nutriente.nombre}</span>
              <span className="text-lg font-semibold">
                {formatearValor(nutriente.valor, nutriente.unidad)}{nutriente.unidad}
              </span>
            </div>
          ))}
        </div>

        {/* Trigger para expandir */}
        {secundarios.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Ocultar todos los nutrientes
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver todos los nutrientes ({secundarios.length} más)
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}

        {/* Contenido expandible */}
        <CollapsibleContent className="space-y-6 animate-accordion-down">
          {/* Minerales */}
          {minerales.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">Minerales</Badge>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <div className="space-y-2">
                {minerales.map((nutriente) => (
                  <div key={nutriente.nombre} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <span className="text-sm">{nutriente.nombre}</span>
                    <span className="text-sm font-semibold">
                      {formatearValor(nutriente.valor, nutriente.unidad)}{nutriente.unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vitaminas */}
          {vitaminas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">Vitaminas</Badge>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <div className="space-y-2">
                {vitaminas.map((nutriente) => (
                  <div key={nutriente.nombre} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <span className="text-sm">{nutriente.nombre}</span>
                    <span className="text-sm font-semibold">
                      {formatearValor(nutriente.valor, nutriente.unidad)}{nutriente.unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Otros */}
          {otros.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">Otros</Badge>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <div className="space-y-2">
                {otros.map((nutriente) => (
                  <div key={nutriente.nombre} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <span className="text-sm">{nutriente.nombre}</span>
                    <span className="text-sm font-semibold">
                      {formatearValor(nutriente.valor, nutriente.unidad)}{nutriente.unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
