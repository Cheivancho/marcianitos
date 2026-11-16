/** Todas las fechas se guardan como texto local "AAAA-MM-DD" para poder compararlas y filtrarlas fácil. */

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function dos(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function aTexto(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function deTexto(t: string): Date {
  const [a, m, d] = t.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function hoy(): string {
  return aTexto(new Date());
}

export function sumarDias(t: string, dias: number): string {
  const d = deTexto(t);
  d.setDate(d.getDate() + dias);
  return aTexto(d);
}

/** "2026-11-19" -> "jue 19/11" */
export function fechaCorta(t: string): string {
  const d = deTexto(t);
  return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Igual que fechaCorta pero dice "hoy" y "mañana". */
export function fechaAmigable(t: string): string {
  const h = hoy();
  if (t === h) return `hoy ${fechaCorta(t).split(' ')[1]}`;
  if (t === sumarDias(h, 1)) return `mañana ${fechaCorta(t).split(' ')[1]}`;
  return fechaCorta(t);
}

export type Periodo = 'hoy' | 'semana' | 'mes';

/** Rango [desde, hasta] inclusive. La semana va de lunes a domingo. */
export function rangoDe(periodo: Periodo): { desde: string; hasta: string } {
  const ahora = new Date();
  if (periodo === 'hoy') {
    const t = aTexto(ahora);
    return { desde: t, hasta: t };
  }
  if (periodo === 'semana') {
    const atras = (ahora.getDay() + 6) % 7; // lunes = 0
    const lunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - atras);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    return { desde: aTexto(lunes), hasta: aTexto(domingo) };
  }
  const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimo = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  return { desde: aTexto(primero), hasta: aTexto(ultimo) };
}
