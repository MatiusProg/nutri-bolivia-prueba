import { useState } from 'react';

type Alimento = any; // Will be updated when Supabase types regenerate
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Scale } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AlimentoDetailModalProps {
  alimento: Alimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Unit = 'gramos' | 'kilogramos' | 'libras' | 'onzas' | 'miligramos' | 'microgramos';

const conversionRates: Record<Unit, number> = {
  gramos: 1,
  kilogramos: 1000,
  libras: 453.592,
  onzas: 28.3495,
  miligramos: 0.001,
  microgramos: 0.000001,
};

const unitLabels: Record<Unit, string> = {
  gramos: 'Gramos (g)',
  kilogramos: 'Kilogramos (kg)',
  libras: 'Libras (lb)',
  onzas: 'Onzas (oz)',
  miligramos: 'Miligramos (mg)',
  microgramos: 'Microgramos (mcg)',
};

export default function AlimentoDetailModal({
  alimento,
  open,
  onOpenChange,
}: AlimentoDetailModalProps) {
  const [cantidad, setCantidad] = useState(100);
  const [unidad, setUnidad] = useState<Unit>('gramos');

  if (!alimento) return null;

  // Convertir la cantidad ingresada a gramos
  const gramosEquivalentes = cantidad * conversionRates[unidad];

  // Calcular valor nutricional - distinguir NULL de 0
  const calcular = (valor: number | null | undefined): string | null => {
    // NULL o undefined = dato no disponible
    if (valor === null || valor === undefined) return null;
    // Valor numérico (incluido 0) = dato válido
    return ((valor * gramosEquivalentes) / 100).toFixed(2);
  };

  const nutrientes = [
    {
      categoria: 'Macronutrientes Principales',
      items: [
        { nombre: 'Energía', valor: alimento.energia_kcal, unidad: 'kcal', icono: '🔥' },
        { nombre: 'Humedad', valor: alimento.humedad_g, unidad: 'g', icono: '💧' },
        { nombre: 'Proteínas', valor: alimento.proteinas_g, unidad: 'g', icono: '💪' },
        { nombre: 'Grasas', valor: alimento.grasas_g, unidad: 'g', icono: '🥑' },
        { nombre: 'Carbohidratos', valor: alimento.hidratoscarbonototal_g, unidad: 'g', icono: '🌾' },
        { nombre: 'Fibra cruda', valor: alimento.fibracruda_g, unidad: 'g', icono: '🌿' },
        { nombre: 'Ceniza', valor: alimento.ceniza_g, unidad: 'g', icono: '⚪' },
      ],
    },
    {
      categoria: 'Minerales',
      items: [
        { nombre: 'Calcio', valor: alimento.calcio_mg, unidad: 'mg', icono: '🦴' },
        { nombre: 'Fósforo', valor: alimento.fosforo_mg, unidad: 'mg', icono: '💎' },
        { nombre: 'Hierro', valor: alimento.hierro_mg, unidad: 'mg', icono: '⚡' },
      ],
    },
    {
      categoria: 'Vitaminas',
      items: [
        { nombre: 'Vitamina A', valor: alimento.vita_mcg, unidad: 'μg', icono: '👁️' },
        { nombre: 'Tiamina (B1)', valor: alimento.tiamina_mg, unidad: 'mg', icono: '🅱️' },
        { nombre: 'Riboflavina (B2)', valor: alimento.riboflavina_mg, unidad: 'mg', icono: '🅱️' },
        { nombre: 'Niacina (B3)', valor: alimento.niacina_mg, unidad: 'mg', icono: '🅱️' },
        { nombre: 'Vitamina C', valor: alimento.vitc_mg, unidad: 'mg', icono: '🍊' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-start justify-between gap-4">
            <span>{alimento.nombre_alimento}</span>
            {alimento.grupo_alimenticio && (
              <Badge variant="secondary" className="text-sm">
                {alimento.grupo_alimenticio}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Calculadora con Múltiples Unidades */}
        <div className="bg-primary/5 p-6 rounded-xl border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">Calculadora de Porciones</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-base">
                Cantidad
              </Label>
              <Input
                id="cantidad"
                type="number"
                min="0.001"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(0.001, parseFloat(e.target.value) || 100))}
                className="text-lg h-12 border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidad" className="text-base">
                Unidad de medida
              </Label>
              <Select value={unidad} onValueChange={(value) => setUnidad(value as Unit)}>
                <SelectTrigger className="text-lg h-12 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(unitLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {cantidad} {unitLabels[unidad].toLowerCase()} = {gramosEquivalentes.toFixed(2)}g
            <br />
            Los valores nutricionales se calculan automáticamente
          </p>
        </div>

        {/* Información Nutricional */}
        <div className="space-y-6">
          {nutrientes.map((categoria) => (
            <div key={categoria.categoria}>
              <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                {categoria.categoria}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoria.items
                  .filter(item => calcular(item.valor) !== null)
                  .map((item) => (
                  <div
                    key={item.nombre}
                    className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span className="text-base">{item.icono}</span>
                      {item.nombre}
                    </span>
                    <span className="text-sm font-semibold">
                      {calcular(item.valor)} {item.unidad}
                    </span>
                  </div>
                ))}
              </div>
              {categoria.categoria !== 'Vitaminas' && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg">
          <p>
            * Valores nutricionales por 100g del alimento. Los valores mostrados son
            calculados para la cantidad especificada en la calculadora.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
