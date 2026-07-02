import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { sendPasswordReset } from '@/lib/api';
import { Colors } from '@/constants/Colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('reset-password');
      await sendPasswordReset(email, redirectTo);
      Alert.alert(
        'Revisa tu correo',
        'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.trophy}>🔑</Text>
        <Text style={styles.title}>Quiniela</Text>
        <Text style={styles.subtitle}>Mundial 2026</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Recuperar Contraseña</Text>
        <Text style={styles.help}>
          Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>Enviar enlace</Text>
          )}
        </TouchableOpacity>

        <View style={styles.backRow}>
          <Link href="/(auth)/login" style={styles.backLink}>← Volver a iniciar sesión</Link>
        </View>
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
  backRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
