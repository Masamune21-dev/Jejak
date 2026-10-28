import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { ActivitySummary, KudosState } from '@shared/api';

import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { distance, duration, tempo, TYPE_ICON, when } from '@/lib/format';
import { space, useColors } from '@/lib/theme';

import RouteShape from './RouteShape';
import { Avatar, Badge, Card, Row, Stat, T } from './ui';

export function useKudos(activity: Pick<ActivitySummary, 'id' | 'hasKudo'>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<KudosState>(`/activities/${activity.id}/kudos`, { method: activity.hasKudo ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['activity', activity.id] });
      qc.invalidateQueries({ queryKey: ['userActivities'] });
    },
  });
}

export default function ActivityCard({ a }: { a: ActivitySummary }) {
  const c = useColors();
  const me = useMe();
  const kudos = useKudos(a);
  const t = tempo(a.type, a.distanceM, a.movingS);
  const mine = a.user.id === me.id;
  return (
    <Card onPress={() => router.push(`/aktivitas/${a.id}`)} style={{ gap: space.md }}>
      <Pressable onPress={() => router.push(`/atlet/${a.user.id}`)}>
        <Row>
          <Avatar name={a.user.name} />
          <View style={{ flex: 1 }}>
            <T weight="700">{a.user.name}</T>
            <Row gap={6}>
              <Ionicons name={TYPE_ICON[a.type]} size={13} color={c.muted} />
              <T muted size={13}>
                {when(a.startedAt)}
              </T>
            </Row>
          </View>
          {a.prCount > 0 ? <Badge text={`🏆 ${a.prCount} PR`} color={c.gold} /> : null}
        </Row>
      </Pressable>
      <T weight="800" size={18}>
        {a.title}
      </T>
      <Row>
        <Stat label="Jarak" value={distance(a.distanceM)} />
        <Stat label={t.label} value={t.value} />
        <Stat label="Waktu" value={duration(a.movingS)} />
      </Row>
      <RouteShape points={a.preview} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => !mine && kudos.mutate()}
          disabled={mine || kudos.isPending}
          hitSlop={8}
          accessibilityLabel="Kudos">
          <Row gap={6}>
            <Ionicons name={a.hasKudo ? 'thumbs-up' : 'thumbs-up-outline'} size={20} color={a.hasKudo ? c.primary : c.muted} />
            <T muted>{a.kudos} kudos</T>
          </Row>
        </Pressable>
        <Row gap={6}>
          <Ionicons name="chatbubble-outline" size={18} color={c.muted} />
          <T muted>{a.comments}</T>
        </Row>
      </Row>
    </Card>
  );
}
