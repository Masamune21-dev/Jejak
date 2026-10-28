import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_CENTER, type MapProps } from './map-types';

const pinHtml = (color: string, label?: string) =>
  `<div style="min-width:22px;height:22px;border-radius:11px;border:2px solid #fff;background:${color};` +
  `display:flex;align-items:center;justify-content:center;padding:0 4px;box-sizing:border-box;` +
  `color:#fff;font:700 11px system-ui;box-shadow:0 1px 3px rgba(0,0,0,.35)">${label ?? ''}</div>`;

const ME_HTML =
  '<div style="width:26px;height:26px;border-radius:13px;background:rgba(47,111,237,.25);display:flex;align-items:center;justify-content:center">' +
  '<div style="width:14px;height:14px;border-radius:7px;background:#2F6FED;border:2px solid #fff"></div></div>';

// Peta web dengan Leaflet + OpenStreetMap, supaya app juga bisa dipakai dan dites di browser.
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
}: MapProps) {
  const el = useRef<HTMLDivElement>(null);
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
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: false,
      keyboard: false,
    }).setView(center, 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(m);
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
    const g = drawn.current;
    if (!g) return;
    g.clearLayers();
    for (const l of lines) {
      L.polyline(l.coords, { color: l.color, weight: l.width ?? 4, opacity: 0.95, dashArray: l.dashed ? '10 8' : undefined }).addTo(g);
    }
    for (const p of pins) {
      L.marker(p.at, {
        icon: L.divIcon({ html: pinHtml(p.color, p.label), className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
        interactive: false,
      }).addTo(g);
    }
  }, [lines, pins]);

  useEffect(() => {
    applyFit.current = () => {
      const m = map.current;
      if (!m || !fit || fit.length === 0) return;
      if (fit.length === 1) m.setView(fit[0], 15);
      else m.fitBounds(L.latLngBounds(fit), { padding: [40, 40] });
    };
    applyFit.current();
  }, [fit]);

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
        icon: L.divIcon({ html: ME_HTML, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(m);
    } else meMarker.current.setLatLng([meLat, meLon]);
    if (followMe) m.panTo([meLat, meLon], { animate: true });
  }, [meLat, meLon, followMe]);

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
