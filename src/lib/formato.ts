/** Monto en pesos argentinos, sin decimales y con punto de miles: 12500 -> "$12.500". */
export function pesos(monto: number): string {
  const entero = Math.round(monto);
  const signo = entero < 0 ? '-' : '';
  return `${signo}$${Math.abs(entero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
