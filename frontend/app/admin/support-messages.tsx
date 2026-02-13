import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { supportMessagesAPI, type SupportMessage } from '../../src/services/api';

export default function AdminSupportMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openMessage, setOpenMessage] = useState<SupportMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await supportMessagesAPI.list();
      setMessages(res.data?.messages || []);
    } catch (e) {
      console.error('Fetch support messages error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const handleUpdateStatus = async (msg: SupportMessage, status: string) => {
    setUpdating(true);
    try {
      await supportMessagesAPI.update(msg.id, { status });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status } : m)));
      if (openMessage?.id === msg.id) setOpenMessage({ ...openMessage, status });
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab mete ajou.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!openMessage) return;
    setUpdating(true);
    try {
      await supportMessagesAPI.update(openMessage.id, { admin_notes: adminNotes.trim() });
      setMessages((prev) => prev.map((m) => (m.id === openMessage.id ? { ...m, admin_notes: adminNotes.trim() } : m)));
      setOpenMessage({ ...openMessage, admin_notes: adminNotes.trim() });
      Alert.alert('Siksè', 'Nòt ou anrejistre.');
    } catch (e: any) {
      Alert.alert('Erè', e?.response?.data?.detail || 'Pa kapab anrejistre nòt la.');
    } finally {
      setUpdating(false);
    }
  };

  const pendingCount = messages.filter((m) => m.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chajman...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesaj Sipò (Sant Èd)</Text>
        <Text style={styles.subtitle}>Mesaj moun voye depi landing la (bouton Pale Ak Yon Ajan)</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount} an atant</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen mesaj sipò toujou.</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <Pressable key={msg.id} style={styles.card} onPress={() => { setOpenMessage(msg); setAdminNotes(msg.admin_notes || ''); }}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{msg.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: msg.status === 'pending' ? Colors.warning : msg.status === 'replied' ? Colors.success : Colors.textSecondary }]}>
                  <Text style={styles.statusText}>{msg.status === 'pending' ? 'An atant' : msg.status === 'replied' ? 'Reponn' : msg.status === 'read' ? 'Li' : 'Archive'}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>📞 {msg.phone} · ✉️ {msg.email}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{msg.message}</Text>
              <Text style={styles.cardDate}>{new Date(msg.created_at).toLocaleString()}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {openMessage && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{openMessage.name}</Text>
              <Pressable onPress={() => { setOpenMessage(null); setAdminNotes(''); }} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Telefòn</Text>
              <Text style={styles.modalValue}>{openMessage.phone}</Text>
              <Text style={styles.modalLabel}>Imèl</Text>
              <Text style={styles.modalValue}>{openMessage.email}</Text>
              <Text style={styles.modalLabel}>Mesaj</Text>
              <Text style={styles.modalValue}>{openMessage.message}</Text>
              <Text style={styles.modalLabel}>Dat</Text>
              <Text style={styles.modalValue}>{new Date(openMessage.created_at).toLocaleString()}</Text>

              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Nòt admin</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Ajoute yon nòt..."
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSaveNotes} disabled={updating}>
                {updating ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="save" size={18} color="white" />}
                <Text style={styles.btnText}>Anrejistre nòt</Text>
              </Pressable>
            </ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 20, borderTopWidth: 1, borderTopColor: Colors.border }}>
              {openMessage.status === 'pending' && (
                <Pressable style={[styles.btn, { backgroundColor: Colors.success }]} onPress={() => handleUpdateStatus(openMessage, 'read')} disabled={updating}>
                  <Text style={styles.btnText}>Li</Text>
                </Pressable>
              )}
              {openMessage.status !== 'replied' && (
                <Pressable style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={() => handleUpdateStatus(openMessage, 'replied')} disabled={updating}>
                  <Text style={styles.btnText}>Reponn</Text>
                </Pressable>
              )}
              {openMessage.status !== 'archived' && (
                <Pressable style={[styles.btn, { backgroundColor: Colors.textSecondary }]} onPress={() => handleUpdateStatus(openMessage, 'archived')} disabled={updating}>
                  <Text style={styles.btnText}>Archive</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.warning, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  badgeText: { fontSize: 12, color: 'white', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, ...Shadows.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: 'white', fontWeight: '600' },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  cardMessage: { fontSize: 14, color: Colors.text, marginTop: 4 },
  cardDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 8 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalClose: { padding: 4 },
  modalBody: { padding: 20, maxHeight: 400 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  modalValue: { fontSize: 14, color: Colors.text, marginBottom: 12 },
  input: { borderWidth: 2, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 8 },
  btnPrimary: { backgroundColor: Colors.primary },
  btnText: { fontSize: 14, fontWeight: '600', color: 'white' },
});
