import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function AdminLayoutNative() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/role-select');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Interface Administration disponible uniquement sur web.
      </Text>
      <Text style={styles.subtitle}>
        Connectez-vous depuis un navigateur.
      </Text>
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
  },
});
