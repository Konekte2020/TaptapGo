import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '../../src/constants/colors';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';
import { profileAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminCities() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<string[]>(user?.cities || []);

  const citiesForDepartment = useMemo(() => {
    if (!department) return [];
    return DEPARTMENT_CITIES[department] || [];
  }, [department]);

  const handleAddCity = () => {
    if (!department || !selectedCity) {
      Alert.alert('Erè', 'Chwazi depatman ak vil anvan ou ajoute.');
      return;
    }
    if (cities.includes(selectedCity)) {
      Alert.alert('Atansyon', 'Vil sa a deja nan lis la.');
      return;
    }
    setCities((prev) => [...prev, selectedCity]);
    setSelectedCity('');
    setCityOpen(false);
  };

  const handleRemoveCity = (city: string) => {
    setCities((prev) => prev.filter((item) => item !== city));
  };

  const handleSave = async () => {
    if (!cities.length) {
      Alert.alert('Erè', 'Tanpri ajoute omwen yon vil.');
      return;
    }
    setSaving(true);
    try {
      const response = await profileAPI.update({ cities });
      updateUser(response.data.user);
      Alert.alert('Siksè', 'Vil yo mete ajou.');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove vil yo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Jere Vil Sèvis</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ajoute sèvis nan vil</Text>
          <Text style={styles.sectionHint}>
            Lè ou ajoute yon vil, sèvis ou a ap disponib otomatikman nan vil sa.
          </Text>

          <Text style={styles.label}>Depatman</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDepartmentOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownText}>
              {department || 'Chwazi depatman'}
            </Text>
            <Ionicons
              name={departmentOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          {departmentOpen && (
            <View style={styles.dropdownList}>
              {HAITI_DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setDepartment(dept);
                    setSelectedCity('');
                    setDepartmentOpen(false);
                    setCityOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Vil</Text>
          <TouchableOpacity
            style={[styles.dropdown, !department && styles.dropdownDisabled]}
            onPress={() => {
              if (department) setCityOpen((prev) => !prev);
            }}
          >
            <Text style={styles.dropdownText}>
              {selectedCity || 'Chwazi vil'}
            </Text>
            <Ionicons
              name={cityOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          {cityOpen && (
            <View style={styles.dropdownList}>
              {citiesForDepartment.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCity(city);
                    setCityOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddCity}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addButtonText}>Ajoute vil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vil aktif yo</Text>
          {cities.length === 0 ? (
            <Text style={styles.emptyText}>Pa gen vil ajoute.</Text>
          ) : (
            <View style={styles.cityList}>
              {cities.map((city) => (
                <View key={city} style={styles.cityChip}>
                  <Ionicons name="location" size={12} color={Colors.primary} />
                  <Text style={styles.cityText}>{city}</Text>
                  <TouchableOpacity onPress={() => handleRemoveCity(city)}>
                    <Ionicons name="close" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Ap sove...' : 'Sove vil yo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginBottom: 10,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    color: Colors.text,
    fontSize: 13,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 12,
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 13,
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  cityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityText: {
    fontSize: 12,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
});
