import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, ColorValue, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { migrar } from '@/db/migraciones';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icono(activo: IconName, inactivo: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? activo : inactivo} size={28} color={color as string} />
  );
}

function Cargando() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.beigeClaro }}>
      <ActivityIndicator size="large" color={colors.rosa} />
    </View>
  );
}

export default function Layout() {
  return (
    <Suspense fallback={<Cargando />}>
      <SQLiteProvider databaseName="marcianitos.db" onInit={migrar} useSuspense>
        <Navegacion />
      </SQLiteProvider>
    </Suspense>
  );
}

function Navegacion() {
  // Franja de color detrás de los botones del celu (atrás, inicio, ventanas), que quedan sobre la app.
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.rosaClaro }}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.rosa,
          tabBarInactiveTintColor: colors.textoSuave,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: colors.blanco,
            borderTopColor: colors.beige,
            height: 68,
            paddingTop: 6,
            paddingBottom: 8,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home', 'home-outline') }} />
        <Tabs.Screen name="vender" options={{ title: 'Vender', tabBarIcon: icono('ice-cream', 'ice-cream-outline') }} />
        <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: icono('clipboard', 'clipboard-outline') }} />
        <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: icono('people', 'people-outline') }} />
        <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icono('menu', 'menu-outline') }} />
      </Tabs>
      <View style={{ height: bottom, backgroundColor: colors.rosaClaro }} />
    </View>
  );
}
