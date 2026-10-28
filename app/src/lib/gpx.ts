import type { Activity } from '@shared/api';

const GPX_TYPE: Record<Activity['type'], string> = { run: 'running', ride: 'cycling', walk: 'walking' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** File GPX 1.1 dari track aktivitas; tiap bagian (dipisah jeda) menjadi satu <trkseg>. */
export function buildGpx(a: Activity): string {
  const segs = a.track
    .filter((part) => part.length > 0)
    .map(
      (part) =>
        '    <trkseg>\n' +
        part
          .map(
            ([lat, lon, t, alt]) =>
              `      <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}">` +
              (alt != null ? `<ele>${alt.toFixed(1)}</ele>` : '') +
              `<time>${new Date(t).toISOString()}</time></trkpt>`,
          )
          .join('\n') +
        '\n    </trkseg>',
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Jejak" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(a.title)}</name>
    <time>${a.startedAt}</time>
  </metadata>
  <trk>
    <name>${esc(a.title)}</name>
    <type>${GPX_TYPE[a.type]}</type>
${segs}
  </trk>
</gpx>
`;
}

export function gpxFileName(a: Activity): string {
  const day = a.startedAt.slice(0, 10);
  const slug = a.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `jejak-${day}-${slug || a.id}.gpx`;
}
