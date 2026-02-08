import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

export default function DriverProfile() {
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
    { icon: 'person-outline', label: 'Modifye Profil', onPress: () => router.push('/driver/edit-profile') },
    { icon: 'car-outline', label: 'Enfòmasyon Machin', onPress: () => router.push('/driver/vehicle-info') },
    { icon: 'document-outline', label: 'Dokiman', onPress: () => router.push('/driver/documents') },
    { icon: 'notifications-outline', label: 'Notifikasyon', onPress: () => router.push('/driver/notifications') },
    { icon: 'help-circle-outline', label: 'Èd', onPress: () => router.push('/driver/help') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.statusIndicator, user?.is_online && styles.statusOnline]} />
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.ratingText}>{user?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.rideCount}>• {user?.total_rides || 0} kous</Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Ionicons
              name={user?.vehicle_type === 'moto' ? 'bicycle' : 'car'}
              size={28}
              color={user?.vehicle_type === 'moto' ? Colors.moto : Colors.car}
            />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {user?.vehicle_brand} {user?.vehicle_model}
              </Text>
              <Text style={styles.plateNumber}>{user?.plate_number}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: Colors.approved }]}>
            <Ionicons name="checkmark-circle" size={14} color="white" />
            <Text style={styles.statusText}>Apwouve</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.total_rides || 0}</Text>
            <Text style={styles.statLabel}>Kous</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.wallet_balance || 0}</Text>
            <Text style={styles.statLabel}>HTG</Text>
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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Dekonekte</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TapTapGo Chofè v1.0.0</Text>
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
    marginBottom: 16,
    ...Shadows.medium,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.offline,
    borderWidth: 2,
    borderColor: 'white',
  },
  statusOnline: {
    backgroundColor: Colors.online,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rideCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  vehicleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleInfo: {},
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  plateNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Shadows.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  menuContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
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
