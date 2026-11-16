import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { CobrarVentana } from '@/components/CobrarVentana';
import { Pantalla } from '@/components/Pantalla';
import { cambiarEstado, listarPedidos } from '@/db/negocio';
import type { Estado, Pedido } from '@/db/tipos';
import { fechaAmigable } from '@/lib/fechas';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

const ETIQUETA: Record<Estado, string> = { por_preparar: 'Por preparar', preparado: 'Preparado', entregado: 'Entregado' };
const SIGUIENTE: Record<Estado, { estado: Estado; titulo: string } | null> = {
  por_preparar: { estado: 'preparado', titulo: 'Ya está preparado' },
  preparado: { estado: 'entregado', titulo: 'Ya lo entregué' },
  entregado: null,
};
const ANTERIOR: Record<Estado, Estado | null> = { por_preparar: null, preparado: 'por_preparar', entregado: 'preparado' };

export default function Pedidos() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cobrando, setCobrando] = useState<Pedido | null>(null);

  const cargar = useCallback(async () => setPedidos(await listarPedidos(db)), [db]);
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function pasar(p: Pedido, estado: Estado) {
    await cambiarEstado(db, p.id, estado);
    await cargar();
  }

  const pendientes = pedidos.filter((p) => p.estado !== 'entregado');
  const entregados = pedidos.filter((p) => p.estado === 'entregado');

  function tarjeta(p: Pedido) {
    const falta = p.precio_total - p.pagado;
    const sig = SIGUIENTE[p.estado];
    const ant = ANTERIOR[p.estado];
    return (
      <View key={p.id} style={styles.tarjeta}>
        <View style={styles.cabecera}>
          <Text style={styles.cliente} numberOfLines={1}>
            {p.cliente}
          </Text>
          <View style={[styles.estado, p.estado === 'preparado' && styles.estadoListo, p.estado === 'entregado' && styles.estadoFin]}>
            <Text style={styles.estadoTexto}>{ETIQUETA[p.estado]}</Text>
          </View>
        </View>
        <Text style={styles.detalle}>
          {p.unidades} jugitos · para {fechaAmigable(p.fecha_entrega)}
        </Text>
        <Text style={styles.total}>{pesos(p.precio_total)}</Text>
        <Text style={[styles.pago, falta <= 0 ? { color: colors.verde } : p.pagado > 0 ? { color: colors.rosaOscuro } : { color: colors.rojo }]}>
          {falta <= 0 ? 'Pagado ✓' : p.pagado > 0 ? `Dejó seña ${pesos(p.pagado)} · falta ${pesos(falta)}` : `Sin pagar · falta ${pesos(falta)}`}
        </Text>
        <View style={{ gap: space.s, marginTop: space.s }}>
          {sig ? <Boton titulo={sig.titulo} onPress={() => pasar(p, sig.estado)} /> : null}
          <View style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Boton titulo="Cobrar" variante="suave" chico onPress={() => setCobrando(p)} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton titulo="Editar" variante="suave" chico onPress={() => router.push(`/pedidos/formulario?id=${p.id}` as Href)} />
            </View>
            {ant ? (
              <View style={{ flex: 1 }}>
                <Boton titulo="Volver" variante="secundario" chico onPress={() => pasar(p, ant)} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Pantalla titulo="Pedidos" subtitulo="Pedidos grandes para entregar.">
        <View style={{ gap: space.m }}>
          <Boton titulo="+ Nuevo pedido" onPress={() => router.push('/pedidos/formulario' as Href)} />
          {pedidos.length === 0 ? <Text style={styles.vacio}>Todavía no cargaste pedidos.</Text> : null}
          {pendientes.map(tarjeta)}
          {entregados.length > 0 ? <Text style={styles.seccion}>Entregados</Text> : null}
          {entregados.map(tarjeta)}
        </View>
      </Pantalla>
      <CobrarVentana
        pedido={cobrando}
        onCerrar={() => setCobrando(null)}
        onListo={async () => {
          setCobrando(null);
          await cargar();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tarjeta: { backgroundColor: colors.beigeClaro, borderRadius: radius.medio, padding: space.m, gap: 2 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  cliente: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.texto },
  estado: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.rosaClaro },
  estadoListo: { backgroundColor: colors.beige },
  estadoFin: { backgroundColor: '#CFEBD9' },
  estadoTexto: { fontSize: 13, fontWeight: '800', color: colors.texto },
  detalle: { fontSize: 15, color: colors.textoSuave },
  total: { fontSize: 24, fontWeight: '800', color: colors.texto, marginTop: 2 },
  pago: { fontSize: 15, fontWeight: '700' },
  fila: { flexDirection: 'row', gap: space.s },
  seccion: { fontSize: 18, fontWeight: '800', color: colors.textoSuave, marginTop: space.s },
  vacio: { fontSize: 16, color: colors.textoSuave, textAlign: 'center' },
});
