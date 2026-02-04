import React, { useEffect } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', path: '/admin/dashboard', icon: 'grid' },
  { label: 'Chofè', href: '/admin/drivers', path: '/admin/drivers', icon: 'car' },
  { label: 'Pasajè', href: '/admin/passengers', path: '/admin/passengers', icon: 'people' },
  { label: 'Pri', href: '/admin/pricing', path: '/admin/pricing', icon: 'pricetag' },
  { label: 'Peman', href: '/admin/payments', path: '/admin/payments', icon: 'card' },
  { label: 'SouAdmin', href: '/admin/subadmins', path: '/admin/subadmins', icon: 'people' },
  { label: 'Plent', href: '/admin/complaints', path: '/admin/complaints', icon: 'alert-circle' },
  { label: 'Profil', href: '/admin/profile', path: '/admin/profile', icon: 'person' },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const brandName = user?.brand_name || user?.full_name || 'Admin';
  const primaryColor = user?.primary_color || Colors.primary;
  const secondaryColor = user?.secondary_color || Colors.secondary;
  const pageTitle =
    pathname?.includes('/admin/drivers') ? 'Chofè' :
    pathname?.includes('/admin/passengers') ? 'Pasajè' :
    pathname?.includes('/admin/pricing') ? 'Pri' :
    pathname?.includes('/admin/payments') ? 'Peman' :
    pathname?.includes('/admin/subadmins') ? 'SouAdmin' :
    pathname?.includes('/admin/complaints') ? 'Plent' :
    pathname?.includes('/admin/profile') ? 'Profil' :
    'Dashboard';

  const visibleMenuItems = user?.user_type === 'subadmin'
    ? MENU_ITEMS.filter((item) => ['Dashboard', 'Chofè', 'Pasajè', 'Plent', 'Profil'].includes(item.label))
    : MENU_ITEMS;

  useEffect(() => {
    if (user?.user_type !== 'subadmin') return;
    router.replace('/admin-souadmin/dashboard');
  }, [pathname, router, user?.user_type]);

  return (
    <View style={styles.page}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          {user?.logo ? (
            <Image source={{ uri: user.logo }} style={styles.logoImage} />
          ) : (
            <View style={[styles.logo, { backgroundColor: primaryColor }]}>
              <Ionicons name="shield-checkmark" size={18} color="white" />
            </View>
          )}
          <View>
            <Text style={styles.brandTitle}>{brandName}</Text>
            <Text style={styles.brandSubtitle}>Admin Dashboard</Text>
          </View>
        </View>

        <View style={styles.menu}>
        {visibleMenuItems.map((item) => {
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
                  color={isActive ? primaryColor : Colors.textSecondary}
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
        <View style={styles.topbar}>
          <View>
            <Text style={styles.topbarTitle}>{pageTitle}</Text>
            <Text style={styles.topbarSubtitle}>{brandName}</Text>
          </View>
          <View style={styles.topbarActions}>
            {user?.logo ? (
              <Image source={{ uri: user.logo }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                <Ionicons name="person" size={16} color="white" />
              </View>
            )}
            <Pressable
              style={[styles.logoutButton, { backgroundColor: secondaryColor }]}
              onPress={async () => {
                await logout();
                router.replace('/auth/role-select');
              }}
            >
              <Ionicons name="log-out-outline" size={16} color="white" />
              <Text style={styles.logoutText}>Dekonekte</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.contentBody}>
          <Slot />
        </View>
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
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  topbarSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  topbarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topbarBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  contentBody: {
    flex: 1,
  },
});
