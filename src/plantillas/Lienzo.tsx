import { memo, Ref, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '@/theme';
import { EstiloPill, FondoClave, ItemArte, MEDIDAS, Medida, Plantilla } from './catalogo';
import { ClaveJugito, dibujo, proporcion } from './objetos';

// Medidas de referencia del diseño (las de los bocetos): el texto y los márgenes se escalan con el ancho.
const REF_ANCHO: Record<Medida, number> = { '16:9': 800, '4:3': 600, '9:16': 450 };
const FACTOR_U: Record<Medida, number> = { '16:9': 0.7, '4:3': 0.85, '9:16': 1.7 };
const PAD_ARTE: Record<Medida, number[]> = { '16:9': [44, 48, 44], '4:3': [48, 34, 22], '9:16': [70, 30, 50] }; // arriba, lados, abajo
const PAD_CENTRADA: Record<Medida, number[]> = { '16:9': [70, 50, 56], '4:3': [66, 40, 56], '9:16': [80, 36, 70] };
const ALTO_ARTE: Record<Medida, number> = { '16:9': 0.96, '4:3': 0.44, '9:16': 0.5 };

const COLORES_FONDO: Record<FondoClave, string> = {
  rosaS: '#FDE8EE',
  crema: '#FFF4EC',
  beige: '#F3E3D0',
  rosaC: '#F8C8D4',
  blanco: '#FFFFFF',
  cielo: '#C93D6F',
  noche: '#3D1E3A',
};
const DEGRADADOS: Partial<Record<FondoClave, [string, string]>> = {
  cielo: ['#E8588A', '#8E2349'],
  noche: ['#5A2A4A', '#2D1630'],
};
const ESTRELLAS = [[12, 20], [80, 12], [55, 85], [30, 70], [92, 60], [5, 90], [68, 40], [44, 8]];

const PILL: Record<EstiloPill, { bg: string; fg: string }> = {
  rosa: { bg: colors.rosa, fg: '#fff' },
  verde: { bg: colors.verde, fg: '#fff' },
  blanco: { bg: '#fff', fg: colors.rosaOscuro },
  amarillo: { bg: '#FFE08A', fg: colors.texto },
};

function separarLineas(texto: string): { etiqueta: string; valor: string }[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.lastIndexOf(' - ');
      return i >= 0 ? { etiqueta: l.slice(0, i), valor: l.slice(i + 3) } : { etiqueta: l, valor: '' };
    });
}

export type PropsLienzo = {
  plantilla: Plantilla;
  valores: Record<string, string>;
  fondo: FondoClave;
  jugitos: ClaveJugito[];
  foto: string | null;
  medida: Medida;
  /** Ancho del lienzo en puntos de pantalla (el alto sale de la medida). */
  ancho: number;
  refCaptura?: Ref<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

function LienzoBase({ plantilla, valores, fondo, jugitos, foto, medida, ancho, refCaptura }: PropsLienzo) {
  const W = ancho;
  const H = (ancho * MEDIDAS[medida].alto) / MEDIDAS[medida].ancho;
  const k = W / REF_ANCHO[medida];
  const u = (FACTOR_U[medida] * W) / 100;
  const horizontal = medida === '16:9';
  const centrada = plantilla.layout === 'centrada';
  const oscuro = fondo === 'cielo' || fondo === 'noche';
  const txt = oscuro ? '#fff' : colors.texto;
  const logoColor = fondo === 'cielo' ? '#fff' : fondo === 'noche' ? colors.rosaClaro : colors.rosaOscuro;
  const precioColor = fondo === 'cielo' ? '#fff' : fondo === 'noche' ? '#FFE08A' : colors.rosaOscuro;

  const pad = (centrada ? PAD_CENTRADA : PAD_ARTE)[medida].map((v) => v * k);
  const [pt, ps, pb] = pad;

  // Dibujos (se arman una sola vez por plantilla/sabores)
  const xmlArte = useMemo(() => {
    let n = 0;
    return (plantilla.arte ?? []).map((a) => {
      if (a.obj.startsWith('jugito:')) {
        const clave = jugitos[n] ?? (a.obj.slice(7) as ClaveJugito);
        n += 1;
        return { item: a, xml: dibujo(`jugito:${clave}`), obj: 'jugito:x' };
      }
      return { item: a, xml: dibujo(a.obj), obj: a.obj };
    });
  }, [plantilla, jugitos]);
  const xmlDecor = useMemo(() => (plantilla.decor ?? []).map((a) => ({ item: a, xml: dibujo(a.obj), obj: a.obj })), [plantilla]);

  const colocar = (lista: { item: ItemArte; xml: string; obj: string }[], cajaW: number, cajaH: number) =>
    lista.map(({ item, xml, obj }, i) => {
      const w = (item.w / 100) * cajaW;
      const h = w / proporcion(obj);
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: (item.l / 100) * cajaW,
            top: (item.t / 100) * cajaH,
            width: w,
            height: h,
            transform: item.rot ? [{ rotate: `${item.rot}deg` }] : undefined,
          }}
        >
          <SvgXml xml={xml} width="100%" height="100%" />
        </View>
      );
    });

  // Alineación del texto: a la izquierda en horizontal con dibujo, centrado en el resto
  const alinea = !centrada && horizontal ? 'flex-start' : 'center';
  const textAlign = !centrada && horizontal ? 'left' : 'center';

  const bloques = plantilla.bloques;
  const primero = bloques[0];

  const renderBloque = (b: (typeof bloques)[number], i: number) => {
    if (b.tipo === 'foto') {
      return (
        <View
          key={i}
          style={{
            flex: 1,
            minHeight: 20 * u,
            marginVertical: 3 * u,
            borderRadius: 5 * u,
            borderWidth: 0.7 * u,
            borderStyle: foto ? 'solid' : 'dashed',
            borderColor: colors.rosa,
            backgroundColor: '#ffffff88',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Text style={{ color: colors.rosaOscuro, fontWeight: '800', fontSize: 3.6 * u }}>TU FOTO</Text>
          )}
        </View>
      );
    }
    const t = valores[b.campo] ?? '';
    if (!t.trim()) return null;
    switch (b.tipo) {
      case 'titulo': {
        const fs = (b.tam ?? (centrada ? 9 : 8.6)) * u;
        return <Text key={i} style={{ fontSize: fs, lineHeight: fs * 1.12, fontWeight: '800', color: txt, textAlign }}>{t}</Text>;
      }
      case 'subtitulo':
        return <Text key={i} style={{ fontSize: (centrada ? 4.2 : 4) * u, marginTop: 1.6 * u, color: txt, textAlign }}>{t}</Text>;
      case 'precio': {
        const fs = (b.tam ?? (centrada ? 14 : 13)) * u;
        return <Text key={i} style={{ fontSize: fs, lineHeight: fs * 1.1, fontWeight: '800', color: precioColor, marginTop: 2 * u, textAlign }}>{t}</Text>;
      }
      case 'pill': {
        let estilo: EstiloPill = b.estilo ?? 'rosa';
        if (estilo === 'rosa' && fondo === 'cielo') estilo = 'blanco';
        const c = PILL[estilo];
        const esPrimero = primero === b;
        return (
          <View
            key={i}
            style={{
              alignSelf: alinea,
              backgroundColor: c.bg,
              borderRadius: 999,
              paddingVertical: 1.2 * u,
              paddingHorizontal: 4 * u,
              marginTop: esPrimero ? 0 : 2.4 * u,
              marginBottom: esPrimero ? 2.4 * u : 0,
            }}
          >
            <Text style={{ color: c.fg, fontWeight: '700', fontSize: (centrada ? 4 : 3.8) * u }}>{t}</Text>
          </View>
        );
      }
      case 'lista':
        return (
          <View key={i} style={{ marginTop: (centrada ? 3 : 2) * u, width: centrada ? '86%' : '100%', alignSelf: centrada ? 'center' : 'stretch' }}>
            {separarLineas(t).map((l, j) => (
              <View
                key={j}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 4 * u,
                  paddingVertical: (centrada ? 1.1 : 0.8) * u,
                  borderBottomWidth: StyleSheet.hairlineWidth * 2,
                  borderBottomColor: oscuro ? '#ffffff66' : '#4A2C3633',
                }}
              >
                <Text style={{ flexShrink: 1, fontSize: (centrada ? 4.4 : 4) * u, fontWeight: '600', color: txt }}>{l.etiqueta}</Text>
                <Text style={{ fontSize: (centrada ? 4.4 : 4) * u, fontWeight: '800', color: precioColor }}>{l.valor}</Text>
              </View>
            ))}
          </View>
        );
      case 'tarjetas':
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 3 * u, marginTop: 3 * u, alignSelf: 'stretch' }}>
            {separarLineas(t).map((l, j) => (
              <View key={j} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 3 * u, paddingVertical: 2.5 * u, paddingHorizontal: 2 * u, alignItems: 'center' }}>
                <Text style={{ fontSize: 3.6 * u, fontWeight: '600', color: colors.texto }}>{l.etiqueta}</Text>
                <Text style={{ fontSize: 7 * u, fontWeight: '800', color: colors.rosaOscuro }}>{l.valor}</Text>
              </View>
            ))}
          </View>
        );
      default:
        return null; // 'tag' y 'pie' van aparte (posición fija)
    }
  };

  const bloquesFlujo = bloques.filter((b) => b.tipo !== 'tag' && b.tipo !== 'pie');
  const tag = bloques.find((b) => b.tipo === 'tag');
  const pie = bloques.find((b) => b.tipo === 'pie');
  const textoTag = tag && tag.tipo === 'tag' ? valores[tag.campo] : '';
  const textoPie = pie && pie.tipo === 'pie' ? valores[pie.campo] : '';

  // Zona del dibujo (layout "arte")
  let artW = 0;
  let artH = 0;
  if (!centrada) {
    const ar = plantilla.ar ?? 1;
    const contenidoW = W - 2 * ps;
    const contenidoH = H - pt - pb;
    artH = ALTO_ARTE[medida] * contenidoH;
    artW = ar * artH;
    if (artW > contenidoW) {
      artW = contenidoW;
      artH = artW / ar;
    }
  }

  const grad = DEGRADADOS[fondo];
  const xmlFondo = grad
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="f" x1="0.25" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="${grad[0]}"/><stop offset="1" stop-color="${grad[1]}"/></linearGradient></defs><rect width="100" height="100" fill="url(#f)"/></svg>`
    : null;

  return (
    <View
      ref={refCaptura}
      collapsable={false}
      style={{ width: W, height: H, overflow: 'hidden', backgroundColor: COLORES_FONDO[fondo] }}
    >
      {xmlFondo ? <SvgXml xml={xmlFondo} width={W} height={H} style={StyleSheet.absoluteFill} preserveAspectRatio="none" /> : null}
      {oscuro
        ? ESTRELLAS.map(([x, y], i) => (
            <View
              key={i}
              style={{ position: 'absolute', left: (x / 100) * W, top: (y / 100) * H, width: Math.max(2, 2.2 * k), height: Math.max(2, 2.2 * k), borderRadius: 99, backgroundColor: '#fff', opacity: 0.8 }}
            />
          ))
        : null}
      {colocar(xmlDecor, W, H)}

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          paddingTop: pt,
          paddingBottom: pb,
          paddingHorizontal: ps,
          flexDirection: !centrada && horizontal ? 'row' : 'column',
          alignItems: centrada ? 'stretch' : 'center',
          justifyContent: 'center',
          gap: 3 * u,
        }}
      >
        {!centrada ? <View style={{ width: artW, height: artH }}>{colocar(xmlArte, artW, artH)}</View> : null}
        {centrada ? (
          bloquesFlujo.map(renderBloque)
        ) : (
          <View style={{ flex: horizontal ? 1 : undefined, alignItems: alinea, minWidth: 0, alignSelf: horizontal ? 'center' : 'stretch' }}>
            {bloquesFlujo.map(renderBloque)}
          </View>
        )}
      </View>

      <Text style={{ position: 'absolute', top: 3.4 * u, left: 0, right: 0, textAlign: 'center', fontSize: 4.6 * u, fontWeight: '800', letterSpacing: 0.2 * u, color: logoColor }}>
        Marcianitos
      </Text>
      {textoTag?.trim() ? (
        <View style={{ position: 'absolute', top: 3.5 * u, right: 3.5 * u, backgroundColor: colors.rosaOscuro, paddingVertical: 1 * u, paddingHorizontal: 3 * u, borderRadius: 999, transform: [{ rotate: '4deg' }] }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 3.6 * u }}>{textoTag}</Text>
        </View>
      ) : null}
      {textoPie?.trim() ? (
        <Text style={{ position: 'absolute', bottom: 3.5 * u, left: 0, right: 0, textAlign: 'center', fontSize: 3.4 * u, fontWeight: '600', color: txt }}>{textoPie}</Text>
      ) : null}
    </View>
  );
}

export const Lienzo = memo(LienzoBase);
