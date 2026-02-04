import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AdminSouAdminLayoutNative() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/role-select');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ❌ Entèfas Administrasyon disponib sèlman sou web
      </Text>
      <Text style={styles.subtitle}>
        Tanpri konekte sou yon navigatè
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
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
