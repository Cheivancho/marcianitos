import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radius, space } from '@/theme';

type Props = { visible: boolean; titulo: string; onCerrar: () => void; children: ReactNode };

/** Ventana flotante arriba de todo: el teclado no tapa los campos. */
export function Ventana({ visible, titulo, onCerrar, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '90%' }}>
          <Pressable style={styles.ventana} onPress={() => {}}>
            <Text style={styles.titulo}>{titulo}</Text>
            <ScrollView contentContainerStyle={{ gap: space.m }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(74,44,54,0.45)', paddingTop: 60, paddingHorizontal: space.m },
  ventana: { backgroundColor: colors.blanco, borderRadius: radius.grande, padding: space.l, gap: space.m },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.texto },
});
