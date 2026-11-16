import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function PedidosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.beigeClaro },
        headerTintColor: colors.rosaOscuro,
        headerTitleStyle: { fontWeight: '800', color: colors.texto },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.beigeClaro },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="formulario" options={{ title: 'Pedido' }} />
    </Stack>
  );
}
