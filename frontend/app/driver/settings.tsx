import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useDriverSettingsStore } from '../../src/store/driverSettingsStore';
import { NOTIFICATION_SOUNDS } from '../../src/constants/notificationSounds';
import { playNotificationPreview } from '../../src/utils/playNotificationPreview';

export default function DriverSettings() {
  const router = useRouter();
  const {
    rideSoundEnabled,
    rideSoundIndex,
    vibrationEnabled,
    loaded,
    setRideSoundEnabled,
    setRideSoundIndex,
    setVibrationEnabled,
    load,
  } = useDriverSettingsStore();
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectSound = async (s: (typeof NOTIFICATION_SOUNDS)[0]) => {
    setPlayingId(s.id);
    await playNotificationPreview(s.source);
    setPlayingId(null);
    setRideSoundIndex(s.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Paramèt</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demand de kous</Text>

        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          <Text style={styles.label}>Son pou nouvel demand</Text>
          <Switch
            value={loaded ? rideSoundEnabled : true}
            onValueChange={setRideSoundEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.row}>
          <Ionicons name="phone-portrait-outline" size={22} color={Colors.text} />
          <Text style={styles.label}>Vibrasyon</Text>
          <Switch
            value={loaded ? vibrationEnabled : true}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.hint}>
          Lè yon pasaje mande yon kous, ou ka chwazi si ou vle tande yon son epi si ou vle vibrasyon.
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Chwazi son an</Text>
        <Text style={styles.hint}>Touche yon son pou tande li (ékout), epi chwazi li. Se sa ki ap jwe lè gen nouvel demand.</Text>
        <View style={styles.soundList}>
          {NOTIFICATION_SOUNDS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.soundItem, rideSoundIndex === s.id && styles.soundItemActive]}
              onPress={() => handleSelectSound(s)}
            >
              {playingId === s.id ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name={rideSoundIndex === s.id ? 'checkmark-circle' : 'musical-notes-outline'}
                  size={22}
                  color={rideSoundIndex === s.id ? Colors.primary : Colors.textSecondary}
                />
              )}
              <Text style={styles.soundLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  soundList: {
    gap: 8,
    marginTop: 8,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  soundItemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  soundLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  soundLabelDisabled: {
    color: Colors.textSecondary,
  },
});
