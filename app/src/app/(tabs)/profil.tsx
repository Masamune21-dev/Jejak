import ProfileView from '@/components/ProfileView';
import { useMe } from '@/lib/auth';

export default function MyProfileScreen() {
  return <ProfileView userId={useMe().id} />;
}
