import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function AdminEditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Erè', 'Email pa valid');
      return;
    }
    setSavingProfile(true);
    try {
      const response = await profileAPI.update({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim() });
      }
      Alert.alert('Siksè', 'Profil mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erè', 'Tanpri ranpli tout chan yo');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erè', 'Modpas dwe gen omwen 6 karak');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erè', 'Modpas yo pa menm');
      return;
    }
    setSavingPassword(true);
    try {
      await profileAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Siksè', 'Modpas chanje');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab chanje modpas');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePickLogo = async () => {
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

      setSavingLogo(true);
      const logo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const response = await profileAPI.update({ logo });
      if (response.data?.user) {
        updateUser({ logo: response.data.user.logo });
      } else {
        updateUser({ logo });
      }
      Alert.alert('Siksè', 'Logo mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou logo a');
    } finally {
      setSavingLogo(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifye Profil</Text>

        {user?.brand_name && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Logo</Text>
            <View style={styles.avatarRow}>
              {user?.logo ? (
                <Image source={{ uri: user.logo }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="shield" size={24} color="white" />
                </View>
              )}
              <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo} disabled={savingLogo}>
                <Ionicons name="camera" size={16} color="white" />
                <Text style={styles.logoButtonText}>{savingLogo ? 'Ap mete...' : 'Chanje logo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enfòmasyon Pèsonèl</Text>
          <TextInput style={styles.input} placeholder="Non konplè" value={fullName} onChangeText={setFullName} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Nimewo telefòn"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Sove</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chanje Modpas</Text>
          <TextInput
            style={styles.input}
            placeholder="Modpas aktyèl"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Nouvo modpas"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Konfime nouvo modpas"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.saveButton, savingPassword && styles.saveButtonDisabled]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Chanje Modpas</Text>
            )}
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
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
