import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  const { loadStoredAuth, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const mainSegment = segments[0];
    if (!mainSegment) return;
    if (mainSegment === 'auth') return;

    if (
      Platform.OS !== 'web' &&
      (mainSegment === 'admin' || mainSegment === 'superadmin' || mainSegment === 'admin-souadmin')
    ) {
      router.replace('/auth/role-select');
      return;
    }

    if (
      Platform.OS === 'web' &&
      (mainSegment === 'driver' || mainSegment === 'passenger')
    ) {
      router.replace('/auth/role-select');
    }
  }, [isLoading, router, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/role-select" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register-passenger" />
        <Stack.Screen name="auth/register-driver" />
        <Stack.Screen name="auth/otp-verify" />
        <Stack.Screen name="passenger" options={{ headerShown: false }} />
        <Stack.Screen name="driver" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="admin-souadmin" options={{ headerShown: false }} />
        <Stack.Screen name="superadmin" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
