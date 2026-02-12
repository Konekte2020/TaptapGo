import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AdminSouAdminIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/souadmin/dashboard');
  }, []);

  return null;
}
