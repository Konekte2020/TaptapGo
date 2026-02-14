import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';
import { useProtectedRoute } from '../src/components/ProtectedRoute';
import { API_URL } from '../src/services/api';

export default function Index() {
  useProtectedRoute();
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // Sur web, afficher la landing à la racine (http://localhost:8081)
  if (Platform.OS === 'web') {
    const landingBase =
      typeof window !== 'undefined' && window.location.origin === API_URL
        ? 'http://localhost:8000'
        : API_URL;
    return (
      <View style={styles.webContainer}>
        {React.createElement('iframe', {
          src: `${landingBase}/landing`,
          style: { width: '100%', height: '100%', border: 0 },
          title: 'Landing TapTapGo',
        })}
      </View>
    );
  }

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        // Navigate based on user type
        switch (user.user_type) {
          case 'passenger':
            router.replace('/passenger/home');
            break;
          case 'driver':
            // Chauffeur non approuvé (documents non vérifiés) → écran "En atant"
            if (user.status !== 'approved') {
              router.replace('/driver/pending');
            } else {
              router.replace('/driver/home');
            }
            break;
          case 'admin':
            router.replace('/admin/dashboard');
            break;
          case 'superadmin':
            router.replace('/superadmin/dashboard');
            break;
          case 'subadmin':
            router.replace('/souadmin/dashboard');
            break;
          default:
            router.replace('/auth/role-select');
        }
      } else {
        router.replace('/auth/role-select');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Transpò ou, nan men ou</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  logo: {
    width: 250,
    height: 100,
  },
  tagline: {
    fontSize: 18,
    color: Colors.secondary,
    marginTop: 20,
    fontWeight: '500',
  },
});
