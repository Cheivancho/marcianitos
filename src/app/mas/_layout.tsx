import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function MasLayout() {
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
      <Stack.Screen name="sabores" options={{ title: 'Sabores' }} />
      <Stack.Screen name="precios" options={{ title: 'Precios' }} />
    </Stack>
  );
}
