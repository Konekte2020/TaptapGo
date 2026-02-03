import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && user) {
          // Navigate based on user type
          switch (user.user_type) {
            case 'passenger':
              router.replace('/passenger/home');
              break;
            case 'driver':
              router.replace('/driver/home');
              break;
            case 'admin':
              router.replace('/admin/dashboard');
              break;
            case 'superadmin':
              router.replace('/superadmin/dashboard');
              break;
            default:
              router.replace('/auth/role-select');
          }
        } else {
          router.replace('/auth/role-select');
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user]);

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
