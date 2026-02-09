import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { profileAPI } from '../../src/services/api';

export default function DriverPending() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    let active = true;
    const refreshProfile = async () => {
      try {
        const response = await profileAPI.get();
        const nextUser = response.data?.user;
        if (!active || !nextUser) return;
        if (nextUser.status === 'approved') {
          router.replace('/driver/home');
        }
      } catch (error) {
        console.error('Profile refresh error:', error);
      }
    };
    refreshProfile();
    const timer = setInterval(refreshProfile, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time" size={80} color={Colors.warning} />
        </View>
        
        <Text style={styles.title}>An Atant Apwobasyon</Text>
        <Text style={styles.subtitle}>
          Mèsi pou enskripsyon ou, {user?.full_name?.split(' ')[0]}!
        </Text>
        
        <Text style={styles.message}>
          Kont ou an atant apwobasyon admin. N ap kontakte ou lè kont ou apwouve.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.statusText}>Enfòmasyon resevwa</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.statusText}>Dokiman upload</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="time" size={20} color={Colors.warning} />
            <Text style={styles.statusText}>Verifikasyon an kou...</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="ellipse-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.statusText, styles.statusPending]}>Apwobasyon final</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Pwosèsis la pran 24-48 è de travay.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    gap: 16,
    marginBottom: 24,
    ...Shadows.small,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    color: Colors.text,
  },
  statusPending: {
    color: Colors.textSecondary,
  },
  note: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
