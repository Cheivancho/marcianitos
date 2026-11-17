import type { Precios, Sabor } from '@/db/tipos';
import { pesos } from '@/lib/formato';
import type { ClaveJugito } from './objetos';

export type Medida = '16:9' | '9:16' | '4:3';

export const MEDIDAS: Record<Medida, { ancho: number; alto: number; titulo: string }> = {
  '16:9': { ancho: 1280, alto: 720, titulo: 'Horizontal 16:9' },
  '9:16': { ancho: 1080, alto: 1920, titulo: 'Historias 9:16' },
  '4:3': { ancho: 1200, alto: 900, titulo: 'Clásica 4:3' },
};

export type FondoClave = 'rosaS' | 'crema' | 'beige' | 'rosaC' | 'blanco' | 'cielo' | 'noche';

export const FONDOS: { clave: FondoClave; titulo: string }[] = [
  { clave: 'rosaS', titulo: 'Rosa suave' },
  { clave: 'rosaC', titulo: 'Rosa' },
  { clave: 'crema', titulo: 'Crema' },
  { clave: 'beige', titulo: 'Beige' },
  { clave: 'blanco', titulo: 'Blanco' },
  { clave: 'cielo', titulo: 'Cielo rosa' },
  { clave: 'noche', titulo: 'Noche' },
];

export type EstiloPill = 'rosa' | 'verde' | 'blanco' | 'amarillo';

type Defecto = string | ((d: DatosNegocio) => string);

export type Bloque =
  | { tipo: 'titulo' | 'subtitulo' | 'precio' | 'pie' | 'tag'; campo: string; etiqueta: string; defecto: Defecto; tam?: number; multilinea?: boolean }
  | { tipo: 'pill'; campo: string; etiqueta: string; defecto: Defecto; estilo?: EstiloPill }
  | { tipo: 'lista' | 'tarjetas'; campo: string; etiqueta: string; defecto: Defecto }
  | { tipo: 'foto' };

export type ItemArte = { obj: string; l: number; t: number; w: number; rot?: number };

export type Plantilla = {
  id: number;
  nombre: string;
  fondo: FondoClave;
  /** 'centrada': todo apilado en el medio. 'arte': dibujo a un lado (o arriba) y texto al otro. */
  layout: 'centrada' | 'arte';
  ar?: number; // proporción ancho/alto de la zona del dibujo
  arte?: ItemArte[];
  decor?: ItemArte[]; // objetos sueltos sobre todo el lienzo (en % del lienzo)
  bloques: Bloque[];
};

/** Lo que la app ya sabe del negocio, para armar textos iniciales con los precios reales. */
export type DatosNegocio = {
  crema: Precios;
  agua: Precios;
  saboresCrema: string[];
  cantidadSabores: number;
};

export const DATOS_POR_DEFECTO: DatosNegocio = {
  crema: { tipo: 'crema', unidad: 800, desde10: 700, desde20: 650, desde30: 600 },
  agua: { tipo: 'agua', unidad: 500, desde10: 450, desde20: 400, desde30: 350 },
  saboresCrema: ['Chocotorta', 'Oreo', 'Flan con dulce de leche', 'Frutilla', 'Banana split'],
  cantidadSabores: 8,
};

export function armarDatos(sabores: Sabor[], precios: Precios[]): DatosNegocio {
  const crema = precios.find((p) => p.tipo === 'crema') ?? DATOS_POR_DEFECTO.crema;
  const agua = precios.find((p) => p.tipo === 'agua') ?? DATOS_POR_DEFECTO.agua;
  const activos = sabores.filter((s) => s.activo === 1);
  const saboresCrema = activos.filter((s) => s.tipo === 'crema').map((s) => s.nombre);
  return {
    crema,
    agua,
    saboresCrema: saboresCrema.length ? saboresCrema.slice(0, 5) : DATOS_POR_DEFECTO.saboresCrema,
    cantidadSabores: activos.length || DATOS_POR_DEFECTO.cantidadSabores,
  };
}

const pack = (d: DatosNegocio) => d.crema.desde10 * 10;
const sinDescuento = (d: DatosNegocio) => d.crema.unidad * 10;

// Atajos para no repetir
const logoWhatsApp = 'Pedidos por WhatsApp';

export const PLANTILLAS: Plantilla[] = [
  {
    id: 1, nombre: 'Menú de sabores', fondo: 'crema', layout: 'centrada',
    decor: [{ obj: 'circulo_rosa', l: 86, t: 76, w: 22 }],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Nuestros sabores' },
      { tipo: 'lista', campo: 'lista', etiqueta: 'Sabores y precios', defecto: (d) => d.saboresCrema.map((s) => `${s} - ${pesos(d.crema.unidad)}`).join('\n') },
      { tipo: 'pie', campo: 'pie', etiqueta: 'Texto de abajo', defecto: logoWhatsApp },
    ],
  },
  {
    id: 2, nombre: 'Promo por cantidad', fondo: 'cielo', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Cuanto más llevás,\nmenos pagás!', multilinea: true },
      { tipo: 'tarjetas', campo: 'tarjetas', etiqueta: 'Descuentos', defecto: (d) => [`Desde 10 - ${pesos(d.crema.desde10)}`, `Desde 20 - ${pesos(d.crema.desde20)}`, `Desde 30 - ${pesos(d.crema.desde30)}`].join('\n') },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Aclaración', defecto: 'Jugitos de crema, precio por unidad' },
    ],
  },
  {
    id: 3, nombre: 'Sabor del día con foto', fondo: 'rosaS', layout: 'centrada',
    bloques: [
      { tipo: 'tag', campo: 'tag', etiqueta: 'Sello', defecto: '¡HOY!' },
      { tipo: 'foto' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Sabor', defecto: 'Chocotorta', tam: 8 },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio', defecto: (d) => pesos(d.crema.unidad), tam: 9 },
    ],
  },
  {
    id: 4, nombre: '¡Sabor nuevo! con foto', fondo: 'beige', layout: 'centrada',
    bloques: [
      { tipo: 'pill', campo: 'pill', etiqueta: 'Sello', defecto: 'NUEVO' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Sabor', defecto: 'Banana split' },
      { tipo: 'foto' },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Descripción', defecto: 'Crema, banana y dulce de leche. ¡Probalo!' },
    ],
  },
  {
    id: 5, nombre: 'Hacé tu pedido', fondo: 'rosaC', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Pedí los tuyos\npor WhatsApp', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Entregas en la escuela y el barrio' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Teléfono', defecto: '11 5555-5555', estilo: 'verde' },
    ],
  },
  {
    id: 6, nombre: 'Pack de 10', fondo: 'crema', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Pack de 10 jugitos', tam: 8 },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Detalle', defecto: 'A elección, de crema' },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio del pack', defecto: (d) => pesos(pack(d)) },
      { tipo: 'subtitulo', campo: 'antes', etiqueta: 'Precio de antes', defecto: (d) => `en vez de ${pesos(sinDescuento(d))}` },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Ahorro', defecto: (d) => `Ahorrás ${pesos(sinDescuento(d) - pack(d))}` },
    ],
  },
  {
    id: 7, nombre: 'Gracias por tu compra', fondo: 'cielo', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Gracias por tu compra!' },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Contanos qué sabor te gustó más' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Usuario o teléfono', defecto: '@marcianitos', estilo: 'blanco' },
    ],
  },
  {
    id: 8, nombre: 'Precios crema y agua', fondo: 'beige', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Precios', tam: 8 },
      { tipo: 'tarjetas', campo: 'tarjetas', etiqueta: 'Precios', defecto: (d) => [`Crema - ${pesos(d.crema.unidad)}`, `Agua - ${pesos(d.agua.unidad)}`].join('\n') },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Aclaración', defecto: 'Consultá descuentos por cantidad' },
    ],
  },
  {
    id: 9, nombre: 'Aviso: se terminó', fondo: 'rosaC', layout: 'centrada',
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Nos quedamos sin\nchocotorta!', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Vuelve el viernes' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Botón', defecto: 'Reservá el tuyo' },
    ],
  },
  {
    id: 10, nombre: 'Libre: foto y texto', fondo: 'rosaS', layout: 'centrada',
    bloques: [
      { tipo: 'foto' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Mensaje', defecto: 'Tu mensaje acá', tam: 7 },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto chico', defecto: 'Texto secundario opcional' },
    ],
  },
  {
    id: 11, nombre: 'Sabor del día con planeta', fondo: 'rosaS', layout: 'arte', ar: 1,
    arte: [
      { obj: 'planeta_rosa', l: -12, t: 34, w: 52 },
      { obj: 'estrella', l: 68, t: 0, w: 22, rot: 12 },
      { obj: 'jugito:chocotorta', l: 38, t: -2, w: 46 },
      { obj: 'estrella_rosa', l: 0, t: 6, w: 18, rot: -10 },
    ],
    bloques: [
      { tipo: 'pill', campo: 'pill', etiqueta: 'Sello', defecto: 'SABOR DEL DÍA' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Sabor', defecto: 'Chocotorta' },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Descripción', defecto: 'Cremosa, con galletitas y dulce de leche' },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio', defecto: (d) => pesos(d.crema.unidad) },
    ],
  },
  {
    id: 12, nombre: 'Hola, soy Marcianitos', fondo: 'cielo', layout: 'arte', ar: 1.05,
    arte: [
      { obj: 'ovni', l: 0, t: -6, w: 72, rot: -6 },
      { obj: 'marciano', l: 30, t: 36, w: 40 },
      { obj: 'jugito:frutilla', l: 70, t: 18, w: 28 },
      { obj: 'estrella', l: 2, t: 66, w: 16, rot: 10 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Hola, soy\nMarcianitos!', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Los jugitos más ricos de la galaxia' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Botón', defecto: 'Pedí por WhatsApp', estilo: 'blanco' },
    ],
  },
  {
    id: 13, nombre: 'Elegí tu sabor', fondo: 'crema', layout: 'arte', ar: 1.15,
    arte: [
      { obj: 'jugito:frutilla', l: 0, t: 0, w: 34 },
      { obj: 'jugito:oreo', l: 33, t: 0, w: 34 },
      { obj: 'jugito:banana', l: 66, t: 0, w: 34 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Elegí tu sabor' },
      { tipo: 'lista', campo: 'lista', etiqueta: 'Precios', defecto: (d) => [`Crema - ${pesos(d.crema.unidad)}`, `Agua - ${pesos(d.agua.unidad)}`].join('\n') },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: (d) => `${d.cantidadSabores} sabores para probar` },
    ],
  },
  {
    id: 14, nombre: 'Precios que despegan', fondo: 'cielo', layout: 'arte', ar: 0.9,
    arte: [
      { obj: 'cohete', l: 22, t: -2, w: 40, rot: 14 },
      { obj: 'planeta_beige', l: -6, t: 58, w: 38 },
      { obj: 'jugito:uva', l: 64, t: 10, w: 32 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Precios que\ndespegan!', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Desde 10 jugitos, cada uno' },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio', defecto: (d) => pesos(d.crema.desde10) },
    ],
  },
  {
    id: 15, nombre: 'Invasión de sabores', fondo: 'noche', layout: 'arte', ar: 0.95,
    arte: [
      { obj: 'ovni', l: -4, t: -4, w: 100 },
      { obj: 'jugito:galactico', l: 34, t: 28, w: 32 },
      { obj: 'estrella', l: 4, t: 58, w: 16 },
    ],
    bloques: [
      { tipo: 'pill', campo: 'pill', etiqueta: 'Sello', defecto: '¡NUEVO!', estilo: 'amarillo' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Sabor', defecto: 'Galáctico' },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Descripción', defecto: 'El sabor de agua que viene de otro planeta' },
    ],
  },
  {
    id: 16, nombre: 'Sabor nuevo con planeta', fondo: 'beige', layout: 'arte', ar: 1,
    arte: [
      { obj: 'planeta_violeta', l: -10, t: 30, w: 58 },
      { obj: 'jugito:uva', l: 50, t: -2, w: 46 },
      { obj: 'estrella', l: 2, t: 0, w: 20, rot: -12 },
      { obj: 'burbuja', l: 80, t: 74, w: 16 },
    ],
    bloques: [
      { tipo: 'pill', campo: 'pill', etiqueta: 'Sello', defecto: 'NUEVO' },
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Sabor', defecto: 'Uva' },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Descripción', defecto: 'Fresquito y de otro mundo' },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio', defecto: (d) => pesos(d.agua.unidad) },
    ],
  },
  {
    id: 17, nombre: 'Pedidos en órbita', fondo: 'rosaC', layout: 'arte', ar: 1.1,
    arte: [
      { obj: 'planeta_rosa', l: 0, t: 10, w: 84 },
      { obj: 'jugito:frutilla', l: 58, t: 0, w: 40 },
      { obj: 'luna', l: 0, t: 68, w: 28 },
      { obj: 'estrella', l: 74, t: 66, w: 18, rot: 10 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Tus pedidos,\nen órbita', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Escuela · barrio · WhatsApp' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Teléfono', defecto: '11 5555-5555', estilo: 'verde' },
    ],
  },
  {
    id: 18, nombre: 'Pack galáctico', fondo: 'crema', layout: 'arte', ar: 1.15,
    arte: [
      { obj: 'jugito:frutilla', l: 0, t: 6, w: 34 },
      { obj: 'jugito:chocotorta', l: 33, t: 0, w: 34 },
      { obj: 'jugito:oreo', l: 66, t: 6, w: 34 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: 'Pack galáctico', tam: 7.6 },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Detalle', defecto: '10 jugitos a elección' },
      { tipo: 'precio', campo: 'precio', etiqueta: 'Precio del pack', defecto: (d) => pesos(pack(d)) },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Ahorro', defecto: (d) => `Ahorrás ${pesos(sinDescuento(d) - pack(d))}` },
    ],
  },
  {
    id: 19, nombre: 'Gracias con marcianito', fondo: 'rosaS', layout: 'arte', ar: 1,
    arte: [
      { obj: 'marciano', l: 2, t: 22, w: 56 },
      { obj: 'jugito:banana', l: 60, t: 14, w: 36 },
      { obj: 'corazon', l: 46, t: 0, w: 22, rot: 12 },
      { obj: 'estrella_rosa', l: 0, t: 4, w: 20, rot: -10 },
      { obj: 'burbuja', l: 84, t: 76, w: 14 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Gracias por\ntu compra!', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Contanos qué sabor te gustó más' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Usuario o teléfono', defecto: '@marcianitos' },
    ],
  },
  {
    id: 20, nombre: 'Se terminó (a la luna)', fondo: 'noche', layout: 'arte', ar: 1,
    arte: [
      { obj: 'luna', l: 30, t: 6, w: 68 },
      { obj: 'jugito:chocotorta', l: 2, t: 6, w: 44 },
      { obj: 'estrella', l: 74, t: 70, w: 18, rot: 10 },
    ],
    bloques: [
      { tipo: 'titulo', campo: 'titulo', etiqueta: 'Título', defecto: '¡Se terminó\nla chocotorta!', multilinea: true },
      { tipo: 'subtitulo', campo: 'sub', etiqueta: 'Texto', defecto: 'Vuelve el viernes. Reservá el tuyo.' },
      { tipo: 'pill', campo: 'pill', etiqueta: 'Botón', defecto: 'Avisame', estilo: 'verde' },
    ],
  },
];

export function buscarPlantilla(id: number): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
}

/** Textos iniciales de una plantilla (con los precios y sabores reales). */
export function valoresIniciales(p: Plantilla, d: DatosNegocio): Record<string, string> {
  const v: Record<string, string> = {};
  for (const b of p.bloques) {
    if (b.tipo === 'foto') continue;
    v[b.campo] = typeof b.defecto === 'function' ? b.defecto(d) : b.defecto;
  }
  return v;
}

/** Jugitos de una plantilla en el orden en que aparecen: cada uno se puede cambiar de sabor. */
export function jugitosIniciales(p: Plantilla): ClaveJugito[] {
  return (p.arte ?? []).filter((a) => a.obj.startsWith('jugito:')).map((a) => a.obj.slice(7) as ClaveJugito);
}
