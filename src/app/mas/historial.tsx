import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SelectorFecha } from '@/components/SelectorFecha';
import { detalleDia, diasConMovimiento } from '@/db/negocio';
import { fechaAmigable, fechaCorta, hoy } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

type Dia = Awaited<ReturnType<typeof diasConMovimiento>>[number];
type Detalle = Awaited<ReturnType<typeof detalleDia>>;

const ESTADO = { por_preparar: 'por preparar', preparado: 'preparado', entregado: 'entregado' } as const;
const METODO = { efectivo: 'Efectivo', transferencia: 'Transferencia' } as const;

export default function Historial() {
  const db = useSQLiteContext();
  const [fecha, setFecha] = useState(hoy());
  const [dias, setDias] = useState<Dia[]>([]);
  const [cuantos, setCuantos] = useState(30);
  const [detalle, setDetalle] = useState<Detalle | null>(null);

  const cargar = useCallback(async () => {
    const [d, det] = await Promise.all([diasConMovimiento(db, cuantos), detalleDia(db, fecha)]);
    setDias(d);
    setDetalle(det);
  }, [db, fecha, cuantos]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const ganado = (detalle?.ventas.reduce((a, v) => a + v.total, 0) ?? 0) + (detalle?.cobros.reduce((a, c) => a + c.monto, 0) ?? 0);
  const gastado = detalle?.compras.reduce((a, c) => a + c.precio_total, 0) ?? 0;
  const balance = ganado - gastado;
  const vacio =
    detalle !== null && !detalle.ventas.length && !detalle.cobros.length && !detalle.compras.length && !detalle.entregas.length;
  const unidades = detalle?.ventas.reduce((a, v) => a + v.n, 0) ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Elegí un día</Text>
        <SelectorFecha valor={fecha} onCambiar={setFecha} />
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>{fechaAmigable(fecha)}</Text>
        {vacio ? <Text style={styles.detalle}>Ese día no hay nada anotado.</Text> : null}

        {!vacio ? (
          <View style={styles.numeros}>
            <Numero titulo="Ganado" valor={pesos(ganado)} color={colors.verde} />
            <Numero titulo="Gastado" valor={pesos(gastado)} color={colors.rojo} />
            <Numero titulo="Balance" valor={pesos(balance)} color={balance >= 0 ? colors.verde : colors.rojo} />
          </View>
        ) : null}

        {detalle && detalle.porMetodo.length > 0 ? (
          <Text style={styles.detalle}>{detalle.porMetodo.map((m) => `${METODO[m.metodo]} ${pesos(m.total)}`).join(' · ')}</Text>
        ) : null}

        {detalle && detalle.ventas.length > 0 ? (
          <Bloque titulo={`Ventas por unidad (${unidades} jugitos)`}>
            {detalle.ventas.map((v) => (
              <Linea key={`${v.nombre}-${v.tipo}`} izq={`${v.n} × ${v.nombre} (${v.tipo})`} der={pesos(v.total)} />
            ))}
          </Bloque>
        ) : null}

        {detalle && detalle.cobros.length > 0 ? (
          <Bloque titulo="Cobros de pedidos">
            {detalle.cobros.map((c, i) => (
              <Linea key={i} izq={`${c.cliente} · ${METODO[c.metodo]}`} der={pesos(c.monto)} />
            ))}
          </Bloque>
        ) : null}

        {detalle && detalle.compras.length > 0 ? (
          <Bloque titulo="Compras de insumos">
            {detalle.compras.map((c, i) => (
              <Linea key={i} izq={`${c.insumo} (${Math.round(c.cantidad * 100) / 100})`} der={c.sin_precio && c.precio_total === 0 ? 'en el total' : pesos(c.precio_total)} />
            ))}
          </Bloque>
        ) : null}

        {detalle && detalle.entregas.length > 0 ? (
          <Bloque titulo="Pedidos para entregar ese día">
            {detalle.entregas.map((e, i) => (
              <Linea key={i} izq={`${e.cliente} · ${e.unidades} jugitos`} der={ESTADO[e.estado]} />
            ))}
          </Bloque>
        ) : null}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Días con movimiento</Text>
        {dias.length === 0 ? <Text style={styles.detalle}>Todavía no hay movimientos.</Text> : null}
        {dias.map((d) => {
          const b = d.ganado - d.gastado;
          return (
            <Pressable key={d.fecha} onPress={() => setFecha(d.fecha)} style={[styles.dia, d.fecha === fecha && styles.diaActivo]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diaFecha}>{fechaCorta(d.fecha)}</Text>
                <Text style={styles.detalle}>
                  Ganó {pesos(d.ganado)} · Gastó {pesos(d.gastado)}
                </Text>
              </View>
              <Text style={[styles.diaBalance, { color: b >= 0 ? colors.verde : colors.rojo }]}>{pesos(b)}</Text>
            </Pressable>
          );
        })}
        {dias.length >= cuantos ? (
          <Pressable onPress={() => setCuantos((c) => c + 30)} style={styles.mas}>
            <Text style={styles.masTexto}>Ver días anteriores</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Numero({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.detalle}>{titulo}</Text>
      <Text style={[styles.numero, { color }]} adjustsFontSizeToFit numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2, marginTop: space.s }}>
      <Text style={styles.bloque}>{titulo}</Text>
      {children}
    </View>
  );
}

function Linea({ izq, der }: { izq: string; der: string }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.lineaIzq}>{izq}</Text>
      <Text style={styles.lineaDer}>{der}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl * 2 },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 19, fontWeight: '800', color: colors.rosaOscuro },
  detalle: { fontSize: 14, color: colors.textoSuave },
  numeros: { flexDirection: 'row', gap: space.s },
  numero: { fontSize: 22, fontWeight: '800' },
  bloque: { fontSize: 15, fontWeight: '800', color: colors.texto },
  linea: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.beigeClaro },
  lineaIzq: { flex: 1, fontSize: 16, color: colors.texto },
  lineaDer: { fontSize: 16, fontWeight: '800', color: colors.texto },
  dia: { flexDirection: 'row', alignItems: 'center', gap: space.s, padding: space.s + 2, borderRadius: radius.chico, backgroundColor: colors.beigeClaro },
  diaActivo: { borderWidth: 2, borderColor: colors.rosa },
  diaFecha: { fontSize: 17, fontWeight: '800', color: colors.texto },
  diaBalance: { fontSize: 18, fontWeight: '800' },
  mas: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  masTexto: { fontSize: 16, fontWeight: '800', color: colors.rosaOscuro },
});
