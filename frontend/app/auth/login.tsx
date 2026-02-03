import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userType = (params.type as string) || 'passenger';
  const { login } = useAuthStore();

  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getTitle = () => {
    switch (userType) {
      case 'passenger': return 'Konekte kòm Pasajè';
      case 'driver': return 'Konekte kòm Chofè';
      case 'admin': return 'Konekte kòm Admin';
      case 'superadmin': return 'Konekte kòm SuperAdmin';
      default: return 'Konekte';
    }
  };

  const handleLogin = async () => {
    if (!phoneOrEmail || !password) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }

    setLoading(true);
    try {
      const actualType = userType === 'admin' ? 'admin' : userType;
      const response = await authAPI.login(phoneOrEmail, password, actualType);
      
      if (response.data.success) {
        await login(response.data.user, response.data.token);
        
        // Navigate to appropriate dashboard
        switch (response.data.user.user_type) {
          case 'passenger':
            router.replace('/passenger/home');
            break;
          case 'driver':
            if (response.data.user.status === 'approved') {
              router.replace('/driver/home');
            } else {
              Alert.alert('An Atant', 'Kont ou an atant apwobasyon admin.');
            }
            break;
          case 'admin':
            router.replace('/admin/dashboard');
            break;
          case 'superadmin':
            router.replace('/superadmin/dashboard');
            break;
        }
      } else {
        Alert.alert('Erè', response.data.message || 'Koneksyon echwe');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Koneksyon echwe');
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    if (userType === 'passenger') {
      router.push('/auth/register-passenger');
    } else if (userType === 'driver') {
      router.push('/auth/register-driver');
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

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>{getTitle()}</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Telefòn oswa Email"
                value={phoneOrEmail}
                onChangeText={setPhoneOrEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Modpas"
                value={password}
                onChangeText={setPassword}
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

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Konekte</Text>
              )}
            </TouchableOpacity>

            {(userType === 'passenger' || userType === 'driver') && (
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Ou pa gen kont? </Text>
                <TouchableOpacity onPress={goToRegister}>
                  <Text style={styles.registerLink}>Enskri</Text>
                </TouchableOpacity>
              </View>
            )}

            {userType === 'admin' && (
              <TouchableOpacity
                style={styles.superAdminLink}
                onPress={() => router.push('/auth/login?type=superadmin')}
              >
                <Text style={styles.superAdminText}>Konekte kòm SuperAdmin</Text>
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
  logo: {
    width: 180,
    height: 70,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 30,
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
  loginButton: {
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
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  superAdminLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  superAdminText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
