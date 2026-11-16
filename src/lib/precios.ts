import type { Precios } from '@/db/tipos';

/** Precio c/u según la cantidad de ese tipo dentro del mismo pedido. */
export function precioUnitario(p: Precios, cantidad: number): number {
  if (cantidad >= 30) return p.desde30;
  if (cantidad >= 20) return p.desde20;
  if (cantidad >= 10) return p.desde10;
  return p.unidad;
}

/** Total de un tipo (crema o agua): cantidad × precio c/u que corresponde. */
export function totalDeTipo(p: Precios | undefined, cantidad: number): number {
  if (!p || cantidad <= 0) return 0;
  return cantidad * precioUnitario(p, cantidad);
}
