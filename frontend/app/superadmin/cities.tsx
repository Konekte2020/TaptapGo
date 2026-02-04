import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { cityAPI } from '../../src/services/api';
import { DEPARTMENT_CITIES, HAITI_DEPARTMENTS } from '../../src/constants/haiti';

export default function SuperAdminCities() {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [form, setForm] = useState({
    department: '',
    name: '',
  });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const response = await cityAPI.getAll();
      setCities(response.data.cities || []);
    } catch (error) {
      console.error('Fetch cities error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.department || !form.name) {
      Alert.alert('Erè', 'Depatman ak vil obligatwa');
      return;
    }

    try {
      await cityAPI.create({ name: form.name });
      Alert.alert('Siksè', 'Vil kreye!');
      
      setModalVisible(false);
      resetForm();
      fetchCities();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Operasyon echwe');
    }
  };

  const resetForm = () => {
    setForm({
      department: '',
      name: '',
    });
    setDepartmentOpen(false);
    setCityOpen(false);
  };

  const citiesForDepartment = useMemo(() => {
    if (!form.department) return [];
    return DEPARTMENT_CITIES[form.department] || [];
  }, [form.department]);

  const handleDeleteCity = (city: any) => {
    Alert.alert(
      'Siprime Vil',
      'Ou sèten ou vle siprime vil sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi, siprime',
          style: 'destructive',
          onPress: async () => {
            try {
              await cityAPI.delete(city.id);
              fetchCities();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab siprime');
            }
          },
        },
      ]
    );
  };

  const renderCity = ({ item }: { item: any }) => (
    <View style={styles.cityCard}>
      <View style={styles.cityHeader}>
        <View style={styles.cityInfo}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.cityName}>{item.name}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Aktif' : 'Inaktif'}</Text>
        </View>
      </View>

      <View style={styles.cityFooter}>
        <Text style={styles.footerText}>Disponib</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCity(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={styles.deleteText}>Siprime</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vil</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cities}
        keyExtractor={(item) => item.id}
        renderItem={renderCity}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCities} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen vil</Text>
          </View>
        }
      />

      {/* City Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ajoute Vil</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Sove</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.formLabel}>Depatman</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setDepartmentOpen((prev) => !prev)}
            >
              <Text style={styles.dropdownText}>
                {form.department || 'Chwazi depatman'}
              </Text>
              <Ionicons
                name={departmentOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            {departmentOpen && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {HAITI_DEPARTMENTS.map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForm({ ...form, department: dept, name: '' });
                      setDepartmentOpen(false);
                      setCityOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{dept}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.formLabel}>Vil</Text>
            <TouchableOpacity
              style={[styles.dropdown, !form.department && styles.dropdownDisabled]}
              onPress={() => {
                if (form.department) setCityOpen((prev) => !prev);
              }}
            >
              <Text style={styles.dropdownText}>
                {form.name || 'Chwazi vil'}
              </Text>
              <Ionicons
                name={cityOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            {cityOpen && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {citiesForDepartment.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForm({ ...form, name: city });
                      setCityOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  cityCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  cityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    marginBottom: 12,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
  },
});
