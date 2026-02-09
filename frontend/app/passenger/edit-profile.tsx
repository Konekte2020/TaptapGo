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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function PassengerEditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

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

  const openImagePicker = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Otorizasyon refize', 'Tanpri pèmèt aksè kamera.');
          return;
        }
      } else if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Otorizasyon refize', 'Tanpri pèmèt aksè galri a.');
          return;
        }
      }

      const picker =
        source === 'camera'
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;

      const result = await picker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
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

  const handlePickPhoto = () => {
    Alert.alert(
      'Ajoute foto',
      'Chwazi sous foto a',
      [
        { text: 'Galri', onPress: () => openImagePicker('library') },
        { text: 'Kamera', onPress: () => openImagePicker('camera') },
        { text: 'Anile', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/passenger/profile')}>
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
    backgroundColor: Colors.surface,
    borderRadius: 18,
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
    gap: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    ...Shadows.small,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  photoButton: {
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: Colors.text,
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...Shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
