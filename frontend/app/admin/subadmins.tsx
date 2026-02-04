import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { subadminAPI } from '../../src/services/api';

export default function AdminSubadmins() {
  const [subadmins, setSubadmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    force_password_change: true,
  });

  const fetchSubadmins = async () => {
    setLoading(true);
    try {
      const response = await subadminAPI.getAll();
      setSubadmins(response.data.subadmins || []);
    } catch (error) {
      console.error('Fetch subadmins error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubadmins();
  }, []);

  const resetForm = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      force_password_change: true,
    });
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.password) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }
    setSaving(true);
    try {
      await subadminAPI.create(form);
      Alert.alert('Siksè', 'SouAdmin kreye');
      setModalVisible(false);
      resetForm();
      fetchSubadmins();
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab kreye souadmin');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (item: any) => {
    Alert.alert(
      item.is_active ? 'Sispann SouAdmin' : 'Re-aktive SouAdmin',
      item.is_active
        ? 'Ou sèten ou vle sispann souadmin sa a?'
        : 'Ou vle re-aktive souadmin sa a?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          onPress: async () => {
            try {
              await subadminAPI.setStatus(item.id, !item.is_active);
              fetchSubadmins();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Siprime SouAdmin',
      'Aksyon sa a pa ka retounen. Ou sèten?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi, siprime',
          style: 'destructive',
          onPress: async () => {
            try {
              await subadminAPI.delete(item.id);
              fetchSubadmins();
            } catch (error: any) {
              Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab siprime');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.meta}>{item.email}</Text>
          <Text style={styles.meta}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_active && styles.activeBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Aktif' : 'Inaktif'}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={() => handleToggle(item)}
        >
          <Ionicons name={item.is_active ? 'pause' : 'play'} size={16} color={Colors.text} />
          <Text style={styles.actionText}>{item.is_active ? 'Sispann' : 'Re-aktive'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionDanger]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={[styles.actionText, styles.actionTextLight]}>Siprime</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SouAdmin</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subadmins}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSubadmins} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen souadmin</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Kreye SouAdmin</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              <Text style={styles.saveButton}>{saving ? 'Ap sove...' : 'Kreye'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Non konplè"
              value={form.full_name}
              onChangeText={(text) => setForm({ ...form, full_name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Telefòn"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Modpas"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              secureTextEntry
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Obligatwa chanje modpas</Text>
              <Switch
                value={form.force_password_change}
                onValueChange={(value) => setForm({ ...form, force_password_change: value })}
              />
            </View>
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
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionSecondary: {
    backgroundColor: Colors.surface,
  },
  actionDanger: {
    backgroundColor: Colors.error,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  actionTextLight: {
    color: 'white',
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
    padding: 20,
    gap: 12,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
