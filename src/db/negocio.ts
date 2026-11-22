import type { SQLiteDatabase } from 'expo-sqlite';
import { hoy } from '@/lib/fechas';
import { guardarConfig, leerConfigNumero } from './consultas';
import type { Cliente, Compra, Estado, Insumo, ItemPedido, Metodo, Pedido, TipoJugo } from './tipos';

// ---------- Ventas por unidad ----------

export async function registrarVenta(db: SQLiteDatabase, saborId: number, precio: number, metodo: Metodo) {
  await db.runAsync('INSERT INTO ventas (sabor_id, precio, metodo, fecha) VALUES (?, ?, ?, ?)', saborId, precio, metodo, hoy());
}

/** Borra la última venta de hoy. Devuelve el sabor deshecho (o null si no había). */
export async function deshacerUltimaVenta(db: SQLiteDatabase): Promise<number | null> {
  const f = await db.getFirstAsync<{ id: number; sabor_id: number }>(
    'SELECT id, sabor_id FROM ventas WHERE fecha = ? ORDER BY id DESC LIMIT 1',
    hoy(),
  );
  if (!f) return null;
  await db.runAsync('DELETE FROM ventas WHERE id = ?', f.id);
  return f.sabor_id;
}

export function ventasDeHoyPorSabor(db: SQLiteDatabase) {
  return db.getAllAsync<{ sabor_id: number; n: number }>(
    'SELECT sabor_id, COUNT(*) AS n FROM ventas WHERE fecha = ? GROUP BY sabor_id',
    hoy(),
  );
}

export function cobradoHoyPorMetodo(db: SQLiteDatabase) {
  return db.getAllAsync<{ metodo: Metodo; total: number }>(
    'SELECT metodo, SUM(precio) AS total FROM ventas WHERE fecha = ? GROUP BY metodo',
    hoy(),
  );
}

// ---------- Clientes ----------

export function listarClientes(db: SQLiteDatabase): Promise<Cliente[]> {
  return db.getAllAsync<Cliente>('SELECT * FROM clientes ORDER BY activo DESC, nombre COLLATE NOCASE');
}

export async function crearCliente(db: SQLiteDatabase, nombre: string): Promise<number> {
  const r = await db.runAsync('INSERT INTO clientes (nombre) VALUES (?)', nombre);
  return r.lastInsertRowId;
}

export async function renombrarCliente(db: SQLiteDatabase, id: number, nombre: string) {
  await db.runAsync('UPDATE clientes SET nombre = ? WHERE id = ?', nombre, id);
}

export async function ocultarCliente(db: SQLiteDatabase, id: number, activo: boolean) {
  await db.runAsync('UPDATE clientes SET activo = ? WHERE id = ?', activo ? 1 : 0, id);
}

// ---------- Pedidos ----------

const SELECT_PEDIDOS = `
  SELECT p.id, p.cliente_id, c.nombre AS cliente, p.fecha_entrega, p.estado, p.precio_total, p.forma_pago,
    COALESCE((SELECT SUM(monto) FROM pagos WHERE pedido_id = p.id), 0) AS pagado,
    COALESCE((SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id), 0) AS unidades
  FROM pedidos p JOIN clientes c ON c.id = p.cliente_id`;

export function listarPedidos(db: SQLiteDatabase, clienteId?: number): Promise<Pedido[]> {
  const donde = clienteId ? 'WHERE p.cliente_id = ?' : '';
  const orden = `ORDER BY CASE p.estado WHEN 'entregado' THEN 1 ELSE 0 END, p.fecha_entrega, p.id`;
  return db.getAllAsync<Pedido>(`${SELECT_PEDIDOS} ${donde} ${orden}`, ...(clienteId ? [clienteId] : []));
}

export function obtenerPedido(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Pedido>(`${SELECT_PEDIDOS} WHERE p.id = ?`, id);
}

export function itemsDePedido(db: SQLiteDatabase, id: number) {
  return db.getAllAsync<ItemPedido & { nombre: string; tipo: TipoJugo }>(
    `SELECT i.sabor_id, i.cantidad, s.nombre, s.tipo FROM pedido_items i JOIN sabores s ON s.id = i.sabor_id
     WHERE i.pedido_id = ? ORDER BY s.tipo, s.orden`,
    id,
  );
}

export type DatosPedido = {
  id: number | null;
  clienteId: number;
  fechaEntrega: string;
  precioTotal: number;
  formaPago: Metodo;
  items: ItemPedido[];
  sena: number; // pago inicial (solo al crear); 0 = ninguno
};

export async function guardarPedido(db: SQLiteDatabase, d: DatosPedido) {
  await db.withTransactionAsync(async () => {
    let id = d.id;
    if (id === null) {
      const r = await db.runAsync(
        'INSERT INTO pedidos (cliente_id, fecha_entrega, precio_total, forma_pago, creado) VALUES (?, ?, ?, ?, ?)',
        d.clienteId,
        d.fechaEntrega,
        d.precioTotal,
        d.formaPago,
        hoy(),
      );
      id = r.lastInsertRowId;
    } else {
      await db.runAsync(
        'UPDATE pedidos SET cliente_id = ?, fecha_entrega = ?, precio_total = ?, forma_pago = ? WHERE id = ?',
        d.clienteId,
        d.fechaEntrega,
        d.precioTotal,
        d.formaPago,
        id,
      );
      await db.runAsync('DELETE FROM pedido_items WHERE pedido_id = ?', id);
    }
    for (const it of d.items) {
      if (it.cantidad > 0) {
        await db.runAsync('INSERT INTO pedido_items (pedido_id, sabor_id, cantidad) VALUES (?, ?, ?)', id, it.sabor_id, it.cantidad);
      }
    }
    if (d.sena > 0) {
      await db.runAsync('INSERT INTO pagos (pedido_id, monto, metodo, fecha) VALUES (?, ?, ?, ?)', id, d.sena, d.formaPago, hoy());
    }
  });
}

export async function cambiarEstado(db: SQLiteDatabase, id: number, estado: Estado) {
  await db.runAsync('UPDATE pedidos SET estado = ? WHERE id = ?', estado, id);
}

export async function borrarPedido(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM pedidos WHERE id = ?', id);
}

export async function registrarPago(db: SQLiteDatabase, pedidoId: number, monto: number, metodo: Metodo) {
  await db.runAsync('INSERT INTO pagos (pedido_id, monto, metodo, fecha) VALUES (?, ?, ?, ?)', pedidoId, monto, metodo, hoy());
}

export function listarPagos(db: SQLiteDatabase, pedidoId: number) {
  return db.getAllAsync<{ id: number; monto: number; metodo: Metodo; fecha: string }>(
    'SELECT * FROM pagos WHERE pedido_id = ? ORDER BY id',
    pedidoId,
  );
}

export async function borrarPago(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM pagos WHERE id = ?', id);
}

/** Pedidos con plata pendiente, agrupados por cliente. */
export function deudasPorCliente(db: SQLiteDatabase) {
  return db.getAllAsync<{ cliente_id: number; cliente: string; debe: number; pedidos: number }>(
    `SELECT c.id AS cliente_id, c.nombre AS cliente, COUNT(*) AS pedidos,
       SUM(p.precio_total - COALESCE((SELECT SUM(monto) FROM pagos WHERE pedido_id = p.id), 0)) AS debe
     FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
     WHERE p.precio_total > COALESCE((SELECT SUM(monto) FROM pagos WHERE pedido_id = p.id), 0)
     GROUP BY c.id
     ORDER BY debe DESC`,
  );
}

// ---------- Compras ----------

export function listarInsumos(db: SQLiteDatabase): Promise<Insumo[]> {
  return db.getAllAsync<Insumo>('SELECT * FROM insumos WHERE activo = 1 ORDER BY es_bolsitas DESC, nombre COLLATE NOCASE');
}

export async function crearInsumo(db: SQLiteDatabase, nombre: string): Promise<number> {
  const r = await db.runAsync('INSERT INTO insumos (nombre) VALUES (?)', nombre);
  return r.lastInsertRowId;
}

export async function crearCompra(
  db: SQLiteDatabase,
  c: { insumoId: number; cantidad: number; precioTotal: number; fecha: string; foto: string | null },
) {
  await db.runAsync(
    'INSERT INTO compras (insumo_id, cantidad, precio_total, fecha, foto) VALUES (?, ?, ?, ?, ?)',
    c.insumoId,
    c.cantidad,
    c.precioTotal,
    c.fecha,
    c.foto,
  );
}

/**
 * Guarda una compra con varios insumos y un solo total. Los insumos con precio propio lo conservan;
 * el resto del total queda en el primer insumo sin precio (los demás quedan marcados `sin_precio`).
 */
export async function crearCompraVarios(
  db: SQLiteDatabase,
  c: { items: { insumoId: number; cantidad: number; precio: number | null }[]; total: number; fecha: string; foto: string | null },
) {
  if (c.items.length === 1) {
    const it = c.items[0];
    return crearCompra(db, { insumoId: it.insumoId, cantidad: it.cantidad, precioTotal: it.precio ?? c.total, fecha: c.fecha, foto: c.foto });
  }
  const conPrecio = c.items.reduce((a, it) => a + (it.precio ?? 0), 0);
  const hayLibres = c.items.some((it) => it.precio === null);
  let resto = hayLibres ? c.total - conPrecio : 0;
  const lote = Date.now();
  await db.withTransactionAsync(async () => {
    for (const it of c.items) {
      const libre = it.precio === null;
      const monto = libre ? resto : (it.precio as number);
      if (libre) resto = 0;
      await db.runAsync(
        'INSERT INTO compras (insumo_id, cantidad, precio_total, fecha, foto, lote, sin_precio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        it.insumoId,
        it.cantidad,
        monto,
        c.fecha,
        c.foto,
        lote,
        libre ? 1 : 0,
      );
    }
  });
}

export async function borrarCompra(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM compras WHERE id = ?', id);
}

/** Borra todas las filas de una compra con varios insumos. */
export async function borrarLote(db: SQLiteDatabase, lote: number) {
  await db.runAsync('DELETE FROM compras WHERE lote = ?', lote);
}

export function listarCompras(db: SQLiteDatabase, desde: string, hasta: string): Promise<Compra[]> {
  return db.getAllAsync<Compra>(
    `SELECT c.id, c.insumo_id, i.nombre AS insumo, c.cantidad, c.precio_total, c.fecha, c.foto, c.lote, c.sin_precio
     FROM compras c JOIN insumos i ON i.id = c.insumo_id
     WHERE c.fecha BETWEEN ? AND ? ORDER BY c.fecha DESC, c.id DESC`,
    desde,
    hasta,
  );
}

export function comprasPorInsumo(db: SQLiteDatabase, desde: string, hasta: string) {
  return db.getAllAsync<{ insumo: string; es_bolsitas: number; compras: number; cantidad: number; total: number; mixto: number }>(
    `SELECT i.nombre AS insumo, i.es_bolsitas, COUNT(*) AS compras, SUM(c.cantidad) AS cantidad, SUM(c.precio_total) AS total,
            MAX(c.sin_precio) AS mixto
     FROM compras c JOIN insumos i ON i.id = c.insumo_id
     WHERE c.fecha BETWEEN ? AND ? GROUP BY i.id ORDER BY total DESC`,
    desde,
    hasta,
  );
}

// ---------- Tandas y bolsitas ----------

export async function crearTanda(db: SQLiteDatabase, items: ItemPedido[]) {
  await db.withTransactionAsync(async () => {
    const r = await db.runAsync('INSERT INTO tandas (fecha) VALUES (?)', hoy());
    for (const it of items) {
      if (it.cantidad > 0) {
        await db.runAsync('INSERT INTO tanda_items (tanda_id, sabor_id, cantidad) VALUES (?, ?, ?)', r.lastInsertRowId, it.sabor_id, it.cantidad);
      }
    }
  });
}

export async function borrarTanda(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM tandas WHERE id = ?', id);
}

export function listarTandas(db: SQLiteDatabase, limite = 20) {
  return db.getAllAsync<{ id: number; fecha: string; total: number; detalle: string }>(
    `SELECT t.id, t.fecha, SUM(ti.cantidad) AS total,
       GROUP_CONCAT(s.nombre || ' ' || ti.cantidad, ', ') AS detalle
     FROM tandas t JOIN tanda_items ti ON ti.tanda_id = t.id JOIN sabores s ON s.id = ti.sabor_id
     GROUP BY t.id ORDER BY t.id DESC LIMIT ?`,
    limite,
  );
}

/** Jugitos que quedan por sabor: hechos (tandas) - vendidos por unidad - pedidos ya preparados o entregados. */
export function stockJugitos(db: SQLiteDatabase) {
  return db.getAllAsync<{ sabor_id: number; hechos: number; vendidos: number; quedan: number }>(
    `SELECT s.id AS sabor_id,
       COALESCE((SELECT SUM(cantidad) FROM tanda_items WHERE sabor_id = s.id), 0) AS hechos,
       COALESCE((SELECT COUNT(*) FROM ventas WHERE sabor_id = s.id), 0)
       + COALESCE((SELECT SUM(i.cantidad) FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
                   WHERE i.sabor_id = s.id AND p.estado IN ('preparado', 'entregado')), 0) AS vendidos,
       0 AS quedan
     FROM sabores s`,
  ).then((filas) => filas.map((f) => ({ ...f, quedan: f.hechos - f.vendidos })));
}

export type EstadoBolsitas ={ quedan: number; alerta: number; hechos: number; comprados: number };

export async function estadoBolsitas(db: SQLiteDatabase): Promise<EstadoBolsitas> {
  const alerta = await leerConfigNumero(db, 'bolsitas_alerta', 30);
  const ajuste = await leerConfigNumero(db, 'bolsitas_ajuste', 0);
  const c = await db.getFirstAsync<{ n: number | null }>(
    'SELECT SUM(c.cantidad) AS n FROM compras c JOIN insumos i ON i.id = c.insumo_id WHERE i.es_bolsitas = 1',
  );
  const t = await db.getFirstAsync<{ n: number | null }>('SELECT SUM(cantidad) AS n FROM tanda_items');
  const comprados = Math.round(c?.n ?? 0);
  const hechos = t?.n ?? 0;
  return { quedan: comprados + ajuste - hechos, alerta, hechos, comprados };
}

/** Corrige el stock: "tengo N bolsitas ahora". */
export async function corregirBolsitas(db: SQLiteDatabase, tengo: number) {
  const e = await estadoBolsitas(db);
  const ajusteActual = await leerConfigNumero(db, 'bolsitas_ajuste', 0);
  await guardarConfig(db, 'bolsitas_ajuste', ajusteActual + (tengo - e.quedan));
}

// ---------- Resumen (Inicio) ----------

export async function resumen(db: SQLiteDatabase, desde: string, hasta: string) {
  const v = await db.getFirstAsync<{ n: number | null }>('SELECT SUM(precio) AS n FROM ventas WHERE fecha BETWEEN ? AND ?', desde, hasta);
  const p = await db.getFirstAsync<{ n: number | null }>('SELECT SUM(monto) AS n FROM pagos WHERE fecha BETWEEN ? AND ?', desde, hasta);
  const c = await db.getFirstAsync<{ n: number | null }>('SELECT SUM(precio_total) AS n FROM compras WHERE fecha BETWEEN ? AND ?', desde, hasta);
  const ranking = await db.getAllAsync<{ nombre: string; tipo: TipoJugo; n: number }>(
    `SELECT s.nombre, s.tipo, SUM(x.n) AS n FROM (
       SELECT sabor_id, COUNT(*) AS n FROM ventas WHERE fecha BETWEEN ?1 AND ?2 GROUP BY sabor_id
       UNION ALL
       SELECT i.sabor_id, SUM(i.cantidad) FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
         WHERE p.fecha_entrega BETWEEN ?1 AND ?2 GROUP BY i.sabor_id
     ) x JOIN sabores s ON s.id = x.sabor_id GROUP BY s.id ORDER BY n DESC`,
    desde,
    hasta,
  );
  const deuda = await db.getFirstAsync<{ n: number | null }>(
    `SELECT SUM(precio_total - pagado) AS n FROM (
       SELECT p.precio_total, COALESCE((SELECT SUM(monto) FROM pagos WHERE pedido_id = p.id), 0) AS pagado FROM pedidos p
     ) WHERE precio_total > pagado`,
  );
  return {
    ganado: (v?.n ?? 0) + (p?.n ?? 0),
    perdido: c?.n ?? 0,
    ranking,
    deuda: deuda?.n ?? 0,
  };
}

// ---------- Respaldo ----------

const TABLAS = [
  'sabores', 'precios', 'clientes', 'insumos', 'config', 'ventas', 'pedidos', 'pedido_items',
  'pagos', 'compras', 'tandas', 'tanda_items',
] as const;

export async function volcarTodo(db: SQLiteDatabase) {
  const datos: Record<string, unknown[]> = {};
  for (const t of TABLAS) datos[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return datos;
}

/** Reemplaza TODOS los datos por los de una copia de respaldo. */
export async function restaurarTodo(db: SQLiteDatabase, datos: Record<string, Record<string, unknown>[]>) {
  for (const t of TABLAS) if (!Array.isArray(datos[t])) throw new Error(`Falta la tabla ${t}`);
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.withTransactionAsync(async () => {
      for (const t of [...TABLAS].reverse()) await db.runAsync(`DELETE FROM ${t}`);
      for (const t of TABLAS) {
        for (const fila of datos[t]) {
          const cols = Object.keys(fila);
          await db.runAsync(
            `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            ...(cols.map((c) => fila[c]) as (string | number | null)[]),
          );
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
}

// ---------- Historial por día ----------

export function diasConMovimiento(db: SQLiteDatabase, limite: number) {
  return db.getAllAsync<{ fecha: string; ganado: number; gastado: number }>(
    `SELECT fecha, SUM(ganado) AS ganado, SUM(gastado) AS gastado FROM (
       SELECT fecha, SUM(precio) AS ganado, 0 AS gastado FROM ventas GROUP BY fecha
       UNION ALL SELECT fecha, SUM(monto), 0 FROM pagos GROUP BY fecha
       UNION ALL SELECT fecha, 0, SUM(precio_total) FROM compras GROUP BY fecha
     ) GROUP BY fecha ORDER BY fecha DESC LIMIT ?`,
    limite,
  );
}

export async function detalleDia(db: SQLiteDatabase, fecha: string) {
  const [ventas, cobros, compras, entregas] = await Promise.all([
    db.getAllAsync<{ nombre: string; tipo: TipoJugo; n: number; total: number }>(
      `SELECT s.nombre, s.tipo, COUNT(*) AS n, SUM(v.precio) AS total FROM ventas v JOIN sabores s ON s.id = v.sabor_id
       WHERE v.fecha = ? GROUP BY s.id ORDER BY n DESC`,
      fecha,
    ),
    db.getAllAsync<{ cliente: string; monto: number; metodo: Metodo }>(
      `SELECT c.nombre AS cliente, p.monto, p.metodo FROM pagos p JOIN pedidos d ON d.id = p.pedido_id
       JOIN clientes c ON c.id = d.cliente_id WHERE p.fecha = ? ORDER BY p.id`,
      fecha,
    ),
    db.getAllAsync<{ insumo: string; cantidad: number; precio_total: number; sin_precio: number }>(
      `SELECT i.nombre AS insumo, c.cantidad, c.precio_total, c.sin_precio FROM compras c JOIN insumos i ON i.id = c.insumo_id
       WHERE c.fecha = ? ORDER BY c.id`,
      fecha,
    ),
    db.getAllAsync<{ cliente: string; unidades: number; estado: Estado }>(
      `SELECT c.nombre AS cliente, p.estado,
         COALESCE((SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id), 0) AS unidades
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.fecha_entrega = ? ORDER BY p.id`,
      fecha,
    ),
  ]);
  const porMetodo = await db.getAllAsync<{ metodo: Metodo; total: number }>(
    `SELECT metodo, SUM(total) AS total FROM (
       SELECT metodo, precio AS total FROM ventas WHERE fecha = ?1
       UNION ALL SELECT metodo, monto FROM pagos WHERE fecha = ?1
     ) GROUP BY metodo`,
    fecha,
  );
  return { ventas, cobros, compras, entregas, porMetodo };
}
