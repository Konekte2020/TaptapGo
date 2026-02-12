import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export const useProtectedRoute = () => {
  const { isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const mainSegment = segments[0];
    if (!mainSegment) return;
    if (mainSegment === 'auth') return;

    if (
      Platform.OS !== 'web' &&
      (mainSegment === 'admin' || mainSegment === 'superadmin' || mainSegment === 'souadmin')
    ) {
      router.replace('/auth/role-select');
      return;
    }

    if (Platform.OS === 'web' && (mainSegment === 'driver' || mainSegment === 'passenger')) {
      router.replace('/auth/role-select');
    }
  }, [isLoading, router, segments]);
};
