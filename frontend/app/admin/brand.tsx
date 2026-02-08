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

const isHexColor = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

export default function AdminBrand() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  const [brandName, setBrandName] = useState(user?.brand_name || '');
  const [primaryColor, setPrimaryColor] = useState(user?.primary_color || Colors.primary);
  const [secondaryColor, setSecondaryColor] = useState(user?.secondary_color || Colors.secondary);
  const [tertiaryColor, setTertiaryColor] = useState(user?.tertiary_color || '#F4B400');
  const [logo, setLogo] = useState(user?.logo || '');

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
      const nextLogo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLogo(nextLogo);
    } finally {
      setSavingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!brandName.trim()) {
      Alert.alert('Erè', 'Non brand obligatwa');
      return;
    }
    if (!isHexColor(primaryColor) || !isHexColor(secondaryColor) || !isHexColor(tertiaryColor)) {
      Alert.alert('Erè', 'Koulè yo dwe nan fòma hex (eg: #E53935)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        brand_name: brandName.trim(),
        primary_color: primaryColor.trim(),
        secondary_color: secondaryColor.trim(),
        tertiary_color: tertiaryColor.trim(),
        logo: logo || undefined,
      };
      const response = await profileAPI.update(payload);
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser(payload);
      }
      Alert.alert('Siksè', 'Brand mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab sove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pesonàlize Brand</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Logo</Text>
          <View style={styles.logoRow}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor }]}>
                <Ionicons name="shield" size={24} color="white" />
              </View>
            )}
            <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo} disabled={savingLogo}>
              <Ionicons name="camera" size={16} color="white" />
              <Text style={styles.logoButtonText}>{savingLogo ? 'Ap mete...' : 'Chanje logo'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Non Brand</Text>
          <TextInput
            style={styles.input}
            placeholder="Non brand"
            value={brandName}
            onChangeText={setBrandName}
          />

          <Text style={styles.sectionTitle}>Koulè Primè</Text>
          <TextInput
            style={styles.input}
            placeholder="#E53935"
            value={primaryColor}
            onChangeText={setPrimaryColor}
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Koulè Segondè</Text>
          <TextInput
            style={styles.input}
            placeholder="#1E3A5F"
            value={secondaryColor}
            onChangeText={setSecondaryColor}
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Twazyèm Koulè</Text>
          <TextInput
            style={styles.input}
            placeholder="#F4B400"
            value={tertiaryColor}
            onChangeText={setTertiaryColor}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Sove</Text>}
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  logoRow: {
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
    alignItems: 'center',
    justifyContent: 'center',
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
