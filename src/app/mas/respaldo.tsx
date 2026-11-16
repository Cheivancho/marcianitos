import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { restaurarTodo, volcarTodo } from '@/db/negocio';
import { hoy } from '@/lib/fechas';
import { colors, radius, space } from '@/theme';

type Fila = Record<string, string | number | null>;

function celda(v: unknown): string {
  const t = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV con ; y BOM para que Excel en español lo abra bien. */
function aCsv(columnas: string[], filas: unknown[][]): string {
  return '﻿' + [columnas, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
}

async function compartir(nombre: string, contenido: string, mime: string) {
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido);
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('No se puede compartir', 'Este celu no tiene opciones para compartir archivos.');
    return;
  }
  await Sharing.shareAsync(archivo.uri, { mimeType: mime, dialogTitle: nombre });
}

export default function Respaldo() {
  const db = useSQLiteContext();
  const [ocupada, setOcupada] = useState(false);

  async function copia() {
    setOcupada(true);
    try {
      const datos = await volcarTodo(db);
      await compartir(`marcianitos-respaldo-${hoy()}.json`, JSON.stringify({ app: 'marcianitos', version: 1, fecha: hoy(), datos }), 'application/json');
    } catch {
      Alert.alert('No se pudo guardar la copia', 'Probá de nuevo.');
    } finally {
      setOcupada(false);
    }
  }

  async function excel() {
    setOcupada(true);
    try {
      const d = (await volcarTodo(db)) as Record<string, Fila[]>;
      const sabor = (id: unknown) => d.sabores.find((s) => s.id === id)?.nombre ?? '';
      const cliente = (id: unknown) => d.clientes.find((c) => c.id === id)?.nombre ?? '';
      const insumo = (id: unknown) => d.insumos.find((i) => i.id === id)?.nombre ?? '';

      const filas: unknown[][] = [
        ...d.ventas.map((v) => [v.fecha, 'Venta', sabor(v.sabor_id), v.metodo, v.precio, '']),
        ...d.pagos.map((p) => {
          const ped = d.pedidos.find((x) => x.id === p.pedido_id);
          return [p.fecha, 'Cobro de pedido', cliente(ped?.cliente_id), p.metodo, p.monto, ''];
        }),
        ...d.compras.map((c) => [c.fecha, 'Compra', `${insumo(c.insumo_id)} (x${c.cantidad})`, '', '', c.precio_total]),
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      await compartir(`marcianitos-movimientos-${hoy()}.csv`, aCsv(['Fecha', 'Tipo', 'Detalle', 'Pago', 'Ganado', 'Gastado'], filas), 'text/csv');

      const pedidos = d.pedidos.map((p) => {
        const items = d.pedido_items.filter((i) => i.pedido_id === p.id).map((i) => `${sabor(i.sabor_id)} x${i.cantidad}`).join(', ');
        const pagado = d.pagos.filter((x) => x.pedido_id === p.id).reduce((a, x) => a + Number(x.monto), 0);
        return [p.fecha_entrega, cliente(p.cliente_id), p.estado, items, p.precio_total, pagado, Number(p.precio_total) - pagado];
      });
      await compartir(`marcianitos-pedidos-${hoy()}.csv`, aCsv(['Entrega', 'Cliente', 'Estado', 'Detalle', 'Total', 'Pagado', 'Debe'], pedidos), 'text/csv');
    } catch {
      Alert.alert('No se pudo exportar', 'Probá de nuevo.');
    } finally {
      setOcupada(false);
    }
  }

  async function restaurar() {
    try {
      const r = await File.pickFileAsync();
      if (r.canceled) return;
      const contenido = JSON.parse(await r.result.text());
      if (contenido?.app !== 'marcianitos' || !contenido.datos) throw new Error('no es un respaldo');
      Alert.alert(
        '¿Restaurar esta copia?',
        `Es del ${contenido.fecha}. Se REEMPLAZAN todos los datos que tenés ahora en el celu por los de la copia.`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, restaurar',
            style: 'destructive',
            onPress: async () => {
              try {
                await restaurarTodo(db, contenido.datos);
                Alert.alert('Listo', 'Se restauró la copia. Cerrá y abrí la app para ver todo actualizado.');
              } catch {
                Alert.alert('No se pudo restaurar', 'La copia parece estar dañada. Tus datos no se tocaron.');
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert('Archivo no válido', 'Elegí un archivo de respaldo de Marcianitos (termina en .json).');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Copia de seguridad</Text>
        <Text style={styles.texto}>
          Guarda todos tus datos en un archivo. Mandalo por WhatsApp o guardalo en Drive, así no los perdés si se rompe el celu.
        </Text>
        <Boton titulo="Guardar copia" onPress={copia} deshabilitado={ocupada} />
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Pasar a Excel</Text>
        <Text style={styles.texto}>Genera dos planillas (movimientos y pedidos) que se abren con Excel o Google Sheets.</Text>
        <Boton titulo="Exportar a Excel" variante="suave" onPress={excel} deshabilitado={ocupada} />
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Recuperar una copia</Text>
        <Text style={styles.texto}>Elegí un archivo de copia guardado antes. Reemplaza lo que hay ahora en el celu.</Text>
        <Boton titulo="Restaurar copia" variante="secundario" onPress={restaurar} deshabilitado={ocupada} />
      </View>

      <Text style={styles.nota}>Las fotos de los tickets no van dentro de la copia: quedan solo en este celu.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl * 2 },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.rosaOscuro },
  texto: { fontSize: 16, color: colors.texto },
  nota: { fontSize: 14, color: colors.textoSuave, textAlign: 'center', paddingHorizontal: space.m },
});
