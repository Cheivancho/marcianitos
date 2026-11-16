import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Chips } from '@/components/Chips';
import { CobrarVentana } from '@/components/CobrarVentana';
import { Pantalla } from '@/components/Pantalla';
import { Ventana } from '@/components/Ventana';
import {
  crearCliente,
  deudasPorCliente,
  listarClientes,
  listarPedidos,
  ocultarCliente,
  renombrarCliente,
} from '@/db/negocio';
import type { Cliente, Pedido } from '@/db/tipos';
import { fechaCorta } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

type Edicion = { id: number | null } | null;
const ESTADO: Record<Pedido['estado'], string> = { por_preparar: 'Por preparar', preparado: 'Preparado', entregado: 'Entregado' };

export default function Clientes() {
  const db = useSQLiteContext();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deben, setDeben] = useState<Record<number, number>>({});
  const [vista, setVista] = useState<'todos' | 'deben'>('todos');
  const [abierto, setAbierto] = useState<number | null>(null);
  const [historial, setHistorial] = useState<Pedido[]>([]);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [texto, setTexto] = useState('');
  const [cobrando, setCobrando] = useState<Pedido | null>(null);

  const cargar = useCallback(async () => {
    const [c, d] = await Promise.all([listarClientes(db), deudasPorCliente(db)]);
    setClientes(c);
    setDeben(Object.fromEntries(d.map((x) => [x.cliente_id, x.debe])));
  }, [db]);

  const cargarHistorial = useCallback(
    async (id: number | null) => setHistorial(id === null ? [] : await listarPedidos(db, id)),
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
      cargarHistorial(abierto);
    }, [cargar, cargarHistorial, abierto]),
  );

  const totalDeuda = Object.values(deben).reduce((a, b) => a + b, 0);
  const lista = clientes.filter((c) => (vista === 'deben' ? (deben[c.id] ?? 0) > 0 : true));

  async function abrir(c: Cliente) {
    const nuevo = abierto === c.id ? null : c.id;
    setAbierto(nuevo);
    await cargarHistorial(nuevo);
  }

  async function guardar() {
    const nombre = texto.trim();
    if (!nombre) return Alert.alert('Falta el nombre', 'Escribí el nombre del cliente.');
    if (clientes.some((c) => c.id !== edicion?.id && c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return Alert.alert('Ya existe', `Ya hay un cliente "${nombre}".`);
    }
    if (edicion?.id) await renombrarCliente(db, edicion.id, nombre);
    else await crearCliente(db, nombre);
    setEdicion(null);
    await cargar();
  }

  return (
    <>
      <Pantalla titulo="Clientes" subtitulo="Clientes mayoristas y quién debe plata.">
        <View style={{ gap: space.m }}>
          <View style={styles.deuda}>
            <Text style={styles.deudaTitulo}>Te deben en total</Text>
            <Text style={[styles.deudaNumero, totalDeuda === 0 && { color: colors.verde }]}>{pesos(totalDeuda)}</Text>
          </View>

          <Chips
            valor={vista}
            onCambiar={setVista}
            opciones={[
              { valor: 'todos', titulo: 'Todos' },
              { valor: 'deben', titulo: 'Los que deben' },
            ]}
          />

          {lista.length === 0 ? (
            <Text style={styles.vacio}>{vista === 'deben' ? 'Nadie te debe plata 🎉' : 'Todavía no hay clientes.'}</Text>
          ) : null}

          {lista.map((c) => {
            const debe = deben[c.id] ?? 0;
            const esta = abierto === c.id;
            return (
              <View key={c.id} style={styles.tarjeta}>
                <Pressable onPress={() => abrir(c)} style={styles.cabecera}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nombre, !c.activo && styles.apagado]} numberOfLines={1}>
                      {c.nombre}
                      {!c.activo ? ' (oculto)' : ''}
                    </Text>
                    <Text style={[styles.debe, debe === 0 && { color: colors.textoSuave }]}>
                      {debe > 0 ? `Debe ${pesos(debe)}` : 'No debe nada'}
                    </Text>
                  </View>
                  <Text style={styles.flecha}>{esta ? '▲' : '▼'}</Text>
                </Pressable>

                {esta ? (
                  <View style={{ gap: space.s, marginTop: space.s }}>
                    {historial.length === 0 ? <Text style={styles.vacio}>Todavía no tiene pedidos.</Text> : null}
                    {historial.map((p) => {
                      const falta = p.precio_total - p.pagado;
                      return (
                        <View key={p.id} style={styles.pedido}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pedidoTitulo}>
                              {fechaCorta(p.fecha_entrega)} · {p.unidades} jugitos
                            </Text>
                            <Text style={styles.pedidoDetalle}>
                              {pesos(p.precio_total)} · {ESTADO[p.estado]}
                            </Text>
                            <Text style={[styles.pedidoDetalle, { fontWeight: '800', color: falta > 0 ? colors.rojo : colors.verde }]}>
                              {falta > 0 ? `Falta ${pesos(falta)}` : 'Pagado ✓'}
                            </Text>
                          </View>
                          {falta > 0 ? <Boton titulo="Cobrar" chico variante="suave" onPress={() => setCobrando(p)} /> : null}
                        </View>
                      );
                    })}
                    <View style={styles.fila}>
                      <View style={{ flex: 1 }}>
                        <Boton
                          titulo="Cambiar nombre"
                          variante="suave"
                          chico
                          onPress={() => {
                            setEdicion({ id: c.id });
                            setTexto(c.nombre);
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Boton
                          titulo={c.activo ? 'Ocultar' : 'Mostrar'}
                          variante="secundario"
                          chico
                          onPress={async () => {
                            await ocultarCliente(db, c.id, !c.activo);
                            await cargar();
                          }}
                        />
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Boton
            titulo="+ Cliente nuevo"
            onPress={() => {
              setEdicion({ id: null });
              setTexto('');
            }}
          />
        </View>
      </Pantalla>

      <Ventana visible={edicion !== null} titulo={edicion?.id ? 'Cambiar nombre' : 'Cliente nuevo'} onCerrar={() => setEdicion(null)}>
        <Campo value={texto} onChangeText={setTexto} placeholder="Nombre" autoFocus maxLength={40} onSubmitEditing={guardar} />
        <View style={styles.fila}>
          <View style={{ flex: 1 }}>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setEdicion(null)} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton titulo="Guardar" onPress={guardar} />
          </View>
        </View>
      </Ventana>

      <CobrarVentana
        pedido={cobrando}
        onCerrar={() => setCobrando(null)}
        onListo={async () => {
          setCobrando(null);
          await cargar();
          await cargarHistorial(abierto);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  deuda: { alignItems: 'center', backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m },
  deudaTitulo: { fontSize: 15, fontWeight: '700', color: colors.textoSuave },
  deudaNumero: { fontSize: 36, fontWeight: '800', color: colors.rojo },
  tarjeta: { backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 48 },
  nombre: { fontSize: 20, fontWeight: '800', color: colors.texto },
  apagado: { color: colors.textoSuave },
  debe: { fontSize: 15, fontWeight: '800', color: colors.rojo },
  flecha: { fontSize: 16, color: colors.textoSuave },
  pedido: { flexDirection: 'row', alignItems: 'center', gap: space.s, backgroundColor: colors.blanco, borderRadius: radius.chico, padding: space.s + 4 },
  pedidoTitulo: { fontSize: 16, fontWeight: '800', color: colors.texto },
  pedidoDetalle: { fontSize: 14, color: colors.textoSuave },
  fila: { flexDirection: 'row', gap: space.s },
  vacio: { fontSize: 16, color: colors.textoSuave, textAlign: 'center' },
});
