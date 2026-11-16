import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { estadoBolsitas } from '@/db/negocio';

const CANAL = 'avisos';

// Que la notificación también se vea con la app abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Si quedan pocas bolsitas, avisa con una notificación del celu (sin internet, es local). */
export async function avisarSiPocas(db: SQLiteDatabase) {
  try {
    const e = await estadoBolsitas(db);
    if (e.quedan > e.alerta) return;

    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return; // si no dio permiso, igual ve el aviso dentro de la app

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Avisos de stock',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Marcianitos: ¡quedan pocas bolsitas!',
        body: `Te quedan ${Math.max(0, e.quedan)} bolsitas. Hay que comprar más.`,
      },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
  } catch {
    // Un fallo de notificaciones nunca debe romper la app.
  }
}
