import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { notificationsAPI } from '../../src/services/api';

export default function SuperAdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="notifications" size={18} color={Colors.primary} />
        <Text style={styles.title}>{item.title}</Text>
      </View>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.date}>{String(item.created_at || '').slice(0, 10)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifikasyon</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Pa gen notifikasyon</Text>
          </View>
        }
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
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
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  body: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.textSecondary,
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
});
