export type TipoJugo = 'crema' | 'agua';

export type Sabor = {
  id: number;
  nombre: string;
  tipo: TipoJugo;
  activo: number; // 1 = se muestra al vender, 0 = oculto
  orden: number;
};

export type Precios = {
  tipo: TipoJugo;
  unidad: number; // 1 a 9 unidades
  desde10: number; // precio c/u desde 10 unidades
  desde20: number;
  desde30: number;
};

export type Insumo = {
  id: number;
  nombre: string;
  activo: number;
  es_bolsitas: number; // 1 = es la bolsita 4x25 cm (la que tiene aviso de stock)
};

export type Metodo = 'efectivo' | 'transferencia';
export type Estado = 'por_preparar' | 'preparado' | 'entregado';

export type Cliente = { id: number; nombre: string; activo: number };

export type Pedido = {
  id: number;
  cliente_id: number;
  cliente: string;
  fecha_entrega: string;
  estado: Estado;
  precio_total: number;
  forma_pago: Metodo;
  pagado: number;
  unidades: number;
};

export type ItemPedido = { sabor_id: number; cantidad: number };

export type Compra = {
  id: number;
  insumo_id: number;
  insumo: string;
  cantidad: number;
  precio_total: number;
  fecha: string;
  foto: string | null;
};
