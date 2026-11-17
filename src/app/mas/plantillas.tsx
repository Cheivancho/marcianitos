import { Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { DATOS_POR_DEFECTO, PLANTILLAS, jugitosIniciales, valoresIniciales } from '@/plantillas/catalogo';
import { Lienzo } from '@/plantillas/Lienzo';

export default function Plantillas() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const ancho = (width - space.m * 2 - space.m) / 2;
  const datos = useMemo(
    () => PLANTILLAS.map((p) => ({ p, valores: valoresIniciales(p, DATOS_POR_DEFECTO), jugitos: jugitosIniciales(p) })),
    [],
  );

  return (
    <FlatList
      data={datos}
      numColumns={2}
      keyExtractor={(x) => String(x.p.id)}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      contentContainerStyle={styles.lista}
      columnWrapperStyle={{ gap: space.m }}
      ListHeaderComponent={
        <Text style={styles.ayuda}>Elegí una plantilla, cambiale los textos y compartila como imagen (horizontal, historias o 4:3).</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.tarjeta, { width: ancho }]}
          onPress={() => router.push({ pathname: '/mas/plantilla', params: { id: String(item.p.id) } } as unknown as Href)}
          android_ripple={{ color: colors.rosaClaro }}
        >
          <View style={styles.miniatura}>
            <Lienzo plantilla={item.p} valores={item.valores} fondo={item.p.fondo} jugitos={item.jugitos} foto={null} medida="4:3" ancho={ancho - 12} />
          </View>
          <Text style={styles.nombre} numberOfLines={2}>{item.p.nombre}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: space.m, paddingBottom: space.xl, gap: space.m },
  ayuda: { fontSize: 15, color: colors.textoSuave, marginBottom: space.s },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: 6, gap: 6 },
  miniatura: { borderRadius: radius.chico, overflow: 'hidden' },
  nombre: { fontSize: 14, fontWeight: '800', color: colors.texto, paddingHorizontal: 4, paddingBottom: 4, minHeight: 38 },
});
