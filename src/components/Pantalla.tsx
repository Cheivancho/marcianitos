import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme';

type Props = {
  titulo: string;
  subtitulo?: string;
  children?: ReactNode;
};

export function Pantalla({ titulo, subtitulo, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.marca}>Marcianitos</Text>
        <Text style={styles.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        <View style={styles.cuerpo}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.beigeClaro },
  contenido: { padding: space.m, paddingBottom: space.xl },
  marca: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.rosa,
    textTransform: 'uppercase',
  },
  titulo: { fontSize: 32, fontWeight: '800', color: colors.texto, marginTop: space.xs },
  subtitulo: { fontSize: 16, color: colors.textoSuave, marginTop: space.xs },
  cuerpo: {
    marginTop: space.l,
    backgroundColor: colors.blanco,
    borderRadius: radius.medio,
    padding: space.l,
    minHeight: 160,
  },
});
