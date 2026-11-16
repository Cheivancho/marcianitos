import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const REPO = 'Cheivancho/marcianitos';

/** Número de compilación de ESTA app: lo pone GitHub Actions al compilar. En desarrollo no existe. */
export const BUILD_ACTUAL = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER) || 0;

export type Novedad = { build: number; urlApk: string };

/**
 * Pregunta a GitHub si hay un APK más nuevo. No envía ningún dato de ella ni de sus clientes.
 * Devuelve null si no hay novedades, si no hay internet o si algo falla.
 */
export async function buscarActualizacion(): Promise<Novedad | null> {
  if (!BUILD_ACTUAL) return null; // desarrollo (Expo Go): no aplica
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/ultima`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return null;
    const datos = await r.json();
    const build = Number(/build=(\d+)/.exec(String(datos.body ?? ''))?.[1]);
    const apk = (datos.assets ?? []).find((a: { name: string }) => a.name.endsWith('.apk'));
    if (!build || !apk || build <= BUILD_ACTUAL) return null;
    return { build, urlApk: apk.browser_download_url as string };
  } catch {
    return null;
  }
}

/** Baja el APK nuevo y abre el instalador de Android (ella confirma con "Instalar"). */
export async function bajarEInstalar(urlApk: string) {
  const carpeta = new Directory(Paths.cache, 'actualizaciones');
  carpeta.create({ idempotent: true });
  const archivo = await File.downloadFileAsync(urlApk, new File(carpeta, `marcianitos-${Date.now()}.apk`));
  const uri = await getContentUriAsync(archivo.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: uri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
