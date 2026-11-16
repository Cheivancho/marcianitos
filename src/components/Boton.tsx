import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/theme';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'suave';
  chico?: boolean;
  deshabilitado?: boolean;
};

export function Boton({ titulo, onPress, variante = 'primario', chico, deshabilitado }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      android_ripple={{ color: colors.rosaClaro }}
      style={({ pressed }) => [
        styles.base,
        chico ? styles.chico : styles.grande,
        variante === 'primario' && styles.primario,
        variante === 'secundario' && styles.secundario,
        variante === 'suave' && styles.suave,
        pressed && { opacity: 0.8 },
        deshabilitado && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[
          styles.texto,
          chico && { fontSize: 15 },
          variante === 'primario' ? { color: colors.blanco } : { color: colors.rosaOscuro },
        ]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.medio },
  grande: { minHeight: 56, paddingHorizontal: 20 },
  chico: { minHeight: 44, paddingHorizontal: 14 },
  primario: { backgroundColor: colors.rosa },
  secundario: { backgroundColor: colors.blanco, borderWidth: 2, borderColor: colors.rosa },
  suave: { backgroundColor: colors.rosaSuave },
  texto: { fontSize: 18, fontWeight: '800' },
});
