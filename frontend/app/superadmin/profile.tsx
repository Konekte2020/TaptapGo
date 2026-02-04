import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, RefreshControl, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function SuperAdminProfile() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await profileAPI.get();
      setProfile(response.data.user);
      setForm({
        full_name: response.data.user?.full_name || '',
        email: response.data.user?.email || '',
        phone: response.data.user?.phone || '',
      });
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
      });
      setProfile(response.data.user);
      Alert.alert('Siksè', 'Profil mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProfile} />}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={32} color="white" />
            </View>
            <View>
              <Text style={styles.title}>Profil SuperAdmin</Text>
              <Text style={styles.subtitle}>TapTapGo</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Non</Text>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={(text) => setForm({ ...form, full_name: text })}
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Telefòn</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Wòl</Text>
            <Text style={styles.value}>SuperAdmin</Text>
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
        </View>
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
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoRow: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
