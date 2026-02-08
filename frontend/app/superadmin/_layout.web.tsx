import React, { useEffect } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/superadmin/dashboard', path: '/superadmin/dashboard', icon: 'grid' },
  { label: 'Mak Pèsonèl', href: '/superadmin/white-label', path: '/superadmin/white-label', icon: 'color-palette' },
  { label: 'Administratè', href: '/superadmin/admins', path: '/superadmin/admins', icon: 'people' },
  { label: 'Chofè', href: '/superadmin/drivers', path: '/superadmin/drivers', icon: 'car' },
  { label: 'Pasajè', href: '/superadmin/passengers', path: '/superadmin/passengers', icon: 'person' },
  { label: 'Plent', href: '/superadmin/complaints', path: '/superadmin/complaints', icon: 'alert-circle' },
  { label: 'Ajoute Vil', href: '/superadmin/cities', path: '/superadmin/cities', icon: 'location' },
  { label: 'Paramèt', href: '/superadmin/settings', path: '/superadmin/settings', icon: 'settings' },
];

export default function SuperAdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user || user.user_type !== 'superadmin') {
      router.replace('/auth/login?type=superadmin');
    }
  }, [isAuthenticated, isLoading, router, user]);

  return (
    <View style={styles.page}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={18} color="white" />
          </View>
          <View>
            <Text style={styles.brandTitle}>SuperAdmin</Text>
            <Text style={styles.brandSubtitle}>TapTapGo</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
    minHeight: '100vh',
  },
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  brandSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menu: {
    gap: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  menuLabelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
