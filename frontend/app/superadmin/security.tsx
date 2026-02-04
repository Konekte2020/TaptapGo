import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { profileAPI } from '../../src/services/api';

export default function SuperAdminSecurity() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erè', 'Modpas yo pa menm');
      return;
    }
    setSaving(true);
    try {
      await profileAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Siksè', 'Modpas chanje');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab chanje modpas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Ionicons name="shield-outline" size={22} color={Colors.primary} />
          <Text style={styles.title}>Sekiri</Text>
        </View>
        <Text style={styles.text}>Chanje modpas ou la.</Text>

        <Text style={styles.label}>Modpas aktyèl</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Text style={styles.label}>Nouvo modpas</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Text style={styles.label}>Konfime modpas</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Ap sove...' : 'Chanje modpas'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
