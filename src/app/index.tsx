import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chips } from '@/components/Chips';
import { Pantalla } from '@/components/Pantalla';
import { estadoBolsitas, EstadoBolsitas, resumen } from '@/db/negocio';
import { bajarEInstalar, buscarActualizacion, Novedad } from '@/lib/actualizar';
import { Periodo, rangoDe } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { copiaAutomaticaSiToca, necesitaAviso, programarRecordatorio } from '@/lib/respaldo';
import { colors, radius, space } from '@/theme';

type Datos = Awaited<ReturnType<typeof resumen>>;

// La copia automática y el recordatorio se revisan una vez cada vez que se abre la app.
let revisadoEstaSesion = false;

export default function Inicio() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [bolsitas, setBolsitas] = useState<EstadoBolsitas | null>(null);
  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [bajando, setBajando] = useState(false);
  const [sinCopia, setSinCopia] = useState<{ dias: number | null } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const { desde, hasta } = rangoDe(periodo);
      resumen(db, desde, hasta).then(setDatos);
      estadoBolsitas(db).then(setBolsitas);
      buscarActualizacion().then(setNovedad);
      (async () => {
        if (!revisadoEstaSesion) {
          revisadoEstaSesion = true;
          await copiaAutomaticaSiToca(db);
          await programarRecordatorio(db);
        }
        setSinCopia(await necesitaAviso(db));
      })();
    }, [db, periodo]),
  );

  const balance = datos ? datos.ganado - datos.perdido : 0;
  const maximo = datos?.ranking[0]?.n ?? 1;
  // Si todavía no cargó ninguna compra ni tanda de bolsitas, no avisa (no hay stock registrado).
  const pocas = bolsitas !== null && (bolsitas.comprados > 0 || bolsitas.hechos > 0) && bolsitas.quedan <= bolsitas.alerta;

  return (
    <Pantalla titulo="Inicio">
      <View style={{ gap: space.m }}>
        <Chips
          valor={periodo}
          onCambiar={setPeriodo}
          opciones={[
            { valor: 'hoy', titulo: 'Hoy' },
            { valor: 'semana', titulo: 'Esta semana' },
            { valor: 'mes', titulo: 'Este mes' },
          ]}
        />

        {novedad ? (
          <Pressable
            disabled={bajando}
            onPress={async () => {
              setBajando(true);
              try {
                await bajarEInstalar(novedad.urlApk);
              } catch {
                Alert.alert('No se pudo actualizar', 'Revisá tu internet y probá de nuevo.');
              } finally {
                setBajando(false);
              }
            }}
            style={styles.novedad}
          >
            {bajando ? <ActivityIndicator color={colors.blanco} /> : null}
            <Text style={styles.novedadTexto}>{bajando ? 'Bajando la versión nueva...' : '✨ Hay una versión nueva. Tocá para actualizar'}</Text>
          </Pressable>
        ) : null}

        {sinCopia ? (
          <Pressable onPress={() => router.push('/mas/respaldo' as never)} style={styles.copia}>
            <Text style={styles.copiaTexto}>
              💾 {sinCopia.dias === null ? 'Todavía no hiciste una copia de seguridad.' : `Hace ${sinCopia.dias} días que no hacés una copia de seguridad.`} Tocá acá.
            </Text>
          </Pressable>
        ) : null}

        {pocas ? (
          <Pressable onPress={() => router.push('/mas/bolsitas' as never)} style={styles.aviso}>
            <Text style={styles.avisoTexto}>⚠️ Quedan {Math.max(0, bolsitas!.quedan)} bolsitas. ¡Hay que comprar!</Text>
          </Pressable>
        ) : null}

        <View style={[styles.numero, { backgroundColor: '#E6F5EC' }]}>
          <Text style={styles.etiqueta}>GANADO</Text>
          <Text style={[styles.grande, { color: colors.verde }]} adjustsFontSizeToFit numberOfLines={1}>
            {pesos(datos?.ganado ?? 0)}
          </Text>
        </View>

        <View style={[styles.numero, { backgroundColor: '#FDEAEA' }]}>
          <Text style={styles.etiqueta}>PERDIDO (gastos)</Text>
          <Text style={[styles.grande, { color: colors.rojo }]} adjustsFontSizeToFit numberOfLines={1}>
            {pesos(datos?.perdido ?? 0)}
          </Text>
        </View>

        <View style={styles.balance}>
          <Text style={styles.etiqueta}>BALANCE</Text>
          <Text style={[styles.balanceNumero, { color: balance >= 0 ? colors.verde : colors.rojo }]} adjustsFontSizeToFit numberOfLines={1}>
            {balance > 0 ? '+' : ''}
            {pesos(balance)}
          </Text>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Sabores más vendidos</Text>
          {datos && datos.ranking.length === 0 ? <Text style={styles.detalle}>Todavía no vendiste nada en este período.</Text> : null}
          {datos?.ranking.map((r, i) => (
            <View key={`${r.nombre}-${r.tipo}`} style={{ gap: 4 }}>
              <View style={styles.filaRanking}>
                <Text style={styles.puesto}>{i + 1}</Text>
                <Text style={styles.nombre} numberOfLines={1}>
                  {r.nombre} <Text style={styles.detalle}>({r.tipo})</Text>
                </Text>
                <Text style={styles.cantidad}>{r.n}</Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barra, { width: `${Math.max(4, (r.n / maximo) * 100)}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.push('/clientes')} style={styles.deudas}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Te deben</Text>
            <Text style={styles.detalle}>Tocá para ver quién</Text>
          </View>
          <Text style={[styles.deudaNumero, (datos?.deuda ?? 0) === 0 && { color: colors.verde }]}>{pesos(datos?.deuda ?? 0)}</Text>
        </Pressable>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  novedad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.s, backgroundColor: colors.rosa, borderRadius: radius.medio, padding: space.m, minHeight: 56 },
  novedadTexto: { fontSize: 17, fontWeight: '800', color: colors.blanco, textAlign: 'center' },
  copia: { backgroundColor: colors.beige, borderRadius: radius.medio, padding: space.m, borderWidth: 2, borderColor: colors.rosa },
  copiaTexto: { fontSize: 16, fontWeight: '800', color: colors.texto, textAlign: 'center' },
  aviso: { backgroundColor: '#FFE9E9', borderWidth: 2, borderColor: colors.rojo, borderRadius: radius.medio, padding: space.m },
  avisoTexto: { fontSize: 17, fontWeight: '800', color: colors.rojo, textAlign: 'center' },
  numero: { borderRadius: radius.medio, padding: space.m, alignItems: 'center' },
  etiqueta: { fontSize: 15, fontWeight: '800', letterSpacing: 1, color: colors.textoSuave },
  grande: { fontSize: 52, fontWeight: '800', alignSelf: 'stretch', textAlign: 'center' },
  balance: { alignItems: 'center', backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m },
  balanceNumero: { fontSize: 38, fontWeight: '800', alignSelf: 'stretch', textAlign: 'center' },
  tarjeta: { backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 19, fontWeight: '800', color: colors.rosaOscuro },
  detalle: { fontSize: 14, color: colors.textoSuave },
  filaRanking: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  puesto: { width: 24, fontSize: 18, fontWeight: '800', color: colors.rosa },
  nombre: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.texto },
  cantidad: { fontSize: 18, fontWeight: '800', color: colors.texto },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: colors.beige },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.rosa },
  deudas: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m },
  deudaNumero: { fontSize: 28, fontWeight: '800', color: colors.rojo },
});
