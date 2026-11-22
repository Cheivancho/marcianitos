import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Chips } from '@/components/Chips';
import { SelectorFecha } from '@/components/SelectorFecha';
import { Ventana } from '@/components/Ventana';
import { borrarCompra, borrarLote, comprasPorInsumo, crearCompraVarios, crearInsumo, listarCompras, listarInsumos } from '@/db/negocio';
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

type Elegido = { cantidad: string; precio: string };

/** Agrupa las filas de una misma compra (mismo lote) para mostrarlas como una sola. */
function agrupar(compras: Compra[]): Compra[][] {
  const grupos: Compra[][] = [];
  const porLote = new Map<number, Compra[]>();
  for (const c of compras) {
    if (c.lote === null) {
      grupos.push([c]);
    } else {
      let g = porLote.get(c.lote);
      if (!g) {
        g = [];
        porLote.set(c.lote, g);
        grupos.push(g);
      }
      g.push(c);
    }
  }
  return grupos;
}

function nombreGrupo(g: Compra[]): string {
  return g.map((c) => c.insumo).join(', ');
}

export default function Compras() {
  const db = useSQLiteContext();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [compras, setCompras] = useState<Compra[]>([]);
  const [porInsumo, setPorInsumo] = useState<Resumen>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  // Formulario
  const [abierta, setAbierta] = useState(false);
  const [elegidos, setElegidos] = useState<Record<number, Elegido>>({});
  const [otroInsumo, setOtroInsumo] = useState<string | null>(null);
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [foto, setFoto] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<Compra[] | null>(null);

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
    setElegidos({});
    setOtroInsumo(null);
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
    setElegidos((e) => (e[id] ? e : { ...e, [id]: { cantidad: '', precio: '' } }));
    setOtroInsumo(null);
  }

  function alternar(id: number) {
    setElegidos((e) => {
      const { [id]: quitado, ...resto } = e;
      return quitado ? resto : { ...e, [id]: { cantidad: '', precio: '' } };
    });
  }

  function cambiar(id: number, campo: keyof Elegido, valor: string) {
    setElegidos((e) => ({ ...e, [id]: { ...e[id], [campo]: valor } }));
  }

  async function guardar() {
    const ids = insumos.filter((i) => elegidos[i.id]).map((i) => i.id);
    if (ids.length === 0) return Alert.alert('Falta el insumo', 'Elegí qué compraste.');
    const items: { insumoId: number; cantidad: number; precio: number | null }[] = [];
    for (const id of ids) {
      const e = elegidos[id];
      const nombre = insumos.find((i) => i.id === id)?.nombre ?? '';
      const cant = numero(e.cantidad);
      if (!(cant > 0)) return Alert.alert('Falta la cantidad', `Escribí cuántos compraste de ${nombre}.`);
      items.push({ insumoId: id, cantidad: cant, precio: e.precio ? Number(e.precio) : null });
    }
    const conPrecio = items.reduce((a, it) => a + (it.precio ?? 0), 0);
    const libres = items.some((it) => it.precio === null);
    const totalPagado = libres ? Number(precio) : conPrecio;
    if (!(totalPagado > 0)) return Alert.alert('Falta el precio', 'Escribí cuánto pagaste en total.');
    if (libres && totalPagado < conPrecio) {
      return Alert.alert('El total no alcanza', `Los precios que pusiste a cada cosa suman ${pesos(conPrecio)}, más que el total.`);
    }
    await crearCompraVarios(db, { items, total: totalPagado, fecha, foto });
    setAbierta(false);
    await cargar();
  }

  function borrar(g: Compra[]) {
    const monto = g.reduce((a, c) => a + c.precio_total, 0);
    Alert.alert('¿Borrar esta compra?', `${nombreGrupo(g)} · ${pesos(monto)}`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (g[0].lote !== null) await borrarLote(db, g[0].lote);
          else await borrarCompra(db, g[0].id);
          setDetalle(null);
          await cargar();
        },
      },
    ]);
  }

  const total = compras.reduce((a, c) => a + c.precio_total, 0);
  const grupos = agrupar(compras);
  const insumosElegidos = insumos.filter((i) => elegidos[i.id]);
  const hayLibres = insumosElegidos.some((i) => !elegidos[i.id].precio);

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
                {r.mixto ? <Text style={styles.detalle}>con otras cosas</Text> : <Text style={styles.monto}>{pesos(r.total)}</Text>}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Compras</Text>
          {compras.length === 0 ? <Text style={styles.detalle}>No hay compras en este período.</Text> : null}
          {grupos.map((g) => (
            <View key={g[0].id} style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{nombreGrupo(g)}</Text>
                <Text style={styles.detalle}>
                  {fechaCorta(g[0].fecha)}
                  {g.length === 1 ? ` · cantidad ${Math.round(g[0].cantidad * 100) / 100}` : ''}
                  {g[0].foto ? ' · 📷' : ''}
                </Text>
              </View>
              <Text style={styles.monto}>{pesos(g.reduce((a, c) => a + c.precio_total, 0))}</Text>
              <Boton titulo="Ver" chico variante="suave" onPress={() => setDetalle(g)} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Ventana visible={abierta} titulo="Nueva compra" onCerrar={() => setAbierta(false)}>
        <Text style={styles.etiqueta}>¿Qué compraste? (podés elegir varias cosas)</Text>
        <View style={styles.chips}>
          {insumos.map((i) => {
            const activo = !!elegidos[i.id];
            return (
              <Pressable key={i.id} onPress={() => alternar(i.id)} style={[styles.chip, activo && styles.chipActivo]}>
                <Text style={[styles.chipTexto, activo && { color: colors.blanco }]}>
                  {activo ? '✓ ' : ''}
                  {i.nombre}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {otroInsumo === null ? (
          <Boton titulo="+ Otro insumo" variante="suave" chico onPress={() => setOtroInsumo('')} />
        ) : (
          <View style={{ gap: space.s }}>
            <Campo value={otroInsumo} onChangeText={setOtroInsumo} placeholder="Nombre del insumo" maxLength={40} autoFocus onSubmitEditing={agregarInsumo} />
            <Boton titulo="Agregar insumo" chico onPress={agregarInsumo} />
          </View>
        )}
        {insumosElegidos.map((i) => (
          <View key={i.id} style={styles.item}>
            <Text style={styles.nombre}>{i.nombre}</Text>
            <Campo
              etiqueta={i.es_bolsitas ? 'Cantidad de bolsitas (contá las que trajo el paquete)' : 'Cantidad (kilos, unidades, paquetes...)'}
              value={elegidos[i.id].cantidad}
              onChangeText={(t) => cambiar(i.id, 'cantidad', t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              maxLength={7}
            />
            {insumosElegidos.length > 1 ? (
              <Campo
                etiqueta="Precio de este (opcional)"
                value={elegidos[i.id].precio}
                onChangeText={(t) => cambiar(i.id, 'precio', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={8}
                placeholder="$"
              />
            ) : null}
          </View>
        ))}
        {hayLibres || insumosElegidos.length === 0 ? (
          <Campo
            etiqueta={insumosElegidos.length > 1 ? 'Precio de todo (total pagado)' : 'Precio total pagado'}
            value={precio}
            onChangeText={(t) => setPrecio(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={8}
            placeholder="$"
          />
        ) : (
          <Text style={styles.detalle}>El total es la suma de los precios de cada cosa.</Text>
        )}
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

      <Ventana visible={detalle !== null} titulo={detalle ? nombreGrupo(detalle) : ''} onCerrar={() => setDetalle(null)}>
        {detalle ? (
          <>
            <Text style={styles.detalle}>
              {fechaCorta(detalle[0].fecha)} · {pesos(detalle.reduce((a, c) => a + c.precio_total, 0))}
            </Text>
            {detalle.map((c) => (
              <View key={c.id} style={styles.fila}>
                <Text style={[styles.nombre, { flex: 1 }]}>{c.insumo}</Text>
                <Text style={styles.detalle}>
                  cantidad {Math.round(c.cantidad * 100) / 100}
                  {detalle.length > 1 && !c.sin_precio ? ` · ${pesos(c.precio_total)}` : ''}
                </Text>
              </View>
            ))}
            {detalle[0].foto ? <Image source={{ uri: detalle[0].foto }} style={styles.fotoGrande} resizeMode="contain" /> : <Text style={styles.detalle}>Sin foto del ticket.</Text>}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.grande, backgroundColor: colors.rosaSuave, alignItems: 'center', justifyContent: 'center' },
  chipActivo: { backgroundColor: colors.rosa },
  chipTexto: { fontSize: 16, fontWeight: '800', color: colors.rosaOscuro },
  item: { gap: space.s, padding: space.s, borderRadius: radius.chico, backgroundColor: colors.beigeClaro },
  foto: { width: '100%', height: 160, borderRadius: radius.chico },
  fotoGrande: { width: '100%', height: 380, borderRadius: radius.chico, backgroundColor: colors.beigeClaro },
});
