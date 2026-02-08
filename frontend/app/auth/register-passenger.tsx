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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';

export default function RegisterPassenger() {
  const router = useRouter();
  const { login } = useAuthStore();
  const phonePrefix = '+509 ';

  const [form, setForm] = useState({
    full_name: '',
    phone: phonePrefix,
    email: '',
    department: '',
    city: '',
    password: '',
    confirmPassword: '',
    profile_photo: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [citySearch, setCitySearch] = useState('');

  const handlePhoneChange = (text: string) => {
    const normalized = text.startsWith(phonePrefix) ? text : `${phonePrefix}${text.replace(/^\+?509\s*/, '')}`;
    setForm({ ...form, phone: normalized });
  };

  const availableCities = useMemo(() => {
    if (!form.department) return [];
    const cities = DEPARTMENT_CITIES[form.department] || [];
    if (!citySearch.trim()) return cities;
    const term = citySearch.trim().toLowerCase();
    return cities.filter((city) => city.toLowerCase().includes(term));
  }, [citySearch, form.department]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, profile_photo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const validateStep1 = () => {
    if (!form.full_name || !form.phone || !form.email) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      Alert.alert('Erè', 'Email pa valid');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.department || !form.city || !form.password) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return false;
    }
    if (form.password.length < 6) {
      Alert.alert('Erè', 'Modpas dwe gen omwen 6 karak');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Erè', 'Modpas yo pa menm');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const response = await authAPI.registerPassenger({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        password: form.password,
        profile_photo: form.profile_photo || undefined,
      });

      if (response.data.success) {
        await login(response.data.user, response.data.token);
        Alert.alert('Siksè', 'Kont ou kreye!', [
          { text: 'OK', onPress: () => router.replace('/passenger/home') }
        ]);
      }
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Enskripsyon echwe');
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
          <TouchableOpacity style={styles.backButton} onPress={() => step === 1 ? router.back() : setStep(1)}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Enskri kòm Pasajè</Text>
          <Text style={styles.stepText}>Etap {step} sou 2</Text>

          {step === 1 ? (
            <View style={styles.form}>
              {/* Profile Photo */}
              <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
                {form.profile_photo ? (
                  <Image source={{ uri: form.profile_photo }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={40} color={Colors.textSecondary} />
                    <Text style={styles.photoText}>Ajoute foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Non konplè"
                  value={form.full_name}
                  onChangeText={(text) => setForm({ ...form, full_name: text })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Nimèwo telefòn"
                  value={form.phone}
                  onChangeText={handlePhoneChange}
                  onFocus={() => {
                    if (!form.phone.startsWith(phonePrefix)) {
                      setForm({ ...form, phone: phonePrefix });
                    }
                  }}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => validateStep1() && setStep(2)}
              >
                <Text style={styles.nextButtonText}>Kontinyè</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
              >
                <Ionicons name="map-outline" size={20} color={Colors.textSecondary} />
                <Text style={[styles.input, !form.department && styles.placeholder]}>
                  {form.department || 'Chwazi depatman'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showDepartmentPicker && (
                <View style={styles.cityPicker}>
                  <ScrollView style={styles.cityList} nestedScrollEnabled>
                    {HAITI_DEPARTMENTS.map((department) => (
                      <TouchableOpacity
                        key={department}
                        style={styles.cityItem}
                        onPress={() => {
                          setForm({ ...form, department, city: '' });
                          setCitySearch('');
                          setShowDepartmentPicker(false);
                          setShowCityPicker(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.cityText,
                            form.department === department && styles.selectedCity,
                          ]}
                        >
                          {department}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => {
                  if (!form.department) {
                    Alert.alert('Erè', 'Tanpri chwazi depatman an anvan');
                    return;
                  }
                  setShowCityPicker(!showCityPicker);
                }}
              >
                <Ionicons name="location-outline" size={20} color={Colors.textSecondary} />
                <Text style={[styles.input, !form.city && styles.placeholder]}>
                  {form.city || 'Chwazi vil ou'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showCityPicker && (
                <View style={styles.cityPicker}>
                  <View style={styles.citySearch}>
                    <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.citySearchInput}
                      placeholder="Chèche vil..."
                      value={citySearch}
                      onChangeText={setCitySearch}
                      autoCapitalize="none"
                    />
                  </View>
                  <ScrollView style={styles.cityList} nestedScrollEnabled>
                    {availableCities.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.cityItem}
                        onPress={() => {
                          setForm({ ...form, city });
                          setShowCityPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.cityText,
                            form.city === city && styles.selectedCity,
                          ]}
                        >
                          {city}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {availableCities.length === 0 && (
                      <Text style={styles.emptyCityText}>Pa gen vil ki matche</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Modpas"
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
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
                  placeholder="Konfime modpas"
                  value={form.confirmPassword}
                  onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                  secureTextEntry={!showPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, loading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.registerButtonText}>Kreye Kont</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Ou gen kont deja? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login?type=passenger')}>
              <Text style={styles.loginLink}>Konekte</Text>
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
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
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
  placeholder: {
    color: Colors.textSecondary,
  },
  cityPicker: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    maxHeight: 200,
    ...Shadows.small,
  },
  citySearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 6,
  },
  cityList: {
    padding: 8,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cityText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedCity: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  emptyCityText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingVertical: 12,
    fontSize: 14,
  },
  nextButton: {
    backgroundColor: Colors.secondary,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
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
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
