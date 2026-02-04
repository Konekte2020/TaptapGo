import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { adminAPI, complaintsAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminComplaints() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [admins, setAdmins] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveMessage, setResolveMessage] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  useEffect(() => {
    fetchComplaints();
    if (user?.user_type === 'superadmin') {
      fetchAdmins();
    }
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintsAPI.getAll();
      setComplaints(response.data.complaints || []);
    } catch (error) {
      console.error('Fetch complaints error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await adminAPI.getAllAdmins();
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error('Fetch admins error:', error);
    }
  };

  const openResolveModal = (item: any) => {
    setSelectedComplaint(item);
    setResolveMessage('');
    setResolveModalVisible(true);
  };

  const closeResolveModal = () => {
    setResolveModalVisible(false);
    setSelectedComplaint(null);
    setResolveMessage('');
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    if (!resolveMessage.trim()) {
      Alert.alert('Erè', 'Mesaj obligatwa');
      return;
    }
    try {
      await complaintsAPI.resolve(selectedComplaint.id, resolveMessage.trim());
      closeResolveModal();
      fetchComplaints();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="alert-circle" size={18} color={Colors.warning} />
        <Text style={styles.title}>{item.status === 'open' ? 'Plent' : 'Rezoud'}</Text>
      </View>
      <Text style={styles.meta}>
        Soti: {item.from_user_type} • Ale: {item.target_user_type}
      </Text>
      {item.admin_name && (
        <Text style={styles.meta}>Admin: {item.admin_name}</Text>
      )}
      <Text style={styles.body}>{item.message}</Text>
      <Text style={styles.date}>{String(item.created_at || '').slice(0, 10)}</Text>
      {item.status !== 'resolved' && (
        <TouchableOpacity style={styles.resolveButton} onPress={() => openResolveModal(item)}>
          <Text style={styles.resolveText}>Rezoud + voye mesaj</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const openCount = useMemo(
    () => complaints.filter((c) => c.status === 'open').length,
    [complaints]
  );

  const filteredComplaints = useMemo(() => {
    let list = complaints;
    if (filter !== 'all') {
      list = list.filter((c) => c.status === filter);
    }
    if (adminFilter !== 'all') {
      list = list.filter((c) => c.admin_id === adminFilter);
    }
    if (dateFrom) {
      list = list.filter((c) => String(c.created_at || '').slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((c) => String(c.created_at || '').slice(0, 10) <= dateTo);
    }
    return list;
  }, [complaints, filter, adminFilter, dateFrom, dateTo]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Plent</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{openCount} ouvè</Text>
          </View>
        </View>
      </View>
      <View style={styles.filterRow}>
        {['all', 'open', 'resolved'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterButton, filter === key && styles.filterButtonActive]}
            onPress={() => setFilter(key as any)}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {key === 'all' ? 'Tout' : key === 'open' ? 'Ouvè' : 'Rezoud'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {user?.user_type === 'superadmin' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminFilterRow}>
          <TouchableOpacity
            style={[styles.filterButton, adminFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setAdminFilter('all')}
          >
            <Text style={[styles.filterText, adminFilter === 'all' && styles.filterTextActive]}>
              Tout Admin
            </Text>
          </TouchableOpacity>
          {admins.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.filterButton, adminFilter === a.id && styles.filterButtonActive]}
              onPress={() => setAdminFilter(a.id)}
            >
              <Text style={[styles.filterText, adminFilter === a.id && styles.filterTextActive]}>
                {a.brand_name || a.full_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={styles.dateRow}>
        <View style={styles.dateInputWrap}>
          <Text style={styles.dateLabel}>Depi (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.dateInput}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="2026-01-01"
          />
        </View>
        <View style={styles.dateInputWrap}>
          <Text style={styles.dateLabel}>Jiska</Text>
          <TextInput
            style={styles.dateInput}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="2026-12-31"
          />
        </View>
      </View>
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchComplaints} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen plent</Text>
          </View>
        }
      />

      <Modal visible={resolveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rezoud plent</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Mesaj pou itilizatè a..."
              value={resolveMessage}
              onChangeText={setResolveMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeResolveModal}>
                <Text style={styles.modalCancelText}>Anile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSend} onPress={handleResolve}>
                <Text style={styles.modalSendText}>Rezoud</Text>
              </TouchableOpacity>
            </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  adminFilterRow: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  dateInputWrap: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: Colors.text,
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  resolveButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resolveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  modalInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalSend: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalSendText: {
    color: 'white',
    fontWeight: '600',
  },
});
