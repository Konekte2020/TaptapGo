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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '../../src/constants/colors';
import { pricingAPI } from '../../src/services/api';

export default function SuperAdminPricing() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [direct, setDirect] = useState({
    base_fare: '0',
    price_per_km: '0',
    price_per_min: '0',
    commission_rate: '0',
  });
  const [admin, setAdmin] = useState({
    commission_rate: '0',
  });

  const fetchPricing = async () => {
    try {
      const [directRes, adminRes] = await Promise.all([
        pricingAPI.get('direct'),
        pricingAPI.get('admin'),
      ]);
      const d = directRes.data.pricing;
      const a = adminRes.data.pricing;
      setDirect({
        base_fare: String(d.base_fare ?? 0),
        price_per_km: String(d.price_per_km ?? 0),
        price_per_min: String(d.price_per_min ?? 0),
        commission_rate: String(d.commission_rate ?? 0),
      });
      setAdmin({
        commission_rate: String(a.commission_rate ?? 0),
      });
    } catch (error) {
      console.error('Fetch pricing error:', error);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleSave = async () => {
    if (
      direct.base_fare === '' ||
      direct.price_per_km === '' ||
      direct.price_per_min === '' ||
      direct.commission_rate === '' ||
      admin.commission_rate === ''
    ) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo avan ou sove.');
      return;
    }
    setSaving(true);
    try {
      await pricingAPI.update('direct', {
        base_fare: parseFloat(direct.base_fare) || 0,
        price_per_km: parseFloat(direct.price_per_km) || 0,
        price_per_min: parseFloat(direct.price_per_min) || 0,
        commission_rate: parseFloat(direct.commission_rate) || 0,
      });
      await pricingAPI.update('admin', {
        base_fare: 0,
        price_per_km: 0,
        price_per_min: 0,
        commission_rate: parseFloat(admin.commission_rate) || 0,
      });
      Alert.alert('Siksè', 'Pri yo mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove pri yo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Ionicons name="cash-outline" size={22} color={Colors.primary} />
            <Text style={styles.title}>Pri</Text>
          </View>
          <Text style={styles.text}>
            Mete pri pou chofè TapTapGo (dirèk) ak mak pèsonèl.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chofè TapTapGo (dirèk)</Text>
          <Text style={styles.label}>Pri baz</Text>
          <TextInput
            style={styles.input}
            value={direct.base_fare}
            onChangeText={(text) => setDirect({ ...direct, base_fare: text })}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Pri pa km</Text>
          <TextInput
            style={styles.input}
            value={direct.price_per_km}
            onChangeText={(text) => setDirect({ ...direct, price_per_km: text })}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Pri pa min</Text>
          <TextInput
            style={styles.input}
            value={direct.price_per_min}
            onChangeText={(text) => setDirect({ ...direct, price_per_min: text })}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Pousantaj</Text>
          <View style={styles.percentRow}>
            <Text style={styles.percentSymbol}>%</Text>
            <TextInput
              style={[styles.input, styles.percentInput]}
              value={direct.commission_rate}
              onChangeText={(text) => setDirect({ ...direct, commission_rate: text })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mak Pèsonèl (admin)</Text>
          <Text style={styles.text}>
            Pri baz, pri pa km, ak pri pa min yo ap fikse pa chak admin mak pèsonèl.
          </Text>
          <Text style={styles.label}>Pousantaj</Text>
          <View style={styles.percentRow}>
            <Text style={styles.percentSymbol}>%</Text>
            <TextInput
              style={[styles.input, styles.percentInput]}
              value={admin.commission_rate}
              onChangeText={(text) => setAdmin({ ...admin, commission_rate: text })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Ap sove...' : 'Sove Pri yo'}
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
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  percentInput: {
    flex: 1,
  },
  saveButton: {
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
