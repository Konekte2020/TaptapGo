import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminPricingAPI } from '../../src/services/api';

export default function AdminPricing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    base_fare: '',
    price_per_km: '',
    price_per_min: '',
    surge_multiplier: '1',
    commission_rate: '',
  });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const response = await adminPricingAPI.get();
      const pricing = response.data.pricing || {};
      setForm({
        base_fare: String(pricing.base_fare ?? ''),
        price_per_km: String(pricing.price_per_km ?? ''),
        price_per_min: String(pricing.price_per_min ?? ''),
        surge_multiplier: String(pricing.surge_multiplier ?? 1),
        commission_rate: String(pricing.commission_rate ?? ''),
      });
    } catch (error) {
      console.error('Fetch pricing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const required = [
      form.base_fare,
      form.price_per_km,
      form.price_per_min,
      form.surge_multiplier,
      form.commission_rate,
    ];
    if (required.some((v) => v === '' || v === null || v === undefined)) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }

    const commissionValue = parseFloat(form.commission_rate);
    if (Number.isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      Alert.alert('Erè', 'Pousantaj la dwe ant 0 ak 100');
      return;
    }

    const surgeValue = parseFloat(form.surge_multiplier);
    if (Number.isNaN(surgeValue) || surgeValue < 1) {
      Alert.alert('Erè', 'Surge x dwe >= 1');
      return;
    }

    setSaving(true);
    try {
      await adminPricingAPI.update({
        base_fare: parseFloat(form.base_fare),
        price_per_km: parseFloat(form.price_per_km),
        price_per_min: parseFloat(form.price_per_min),
        surge_multiplier: surgeValue,
        commission_rate: commissionValue,
      });
      Alert.alert('Siksè', 'Pri yo modifye!');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab modifye pri yo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pri Kous (Global)</Text>
        <Text style={styles.subtitle}>Pri yo pa depann de vil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tarif Chofè</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Pri baz</Text>
              <TextInput
                style={styles.input}
                value={form.base_fare}
                onChangeText={(text) => setForm({ ...form, base_fare: text })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Pri pa km</Text>
              <TextInput
                style={styles.input}
                value={form.price_per_km}
                onChangeText={(text) => setForm({ ...form, price_per_km: text })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Pri pa min</Text>
              <TextInput
                style={styles.input}
                value={form.price_per_min}
                onChangeText={(text) => setForm({ ...form, price_per_min: text })}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Paramèt</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Pousantaj sou chofè</Text>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.inputPrefix}>%</Text>
                <TextInput
                  style={styles.inputFlex}
                  value={form.commission_rate}
                  onChangeText={(text) => setForm({ ...form, commission_rate: text })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Surge x</Text>
              <TextInput
                style={styles.input}
                value={form.surge_multiplier}
                onChangeText={(text) => setForm({ ...form, surge_multiplier: text })}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Ap sove...' : 'Sove Pri yo'}
            </Text>
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
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 8,
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: Colors.text,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputPrefix: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  inputFlex: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
