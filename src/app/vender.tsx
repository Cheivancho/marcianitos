import { Text } from 'react-native';
import { Pantalla } from '@/components/Pantalla';

export default function Vender() {
  return (
    <Pantalla titulo="Vender" subtitulo="Un toque por jugito vendido.">
      <Text style={{ fontSize: 18 }}>Próximamente</Text>
    </Pantalla>
  );
}
