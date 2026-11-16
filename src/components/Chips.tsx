import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

type Props<T extends string | number> = {
  opciones: { valor: T; titulo: string }[];
  valor: T | null;
  onCambiar: (v: T) => void;
};

/** Fila de botones tipo "elegí uno". */
export function Chips<T extends string | number>({ opciones, valor, onCambiar }: Props<T>) {
  return (
    <View style={styles.fila}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onCambiar(o.valor)}
            style={[styles.chip, activo && styles.activo]}
          >
            <Text style={[styles.texto, activo && { color: colors.blanco }]}>{o.titulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.grande,
    backgroundColor: colors.rosaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activo: { backgroundColor: colors.rosa },
  texto: { fontSize: 16, fontWeight: '800', color: colors.rosaOscuro },
});
