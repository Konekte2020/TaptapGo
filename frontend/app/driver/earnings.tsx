import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { rideAPI, profileAPI, walletAPI } from '../../src/services/api';

// Banques d'Haïti pour la sélection
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

// Format typique du numéro de compte en Haïti (selon les banques)
const NUMERO_KONT_FORMAT = 'Egzanp: 0000-000000 ou 10-12 chif (san espas)';

export default function DriverEarnings() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [walletData, setWalletData] = useState<{
    wallet: { balance: number; balance_en_attente: number; total_gagne: number; total_retire: number };
    retrait_possible: boolean;
    raison?: string;
    type_retrait?: string;
    message?: string;
    regles?: { montant_minimum: number; seuil_automatique: number };
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'moncash' | 'natcash' | 'bank'>(
    (user?.default_method && ['moncash', 'natcash', 'bank'].includes(user.default_method))
      ? (user.default_method as 'moncash' | 'natcash' | 'bank')
      : 'moncash'
  );
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingMethods, setSavingMethods] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
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
      const [ridesRes, walletRes, txnRes] = await Promise.all([
        rideAPI.getAll('completed'),
        walletAPI.get().catch(() => null),
        walletAPI.getTransactions(30).catch(() => ({ data: { transactions: [] } })),
      ]);
      const completedRides = ridesRes.data.rides || [];
      setRides(completedRides);
      if (walletRes?.data) setWalletData(walletRes.data);
      setTransactions(txnRes.data?.transactions || []);

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
      if (walletRes?.data?.wallet && user) {
        updateUser({ wallet_balance: walletRes.data.wallet.balance });
      }
    } catch (error) {
      console.error('Fetch earnings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const montant = Math.round(parseFloat(withdrawAmount.replace(/\s/g, '')) || 0);
    const balance = walletData?.wallet?.balance ?? 0;
    const min = walletData?.regles?.montant_minimum ?? 500;
    if (!montant || montant < min) {
      Alert.alert('Erè', `Montan minimum: ${min} HTG`);
      return;
    }
    if (montant > balance) {
      Alert.alert('Erè', 'Montan pi gran pase balans disponib');
      return;
    }
    setWithdrawing(true);
    try {
      await walletAPI.withdraw(montant, withdrawMethod);
      Alert.alert('Siksè', 'Demann retrait ou anrejistre. Ou ap resevwa yon notifikasyon le peyeman an fèt.');
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      fetchEarnings();
    } catch (err: any) {
      Alert.alert('Erè', err.response?.data?.detail || 'Pa kapab voye demann retrait');
    } finally {
      setWithdrawing(false);
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

  const banksFiltered = useMemo(() => {
    if (!bankSearch.trim()) return BANKS_HAITI;
    const q = bankSearch.trim().toLowerCase();
    return BANKS_HAITI.filter((b) => b.toLowerCase().includes(q));
  }, [bankSearch]);

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

        {/* MON WALLET */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.walletTitle}>MON WALLET</Text>
          </View>
          <Text style={styles.walletRowLabel}>Balans disponib</Text>
          <Text style={styles.walletAmount}>
            {(walletData?.wallet?.balance ?? user?.wallet_balance ?? 0).toLocaleString()} HTG
          </Text>
          <Text style={styles.walletRowLabel}>An attant</Text>
          <Text style={styles.walletAmountSmall}>
            {(walletData?.wallet?.balance_en_attente ?? 0).toLocaleString()} HTG
          </Text>
          <View style={styles.walletDivider} />
          <Text style={styles.walletRowLabel}>Total gagne</Text>
          <Text style={styles.walletAmountSmall}>
            {(walletData?.wallet?.total_gagne ?? 0).toLocaleString()} HTG
          </Text>
          <Text style={styles.walletRowLabel}>Total retire</Text>
          <Text style={styles.walletAmountSmall}>
            {(walletData?.wallet?.total_retire ?? 0).toLocaleString()} HTG
          </Text>
          <TouchableOpacity
            style={[
              styles.retirerButton,
              (!walletData?.retrait_possible || (walletData?.wallet?.balance ?? 0) < (walletData?.regles?.montant_minimum ?? 500)) && styles.retirerButtonDisabled,
            ]}
            onPress={() => {
              if (!walletData?.retrait_possible || (walletData?.wallet?.balance ?? 0) < (walletData?.regles?.montant_minimum ?? 500)) return;
              const def = user?.default_method && ['moncash', 'natcash', 'bank'].includes(user.default_method)
                ? (user.default_method as 'moncash' | 'natcash' | 'bank')
                : 'moncash';
              setWithdrawMethod(def);
              setWithdrawModalVisible(true);
            }}
            disabled={!walletData?.retrait_possible || (walletData?.wallet?.balance ?? 0) < (walletData?.regles?.montant_minimum ?? 500)}
          >
            <Ionicons name="cash-outline" size={20} color="white" />
            <Text style={styles.retirerButtonText}>RETIRE KOUNYE A</Text>
          </TouchableOpacity>
          {walletData?.retrait_possible ? (
            <Text style={styles.walletNote}>
              Retrait disponib (Balans ≥ {(walletData?.regles?.seuil_automatique ?? 1000).toLocaleString()} HTG)
            </Text>
          ) : walletData?.raison ? (
            <Text style={styles.walletNoteWarning}>{walletData.raison}</Text>
          ) : (
            <Text style={styles.walletNote}>
              Antre mwayen peman anba a epi ranpli balans pou retire
            </Text>
          )}
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
              <Text style={styles.bankFieldLabel}>Bank</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setBankModalVisible(true)}
              >
                <Text style={form.bank_name ? styles.selectText : styles.selectPlaceholder}>
                  {form.bank_name || 'Chwazi bank (Ayiti)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.bankFieldLabel}>Non sou kont</Text>
              <TextInput
                style={styles.input}
                placeholder="Non moun ki sou kont la"
                value={form.bank_account_name}
                onChangeText={(value) => setForm({ ...form, bank_account_name: value })}
              />
              <Text style={styles.bankFieldLabel}>Nimewo kont</Text>
              <TextInput
                style={styles.input}
                placeholder="Antre nimewo kont (san espas)"
                value={form.bank_account_number}
                onChangeText={(value) => setForm({ ...form, bank_account_number: value })}
                keyboardType="number-pad"
              />
              <Text style={styles.helperText}>{NUMERO_KONT_FORMAT}</Text>
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

        {/* Historique (transactions + retraits) */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Istorik</Text>
          {transactions.slice(0, 20).map((tx: any, index) => {
            const isRetrait = (tx.type || '').includes('retrait');
            const isPositive = (tx.montant || 0) >= 0;
            const dateStr = tx.date ? new Date(tx.date).toLocaleDateString('fr-HT', { day: 'numeric', month: 'short' }) : '—';
            const label = tx.type === 'course_completed' ? `Kous → +${Math.abs(tx.montant || 0).toLocaleString()} HTG` : tx.type === 'retrait_traite' ? `Retrait → -${Math.abs(tx.montant || 0).toLocaleString()} HTG ✓ Peye` : tx.type === 'retrait_demande' ? `Retrait → -${Math.abs(tx.montant || 0).toLocaleString()} HTG (an attant)` : `${tx.type} ${isPositive ? '+' : ''}${(tx.montant || 0).toLocaleString()} HTG`;
            return (
              <View key={tx.id || index} style={styles.earningItem}>
                <View style={styles.earningLeft}>
                  <Ionicons
                    name={isRetrait ? 'cash-outline' : 'car'}
                    size={20}
                    color={isPositive ? Colors.success : Colors.textSecondary}
                  />
                  <View>
                    <Text style={styles.earningRoute} numberOfLines={1}>{label}</Text>
                    <Text style={styles.earningDate}>{dateStr}</Text>
                  </View>
                </View>
                <Text style={[styles.earningAmount, !isPositive && styles.earningAmountNegative]}>
                  {isPositive ? '+' : ''}{(tx.montant || 0).toLocaleString()} HTG
                </Text>
              </View>
            );
          })}
          {transactions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Pa gen tranzaksyon ankò</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !withdrawing && setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Demande retrait</Text>
            <Text style={styles.bankFieldLabel}>Montan (HTG)</Text>
            <TextInput
              style={styles.input}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder={`Minimum ${walletData?.regles?.montant_minimum ?? 500} HTG`}
              keyboardType="number-pad"
              placeholderTextColor={Colors.textSecondary}
            />
            <View style={styles.quickAmounts}>
              {[500, 1000, 2000].map((n) => (
                <TouchableOpacity key={n} style={styles.quickAmountBtn} onPress={() => setWithdrawAmount(String(n))}>
                  <Text style={styles.quickAmountText}>{n.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.quickAmountBtn}
                onPress={() => setWithdrawAmount(String(Math.floor(walletData?.wallet?.balance ?? 0)))}
              >
                <Text style={styles.quickAmountText}>Tout</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bankFieldLabel}>Mwayen peyeman</Text>
            <View style={styles.defaultRow}>
              {(['moncash', 'natcash', 'bank'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.defaultButton, withdrawMethod === m && styles.defaultButtonActive]}
                  onPress={() => setWithdrawMethod(m)}
                >
                  <Text style={[styles.defaultText, withdrawMethod === m && styles.defaultTextActive]}>
                    {m === 'bank' ? 'Kont bank' : m === 'moncash' ? 'MonCash' : 'NatCash'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              Ou ka retire nan MonCash, NatCash oswa kont bank. Si w chwazi kont bank, konfigire bank ou anba a (Mwayen pou resevwa lajan).
            </Text>
            <Text style={styles.helperText}>Tretman anba 24h</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => !withdrawing && setWithdrawModalVisible(false)}>
                <Text style={styles.modalCloseText}>Anile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, styles.modalSubmitButton, withdrawing && styles.saveButtonDisabled]} onPress={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Voye demann</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bankModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chwazi bank (Ayiti)</Text>
            <TextInput
              style={styles.bankSearchInput}
              placeholder="Chache bank..."
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholderTextColor={Colors.textSecondary}
            />
            <ScrollView style={styles.bankScroll} contentContainerStyle={styles.bankList}>
              {banksFiltered.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.bankItem}
                  onPress={() => {
                    setForm((f) => ({ ...f, bank_name: bank }));
                    setBankModalVisible(false);
                    setBankSearch('');
                  }}
                >
                  <Text style={styles.bankText}>{bank}</Text>
                </TouchableOpacity>
              ))}
              {banksFiltered.length === 0 && (
                <Text style={styles.emptyBankText}>Pa gen bank ki matche</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setBankModalVisible(false);
                setBankSearch('');
              }}
            >
              <Text style={styles.modalCloseText}>Fèmen</Text>
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
  walletRowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  walletAmountSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  walletDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 10,
  },
  retirerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 2,
    borderColor: 'white',
  },
  retirerButtonDisabled: {
    opacity: 0.6,
  },
  retirerButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  walletNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
  },
  walletNoteWarning: {
    fontSize: 12,
    color: 'rgba(255,200,200,0.95)',
    marginTop: 10,
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
  bankFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
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
  bankSearchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  bankScroll: {
    maxHeight: 280,
  },
  bankList: {
    gap: 0,
  },
  bankItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankText: {
    fontSize: 14,
    color: Colors.text,
  },
  emptyBankText: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingVertical: 16,
    textAlign: 'center',
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
  earningAmountNegative: {
    color: Colors.textSecondary,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickAmountBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  modalSubmitButton: {
    flex: 1,
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
