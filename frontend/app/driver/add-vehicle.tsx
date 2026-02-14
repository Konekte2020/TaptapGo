import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { driverVehiclesAPI } from '../../src/services/api';
import { getBrands, getModels, type VehicleKind } from '../../src/data/vehiclesHaiti';

export default function AddVehicle() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleKind>('car');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  const brands = useMemo(() => getBrands(vehicleType), [vehicleType]);
  const brandsFiltered = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    const q = brandSearch.trim().toLowerCase();
    return brands.filter((b) => b.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const models = useMemo(() => getModels(vehicleType, brand), [vehicleType, brand]);
  const modelsFiltered = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, modelSearch]);

  const onVehicleTypeChange = (type: VehicleKind) => {
    setVehicleType(type);
    setBrand('');
    setModel('');
    setBrandSearch('');
    setModelSearch('');
  };

  const handleSave = async () => {
    if (!brand || !model) {
      Alert.alert('Erè', 'Chwazi mak ak modèl veyikil la.');
      return;
    }
    if (!plateNumber.trim()) {
      Alert.alert('Erè', 'Tanpri antre nimewo plak la.');
      return;
    }
    setSaving(true);
    try {
      await driverVehiclesAPI.add({
        vehicle_type: vehicleType,
        vehicle_brand: brand,
        vehicle_model: model,
        plate_number: plateNumber.trim(),
        vehicle_color: color.trim() || undefined,
      });
      Alert.alert('Siksè', 'Veyikil la ajoute', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      let msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : null;
      if (!msg) {
        if (status === 404) {
          msg = 'Sèvè a pa jwenn wout la (404). Verifye ke backend la mache byen ak bon URL nan .env (EXPO_PUBLIC_BACKEND_URL).';
        } else {
          msg = 'Pa kapab ajoute veyikil la.';
        }
      }
      Alert.alert('Erè', msg);
    } finally {
      setSaving(false);
    }
  };

  const openModelModal = () => {
    if (!brand) return;
    setModelSearch('');
    setModelModalOpen(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ajoute yon veyikil</Text>
        <Text style={styles.subtitle}>Chwazi mak ak modèl, epi antre nimewo plak ak koulè. Sa valab pou machin ak moto.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kalite Veyikil</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, vehicleType === 'moto' && styles.typeButtonActive]}
              onPress={() => onVehicleTypeChange('moto')}
            >
              <Ionicons name="bicycle" size={18} color={vehicleType === 'moto' ? 'white' : Colors.text} />
              <Text style={[styles.typeText, vehicleType === 'moto' && styles.typeTextActive]}>Moto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, vehicleType === 'car' && styles.typeButtonActive]}
              onPress={() => onVehicleTypeChange('car')}
            >
              <Ionicons name="car" size={18} color={vehicleType === 'car' ? 'white' : Colors.text} />
              <Text style={[styles.typeText, vehicleType === 'car' && styles.typeTextActive]}>Machin</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Mak ak Modèl (Ayiti)</Text>
          <Text style={styles.fieldLabel}>Mak</Text>
          <TouchableOpacity style={styles.selectInput} onPress={() => { setBrandSearch(''); setBrandModalOpen(true); }}>
            <Text style={brand ? styles.selectText : styles.selectPlaceholder}>
              {brand || (vehicleType === 'car' ? 'Chwazi mak machin' : 'Chwazi mak moto')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Modèl</Text>
          <TouchableOpacity
            style={[styles.selectInput, !brand && styles.selectInputDisabled]}
            onPress={openModelModal}
            disabled={!brand}
          >
            <Text style={model ? styles.selectText : styles.selectPlaceholder}>
              {model || (brand ? 'Chwazi modèl' : 'Chwazi mak anvan')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Nimewo plak</Text>
          <TextInput
            style={styles.input}
            placeholder="Egzanp: AB-1234"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
          />
          <Text style={styles.fieldLabel}>Koulè (opsyonèl)</Text>
          <TextInput style={styles.input} placeholder="Egzanp: Nwa, Blan, Wouj" value={color} onChangeText={setColor} />

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Ajoute</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={brandModalOpen} transparent animationType="fade" onRequestClose={() => setBrandModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{vehicleType === 'car' ? 'Chwazi mak machin' : 'Chwazi mak moto'}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Chache mak..."
              value={brandSearch}
              onChangeText={setBrandSearch}
              placeholderTextColor={Colors.textSecondary}
            />
            <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
              {brandsFiltered.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={styles.listItem}
                  onPress={() => {
                    setBrand(b);
                    setModel('');
                    setBrandModalOpen(false);
                  }}
                >
                  <Text style={styles.listItemText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setBrandModalOpen(false)}>
              <Text style={styles.modalCloseText}>Fèmen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modelModalOpen} transparent animationType="fade" onRequestClose={() => setModelModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chwazi modèl {brand}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Chache modèl..."
              value={modelSearch}
              onChangeText={setModelSearch}
              placeholderTextColor={Colors.textSecondary}
            />
            <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
              {modelsFiltered.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.listItem}
                  onPress={() => {
                    setModel(m);
                    setModelModalOpen(false);
                  }}
                >
                  <Text style={styles.listItemText}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModelModalOpen(false)}>
              <Text style={styles.modalCloseText}>Fèmen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    ...Shadows.small,
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    ...Shadows.small,
  },
  typeButtonActive: { backgroundColor: Colors.primary },
  typeText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  typeTextActive: { color: 'white' },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectInputDisabled: { opacity: 0.6 },
  selectText: { fontSize: 14, color: Colors.text, flex: 1 },
  selectPlaceholder: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    ...Shadows.small,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  listScroll: { maxHeight: 280 },
  listContent: { gap: 0 },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemText: { fontSize: 14, color: Colors.text },
  modalClose: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  modalCloseText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
});
