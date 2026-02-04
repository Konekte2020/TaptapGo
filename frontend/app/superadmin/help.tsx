import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';

export default function SuperAdminHelp() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/superadmin/settings')}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.title}>Èd</Text>
        </View>
        <Text style={styles.text}>
          Pou asistans, kontakte ekip TapTapGo.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL('mailto:support@taptapgo.com')}
          >
            <Text style={styles.buttonText}>Voye Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={() => Linking.openURL('https://taptapgo.com')}
          >
            <Text style={styles.buttonOutlineText}>Vizite Sit Web</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: Colors.text,
    fontWeight: '600',
  },
});
