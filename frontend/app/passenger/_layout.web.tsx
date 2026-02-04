import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function PassengerLayoutWeb() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/role-select');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Interface Passager disponible uniquement sur mobile.
      </Text>
      <Text style={styles.subtitle}>Téléchargez l'app.</Text>
      <Link href="https://play.google.com/store" style={styles.button}>
        <Text style={styles.buttonText}>Télécharger sur Android</Text>
      </Link>
      <Link href="https://apps.apple.com" style={styles.button}>
        <Text style={styles.buttonText}>Télécharger sur iOS</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  buttonText: {
    color: Colors.background,
    fontWeight: '600',
  },
});
