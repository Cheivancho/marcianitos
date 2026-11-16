import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Boton } from '@/components/Boton';
import { guardarPrecios, listarPrecios } from '@/db/consultas';
import type { Precios, TipoJugo } from '@/db/tipos';
import { pesos } from '@/lib/formato';
import { colors, radius, space } from '@/theme';

const PASO = 50;

type Campo = 'unidad' | 'desde10' | 'desde20' | 'desde30';
// Los precios se editan como texto para poder escribir libremente; se validan al guardar.
type Borrador = Record<TipoJugo, Record<Campo, string>>;

const CAMPOS: { campo: Campo; titulo: string }[] = [
  { campo: 'unidad', titulo: '1 a 9 jugitos (c/u)' },
  { campo: 'desde10', titulo: 'Desde 10 (c/u)' },
  { campo: 'desde20', titulo: 'Desde 20 (c/u)' },
  { campo: 'desde30', titulo: 'Desde 30 (c/u)' },
];

const TITULOS: Record<TipoJugo, string> = { crema: 'Jugitos de crema', agua: 'Jugitos de agua' };

function aBorrador(lista: Precios[]): Borrador {
  const b = {} as Borrador;
  for (const p of lista) {
    b[p.tipo] = {
      unidad: String(p.unidad),
      desde10: String(p.desde10),
      desde20: String(p.desde20),
      desde30: String(p.desde30),
    };
  }
  return b;
}

export default function PreciosPantalla() {
  const db = useSQLiteContext();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardado, setGuardado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listarPrecios(db).then((l) => setBorrador(aBorrador(l)));
    }, [db]),
  );

  if (!borrador) return null;

  function cambiar(tipo: TipoJugo, campo: Campo, valor: string) {
    setGuardado(false);
    setBorrador((b) => (b ? { ...b, [tipo]: { ...b[tipo], [campo]: valor.replace(/[^0-9]/g, '') } } : b));
  }

  function sumar(tipo: TipoJugo, campo: Campo, delta: number) {
    const actual = Number(borrador![tipo][campo]) || 0;
    cambiar(tipo, campo, String(Math.max(0, actual + delta)));
  }

  async function guardar() {
    const tipos: TipoJugo[] = ['crema', 'agua'];
    for (const tipo of tipos) {
      const v = borrador![tipo];
      const nums = CAMPOS.map((c) => Number(v[c.campo]));
      if (nums.some((n) => !Number.isInteger(n) || n <= 0)) {
        Alert.alert('Revisá los precios', `Hay un precio vacío o en cero en "${TITULOS[tipo]}".`);
        return;
      }
      const [unidad, d10, d20, d30] = nums;
      // Aviso (no bloquea): el descuento normalmente baja el precio.
      const sube = d10 > unidad || d20 > d10 || d30 > d20;
      if (sube) {
        const seguir = await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Un precio con descuento es más caro',
            `En "${TITULOS[tipo]}" comprar más sale más caro por unidad. ¿Guardar igual?`,
            [
              { text: 'Corregir', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Guardar igual', onPress: () => resolve(true) },
            ],
          ),
        );
        if (!seguir) return;
      }
      await guardarPrecios(db, { tipo, unidad, desde10: d10, desde20: d20, desde30: d30 });
    }
    setGuardado(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {(['crema', 'agua'] as TipoJugo[]).map((tipo) => (
        <View key={tipo} style={styles.tarjeta}>
          <Text style={styles.seccion}>{TITULOS[tipo]}</Text>
          {CAMPOS.map(({ campo, titulo }) => (
            <View key={campo} style={styles.fila}>
              <Text style={styles.etiqueta}>{titulo}</Text>
              <Paso texto="−" onPress={() => sumar(tipo, campo, -PASO)} />
              <View style={styles.valorCaja}>
                <Text style={styles.signo}>$</Text>
                <TextInput
                  value={borrador[tipo][campo]}
                  onChangeText={(t) => cambiar(tipo, campo, t)}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.valor}
                />
              </View>
              <Paso texto="+" onPress={() => sumar(tipo, campo, PASO)} />
            </View>
          ))}
        </View>
      ))}

      <Boton titulo={guardado ? 'Guardado ✓' : 'Guardar precios'} onPress={guardar} />
      <Text style={styles.nota}>
        Ejemplo: 12 jugitos de crema salen {pesos(12 * (Number(borrador.crema.desde10) || 0))} (a{' '}
        {pesos(Number(borrador.crema.desde10) || 0)} c/u). El descuento se cuenta aparte para crema y para agua.
      </Text>
    </ScrollView>
  );
}

function Paso({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.rosaClaro }} style={styles.paso}>
      <Text style={styles.pasoTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: space.m, gap: space.m, paddingBottom: space.xl },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: radius.medio, padding: space.m, gap: space.s },
  seccion: { fontSize: 20, fontWeight: '800', color: colors.rosaOscuro, marginBottom: space.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  etiqueta: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.texto },
  paso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.rosaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTexto: { fontSize: 26, fontWeight: '800', color: colors.rosaOscuro, marginTop: -2 },
  valorCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 92,
    height: 48,
    borderRadius: radius.chico,
    borderWidth: 2,
    borderColor: colors.rosaClaro,
    paddingHorizontal: space.s,
  },
  signo: { fontSize: 17, fontWeight: '700', color: colors.textoSuave },
  valor: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.texto, textAlign: 'right', padding: 0 },
  nota: { fontSize: 14, color: colors.textoSuave, textAlign: 'center', paddingHorizontal: space.m },
});
