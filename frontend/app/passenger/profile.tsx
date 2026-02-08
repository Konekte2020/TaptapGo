import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function PassengerProfile() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [savingPhoto, setSavingPhoto] = useState(false);

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

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.base64) {
        return;
      }

      setSavingPhoto(true);
      const photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const response = await profileAPI.update({ profile_photo: photo });
      if (response.data?.user) {
        updateUser({ profile_photo: response.data.user.profile_photo });
      } else {
        updateUser({ profile_photo: photo });
      }
      Alert.alert('Siksè', 'Foto profil ou mete ajou.');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou foto a');
    } finally {
      setSavingPhoto(false);
    }
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Modifye Profil', onPress: () => router.push('/passenger/edit-profile') },
    { icon: 'card-outline', label: 'Metòd Pèman', onPress: () => router.push('/passenger/payment-methods') },
    { icon: 'notifications-outline', label: 'Notifikasyon', onPress: () => router.push('/passenger/notifications') },
    { icon: 'help-circle-outline', label: 'Èd', onPress: () => router.push('/passenger/help') },
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
            <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto} disabled={savingPhoto}>
              <Ionicons name="camera" size={16} color="white" />
              <Text style={styles.photoButtonText}>{savingPhoto ? 'Ap mete...' : 'Chanje foto'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
          <View style={styles.cityBadge}>
            <Ionicons name="location" size={14} color={Colors.primary} />
            <Text style={styles.cityText}>{user?.city}</Text>
          </View>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletInfo}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.walletLabel}>Balans Wallet</Text>
          </View>
          <Text style={styles.walletAmount}>
            {user?.wallet_balance || 0} HTG
          </Text>
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

        <Text style={styles.version}>TapTapGo v1.0.0</Text>
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
    alignItems: 'center',
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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  cityText: {
    fontSize: 13,
    color: Colors.text,
  },
  walletCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  walletAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
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
