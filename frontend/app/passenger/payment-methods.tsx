import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function PassengerPaymentMethods() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    moncash_enabled: !!user?.moncash_enabled,
    moncash_phone: user?.moncash_phone || '',
    natcash_enabled: !!user?.natcash_enabled,
    natcash_phone: user?.natcash_phone || '',
  });

  const normalizeHaitiPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const withoutCountry = digits.startsWith('509') ? digits.slice(3) : digits;
    return withoutCountry.slice(0, 8);
  };

  const toHaitiPhone = (digitsOnly: string) => `+509${digitsOnly}`;

  const isValidHaitiPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('509') && digits.length === 11;
  };

  const handleSave = async () => {
    if (form.moncash_enabled && !form.moncash_phone.trim()) {
      Alert.alert('Erè', 'Antre nimewo MonCash');
      return;
    }
    if (form.moncash_enabled && !isValidHaitiPhone(form.moncash_phone)) {
      Alert.alert('Erè', 'Nimewo MonCash dwe kòmanse ak +509 epi gen 8 chif');
      return;
    }
    if (form.natcash_enabled && !form.natcash_phone.trim()) {
      Alert.alert('Erè', 'Antre nimewo NatCash');
      return;
    }
    if (form.natcash_enabled && !isValidHaitiPhone(form.natcash_phone)) {
      Alert.alert('Erè', 'Nimewo NatCash dwe kòmanse ak +509 epi gen 8 chif');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        moncash_enabled: form.moncash_enabled,
        moncash_phone: form.moncash_phone.trim(),
        natcash_enabled: form.natcash_enabled,
        natcash_phone: form.natcash_phone.trim(),
      };
      const response = await profileAPI.update(payload);
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser(payload);
      }
      Alert.alert('Siksè', 'Mwayen peman yo mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/passenger/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Metòd Pèman</Text>
        <Text style={styles.subtitle}>Ajoute MonCash oswa NatCash</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Aktive MonCash</Text>
            <Switch
              value={form.moncash_enabled}
              onValueChange={(value) => setForm({ ...form, moncash_enabled: value })}
            />
          </View>
          {form.moncash_enabled && (
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>+509</Text>
              <TextInput
                style={styles.inputFlex}
                placeholder="XXXXXXXX"
                value={normalizeHaitiPhone(form.moncash_phone)}
                onChangeText={(text) =>
                  setForm({ ...form, moncash_phone: toHaitiPhone(normalizeHaitiPhone(text)) })
                }
                keyboardType="phone-pad"
              />
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Aktive NatCash</Text>
            <Switch
              value={form.natcash_enabled}
              onValueChange={(value) => setForm({ ...form, natcash_enabled: value })}
            />
          </View>
          {form.natcash_enabled && (
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>+509</Text>
              <TextInput
                style={styles.inputFlex}
                placeholder="XXXXXXXX"
                value={normalizeHaitiPhone(form.natcash_phone)}
                onChangeText={(text) =>
                  setForm({ ...form, natcash_phone: toHaitiPhone(normalizeHaitiPhone(text)) })
                }
                keyboardType="phone-pad"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Ap sove...' : 'Sove Chanjman'}</Text>
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 6,
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
