import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Contador } from '@/components/Contador';
import { Ventana } from '@/components/Ventana';
import { guardarConfig, listarSabores } from '@/db/consultas';
import { borrarTanda, corregirBolsitas, crearTanda, estadoBolsitas, EstadoBolsitas, listarTandas } from '@/db/negocio';
import type { Sabor } from '@/db/tipos';
import { fechaCorta } from '@/lib/fechas';
import { colors, radius, space } from '@/theme';

type Tanda = Awaited<ReturnType<typeof listarTandas>>[number];

export default function Bolsitas() {
  const db = useSQLiteContext();
  const [estado, setEstado] = useState<EstadoBolsitas | null>(null);
  const [tandas, setTandas] = useState<Tanda[]>([]);
  const [sabores, setSabores] = useState<Sabor[]>([]);

  const [nueva, setNueva] = useState(false);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [ajustes, setAjustes] = useState(false);
  const [tengo, setTengo] = useState('');
  const [porPaquete, setPorPaquete] = useState('');
  const [alerta, setAlerta] = useState('');

  const cargar = useCallback(async () => {
    const [e, t, s] = await Promise.all([estadoBolsitas(db), listarTandas(db), listarSabores(db)]);
    setEstado(e);
    setTandas(t);
    setSabores(s.filter((x) => x.activo));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (!estado) return null;
  const poco = estado.quedan <= estado.alerta;
  const totalTanda = Object.values(cantidades).reduce((a, b) => a + b, 0);

  async function guardarTanda() {
    if (totalTanda === 0) return Alert.alert('Faltan jugitos', 'Sumá cuántos hiciste de cada sabor.');
    await crearTanda(db, sabores.map((s) => ({ sabor_id: s.id, cantidad: cantidades[s.id] ?? 0 })));
    setNueva(false);
    await cargar();
  }

  async function guardarAjustes() {
    const pp = Number(porPaquete);
    const al = Number(alerta);
    if (!(pp > 0)) return Alert.alert('Revisá', 'Las bolsitas por paquete tienen que ser más que cero.');
    await guardarConfig(db, 'bolsitas_por_paquete', pp);
    await guardarConfig(db, 'bolsitas_alerta', al);
    if (tengo !== '') await corregirBolsitas(db, Number(tengo));
    setAjustes(false);
    await cargar();
  }

  function borrar(t: Tanda) {
    Alert.alert('¿Borrar esta tanda?', `${t.total} jugitos del ${fechaCorta(t.fecha)}. Las bolsitas se vuelven a sumar.`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await borrarTanda(db, t.id);
          await cargar();
        },
      },
    ]);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={[styles.stock, poco && styles.stockPoco]}>
          <Text style={styles.stockTitulo}>Bolsitas que te quedan</Text>
          <Text style={[styles.stockNumero, poco && { color: colors.rojo }]}>{Math.max(0, estado.quedan)}</Text>
          {poco ? <Text style={styles.aviso}>⚠️ ¡Quedan pocas! Comprá más bolsitas.</Text> : <Text style={styles.stockDetalle}>Te aviso cuando queden {estado.alerta} o menos.</Text>}
        </View>

        <Boton
          titulo="+ Anotar una tanda"
          onPress={() => {
            setCantidades({});
            setNueva(true);
          }}
        />
        <Boton
          titulo="Ajustes del stock"
          variante="suave"
          onPress={() => {
            setTengo('');
            setPorPaquete(String(estado.porPaquete));
            setAlerta(String(estado.alerta));
            setAjustes(true);
          }}
        />

        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Últimas tandas</Text>
          {tandas.length === 0 ? <Text style={styles.detalle}>Todavía no anotaste ninguna tanda.</Text> : null}
          {tandas.map((t) => (
            <Pressable key={t.id} onPress={() => borrar(t)} style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>
                  {fechaCorta(t.fecha)} · {t.total} jugitos
                </Text>
                <Text style={styles.detalle}>{t.detalle}</Text>
              </View>
              <Text style={styles.borrar}>Borrar</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.nota}>
          Cada tanda descuenta una bolsita por jugito. Las bolsitas se suman cuando registrás una compra de "Bolsitas 4x25 cm" (cantidad = paquetes).
        </Text>
      </ScrollView>

      <Ventana visible={nueva} titulo="Tanda nueva: ¿cuántos hiciste?" onCerrar={() => setNueva(false)}>
        {sabores.map((s) => (
          <View key={s.id} style={styles.filaSabor}>
            <Text style={styles.sabor} numberOfLines={2}>
              {s.nombre} <Text style={styles.detalle}>({s.tipo})</Text>
            </Text>
            <Contador valor={cantidades[s.id] ?? 0} onCambiar={(n) => setCantidades((c) => ({ ...c, [s.id]: n }))} />
          </View>
        ))}
        <Text style={styles.total}>Total: {totalTanda} jugitos</Text>
        <View style={styles.botones}>
          <View style={{ flex: 1 }}>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setNueva(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton titulo="Guardar" onPress={guardarTanda} />
          </View>
        </View>
      </Ventana>

      <Ventana visible={ajustes} titulo="Ajustes de bolsitas" onCerrar={() => setAjustes(false)}>
        <Campo etiqueta="Bolsitas que trae cada paquete" value={porPaquete} onChangeText={(t) => setPorPaquete(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={5} />
        <Campo etiqueta="Avisar cuando queden (o menos)" value={alerta} onChangeText={(t) => setAlerta(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={5} />
        <Campo
          etiqueta="¿Contaste y no coincide? Escribí cuántas tenés ahora"
          value={tengo}
          onChangeText={(t) => setTengo(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={5}
          placeholder="Dejalo vacío si está bien"
        />
        <View style={styles.botones}>
          <View style={{ flex: 1 }}>
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setAjustes(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton titulo="Guardar" onPress={guardarAjustes} />
          </View>
        </View>
      </Ventana>
    </>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl * 2 },
  stock: { alignItems: 'center', backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.l, borderWidth: 3, borderColor: colors.blanco },
  stockPoco: { borderColor: colors.rojo, backgroundColor: '#FFF0F0' },
  stockTitulo: { fontSize: 16, fontWeight: '700', color: colors.textoSuave },
  stockNumero: { fontSize: 64, fontWeight: '800', color: colors.texto },
  stockDetalle: { fontSize: 14, color: colors.textoSuave },
  aviso: { fontSize: 17, fontWeight: '800', color: colors.rojo, textAlign: 'center' },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  titulo: { fontSize: 19, fontWeight: '800', color: colors.rosaOscuro },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.beigeClaro },
  nombre: { fontSize: 17, fontWeight: '700', color: colors.texto },
  detalle: { fontSize: 14, color: colors.textoSuave },
  borrar: { fontSize: 14, fontWeight: '800', color: colors.rojo },
  filaSabor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  sabor: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.texto },
  total: { fontSize: 18, fontWeight: '800', color: colors.texto, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: space.s },
  nota: { fontSize: 14, color: colors.textoSuave, textAlign: 'center', paddingHorizontal: space.m },
});
