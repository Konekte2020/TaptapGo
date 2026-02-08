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

export default function DriverEditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !city.trim()) {
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
        city: city.trim(),
      });
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
        });
      }
      Alert.alert('Siksè', 'Profil mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou profil');
    } finally {
      setSavingProfile(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/driver/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifye Profil</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Foto Profil</Text>
          <View style={styles.avatarRow}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto} disabled={savingPhoto}>
              <Ionicons name="camera" size={16} color="white" />
              <Text style={styles.photoButtonText}>{savingPhoto ? 'Ap mete...' : 'Chanje foto'}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
          <TextInput style={styles.input} placeholder="Vil" value={city} onChangeText={setCity} />
          <TouchableOpacity
            style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Sove</Text>}
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  photoButtonText: {
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
