import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ActivitySummary, KudosState } from '@shared/api';

import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { distanceParts, duration, tempoParts, TYPE_ICON, TYPE_LABEL, when } from '@/lib/format';
import { font, radius, shadow, space, useColors } from '@/lib/theme';

import StaticMap from './StaticMap';
import { Avatar, Badge, Row, Stat, T } from './ui';

export function useKudos(activity: Pick<ActivitySummary, 'id' | 'hasKudo'>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<KudosState>(`/activities/${activity.id}/kudos`, { method: activity.hasKudo ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['activity', activity.id] });
      void qc.invalidateQueries({ queryKey: ['userActivities'] });
    },
  });
}

export default function ActivityCard({ a }: { a: ActivitySummary }) {
  const c = useColors();
  const me = useMe();
  const kudos = useKudos(a);
  const d = distanceParts(a.distanceM);
  const t = tempoParts(a.type, a.distanceM, a.movingS);
  const mine = a.user.id === me.id;

  return (
    <Pressable
      onPress={() => router.push(`/aktivitas/${a.id}`)}
      style={({ pressed }) => [styles.card, { backgroundColor: c.surface }, shadow(c), pressed && { opacity: 0.92 }]}>
      {/* Bayangan di luar, kliping sudut di dalam: iOS memotong bayangan bila overflow hidden. */}
      <View style={[styles.clip, { borderColor: c.line }]}>
        <View style={styles.top}>
          <Pressable onPress={() => router.push(`/atlet/${a.user.id}`)} hitSlop={4}>
            <Row gap={space.md}>
              <Avatar name={a.user.name} size={42} />
              <View style={{ flex: 1 }}>
                <T v="strong" numberOfLines={1}>
                  {a.user.name}
                </T>
                <Row gap={5}>
                  <Ionicons name={TYPE_ICON[a.type]} size={13} color={c.muted} />
                  <T v="small">
                    {TYPE_LABEL[a.type]} · {when(a.startedAt)}
                  </T>
                </Row>
              </View>
              {a.prCount > 0 ? <Badge icon="trophy" text={`${a.prCount} PR`} color={c.gold} textColor="#1a1400" /> : null}
            </Row>
          </Pressable>
          <T v="h2" numberOfLines={2}>
            {a.title}
          </T>
          <Row gap={space.lg}>
            <Stat label="Jarak" value={d.value} unit={d.unit} size={24} />
            <Stat label={t.label} value={t.value} unit={t.unit} size={24} />
            <Stat label="Waktu" value={duration(a.movingS)} size={24} />
          </Row>
        </View>

        <StaticMap points={a.preview} height={190} radius={0} />

        <Row style={styles.bottom}>
          <Pressable
            onPress={() => !mine && kudos.mutate()}
            disabled={mine || kudos.isPending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={a.hasKudo ? 'Batalkan kudos' : 'Beri kudos'}
            style={[styles.kudos, { backgroundColor: a.hasKudo ? c.accent : c.surface2 }]}>
            <Ionicons name={a.hasKudo ? 'thumbs-up' : 'thumbs-up-outline'} size={17} color={a.hasKudo ? c.accentInk : c.text} />
            <T v="strong" size={14} color={a.hasKudo ? c.accentInk : c.text}>
              {a.kudos}
            </T>
          </Pressable>
          <Row gap={6} style={[styles.kudos, { backgroundColor: c.surface2 }]}>
            <Ionicons name="chatbubble-outline" size={16} color={c.text} />
            <T v="strong" size={14}>
              {a.comments}
            </T>
          </Row>
          <View style={{ flex: 1 }} />
          <T v="small" style={{ fontFamily: font.semibold }}>
            Lihat detail
          </T>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </Row>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  clip: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  top: { padding: space.lg, gap: space.md },
  bottom: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  kudos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
