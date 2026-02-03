import React, { useState, useEffect } from 'react';
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

export default function SuperAdminCities() {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    base_fare_moto: '50',
    base_fare_car: '100',
    price_per_km_moto: '25',
    price_per_km_car: '50',
    price_per_min_moto: '5',
    price_per_min_car: '10',
    surge_multiplier: '1.0',
    system_commission: '15',
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
    if (!form.name) {
      Alert.alert('Erè', 'Non vil obligatwa');
      return;
    }

    try {
      const cityData = {
        name: form.name,
        base_fare_moto: parseFloat(form.base_fare_moto),
        base_fare_car: parseFloat(form.base_fare_car),
        price_per_km_moto: parseFloat(form.price_per_km_moto),
        price_per_km_car: parseFloat(form.price_per_km_car),
        price_per_min_moto: parseFloat(form.price_per_min_moto),
        price_per_min_car: parseFloat(form.price_per_min_car),
        surge_multiplier: parseFloat(form.surge_multiplier),
        system_commission: parseFloat(form.system_commission),
      };

      if (editingCity) {
        await cityAPI.update(editingCity.id, cityData);
        Alert.alert('Siksè', 'Vil modifye!');
      } else {
        await cityAPI.create(cityData);
        Alert.alert('Siksè', 'Vil kreye!');
      }
      
      setModalVisible(false);
      resetForm();
      fetchCities();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Operasyon echwe');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      base_fare_moto: '50',
      base_fare_car: '100',
      price_per_km_moto: '25',
      price_per_km_car: '50',
      price_per_min_moto: '5',
      price_per_min_car: '10',
      surge_multiplier: '1.0',
      system_commission: '15',
    });
    setEditingCity(null);
  };

  const openEditModal = (city: any) => {
    setEditingCity(city);
    setForm({
      name: city.name,
      base_fare_moto: String(city.base_fare_moto),
      base_fare_car: String(city.base_fare_car),
      price_per_km_moto: String(city.price_per_km_moto),
      price_per_km_car: String(city.price_per_km_car),
      price_per_min_moto: String(city.price_per_min_moto),
      price_per_min_car: String(city.price_per_min_car),
      surge_multiplier: String(city.surge_multiplier),
      system_commission: String(city.system_commission),
    });
    setModalVisible(true);
  };

  const renderCity = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.cityCard} onPress={() => openEditModal(item)}>
      <View style={styles.cityHeader}>
        <View style={styles.cityInfo}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.cityName}>{item.name}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Aktif' : 'Inaktif'}</Text>
        </View>
      </View>

      <View style={styles.pricingGrid}>
        <View style={styles.pricingColumn}>
          <Text style={styles.vehicleLabel}>
            <Ionicons name="bicycle" size={12} color={Colors.moto} /> Moto
          </Text>
          <Text style={styles.priceText}>Baz: {item.base_fare_moto} HTG</Text>
          <Text style={styles.priceText}>Km: {item.price_per_km_moto} HTG</Text>
          <Text style={styles.priceText}>Min: {item.price_per_min_moto} HTG</Text>
        </View>
        <View style={styles.pricingColumn}>
          <Text style={styles.vehicleLabel}>
            <Ionicons name="car" size={12} color={Colors.car} /> Machin
          </Text>
          <Text style={styles.priceText}>Baz: {item.base_fare_car} HTG</Text>
          <Text style={styles.priceText}>Km: {item.price_per_km_car} HTG</Text>
          <Text style={styles.priceText}>Min: {item.price_per_min_car} HTG</Text>
        </View>
      </View>

      <View style={styles.cityFooter}>
        <Text style={styles.footerText}>Komisyon: {item.system_commission}%</Text>
        {item.surge_multiplier > 1 && (
          <Text style={[styles.footerText, { color: Colors.warning }]}>
            Surge: x{item.surge_multiplier}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vil & Pri</Text>
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
            <Text style={styles.modalTitle}>
              {editingCity ? 'Modifye Vil' : 'Ajoute Vil'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Sove</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.formLabel}>Non Vil</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Port-au-Prince"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              editable={!editingCity}
            />

            <Text style={styles.formLabel}>Tarif Moto (HTG)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Frè Baz</Text>
                <TextInput
                  style={styles.input}
                  value={form.base_fare_moto}
                  onChangeText={(text) => setForm({ ...form, base_fare_moto: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Pa Km</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_per_km_moto}
                  onChangeText={(text) => setForm({ ...form, price_per_km_moto: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Pa Min</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_per_min_moto}
                  onChangeText={(text) => setForm({ ...form, price_per_min_moto: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Tarif Machin (HTG)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Frè Baz</Text>
                <TextInput
                  style={styles.input}
                  value={form.base_fare_car}
                  onChangeText={(text) => setForm({ ...form, base_fare_car: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Pa Km</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_per_km_car}
                  onChangeText={(text) => setForm({ ...form, price_per_km_car: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Pa Min</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_per_min_car}
                  onChangeText={(text) => setForm({ ...form, price_per_min_car: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Paramèt Sistèm</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Komisyon %</Text>
                <TextInput
                  style={styles.input}
                  value={form.system_commission}
                  onChangeText={(text) => setForm({ ...form, system_commission: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Surge x</Text>
                <TextInput
                  style={styles.input}
                  value={form.surge_multiplier}
                  onChangeText={(text) => setForm({ ...form, surge_multiplier: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
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
  pricingGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pricingColumn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  vehicleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  priceText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});
