import React, { useMemo, useState, useEffect } from 'react';
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
import { authAPI, vehicleAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';
import { BRAND_ID } from '../../src/constants/brand';

export default function RegisterDriver() {
  const router = useRouter();
  const { login } = useAuthStore();
  const phonePrefix = '+509 ';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');

  const handlePhoneChange = (text: string) => {
    const normalized = text.startsWith(phonePrefix) ? text : `${phonePrefix}${text.replace(/^\+?509\s*/, '')}`;
    setForm({ ...form, phone: normalized });
  };

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: phonePrefix,
    department: '',
    city: '',
    vehicle_type: '',
    vehicle_brand: '',
    vehicle_model: '',
    plate_number: '',
    vehicle_photo: '',
    license_photo: '',
    vehicle_papers: '',
    casier_judiciaire: '',
    profile_photo: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (form.vehicle_type) {
      fetchBrands();
    }
  }, [form.vehicle_type]);

  useEffect(() => {
    if (form.vehicle_brand) {
      fetchModels();
    }
  }, [form.vehicle_brand]);

  const availableCities = useMemo(() => {
    if (!form.department) return [];
    const cities = DEPARTMENT_CITIES[form.department] || [];
    if (!citySearch.trim()) return cities;
    const term = citySearch.trim().toLowerCase();
    return cities.filter((city) => city.toLowerCase().includes(term));
  }, [citySearch, form.department]);

  const fetchBrands = async () => {
    try {
      const response = await vehicleAPI.getBrands(form.vehicle_type);
      setBrands(response.data.brands || []);
    } catch (error) {
      console.error('Fetch brands error:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await vehicleAPI.getModels(form.vehicle_brand, form.vehicle_type);
      setModels(response.data.models || []);
    } catch (error) {
      console.error('Fetch models error:', error);
    }
  };

  const openImagePicker = async (
    field: 'profile_photo' | 'vehicle_photo' | 'license_photo' | 'vehicle_papers' | 'casier_judiciaire',
    source: 'camera' | 'library'
  ) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Otorizasyon refize', 'Tanpri pèmèt aksè kamera.');
          return;
        }
      } else if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Otorizasyon refize', 'Tanpri pèmèt aksè galri a.');
          return;
        }
      }

      const picker =
        source === 'camera'
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;

      const result = await picker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setForm({ ...form, [field]: `data:image/jpeg;base64,${result.assets[0].base64}` });
      }
    } catch (error) {
      Alert.alert('Erè', 'Pa kapab chwazi foto a');
    }
  };

  const pickImage = (field: 'profile_photo' | 'vehicle_photo' | 'license_photo' | 'vehicle_papers' | 'casier_judiciaire') => {
    Alert.alert(
      'Ajoute foto',
      'Chwazi sous foto a',
      [
        { text: 'Galri', onPress: () => openImagePicker(field, 'library') },
        { text: 'Kamera', onPress: () => openImagePicker(field, 'camera') },
        { text: 'Anile', style: 'cancel' },
      ]
    );
  };

  const validateStep1 = () => {
    if (!form.full_name || !form.email || !form.phone) {
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
    if (!form.department || !form.city || !form.vehicle_type || !form.vehicle_brand || !form.vehicle_model || !form.plate_number) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!form.password || form.password.length < 6) {
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
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const response = await authAPI.registerDriver({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        vehicle_type: form.vehicle_type,
        vehicle_brand: form.vehicle_brand,
        vehicle_model: form.vehicle_model,
        plate_number: form.plate_number,
        vehicle_photo: form.vehicle_photo || undefined,
        license_photo: form.license_photo || undefined,
        vehicle_papers: form.vehicle_papers || undefined,
        casier_judiciaire: form.casier_judiciaire || undefined,
        profile_photo: form.profile_photo || undefined,
        password: form.password,
        admin_id: BRAND_ID || undefined,
      });

      if (response.data.success) {
        await login(response.data.user, response.data.token);
        Alert.alert(
          'Siksè',
          'Kont ou kreye! Tann apwobasyon admin.',
          [{ text: 'OK', onPress: () => router.replace('/driver/pending') }]
        );
      }
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert('Erè', error.response?.data?.detail || 'Enskripsyon echwe');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.form}>
      <TouchableOpacity style={styles.photoContainer} onPress={() => pickImage('profile_photo')}>
        {form.profile_photo ? (
          <Image source={{ uri: form.profile_photo }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={40} color={Colors.textSecondary} />
            <Text style={styles.photoText}>Foto profil</Text>
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

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => validateStep1() && setStep(2)}
      >
        <Text style={styles.nextButtonText}>Kontinyè</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      {/* Department Picker */}
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
        <View style={styles.picker}>
          <ScrollView style={styles.pickerList} nestedScrollEnabled>
            {HAITI_DEPARTMENTS.map((department) => (
              <TouchableOpacity
                key={department}
                style={styles.pickerItem}
                onPress={() => {
                  setForm({ ...form, department, city: '' });
                  setCitySearch('');
                  setShowDepartmentPicker(false);
                  setShowCityPicker(true);
                }}
              >
                <Text style={[styles.pickerText, form.department === department && styles.selectedItem]}>
                  {department}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* City Picker */}
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
          {form.city || 'Chwazi vil'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {showCityPicker && (
        <View style={styles.picker}>
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
          <ScrollView style={styles.pickerList} nestedScrollEnabled>
            {availableCities.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.pickerItem}
                onPress={() => {
                  setForm({ ...form, city });
                  setShowCityPicker(false);
                }}
              >
                <Text style={[styles.pickerText, form.city === city && styles.selectedItem]}>
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

      {/* Vehicle Type */}
      <Text style={styles.sectionTitle}>Tip Machin</Text>
      <View style={styles.vehicleTypes}>
        <TouchableOpacity
          style={[styles.vehicleTypeCard, form.vehicle_type === 'moto' && styles.selectedCard]}
          onPress={() => setForm({ ...form, vehicle_type: 'moto', vehicle_brand: '', vehicle_model: '' })}
        >
          <Ionicons name="bicycle" size={32} color={form.vehicle_type === 'moto' ? Colors.moto : Colors.textSecondary} />
          <Text style={[styles.vehicleTypeText, form.vehicle_type === 'moto' && { color: Colors.moto }]}>Moto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.vehicleTypeCard, form.vehicle_type === 'car' && styles.selectedCard]}
          onPress={() => setForm({ ...form, vehicle_type: 'car', vehicle_brand: '', vehicle_model: '' })}
        >
          <Ionicons name="car" size={32} color={form.vehicle_type === 'car' ? Colors.car : Colors.textSecondary} />
          <Text style={[styles.vehicleTypeText, form.vehicle_type === 'car' && { color: Colors.car }]}>Machin</Text>
        </TouchableOpacity>
      </View>

      {form.vehicle_type && (
        <>
          {/* Brand Picker */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowBrandPicker(!showBrandPicker)}
          >
            <Ionicons name="car-sport-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.input, !form.vehicle_brand && styles.placeholder]}>
              {form.vehicle_brand || 'Chwazi mak'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showBrandPicker && (
            <View style={styles.picker}>
              <ScrollView style={styles.pickerList} nestedScrollEnabled>
                {brands.map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm({ ...form, vehicle_brand: brand, vehicle_model: '' });
                      setShowBrandPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerText, form.vehicle_brand === brand && styles.selectedItem]}>
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Model Picker */}
          {form.vehicle_brand && (
            <>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowModelPicker(!showModelPicker)}
              >
                <Ionicons name="speedometer-outline" size={20} color={Colors.textSecondary} />
                <Text style={[styles.input, !form.vehicle_model && styles.placeholder]}>
                  {form.vehicle_model || 'Chwazi modèl'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showModelPicker && (
                <View style={styles.picker}>
                  <ScrollView style={styles.pickerList} nestedScrollEnabled>
                    {models.map((model) => (
                      <TouchableOpacity
                        key={model}
                        style={styles.pickerItem}
                        onPress={() => {
                          setForm({ ...form, vehicle_model: model });
                          setShowModelPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerText, form.vehicle_model === model && styles.selectedItem]}>
                          {model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* Plate Number */}
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Nimèwo plak"
              value={form.plate_number}
              onChangeText={(text) => setForm({ ...form, plate_number: text.toUpperCase() })}
              autoCapitalize="characters"
            />
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => validateStep2() && setStep(3)}
      >
        <Text style={styles.nextButtonText}>Kontinyè</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>Dokiman</Text>

      <View style={styles.documentGrid}>
        <TouchableOpacity style={styles.documentCard} onPress={() => pickImage('vehicle_photo')}>
          {form.vehicle_photo ? (
            <Image source={{ uri: form.vehicle_photo }} style={styles.documentImage} />
          ) : (
            <>
              <Ionicons name="car" size={24} color={Colors.textSecondary} />
              <Text style={styles.documentText}>Foto Machin</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.documentCard} onPress={() => pickImage('license_photo')}>
          {form.license_photo ? (
            <Image source={{ uri: form.license_photo }} style={styles.documentImage} />
          ) : (
            <>
              <Ionicons name="id-card" size={24} color={Colors.textSecondary} />
              <Text style={styles.documentText}>Pèmi Kondui</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.documentCard} onPress={() => pickImage('vehicle_papers')}>
          {form.vehicle_papers ? (
            <Image source={{ uri: form.vehicle_papers }} style={styles.documentImage} />
          ) : (
            <>
              <Ionicons name="document" size={24} color={Colors.textSecondary} />
              <Text style={styles.documentText}>Papye Machin</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.documentCard} onPress={() => pickImage('casier_judiciaire')}>
          {form.casier_judiciaire ? (
            <Image source={{ uri: form.casier_judiciaire }} style={styles.documentImage} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={24} color={Colors.textSecondary} />
              <Text style={styles.documentText}>Kasye Jidisyè</Text>
              <Text style={[styles.documentText, { fontSize: 10, color: Colors.textSecondary }]}>Obligatwa pou pase an liy</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Sekiri</Text>

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
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => step === 1 ? router.back() : setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Enskri kòm Chofè</Text>
          <Text style={styles.stepText}>Etap {step} sou 3</Text>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Ou gen kont deja? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login?type=driver')}>
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
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  vehicleTypes: {
    flexDirection: 'row',
    gap: 16,
  },
  vehicleTypeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  picker: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    maxHeight: 150,
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
  pickerList: {
    padding: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.text,
  },
  selectedItem: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  emptyCityText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingVertical: 12,
    fontSize: 14,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  documentText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
