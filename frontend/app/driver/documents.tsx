import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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

type DocumentField = 'license_photo' | 'vehicle_papers' | 'vehicle_photo';

export default function DriverDocuments() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null);
  const [previews, setPreviews] = useState<Record<DocumentField, string | undefined>>({
    license_photo: undefined,
    vehicle_papers: undefined,
    vehicle_photo: undefined,
  });

  const documents: Array<{ field: DocumentField; label: string; helper: string }> = [
    { field: 'license_photo', label: 'Pèmi Kondwi', helper: 'Foto lisans kondwi ou' },
    { field: 'vehicle_papers', label: 'Papye Veyikil', helper: 'Kat griz oswa papye machin' },
    { field: 'vehicle_photo', label: 'Foto Veyikil', helper: 'Foto devan oswa bò veyikil' },
  ];

  const getPreview = (field: DocumentField) => {
    if (previews[field]) return previews[field];
    return (user as any)?.[field] as string | undefined;
  };

  const openImagePicker = async (field: DocumentField, source: 'camera' | 'library') => {
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

      setUploadingField(field);
      const photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const response = await profileAPI.update({ [field]: photo } as any);
      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser({ [field]: photo } as any);
      }
      setPreviews((prev) => ({ ...prev, [field]: photo }));
      Alert.alert('Siksè', 'Dokiman mete ajou');
    } catch (error: any) {
      Alert.alert('Erè', error.response?.data?.detail || 'Pa kapab mete ajou dokiman');
    } finally {
      setUploadingField(null);
    }
  };

  const handlePickDocument = (field: DocumentField) => {
    Alert.alert(
      'Ajoute dokiman',
      'Chwazi sous foto a',
      [
        { text: 'Galri', onPress: () => openImagePicker(field, 'library') },
        { text: 'Kamera', onPress: () => openImagePicker(field, 'camera') },
        { text: 'Anile', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/driver/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Dokiman</Text>
        <Text style={styles.subtitle}>Telechaje tout dokiman obligatwa yo</Text>

        {documents.map((doc) => {
          const preview = getPreview(doc.field);
          const isUploading = uploadingField === doc.field;
          return (
            <View key={doc.field} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{doc.label}</Text>
                  <Text style={styles.helperText}>{doc.helper}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                  onPress={() => handlePickDocument(doc.field)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={16} color="white" />
                      <Text style={styles.uploadButtonText}>Telechaje</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.preview} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="image-outline" size={28} color={Colors.textSecondary} />
                  <Text style={styles.placeholderText}>Pa gen dokiman</Text>
                </View>
              )}
            </View>
          );
        })}
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
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    ...Shadows.small,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    resizeMode: 'cover',
    ...Shadows.small,
  },
  previewPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    ...Shadows.small,
  },
  placeholderText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
