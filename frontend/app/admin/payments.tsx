import React, { useEffect, useState } from 'react';
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
  Modal,
  Image,
} from 'react-native';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminPaymentAPI } from '../../src/services/api';

export default function AdminPayments() {
  const MONCASH_LOGO = '';
  const NATCASH_LOGO = '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    moncash_enabled: false,
    moncash_phone: '',
    natcash_enabled: false,
    natcash_phone: '',
    bank_enabled: false,
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    default_method: '',
  });
  const [bankModalVisible, setBankModalVisible] = useState(false);

  const BANKS_HAITI = [
    'Banque de la Republique d Haiti (BRH)',
    'Banque Nationale de Credit (BNC)',
    'Sogebank',
    'Unibank',
    'Capital Bank',
    'BUH (Banque de l Union Haitienne)',
    'Banque Populaire Haitienne (BPH)',
    'Sogebel',
    'Scotiabank Haiti',
    'CitiBank Haiti',
  ];

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const response = await adminPaymentAPI.get();
      const data = response.data.payment_methods || {};
      setForm({
        moncash_enabled: !!data.moncash_enabled,
        moncash_phone: data.moncash_phone || '',
        natcash_enabled: !!data.natcash_enabled,
        natcash_phone: data.natcash_phone || '',
        bank_enabled: !!data.bank_enabled,
        bank_name: data.bank_name || '',
        bank_account_name: data.bank_account_name || '',
        bank_account_number: data.bank_account_number || '',
        default_method: data.default_method || '',
      });
    } catch (error) {
      console.error('Fetch payment methods error:', error);
    } finally {
      setLoading(false);
    }
  };

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
    if (form.bank_enabled) {
      if (!form.bank_name.trim() || !form.bank_account_name.trim() || !form.bank_account_number.trim()) {
        Alert.alert('Erè', 'Ranpli tout chan bank yo');
        return;
      }
    }
    if (form.default_method && !['moncash', 'natcash', 'bank'].includes(form.default_method)) {
      Alert.alert('Erè', 'Default payment pa bon');
      return;
    }
    if (form.default_method === 'moncash' && !form.moncash_enabled) {
      Alert.alert('Erè', 'MonCash dwe aktive pou default');
      return;
    }
    if (form.default_method === 'natcash' && !form.natcash_enabled) {
      Alert.alert('Erè', 'NatCash dwe aktive pou default');
      return;
    }
    if (form.default_method === 'bank' && !form.bank_enabled) {
      Alert.alert('Erè', 'Bank dwe aktive pou default');
      return;
    }

    setSaving(true);
    try {
      await adminPaymentAPI.update({
        moncash_enabled: form.moncash_enabled,
        moncash_phone: form.moncash_phone.trim(),
        natcash_enabled: form.natcash_enabled,
        natcash_phone: form.natcash_phone.trim(),
        bank_enabled: form.bank_enabled,
        bank_name: form.bank_name.trim(),
        bank_account_name: form.bank_account_name.trim(),
        bank_account_number: form.bank_account_number.trim(),
        default_method: form.default_method || null,
      });
      Alert.alert('Siksè', 'Mwayen peman yo mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mwayen Peman</Text>
        <Text style={styles.subtitle}>MonCash, NatCash, Bank</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Default payment</Text>
            <TouchableOpacity
              style={styles.disableAllButton}
              onPress={() =>
                setForm({
                  ...form,
                  moncash_enabled: false,
                  natcash_enabled: false,
                  bank_enabled: false,
                  default_method: '',
                })
              }
            >
              <Text style={styles.disableAllText}>Dezakive tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.defaultRow}>
            {['moncash', 'natcash', 'bank'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.defaultChip,
                  form.default_method === method && styles.defaultChipActive,
                ]}
                onPress={() => setForm({ ...form, default_method: method })}
              >
                <Text
                  style={[
                    styles.defaultChipText,
                    form.default_method === method && styles.defaultChipTextActive,
                  ]}
                >
                  {method === 'moncash' ? 'MonCash' : method === 'natcash' ? 'NatCash' : 'Bank'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.labelRow}>
              {MONCASH_LOGO ? (
                <Image source={{ uri: MONCASH_LOGO }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>M</Text>
                </View>
              )}
              <Text style={styles.label}>Aktive MonCash</Text>
            </View>
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
            <View style={styles.labelRow}>
              {NATCASH_LOGO ? (
                <Image source={{ uri: NATCASH_LOGO }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoCircleAlt}>
                  <Text style={styles.logoText}>N</Text>
                </View>
              )}
              <Text style={styles.label}>Aktive NatCash</Text>
            </View>
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

          <View style={styles.row}>
            <Text style={styles.label}>Aktive Bank</Text>
            <Switch
              value={form.bank_enabled}
              onValueChange={(value) => setForm({ ...form, bank_enabled: value })}
            />
          </View>
          {form.bank_enabled && (
            <>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setBankModalVisible(true)}
              >
                <Text style={styles.selectText}>
                  {form.bank_name ? form.bank_name : 'Chwazi Bank'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Non moun sou kont"
                value={form.bank_account_name}
                onChangeText={(text) => setForm({ ...form, bank_account_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Nimewo kont"
                value={form.bank_account_number}
                onChangeText={(text) => setForm({ ...form, bank_account_number: text })}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>Egzanp: 0000-0000-0000</Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Ap sove...' : 'Sove Chanjman'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={bankModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chwazi Bank</Text>
            <ScrollView contentContainerStyle={styles.bankList}>
              {BANKS_HAITI.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.bankItem}
                  onPress={() => {
                    setForm({ ...form, bank_name: bank });
                    setBankModalVisible(false);
                  }}
                >
                  <Text style={styles.bankText}>{bank}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setBankModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Femen</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disableAllButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  disableAllText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  defaultRow: {
    flexDirection: 'row',
    gap: 8,
  },
  defaultChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  defaultChipActive: {
    backgroundColor: Colors.primary,
  },
  defaultChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  defaultChipTextActive: {
    color: 'white',
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  logoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircleAlt: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
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
  helperText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  selectInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveButton: {
    marginTop: 8,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  bankList: {
    gap: 8,
  },
  bankItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankText: {
    fontSize: 14,
    color: Colors.text,
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  modalCloseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
