import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pantalla } from '@/components/Pantalla';
import { BUILD_ACTUAL } from '@/lib/actualizar';
import { colors, radius, space } from '@/theme';

type Opcion = {
  titulo: string;
  detalle: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  ruta?: Href; // sin ruta = todavía no está hecha
};

const opciones: Opcion[] = [
  { titulo: 'Sabores', detalle: 'Agregar, cambiar o esconder sabores', icono: 'ice-cream-outline', ruta: '/mas/sabores' },
  { titulo: 'Precios', detalle: 'Precio por unidad y descuentos', icono: 'pricetag-outline', ruta: '/mas/precios' },
  { titulo: 'Compras', detalle: 'Lo que compraste para hacer jugitos', icono: 'cart-outline', ruta: '/mas/compras' as Href },
  { titulo: 'Bolsitas', detalle: 'Tandas y aviso de stock', icono: 'cube-outline', ruta: '/mas/bolsitas' as Href },
  { titulo: 'Respaldo', detalle: 'Guardar una copia de tus datos', icono: 'cloud-upload-outline', ruta: '/mas/respaldo' as Href },
];

export default function Mas() {
  const router = useRouter();

  return (
    <Pantalla titulo="Más" subtitulo="Compras, bolsitas, sabores y respaldo.">
      <View style={{ gap: space.s }}>
        {opciones.map((o) => {
          const lista = !!o.ruta;
          return (
            <Pressable
              key={o.titulo}
              disabled={!lista}
              onPress={() => o.ruta && router.push(o.ruta)}
              android_ripple={{ color: colors.rosaClaro }}
              style={[styles.fila, !lista && { opacity: 0.5 }]}
            >
              <Ionicons name={o.icono} size={30} color={colors.rosa} />
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{o.titulo}</Text>
                <Text style={styles.detalle}>{lista ? o.detalle : 'Próximamente'}</Text>
              </View>
              {lista ? <Ionicons name="chevron-forward" size={24} color={colors.textoSuave} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.version}>Marcianitos · versión {BUILD_ACTUAL ? `build ${BUILD_ACTUAL}` : 'de desarrollo'}</Text>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 68,
    padding: space.m,
    borderRadius: radius.medio,
    backgroundColor: colors.rosaSuave,
  },
  titulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  detalle: { fontSize: 14, color: colors.textoSuave, marginTop: 2 },
  version: { fontSize: 13, color: colors.textoSuave, textAlign: 'center', marginTop: space.m },
});
