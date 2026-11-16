import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { borrarPago, listarPagos, registrarPago } from '@/db/negocio';
import type { Metodo, Pedido } from '@/db/tipos';
import { fechaCorta } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { colors, space } from '@/theme';
import { Boton } from './Boton';
import { Campo } from './Campo';
import { Chips } from './Chips';
import { Ventana } from './Ventana';

type Pago = { id: number; monto: number; metodo: Metodo; fecha: string };
type Props = { pedido: Pedido | null; onCerrar: () => void; onListo: () => void };

/** Registrar un cobro (seña o resto) de un pedido y ver los pagos anteriores. */
export function CobrarVentana({ pedido, onCerrar, onListo }: Props) {
  const db = useSQLiteContext();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('efectivo');

  useEffect(() => {
    if (!pedido) return;
    setMonto('');
    setMetodo(pedido.forma_pago);
    listarPagos(db, pedido.id).then(setPagos);
  }, [db, pedido]);

  if (!pedido) return null;

  const pagado = pagos.reduce((a, p) => a + p.monto, 0);
  const falta = Math.max(0, pedido.precio_total - pagado);

  async function cobrar() {
    const n = Number(monto);
    if (!n || n <= 0) {
      Alert.alert('Falta el monto', 'Escribí cuánto te pagó o tocá "Todo".');
      return;
    }
    await registrarPago(db, pedido!.id, n, metodo);
    onListo();
  }

  function quitar(p: Pago) {
    Alert.alert('¿Borrar este pago?', `${pesos(p.monto)} del ${fechaCorta(p.fecha)}`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await borrarPago(db, p.id);
          setPagos(await listarPagos(db, pedido!.id));
          onListo();
        },
      },
    ]);
  }

  return (
    <Ventana visible titulo={`Cobro de ${pedido.cliente}`} onCerrar={onCerrar}>
      <Text style={styles.linea}>
        Total {pesos(pedido.precio_total)} · Pagó {pesos(pagado)}
      </Text>
      <Text style={[styles.falta, falta === 0 && { color: colors.verde }]}>
        {falta > 0 ? `Falta cobrar ${pesos(falta)}` : 'Está todo pagado ✓'}
      </Text>

      {falta > 0 ? (
        <>
          <Campo
            etiqueta="¿Cuánto te pagó ahora?"
            value={monto}
            onChangeText={(t) => setMonto(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={7}
            placeholder="$"
          />
          <Boton titulo={`Todo (${pesos(falta)})`} variante="suave" chico onPress={() => setMonto(String(falta))} />
          <Chips
            valor={metodo}
            onCambiar={setMetodo}
            opciones={[
              { valor: 'efectivo', titulo: 'Efectivo' },
              { valor: 'transferencia', titulo: 'Transferencia' },
            ]}
          />
          <Boton titulo="Guardar cobro" onPress={cobrar} />
        </>
      ) : null}

      {pagos.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <Text style={styles.sub}>Pagos anteriores (tocá uno para borrarlo)</Text>
          {pagos.map((p) => (
            <Pressable key={p.id} onPress={() => quitar(p)} style={styles.pago}>
              <Text style={styles.pagoTexto}>
                {fechaCorta(p.fecha)} · {p.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}
              </Text>
              <Text style={styles.pagoMonto}>{pesos(p.monto)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Boton titulo="Cerrar" variante="secundario" onPress={onCerrar} />
    </Ventana>
  );
}

const styles = StyleSheet.create({
  linea: { fontSize: 16, color: colors.textoSuave },
  falta: { fontSize: 26, fontWeight: '800', color: colors.rojo },
  sub: { fontSize: 14, fontWeight: '700', color: colors.textoSuave },
  pago: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.beigeClaro },
  pagoTexto: { fontSize: 16, color: colors.texto },
  pagoMonto: { fontSize: 16, fontWeight: '800', color: colors.texto },
});
