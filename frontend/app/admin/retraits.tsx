import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { retraitsAPI } from '../../src/services/api';

export default function AdminRetraits() {
  const [loading, setLoading] = useState(true);
  const [retraits, setRetraits] = useState<any[]>([]);
  const [stats, setStats] = useState({
    en_attente_count: 0,
    en_attente_total: 0,
    traites_aujourdhui_count: 0,
    traites_aujourdhui_total: 0,
  });
  const [filterMethode, setFilterMethode] = useState<string | null>(null);
  const [filterMinMontant, setFilterMinMontant] = useState<number | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchRetraits = async () => {
    setLoading(true);
    try {
      const params: { statut?: string; methode?: string; min_montant?: number } = {};
      if (filterMethode) params.methode = filterMethode;
      if (filterMinMontant != null) params.min_montant = filterMinMontant;
      const response = await retraitsAPI.list(params);
      setRetraits(response.data.retraits || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Fetch retraits error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetraits();
  }, [filterMethode, filterMinMontant]);

  const handleTraiter = (retrait: any) => {
    Alert.alert(
      'Make kòm peye',
      `Ou vle make retrait ${retrait.montant} HTG (${retrait.chauffeur_nom}) kòm peye?`,
      [
        { text: 'Anile', style: 'cancel' },
        {
          text: 'Wi, peye',
          onPress: async () => {
            setActingId(retrait.id);
            try {
              await retraitsAPI.traiter(retrait.id);
              if (Platform.OS === 'web') window.alert('Retrait make kòm peye');
              else Alert.alert('Siksè', 'Retrait make kòm peye');
              fetchRetraits();
            } catch (err: any) {
              Alert.alert('Erè', err.response?.data?.detail || 'Pa kapab mete ajou');
            } finally {
              setActingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAnnuler = (retrait: any) => {
    Alert.alert(
      'Anile retrait',
      `Ou vle anile retrait ${retrait.montant} HTG (${retrait.chauffeur_nom})? Lajan an ap remet nan wallet chofè a.`,
      [
        { text: 'Pa anile', style: 'cancel' },
        {
          text: 'Wi, anile',
          style: 'destructive',
          onPress: async () => {
            setActingId(retrait.id);
            try {
              await retraitsAPI.annuler(retrait.id);
              if (Platform.OS === 'web') window.alert('Retrait anile');
              else Alert.alert('Siksè', 'Retrait anile');
              fetchRetraits();
            } catch (err: any) {
              Alert.alert('Erè', err.response?.data?.detail || 'Pa kapab anile');
            } finally {
              setActingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    const now = new Date();
    const diff = (now.getTime() - dt.getTime()) / 60000;
    if (diff < 60) return `Nan ${Math.floor(diff)} min`;
    if (diff < 1440) return `Nan ${Math.floor(diff / 60)}h`;
    return dt.toLocaleDateString('fr-HT');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRetraits} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Retraits chofè</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>An attant</Text>
            <Text style={styles.statValue}>{stats.en_attente_count}</Text>
            <Text style={styles.statSub}>Total: {stats.en_attente_total.toLocaleString()} HTG</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tretè jodi a</Text>
            <Text style={styles.statValue}>{stats.traites_aujourdhui_count}</Text>
            <Text style={styles.statSub}>Total: {stats.traites_aujourdhui_total.toLocaleString()} HTG</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterBtn, filterMinMontant === null && styles.filterBtnActive]}
            onPress={() => setFilterMinMontant(null)}
          >
            <Text style={[styles.filterBtnText, filterMinMontant === null && styles.filterBtnTextActive]}>Tout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filterMinMontant === 1000 && styles.filterBtnActive]}
            onPress={() => setFilterMinMontant(filterMinMontant === 1000 ? null : 1000)}
          >
            <Text style={[styles.filterBtnText, filterMinMontant === 1000 && styles.filterBtnTextActive]}>≥ 1,000 HTG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filterMethode === 'moncash' && styles.filterBtnActive]}
            onPress={() => setFilterMethode(filterMethode === 'moncash' ? null : 'moncash')}
          >
            <Text style={[styles.filterBtnText, filterMethode === 'moncash' && styles.filterBtnTextActive]}>MonCash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filterMethode === 'natcash' && styles.filterBtnActive]}
            onPress={() => setFilterMethode(filterMethode === 'natcash' ? null : 'natcash')}
          >
            <Text style={[styles.filterBtnText, filterMethode === 'natcash' && styles.filterBtnTextActive]}>NatCash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filterMethode === 'bank' && styles.filterBtnActive]}
            onPress={() => setFilterMethode(filterMethode === 'bank' ? null : 'bank')}
          >
            <Text style={[styles.filterBtnText, filterMethode === 'bank' && styles.filterBtnTextActive]}>Kont bank</Text>
          </TouchableOpacity>
        </View>

        {loading && retraits.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          retraits.map((r) => (
            <View key={r.id} style={[styles.retraitCard, r.type_retrait === 'automatique_disponible' && styles.retraitCardAuto]}>
              <View style={styles.retraitHeader}>
                <View>
                  <Text style={styles.chauffeurName}>{r.chauffeur_nom || 'Chofè'}</Text>
                  {r.type_retrait === 'automatique_disponible' && (
                    <View style={styles.badgeAuto}>
                      <Text style={styles.badgeAutoText}>Retrait oto ≥1000</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.montant}>{Number(r.montant).toLocaleString()} HTG</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Telefòn</Text>
                <Text style={styles.detailValue}>{r.chauffeur_phone || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {r.methode === 'moncash' ? 'MonCash' : r.methode === 'natcash' ? 'NatCash' : 'Kont bank'}
                </Text>
                <Text style={styles.detailValue}>
                  {r.methode === 'bank'
                    ? [r.bank_name, r.bank_account_name, r.numero_compte].filter(Boolean).join(' • ') || r.numero_compte || '—'
                    : (r.numero_compte || '—')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Demande</Text>
                <Text style={styles.detailValue}>{formatDate(r.date_demande)}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btnPayer, actingId === r.id && styles.btnDisabled]}
                  onPress={() => handleTraiter(r)}
                  disabled={!!actingId}
                >
                  {actingId === r.id ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.btnPayerText}>✓ Make kòm peye</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnAnnuler, actingId === r.id && styles.btnDisabled]}
                  onPress={() => handleAnnuler(r)}
                  disabled={!!actingId}
                >
                  <Text style={styles.btnAnnulerText}>✗ Anile</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {!loading && retraits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Pa gen retrait an attant</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
  statSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBtnText: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  filterBtnTextActive: { color: 'white' },
  loader: { marginTop: 24 },
  retraitCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  retraitCardAuto: { borderLeftWidth: 4, borderLeftColor: Colors.primary },
  retraitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  chauffeurName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  badgeAuto: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeAutoText: { fontSize: 10, color: 'white', fontWeight: '600' },
  montant: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: Colors.textSecondary },
  detailValue: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnPayer: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPayerText: { color: 'white', fontWeight: '600', fontSize: 14 },
  btnAnnuler: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnAnnulerText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
