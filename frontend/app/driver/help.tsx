import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useRouter } from 'expo-router';

export default function DriverHelp() {
  const router = useRouter();
  const handleCall = () => Linking.openURL('tel:+50900000000');
  const handleWhatsapp = () => Linking.openURL('https://wa.me/50900000000');
  const handleEmail = () => Linking.openURL('mailto:support@taptapgo.com');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/driver/profile')}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Èd & Sipò</Text>
        <Text style={styles.subtitle}>Nou la pou ede w si w gen pwoblèm</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleCall}>
          <Ionicons name="call" size={20} color={Colors.primary} />
          <Text style={styles.rowText}>Rele Sipò</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleWhatsapp}>
          <Ionicons name="logo-whatsapp" size={20} color={Colors.success} />
          <Text style={styles.rowText}>WhatsApp Sipò</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleEmail}>
          <Ionicons name="mail" size={20} color={Colors.secondary} />
          <Text style={styles.rowText}>Voye Email</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.faqTitle}>Kesyon rapid</Text>
        <Text style={styles.faqText}>- Kijan pou aksepte yon kous?</Text>
        <Text style={styles.faqText}>- Kijan pou chanje enfòmasyon machin?</Text>
        <Text style={styles.faqText}>- Kijan pou mete dokiman?</Text>
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
    padding: 20,
    paddingBottom: 0,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    margin: 20,
    marginBottom: 0,
    ...Shadows.small,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  faqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  faqText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
