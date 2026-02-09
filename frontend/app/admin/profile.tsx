import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function AdminProfile() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    logo: user?.logo || '',
  });

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

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, logo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      Alert.alert('Erè', 'Non ak email obligatwa');
      return;
    }
    setSaving(true);
    try {
      const response = await profileAPI.update({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        logo: form.logo,
      });
      updateUser(response.data.user);
      Alert.alert('Siksè', 'Profil mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove');
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Modifye Profil', onPress: () => router.push('/admin/edit-profile') },
    ...(user?.brand_name
      ? [
          { icon: 'color-palette-outline', label: 'Pesonàlize Brand', onPress: () => router.push('/admin/brand') },
          { icon: 'location-outline', label: 'Jere Vil', onPress: () => router.push('/admin/cities') },
        ]
      : []),
    { icon: 'notifications-outline', label: 'Notifikasyon', onPress: () => router.push('/admin/notifications') },
    { icon: 'document-outline', label: 'Rapò', onPress: () => router.push('/admin/reports') },
    { icon: 'help-circle-outline', label: 'Èd', onPress: () => router.push('/admin/help') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil Admin</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {form.logo ? (
              <Image source={{ uri: form.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: user?.primary_color || Colors.primary }]}>
                <Ionicons name="shield" size={40} color="white" />
              </View>
            )}
          </View>
          {user?.brand_name && (
            <>
              <TouchableOpacity style={styles.changeLogoButton} onPress={pickLogo}>
                <Text style={styles.changeLogoText}>Chanje foto</Text>
              </TouchableOpacity>
              <Text style={styles.brandName}>{user.brand_name}</Text>
            </>
          )}
          <TextInput
            style={styles.input}
            value={form.full_name}
            onChangeText={(text) => setForm({ ...form, full_name: text })}
            placeholder="Non"
          />
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            placeholder="Email"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            placeholder="Telefòn"
            keyboardType="phone-pad"
          />
          {user?.brand_name && (
            <View style={styles.badge}>
              <Ionicons name="briefcase" size={12} color="white" />
              <Text style={styles.badgeText}>Admin White-Label</Text>
            </View>
          )}
        </View>

        {/* Cities Managed */}
        {user?.brand_name && (
          <View style={styles.citiesCard}>
            <View style={styles.citiesHeader}>
              <Text style={styles.citiesTitle}>Vil ou jère</Text>
              <TouchableOpacity onPress={() => router.push('/admin/cities')}>
                <Text style={styles.citiesEdit}>Modifye</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.citiesList}>
              {(user?.cities || []).map((city, index) => (
                <View key={index} style={styles.cityChip}>
                  <Ionicons name="location" size={12} color={Colors.primary} />
                  <Text style={styles.cityText}>{city}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Brand Colors */}
        {user?.brand_name && (
          <View style={styles.colorsCard}>
            <Text style={styles.colorsTitle}>Koulè Brand</Text>
            <View style={styles.colorsRow}>
              <View style={styles.colorItem}>
                <View style={[styles.colorBox, { backgroundColor: user?.primary_color || Colors.primary }]} />
                <Text style={styles.colorLabel}>Primè</Text>
              </View>
              <View style={styles.colorItem}>
                <View style={[styles.colorBox, { backgroundColor: user?.secondary_color || Colors.secondary }]} />
                <Text style={styles.colorLabel}>Segondè</Text>
              </View>
            </View>
          </View>
        )}

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

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Ap sove...' : 'Sove chanjman'}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Dekonekte</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{user?.brand_name || 'TapTapGo'} Admin v1.0.0</Text>
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
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  changeLogoButton: {
    marginBottom: 8,
  },
  changeLogoText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  citiesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  citiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  citiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  citiesEdit: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  citiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    color: Colors.text,
  },
  colorsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  colorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  colorItem: {
    alignItems: 'center',
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
  },
  colorLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
