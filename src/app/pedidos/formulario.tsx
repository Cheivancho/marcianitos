import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Chips } from '@/components/Chips';
import { Contador } from '@/components/Contador';
import { SelectorFecha } from '@/components/SelectorFecha';
import { listarPrecios, listarSabores } from '@/db/consultas';
import { borrarPedido, crearCliente, guardarPedido, itemsDePedido, listarClientes, obtenerPedido } from '@/db/negocio';
import type { Cliente, Metodo, Precios, Sabor, TipoJugo } from '@/db/tipos';
import { hoy, sumarDias } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { precioUnitario, totalDeTipo } from '@/lib/precios';
import { colors, radius, space } from '@/theme';

type Sena = 'no' | 'sena' | 'todo';

export default function Formulario() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editando = id ? Number(id) : null;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [precios, setPrecios] = useState<Precios[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<string | null>(null);
  const [fecha, setFecha] = useState(sumarDias(hoy(), 1));
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [manual, setManual] = useState<string | null>(null); // precio final corregido a mano
  const [formaPago, setFormaPago] = useState<Metodo>('efectivo');
  const [sena, setSena] = useState<Sena>('no');
  const [montoSena, setMontoSena] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, s, p] = await Promise.all([listarClientes(db), listarSabores(db), listarPrecios(db)]);
      setClientes(c);
      setPrecios(p);
      if (editando !== null) {
        const ped = await obtenerPedido(db, editando);
        const items = await itemsDePedido(db, editando);
        if (ped) {
          setClienteId(ped.cliente_id);
          setFecha(ped.fecha_entrega);
          setFormaPago(ped.forma_pago);
          setCantidades(Object.fromEntries(items.map((i) => [i.sabor_id, i.cantidad])));
          setManual(String(ped.precio_total));
        }
        // Al editar se muestran también los sabores ocultos que ya tenía el pedido.
        setSabores(s.filter((x) => x.activo || items.some((i) => i.sabor_id === x.id)));
      } else {
        setSabores(s.filter((x) => x.activo));
      }
      setListo(true);
    })();
  }, [db, editando]);

  const porTipo = useMemo(() => {
    const r: Record<TipoJugo, number> = { crema: 0, agua: 0 };
    for (const s of sabores) r[s.tipo] += cantidades[s.id] ?? 0;
    return r;
  }, [sabores, cantidades]);

  const precioDe = (t: TipoJugo) => precios.find((p) => p.tipo === t);
  const calculado = totalDeTipo(precioDe('crema'), porTipo.crema) + totalDeTipo(precioDe('agua'), porTipo.agua);
  const total = manual !== null ? Number(manual) || 0 : calculado;
  const unidades = porTipo.crema + porTipo.agua;

  function cambiarCantidad(sabor: Sabor, n: number) {
    setCantidades((c) => ({ ...c, [sabor.id]: n }));
  }

  async function agregarCliente() {
    const nombre = (nuevoCliente ?? '').trim();
    if (!nombre) return;
    const existente = clientes.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    const cid = existente ? existente.id : await crearCliente(db, nombre);
    setClientes(await listarClientes(db));
    setClienteId(cid);
    setNuevoCliente(null);
  }

  async function guardar() {
    if (clienteId === null) return Alert.alert('Falta el cliente', 'Elegí para quién es el pedido.');
    if (unidades === 0) return Alert.alert('Faltan jugitos', 'Sumá al menos un jugito al pedido.');
    if (total <= 0) return Alert.alert('Revisá el precio', 'El precio del pedido no puede ser cero.');
    let pagoInicial = 0;
    if (editando === null) {
      if (sena === 'todo') pagoInicial = total;
      if (sena === 'sena') {
        pagoInicial = Number(montoSena) || 0;
        if (pagoInicial <= 0 || pagoInicial > total) return Alert.alert('Revisá la seña', 'Escribí cuánto dejó (no más que el total).');
      }
    }
    await guardarPedido(db, {
      id: editando,
      clienteId,
      fechaEntrega: fecha,
      precioTotal: total,
      formaPago,
      items: sabores.map((s) => ({ sabor_id: s.id, cantidad: cantidades[s.id] ?? 0 })),
      sena: pagoInicial,
    });
    router.back();
  }

  function borrar() {
    Alert.alert('¿Borrar el pedido?', 'Se borran también sus pagos. No se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await borrarPedido(db, editando!);
          router.back();
        },
      },
    ]);
  }

  if (!listo) return null;

  function seccionSabores(tipo: TipoJugo) {
    const p = precioDe(tipo);
    const n = porTipo[tipo];
    return (
      <View style={styles.tarjeta} key={tipo}>
        <Text style={styles.titulo}>{tipo === 'crema' ? 'De crema' : 'De agua'}</Text>
        {p ? (
          <Text style={styles.ayuda}>
            {n > 0 ? `${n} → ${pesos(precioUnitario(p, n))} c/u = ${pesos(totalDeTipo(p, n))}` : `Desde ${pesos(p.desde30)} c/u si llevás 30 o más`}
          </Text>
        ) : null}
        {sabores
          .filter((s) => s.tipo === tipo)
          .map((s) => (
            <View key={s.id} style={styles.filaSabor}>
              <Text style={styles.sabor} numberOfLines={2}>
                {s.nombre}
                {!s.activo ? ' (oculto)' : ''}
              </Text>
              <Contador valor={cantidades[s.id] ?? 0} onCambiar={(v) => cambiarCantidad(s, v)} />
            </View>
          ))}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>¿Para quién es?</Text>
        <Chips valor={clienteId} onCambiar={setClienteId} opciones={clientes.filter((c) => c.activo || c.id === clienteId).map((c) => ({ valor: c.id, titulo: c.nombre }))} />
        {nuevoCliente === null ? (
          <Boton titulo="+ Cliente nuevo" variante="suave" chico onPress={() => setNuevoCliente('')} />
        ) : (
          <View style={{ gap: space.s }}>
            <Campo value={nuevoCliente} onChangeText={setNuevoCliente} placeholder="Nombre del cliente" autoFocus maxLength={40} onSubmitEditing={agregarCliente} />
            <View style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Boton titulo="Cancelar" variante="secundario" chico onPress={() => setNuevoCliente(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton titulo="Agregar" chico onPress={agregarCliente} />
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>¿Cuándo se entrega?</Text>
        <SelectorFecha valor={fecha} onCambiar={setFecha} />
      </View>

      {seccionSabores('crema')}
      {seccionSabores('agua')}

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Precio</Text>
        <Text style={styles.ayuda}>
          {unidades} jugitos · calculado {pesos(calculado)}
        </Text>
        <Campo
          etiqueta="Precio final (podés corregirlo)"
          value={manual !== null ? manual : String(calculado)}
          onChangeText={(t) => setManual(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={7}
        />
        {manual !== null && Number(manual) !== calculado ? (
          <Boton titulo={`Volver al precio calculado (${pesos(calculado)})`} variante="suave" chico onPress={() => setManual(null)} />
        ) : null}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Forma de pago</Text>
        <Chips
          valor={formaPago}
          onCambiar={setFormaPago}
          opciones={[
            { valor: 'efectivo', titulo: 'Efectivo' },
            { valor: 'transferencia', titulo: 'Transferencia' },
          ]}
        />
        {editando === null ? (
          <>
            <Text style={[styles.titulo, { marginTop: space.s }]}>¿Ya pagó algo?</Text>
            <Chips
              valor={sena}
              onCambiar={setSena}
              opciones={[
                { valor: 'no', titulo: 'Todavía no' },
                { valor: 'sena', titulo: 'Dejó seña' },
                { valor: 'todo', titulo: 'Pagó todo' },
              ]}
            />
            {sena === 'sena' ? (
              <Campo etiqueta="¿Cuánto dejó?" value={montoSena} onChangeText={(t) => setMontoSena(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={7} placeholder="$" />
            ) : null}
          </>
        ) : (
          <Text style={styles.ayuda}>Los cobros se cargan con el botón "Cobrar" de la lista de pedidos.</Text>
        )}
      </View>

      <View style={styles.total}>
        <Text style={styles.totalTitulo}>Total del pedido</Text>
        <Text style={styles.totalNumero}>{pesos(total)}</Text>
      </View>

      <Boton titulo={editando === null ? 'Guardar pedido' : 'Guardar cambios'} onPress={guardar} />
      {editando !== null ? <Boton titulo="Borrar pedido" variante="secundario" onPress={borrar} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl * 2 },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 19, fontWeight: '800', color: colors.rosaOscuro },
  ayuda: { fontSize: 14, color: colors.textoSuave },
  fila: { flexDirection: 'row', gap: space.s },
  filaSabor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s, paddingVertical: 4 },
  sabor: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.texto },
  total: { alignItems: 'center', paddingVertical: space.s },
  totalTitulo: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  totalNumero: { fontSize: 40, fontWeight: '800', color: colors.texto },
});
