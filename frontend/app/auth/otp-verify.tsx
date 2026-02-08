import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { authAPI } from '../../src/services/api';

export default function OtpVerify() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialPhone = useMemo(() => (params.phone as string) || '', [params.phone]);

  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!phone || !code) {
      Alert.alert('Erè', 'Tanpri antre telefòn ou ak kòd la');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(phone, code);
      if (response.data?.success) {
        Alert.alert('Siksè', 'Nimewo ou verifye. Ou ka konekte kounye a.');
        router.replace('/auth/login');
      } else {
        Alert.alert('Erè', response.data?.message || 'Verifikasyon echwe');
      }
    } catch (error: any) {
      console.error('OTP verify error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Verifikasyon echwe');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      Alert.alert('Erè', 'Tanpri antre telefòn ou');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(phone);
      if (response.data?.success) {
        Alert.alert('Siksè', 'Kòd la voye ankò.');
      } else {
        Alert.alert('Erè', response.data?.message || 'Echèk pou voye kòd la');
      }
    } catch (error: any) {
      console.error('OTP resend error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Echèk pou voye kòd la');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Verifye kòd la</Text>
          <Text style={styles.subtitle}>Antre kòd SMS ou resevwa a.</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Telefòn"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Kòd verifikasyon"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.disabledButton]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.verifyButtonText}>Verifye</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendButton}>
              <Text style={styles.resendText}>Voye kòd la ankò</Text>
            </TouchableOpacity>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
