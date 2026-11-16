import type { SQLiteDatabase } from 'expo-sqlite';
import type { Precios, Sabor, TipoJugo } from './tipos';

// ---------- Sabores ----------

export function listarSabores(db: SQLiteDatabase): Promise<Sabor[]> {
  return db.getAllAsync<Sabor>('SELECT * FROM sabores ORDER BY tipo, orden, id');
}

export async function crearSabor(db: SQLiteDatabase, nombre: string, tipo: TipoJugo) {
  const fila = await db.getFirstAsync<{ maximo: number | null }>(
    'SELECT MAX(orden) AS maximo FROM sabores WHERE tipo = ?',
    tipo,
  );
  const orden = (fila?.maximo ?? -1) + 1;
  await db.runAsync('INSERT INTO sabores (nombre, tipo, orden) VALUES (?, ?, ?)', nombre, tipo, orden);
}

export async function renombrarSabor(db: SQLiteDatabase, id: number, nombre: string) {
  await db.runAsync('UPDATE sabores SET nombre = ? WHERE id = ?', nombre, id);
}

/** Los sabores no se borran (para no perder el historial de ventas): se ocultan. */
export async function ocultarSabor(db: SQLiteDatabase, id: number, activo: boolean) {
  await db.runAsync('UPDATE sabores SET activo = ? WHERE id = ?', activo ? 1 : 0, id);
}

// ---------- Precios ----------

export function listarPrecios(db: SQLiteDatabase): Promise<Precios[]> {
  return db.getAllAsync<Precios>('SELECT * FROM precios');
}

export async function guardarPrecios(db: SQLiteDatabase, p: Precios) {
  await db.runAsync(
    'UPDATE precios SET unidad = ?, desde10 = ?, desde20 = ?, desde30 = ? WHERE tipo = ?',
    p.unidad,
    p.desde10,
    p.desde20,
    p.desde30,
    p.tipo,
  );
}

// ---------- Config ----------

export async function leerConfigNumero(db: SQLiteDatabase, clave: string, porDefecto: number) {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM config WHERE clave = ?', clave);
  const n = Number(fila?.valor);
  return Number.isFinite(n) ? n : porDefecto;
}

export async function guardarConfig(db: SQLiteDatabase, clave: string, valor: number) {
  await db.runAsync('INSERT OR REPLACE INTO config (clave, valor) VALUES (?, ?)', clave, String(valor));
}
