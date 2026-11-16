import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fechaAmigable, hoy, sumarDias } from '@/lib/fechas';
import { colors, space } from '@/theme';

type Props = { valor: string; onCambiar: (f: string) => void };

/** ◀ jue 19/11 ▶ — cambia de a un día. */
export function SelectorFecha({ valor, onCambiar }: Props) {
  return (
    <View style={styles.fila}>
      <Pressable style={styles.flecha} onPress={() => onCambiar(sumarDias(valor, -1))}>
        <Text style={styles.signo}>◀</Text>
      </Pressable>
      <Pressable style={styles.centro} onPress={() => onCambiar(hoy())}>
        <Text style={styles.fecha}>{fechaAmigable(valor)}</Text>
      </Pressable>
      <Pressable style={styles.flecha} onPress={() => onCambiar(sumarDias(valor, 1))}>
        <Text style={styles.signo}>▶</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  flecha: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.rosaSuave, alignItems: 'center', justifyContent: 'center' },
  signo: { fontSize: 18, color: colors.rosaOscuro },
  centro: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: colors.beigeClaro, alignItems: 'center', justifyContent: 'center' },
  fecha: { fontSize: 18, fontWeight: '800', color: colors.texto },
});
