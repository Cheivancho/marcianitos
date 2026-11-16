import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '@/theme';

type Props = { valor: number; onCambiar: (n: number) => void; paso?: number };

/** − 0 + : para cantidades sin escribir. */
export function Contador({ valor, onCambiar, paso = 1 }: Props) {
  return (
    <View style={styles.fila}>
      <Pressable style={styles.boton} onPress={() => onCambiar(Math.max(0, valor - paso))}>
        <Text style={styles.signo}>−</Text>
      </Pressable>
      <Text style={styles.valor}>{valor}</Text>
      <Pressable style={styles.boton} onPress={() => onCambiar(valor + paso)}>
        <Text style={styles.signo}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  boton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.rosaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signo: { fontSize: 28, fontWeight: '800', color: colors.rosaOscuro, marginTop: -2 },
  valor: { minWidth: 36, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.texto },
});
