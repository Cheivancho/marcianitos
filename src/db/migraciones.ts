import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Crea y actualiza la base de datos local. Usa PRAGMA user_version para saber en qué versión está.
 * Para cambiar el esquema en el futuro: agregar un bloque `if (version < N)` al final, nunca editar los anteriores.
 */
export async function migrar(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = fila?.user_version ?? 0;

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE sabores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('crema', 'agua')),
          activo INTEGER NOT NULL DEFAULT 1,
          orden INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE precios (
          tipo TEXT PRIMARY KEY CHECK (tipo IN ('crema', 'agua')),
          unidad INTEGER NOT NULL,
          desde10 INTEGER NOT NULL,
          desde20 INTEGER NOT NULL,
          desde30 INTEGER NOT NULL
        );

        CREATE TABLE clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE insumos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          activo INTEGER NOT NULL DEFAULT 1,
          es_bolsitas INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE config (
          clave TEXT PRIMARY KEY,
          valor TEXT NOT NULL
        );
      `);

      const crema = ['Chocotorta', 'Oreo', 'Flan con dulce de leche', 'Frutilla', 'Banana split'];
      const agua = ['Galáctico', 'Frutilla', 'Uva'];
      for (const [i, nombre] of crema.entries()) {
        await db.runAsync('INSERT INTO sabores (nombre, tipo, orden) VALUES (?, ?, ?)', nombre, 'crema', i);
      }
      for (const [i, nombre] of agua.entries()) {
        await db.runAsync('INSERT INTO sabores (nombre, tipo, orden) VALUES (?, ?, ?)', nombre, 'agua', i);
      }

      await db.runAsync('INSERT INTO precios VALUES (?, ?, ?, ?, ?)', 'crema', 800, 700, 650, 600);
      await db.runAsync('INSERT INTO precios VALUES (?, ?, ?, ?, ?)', 'agua', 500, 450, 400, 350);

      const insumos = [
        'Masitas (oreos, chocolinas)',
        'Dulce de leche',
        'Crema',
        'Frutilla',
        'Banana',
        'Flan de vainilla',
        'Azúcar',
        'Maicena',
        'Leche en polvo',
        'Esencia de vainilla',
        'Leche',
        'Jugos en sobrecitos',
      ];
      for (const nombre of insumos) {
        await db.runAsync('INSERT INTO insumos (nombre) VALUES (?)', nombre);
      }
      await db.runAsync('INSERT INTO insumos (nombre, es_bolsitas) VALUES (?, 1)', 'Bolsitas 4x25 cm');

      // Valores por defecto, a confirmar con ella (ver CLAUDE.md, pregunta 2).
      await db.runAsync('INSERT INTO config VALUES (?, ?)', 'bolsitas_por_paquete', '100');
      await db.runAsync('INSERT INTO config VALUES (?, ?)', 'bolsitas_alerta', '30');

      await db.execAsync('PRAGMA user_version = 1');
    });
  }
  if (version < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE ventas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sabor_id INTEGER NOT NULL REFERENCES sabores(id),
          precio INTEGER NOT NULL,
          metodo TEXT NOT NULL CHECK (metodo IN ('efectivo', 'transferencia')),
          fecha TEXT NOT NULL
        );
        CREATE INDEX ventas_fecha ON ventas(fecha);

        CREATE TABLE pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id),
          fecha_entrega TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'por_preparar' CHECK (estado IN ('por_preparar', 'preparado', 'entregado')),
          precio_total INTEGER NOT NULL,
          forma_pago TEXT NOT NULL DEFAULT 'efectivo' CHECK (forma_pago IN ('efectivo', 'transferencia')),
          creado TEXT NOT NULL
        );

        CREATE TABLE pedido_items (
          pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          sabor_id INTEGER NOT NULL REFERENCES sabores(id),
          cantidad INTEGER NOT NULL,
          PRIMARY KEY (pedido_id, sabor_id)
        );

        CREATE TABLE pagos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          monto INTEGER NOT NULL,
          metodo TEXT NOT NULL CHECK (metodo IN ('efectivo', 'transferencia')),
          fecha TEXT NOT NULL
        );

        CREATE TABLE compras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          insumo_id INTEGER NOT NULL REFERENCES insumos(id),
          cantidad REAL NOT NULL,
          precio_total INTEGER NOT NULL,
          fecha TEXT NOT NULL,
          foto TEXT
        );
        CREATE INDEX compras_fecha ON compras(fecha);

        CREATE TABLE tandas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha TEXT NOT NULL
        );

        CREATE TABLE tanda_items (
          tanda_id INTEGER NOT NULL REFERENCES tandas(id) ON DELETE CASCADE,
          sabor_id INTEGER NOT NULL REFERENCES sabores(id),
          cantidad INTEGER NOT NULL,
          PRIMARY KEY (tanda_id, sabor_id)
        );
      `);
      await db.runAsync('INSERT OR IGNORE INTO config VALUES (?, ?)', 'bolsitas_ajuste', '0');
      await db.execAsync('PRAGMA user_version = 2');
    });
  }

  if (version < 3) {
    // Compras con varios insumos y un solo precio: `lote` agrupa las filas de una misma compra
    // y `sin_precio` marca los insumos que no tienen precio propio (su plata va en el total del lote).
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        ALTER TABLE compras ADD COLUMN lote INTEGER;
        ALTER TABLE compras ADD COLUMN sin_precio INTEGER NOT NULL DEFAULT 0;
      `);
      await db.execAsync('PRAGMA user_version = 3');
    });
  }
}
