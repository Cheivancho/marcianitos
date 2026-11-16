import { Directory, File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { guardarConfigTexto, leerConfigTexto } from '@/db/consultas';
import { volcarTodo } from '@/db/negocio';
import { deTexto, hoy, sumarDias } from '@/lib/fechas';

const K_ULTIMO = 'respaldo_ultimo'; // AAAA-MM-DD de la última copia (manual o automática)
const K_CARPETA = 'respaldo_carpeta'; // carpeta elegida (por ejemplo, de Google Drive)
const K_CARPETA_NOMBRE = 'respaldo_carpeta_nombre';

export const DIAS_AVISO = 7; // cuántos días sin copia antes de avisar
const DIAS_AUTO = 3; // cada cuántos días se hace la copia automática
const COPIAS_A_GUARDAR = 5;
const ID_RECORDATORIO = 'recordatorio-respaldo';
const CANAL = 'avisos';

/** El contenido de la copia de seguridad (JSON con todos los datos). */
export async function armarCopia(db: SQLiteDatabase): Promise<string> {
  const datos = await volcarTodo(db);
  return JSON.stringify({ app: 'marcianitos', version: 1, fecha: hoy(), datos });
}

export async function marcarCopiaHecha(db: SQLiteDatabase) {
  await guardarConfigTexto(db, K_ULTIMO, hoy());
  await programarRecordatorio(db);
}

/** Días desde la última copia, o null si nunca hizo una. */
export async function diasSinCopia(db: SQLiteDatabase): Promise<number | null> {
  const ultimo = await leerConfigTexto(db, K_ULTIMO);
  if (!ultimo) return null;
  const ms = deTexto(hoy()).getTime() - deTexto(ultimo).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** ¿Hay datos como para que valga la pena avisar? (no molestar a quien todavía no cargó nada) */
async function hayDatos(db: SQLiteDatabase): Promise<boolean> {
  const f = await db.getFirstAsync<{ n: number }>(
    'SELECT (SELECT COUNT(*) FROM ventas) + (SELECT COUNT(*) FROM pedidos) + (SELECT COUNT(*) FROM compras) AS n',
  );
  return (f?.n ?? 0) > 0;
}

/** Hay que mostrar el cartel de "hacé una copia": pasaron 7 días o nunca hizo una (y ya cargó cosas). */
export async function necesitaAviso(db: SQLiteDatabase): Promise<{ dias: number | null } | null> {
  if (!(await hayDatos(db))) return null;
  const dias = await diasSinCopia(db);
  if (dias === null || dias >= DIAS_AVISO) return { dias };
  return null;
}

// ---------- Copia automática a una carpeta (por ejemplo de Google Drive) ----------

export type EstadoAuto = { carpeta: string | null; ultimo: string | null };

export async function estadoAuto(db: SQLiteDatabase): Promise<EstadoAuto> {
  const uri = await leerConfigTexto(db, K_CARPETA);
  const nombre = uri ? ((await leerConfigTexto(db, K_CARPETA_NOMBRE)) || 'Carpeta elegida') : null;
  return { carpeta: nombre ? limpiarNombre(nombre) : null, ultimo: await leerConfigTexto(db, K_ULTIMO) };
}

/** "primary:Respaldos" -> "Respaldos" (Android devuelve el nombre con el prefijo del almacenamiento). */
function limpiarNombre(n: string): string {
  let t = n;
  try {
    t = decodeURIComponent(n);
  } catch {
    // se deja como está
  }
  return t.split('/').pop()!.split(':').pop() || 'Carpeta elegida';
}

/** Deja que ella elija una carpeta (en Drive o en el celu). Devuelve false si cancela. */
export async function elegirCarpeta(db: SQLiteDatabase): Promise<boolean> {
  try {
    const carpeta = await Directory.pickDirectoryAsync();
    await guardarConfigTexto(db, K_CARPETA, carpeta.uri);
    await guardarConfigTexto(db, K_CARPETA_NOMBRE, carpeta.name || 'Carpeta elegida');
    return true;
  } catch {
    return false; // canceló o el celu no lo permite
  }
}

export async function desactivarAuto(db: SQLiteDatabase) {
  await guardarConfigTexto(db, K_CARPETA, '');
  await guardarConfigTexto(db, K_CARPETA_NOMBRE, '');
}

/** Escribe la copia en la carpeta elegida y borra las más viejas. Lanza error si no se puede. */
export async function copiaEnCarpeta(db: SQLiteDatabase): Promise<void> {
  const uri = await leerConfigTexto(db, K_CARPETA);
  if (!uri) throw new Error('sin carpeta');
  const carpeta = new Directory(uri);
  const nombre = `marcianitos-respaldo-${hoy()}.json`;
  // Si ya hay una de hoy, se reemplaza.
  for (const e of carpeta.list()) if (e instanceof File && e.name === nombre) e.delete();
  const archivo = carpeta.createFile(nombre, 'application/json');
  archivo.write(await armarCopia(db));

  const viejas = carpeta
    .list()
    .filter((e): e is File => e instanceof File && /^marcianitos-respaldo-\d{4}-\d{2}-\d{2}\.json$/.test(e.name))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(COPIAS_A_GUARDAR);
  for (const v of viejas) {
    try {
      v.delete();
    } catch {
      // si no se puede borrar una vieja, no pasa nada
    }
  }
  await marcarCopiaHecha(db);
}

/** Al abrir la app: si hay carpeta elegida y pasaron 3 días o más, hace la copia sola. Nunca rompe la app. */
export async function copiaAutomaticaSiToca(db: SQLiteDatabase): Promise<'hecha' | 'error' | null> {
  try {
    if (!(await leerConfigTexto(db, K_CARPETA))) return null;
    if (!(await hayDatos(db))) return null;
    const dias = await diasSinCopia(db);
    if (dias !== null && dias < DIAS_AUTO) return null;
    await copiaEnCarpeta(db);
    return 'hecha';
  } catch {
    return 'error';
  }
}

// ---------- Recordatorio por notificación ----------

/** Programa (o reprograma) una notificación para cuando se cumplan 7 días sin copia. */
export async function programarRecordatorio(db: SQLiteDatabase) {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_RECORDATORIO).catch(() => {});
    if (!(await hayDatos(db))) return;

    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const ultimo = await leerConfigTexto(db, K_ULTIMO);
    let cuando = deTexto(ultimo ? sumarDias(ultimo, DIAS_AVISO) : hoy());
    cuando.setHours(20, 0, 0, 0);
    if (cuando.getTime() <= Date.now() + 60_000) {
      // ya venció: avisar mañana a las 20 (se vuelve a calcular cada vez que abre la app)
      cuando = deTexto(sumarDias(hoy(), 1));
      cuando.setHours(20, 0, 0, 0);
    }
    await Notifications.scheduleNotificationAsync({
      identifier: ID_RECORDATORIO,
      content: {
        title: 'Marcianitos: hacé tu copia de seguridad',
        body: 'Hace una semana que no guardás una copia de tus datos. Entrá a Más → Respaldo.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
    });
  } catch {
    // Un fallo de notificaciones nunca debe romper la app.
  }
}

/** Para los nombres de archivo temporales del respaldo manual. */
export function archivoTemporal(nombre: string): File {
  return new File(Paths.cache, nombre);
}
