import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, space } from '@/theme';

type Props = TextInputProps & { etiqueta?: string };

export function Campo({ etiqueta, style, ...resto }: Props) {
  return (
    <View style={{ gap: space.xs }}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
      <TextInput placeholderTextColor={colors.textoSuave} style={[styles.input, style]} {...resto} />
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  input: {
    minHeight: 56,
    borderRadius: radius.chico,
    borderWidth: 2,
    borderColor: colors.rosaClaro,
    backgroundColor: colors.beigeClaro,
    paddingHorizontal: space.m,
    fontSize: 18,
    color: colors.texto,
  },
});
