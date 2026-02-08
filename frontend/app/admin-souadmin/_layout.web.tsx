import React, { useEffect } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/admin-souadmin/dashboard', path: '/admin-souadmin/dashboard', icon: 'grid' },
  { label: 'Chofè', href: '/admin-souadmin/drivers', path: '/admin-souadmin/drivers', icon: 'car' },
  { label: 'Pasajè', href: '/admin-souadmin/passengers', path: '/admin-souadmin/passengers', icon: 'people' },
  { label: 'Plent', href: '/admin-souadmin/complaints', path: '/admin-souadmin/complaints', icon: 'alert-circle' },
  { label: 'Notifikasyon', href: '/admin-souadmin/notifications', path: '/admin-souadmin/notifications', icon: 'notifications' },
  { label: 'Profil', href: '/admin-souadmin/profile', path: '/admin-souadmin/profile', icon: 'person' },
];

export default function AdminSouAdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const brandName = user?.brand_name || user?.full_name || 'SouAdmin';
  const primaryColor = user?.primary_color || Colors.primary;
  const secondaryColor = user?.secondary_color || Colors.secondary;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user || user.user_type !== 'subadmin') {
      router.replace('/auth/login?type=admin');
    }
  }, [isAuthenticated, isLoading, router, user]);

  const pageTitle =
    pathname?.includes('/admin-souadmin/drivers') ? 'Chofè' :
    pathname?.includes('/admin-souadmin/passengers') ? 'Pasajè' :
    pathname?.includes('/admin-souadmin/complaints') ? 'Plent' :
    pathname?.includes('/admin-souadmin/notifications') ? 'Notifikasyon' :
    pathname?.includes('/admin-souadmin/profile') ? 'Profil' :
    'Dashboard';

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.branding}>
          {user?.logo ? (
            <Image source={{ uri: user.logo }} style={styles.logo} />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: primaryColor }]}>
              <Ionicons name="shield" size={22} color="white" />
            </View>
          )}
          <View>
            <Text style={styles.brandName}>{brandName}</Text>
            <Text style={styles.brandRole}>SouAdmin</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Pressable
                key={item.path}
                onPress={() => router.push(item.href)}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? primaryColor : Colors.textSecondary}
                />
                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
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
            <View style={[styles.topbarBadge, { backgroundColor: secondaryColor }]}>
              <Ionicons name="shield" size={12} color="white" />
              <Text style={styles.topbarBadgeText}>SouAdmin</Text>
            </View>
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
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  logoFallback: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  brandRole: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menu: {
    gap: 8,
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
  },
  menuText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  menuTextActive: {
    color: Colors.text,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topbar: {
    height: 64,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  topbarSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topbarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topbarBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
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
    padding: 20,
  },
});
