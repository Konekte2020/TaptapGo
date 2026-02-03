import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';

export default function RoleSelect() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Byenveni nan TapTapGo!</Text>
        <Text style={styles.subtitle}>Chwazi ki moun ou ye</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/auth/login?type=passenger')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.primary }]}>
              <Ionicons name="person" size={40} color="white" />
            </View>
            <Text style={styles.optionTitle}>Mwen se PASAJÈ</Text>
            <Text style={styles.optionDesc}>Mande yon kous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/auth/login?type=driver')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.secondary }]}>
              <Ionicons name="car" size={40} color="white" />
            </View>
            <Text style={styles.optionTitle}>Mwen se CHOFÈ</Text>
            <Text style={styles.optionDesc}>Kondüi ak fè lajan</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.adminLink}
          onPress={() => router.push('/auth/login?type=admin')}
        >
          <Ionicons name="shield" size={20} color={Colors.textSecondary} />
          <Text style={styles.adminText}>Konekte kòm Admin</Text>
        </TouchableOpacity>
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
  logo: {
    width: 200,
    height: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Shadows.medium,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  adminText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
