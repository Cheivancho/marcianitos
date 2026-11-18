import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Chips } from '@/components/Chips';
import { Pantalla } from '@/components/Pantalla';
import { listarPrecios, listarSabores } from '@/db/consultas';
import { cobradoHoyPorMetodo, deshacerUltimaVenta, registrarVenta, stockJugitos, ventasDeHoyPorSabor } from '@/db/negocio';
import type { Metodo, Precios, Sabor } from '@/db/tipos';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

export default function Vender() {
  const db = useSQLiteContext();
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [precios, setPrecios] = useState<Precios[]>([]);
  const [cuentas, setCuentas] = useState<Record<number, number>>({});
  const [cobrado, setCobrado] = useState<Record<string, number>>({});
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const [quedan, setQuedan] = useState<Record<number, number>>({});
  const [hayTandas, setHayTandas] = useState(false);

  const cargar = useCallback(async () => {
    const [s, p, v, c, st] = await Promise.all([
      listarSabores(db),
      listarPrecios(db),
      ventasDeHoyPorSabor(db),
      cobradoHoyPorMetodo(db),
      stockJugitos(db),
    ]);
    setQuedan(Object.fromEntries(st.map((f) => [f.sabor_id, f.quedan])));
    setHayTandas(st.some((f) => f.hechos > 0));
    setSabores(s.filter((x) => x.activo).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'crema' ? -1 : 1)));
    setPrecios(p);
    setCuentas(Object.fromEntries(v.map((f) => [f.sabor_id, f.n])));
    setCobrado(Object.fromEntries(c.map((f) => [f.metodo, f.total])));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const precioDe = (s: Sabor) => precios.find((p) => p.tipo === s.tipo)?.unidad ?? 0;

  async function vender(s: Sabor) {
    // Se actualiza la pantalla al instante y se guarda atrás.
    setCuentas((c) => ({ ...c, [s.id]: (c[s.id] ?? 0) + 1 }));
    setQuedan((q) => ({ ...q, [s.id]: (q[s.id] ?? 0) - 1 }));
    setCobrado((c) => ({ ...c, [metodo]: (c[metodo] ?? 0) + precioDe(s) }));
    await registrarVenta(db, s.id, precioDe(s), metodo);
  }

  async function deshacer() {
    await deshacerUltimaVenta(db);
    await cargar();
  }

  const totalUnidades = Object.values(cuentas).reduce((a, b) => a + b, 0);
  const totalPesos = (cobrado.efectivo ?? 0) + (cobrado.transferencia ?? 0);

  return (
    <Pantalla titulo="Vender" subtitulo="Un toque por jugito vendido.">
      <View style={{ gap: space.m }}>
        <View style={{ gap: space.s }}>
          <Text style={styles.etiqueta}>¿Cómo te pagan?</Text>
          <Chips
            valor={metodo}
            onCambiar={setMetodo}
            opciones={[
              { valor: 'efectivo', titulo: 'Efectivo' },
              { valor: 'transferencia', titulo: 'Transferencia' },
            ]}
          />
        </View>

        <View style={styles.grilla}>
          {sabores.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => vender(s)}
              android_ripple={{ color: colors.rosaClaro }}
              style={[styles.boton, s.tipo === 'agua' && styles.agua]}
            >
              <Text style={styles.tipo}>{s.tipo === 'crema' ? 'CREMA' : 'AGUA'}</Text>
              <Text style={styles.nombre} numberOfLines={2}>
                {s.nombre}
              </Text>
              {hayTandas ? (
                <Text style={[styles.quedan, (quedan[s.id] ?? 0) <= 0 && { color: colors.rojo }]}>Quedan {Math.max(0, quedan[s.id] ?? 0)}</Text>
              ) : null}
              <View style={styles.pie}>
                <Text style={styles.precio}>{pesos(precioDe(s))}</Text>
                <View style={styles.contador}>
                  <Text style={styles.contadorTexto}>{cuentas[s.id] ?? 0}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.resumen}>
          <Text style={styles.resumenTitulo}>Hoy vendiste</Text>
          <Text style={styles.resumenNumero}>
            {totalUnidades} {totalUnidades === 1 ? 'jugito' : 'jugitos'} · {pesos(totalPesos)}
          </Text>
          <Text style={styles.resumenDetalle}>
            Efectivo {pesos(cobrado.efectivo ?? 0)} · Transferencia {pesos(cobrado.transferencia ?? 0)}
          </Text>
        </View>

        <Boton titulo="↩ Deshacer la última venta" variante="secundario" deshabilitado={totalUnidades === 0} onPress={deshacer} />
        <Text style={styles.nota}>Los pedidos grandes se cargan en la pestaña Pedidos.</Text>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  etiqueta: { fontSize: 16, fontWeight: '700', color: colors.textoSuave },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  boton: {
    width: '48.5%',
    minHeight: 120,
    padding: space.m,
    borderRadius: radius.medio,
    backgroundColor: colors.rosaSuave,
    borderWidth: 2,
    borderColor: colors.rosaClaro,
    justifyContent: 'space-between',
  },
  agua: { backgroundColor: colors.beigeClaro, borderColor: colors.beige },
  tipo: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.textoSuave },
  nombre: { fontSize: 19, fontWeight: '800', color: colors.texto, marginTop: 2 },
  quedan: { fontSize: 14, fontWeight: '700', color: colors.textoSuave },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  precio: { fontSize: 16, fontWeight: '700', color: colors.rosaOscuro },
  contador: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 8,
    backgroundColor: colors.rosa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { fontSize: 22, fontWeight: '800', color: colors.blanco },
  resumen: { backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m, alignItems: 'center' },
  resumenTitulo: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  resumenNumero: { fontSize: 24, fontWeight: '800', color: colors.texto },
  resumenDetalle: { fontSize: 14, color: colors.textoSuave, marginTop: 2 },
  nota: { fontSize: 14, color: colors.textoSuave, textAlign: 'center' },
});
