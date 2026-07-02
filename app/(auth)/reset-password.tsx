import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { updatePassword } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const { endPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      endPasswordRecovery();
      Alert.alert('¡Listo!', 'Tu contraseña se actualizó correctamente', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.message || 'No se pudo actualizar la contraseña. El enlace pudo haber expirado; solicita uno nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.trophy}>🔒</Text>
        <Text style={styles.title}>Quiniela</Text>
        <Text style={styles.subtitle}>Mundial 2026</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Nueva Contraseña</Text>
        <Text style={styles.help}>Escribe tu nueva contraseña para acceder a tu cuenta.</Text>

        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor={Colors.textSecondary}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>Guardar contraseña</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  trophy: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  help: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text,
    backgroundColor: '#fafafa', marginBottom: 12,
  },
  btn: {
    height: 52, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
