import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreView,
  Marker,
  type CameraRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { palette } from '@/lib/theme';
import { OSM_ATTRIBUTION, OSM_MAX_ZOOM, OSM_TILES } from '@/lib/tiles';

import { MeDot, PinView } from './map-markers';
import { DEFAULT_CENTER, fitBox, type MapLine, type MapProps } from './map-types';

// Ubin OpenStreetMap (sama dengan versi web dan cuplikan peta), digelapkan lewat cat raster:
// kecerahan dibalik (min 1, max 0) lalu rona diputar 180° supaya warna asli kembali.
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: { type: 'raster', tiles: [OSM_TILES], tileSize: 256, maxzoom: OSM_MAX_ZOOM, attribution: OSM_ATTRIBUTION },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': palette.bg } },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-brightness-min': 0.92,
        'raster-brightness-max': 0.04,
        'raster-hue-rotate': 180,
        'raster-saturation': -0.4,
        'raster-contrast': -0.1,
      },
    },
  ],
};

function collection(lines: MapLine[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: lines.map((l) => ({
      type: 'Feature',
      properties: { color: l.color, width: l.width ?? 4 },
      geometry: { type: 'LineString', coordinates: l.coords.map(([lat, lon]) => [lon, lat]) },
    })),
  };
}

const ROUND = { 'line-cap': 'round', 'line-join': 'round' } as const;

// MapLibre: peta Android di APK, gratis tanpa kunci Google. Tidak tersedia di Expo Go.
export default function LibreMap({
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
  const camera = useRef<CameraRef>(null);
  const loaded = useRef(false);
  const center = initialCenter ?? me ?? fit?.[0] ?? DEFAULT_CENTER;

  const doFit = useCallback(() => {
    const cam = camera.current;
    if (!cam || !fit || fit.length === 0) return;
    if (fit.length === 1) {
      cam.easeTo({ center: [fit[0][1], fit[0][0]], zoom: 15, duration: 300 });
      return;
    }
    const [sw, ne] = fitBox(fit);
    cam.fitBounds([sw[1], sw[0], ne[1], ne[0]], {
      padding: { top: 70, right: 50, bottom: 70 + bottomInset, left: 50 },
      duration: 0,
    });
  }, [fit, bottomInset]);

  useEffect(() => {
    if (loaded.current) doFit();
  }, [doFit]);

  const meLat = me?.[0];
  const meLon = me?.[1];
  useEffect(() => {
    if (followMe && meLat != null && meLon != null) {
      camera.current?.easeTo({ center: [meLon, meLat], duration: 400, padding: { bottom: bottomInset } });
    }
  }, [followMe, meLat, meLon, bottomInset]);

  const solid = useMemo(() => collection(lines.filter((l) => !l.dashed)), [lines]);
  const dashed = useMemo(() => collection(lines.filter((l) => l.dashed)), [lines]);

  return (
    <MapLibreView
      style={[styles.map, style]}
      mapStyle={STYLE}
      onPress={(e) => onPress?.([e.nativeEvent.lngLat[1], e.nativeEvent.lngLat[0]])}
      onDidFinishLoadingMap={() => {
        loaded.current = true;
        doFit();
      }}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      attributionPosition={{ bottom: 8 + bottomInset, right: 8 }}>
      <Camera ref={camera} initialViewState={{ center: [center[1], center[0]], zoom: 14 }} />
      <GeoJSONSource id="garis" data={solid}>
        <Layer
          id="garis-tepi"
          type="line"
          layout={ROUND}
          paint={{ 'line-color': '#000000', 'line-opacity': 0.9, 'line-width': ['+', ['get', 'width'], 4] }}
        />
        <Layer
          id="garis-isi"
          type="line"
          layout={ROUND}
          paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="garis-putus" data={dashed}>
        <Layer
          id="garis-putus-isi"
          type="line"
          layout={{ 'line-join': 'round' }}
          paint={{ 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-dasharray': [2, 1.6] }}
        />
      </GeoJSONSource>
      {pins.map((p) => (
        <Marker key={p.id} id={p.id} lngLat={[p.at[1], p.at[0]]} anchor="center">
          <PinView pin={p} />
        </Marker>
      ))}
      {me ? (
        <Marker key="me" id="me" lngLat={[me[1], me[0]]} anchor="center">
          <MeDot />
        </Marker>
      ) : null}
    </MapLibreView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
