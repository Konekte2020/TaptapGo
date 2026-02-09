import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { authAPI } from '../../src/services/api';

type Step = 'request' | 'confirm';

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userType = (params.type as string) || 'passenger';

  const [step, setStep] = useState<Step>('request');
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedType, setResolvedType] = useState(userType);

  const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 8;
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const normalizeErrorMessage = (error: any, fallback: string) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => item?.msg).filter(Boolean);
      return messages.length ? messages.join('\n') : fallback;
    }
    if (typeof detail === 'string') return detail;
    return fallback;
  };

  const handleSendCode = async () => {
    const trimmed = identifier.trim();
    if (channel === 'phone' && !isValidPhone(trimmed)) {
      Alert.alert('Erè', 'Antre yon nimewo telefòn valid');
      return;
    }
    if (channel === 'email' && !isValidEmail(trimmed)) {
      Alert.alert('Erè', 'Antre yon email valid');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.passwordResetRequest({
        identifier: trimmed,
        channel,
        user_type: userType,
      });
      if (response.data?.user_type) {
        setResolvedType(response.data.user_type);
      }
      Alert.alert('Siksè', channel === 'phone'
        ? 'Nou voye yon kòd verifikasyon sou telefòn ou.'
        : 'Nou voye yon kòd verifikasyon sou email ou.'
      );
      setStep('confirm');
    } catch (error: any) {
      Alert.alert('Erè', normalizeErrorMessage(error, 'Pa kapab voye kòd la'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!code.trim()) {
      Alert.alert('Erè', 'Antre kòd verifikasyon an');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erè', 'Modpas dwe gen omwen 6 karaktè');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erè', 'Modpas yo pa menm');
      return;
    }
    setLoading(true);
    try {
      await authAPI.passwordResetConfirm({
        identifier: identifier.trim(),
        channel,
        code: code.trim(),
        new_password: newPassword,
        user_type: resolvedType,
      });
      Alert.alert('Siksè', 'Modpas la mete ajou. Ou kapab konekte kounye a.');
      router.replace(`/auth/login?type=${userType}`);
    } catch (error: any) {
      Alert.alert('Erè', normalizeErrorMessage(error, 'Pa kapab chanje modpas la'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Modpas bliye</Text>
          <Text style={styles.subtitle}>
            Chwazi fason ou vle resevwa kòd la
          </Text>

          <View style={styles.form}>
            <View style={styles.channelRow}>
              <TouchableOpacity
                style={[styles.channelButton, channel === 'phone' && styles.channelButtonActive]}
                onPress={() => setChannel('phone')}
              >
                <Ionicons name="call" size={16} color={channel === 'phone' ? 'white' : Colors.text} />
                <Text style={[styles.channelText, channel === 'phone' && styles.channelTextActive]}>
                  Telefòn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.channelButton, channel === 'email' && styles.channelButtonActive]}
                onPress={() => setChannel('email')}
              >
                <Ionicons name="mail" size={16} color={channel === 'email' ? 'white' : Colors.text} />
                <Text style={[styles.channelText, channel === 'email' && styles.channelTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name={channel === 'phone' ? 'call-outline' : 'mail-outline'}
                size={20}
                color={Colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder={channel === 'phone' ? 'Nimewo telefòn' : 'Email'}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType={channel === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />
            </View>

            {step === 'confirm' && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Kòd verifikasyon"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nouvo modpas"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Konfime nouvo modpas"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={step === 'request' ? handleSendCode : handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 'request' ? 'Voye kòd' : 'Chanje modpas'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'confirm' && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Renvoye kòd</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 14,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    ...Shadows.small,
  },
  channelButtonActive: {
    backgroundColor: Colors.primary,
  },
  channelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  channelTextActive: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    ...Shadows.small,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Shadows.small,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
