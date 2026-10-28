import { useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/ProfileView';

export default function AthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView userId={Number(id)} />;
}
