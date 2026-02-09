import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { rideAPI, profileAPI } from '../../src/services/api';

export default function DriverEarnings() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [savingMethods, setSavingMethods] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    totalRides: 0,
  });
  const [form, setForm] = useState({
    moncash_enabled: !!user?.moncash_enabled,
    moncash_phone: user?.moncash_phone || '',
    natcash_enabled: !!user?.natcash_enabled,
    natcash_phone: user?.natcash_phone || '',
    bank_enabled: !!user?.bank_enabled,
    bank_name: user?.bank_name || '',
    bank_account_name: user?.bank_account_name || '',
    bank_account_number: user?.bank_account_number || '',
    default_method: user?.default_method || '',
  });

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await rideAPI.getAll('completed');
      const completedRides = response.data.rides || [];
      setRides(completedRides);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let today = 0, week = 0, month = 0, total = 0;

      completedRides.forEach((ride: any) => {
        const rideDate = new Date(ride.completed_at || ride.created_at);
        const amount = ride.final_price || ride.estimated_price || 0;
        
        total += amount;
        if (rideDate >= todayStart) today += amount;
        if (rideDate >= weekStart) week += amount;
        if (rideDate >= monthStart) month += amount;
      });

      setStats({
        today,
        week,
        month,
        total,
        totalRides: completedRides.length,
      });
    } catch (error) {
      console.error('Fetch earnings error:', error);
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

  const handleSaveMethods = async () => {
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
        Alert.alert('Erè', 'Ranpli tout enfòmasyon bank yo');
        return;
      }
    }
    if (form.default_method) {
      if (!['moncash', 'natcash', 'bank'].includes(form.default_method)) {
        Alert.alert('Erè', 'Mwayen peman pa valab');
        return;
      }
      if (form.default_method === 'moncash' && !form.moncash_enabled) {
        Alert.alert('Erè', 'Aktive MonCash pou mete li default');
        return;
      }
      if (form.default_method === 'natcash' && !form.natcash_enabled) {
        Alert.alert('Erè', 'Aktive NatCash pou mete li default');
        return;
      }
      if (form.default_method === 'bank' && !form.bank_enabled) {
        Alert.alert('Erè', 'Aktive Bank pou mete li default');
        return;
      }
    }

    setSavingMethods(true);
    try {
      const payload = {
        moncash_enabled: form.moncash_enabled,
        moncash_phone: form.moncash_phone.trim(),
        natcash_enabled: form.natcash_enabled,
        natcash_phone: form.natcash_phone.trim(),
        bank_enabled: form.bank_enabled,
        bank_name: form.bank_name.trim(),
        bank_account_name: form.bank_account_name.trim(),
        bank_account_number: form.bank_account_number.trim(),
        default_method: form.default_method || undefined,
      };
      const response = await profileAPI.update(payload);
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser(payload);
      }
      Alert.alert('Siksè', 'Mwayen revni yo mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove chanjman yo');
    } finally {
      setSavingMethods(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchEarnings} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Revni</Text>
        </View>

        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Revni Total</Text>
          <Text style={styles.totalAmount}>{stats.total.toLocaleString()} HTG</Text>
          <Text style={styles.totalRides}>{stats.totalRides} kous fini</Text>
        </View>

        {/* Period Stats */}
        <View style={styles.periodStats}>
          <View style={styles.periodCard}>
            <Ionicons name="today" size={24} color={Colors.primary} />
            <Text style={styles.periodAmount}>{stats.today.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Jodi a</Text>
          </View>
          <View style={styles.periodCard}>
            <Ionicons name="calendar" size={24} color={Colors.secondary} />
            <Text style={styles.periodAmount}>{stats.week.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Semèn sa a</Text>
          </View>
          <View style={styles.periodCard}>
            <Ionicons name="calendar-outline" size={24} color={Colors.success} />
            <Text style={styles.periodAmount}>{stats.month.toLocaleString()}</Text>
            <Text style={styles.periodLabel}>Mwa sa a</Text>
          </View>
        </View>

        {/* Wallet Balance */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.walletTitle}>Balans Wallet</Text>
          </View>
          <Text style={styles.walletAmount}>
            {(user?.wallet_balance || 0).toLocaleString()} HTG
          </Text>
          <Text style={styles.walletNote}>
            Komisyon sistèm retire otomatikman
          </Text>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Mwayen pou resevwa lajan</Text>

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

          <View style={styles.row}>
            <Text style={styles.label}>Aktive Bank</Text>
            <Switch
              value={form.bank_enabled}
              onValueChange={(value) => setForm({ ...form, bank_enabled: value })}
            />
          </View>
          {form.bank_enabled && (
            <View style={styles.bankFields}>
              <TextInput
                style={styles.input}
                placeholder="Non bank"
                value={form.bank_name}
                onChangeText={(value) => setForm({ ...form, bank_name: value })}
              />
              <TextInput
                style={styles.input}
                placeholder="Non sou kont"
                value={form.bank_account_name}
                onChangeText={(value) => setForm({ ...form, bank_account_name: value })}
              />
              <TextInput
                style={styles.input}
                placeholder="Nimewo kont"
                value={form.bank_account_number}
                onChangeText={(value) => setForm({ ...form, bank_account_number: value })}
                keyboardType="number-pad"
              />
            </View>
          )}

          <Text style={styles.subLabel}>Chwazi default</Text>
          <View style={styles.defaultRow}>
            <TouchableOpacity
              style={[styles.defaultButton, form.default_method === 'moncash' && styles.defaultButtonActive]}
              onPress={() => setForm({ ...form, default_method: 'moncash' })}
            >
              <Text style={[styles.defaultText, form.default_method === 'moncash' && styles.defaultTextActive]}>
                MonCash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.defaultButton, form.default_method === 'natcash' && styles.defaultButtonActive]}
              onPress={() => setForm({ ...form, default_method: 'natcash' })}
            >
              <Text style={[styles.defaultText, form.default_method === 'natcash' && styles.defaultTextActive]}>
                NatCash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.defaultButton, form.default_method === 'bank' && styles.defaultButtonActive]}
              onPress={() => setForm({ ...form, default_method: 'bank' })}
            >
              <Text style={[styles.defaultText, form.default_method === 'bank' && styles.defaultTextActive]}>
                Bank
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingMethods && styles.saveButtonDisabled]}
            onPress={handleSaveMethods}
            disabled={savingMethods}
          >
            {savingMethods ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Sove</Text>}
          </TouchableOpacity>
        </View>

        {/* Recent Earnings */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Denyè Kous</Text>
          {rides.slice(0, 5).map((ride, index) => (
            <View key={ride.id || index} style={styles.earningItem}>
              <View style={styles.earningLeft}>
                <Ionicons
                  name={ride.vehicle_type === 'moto' ? 'bicycle' : 'car'}
                  size={20}
                  color={ride.vehicle_type === 'moto' ? Colors.moto : Colors.car}
                />
                <View>
                  <Text style={styles.earningRoute} numberOfLines={1}>
                    {ride.destination_address}
                  </Text>
                  <Text style={styles.earningDate}>
                    {new Date(ride.completed_at || ride.created_at).toLocaleDateString('fr-HT')}
                  </Text>
                </View>
              </View>
              <Text style={styles.earningAmount}>
                +{ride.final_price || ride.estimated_price || 0} HTG
              </Text>
            </View>
          ))}

          {rides.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Pa gen kous fini ankò</Text>
            </View>
          )}
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
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalCard: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.medium,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  totalRides: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  periodStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  periodCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  periodAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  periodLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    ...Shadows.medium,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  walletAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  walletNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    ...Shadows.small,
    gap: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
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
  subLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  bankFields: {
    gap: 10,
  },
  defaultRow: {
    flexDirection: 'row',
    gap: 10,
  },
  defaultButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    ...Shadows.small,
  },
  defaultButtonActive: {
    backgroundColor: Colors.primary,
  },
  defaultText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  defaultTextActive: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...Shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  recentSection: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  earningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  earningRoute: {
    fontSize: 14,
    color: Colors.text,
    maxWidth: 180,
  },
  earningDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
