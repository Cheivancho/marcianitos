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
}
