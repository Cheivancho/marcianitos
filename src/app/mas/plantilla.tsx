import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Boton } from '@/components/Boton';
import { Campo } from '@/components/Campo';
import { Chips } from '@/components/Chips';
import { listarPrecios, listarSabores } from '@/db/consultas';
import { DATOS_POR_DEFECTO, DatosNegocio, FONDOS, FondoClave, MEDIDAS, Medida, armarDatos, buscarPlantilla, jugitosIniciales, valoresIniciales } from '@/plantillas/catalogo';
import { Lienzo } from '@/plantillas/Lienzo';
import { ClaveJugito, SABORES_JUGITO } from '@/plantillas/objetos';
import { colors, radius, space } from '@/theme';

const OPCIONES_MEDIDA = (Object.keys(MEDIDAS) as Medida[]).map((m) => ({ valor: m, titulo: m === '9:16' ? '9:16 Historias' : m }));

export default function EditarPlantilla() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantilla = buscarPlantilla(Number(id));
  const { width, height } = useWindowDimensions();

  const [datos, setDatos] = useState<DatosNegocio>(DATOS_POR_DEFECTO);
  const [valores, setValores] = useState<Record<string, string>>(() => valoresIniciales(plantilla, DATOS_POR_DEFECTO));
  const [fondo, setFondo] = useState<FondoClave>(plantilla.fondo);
  const [jugitos, setJugitos] = useState<ClaveJugito[]>(() => jugitosIniciales(plantilla));
  const [foto, setFoto] = useState<string | null>(null);
  const [medida, setMedida] = useState<Medida>('16:9');
  const [ocupada, setOcupada] = useState(false);
  const lienzo = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const tocado = useRef(false); // si ya escribió algo, no pisamos sus textos al cargar los precios

  // Trae los precios y sabores reales para armar los textos iniciales
  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([listarSabores(db), listarPrecios(db)]);
        const d = armarDatos(s, p);
        setDatos(d);
        if (!tocado.current) setValores(valoresIniciales(plantilla, d));
      } catch {
        // si falla, quedan los textos de ejemplo
      }
    })();
  }, [db, plantilla]);

  const exp = MEDIDAS[medida];
  // Vista previa fija arriba: el lienzo se arma al tamaño real de la imagen y se muestra achicado.
  const maxAlto = Math.max(150, height * 0.3);
  const pw = Math.min(width - space.m * 2, maxAlto * (exp.ancho / exp.alto));
  const ph = (pw * exp.alto) / exp.ancho;
  const escala = pw / exp.ancho;

  function cambiarTexto(campo: string, t: string) {
    tocado.current = true;
    setValores((v) => ({ ...v, [campo]: t }));
  }

  async function elegirFoto() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!r.canceled && r.assets[0]) setFoto(r.assets[0].uri);
    } catch {
      Alert.alert('No se pudo abrir la galería', 'Probá de nuevo.');
    }
  }

  async function compartir() {
    setOcupada(true);
    try {
      const uri = await captureRef(lienzo, { format: 'png', quality: 1, result: 'tmpfile', width: exp.ancho, height: exp.alto });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No se puede compartir', 'Este celu no tiene opciones para compartir.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir imagen' });
    } catch {
      Alert.alert('No se pudo armar la imagen', 'Probá de nuevo. Si sigue pasando, cerrá y abrí la app.');
    } finally {
      setOcupada(false);
    }
  }

  const hayFoto = plantilla.bloques.some((b) => b.tipo === 'foto');

  return (
    <ScrollView stickyHeaderIndices={[0]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
      <View style={styles.fijo}>
        <View style={{ width: pw, height: ph, alignSelf: 'center', overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: colors.rosaClaro }}>
          <View style={{ position: 'absolute', left: -(exp.ancho - pw) / 2, top: -(exp.alto - ph) / 2, width: exp.ancho, height: exp.alto, transform: [{ scale: escala }] }}>
            <Lienzo refCaptura={lienzo} plantilla={plantilla} valores={valores} fondo={fondo} jugitos={jugitos} foto={foto} medida={medida} ancho={exp.ancho} />
          </View>
        </View>
        <View style={{ marginTop: space.s }}>
          <Chips opciones={OPCIONES_MEDIDA} valor={medida} onCambiar={setMedida} />
        </View>
      </View>

      <View style={styles.cuerpo}>
        <Text style={styles.nombre}>{plantilla.nombre}</Text>
        <Text style={styles.medidaInfo}>Se guarda en {exp.ancho}×{exp.alto} píxeles.</Text>

        {plantilla.bloques.map((b) => {
          if (b.tipo === 'foto') return null;
          const grande = b.tipo === 'lista' || b.tipo === 'tarjetas';
          return (
            <View key={b.campo}>
              <Campo
                etiqueta={b.etiqueta}
                value={valores[b.campo] ?? ''}
                onChangeText={(t) => cambiarTexto(b.campo, t)}
                multiline={grande || b.tipo === 'titulo'}
                style={grande ? { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 } : b.tipo === 'titulo' ? { minHeight: 56, textAlignVertical: 'top', paddingTop: 12 } : undefined}
              />
              {grande ? <Text style={styles.ayuda}>Un renglón por cada uno. Poné " - " entre el nombre y el precio (ej: Oreo - $800).</Text> : null}
            </View>
          );
        })}

        {hayFoto ? (
          <View style={{ gap: space.s }}>
            <Text style={styles.titulo}>Foto</Text>
            <View style={{ flexDirection: 'row', gap: space.s }}>
              <View style={{ flex: 1 }}>
                <Boton titulo={foto ? 'Cambiar foto' : 'Elegir foto'} variante="suave" onPress={elegirFoto} />
              </View>
              {foto ? (
                <View style={{ flex: 1 }}>
                  <Boton titulo="Sacar foto" variante="secundario" onPress={() => setFoto(null)} />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {jugitos.length > 0 ? (
          <View style={{ gap: space.s }}>
            <Text style={styles.titulo}>Sabor de los jugitos</Text>
            {jugitos.map((j, i) => (
              <View key={i} style={{ gap: space.xs }}>
                {jugitos.length > 1 ? <Text style={styles.ayuda}>Jugito {i + 1}</Text> : null}
                <Chips
                  opciones={SABORES_JUGITO.map((s) => ({ valor: s.clave, titulo: s.titulo }))}
                  valor={j}
                  onCambiar={(v) => setJugitos((a) => a.map((x, n) => (n === i ? v : x)))}
                />
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: space.s }}>
          <Text style={styles.titulo}>Color de fondo</Text>
          <Chips opciones={FONDOS.map((f) => ({ valor: f.clave, titulo: f.titulo }))} valor={fondo} onCambiar={setFondo} />
        </View>

        <Boton titulo={ocupada ? 'Preparando...' : 'Compartir imagen'} onPress={compartir} deshabilitado={ocupada} />
        <Boton
          titulo="Volver a los textos de ejemplo"
          variante="suave"
          onPress={() => {
            tocado.current = false;
            setValores(valoresIniciales(plantilla, datos));
            setJugitos(jugitosIniciales(plantilla));
            setFondo(plantilla.fondo);
            setFoto(null);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fijo: { backgroundColor: colors.beigeClaro, paddingHorizontal: space.m, paddingBottom: space.s, borderBottomWidth: 1, borderBottomColor: colors.beige },
  cuerpo: { padding: space.m, gap: space.m },
  nombre: { fontSize: 22, fontWeight: '800', color: colors.texto },
  medidaInfo: { fontSize: 14, color: colors.textoSuave, marginTop: -space.s },
  titulo: { fontSize: 16, fontWeight: '800', color: colors.textoSuave },
  ayuda: { fontSize: 13, color: colors.textoSuave, marginTop: space.xs },
});
