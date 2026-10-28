import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useIsDark } from '@/lib/theme';

import { DEFAULT_CENTER, type MapProps } from './map-types';

// Ubin Esri Gray Canvas (tanpa kunci API): dasar abu-abu bersih + lapisan nama jalan.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const TILES = {
  light: {
    base: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  dark: {
    base: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
};

const pinHtml = (color: string, label?: string) =>
  `<div style="min-width:26px;height:26px;border-radius:13px;border:3px solid #fff;background:${color};` +
  `display:flex;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box;` +
  `color:#fff;font:700 11px Inter_700Bold,system-ui;box-shadow:0 2px 6px rgba(0,0,0,.35)">${label ?? ''}</div>`;

const ME_HTML =
  '<div style="width:30px;height:30px;border-radius:15px;background:rgba(47,107,255,.22);display:flex;align-items:center;justify-content:center">' +
  '<div style="width:16px;height:16px;border-radius:8px;background:#2F6BFF;border:3px solid #fff;box-sizing:border-box"></div></div>';

// Peta web dengan Leaflet, supaya app juga bisa dipakai dan dites di browser.
export default function JejakMap({
  style,
  lines = [],
  pins = [],
  me,
  fit,
  followMe,
  initialCenter,
  onPress,
  interactive = true,
  bottomInset = 0,
}: MapProps) {
  const dark = useIsDark();
  const el = useRef<HTMLDivElement>(null);
  const tiles = useRef<{ base: L.TileLayer; labels: L.TileLayer } | null>(null);
  const map = useRef<L.Map | null>(null);
  const drawn = useRef<L.LayerGroup | null>(null);
  const meMarker = useRef<L.Marker | null>(null);
  const applyFit = useRef<() => void>(() => {});
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (!el.current) return;
    const center = initialCenter ?? me ?? fit?.[0] ?? DEFAULT_CENTER;
    const m = L.map(el.current, {
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: false,
      keyboard: false,
    }).setView(center, 15);
    const opts = { maxZoom: 19, maxNativeZoom: 16 };
    tiles.current = {
      base: L.tileLayer(TILES.light.base, { ...opts, attribution: '© Esri, OpenStreetMap' }).addTo(m),
      labels: L.tileLayer(TILES.light.labels, opts).addTo(m),
    };
    m.attributionControl.setPrefix(false);
    drawn.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onPressRef.current?.([e.latlng.lat, e.latlng.lng]));
    map.current = m;
    // Saat pertama dipasang, wadah bisa belum punya ukuran; ulangi fit begitu ukurannya muncul.
    let sized = false;
    const ro = new ResizeObserver(([entry]) => {
      m.invalidateSize();
      if (!sized && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        sized = true;
        applyFit.current();
      }
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
    // Peta dibuat sekali; perubahan berikutnya ditangani efek di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = dark ? TILES.dark : TILES.light;
    tiles.current?.base.setUrl(t.base);
    tiles.current?.labels.setUrl(t.labels);
  }, [dark]);

  useEffect(() => {
    const g = drawn.current;
    if (!g) return;
    g.clearLayers();
    for (const l of lines) {
      const weight = l.width ?? 4;
      L.polyline(l.coords, { color: dark ? '#000' : '#fff', weight: weight + 4, opacity: 0.85, interactive: false }).addTo(g);
      L.polyline(l.coords, {
        color: l.color,
        weight,
        opacity: 1,
        dashArray: l.dashed ? '10 8' : undefined,
        interactive: false,
      }).addTo(g);
    }
    for (const p of pins) {
      L.marker(p.at, {
        icon: L.divIcon({ html: pinHtml(p.color, p.label), className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
        interactive: false,
      }).addTo(g);
    }
  }, [lines, pins, dark]);

  useEffect(() => {
    applyFit.current = () => {
      const m = map.current;
      if (!m || !fit || fit.length === 0) return;
      if (fit.length === 1) m.setView(fit[0], 15);
      else m.fitBounds(L.latLngBounds(fit), { paddingTopLeft: [48, 48], paddingBottomRight: [48, 48 + bottomInset] });
    };
    applyFit.current();
  }, [fit, bottomInset]);

  const meLat = me?.[0];
  const meLon = me?.[1];
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (meLat == null || meLon == null) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!meMarker.current) {
      meMarker.current = L.marker([meLat, meLon], {
        icon: L.divIcon({ html: ME_HTML, className: '', iconSize: [30, 30], iconAnchor: [15, 15] }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(m);
    } else meMarker.current.setLatLng([meLat, meLon]);
    if (followMe) {
      // Pusatkan di area yang tidak tertutup panel bawah.
      const target = m.unproject(m.project([meLat, meLon]).add([0, bottomInset / 2]));
      m.panTo(target, { animate: true });
    }
  }, [meLat, meLon, followMe, bottomInset]);

  return (
    <View style={[styles.map, style]}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex 0 membuat konteks tumpuk sendiri, supaya panel di atas peta tidak tertutup lapisan Leaflet.
  map: { flex: 1, overflow: 'hidden', zIndex: 0 },
});
