// Objetos con aspecto 3D (degradados, brillos y sombras). Cada uno devuelve un <svg> como texto (se dibuja con SvgXml).
let _u = 0;
const gid = () => 'g' + _u++;

function planeta(c1: string = '#F8C8D4', c2: string = '#C93D6F', anillo: string = '#FFF4EC') {
  const a = gid(), b = gid();
  return `<svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${a}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
    <linearGradient id="${b}" x1="0" x2="1"><stop offset="0" stop-color="${anillo}" stop-opacity=".5"/><stop offset=".5" stop-color="${anillo}"/><stop offset="1" stop-color="${anillo}" stop-opacity=".5"/></linearGradient>
  </defs>
  <ellipse cx="110" cy="188" rx="60" ry="8" fill="#0003"/>
  <g transform="rotate(-18 110 100)">
    <ellipse cx="110" cy="100" rx="104" ry="25" fill="none" stroke="url(#${b})" stroke-width="9"/>
    <circle cx="110" cy="100" r="66" fill="url(#${a})"/>
    <ellipse cx="92" cy="72" rx="26" ry="14" fill="#fff" opacity=".35" transform="rotate(-30 92 72)"/>
    <ellipse cx="128" cy="124" rx="12" ry="6" fill="#0002"/><ellipse cx="86" cy="116" rx="8" ry="4" fill="#0002"/>
    <path d="M6 100 A104 25 0 0 0 214 100" fill="none" stroke="url(#${b})" stroke-width="9"/>
  </g></svg>`;
}

function jugito(c1: string = '#E8588A', c2: string = '#B02A5E', inclinacion: number = 0, claro: string = '#fff') {
  const a = gid(), b = gid(), t = gid();
  return `<svg viewBox="20 -6 120 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${a}" x1="0" x2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".4" stop-color="${c1}"/><stop offset=".75" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <linearGradient id="${b}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${claro}" stop-opacity=".75"/><stop offset="1" stop-color="${claro}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${t}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
  </defs>
  <g transform="rotate(${inclinacion} 80 125)">
  <ellipse cx="80" cy="241" rx="30" ry="5" fill="#0003"/>
  <!-- colita de plástico transparente, anudada -->
  <path d="M71 40 L58 8 Q64 4 68 12 L74 2 Q80 -2 84 4 L88 12 Q94 4 102 10 L89 40 Z" fill="url(#${t})" stroke="#ffffff" stroke-opacity=".9" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M74 16 L78 38 M84 12 L83 38 M92 18 L86 38" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" fill="none"/>
  <!-- cuerpo del jugito -->
  <path d="M58 46 Q80 40 102 46 L103 222 Q103 240 80 240 Q57 240 57 222 Z" fill="url(#${a})"/>
  <path d="M58 46 Q80 40 102 46 L102.4 100 L57.6 100 Z" fill="url(#${b})"/>
  <path d="M60 50 Q80 46 100 50" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none"/>
  <!-- manchitas del contenido congelado -->
  <ellipse cx="72" cy="120" rx="5" ry="9" fill="${c2}" opacity=".35"/><ellipse cx="90" cy="150" rx="6" ry="11" fill="${c2}" opacity=".3"/><ellipse cx="76" cy="190" rx="5" ry="9" fill="${c2}" opacity=".35"/><ellipse cx="92" cy="210" rx="4" ry="7" fill="${c2}" opacity=".3"/>
  <circle cx="86" cy="96" r="2.5" fill="#fff" opacity=".5"/><circle cx="70" cy="170" r="2" fill="#fff" opacity=".45"/>
  <!-- brillo del plástico -->
  <path d="M65 56 Q63 140 66 226" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M97 70 Q98 140 96 200" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </g></svg>`;
}

function ovni(haz: boolean = true) {
  const a = gid(), c = gid(), h = gid();
  return `<svg viewBox="0 0 260 ${haz ? 270 : 130}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${a}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4EC"/><stop offset=".55" stop-color="#E7B7C6"/><stop offset="1" stop-color="#B66A86"/></linearGradient>
    <radialGradient id="${c}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#E9FFF3"/><stop offset="1" stop-color="#7CCFA2"/></radialGradient>
    <linearGradient id="${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6C9" stop-opacity=".95"/><stop offset="1" stop-color="#FFF6C9" stop-opacity="0"/></linearGradient>
  </defs>
  ${haz ? `<polygon points="95,100 165,100 235,265 25,265" fill="url(#${h})"/>` : ''}
  <path d="M82 62 A48 46 0 0 1 178 62 Z" fill="url(#${c})" opacity=".95"/>
  <ellipse cx="108" cy="36" rx="14" ry="8" fill="#fff" opacity=".6" transform="rotate(-30 108 36)"/>
  <ellipse cx="130" cy="74" rx="120" ry="30" fill="url(#${a})"/>
  <ellipse cx="130" cy="64" rx="120" ry="24" fill="#fff" opacity=".18"/>
  <circle cx="52" cy="82" r="7" fill="#FFE08A"/><circle cx="92" cy="92" r="7" fill="#F8A5C2"/><circle cx="130" cy="96" r="7" fill="#FFE08A"/><circle cx="168" cy="92" r="7" fill="#F8A5C2"/><circle cx="208" cy="82" r="7" fill="#FFE08A"/>
  </svg>`;
}

function marciano() {
  const a = gid();
  return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${a}" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#D5FFB8"/><stop offset=".6" stop-color="#8ED66B"/><stop offset="1" stop-color="#4FA84A"/></radialGradient></defs>
  <ellipse cx="100" cy="218" rx="60" ry="8" fill="#0003"/>
  <path d="M60 40 Q50 14 40 10" stroke="#4FA84A" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="38" cy="10" r="10" fill="url(#${a})"/>
  <path d="M140 40 Q150 14 160 10" stroke="#4FA84A" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="162" cy="10" r="10" fill="url(#${a})"/>
  <path d="M100 30 C165 30 188 90 160 150 C140 195 60 195 40 150 C12 90 35 30 100 30 Z" fill="url(#${a})"/>
  <ellipse cx="68" cy="80" rx="24" ry="34" fill="#1d1020" transform="rotate(18 68 80)"/><ellipse cx="132" cy="80" rx="24" ry="34" fill="#1d1020" transform="rotate(-18 132 80)"/>
  <ellipse cx="60" cy="68" rx="7" ry="10" fill="#fff" transform="rotate(18 60 68)"/><ellipse cx="124" cy="68" rx="7" ry="10" fill="#fff" transform="rotate(-18 124 68)"/>
  <circle cx="74" cy="92" r="3.5" fill="#fff"/><circle cx="138" cy="92" r="3.5" fill="#fff"/>
  <ellipse cx="46" cy="132" rx="12" ry="7" fill="#F26FA0" opacity=".55"/><ellipse cx="154" cy="132" rx="12" ry="7" fill="#F26FA0" opacity=".55"/>
  <path d="M80 140 Q100 162 120 140" stroke="#1d1020" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="66" cy="50" rx="22" ry="10" fill="#fff" opacity=".35" transform="rotate(-25 66 50)"/>
  </svg>`;
}

function estrella(c1: string = '#FFF1B8', c2: string = '#F5B342') {
  const a = gid();
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <path d="M60 6 L76 42 L115 46 L86 72 L94 111 L60 91 L26 111 L34 72 L5 46 L44 42 Z" fill="url(#${a})" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M60 6 L76 42 L60 60 Z" fill="#fff" opacity=".35"/></svg>`;
}

function cohete() {
  const a = gid(), f = gid();
  return `<svg viewBox="0 0 130 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${a}" x1="0" x2="1"><stop offset="0" stop-color="#E9D3CB"/><stop offset=".4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E3C6BE"/></linearGradient>
    <linearGradient id="${f}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#F26FA0" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M65 200 Q40 250 65 258 Q90 250 65 200 Z" fill="url(#${f})"/>
  <path d="M30 150 L8 196 L40 180 Z M100 150 L122 196 L90 180 Z" fill="#C93D6F"/>
  <path d="M65 8 C100 40 104 110 94 190 L36 190 C26 110 30 40 65 8 Z" fill="url(#${a})"/>
  <path d="M65 8 C84 24 94 48 98 72 L32 72 C36 48 46 24 65 8 Z" fill="#E8588A"/>
  <circle cx="65" cy="108" r="19" fill="#8AD0F2" stroke="#C93D6F" stroke-width="6"/><ellipse cx="59" cy="102" rx="6" ry="4" fill="#fff" opacity=".7"/>
  <rect x="36" y="168" width="58" height="10" fill="#E8588A"/>
  <path d="M42 40 Q36 110 42 170" stroke="#fff" stroke-width="5" opacity=".6" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function luna() {
  const a = gid();
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${a}" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="#FFFBF3"/><stop offset=".7" stop-color="#F3E3D0"/><stop offset="1" stop-color="#D2B79B"/></radialGradient></defs>
  <ellipse cx="100" cy="190" rx="56" ry="7" fill="#0003"/>
  <circle cx="100" cy="100" r="82" fill="url(#${a})"/>
  <ellipse cx="68" cy="78" rx="18" ry="14" fill="#0000001f"/><ellipse cx="128" cy="68" rx="10" ry="8" fill="#0000001a"/><ellipse cx="124" cy="128" rx="22" ry="16" fill="#0000001f"/><ellipse cx="72" cy="136" rx="9" ry="7" fill="#0000001a"/>
  <ellipse cx="70" cy="50" rx="30" ry="14" fill="#fff" opacity=".5" transform="rotate(-30 70 50)"/>
  </svg>`;
}

function corazon() {
  const a = gid();
  return `<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${a}" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="#FFB3CC"/><stop offset=".6" stop-color="#E8588A"/><stop offset="1" stop-color="#B02A5E"/></radialGradient></defs>
  <path d="M60 104 C10 68 4 36 24 20 C40 8 56 16 60 32 C64 16 80 8 96 20 C116 36 110 68 60 104 Z" fill="url(#${a})"/>
  <ellipse cx="38" cy="36" rx="14" ry="8" fill="#fff" opacity=".5" transform="rotate(-35 38 36)"/></svg>`;
}

function burbuja() {
  const a = gid();
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${a}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#F8C8D4" stop-opacity=".45"/><stop offset="1" stop-color="#E8588A" stop-opacity=".55"/></radialGradient></defs>
  <circle cx="50" cy="50" r="44" fill="url(#${a})" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
  <ellipse cx="34" cy="30" rx="12" ry="7" fill="#fff" opacity=".85" transform="rotate(-35 34 30)"/></svg>`;
}


const circulo = (color: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;

export const SABORES_JUGITO = [
  { clave: 'frutilla', titulo: 'Frutilla', c1: '#F178A6', c2: '#C93D6F', tilt: -8, claro: '#fff' },
  { clave: 'chocotorta', titulo: 'Chocotorta', c1: '#A5775A', c2: '#6B4330', tilt: 6, claro: '#F3E3D0' },
  { clave: 'oreo', titulo: 'Oreo', c1: '#7A6F82', c2: '#3E3548', tilt: -5, claro: '#fff' },
  { clave: 'banana', titulo: 'Banana', c1: '#FFF6D0', c2: '#E8D9A0', tilt: 8, claro: '#fff' },
  { clave: 'uva', titulo: 'Uva', c1: '#A15DD0', c2: '#5F2E8C', tilt: -6, claro: '#fff' },
  { clave: 'galactico', titulo: 'Galáctico', c1: '#5DB2F0', c2: '#2A62A8', tilt: 5, claro: '#fff' },
] as const;

export type ClaveJugito = (typeof SABORES_JUGITO)[number]['clave'];

/** Devuelve el dibujo (svg como texto) de un objeto. "jugito:uva" = jugito de ese sabor. */
export function dibujo(nombre: string): string {
  return dibujoSvg(nombre).replace(/<!--[\s\S]*?-->/g, '');
}

function dibujoSvg(nombre: string): string {
  if (nombre.startsWith('jugito:')) {
    const s = SABORES_JUGITO.find((x) => x.clave === nombre.slice(7)) ?? SABORES_JUGITO[0];
    return jugito(s.c1, s.c2, s.tilt, s.claro);
  }
  switch (nombre) {
    case 'planeta_rosa': return planeta();
    case 'planeta_beige': return planeta('#FFF4EC', '#D9B68F', '#F8C8D4');
    case 'planeta_violeta': return planeta('#E5C8FF', '#8A5CC9', '#FFF4EC');
    case 'ovni': return ovni(true);
    case 'marciano': return marciano();
    case 'estrella': return estrella();
    case 'estrella_rosa': return estrella('#FFD3E2', '#E8588A');
    case 'cohete': return cohete();
    case 'luna': return luna();
    case 'corazon': return corazon();
    case 'burbuja': return burbuja();
    case 'circulo_rosa': return circulo('#F8C8D4');
    default: return planeta();
  }
}

/** Proporción ancho/alto de cada objeto (la del viewBox). */
export function proporcion(nombre: string): number {
  if (nombre.startsWith('jugito:')) return 120 / 256;
  switch (nombre) {
    case 'planeta_rosa': case 'planeta_beige': case 'planeta_violeta': return 220 / 200;
    case 'ovni': return 260 / 270;
    case 'marciano': return 200 / 230;
    case 'estrella': case 'estrella_rosa': return 1;
    case 'cohete': return 130 / 260;
    case 'luna': return 1;
    case 'corazon': return 120 / 110;
    default: return 1;
  }
}
