import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

export default function SuperAdminSettings() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Dekonekte',
      'Ou sèten ou vle dekonekte?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Wi',
          onPress: async () => {
            await logout();
            router.replace('/auth/role-select');
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Profil', onPress: () => router.push('/superadmin/profile') },
    { icon: 'shield-outline', label: 'Sekiri', onPress: () => router.push('/superadmin/security') },
    { icon: 'cash-outline', label: 'Pri', onPress: () => router.push('/superadmin/pricing') },
    { icon: 'notifications-outline', label: 'Notifikasyon', onPress: () => router.push('/superadmin/notifications') },
    { icon: 'document-outline', label: 'Rapò', onPress: () => router.push('/superadmin/reports') },
    { icon: 'analytics-outline', label: 'Analitik', onPress: () => router.push('/superadmin/analytics') },
    { icon: 'help-circle-outline', label: 'Èd', onPress: () => router.push('/superadmin/help') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Paramèt</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={40} color="white" />
            </View>
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badge}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.badgeText}>SuperAdmin</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon as any} size={22} color={Colors.text} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* System Info */}
        <View style={styles.systemInfo}>
          <Text style={styles.systemTitle}>Sistèm Enfòmasyon</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vèsyon</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API</Text>
            <Text style={styles.infoValue}>v1.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database</Text>
            <Text style={styles.infoValue}>Supabase</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Dekonekte</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TapTapGo Admin v1.0.0</Text>
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
  profileCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.medium,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginBottom: 20,
    ...Shadows.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  systemInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
