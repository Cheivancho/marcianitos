import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { crearSabor, listarSabores, ocultarSabor, renombrarSabor } from '@/db/consultas';
import type { Sabor, TipoJugo } from '@/db/tipos';
import { colors, radius, space } from '@/theme';

// Qué se está editando: un sabor existente o uno nuevo del tipo indicado.
type Edicion = { id: number; tipo: TipoJugo } | { id: null; tipo: TipoJugo } | null;

const TITULOS: Record<TipoJugo, string> = { crema: 'De crema', agua: 'De agua' };

export default function Sabores() {
  const db = useSQLiteContext();
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [texto, setTexto] = useState('');
  const campo = useRef<React.ComponentRef<typeof TextInput>>(null);

  const cargar = useCallback(async () => setSabores(await listarSabores(db)), [db]);
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  function empezar(e: NonNullable<Edicion>, textoInicial = '') {
    setEdicion(e);
    setTexto(textoInicial);
  }

  async function guardar() {
    if (!edicion) return;
    const nombre = texto.trim();
    if (!nombre) {
      Alert.alert('Falta el nombre', 'Escribí el nombre del sabor.');
      return;
    }
    const repetido = sabores.some(
      (s) => s.tipo === edicion.tipo && s.id !== edicion.id && s.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    if (repetido) {
      Alert.alert('Ya existe', `Ya hay un sabor "${nombre}" ${TITULOS[edicion.tipo].toLowerCase()}.`);
      return;
    }
    if (edicion.id !== null) await renombrarSabor(db, edicion.id, nombre);
    else await crearSabor(db, nombre, edicion.tipo);
    setEdicion(null);
    await cargar();
  }

  async function alternar(s: Sabor) {
    await ocultarSabor(db, s.id, !s.activo);
    await cargar();
  }

  function seccion(tipo: TipoJugo) {
    const lista = sabores.filter((s) => s.tipo === tipo);
    return (
      <View style={styles.tarjeta} key={tipo}>
        <Text style={styles.seccion}>{TITULOS[tipo]}</Text>

        {lista.map((s) => (
          <View key={s.id} style={styles.fila}>
            <Text style={[styles.nombre, !s.activo && styles.apagado]}>
              {s.nombre}
              {!s.activo ? '  (oculto)' : ''}
            </Text>
            <View style={styles.botones}>
              <View style={{ flex: 1 }}>
                <Boton titulo="Cambiar" variante="suave" chico onPress={() => empezar({ id: s.id, tipo }, s.nombre)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton titulo={s.activo ? 'Ocultar' : 'Mostrar'} variante="secundario" chico onPress={() => alternar(s)} />
              </View>
            </View>
          </View>
        ))}

        <Boton titulo={`+ Agregar sabor ${TITULOS[tipo].toLowerCase()}`} variante="suave" onPress={() => empezar({ id: null, tipo })} />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.contenido}>
        {seccion('crema')}
        {seccion('agua')}
        <Text style={styles.nota}>
          Los sabores ocultos no aparecen para vender, pero sus ventas anteriores se conservan.
        </Text>
      </ScrollView>

      {/* La ventana de edición va arriba de todo para que el teclado nunca tape el campo ni los botones. */}
      <Modal visible={edicion !== null} transparent animationType="fade" statusBarTranslucent
        onShow={() => {
          setTimeout(() => campo.current?.focus(), 100);
        }}
        onRequestClose={() => setEdicion(null)}
      >
        <Pressable style={styles.fondo} onPress={() => setEdicion(null)}>
          <Pressable style={styles.ventana} onPress={() => {}}>
            <Text style={styles.ventanaTitulo}>
              {edicion?.id === null ? `Nuevo sabor ${edicion ? TITULOS[edicion.tipo].toLowerCase() : ''}` : 'Cambiar nombre del sabor'}
            </Text>
            <TextInput
              ref={campo}
              value={texto}
              onChangeText={setTexto}
              placeholder="Nombre del sabor"
              placeholderTextColor={colors.textoSuave}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={guardar}
              style={styles.input}
            />
            <View style={styles.botones}>
              <View style={{ flex: 1 }}>
                <Boton titulo="Cancelar" variante="secundario" onPress={() => setEdicion(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton titulo="Guardar" onPress={guardar} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  seccion: { fontSize: 20, fontWeight: '800', color: colors.rosaOscuro, marginBottom: space.xs },
  fila: { gap: space.xs + 2, paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: colors.beigeClaro },
  botones: { flexDirection: 'row', gap: space.s },
  nombre: { fontSize: 18, fontWeight: '700', color: colors.texto },
  apagado: { color: colors.textoSuave, textDecorationLine: 'line-through' },
  nota: { fontSize: 14, color: colors.textoSuave, textAlign: 'center', paddingHorizontal: space.m },
  fondo: { flex: 1, backgroundColor: 'rgba(74,44,54,0.45)', paddingTop: 90, paddingHorizontal: space.m },
  ventana: { backgroundColor: colors.blanco, borderRadius: radius.grande, padding: space.l, gap: space.m },
  ventanaTitulo: { fontSize: 20, fontWeight: '800', color: colors.texto },
  input: {
    minHeight: 56,
    borderRadius: radius.chico,
    borderWidth: 2,
    borderColor: colors.rosaClaro,
    backgroundColor: colors.beigeClaro,
    paddingHorizontal: space.m,
    fontSize: 18,
    color: colors.texto,
  },
});
