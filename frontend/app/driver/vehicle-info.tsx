import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function DriverVehicleInfo() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [vehicleType, setVehicleType] = useState(user?.vehicle_type || 'car');
  const [brand, setBrand] = useState(user?.vehicle_brand || '');
  const [model, setModel] = useState(user?.vehicle_model || '');
  const [plateNumber, setPlateNumber] = useState(user?.plate_number || '');
  const [color, setColor] = useState(user?.vehicle_color || '');

  const handleSave = async () => {
    if (!vehicleType || !brand.trim() || !model.trim() || !plateNumber.trim()) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo obligatwa');
      return;
    }
    setSaving(true);
    try {
      const payload: {
        vehicle_type: string;
        vehicle_brand: string;
        vehicle_model: string;
        plate_number: string;
        vehicle_color?: string;
      } = {
        vehicle_type: vehicleType,
        vehicle_brand: brand.trim(),
        vehicle_model: model.trim(),
        plate_number: plateNumber.trim(),
      };
      if (color.trim()) {
        payload.vehicle_color = color.trim();
      }

      const response = await profileAPI.update(payload);
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser(payload);
      }
      Alert.alert('Siksè', 'Enfòmasyon machin mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou machin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/driver/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Enfòmasyon Machin</Text>
        <Text style={styles.subtitle}>Chanje machin oswa moto ou a nenpòt kilè</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kalite Veyikil</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, vehicleType === 'moto' && styles.typeButtonActive]}
              onPress={() => setVehicleType('moto')}
            >
              <Ionicons name="bicycle" size={18} color={vehicleType === 'moto' ? 'white' : Colors.text} />
              <Text style={[styles.typeText, vehicleType === 'moto' && styles.typeTextActive]}>Moto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, vehicleType === 'car' && styles.typeButtonActive]}
              onPress={() => setVehicleType('car')}
            >
              <Ionicons name="car" size={18} color={vehicleType === 'car' ? 'white' : Colors.text} />
              <Text style={[styles.typeText, vehicleType === 'car' && styles.typeTextActive]}>Machin</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Detay Veyikil</Text>
          <TextInput style={styles.input} placeholder="Mak (eg. Toyota)" value={brand} onChangeText={setBrand} />
          <TextInput style={styles.input} placeholder="Modèl (eg. Corolla)" value={model} onChangeText={setModel} />
          <TextInput
            style={styles.input}
            placeholder="Nimewo plak"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
          />
          <TextInput style={styles.input} placeholder="Koulè (opsyonèl)" value={color} onChangeText={setColor} />

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Sove</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  typeTextActive: {
    color: 'white',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
