import { Text } from 'react-native';
import { Pantalla } from '@/components/Pantalla';

export default function Inicio() {
  return (
    <Pantalla titulo="Inicio" subtitulo="Acá vas a ver cuánto ganaste y cuánto gastaste.">
      <Text style={{ fontSize: 18 }}>¡Hola! La app ya está andando en tu celu 🎉</Text>
    </Pantalla>
  );
}
