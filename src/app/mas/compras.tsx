import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Chips } from '@/components/Chips';
import { SelectorFecha } from '@/components/SelectorFecha';
import { Ventana } from '@/components/Ventana';
import { borrarCompra, comprasPorInsumo, crearCompra, crearInsumo, listarCompras, listarInsumos } from '@/db/negocio';
import type { Compra, Insumo } from '@/db/tipos';
import { fechaCorta, hoy, Periodo, rangoDe } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

type Resumen = Awaited<ReturnType<typeof comprasPorInsumo>>;

/** Copia la foto a una carpeta propia de la app para que no se pierda. */
function guardarFoto(uriOrigen: string): string {
  const carpeta = new Directory(Paths.document, 'tickets');
  carpeta.create({ idempotent: true });
  const destino = new File(carpeta, `ticket-${Date.now()}.jpg`);
  new File(uriOrigen).copy(destino);
  return destino.uri;
}

function numero(t: string): number {
  return Number(t.replace(',', '.'));
}

export default function Compras() {
  const db = useSQLiteContext();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [compras, setCompras] = useState<Compra[]>([]);
  const [porInsumo, setPorInsumo] = useState<Resumen>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  // Formulario
  const [abierta, setAbierta] = useState(false);
  const [insumoId, setInsumoId] = useState<number | null>(null);
  const [otroInsumo, setOtroInsumo] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [foto, setFoto] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<Compra | null>(null);

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoDe(periodo);
    const [c, r, i] = await Promise.all([listarCompras(db, desde, hasta), comprasPorInsumo(db, desde, hasta), listarInsumos(db)]);
    setCompras(c);
    setPorInsumo(r);
    setInsumos(i);
  }, [db, periodo]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function abrirFormulario() {
    setInsumoId(null);
    setOtroInsumo(null);
    setCantidad('');
    setPrecio('');
    setFecha(hoy());
    setFoto(null);
    setAbierta(true);
  }

  async function sacarFoto(camara: boolean) {
    const permiso = camara ? await ImagePicker.requestCameraPermissionsAsync() : null;
    if (permiso && !permiso.granted) {
      Alert.alert('Sin permiso', 'Para sacar la foto hay que permitir la cámara. También podés elegir una foto de la galería.');
      return;
    }
    const r = camara
      ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!r.canceled && r.assets[0]) {
      try {
        setFoto(guardarFoto(r.assets[0].uri));
      } catch {
        Alert.alert('No se pudo guardar la foto', 'Probá de nuevo.');
      }
    }
  }

  async function agregarInsumo() {
    const nombre = (otroInsumo ?? '').trim();
    if (!nombre) return;
    const existente = insumos.find((i) => i.nombre.toLowerCase() === nombre.toLowerCase());
    const id = existente ? existente.id : await crearInsumo(db, nombre);
    setInsumos(await listarInsumos(db));
    setInsumoId(id);
    setOtroInsumo(null);
  }

  async function guardar() {
    const cant = numero(cantidad);
    const total = Number(precio);
    if (insumoId === null) return Alert.alert('Falta el insumo', 'Elegí qué compraste.');
    if (!(cant > 0)) return Alert.alert('Falta la cantidad', 'Escribí cuántos compraste.');
    if (!(total > 0)) return Alert.alert('Falta el precio', 'Escribí cuánto pagaste en total.');
    await crearCompra(db, { insumoId, cantidad: cant, precioTotal: total, fecha, foto });
    setAbierta(false);
    await cargar();
  }

  function borrar(c: Compra) {
    Alert.alert('¿Borrar esta compra?', `${c.insumo} · ${pesos(c.precio_total)}`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await borrarCompra(db, c.id);
          setDetalle(null);
          await cargar();
        },
      },
    ]);
  }

  const total = compras.reduce((a, c) => a + c.precio_total, 0);
  const elegido = insumos.find((i) => i.id === insumoId);

  return (
    <>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Chips
          valor={periodo}
          onCambiar={setPeriodo}
          opciones={[
            { valor: 'hoy', titulo: 'Hoy' },
            { valor: 'semana', titulo: 'Esta semana' },
            { valor: 'mes', titulo: 'Este mes' },
          ]}
        />

        <View style={styles.total}>
          <Text style={styles.totalTitulo}>Gastaste en insumos</Text>
          <Text style={styles.totalNumero}>{pesos(total)}</Text>
        </View>

        <Boton titulo="+ Registrar compra" onPress={abrirFormulario} />

        {porInsumo.length > 0 ? (
          <View style={styles.tarjeta}>
            <Text style={styles.titulo}>Cuánto compraste de cada cosa</Text>
            {porInsumo.map((r) => (
              <View key={r.insumo} style={styles.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{r.insumo}</Text>
                  <Text style={styles.detalle}>
                    {r.compras} {r.compras === 1 ? 'compra' : 'compras'} · cantidad {Math.round(r.cantidad * 100) / 100}
                    
                  </Text>
                </View>
                <Text style={styles.monto}>{pesos(r.total)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Compras</Text>
          {compras.length === 0 ? <Text style={styles.detalle}>No hay compras en este período.</Text> : null}
          {compras.map((c) => (
            <View key={c.id} style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{c.insumo}</Text>
                <Text style={styles.detalle}>
                  {fechaCorta(c.fecha)} · cantidad {Math.round(c.cantidad * 100) / 100}
                  {c.foto ? ' · 📷' : ''}
                </Text>
              </View>
              <Text style={styles.monto}>{pesos(c.precio_total)}</Text>
              <Boton titulo="Ver" chico variante="suave" onPress={() => setDetalle(c)} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Ventana visible={abierta} titulo="Nueva compra" onCerrar={() => setAbierta(false)}>
        <Text style={styles.etiqueta}>¿Qué compraste?</Text>
        <Chips valor={insumoId} onCambiar={setInsumoId} opciones={insumos.map((i) => ({ valor: i.id, titulo: i.nombre }))} />
        {otroInsumo === null ? (
          <Boton titulo="+ Otro insumo" variante="suave" chico onPress={() => setOtroInsumo('')} />
        ) : (
          <View style={{ gap: space.s }}>
            <Campo value={otroInsumo} onChangeText={setOtroInsumo} placeholder="Nombre del insumo" maxLength={40} autoFocus onSubmitEditing={agregarInsumo} />
            <Boton titulo="Agregar insumo" chico onPress={agregarInsumo} />
          </View>
        )}
        <Campo
          etiqueta={elegido?.es_bolsitas ? 'Cantidad de bolsitas (contá las que trajo el paquete)' : 'Cantidad (kilos, unidades, paquetes...)'}
          value={cantidad}
          onChangeText={(t) => setCantidad(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          maxLength={7}
        />
        <Campo etiqueta="Precio total pagado" value={precio} onChangeText={(t) => setPrecio(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={8} placeholder="$" />
        <Text style={styles.etiqueta}>¿Cuándo?</Text>
        <SelectorFecha valor={fecha} onCambiar={setFecha} />
        <Text style={styles.etiqueta}>Foto del ticket (opcional)</Text>
        {foto ? <Image source={{ uri: foto }} style={styles.foto} resizeMode="cover" /> : null}
        <View style={styles.botones}>
          <View style={{ flex: 1 }}>
            <Boton titulo="📷 Sacar foto" variante="suave" chico onPress={() => sacarFoto(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton titulo="Galería" variante="suave" chico onPress={() => sacarFoto(false)} />
          </View>
        </View>
        <View style={styles.botones}>
          <View style={{ flex: 1 }}>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setAbierta(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton titulo="Guardar" onPress={guardar} />
          </View>
        </View>
      </Ventana>

      <Ventana visible={detalle !== null} titulo={detalle?.insumo ?? ''} onCerrar={() => setDetalle(null)}>
        {detalle ? (
          <>
            <Text style={styles.detalle}>
              {fechaCorta(detalle.fecha)} · cantidad {Math.round(detalle.cantidad * 100) / 100} · {pesos(detalle.precio_total)}
            </Text>
            {detalle.foto ? <Image source={{ uri: detalle.foto }} style={styles.fotoGrande} resizeMode="contain" /> : <Text style={styles.detalle}>Sin foto del ticket.</Text>}
            <Boton titulo="Borrar compra" variante="secundario" onPress={() => borrar(detalle)} />
            <Boton titulo="Cerrar" onPress={() => setDetalle(null)} />
          </>
        ) : null}
      </Ventana>
    </>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl * 2 },
  total: { alignItems: 'center', backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m },
  totalTitulo: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  totalNumero: { fontSize: 36, fontWeight: '800', color: colors.rojo },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 19, fontWeight: '800', color: colors.rosaOscuro },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.beigeClaro },
  nombre: { fontSize: 17, fontWeight: '700', color: colors.texto },
  detalle: { fontSize: 14, color: colors.textoSuave },
  monto: { fontSize: 17, fontWeight: '800', color: colors.texto },
  etiqueta: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  botones: { flexDirection: 'row', gap: space.s },
  foto: { width: '100%', height: 160, borderRadius: radius.chico },
  fotoGrande: { width: '100%', height: 380, borderRadius: radius.chico, backgroundColor: colors.beigeClaro },
});
