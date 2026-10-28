import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { ActivitySummary } from '@shared/api';

import { dateShort, distanceParts, duration, tempoParts, TYPE_LABEL } from '@/lib/format';
import { routePath } from '@/lib/route-path';
import { font, ROAD } from '@/lib/theme';

/**
 * Template bagikan: ditempel otomatis di atas foto (atau latar aspal bila tanpa foto).
 * Ukuran kanvas bebas; semua ukuran diskalakan dari lebar `w` (desain dasar 360 px).
 */
export interface TemplateProps {
  a: ActivitySummary;
  w: number;
  h: number;
}

export type TemplateKey = 'bib' | 'rute' | 'patok' | 'rambu';

export const TEMPLATES: { key: TemplateKey; name: string; render: (p: TemplateProps) => ReactNode }[] = [
  { key: 'bib', name: 'Nomor dada', render: (p) => <BibTemplate {...p} /> },
  { key: 'rute', name: 'Rute', render: (p) => <RouteTemplate {...p} /> },
  { key: 'patok', name: 'Patok KM', render: (p) => <PatokTemplate {...p} /> },
  { key: 'rambu', name: 'Rambu', render: (p) => <RambuTemplate {...p} /> },
];

function stats(a: ActivitySummary) {
  return {
    dist: distanceParts(a.distanceM),
    time: duration(a.movingS),
    tempo: tempoParts(a.type, a.distanceM, a.movingS),
  };
}

/** Garis rute putih dengan bayangan, untuk ditimpa ke foto. */
function RouteLine({ a, w, h, stroke, pad }: { a: ActivitySummary; w: number; h: number; stroke: number; pad: number }) {
  const r = routePath(a.preview, w, h, pad);
  if (!r) return null;
  return (
    <Svg width={w} height={h}>
      <Path
        d={r.d}
        fill="none"
        stroke="#000"
        strokeOpacity={0.35}
        strokeWidth={stroke + 5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={r.d} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={r.start[0]} cy={r.start[1]} r={stroke * 1.3} fill={ROAD.rambu} stroke="#fff" strokeWidth={stroke * 0.5} />
      <Circle cx={r.end[0]} cy={r.end[1]} r={stroke * 1.3} fill={ROAD.patok} stroke="#fff" strokeWidth={stroke * 0.5} />
    </Svg>
  );
}

function Wordmark({ k, color = '#fff' }: { k: number; color?: string }) {
  return (
    <Text style={{ fontFamily: font.display, fontSize: 24 * k, color, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 }}>
      jejak<Text style={{ color: ROAD.marka }}>.</Text>
    </Text>
  );
}

// --- 1. Nomor dada: kertas lomba putih dengan lubang peniti ---

function BibTemplate({ a, w, h }: TemplateProps) {
  const k = w / 360;
  const s = stats(a);
  const bw = w * 0.76;
  const hole = (pos: object) => <View style={[styles.hole, { width: 9 * k, height: 9 * k, borderRadius: 4.5 * k }, pos]} />;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: 18 * k, left: 18 * k }}>
        <Wordmark k={k} />
      </View>
      <View
        style={[
          styles.bib,
          { width: bw, left: (w - bw) / 2, bottom: h * 0.07, borderRadius: 8 * k, transform: [{ rotate: '-3deg' }] },
        ]}>
        <View style={{ backgroundColor: ROAD.patok, paddingVertical: 8 * k, paddingHorizontal: 26 * k }}>
          <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 13 * k }} numberOfLines={1}>
            {a.title}
          </Text>
        </View>
        <View style={{ alignItems: 'center', paddingTop: 2 * k }}>
          <Text style={{ fontFamily: font.display, fontSize: 92 * k, lineHeight: 96 * k, color: ROAD.aspal }}>
            {s.dist.value}
            <Text style={{ fontSize: 26 * k }}> {s.dist.unit}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 6 * k }}>
          <BibStat k={k} label="Waktu" value={s.time} />
          <BibStat k={k} label={s.tempo.label} value={`${s.tempo.value}${s.tempo.unit ? ` ${s.tempo.unit}` : ''}`} />
        </View>
        <View style={{ borderTopWidth: 1, borderColor: '#E3E4DF', paddingVertical: 6 * k, alignItems: 'center' }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 11 * k, color: '#6B6E70' }}>
            {a.user.name}, {dateShort(a.startedAt)}
          </Text>
        </View>
        {hole({ top: 11 * k, left: 9 * k })}
        {hole({ top: 11 * k, right: 9 * k })}
        {hole({ bottom: 10 * k, left: 10 * k })}
        {hole({ bottom: 10 * k, right: 10 * k })}
      </View>
    </View>
  );
}

function BibStat({ k, label, value }: { k: number; label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 11 * k, color: '#6B6E70' }}>{label}</Text>
      <Text style={{ fontFamily: font.numBold, fontSize: 26 * k, color: ROAD.aspal }}>{value}</Text>
    </View>
  );
}

// --- 2. Rute: garis rute besar + statistik di pita bawah ---

function RouteTemplate({ a, w, h }: TemplateProps) {
  const k = w / 360;
  const s = stats(a);
  const band = 92 * k;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: 18 * k, left: 18 * k }}>
        <Wordmark k={k} />
      </View>
      <View style={{ position: 'absolute', top: 56 * k, left: 0 }}>
        <RouteLine a={a} w={w} h={h - band - 70 * k} stroke={5 * k} pad={36 * k} />
      </View>
      <View style={[styles.band, { height: band, paddingHorizontal: 18 * k }]}>
        <BandStat k={k} label="Jarak" value={s.dist.value} unit={s.dist.unit} />
        <BandStat k={k} label={s.tempo.label} value={s.tempo.value} unit={s.tempo.unit} />
        <BandStat k={k} label="Waktu" value={s.time} />
      </View>
    </View>
  );
}

function BandStat({ k, label, value, unit }: { k: number; label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 12 * k, color: 'rgba(255,255,255,0.75)' }}>{label}</Text>
      <Text style={{ fontFamily: font.display, fontSize: 38 * k, color: '#fff', lineHeight: 42 * k }}>
        {value}
        {unit ? <Text style={{ fontFamily: font.semibold, fontSize: 13 * k }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

// --- 3. Patok KM: tugu kilometer pinggir jalan ---

function PatokTemplate({ a, w, h }: TemplateProps) {
  const k = w / 360;
  const s = stats(a);
  const pw = 128 * k;
  const ph = 176 * k;
  const shadow = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 8 };
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: 18 * k, right: 18 * k }}>
        <Wordmark k={k} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 20 * k,
          bottom: h * 0.06,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 14 * k,
        }}>
        <View style={[styles.post, { width: pw, height: ph, borderTopLeftRadius: pw / 2, borderTopRightRadius: pw / 2 }]}>
          <View
            style={{
              height: ph * 0.36,
              alignSelf: 'stretch',
              backgroundColor: ROAD.patok,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
            <Text style={{ color: '#fff', fontFamily: font.display, fontSize: 22 * k, paddingBottom: 4 * k }}>
              {TYPE_LABEL[a.type].split(' ')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.display, fontSize: 52 * k, lineHeight: 54 * k, color: ROAD.aspal }}>
              {s.dist.value}
            </Text>
            <Text style={{ fontFamily: font.display, fontSize: 18 * k, color: ROAD.aspal }}>{s.dist.unit.toUpperCase()}</Text>
          </View>
          <View style={{ height: 10 * k, alignSelf: 'stretch', backgroundColor: '#C9CAC4' }} />
        </View>
        <View style={{ flex: 1, maxWidth: w - pw - 60 * k, paddingBottom: 6 * k, gap: 4 * k }}>
          <Text style={[{ color: '#fff', fontFamily: font.black, fontSize: 18 * k }, shadow]} numberOfLines={2}>
            {a.title}
          </Text>
          <Text style={[{ color: '#fff', fontFamily: font.numBold, fontSize: 26 * k }, shadow]}>{s.time}</Text>
          <Text style={[{ color: '#fff', fontFamily: font.semibold, fontSize: 14 * k }, shadow]}>
            {s.tempo.value} {s.tempo.unit}
          </Text>
          <Text style={[{ color: 'rgba(255,255,255,0.85)', fontFamily: font.medium, fontSize: 12 * k }, shadow]}>
            {dateShort(a.startedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- 4. Rambu: papan petunjuk arah hijau berisi "tujuan" dan jaraknya ---

function RambuTemplate({ a, w, h }: TemplateProps) {
  const k = w / 360;
  const s = stats(a);
  const row = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 17 * k }}>{label}</Text>
      <Text style={{ color: '#fff', fontFamily: font.display, fontSize: 30 * k }}>{value}</Text>
    </View>
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.plate, { left: 18 * k, right: 18 * k, bottom: h * 0.06, borderRadius: 12 * k, padding: 5 * k }]}>
        <View style={{ borderWidth: 3 * k, borderColor: '#fff', borderRadius: 9 * k, padding: 14 * k, gap: 4 * k }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * k, marginBottom: 4 * k }}>
            <Ionicons name="arrow-up" size={34 * k} color="#fff" />
            <Text style={{ flex: 1, color: '#fff', fontFamily: font.black, fontSize: 20 * k }} numberOfLines={2}>
              {a.title}
            </Text>
          </View>
          {row('Jarak', `${s.dist.value} ${s.dist.unit}`)}
          {row('Waktu', s.time)}
          {row(s.tempo.label, `${s.tempo.value} ${s.tempo.unit}`.trim())}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 * k }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.medium, fontSize: 11 * k }}>
              {a.user.name}, {dateShort(a.startedAt)}
            </Text>
            <Text style={{ color: '#fff', fontFamily: font.display, fontSize: 14 * k }}>jejak.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Latar bila belum ada foto: aspal dengan garis kontur samar dan garis rute pudar. */
export function PlainBackground({ a, w, h, faintRoute = true }: TemplateProps & { faintRoute?: boolean }) {
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = (h / 9) * i + 20;
    return `M -20 ${y} C ${w * 0.3} ${y - 40}, ${w * 0.6} ${y + 50}, ${w + 20} ${y - 10}`;
  });
  const r = faintRoute ? routePath(a.preview, w, h, w * 0.18) : null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: ROAD.aspal }]}>
      <Svg width={w} height={h}>
        {lines.map((d) => (
          <Path key={d} d={d} stroke="#fff" strokeOpacity={0.06} strokeWidth={1.5} fill="none" />
        ))}
        {r ? (
          <Path
            d={r.d}
            stroke={ROAD.marka}
            strokeOpacity={0.25}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  hole: { position: 'absolute', backgroundColor: '#D9DAD4', borderWidth: 1.5, borderColor: '#B9BAB4' },
  bib: {
    position: 'absolute',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,45,49,0.72)',
  },
  post: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  plate: {
    position: 'absolute',
    backgroundColor: ROAD.rambu,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
