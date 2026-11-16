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
